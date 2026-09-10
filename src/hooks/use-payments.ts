import { useState, useEffect, useMemo, useCallback } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  const convex = useConvex();
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

    // Safely attempt Convex query if available on remote backend
    let isMounted = true;
    try {
      if (convex && (api as any).payments?.listPaymentsByStudent) {
        convex
          .query((api as any).payments.listPaymentsByStudent, {})
          .then((serverData: any) => {
            if (isMounted && Array.isArray(serverData) && serverData.length > 0) {
              setPayments(serverData as PaymentRecord[]);
            }
          })
          .catch((_err) => {
            // Function missing on remote Convex: safely continue with local store
          });
      }
    } catch (_) {}

    return () => {
      isMounted = false;
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [convex, currentStudentId]);

  return payments;
}

// ── Hook: Teacher Earnings Breakdown ──────────────────────────────────────────
export function useTeacherEarnings(teacherId?: string) {
  const convex = useConvex();
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

    let isMounted = true;
    try {
      if (convex && (api as any).payments?.listEarningsByTeacher) {
        convex
          .query((api as any).payments.listEarningsByTeacher, {})
          .then((serverData: any) => {
            if (isMounted && serverData && typeof serverData === "object") {
              setState((prev) => ({
                ...prev,
                ...serverData,
                earningsList: serverData.earningsList || prev.earningsList,
              }));
            }
          })
          .catch((_err) => {
            // Function missing on remote Convex: safely continue with local store
          });
      }
    } catch (_) {}

    return () => {
      isMounted = false;
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [convex, computeEarningsState]);

  return state;
}

// ── Hook: Payment Details by Transaction ID ───────────────────────────────────
export function usePaymentDetails(transactionId?: string) {
  const convex = useConvex();

  const getRecord = useCallback(() => {
    if (!transactionId) return null;
    const payments = getStoredPayments();
    const found = payments.find((p) => p.transactionId === transactionId || p._id === transactionId);
    if (!found) return null;
    return {
      ...found,
      bookingDetails: {
        subject: found.subject || "Academic Tutoring",
        sessionType: found.sessionType || "1-to-1",
        durationMinutes: found.durationMinutes || 60,
        scheduledAt: found.createdAt,
      },
    };
  }, [transactionId]);

  const [payment, setPayment] = useState<any>(getRecord);

  useEffect(() => {
    setPayment(getRecord());

    const handleUpdate = () => setPayment(getRecord());
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);

    let isMounted = true;
    if (transactionId) {
      try {
        if (convex && (api as any).payments?.getPaymentDetails) {
          convex
            .query((api as any).payments.getPaymentDetails, { transactionId })
            .then((serverData: any) => {
              if (isMounted && serverData) {
                setPayment(serverData);
              }
            })
            .catch(() => {});
        }
      } catch (_) {}
    }

    return () => {
      isMounted = false;
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    };
  }, [convex, transactionId, getRecord]);

  return payment;
}

// ── Hook: Financial Treasury Summary ──────────────────────────────────────────
export function useFinancialSummary() {
  const convex = useConvex();
  const [summary, setSummary] = useState(computeFinancialSummary);

  useEffect(() => {
    const handleUpdate = () => setSummary(computeFinancialSummary());
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);

    let isMounted = true;
    try {
      if (convex && (api as any).payments?.adminGetFinancialSummary) {
        convex
          .query((api as any).payments.adminGetFinancialSummary, {})
          .then((serverSummary: any) => {
            if (isMounted && serverSummary) {
              setSummary((prev) => ({ ...prev, ...serverSummary }));
            }
          })
          .catch(() => {});
      }
    } catch (_) {}

    return () => {
      isMounted = false;
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    };
  }, [convex]);

  return summary;
}

// ── Hook: Admin Transactions List ─────────────────────────────────────────────
export function useAdminTransactions(statusFilter?: string) {
  const convex = useConvex();
  const [transactions, setTransactions] = useState<PaymentRecord[]>(getStoredPayments);

  useEffect(() => {
    const handleUpdate = () => setTransactions(getStoredPayments());
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);

    let isMounted = true;
    try {
      if (convex && (api as any).payments?.adminListTransactions) {
        convex
          .query((api as any).payments.adminListTransactions, {
            statusFilter: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
          })
          .then((serverList: any) => {
            if (isMounted && Array.isArray(serverList) && serverList.length > 0) {
              setTransactions(serverList as PaymentRecord[]);
            }
          })
          .catch(() => {});
      }
    } catch (_) {}

    return () => {
      isMounted = false;
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    };
  }, [convex, statusFilter]);

  return useMemo(() => {
    if (!statusFilter || statusFilter === "all") return transactions;
    return transactions.filter((t) => t.status === statusFilter);
  }, [transactions, statusFilter]);
}

// ── Hook: Admin Payouts List ──────────────────────────────────────────────────
export function useAdminPayouts() {
  const convex = useConvex();
  const [payouts, setPayouts] = useState<TeacherPayoutRecord[]>(getStoredPayouts);

  useEffect(() => {
    const handleUpdate = () => setPayouts(getStoredPayouts());
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);

    let isMounted = true;
    try {
      if (convex && (api as any).payments?.adminListPayouts) {
        convex
          .query((api as any).payments.adminListPayouts, {})
          .then((serverList: any) => {
            if (isMounted && Array.isArray(serverList) && serverList.length > 0) {
              setPayouts(serverList as TeacherPayoutRecord[]);
            }
          })
          .catch(() => {});
      }
    } catch (_) {}

    return () => {
      isMounted = false;
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    };
  }, [convex]);

  return payouts;
}

