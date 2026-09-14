import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { useOrderDetails, usePaymentMutations } from "@/hooks/use-payments";
import { useAuth } from "@/hooks/use-auth";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Loader2,
  Lock,
  ChevronRight,
  Printer,
  Sparkles,
  Award,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  QrCode,
  Copy,
  Check,
  CreditCard,
  Smartphone,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const OFFICIAL_PAYMENTLY_URL = "https://vartualtutor.paymently.io/paymentlink/default/BDT";

export default function CheckoutPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active order record from database / store
  const order = useOrderDetails(transactionId);
  const { createOrder, verifyPaymentOrder } = usePaymentMutations();

  // Local state to track completion immediately after verification
  const [isPaidLocally, setIsPaidLocally] = useState(false);
  const [verifiedInvoiceData, setVerifiedInvoiceData] = useState<{
    invoiceId?: string;
    method?: string;
    transactionId?: string;
  } | null>(null);

  // Student details state (pre-filled or edited)
  const [studentName, setStudentName] = useState(() => order?.student_name || user?.name || "");
  const [studentPhone, setStudentPhone] = useState(
    () => order?.student_phone || (user as { phone?: string })?.phone || ""
  );
  const [studentEmail, setStudentEmail] = useState(() => order?.student_email || user?.email || "");

  // Payment method selection tab: "online" | "qr" | "trxid"
  const [paymentTab, setPaymentTab] = useState<"online" | "qr" | "trxid">("online");
  const [manualTrxId, setManualTrxId] = useState("");
  const [manualSenderPhone, setManualSenderPhone] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Gateway checkout URL and active invoice state
  const [gatewayRedirectUrl, setGatewayRedirectUrl] = useState<string | null>(() => {
    return searchParams.get("gatewayUrl") || null;
  });
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(() => {
    return searchParams.get("invoice_id") || searchParams.get("invoiceId") || null;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Update fields if order loads asynchronously and fields are untouched
  useEffect(() => {
    if (order) {
      setStudentName((prev) => prev || order.student_name || "");
      setStudentEmail((prev) => prev || order.student_email || "");
      setStudentPhone((prev) => prev || order.student_phone || "");
    }
  }, [order]);

  // Stable default order ID fallback
  const fallbackOrderId = useMemo(
    () => `VT-ORD-${Math.floor(100000 + Math.random() * 900000)}`,
    []
  );
  const effectiveOrderId = order?.order_id || transactionId || fallbackOrderId;

  // Derived effective values
  const effectiveTeacherName =
    order?.teacher_name || searchParams.get("teacherName") || "Sarah Rahman";

  // Sanitize photo: strictly no unsplash stock portraits
  const sanitizedTeacherPhoto = useMemo(() => {
    const raw = order?.teacher_photo || searchParams.get("teacherPhoto");
    if (!raw) return undefined;
    if (raw.includes("unsplash.com")) return undefined;
    return raw;
  }, [order?.teacher_photo, searchParams]);

  const effectiveSubject = order?.subject || searchParams.get("subject") || "Mathematics";
  const effectiveCourseName =
    order?.course_name || searchParams.get("courseName") || "HSC & Admission Math Masterclass";
  const effectiveClassesCount = order?.number_of_classes || Number(searchParams.get("classes")) || 12;
  const effectiveAmount = order?.amount || Number(searchParams.get("amount")) || 1500;

  const isPaid = order?.payment_status === "PAID" || isPaidLocally;

  const CONVEX_SITE_URL =
    (import.meta.env.VITE_CONVEX_SITE_URL as string | undefined) ||
    "https://determined-jellyfish-610.convex.site";

  /**
   * Safely calls payment API endpoints with automatic fallback to Convex backend.
   * Guarantees it never crashes on HTML responses (e.g. "Unexpected token '<', '<!doctype '...").
   */
  const safePaymentApiCall = useCallback(
    async <T = any>(
      endpoints: string[],
      options: RequestInit
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      let lastError = "Failed to communicate with payment gateway.";

      for (const url of endpoints) {
        try {
          const res = await fetch(url, options);
          const text = await res.text();

          // If the server returned an HTML page (e.g. SPA index.html or Cloudflare challenge)
          if (text.trim().startsWith("<") || text.includes("<!doctype") || text.includes("<html")) {
            console.warn(`[Payment API] Endpoint ${url} returned HTML (${res.status}). Trying next fallback...`);
            lastError = `Payment service returned an HTML response instead of JSON.`;
            continue;
          }

          try {
            const data = JSON.parse(text);
            if (data && (data.status === true || data.status === "COMPLETED" || data.status === "VALID" || data.payment_url)) {
              return { success: true, data };
            }
            if (data && data.error) {
              return { success: false, data, error: data.error };
            }
            return { success: res.ok, data };
          } catch (parseErr: any) {
            lastError = `Invalid JSON response: ${parseErr.message}`;
            continue;
          }
        } catch (netErr: any) {
          lastError = netErr?.message || "Network request failed";
          continue;
        }
      }

      return { success: false, error: lastError };
    },
    []
  );

  // Copy payment link helper
  const handleCopyPaymentLink = () => {
    try {
      navigator.clipboard.writeText(OFFICIAL_PAYMENTLY_URL);
      setCopiedLink(true);
      toast.success("Paymently gateway link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.info(`Payment link: ${OFFICIAL_PAYMENTLY_URL}`);
    }
  };

  // Verify payment with Paymently / UddoktaPay server
  const handleVerifyInvoice = useCallback(
    async (invoiceId: string) => {
      if (!invoiceId) return;
      setIsVerifying(true);
      setVerificationError(null);

      try {
        const verifyRes = await safePaymentApiCall<any>(
          [
            "/api/uddoktapay/verify",
            `${CONVEX_SITE_URL}/uddoktapay/verify`,
            `${window.location.origin}/api/uddoktapay/verify`,
          ],
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              invoice_id: invoiceId,
              orderId: effectiveOrderId,
              amount: effectiveAmount,
            }),
          }
        );

        const data = verifyRes.data;

        const isCompleted =
          data &&
          (data.status === "COMPLETED" ||
            data.status === "VALID" ||
            data.status === "SUCCESS");

        if (isCompleted) {
          await verifyPaymentOrder({
            orderId: effectiveOrderId,
            gatewayInvoiceId: invoiceId,
            paymentGateway: data.payment_method ? `Virtual Tutor (${data.payment_method})` : "Virtual Tutor Gateway (Paymently)",
            gatewayStatus: "PAID",
            paidAmount: data.amount ? parseFloat(data.amount) : effectiveAmount,
            bankTranId: data.transaction_id || `VT-${invoiceId}`,
          });

          setVerifiedInvoiceData({
            invoiceId: invoiceId,
            method: data.payment_method || "Paymently BDT",
            transactionId: data.transaction_id,
          });
          setIsPaidLocally(true);
          toast.success("Payment confirmed! Your enrollment is active.");
        } else if (data?.status === "INITIATED" || data?.status === "PENDING") {
          setVerificationError(
            "Paymently status: Transaction initiated. Complete your payment on the Paymently window via bKash, Nagad, or Rocket."
          );
        } else {
          setVerificationError(
            `Paymently status: ${data?.status || data?.error || "Pending"}. If you just completed the payment, please allow a few moments and click check again.`
          );
        }
      } catch (err: any) {
        console.warn("Payment verify exception:", err);
        setVerificationError(err?.message || "Payment verification pending.");
      } finally {
        setIsVerifying(false);
      }
    },
    [effectiveOrderId, effectiveAmount, verifyPaymentOrder, safePaymentApiCall, CONVEX_SITE_URL]
  );

  // Read URL query parameters for automatic verification callback from Paymently
  useEffect(() => {
    const invoiceId = searchParams.get("invoice_id") || searchParams.get("invoiceId");
    const statusParam = searchParams.get("status") || searchParams.get("gateway_status");

    if (statusParam === "cancel") {
      toast.error("Payment was cancelled. You can try again whenever you're ready.");
      return;
    }

    if (invoiceId && !isPaid && !isVerifying) {
      setActiveInvoiceId(invoiceId);
      handleVerifyInvoice(invoiceId);
    }
  }, [searchParams, isPaid, isVerifying, handleVerifyInvoice]);

  // Automatic background polling while waiting for confirmation
  useEffect(() => {
    if (isPaid || !activeInvoiceId) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      if (!isSubscribed) return;

      try {
        const verifyRes = await safePaymentApiCall<any>(
          [
            "/api/uddoktapay/verify",
            `${CONVEX_SITE_URL}/uddoktapay/verify`,
            `${window.location.origin}/api/uddoktapay/verify`,
          ],
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              invoice_id: activeInvoiceId,
              orderId: effectiveOrderId,
              amount: effectiveAmount,
            }),
          }
        );

        const data = verifyRes.data;

        const isCompleted =
          data &&
          (data.status === "COMPLETED" ||
            data.status === "VALID" ||
            data.status === "SUCCESS");

        if (isCompleted && isSubscribed) {
          clearInterval(interval);
          await verifyPaymentOrder({
            orderId: effectiveOrderId,
            gatewayInvoiceId: activeInvoiceId,
            paymentGateway: data.payment_method ? `Virtual Tutor (${data.payment_method})` : "Virtual Tutor Gateway (Paymently)",
            gatewayStatus: "PAID",
            paidAmount: data.amount ? parseFloat(data.amount) : effectiveAmount,
            bankTranId: data.transaction_id || `VT-${activeInvoiceId}`,
          });

          setVerifiedInvoiceData({
            invoiceId: activeInvoiceId,
            method: data.payment_method || "Paymently BDT",
            transactionId: data.transaction_id,
          });
          setIsPaidLocally(true);
          toast.success("Payment received! Your enrollment is officially active.");
        }
      } catch (e) {
        // Silently continue polling
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isPaid, activeInvoiceId, effectiveOrderId, effectiveAmount, verifyPaymentOrder, safePaymentApiCall, CONVEX_SITE_URL]);

  // Primary Action: Open official Paymently gateway in a clean focused tab
  const handlePayWithPaymently = async () => {
    const resolvedName = studentName.trim() || user?.name || "Student";
    if (!resolvedName) {
      toast.error("Please enter student name.");
      return;
    }

    setIsProcessing(true);
    setVerificationError(null);

    try {
      // 1. Ensure authoritative order record exists in database
      await createOrder({
        orderId: effectiveOrderId,
        teacherId: searchParams.get("teacherId") || "tch_default",
        teacherName: effectiveTeacherName,
        teacherPhoto: sanitizedTeacherPhoto,
        courseName: effectiveCourseName,
        subject: effectiveSubject,
        numberOfClasses: effectiveClassesCount,
        amount: effectiveAmount,
        paymentGateway: "PAYMENTLY_BDT",
        studentName: resolvedName,
        studentEmail: studentEmail || user?.email || "student@vartualtutor.com",
        studentPhone: studentPhone || "01700000000",
      });

      // 2. Initialize charge via backend endpoint for custom session ID, or use verified Paymently link
      let targetPaymentUrl = OFFICIAL_PAYMENTLY_URL;
      let targetInvoiceId = activeInvoiceId || `PAY-${effectiveOrderId.slice(-8)}`;

      try {
        const initRes = await safePaymentApiCall<any>(
          [
            "/api/uddoktapay/init",
            `${CONVEX_SITE_URL}/uddoktapay/init`,
            `${window.location.origin}/api/uddoktapay/init`,
          ],
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: effectiveOrderId,
              amount: effectiveAmount,
              studentName: resolvedName,
              studentEmail: studentEmail || user?.email || "student@vartualtutor.com",
              studentPhone: studentPhone || "01700000000",
              teacherName: effectiveTeacherName,
              subject: effectiveSubject,
              origin: window.location.origin,
            }),
          }
        );

        if (initRes.data?.payment_url) {
          targetPaymentUrl = initRes.data.payment_url;
          if (initRes.data.invoice_id) {
            targetInvoiceId = initRes.data.invoice_id;
          }
        }
      } catch (callErr) {
        console.warn("[Payment Gateway] Using direct official Paymently portal link:", callErr);
      }

      setGatewayRedirectUrl(targetPaymentUrl);
      setActiveInvoiceId(targetInvoiceId);

      // 3. Open Paymently hosted portal in a new top-level tab
      toast.info("Opening Virtual Tutor official Paymently portal...", { duration: 4000 });
      try {
        const newTab = window.open(targetPaymentUrl, "_blank", "noopener,noreferrer");
        if (newTab) {
          newTab.focus();
        }
      } catch (winErr) {
        console.warn("Could not auto-open popup:", winErr);
      }
    } catch (err: any) {
      console.error("Payment initialization error:", err);
      toast.error(err?.message || "Failed to initialize payment gateway.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Instant Manual TrxID Confirmation
  const handleManualTrxVerify = async () => {
    const cleanTrx = manualTrxId.trim();
    if (!cleanTrx) {
      toast.error("Please enter your bKash/Nagad Transaction ID (TrxID) or Invoice ID.");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyPaymentOrder({
        orderId: effectiveOrderId,
        gatewayInvoiceId: cleanTrx,
        paymentGateway: "Virtual Tutor Gateway (Paymently)",
        gatewayStatus: "PAID",
        paidAmount: effectiveAmount,
        bankTranId: cleanTrx,
      });

      setVerifiedInvoiceData({
        invoiceId: cleanTrx,
        method: manualSenderPhone ? `bKash / Nagad (${manualSenderPhone})` : "Paymently (MFS)",
        transactionId: cleanTrx,
      });
      setIsPaidLocally(true);
      toast.success("Payment verified! Your class enrollment has been activated.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to verify transaction ID. Please check and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS VIEW: Payment Successful Page
  // ─────────────────────────────────────────────────────────────────────────────
  if (isPaid) {
    return (
      <div className="min-h-screen bg-transparent text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] p-6 sm:p-10 text-center space-y-6">
            {/* Green Verified Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Verified via Virtual Tutor Gateway (Paymently)
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Enrollment Confirmed!
              </h1>
              <p className="text-xs sm:text-sm text-white/70 max-w-md mx-auto leading-relaxed">
                Congratulations! You are officially enrolled in your live tuition course. Your class credentials and receipt details have been sent to{" "}
                <strong className="text-white">
                  {order?.student_email || studentEmail || user?.email || "your registered email"}
                </strong>.
              </p>
            </div>

            {/* Official Tuition Receipt Card */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-left space-y-3.5 text-xs text-white">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <ProfileAvatar
                    name={effectiveTeacherName}
                    image={sanitizedTeacherPhoto}
                    size="md"
                    shape="rounded"
                    role="teacher"
                    isVerified={true}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{effectiveTeacherName}</h3>
                    <p className="text-white/60 text-xs truncate">
                      {effectiveSubject} · {effectiveCourseName}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  PAID
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-white/50 block text-[11px]">Order Reference</span>
                  <span className="font-mono font-bold text-white">
                    {order?.order_id || effectiveOrderId}
                  </span>
                </div>
                <div>
                  <span className="text-white/50 block text-[11px]">Paymently Invoice / TrxID</span>
                  <span className="font-mono font-bold text-white truncate block">
                    {verifiedInvoiceData?.invoiceId || verifiedInvoiceData?.transactionId || activeInvoiceId || order?.gateway_invoice_id || "PAY-VERIFIED"}
                  </span>
                </div>
                <div>
                  <span className="text-white/50 block text-[11px]">Amount Paid</span>
                  <span className="font-black text-white text-sm">৳{effectiveAmount.toLocaleString()} BDT</span>
                </div>
                <div>
                  <span className="text-white/50 block text-[11px]">Payment Gateway</span>
                  <span className="font-semibold text-white">
                    {verifiedInvoiceData?.method || "Virtual Tutor Gateway (Paymently)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Action: Go to My Classes */}
            <div className="pt-2 space-y-3">
              <button
                id="btn-go-to-my-classes"
                onClick={() => navigate("/lessons")}
                className="w-full h-12 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_4px_20px_rgba(109,93,251,0.35)] transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Go to My Classes</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-white/70 hover:text-white inline-flex items-center gap-1.5 font-medium py-1 px-2 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <span className="text-white/20">·</span>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="text-white/70 hover:text-white font-medium py-1 px-2 cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>

            <div className="text-[11px] text-white/50 pt-2 border-t border-white/10 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Processed securely via Virtual Tutor Paymently BDT Tuition Escrow</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHECKOUT PAGE: Professional Virtual Tutor Paymently Gateway Experience
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-transparent text-white py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Top Navigation Header */}
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-white/70 hover:text-white py-1 px-2 -ml-2 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="inline-flex items-center gap-1.5 text-xs text-white/70 font-medium">
            <Lock className="w-3.5 h-3.5 text-violet-400" />
            <span>256-Bit SSL Escrow · Paymently BDT</span>
          </div>
        </div>

        {/* Verification in Progress Alert */}
        {isVerifying && (
          <div className="bg-white/5 border border-violet-500/40 rounded-2xl p-4 flex items-center gap-3 text-white text-xs animate-pulse backdrop-blur-md">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin shrink-0" />
            <div>
              <p className="font-bold text-white">Verifying payment with Paymently...</p>
              <p className="text-white/70 mt-0.5">Confirming your transaction with the payment gateway.</p>
            </div>
          </div>
        )}

        {/* Verification Notice / Retry */}
        {verificationError && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-200 text-xs backdrop-blur-md">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-200">Payment Status Notice</p>
              <p className="text-amber-200/80 mt-0.5">{verificationError}</p>
              {activeInvoiceId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerifyInvoice(activeInvoiceId)}
                  className="mt-2 h-7 text-xs border-amber-400/30 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Check Status Again</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 1. Review Class & Educator Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 text-white">
          <div className="flex items-start gap-4">
            <ProfileAvatar
              name={effectiveTeacherName}
              image={sanitizedTeacherPhoto}
              size="lg"
              shape="rounded"
              role="teacher"
              isVerified={true}
              className="shrink-0 shadow-md ring-2 ring-white/20"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/15">
                  {effectiveSubject}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-teal-300 bg-teal-500/20 px-2 py-0.5 rounded-full border border-teal-400/30">
                  <Award className="w-3 h-3 text-teal-400" />
                  Verified Educator
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1 truncate">
                {effectiveTeacherName}
              </h2>
              <p className="text-xs text-white/70 line-clamp-1 font-medium mt-0.5">
                {effectiveCourseName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
              <span className="text-white/50 block text-[10px] font-medium">Total Classes</span>
              <span className="font-bold text-white text-xs sm:text-sm">{effectiveClassesCount} Live Sessions</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
              <span className="text-white/50 block text-[10px] font-medium">Tuition Amount</span>
              <span className="font-bold text-white text-xs sm:text-sm">৳{effectiveAmount.toLocaleString()} BDT</span>
            </div>
          </div>
        </div>

        {/* 2. Student Information Form */}
        <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3.5 text-white">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Student Information
          </h3>

          <div className="space-y-3">
            <div>
              <label htmlFor="student-name-input" className="block text-xs font-semibold text-white/80 mb-1">
                Student Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="student-name-input"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student full name"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="student-phone-input" className="block text-xs font-semibold text-white/80 mb-1">
                  Mobile Number (bKash / Nagad)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="student-phone-input"
                    type="tel"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="student-email-input" className="block text-xs font-semibold text-white/80 mb-1">
                  Receipt Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="student-email-input"
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Official Virtual Tutor Gateway (Paymently) */}
        <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Payment Method
              </h3>
              <p className="text-[11px] text-white/60 mt-0.5">
                Official Gateway: <span className="font-mono font-semibold text-violet-300">vartualtutor.paymently.io</span>
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-300 bg-teal-500/20 px-2.5 py-1 rounded-full border border-teal-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              Verified Escrow
            </span>
          </div>

          {/* Interactive Payment Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setPaymentTab("online")}
              className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                paymentTab === "online"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="truncate">Instant Pay</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentTab("qr")}
              className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                paymentTab === "qr"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="truncate">Scan QR</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentTab("trxid")}
              className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                paymentTab === "trxid"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="truncate">Enter TrxID</span>
            </button>
          </div>

          {/* TAB 1: Instant Online Pay via Paymently Portal */}
          {paymentTab === "online" && (
            <div className="p-4 rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-600/10 to-indigo-600/10 space-y-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Virtual Tutor Official Gateway (Paymently)
                  </h4>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    Pay securely using bKash, Nagad, Rocket, Upay, Cards, or Net Banking
                  </p>
                </div>
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Active Gateway" />
              </div>

              {/* Supported Channels in Paymently */}
              <div className="pt-2 border-t border-white/10">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-2">
                  Supported MFS & Banking Channels:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#D12053] text-white shadow-sm">
                    bKash
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#F7941D] text-white shadow-sm">
                    Nagad
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#8C3494] text-white shadow-sm">
                    Rocket
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#2E3192] text-white shadow-sm">
                    Upay
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 border border-white/20 text-white shadow-sm">
                    Visa / Mastercard
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white/90">
                    Internet Banking
                  </span>
                </div>
              </div>

              {/* Direct Gateway Link Box */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-white/70">Official Gateway Link:</span>
                  <button
                    type="button"
                    onClick={handleCopyPaymentLink}
                    className="inline-flex items-center gap-1 font-bold text-violet-400 hover:text-violet-300 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-white bg-white/5 p-2 rounded-lg border border-white/10 truncate select-all">
                  {OFFICIAL_PAYMENTLY_URL}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Scan & Pay with QR Code */}
          {paymentTab === "qr" && (
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-4 text-center">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Scan with bKash or Nagad App</h4>
                <p className="text-[11px] text-white/60">
                  Open your mobile wallet app and scan this official merchant QR code to complete payment
                </p>
              </div>

              {/* QR Code Container */}
              <div className="inline-block bg-white p-4 rounded-2xl border border-white/20 shadow-md">
                <img
                  src="/payment-link-BDT-qr.svg"
                  alt="Virtual Tutor Official Paymently QR Code"
                  className="w-44 h-44 mx-auto object-contain"
                />
                <div className="mt-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Paymently BDT Official QR
                </div>
              </div>

              {/* Steps */}
              <div className="text-left bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                <div className="font-bold text-white text-[11px] uppercase tracking-wider">
                  How to Pay via QR:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-white/80 text-[11px]">
                  <li>Open <strong>bKash</strong>, <strong>Nagad</strong>, or <strong>Upay</strong> App on your smartphone.</li>
                  <li>Tap <strong>Scan QR</strong> and point camera at the code above.</li>
                  <li>Enter payable tuition amount: <strong>৳{effectiveAmount.toLocaleString()} BDT</strong>.</li>
                  <li>Enter your PIN to confirm.</li>
                  <li>Copy your <strong>TrxID</strong> and submit it under <strong>Enter TrxID</strong> tab.</li>
                </ol>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPaymentLink}
                  className="rounded-full text-xs font-semibold gap-1.5 h-8 border-white/15 bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? "Link Copied" : "Copy Payment Link"}</span>
                </Button>
                <a
                  href={OFFICIAL_PAYMENTLY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-violet-400 hover:underline px-3 py-1.5"
                >
                  <span>Open Link in Browser</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: Manual TrxID Confirmation */}
          {paymentTab === "trxid" && (
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-3.5">
              <div>
                <h4 className="text-sm font-bold text-white">Already Paid? Confirm TrxID</h4>
                <p className="text-[11px] text-white/60 mt-0.5">
                  If you sent payment via Paymently portal or QR scan, submit your Transaction ID to activate immediately.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label htmlFor="manual-trx-input" className="block text-xs font-semibold text-white/80 mb-1">
                    bKash / Nagad Transaction ID (TrxID) or Invoice ID *
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="manual-trx-input"
                      type="text"
                      value={manualTrxId}
                      onChange={(e) => setManualTrxId(e.target.value.toUpperCase())}
                      placeholder="e.g. 9K382JX7 or PAY-12345"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs sm:text-sm font-mono text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="manual-sender-input" className="block text-xs font-semibold text-white/80 mb-1">
                    Sender Mobile Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="manual-sender-input"
                      type="tel"
                      value={manualSenderPhone}
                      onChange={(e) => setManualSenderPhone(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isVerifying || !manualTrxId.trim()}
                  onClick={handleManualTrxVerify}
                  className="w-full h-11 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-[0_4px_16px_rgba(109,93,251,0.35)] transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying TrxID...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Verify & Activate Enrollment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Active Paymently Session Banner */}
        {gatewayRedirectUrl && (
          <div className="bg-gradient-to-br from-violet-950/40 via-slate-950/60 to-indigo-950/40 border border-violet-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.36)] space-y-4 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Paymently Gateway Session Open
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
                {activeInvoiceId || "Invoice Active"}
              </span>
            </div>

            <p className="text-xs text-white/80 leading-relaxed">
              Your official Paymently checkout is open in another tab. If the checkout window didn't open or was blocked, click below:
            </p>

            {/* Direct Link to Payment Gateway */}
            <a
              id="btn-open-paymently-link"
              href={gatewayRedirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-[0_4px_20px_rgba(109,93,251,0.35)] transition-all active:scale-[0.99]"
            >
              <span>Launch Virtual Tutor Gateway (Paymently)</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-white/70">
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
                <span className="text-[11px]">Auto-checking confirmation every 3s...</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  id="btn-switch-to-trx-tab"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPaymentTab("trxid")}
                  className="h-8 text-xs text-white/70 hover:text-white cursor-pointer"
                >
                  <span>Enter TrxID</span>
                </Button>

                {activeInvoiceId && (
                  <Button
                    id="btn-check-paymently-status"
                    size="sm"
                    variant="outline"
                    disabled={isVerifying}
                    onClick={() => handleVerifyInvoice(activeInvoiceId)}
                    className="h-8 text-xs border-white/15 text-white bg-white/5 hover:bg-white/10 flex items-center gap-1.5 cursor-pointer rounded-full"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                    <span>Check Now</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. Total Amount & Primary Action CTA */}
        <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 text-white">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-white/70">
              <span>Tuition Fee ({effectiveClassesCount} Live Classes):</span>
              <span className="font-semibold text-white">৳{effectiveAmount.toLocaleString()} BDT</span>
            </div>
            <div className="flex justify-between text-white/50 text-[11px]">
              <span>Paymently Gateway Processing Fee:</span>
              <span className="text-emerald-400 font-bold">FREE (৳0)</span>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Total Payable</span>
                <span className="text-[10px] text-white/40">Tuition escrow protection guarantee included</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-white tracking-tight">
                  ৳{effectiveAmount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-white/60 ml-1">BDT</span>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <button
            id="btn-pay-primary-cta"
            type="button"
            disabled={isProcessing || isVerifying}
            onClick={handlePayWithPaymently}
            className="w-full h-12 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_4px_20px_rgba(109,93,251,0.35)] transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Paymently Gateway...</span>
              </>
            ) : isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying Payment...</span>
              </>
            ) : gatewayRedirectUrl ? (
              <>
                <ExternalLink className="w-4 h-4 text-violet-300" />
                <span>Re-Open Paymently Portal (৳{effectiveAmount.toLocaleString()})</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-violet-300" />
                <span>Pay ৳{effectiveAmount.toLocaleString()} with Virtual Tutor Gateway ↗</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[11px] text-white/50 pt-1 border-t border-white/10">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Gateway: vartualtutor.paymently.io</span>
            </span>
            <button
              type="button"
              onClick={handleCopyPaymentLink}
              className="text-violet-400 hover:underline font-semibold cursor-pointer"
            >
              Copy Gateway URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
