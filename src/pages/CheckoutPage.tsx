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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

  // UddoktaPay gateway checkout URL and active invoice state
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

  // Verify payment with UddoktaPay server
  const handleVerifyInvoice = useCallback(
    async (invoiceId: string) => {
      if (!invoiceId) return;
      setIsVerifying(true);
      setVerificationError(null);

      try {
        const verifyRes = await fetch("/api/uddoktapay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: invoiceId,
            orderId: effectiveOrderId,
            amount: effectiveAmount,
          }),
        });

        const data = await verifyRes.json();

        const isCompleted =
          data.status === "COMPLETED" ||
          data.status === "VALID" ||
          data.status === "SUCCESS";

        if (isCompleted) {
          await verifyPaymentOrder({
            orderId: effectiveOrderId,
            gatewayInvoiceId: invoiceId,
            paymentGateway: data.payment_method ? `UddoktaPay (${data.payment_method})` : "UddoktaPay",
            gatewayStatus: "PAID",
            paidAmount: data.amount ? parseFloat(data.amount) : effectiveAmount,
            bankTranId: data.transaction_id || `UDD-${invoiceId}`,
          });

          setVerifiedInvoiceData({
            invoiceId: invoiceId,
            method: data.payment_method || "UddoktaPay",
            transactionId: data.transaction_id,
          });
          setIsPaidLocally(true);
          toast.success("Payment confirmed via UddoktaPay! Your enrollment is active.");
        } else if (data.status === "INITIATED" || data.status === "PENDING") {
          setVerificationError(
            "UddoktaPay status: Initiated. Please complete your transaction on the opened UddoktaPay tab using bKash, Nagad, or Rocket."
          );
        } else {
          setVerificationError(
            `UddoktaPay status: ${data.status || data.error || "Pending"}. If you just completed the payment, please allow a few moments and click check again.`
          );
        }
      } catch (err: any) {
        console.warn("UddoktaPay verify exception:", err);
        setVerificationError(err?.message || "Failed to contact UddoktaPay verification service.");
      } finally {
        setIsVerifying(false);
      }
    },
    [effectiveOrderId, effectiveAmount, verifyPaymentOrder]
  );

  // Read URL query parameters for automatic verification callback from UddoktaPay
  useEffect(() => {
    const invoiceId = searchParams.get("invoice_id") || searchParams.get("invoiceId");
    const statusParam = searchParams.get("status") || searchParams.get("gateway_status");

    if (statusParam === "cancel") {
      toast.error("Payment was cancelled on UddoktaPay. You can try again whenever you're ready.");
      return;
    }

    if (invoiceId && !isPaid && !isVerifying) {
      setActiveInvoiceId(invoiceId);
      handleVerifyInvoice(invoiceId);
    }
  }, [searchParams, isPaid, isVerifying, handleVerifyInvoice]);

  // Automatic background polling while waiting for UddoktaPay payment confirmation
  useEffect(() => {
    if (isPaid || !activeInvoiceId) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      if (!isSubscribed) return;

      try {
        const verifyRes = await fetch("/api/uddoktapay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: activeInvoiceId,
            orderId: effectiveOrderId,
            amount: effectiveAmount,
          }),
        });
        const data = await verifyRes.json();

        const isCompleted =
          data.status === "COMPLETED" ||
          data.status === "VALID" ||
          data.status === "SUCCESS";

        if (isCompleted && isSubscribed) {
          clearInterval(interval);
          await verifyPaymentOrder({
            orderId: effectiveOrderId,
            gatewayInvoiceId: activeInvoiceId,
            paymentGateway: data.payment_method ? `UddoktaPay (${data.payment_method})` : "UddoktaPay",
            gatewayStatus: "PAID",
            paidAmount: data.amount ? parseFloat(data.amount) : effectiveAmount,
            bankTranId: data.transaction_id || `UDD-${activeInvoiceId}`,
          });

          setVerifiedInvoiceData({
            invoiceId: activeInvoiceId,
            method: data.payment_method || "UddoktaPay",
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
  }, [isPaid, activeInvoiceId, effectiveOrderId, effectiveAmount, verifyPaymentOrder]);

  // Primary Action: Initialize UddoktaPay and open checkout window safely
  const handlePayWithUddoktaPay = async () => {
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
        paymentGateway: "UDDOKTAPAY",
        studentName: resolvedName,
        studentEmail: studentEmail || user?.email || "student@vartualtutor.com",
        studentPhone: studentPhone || "01700000000",
      });

      // 2. Initialize charge via UddoktaPay endpoint
      let targetPaymentUrl = gatewayRedirectUrl;
      let targetInvoiceId = activeInvoiceId;

      if (!targetPaymentUrl) {
        const initRes = await fetch("/api/uddoktapay/init", {
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
        });

        const initData = await initRes.json();

        if (initData.payment_url) {
          targetPaymentUrl = initData.payment_url;
          targetInvoiceId = initData.invoice_id;
          setGatewayRedirectUrl(targetPaymentUrl);
          if (targetInvoiceId) {
            setActiveInvoiceId(targetInvoiceId);
          }
        } else if (initData.error) {
          throw new Error(initData.error);
        } else {
          throw new Error("Could not retrieve UddoktaPay checkout URL.");
        }
      }

      // 3. Open UddoktaPay hosted portal in a new top-level tab
      // NOTE: UddoktaPay uses X-Frame-Options: SAMEORIGIN, so it must open in a top tab, NEVER inside the iframe!
      if (targetPaymentUrl) {
        toast.info("Opening UddoktaPay secure checkout...", { duration: 4000 });
        try {
          const newTab = window.open(targetPaymentUrl, "_blank", "noopener,noreferrer");
          if (newTab) {
            newTab.focus();
          }
        } catch (winErr) {
          console.warn("Could not auto-open popup:", winErr);
        }
      }
    } catch (err: any) {
      console.error("UddoktaPay initialization error:", err);
      toast.error(err?.message || "Failed to initialize UddoktaPay payment gateway.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS VIEW: Payment Successful Page
  // ─────────────────────────────────────────────────────────────────────────────
  if (isPaid) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl border border-[#E5E4DE] shadow-sm p-6 sm:p-10 text-center space-y-6">
            {/* Green Verified Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5" />
                Verified via UddoktaPay
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                Payment Successful!
              </h1>
              <p className="text-xs sm:text-sm text-[#111111]/70 max-w-md mx-auto leading-relaxed">
                Congratulations! You are officially enrolled in your live tuition course. Class access credentials and receipt details have been sent to{" "}
                <strong className="text-[#111111]">
                  {order?.student_email || studentEmail || user?.email || "your registered email"}
                </strong>.
              </p>
            </div>

            {/* Enrolled Details Card */}
            <div className="bg-[#FAF9F5] rounded-2xl p-5 border border-[#E5E4DE] text-left space-y-3.5 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-[#E5E4DE]">
                <ProfileAvatar
                  name={effectiveTeacherName}
                  image={sanitizedTeacherPhoto}
                  size="md"
                  shape="rounded"
                  role="teacher"
                  isVerified={true}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[#111111] text-sm truncate">{effectiveTeacherName}</h3>
                  <p className="text-[#111111]/60 text-xs truncate">
                    {effectiveSubject} · {effectiveCourseName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[#111111]/50 block text-[11px]">Order ID</span>
                  <span className="font-mono font-bold text-[#111111]">
                    {order?.order_id || effectiveOrderId}
                  </span>
                </div>
                <div>
                  <span className="text-[#111111]/50 block text-[11px]">UddoktaPay Invoice</span>
                  <span className="font-mono font-bold text-[#111111] truncate block">
                    {verifiedInvoiceData?.invoiceId || activeInvoiceId || order?.gateway_invoice_id || "UDD-PAID"}
                  </span>
                </div>
                <div>
                  <span className="text-[#111111]/50 block text-[11px]">Amount Paid</span>
                  <span className="font-black text-[#111111] text-sm">৳{effectiveAmount.toLocaleString()} BDT</span>
                </div>
                <div>
                  <span className="text-[#111111]/50 block text-[11px]">Payment Method</span>
                  <span className="font-semibold text-[#111111]">
                    {verifiedInvoiceData?.method ? `UddoktaPay (${verifiedInvoiceData.method})` : "UddoktaPay"}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Action: Go to My Classes */}
            <div className="pt-2 space-y-3">
              <button
                id="btn-go-to-my-classes"
                onClick={() => navigate("/lessons")}
                className="w-full h-12 rounded-full bg-[#111111] hover:bg-[#222222] text-white font-bold text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Go to My Classes</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-[#111111]/70 hover:text-[#111111] inline-flex items-center gap-1.5 font-medium py-1 px-2 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <span className="text-[#E5E4DE]">·</span>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="text-[#111111]/70 hover:text-[#111111] font-medium py-1 px-2 cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#111111]/50 pt-2 border-t border-[#E5E4DE] flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Processed securely via UddoktaPay Bangladesh Tuition Escrow</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHECKOUT PAGE: 100% Dedicated UddoktaPay Gateway
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F7F4] py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Top Navigation Header */}
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#111111]/70 hover:text-[#111111] py-1 px-2 -ml-2 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="inline-flex items-center gap-1.5 text-xs text-[#111111]/60 font-medium">
            <Lock className="w-3.5 h-3.5 text-[#F26522]" />
            <span>UddoktaPay Official Gateway</span>
          </div>
        </div>

        {/* Verification in Progress Alert */}
        {isVerifying && (
          <div className="bg-[#FAF9F5] border border-[#F26522]/40 rounded-2xl p-4 flex items-center gap-3 text-[#111111] text-xs animate-pulse">
            <Loader2 className="w-5 h-5 text-[#F26522] animate-spin shrink-0" />
            <div>
              <p className="font-bold text-[#111111]">Verifying payment with UddoktaPay...</p>
              <p className="text-[#111111]/70 mt-0.5">Please wait while we confirm your transaction with the payment gateway.</p>
            </div>
          </div>
        )}

        {/* Verification Notice / Retry if returning from UddoktaPay */}
        {verificationError && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-900">Payment Status Notice</p>
              <p className="text-amber-800 mt-0.5">{verificationError}</p>
              {activeInvoiceId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerifyInvoice(activeInvoiceId)}
                  className="mt-2 h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Check Status Again</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 1. Review Class & Educator Card */}
        <div className="bg-white rounded-3xl border border-[#E5E4DE] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-start gap-4">
            <ProfileAvatar
              name={effectiveTeacherName}
              image={sanitizedTeacherPhoto}
              size="lg"
              shape="rounded"
              role="teacher"
              isVerified={true}
              className="shrink-0 shadow-2xs"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF9F5] text-[#111111] border border-[#E5E4DE]">
                  {effectiveSubject}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Award className="w-3 h-3 text-amber-600" />
                  Verified Educator
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#111111] mt-1 truncate">
                {effectiveTeacherName}
              </h2>
              <p className="text-xs text-[#111111]/70 line-clamp-1 font-medium mt-0.5">
                {effectiveCourseName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#E5E4DE] text-xs">
            <div className="bg-[#FAF9F5] rounded-xl p-2.5 border border-[#E5E4DE]">
              <span className="text-[#111111]/50 block text-[10px] font-medium">Total Classes</span>
              <span className="font-bold text-[#111111] text-xs sm:text-sm">{effectiveClassesCount} Live Sessions</span>
            </div>
            <div className="bg-[#FAF9F5] rounded-xl p-2.5 border border-[#E5E4DE]">
              <span className="text-[#111111]/50 block text-[10px] font-medium">Tuition Amount</span>
              <span className="font-bold text-[#111111] text-xs sm:text-sm">৳{effectiveAmount.toLocaleString()} BDT</span>
            </div>
          </div>
        </div>

        {/* 2. Student Information Form */}
        <div className="bg-white rounded-3xl border border-[#E5E4DE] p-5 sm:p-6 shadow-xs space-y-3.5">
          <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            Student Information
          </h3>

          <div className="space-y-3">
            <div>
              <label htmlFor="student-name-input" className="block text-xs font-semibold text-[#111111] mb-1">
                Student Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#111111]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="student-name-input"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student full name"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E4DE] text-xs sm:text-sm text-[#111111] placeholder:text-[#111111]/40 focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="student-phone-input" className="block text-xs font-semibold text-[#111111] mb-1">
                  Mobile Number (bKash / Nagad)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#111111]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="student-phone-input"
                    type="tel"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E4DE] text-xs sm:text-sm text-[#111111] placeholder:text-[#111111]/40 focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="student-email-input" className="block text-xs font-semibold text-[#111111] mb-1">
                  Receipt Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#111111]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="student-email-input"
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E4DE] text-xs sm:text-sm text-[#111111] placeholder:text-[#111111]/40 focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Official Payment Gateway Card */}
        <div className="bg-white rounded-3xl border border-[#E5E4DE] p-5 sm:p-6 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              Payment Gateway
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#111111] bg-[#FAF9F5] px-2.5 py-0.5 rounded-full border border-[#E5E4DE]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              UddoktaPay Official Gateway
            </span>
          </div>

          <div className="p-4 rounded-2xl border-2 border-[#111111] bg-[#FAF9F5] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#111111]">UddoktaPay Automated Checkout</h4>
                <p className="text-[11px] text-[#111111]/60 mt-0.5">
                  Official hosted checkout portal with instant verification
                </p>
              </div>
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Active Gateway" />
            </div>

            {/* Supported Channels in UddoktaPay */}
            <div className="pt-2 border-t border-[#E5E4DE]">
              <span className="text-[10px] font-bold text-[#111111]/50 uppercase tracking-wider block mb-2">
                Available channels on UddoktaPay portal:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#D12053] text-white shadow-2xs">
                  bKash
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F7941D] text-white shadow-2xs">
                  Nagad
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#8C3494] text-white shadow-2xs">
                  Rocket
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#2E3192] text-white shadow-2xs">
                  Upay
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#111111] text-white shadow-2xs">
                  Cards
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#E5E4DE] text-[#111111]">
                  Internet Banking
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#111111]/60 pt-1">
              Selecting payment will launch UddoktaPay's secure checkout window where you can complete your payment via bKash, Nagad, or Rocket.
            </p>
          </div>
        </div>

        {/* 4. Active UddoktaPay Session & Waiting Panel */}
        {gatewayRedirectUrl && (
          <div className="bg-[#FAF9F5] border-2 border-[#F26522] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E4DE]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#F26522] animate-ping" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  UddoktaPay Payment Portal Active
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#111111] bg-white px-2 py-0.5 rounded-md border border-[#E5E4DE]">
                {activeInvoiceId || "Invoice Ready"}
              </span>
            </div>

            <p className="text-xs text-[#111111]/80 leading-relaxed">
              Your official UddoktaPay checkout is open in a new tab. If the window did not open automatically, click the button below to complete your payment:
            </p>

            {/* Direct Link to Payment Gateway */}
            <a
              id="btn-open-uddoktapay-link"
              href={gatewayRedirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-full bg-[#111111] hover:bg-[#222222] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99]"
            >
              <span>Open UddoktaPay Checkout (bKash / Nagad / Rocket)</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="pt-2 border-t border-[#E5E4DE] flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#111111]/70">
                <Loader2 className="w-4 h-4 text-[#F26522] animate-spin shrink-0" />
                <span className="text-[11px]">Auto-checking status every 3 seconds...</span>
              </div>

              {activeInvoiceId && (
                <Button
                  id="btn-check-uddoktapay-status"
                  size="sm"
                  variant="outline"
                  disabled={isVerifying}
                  onClick={() => handleVerifyInvoice(activeInvoiceId)}
                  className="h-8 text-xs border-[#E5E4DE] text-[#111111] bg-white hover:bg-[#FAF9F5] flex items-center gap-1.5 cursor-pointer rounded-full"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                  <span>Check Status Now</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 5. Total Amount & Primary Action CTA */}
        <div className="bg-white rounded-3xl border border-[#E5E4DE] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#111111]/70">
              <span>Tuition Fee ({effectiveClassesCount} Live Classes):</span>
              <span className="font-semibold text-[#111111]">৳{effectiveAmount.toLocaleString()} BDT</span>
            </div>
            <div className="flex justify-between text-[#111111]/50 text-[11px]">
              <span>UddoktaPay Gateway Fee:</span>
              <span className="text-emerald-600 font-bold">FREE (৳0)</span>
            </div>
            <div className="pt-3 border-t border-[#E5E4DE] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#111111] block">Total Amount</span>
                <span className="text-[10px] text-[#111111]/40">All gateway fees and taxes included</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#111111] tracking-tight">
                  ৳{effectiveAmount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-[#111111]/60 ml-1">BDT</span>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <button
            id="btn-pay-primary-cta"
            type="button"
            disabled={isProcessing || isVerifying}
            onClick={handlePayWithUddoktaPay}
            className="w-full h-12 rounded-full bg-[#111111] hover:bg-[#222222] text-white font-bold text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to UddoktaPay...</span>
              </>
            ) : isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying Payment...</span>
              </>
            ) : gatewayRedirectUrl ? (
              <>
                <ExternalLink className="w-4 h-4 text-[#F26522]" />
                <span>Re-Open UddoktaPay Portal (৳{effectiveAmount.toLocaleString()})</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-[#F26522]" />
                <span>Pay ৳{effectiveAmount.toLocaleString()} with UddoktaPay ↗</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-[#111111]/40 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Automated payment with bKash, Nagad, Rocket, Upay & Cards via UddoktaPay.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