// ── Hook: Settlement Preview ──────────────────────────────────────────────────
export function useSettlementPreview(periodStart: number, periodEnd: number) {
  const convex = useConvex();
  const [preview, setPreview] = useState(() => previewMonthlySettlementLocal(periodStart, periodEnd));

  useEffect(() => {
    setPreview(previewMonthlySettlementLocal(periodStart, periodEnd));

    const handleUpdate = () => setPreview(previewMonthlySettlementLocal(periodStart, periodEnd));
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);

    let isMounted = true;
    try {
      if (convex && (api as any).payments?.adminPreviewMonthlySettlement) {
        convex
          .query((api as any).payments.adminPreviewMonthlySettlement, { periodStart, periodEnd })
          .then((res: any) => {
            if (isMounted && Array.isArray(res)) {
              setPreview(res);
            }
          })
          .catch(() => {});
      }
    } catch (_) {}

    return () => {
      isMounted = false;
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    };
  }, [convex, periodStart, periodEnd]);

  return preview;
}

// ── Hook: Financial Audit Logs ────────────────────────────────────────────────
export function useFinancialAuditLogs(limit: number = 100) {
  const convex = useConvex();
  const [logs, setLogs] = useState<FinancialAuditLogRecord[]>(() => getStoredAuditLogs().slice(0, limit));

  useEffect(() => {
    const handleUpdate = () => setLogs(getStoredAuditLogs().slice(0, limit));
    window.addEventListener(PAYMENT_STORE_EVENT, handleUpdate);

    let isMounted = true;
    try {
      if (convex && (api as any).payments?.adminListFinancialAuditLogs) {
        convex
          .query((api as any).payments.adminListFinancialAuditLogs, { limit })
          .then((serverLogs: any) => {
            if (isMounted && Array.isArray(serverLogs) && serverLogs.length > 0) {
              setLogs(serverLogs);
            }
          })
          .catch(() => {});
      }
    } catch (_) {}

    return () => {
      isMounted = false;
      window.removeEventListener(PAYMENT_STORE_EVENT, handleUpdate);
    };
  }, [convex, limit]);

  return logs;
}

// ── Hook: Payment Action Mutations ────────────────────────────────────────────
export function usePaymentMutations() {
  const convex = useConvex();
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
      // 1. Initiate locally immediately
      const localResult = initiatePaymentLocal(params);

      // 2. Safely forward to Convex if available
      try {
        if (convex && (api as any).payments?.initiatePayment) {
          const serverRes = await convex.mutation((api as any).payments.initiatePayment, {
            bookingId: params.bookingId as any,
          });
          if (serverRes && serverRes.transactionId) {
            return serverRes;
          }
        }
      } catch (err) {
        console.warn("[Payments] Convex initiatePayment notice:", err);
      }

      return localResult;
    },
    [convex]
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
      // 1. Finalize locally
      const localResult = finalizePaymentLocal(params);

      // 2. Try Convex
      try {
        if (convex && (api as any).payments?.verifyAndFinalizePayment) {
          await convex.mutation((api as any).payments.verifyAndFinalizePayment, params);
        }
      } catch (err) {
        console.warn("[Payments] Convex verifyAndFinalizePayment notice:", err);
      }

      return localResult;
    },
    [convex]
  );

  const recordPaymentFailure = useCallback(
    async (params: { transactionId: string; reason?: string; isCancelled?: boolean }) => {
      recordPaymentFailureLocal(params);
      try {
        if (convex && (api as any).payments?.recordPaymentFailure) {
          await convex.mutation((api as any).payments.recordPaymentFailure, params);
        }
      } catch (err) {
        console.warn("[Payments] Convex recordPaymentFailure notice:", err);
      }
    },
    [convex]
  );

  const adminCreateMonthlySettlement = useCallback(
    async (params: { periodStart: number; periodEnd: number; notes?: string }) => {
      const res = createMonthlySettlementLocal({
        ...params,
        adminName: user?.name || "Admin",
      });

      try {
        if (convex && (api as any).payments?.adminCreateMonthlySettlement) {
          await convex.mutation((api as any).payments.adminCreateMonthlySettlement, params);
        }
      } catch (err) {
        console.warn("[Payments] Convex adminCreateMonthlySettlement notice:", err);
      }

      return res;
    },
    [convex, user?.name]
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

      try {
        if (convex && (api as any).payments?.adminUpdatePayoutStatus) {
          await convex.mutation((api as any).payments.adminUpdatePayoutStatus, {
            ...params,
            payoutId: params.payoutId as any,
          });
        }
      } catch (err) {
        console.warn("[Payments] Convex adminUpdatePayoutStatus notice:", err);
      }
    },
    [convex, user?.name]
  );

  const adminProcessRefund = useCallback(
    async (params: { paymentId: string; reason: string }) => {
      processRefundLocal({
        ...params,
        actorName: user?.name || "Admin",
      });

      try {
        if (convex && (api as any).payments?.adminProcessRefund) {
          await convex.mutation((api as any).payments.adminProcessRefund, {
            ...params,
            paymentId: params.paymentId as any,
          });
        }
      } catch (err) {
        console.warn("[Payments] Convex adminProcessRefund notice:", err);
      }
    },
    [convex, user?.name]
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
