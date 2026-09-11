import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  PaymentRecord,
  TeacherEarningRecord,
  TeacherPayoutRecord,
  FinancialAuditLogRecord,
  PAYMENT_STORE_EVENT,
  getStoredPayments,
  getStoredEarnings,
  getStoredPayouts,
  getStoredAuditLogs,
  computeFinancialSummary,
  initiatePaymentLocal,
  finalizePaymentLocal,
  recordPaymentFailureLocal,
  processRefundLocal,
  previewMonthlySettlementLocal,
  createMonthlySettlementLocal,
  updatePayoutStatusLocal,
  calculateCommission,
} from "@/lib/payment-store";

// ── Hook: Student Payments List ───────────────────────────────────────────────
export function useStudentPayments(studentId?: string): PaymentRecord[] {
  const { user } = useAuth();
  const currentStudentId = studentId || user?._id;

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const all = getStoredPayments();
    if (!currentStudentId) return all;
    return all.filter((p) => p.studentId === currentStudentId || !p.studentId || p.studentId === "curr_student");
  });

  useEffect(() => {
    const handleUpdate = () => {
      const all = getStoredPayments();
      if (!currentStudentId) {
        setPayments(all);
      } else {
        setPayments(all.filter((p) => p.studentId === currentStudentId || !p.studentId || p.studentId === "curr_student"));
      }
    };

    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [currentStudentId]);

  return payments;
}

