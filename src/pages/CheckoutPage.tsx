import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { usePaymentDetails, usePaymentMutations } from "@/hooks/use-payments";
import { useAuth } from "@/hooks/use-auth";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Smartphone,
  Building2,
  ArrowLeft,
  RotateCcw,
  Calendar,
  Clock,
  User,
  BookOpen,
  Printer,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CheckoutPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const payment = usePaymentDetails(transactionId);
  const { verifyAndFinalizePayment: verifyPaymentMut, recordPaymentFailure: recordFailureMut } =
    usePaymentMutations();

  const [selectedMethod, setSelectedMethod] = useState<"bkash" | "nagad" | "rocket" | "card" | "bank">("bkash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulatedCardNumber, setSimulatedCardNumber] = useState("4111 2222 3333 4444");
  const [simulatedMfsNumber, setSimulatedMfsNumber] = useState("01712345678");
  const [gatewayConfig, setGatewayConfig] = useState<{
    configured: boolean;
    isSandbox: boolean;
    currency: string;
  } | null>(null);

  // Check backend SSLCOMMERZ configuration status
  useEffect(() => {
    fetch("/api/sslcommerz/config")
      .then((res) => res.json())
      .then((data) => setGatewayConfig(data))
      .catch(() => setGatewayConfig({ configured: false, isSandbox: true, currency: "BDT" }));
  }, []);

  // Handle gateway redirects (e.g. ?gateway_status=success&val_id=...)
  useEffect(() => {
    const gatewayStatus = searchParams.get("gateway_status");
    const valId = searchParams.get("val_id");

    if (!payment || payment.status === "paid" || !transactionId || !gatewayStatus) return;

    if (gatewayStatus === "success" || gatewayStatus === "VALID" || gatewayStatus === "VALIDATED") {
      handleFinalizePayment(valId || `VAL-${Date.now()}`, "SSLCOMMERZ Gateway");
    } else if (gatewayStatus === "fail" || gatewayStatus === "FAILED") {
      recordFailureMut({
        transactionId,
        reason: "Gateway returned payment failure",
        isCancelled: false,
      });
      toast.error("Payment attempt was declined by the bank or gateway.");
    } else if (gatewayStatus === "cancel" || gatewayStatus === "CANCELLED") {
      recordFailureMut({
        transactionId,
        reason: "User cancelled the payment process",
        isCancelled: true,
      });
      toast.info("Payment was cancelled. You can retry when you are ready.");
    }
  }, [searchParams, payment, transactionId]);

  const handleFinalizePayment = async (valId: string, cardType: string) => {
    if (!transactionId) return;
    setIsProcessing(true);
    try {
      const res = await verifyPaymentMut({
        transactionId,
        valId,
        bankTranId: `BNK-${Date.now().toString(36).toUpperCase()}`,
        cardType,
        gatewayStatus: "VALID",
        amount: payment?.amount,
        currency: "BDT",
      });

      if (res.success) {
        toast.success("Tuition fee successfully verified! Booking confirmed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to verify payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateFailure = async () => {
    if (!transactionId) return;
    setIsProcessing(true);
    try {
      await recordFailureMut({
        transactionId,
        reason: "Test failure simulated by user",
        isCancelled: false,
      });
      toast.error("Payment marked as failed. You can safely retry.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateCancel = async () => {
    if (!transactionId) return;
    setIsProcessing(true);
    try {
      await recordFailureMut({
        transactionId,
        reason: "Payment cancelled by user",
        isCancelled: true,
      });
      toast.info("Payment cancelled.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (!payment) {
    return (
      <div className="min-h-screen bg-[#F5F4EF] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 text-center max-w-sm w-full shadow-xs">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Loading Payment Order...</h2>
          <p className="text-xs text-slate-500 mt-1">Retrieving SSLCOMMERZ transaction ledger.</p>
        </div>
      </div>
    );
  }

  const grossAmount = payment.amount || 4000;
  const platformFee = Math.round(grossAmount * 0.15);
  const teacherShare = grossAmount - platformFee;
  const isPaid = payment.status === "paid";
  const isFailed = payment.status === "failed";
  const isCancelled = payment.status === "cancelled";

  return (
    <div className="min-h-screen bg-[#F5F4EF] text-[#111111] py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-stone-200 text-xs font-semibold text-slate-700 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SSLCOMMERZ 256-Bit Encrypted</span>
          </div>
        </div>

        {isPaid ? (
          /* ─── Confirmed Payment Receipt View ─────────────────────────────── */
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-10 shadow-xs">
            <div className="text-center max-w-md mx-auto mb-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold mb-2">
                Payment Status: Settled & Confirmed
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Official Tuition Payment Receipt
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Virtual Tutor has verified your transaction. Classroom access is granted.
              </p>
            </div>

            {/* Receipt Box */}
            <div id="payment-receipt" className="bg-stone-50 rounded-2xl border border-stone-200 p-6 mb-8 text-xs space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-stone-200">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Merchant</p>
                  <p className="font-bold text-slate-900 text-sm">Virtual Tutor Ltd. (ভার্চুয়াল টিউটর)</p>
                  <p className="text-slate-500 text-[11px]">Authorized Education Payment Gateway</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Transaction ID</p>
                  <p className="font-mono font-bold text-teal-700 text-sm">{payment.transactionId}</p>
                  <p className="text-slate-500 text-[11px]">{new Date(payment.paidAt || payment.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Student & Teacher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 border-b border-stone-200">
                <div>
                  <p className="text-slate-400 font-semibold text-[11px]">Student Attendee</p>
                  <p className="font-bold text-slate-800 text-sm">{payment.studentName || user?.name || "Student"}</p>
                  <p className="text-slate-500 text-[11px]">{user?.email || "Enrolled Learner"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold text-[11px]">Educator / Faculty</p>
                  <p className="font-bold text-slate-800 text-sm">{payment.teacherName || "Instructor"}</p>
                  <p className="text-slate-500 text-[11px]">Subject: {payment.booking?.subject || "Private Academic Tutoring"}</p>
                </div>
              </div>

              {/* Session Details */}
              {payment.booking && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2 border-b border-stone-200">
                  <div>
                    <span className="text-slate-400 font-medium">Session Date:</span>
                    <p className="font-semibold text-slate-800">{payment.booking.date}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Session Time:</span>
                    <p className="font-semibold text-slate-800">{payment.booking.timeSlot}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Meeting Code:</span>
                    <p className="font-mono font-bold text-blue-600">{payment.booking.meetingCode || "SCHEDULED"}</p>
                  </div>
                </div>
              )}

              {/* Commission & Amount Breakdown */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Tuition Amount:</span>
                  <span className="font-semibold text-slate-900">৳{grossAmount.toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Virtual Tutor Platform Fee (15%):</span>
                  <span>৳{platformFee.toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Educator Net Allocation (85%):</span>
                  <span>৳{teacherShare.toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Payment Method:</span>
                  <span className="font-semibold text-slate-800">{payment.paymentMethod || "SSLCOMMERZ BDT"}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-stone-200 text-sm font-bold">
                  <span className="text-slate-900">Total Paid by Student:</span>
                  <span className="text-emerald-600 text-lg font-black">৳{grossAmount.toLocaleString()} BDT</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                variant="outline"
                onClick={handlePrintReceipt}
                className="w-full sm:w-auto rounded-full text-xs font-semibold gap-2 border-stone-300"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Receipt</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full sm:w-auto rounded-full text-xs font-semibold"
              >
                Return to Dashboard
              </Button>
              <Button
                onClick={() => {
                  if (payment.booking?.lessonId) {
                    navigate(`/classroom?sessionId=${payment.booking.lessonId}`);
                  } else {
                    navigate("/lessons");
                  }
                }}
                className="w-full sm:flex-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-2 shadow-xs"
              >
                <span>Enter Live Classroom</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          /* ─── Active Payment / Checkout Gateway Form ──────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Payment Selection */}
            <div className="lg:col-span-2 space-y-6">
              {/* Failure / Cancel Alerts if user retrying */}
              {isFailed && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-rose-900">Previous payment attempt failed</p>
                    <p className="text-rose-700 mt-0.5">
                      Your booking is safely held in pending status. Please select an alternate payment method or retry below. No duplicate bookings will be created.
                    </p>
                  </div>
                </div>
              )}

              {isCancelled && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-amber-900">Payment was cancelled</p>
                    <p className="text-amber-700 mt-0.5">
                      You can complete your tuition payment whenever you are ready.
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Methods Card */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Select Payment Method</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Supported gateways via SSLCOMMERZ Bangladesh
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    Instant Clearance
                  </span>
                </div>

                {/* Method Tabs */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod("bkash")}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      selectedMethod === "bkash"
                        ? "border-pink-500 bg-pink-50/60 ring-2 ring-pink-500/20"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <Smartphone className="w-5 h-5 mx-auto mb-1 text-pink-600" />
                    <span className="text-xs font-bold block text-slate-800">bKash</span>
                    <span className="text-[9px] text-slate-400">বিকাশ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod("nagad")}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      selectedMethod === "nagad"
                        ? "border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <Smartphone className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                    <span className="text-xs font-bold block text-slate-800">Nagad</span>
                    <span className="text-[9px] text-slate-400">নগদ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod("rocket")}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      selectedMethod === "rocket"
                        ? "border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <Smartphone className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                    <span className="text-xs font-bold block text-slate-800">Rocket</span>
                    <span className="text-[9px] text-slate-400">রকেট</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod("card")}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      selectedMethod === "card"
                        ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                    <span className="text-xs font-bold block text-slate-800">Card</span>
                    <span className="text-[9px] text-slate-400">Visa / MC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod("bank")}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      selectedMethod === "bank"
                        ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <Building2 className="w-5 h-5 mx-auto mb-1 text-teal-600" />
                    <span className="text-xs font-bold block text-slate-800">Bank</span>
                    <span className="text-[9px] text-slate-400">Net Banking</span>
                  </button>
                </div>

                {/* Method Input Details */}
                <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5 space-y-4 text-xs">
                  {selectedMethod === "bkash" && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">bKash Wallet Number</label>
                      <input
                        type="text"
                        value={simulatedMfsNumber}
                        onChange={(e) => setSimulatedMfsNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-mono text-xs focus:ring-2 focus:ring-pink-500 outline-hidden"
                        placeholder="017XXXXXXXX"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        You will authorize via the official bKash Payment gateway PIN prompt.
                      </p>
                    </div>
                  )}

                  {selectedMethod === "nagad" && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Nagad Account Number</label>
                      <input
                        type="text"
                        value={simulatedMfsNumber}
                        onChange={(e) => setSimulatedMfsNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-mono text-xs focus:ring-2 focus:ring-orange-500 outline-hidden"
                        placeholder="01XXXXXXXXX"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Redirects to Nagad secure checkout OTP confirmation.
                      </p>
                    </div>
                  )}

                  {selectedMethod === "rocket" && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">DBBL Rocket 12-Digit Number</label>
                      <input
                        type="text"
                        value={simulatedMfsNumber + "1"}
                        onChange={(e) => setSimulatedMfsNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-mono text-xs focus:ring-2 focus:ring-purple-500 outline-hidden"
                        placeholder="01XXXXXXXXXX"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Dutch-Bangla Bank Rocket mobile banking service.
                      </p>
                    </div>
                  )}

                  {selectedMethod === "card" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Card Number (Debit or Credit)</label>
                        <input
                          type="text"
                          value={simulatedCardNumber}
                          onChange={(e) => setSimulatedCardNumber(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Expiry</label>
                          <input
                            type="text"
                            defaultValue="12/28"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-mono text-xs outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">CVV / CVC</label>
                          <input
                            type="password"
                            defaultValue="123"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-mono text-xs outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMethod === "bank" && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Select Bank</label>
                      <select className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-hidden">
                        <option>City Bank (City Touch)</option>
                        <option>Islami Bank Bangladesh (iBanking)</option>
                        <option>Eastern Bank (EBL Skybanking)</option>
                        <option>BRAC Bank (Astha)</option>
                        <option>DBBL Nexus Gateway</option>
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Direct bank account transfer through SSLCOMMERZ internet banking.
                      </p>
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="pt-5 space-y-3">
                  <Button
                    onClick={() =>
                      handleFinalizePayment(
                        `VAL-SSL-${Date.now().toString(36).toUpperCase()}`,
                        selectedMethod.toUpperCase()
                      )
                    }
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying with SSLCOMMERZ...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-teal-300" />
                        <span>Pay ৳{grossAmount.toLocaleString()} BDT Securely</span>
                      </>
                    )}
                  </Button>

                  {/* Testing / Sandbox Simulation Options */}
                  <div className="pt-2 border-t border-stone-200">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                      Gateway Sandbox & Testing Controls
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSimulateFailure}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors"
                      >
                        Simulate Payment Failure
                      </button>
                      <button
                        type="button"
                        onClick={handleSimulateCancel}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                      >
                        Simulate Payment Cancellation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs text-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 border-b border-stone-100 pb-3">
                  Tuition Order Summary
                </h3>

                <div>
                  <span className="text-slate-400 font-medium">Subject & Educator</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {payment.booking?.subject || "Private Academic Tutoring"}
                  </p>
                  <p className="text-slate-600 mt-0.5">with {payment.teacherName || "Instructor"}</p>
                </div>

                {payment.booking && (
                  <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{payment.booking.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{payment.booking.timeSlot} ({payment.booking.durationMinutes || 60} mins)</span>
                    </div>
                  </div>
                )}

                {/* Mathematical Commission Breakdown */}
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Student Tuition Fee:</span>
                    <span className="font-semibold text-slate-900">৳{grossAmount.toLocaleString()} BDT</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Virtual Tutor Platform Take (15%):</span>
                    <span>৳{platformFee.toLocaleString()} BDT</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Educator Earnings (85%):</span>
                    <span>৳{teacherShare.toLocaleString()} BDT</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-stone-200 text-sm font-bold">
                    <span className="text-slate-900">Total Payable:</span>
                    <span className="text-teal-700 font-black text-base">৳{grossAmount.toLocaleString()} BDT</span>
                  </div>
                </div>

                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3 text-[11px] text-blue-900 leading-relaxed">
                  <strong>Protected Escrow Policy:</strong> Your tuition payment is held securely by Virtual Tutor. Teacher earnings accumulate and are disbursed during monthly settlement once classes are delivered.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
