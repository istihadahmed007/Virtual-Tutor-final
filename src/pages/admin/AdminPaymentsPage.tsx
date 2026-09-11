import { useState } from "react";
import {
  useFinancialSummary,
  useAdminTransactions,
  useAdminPayouts,
  useFinancialAuditLogs,
  useSettlementPreview,
  usePaymentMutations,
} from "@/hooks/use-payments";
import { Id } from "@/convex/_generated/dataModel";
import {
  CreditCard,
  Percent,
  Wallet,
  CheckCircle2,
  Clock,
  RotateCcw,
  DollarSign,
  Filter,
  Search,
  ShieldCheck,
  Loader2,
  QrCode,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "payouts" | "settlement" | "audit">("overview");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copiedPaymentLink, setCopiedPaymentLink] = useState(false);

  // Queries
  const summary = useFinancialSummary();
  const transactions = useAdminTransactions(statusFilter);
  const payouts = useAdminPayouts();
  const auditLogs = useFinancialAuditLogs(100);

  // Monthly Settlement Date Range (Default: previous full calendar month)
  const [settlementStart, setSettlementStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split("T")[0];
  });
  const [settlementEnd, setSettlementEnd] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59).toISOString().split("T")[0];
  });

  const periodStartMs = new Date(settlementStart).getTime();
  const periodEndMs = new Date(settlementEnd).setHours(23, 59, 59, 999);

  const settlementPreview = useSettlementPreview(periodStartMs, periodEndMs);

  // Mutations
  const {
    adminCreateMonthlySettlement: createSettlementMut,
    adminUpdatePayoutStatus: updatePayoutStatusMut,
    adminProcessRefund: processRefundMut,
  } = usePaymentMutations();

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<any>(null);
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);

  // Payout Update Modal State
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [payoutStatus, setPayoutStatus] = useState<"pending" | "approved" | "processing" | "paid" | "failed">("approved");
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "bkash" | "nagad" | "rocket" | "other">("bank");
  const [payoutReference, setPayoutReference] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [isUpdatingPayout, setIsUpdatingPayout] = useState(false);

  // Generating Settlement State
  const [isGeneratingSettlement, setIsGeneratingSettlement] = useState(false);

  const handleRefundSubmit = async () => {
    if (!selectedPaymentForRefund || !refundReason.trim()) {
      toast.error("Please enter a reason for the refund.");
      return;
    }

    setIsRefunding(true);
    try {
      await processRefundMut({
        paymentId: selectedPaymentForRefund._id as Id<"payments">,
        reason: refundReason,
      });
      toast.success(`Payment ${selectedPaymentForRefund.transactionId} refunded successfully.`);
      setRefundModalOpen(false);
      setSelectedPaymentForRefund(null);
      setRefundReason("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to process refund");
    } finally {
      setIsRefunding(false);
    }
  };

  const handlePayoutUpdateSubmit = async () => {
    if (!selectedPayout) return;

    setIsUpdatingPayout(true);
    try {
      await updatePayoutStatusMut({
        payoutId: selectedPayout._id as Id<"teacherPayouts">,
        status: payoutStatus,
        payoutMethod,
        payoutReference: payoutReference || undefined,
        notes: payoutNotes || undefined,
      });
      toast.success(`Payout ${selectedPayout._id} updated to ${payoutStatus}.`);
      setPayoutModalOpen(false);
      setSelectedPayout(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update payout status");
    } finally {
      setIsUpdatingPayout(false);
    }
  };

  const handleGenerateSettlement = async () => {
    if (!settlementPreview || settlementPreview.length === 0) {
      toast.error("No eligible payable teacher earnings found in selected range.");
      return;
    }

    setIsGeneratingSettlement(true);
    try {
      const res = await createSettlementMut({
        periodStart: periodStartMs,
        periodEnd: periodEndMs,
        notes: `Monthly settlement batch for ${settlementStart} to ${settlementEnd}`,
      });
      toast.success(`Generated ${res.createdCount} teacher payout records for review!`);
      setActiveTab("payouts");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate settlement");
    } finally {
      setIsGeneratingSettlement(false);
    }
  };

  // Filtered transactions by search
  const filteredTransactions = (transactions || []).filter((tx: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tx.transactionId.toLowerCase().includes(term) ||
      (tx.studentName && tx.studentName.toLowerCase().includes(term)) ||
      (tx.teacherName && tx.teacherName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-teal-700" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Virtual Tutor Financial Treasury & Ledger
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Virtual Tutor collects 100% student tuition up front, retains a 15% platform commission, and manages end-of-month 85% educator settlements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-teal-50 text-teal-800 text-xs font-bold px-3 py-1.5 rounded-full border border-teal-200/80">
              Platform Take: 15% Commission
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-stone-100">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === "overview"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-stone-100 text-slate-600 hover:bg-stone-200/70"
            }`}
          >
            Overview & Metrics
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === "transactions"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-stone-100 text-slate-600 hover:bg-stone-200/70"
            }`}
          >
            Student Payments ({transactions?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("payouts")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === "payouts"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-stone-100 text-slate-600 hover:bg-stone-200/70"
            }`}
          >
            Teacher Payouts ({payouts?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("settlement")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === "settlement"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-teal-50 text-teal-800 hover:bg-teal-100"
            }`}
          >
            Monthly Settlement Engine
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === "audit"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-stone-100 text-slate-600 hover:bg-stone-200/70"
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* ─── TAB 1: FINANCIAL OVERVIEW & KPIS ─────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Total Tuition Collected */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Tuition Collected</span>
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  ৳{(summary?.totalStudentPayments ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-bold">BDT</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                From {summary?.totalTransactions ?? 0} total student transactions
              </p>
            </div>

            {/* Platform 15% Commission */}
            <div className="bg-white p-5 rounded-3xl border border-teal-200/80 bg-linear-to-br from-white to-teal-50/30 shadow-xs">
              <div className="flex items-center justify-between text-teal-700 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Platform Take (15%)</span>
                <Percent className="w-5 h-5 text-teal-700" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-teal-800">
                  ৳{(summary?.platformCommission ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-teal-600 font-bold">BDT Net</span>
              </div>
              <p className="text-[11px] text-teal-600 font-medium mt-1">
                Authoritative platform earnings retained
              </p>
            </div>

            {/* Teacher Payable Balance */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Teacher Accumulated Balance</span>
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-blue-700">
                  ৳{(summary?.teacherPayable ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-bold">BDT (85%)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Accumulates during month for month-end payout
              </p>
            </div>

            {/* Pending Payout Batches */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Payout Batches</span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-600">
                  ৳{(summary?.pendingTeacherPayouts ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-bold">BDT</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Batches generated awaiting admin approval
              </p>
            </div>

            {/* Completed Disbursed Payouts */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Disbursed to Teachers</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                  ৳{(summary?.completedTeacherPayouts ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-bold">BDT</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Successfully paid via Bank / bKash / Nagad
              </p>
            </div>

            {/* Refunds Issued */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Refunds Issued</span>
                <RotateCcw className="w-5 h-5 text-rose-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-rose-600">
                  ৳{(summary?.refunds ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-bold">BDT</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {summary?.failedPayments ?? 0} cancelled/failed attempts
              </p>
            </div>
          </div>

          {/* Quick Explanatory Architecture Card */}
          <div className="bg-stone-50 rounded-3xl border border-stone-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">
                  Authoritative Settlement Rules & Split Mechanics
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Every transaction is validated through secure gateway verification. When paid, the backend authoritatively calculates <strong>15% Platform Commission</strong> and <strong>85% Educator Share</strong>. Educator earnings are held in a payable escrow state and disbursed on the final day of each calendar month via the Monthly Settlement Engine.
                </p>
              </div>
            </div>
          </div>

          {/* Paymently / UddoktaPay Gateway & Direct QR Treasury Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Paymently / UddoktaPay Production Treasury
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Gateway
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live payment link & scan-to-pay QR code integrated across checkout and tuition bookings
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://vartualtutor.paymently.io/paymentlink/default/BDT"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors"
                >
                  <span>Open Gateway Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* QR Preview */}
              <div className="md:col-span-4 flex flex-col items-center bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center">
                <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs mb-2">
                  <img
                    src="/payment-link-BDT-2026-09-11.svg"
                    alt="Paymently BDT Payment Link QR Code"
                    className="w-36 h-36 object-contain"
                  />
                </div>
                <span className="text-xs font-bold text-slate-800">Scan-to-Pay QR (BDT)</span>
                <span className="text-[11px] text-slate-500">Supports bKash, Nagad, Rocket & Cards</span>
              </div>

              {/* Gateway Links & Settings */}
              <div className="md:col-span-8 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Direct Payment Link (Public)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-slate-700 truncate select-all">
                      https://vartualtutor.paymently.io/paymentlink/default/BDT
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText("https://vartualtutor.paymently.io/paymentlink/default/BDT");
                        setCopiedPaymentLink(true);
                        toast.success("Paymently payment link copied to clipboard!");
                        setTimeout(() => setCopiedPaymentLink(false), 2500);
                      }}
                      className="shrink-0 rounded-xl text-xs font-semibold gap-1.5 h-9 cursor-pointer"
                    >
                      {copiedPaymentLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Gateway Host</span>
                    <span className="text-xs font-semibold text-slate-800 font-mono">vartualtutor.paymently.io</span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Accepted Currency</span>
                    <span className="text-xs font-bold text-teal-700">Bangladeshi Taka (BDT ৳)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Webhook listener & verification route: <code>/api/uddoktapay/verify</code></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: TRANSACTIONS LIST ─────────────────────────────────────────── */}
      {activeTab === "transactions" && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transaction ID, student, teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-full border border-stone-200 bg-stone-50 focus:bg-white outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-full border border-stone-200 bg-stone-50 font-medium text-slate-700 outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid & Confirmed</option>
                <option value="initiated">Initiated</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {!transactions ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
              <p className="text-xs">Loading transaction ledger...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No transactions found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-stone-50/50">
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Teacher</th>
                    <th className="py-3 px-4">Gross Paid</th>
                    <th className="py-3 px-4">15% Fee</th>
                    <th className="py-3 px-4">85% Teacher</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTransactions.map((tx: any) => {
                    const isPaid = tx.status === "paid";
                    const isRefunded = tx.status === "refunded";

                    return (
                      <tr key={tx._id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {tx.transactionId}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{tx.studentName || "Student"}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{String(tx.studentId).slice(0, 8)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{tx.teacherName || "Teacher"}</p>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          ৳{tx.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-teal-700">
                          ৳{tx.platformFee.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-blue-700">
                          ৳{tx.teacherAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              tx.status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : tx.status === "refunded"
                                ? "bg-rose-100 text-rose-800"
                                : tx.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isPaid && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPaymentForRefund(tx);
                                setRefundModalOpen(true);
                              }}
                              className="h-7 text-[11px] rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
                            >
                              Issue Refund
                            </Button>
                          )}
                          {isRefunded && (
                            <span className="text-[10px] text-slate-400 italic">Refunded</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: TEACHER PAYOUTS ───────────────────────────────────────────── */}
      {activeTab === "payouts" && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Teacher Monthly Payout Batches</h3>
            <span className="text-xs text-slate-500">
              Approved and disburse 85% educator accumulated balances
            </span>
          </div>

          {!payouts ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
              <p className="text-xs">Loading payouts...</p>
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No payouts created yet. Use the "Monthly Settlement Engine" tab to calculate and generate month-end payouts.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-stone-50/50">
                    <th className="py-3 px-4">Payout ID</th>
                    <th className="py-3 px-4">Educator</th>
                    <th className="py-3 px-4">Settlement Window</th>
                    <th className="py-3 px-4">Gross Classes</th>
                    <th className="py-3 px-4">15% Fee</th>
                    <th className="py-3 px-4">Payable (85%)</th>
                    <th className="py-3 px-4">Method / Ref</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {payouts.map((po: any) => (
                    <tr key={po._id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        PO-{String(po._id).slice(-6).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {po.teacherName || "Instructor"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {new Date(po.settlementPeriodStart).toLocaleDateString()} -{" "}
                        {new Date(po.settlementPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        ৳{po.grossEarnings.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-teal-700 font-semibold">
                        ৳{po.platformCommission.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-blue-700 font-bold text-sm">
                        ৳{po.teacherPayable.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {po.payoutMethod ? po.payoutMethod.toUpperCase() : "Pending"}
                        {po.payoutReference ? ` (${po.payoutReference})` : ""}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            po.status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : po.status === "approved"
                              ? "bg-blue-100 text-blue-800"
                              : po.status === "processing"
                              ? "bg-purple-100 text-purple-800"
                              : po.status === "failed"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {po.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPayout(po);
                            setPayoutStatus(po.status);
                            setPayoutMethod(po.payoutMethod || "bank");
                            setPayoutReference(po.payoutReference || "");
                            setPayoutNotes(po.notes || "");
                            setPayoutModalOpen(true);
                          }}
                          className="h-7 text-[11px] rounded-full"
                        >
                          Manage Status
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: MONTHLY SETTLEMENT ENGINE ─────────────────────────────────── */}
      {activeTab === "settlement" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Generate Monthly Educator Settlement
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              In accordance with Virtual Tutor's business model, teachers are paid at the end of the month. Select a calendar period to calculate and bundle all payable earnings.
            </p>

            {/* Date Range Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-slate-600 font-semibold text-xs mb-1">Period Start</label>
                <input
                  type="date"
                  value={settlementStart}
                  onChange={(e) => setSettlementStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold text-xs mb-1">Period End</label>
                <input
                  type="date"
                  value={settlementEnd}
                  onChange={(e) => setSettlementEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleGenerateSettlement}
                  disabled={isGeneratingSettlement || !settlementPreview || settlementPreview.length === 0}
                  className="w-full rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-9 shadow-xs"
                >
                  {isGeneratingSettlement ? "Creating Settlement..." : "Generate Payouts Batch"}
                </Button>
              </div>
            </div>

            {/* Preview Results Table */}
            <div className="border border-stone-200 rounded-2xl overflow-hidden">
              <div className="p-3 bg-stone-50 border-b border-stone-200 font-bold text-xs text-slate-700">
                Eligible Payable Summary Preview ({settlementPreview?.length ?? 0} Educators)
              </div>

              {!settlementPreview ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                  <p className="text-xs">Calculating eligible earnings...</p>
                </div>
              ) : settlementPreview.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No unpaid payable earnings found in this settlement window.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4">Educator Name</th>
                      <th className="py-2.5 px-4">Classes Count</th>
                      <th className="py-2.5 px-4">Gross Collected</th>
                      <th className="py-2.5 px-4">Platform 15%</th>
                      <th className="py-2.5 px-4 font-bold text-blue-700">Teacher 85% Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {settlementPreview.map((item) => (
                      <tr key={item.teacherId} className="hover:bg-stone-50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{item.teacherName}</td>
                        <td className="py-2.5 px-4 text-slate-600">{item.earningsCount} sessions</td>
                        <td className="py-2.5 px-4 text-slate-700">৳{item.grossEarnings.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-teal-700 font-semibold">৳{item.platformCommission.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-blue-700 font-black text-sm">৳{item.teacherPayable.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: FINANCIAL AUDIT TRAIL ─────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Immutable Financial Audit Trail</h3>
            <span className="text-xs text-slate-500">Every money movement is logged permanently</span>
          </div>

          {!auditLogs ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
              <p className="text-xs">Loading audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">No audit logs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-stone-50/50">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status Transition</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                  {auditLogs.map((log: any) => (
                    <tr key={log._id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{log.action}</td>
                      <td className="py-2.5 px-4 text-slate-600">{log.entity}</td>
                      <td className="py-2.5 px-4 text-slate-500">{log.actorRole}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {log.amount ? `৳${log.amount.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        <span className="text-slate-400">{log.previousStatus}</span> →{" "}
                        <span className="font-bold text-slate-800">{log.newStatus}</span>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-500 max-w-xs truncate">
                        {log.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── REFUND MODAL ─────────────────────────────────────────────────────── */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Process Student Refund
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This will refund ৳{selectedPaymentForRefund?.amount.toLocaleString()} BDT to the student, cancel the booking, and reverse the educator's payable earning.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-rose-800">
              <strong>Caution:</strong> The payment record will be stamped as refunded and the scheduled session will be cancelled.
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Reason for Refund *</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g., Tutor unavailable / student requested cancellation before 12h policy..."
                rows={3}
                className="w-full p-3 rounded-xl border border-stone-200 text-xs outline-hidden"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setRefundModalOpen(false)}
              disabled={isRefunding}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefundSubmit}
              disabled={isRefunding}
              className="rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              {isRefunding ? "Processing Refund..." : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── PAYOUT STATUS UPDATE MODAL ───────────────────────────────────────── */}
      <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Manage Teacher Payout
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update status for {selectedPayout?.teacherName} (৳{selectedPayout?.teacherPayable.toLocaleString()} BDT).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payout Status</label>
              <select
                value={payoutStatus}
                onChange={(e: any) => setPayoutStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="processing">Processing Disbursement</option>
                <option value="paid">Paid & Settled</option>
                <option value="failed">Failed / Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Payout Method</label>
              <select
                value={payoutMethod}
                onChange={(e: any) => setPayoutMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white"
              >
                <option value="bank">Bank Wire Transfer</option>
                <option value="bkash">bKash Merchant Disbursal</option>
                <option value="nagad">Nagad Direct Disbursal</option>
                <option value="rocket">Rocket DBBL</option>
                <option value="other">Other Settlement Method</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Bank / Transaction Reference Number</label>
              <input
                type="text"
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
                placeholder="e.g., EFT-20260901-098231 or bKash TrxID"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Internal Notes</label>
              <input
                type="text"
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Disbursement notes..."
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPayoutModalOpen(false)}
              disabled={isUpdatingPayout}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayoutUpdateSubmit}
              disabled={isUpdatingPayout}
              className="rounded-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold"
            >
              {isUpdatingPayout ? "Saving..." : "Save Payout Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