// ── Hook: Teacher Earnings Breakdown ──────────────────────────────────────────
export function useTeacherEarnings(teacherId?: string) {
  const { user } = useAuth();
  const currentTeacherId = teacherId || user?._id;

  const computeEarningsState = useCallback(() => {
    const allEarnings = getStoredEarnings();
    const filtered = currentTeacherId
      ? allEarnings.filter((e) => e.teacherId === currentTeacherId || !e.teacherId || e.teacherId === "curr_teacher")
      : allEarnings;

    const d = new Date();
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();

    let currentMonthEarnings = 0;
    let pendingPayout = 0;
    let lifetimeEarnings = 0;

    for (const e of filtered) {
      if (e.status !== "cancelled") {
        lifetimeEarnings += e.teacherAmount;
        if (e.status === "payable") {
          pendingPayout += e.teacherAmount;
          if (e.earnedAt >= monthStart) {
            currentMonthEarnings += e.teacherAmount;
          }
        }
      }
    }

    return {
      currentMonthEarnings,
      pendingPayout,
      lifetimeEarnings,
      earningsList: filtered,
    };
  }, [currentTeacherId]);

  const [state, setState] = useState(computeEarningsState);

  useEffect(() => {
    const handleUpdate = () => setState(computeEarningsState());
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [computeEarningsState]);

  return state;
}

// ── Hook: Payment Details by Transaction ID ───────────────────────────────────
export function usePaymentDetails(transactionId?: string) {
  const getRecord = useCallback(() => {
    const payments = getStoredPayments();
    if (transactionId) {
      const found = payments.find((p) => p.transactionId === transactionId || p._id === transactionId);
      if (found) {
        return {
          ...found,
          bookingDetails: {
            subject: found.subject || "Academic Tutoring",
            sessionType: found.sessionType || "1-to-1",
            durationMinutes: found.durationMinutes || 60,
            scheduledAt: found.createdAt,
          },
        };
      }
    }
    // Fallback 1: most recent pending payment
    const pending = payments.find((p) => p.status === "pending");
    if (pending) {
      return {
        ...pending,
        bookingDetails: {
          subject: pending.subject || "Academic Tutoring",
          sessionType: pending.sessionType || "1-to-1",
          durationMinutes: pending.durationMinutes || 60,
          scheduledAt: pending.createdAt,
        },
      };
    }
    // Fallback 2: most recent payment of any status
    if (payments.length > 0) {
      const latest = payments[0];
      return {
        ...latest,
        bookingDetails: {
          subject: latest.subject || "Academic Tutoring",
          sessionType: latest.sessionType || "1-to-1",
          durationMinutes: latest.durationMinutes || 60,
          scheduledAt: latest.createdAt,
        },
      };
    }
    // Fallback 3: Ephemeral draft checkout so page never stalls in infinite loading
    return {
      _id: "draft_order_default",
      transactionId: "TXN-" + Date.now().toString(36).toUpperCase(),
      studentId: "student_default",
      studentName: "Student",
      teacherId: "teacher_default",
      teacherName: "Virtual Tutor Educator",
      subject: "Interactive Academic Tutoring",
      amount: 2500,
      currency: "BDT",
      platformFee: 375,
      teacherAmount: 2125,
      status: "pending",
      createdAt: Date.now(),
      bookingDetails: {
        subject: "Interactive Academic Tutoring",
        sessionType: "1-to-1",
        durationMinutes: 60,
        scheduledAt: Date.now(),
      },
    };
  }, [transactionId]);

  const [payment, setPayment] = useState<any>(getRecord);

  useEffect(() => {
    setPayment(getRecord());

    const handleUpdate = () => setPayment(getRecord());
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [transactionId, getRecord]);

  return payment;
}

// ── Hook: Financial Treasury Summary ──────────────────────────────────────────
export function useFinancialSummary() {
  const [summary, setSummary] = useState(computeFinancialSummary);

  useEffect(() => {
    const handleUpdate = () => setSummary(computeFinancialSummary());
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return summary;
}

// ── Hook: Admin Transactions List ─────────────────────────────────────────────
export function useAdminTransactions(statusFilter?: string) {
  const [transactions, setTransactions] = useState<PaymentRecord[]>(getStoredPayments);

  useEffect(() => {
    const handleUpdate = () => setTransactions(getStoredPayments());
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return useMemo(() => {
    if (!statusFilter || statusFilter === "all") return transactions;
    return transactions.filter((t) => t.status === statusFilter);
  }, [transactions, statusFilter]);
}

// ── Hook: Admin Payouts List ──────────────────────────────────────────────────
export function useAdminPayouts() {
  const [payouts, setPayouts] = useState<TeacherPayoutRecord[]>(getStoredPayouts);

  useEffect(() => {
    const handleUpdate = () => setPayouts(getStoredPayouts());
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return payouts;
}

// ── Hook: Settlement Preview ──────────────────────────────────────────────────
export function useSettlementPreview(periodStart: number, periodEnd: number) {
  const [preview, setPreview] = useState(() => previewMonthlySettlementLocal(periodStart, periodEnd));

  useEffect(() => {
    setPreview(previewMonthlySettlementLocal(periodStart, periodEnd));

    const handleUpdate = () => setPreview(previewMonthlySettlementLocal(periodStart, periodEnd));
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [periodStart, periodEnd]);

  return preview;
}

// ── Hook: Financial Audit Logs ────────────────────────────────────────────────
export function useFinancialAuditLogs(limit: number = 100) {
  const [logs, setLogs] = useState<FinancialAuditLogRecord[]>(() => getStoredAuditLogs().slice(0, limit));

  useEffect(() => {
    const handleUpdate = () => setLogs(getStoredAuditLogs().slice(0, limit));
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [limit]);

  return logs;
}

// ── Hook: Payment Action Mutations ────────────────────────────────────────────
export function usePaymentMutations() {
  const { user } = useAuth();

  const initiatePayment = useCallback(
    async (params: {
      bookingId: string;
      studentId?: string;
      studentName?: string;
      teacherId?: string;
      teacherName?: string;
      subject?: string;
      amount: number;
    }) => {
      return initiatePaymentLocal(params);
    },
    []
  );

  const verifyAndFinalizePayment = useCallback(
    async (params: {
      transactionId: string;
      valId?: string;
      cardType?: string;
      cardBrand?: string;
      bankTranId?: string;
      gatewayStatus?: string;
      amount?: number;
      currency?: string;
    }) => {
      return finalizePaymentLocal(params);
    },
    []
  );

  const recordPaymentFailure = useCallback(
    async (params: { transactionId: string; reason?: string; isCancelled?: boolean }) => {
      recordPaymentFailureLocal(params);
    },
    []
  );

  const adminCreateMonthlySettlement = useCallback(
    async (params: { periodStart: number; periodEnd: number; notes?: string }) => {
      return createMonthlySettlementLocal({
        ...params,
        adminName: user?.name || "Admin",
      });
    },
    [user?.name]
  );

  const adminUpdatePayoutStatus = useCallback(
    async (params: {
      payoutId: string;
      status: "pending" | "approved" | "processing" | "paid" | "failed";
      payoutMethod?: "bank" | "bkash" | "nagad" | "rocket" | "other";
      payoutReference?: string;
      notes?: string;
    }) => {
      updatePayoutStatusLocal({
        ...params,
        adminName: user?.name || "Admin",
      });
    },
    [user?.name]
  );

  const adminProcessRefund = useCallback(
    async (params: { paymentId: string; reason: string }) => {
      processRefundLocal({
        ...params,
        actorName: user?.name || "Admin",
      });
    },
    [user?.name]
  );

  return {
    initiatePayment,
    verifyAndFinalizePayment,
    recordPaymentFailure,
    adminCreateMonthlySettlement,
    adminUpdatePayoutStatus,
    adminProcessRefund,
    calculateCommission,
  };
}
