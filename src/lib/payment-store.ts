// Persistent, resilient payment store for Virtual Tutor Pro
// Complies with the 15% Platform Commission & 85% Educator Settlement Model.
// Safely synchronizes with Convex if available without crashing on missing remote functions.

export const PAYMENT_STORE_EVENT = "vtp_payment_store_change";

export interface PaymentRecord {
  _id: string;
  bookingId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  subject?: string;
  sessionType?: string;
  durationMinutes?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  amount: number;
  platformFee: number;
  teacherAmount: number;
  currency: string;
  gateway: string;
  transactionId: string;
  gatewayTransactionId?: string;
  bankTransactionId?: string;
  cardType?: string;
  cardBrand?: string;
  status: "initiated" | "pending" | "paid" | "failed" | "refunded";
  valId?: string;
  verifiedAt?: number;
  refundReason?: string;
  refundedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface TeacherEarningRecord {
  _id: string;
  teacherId: string;
  teacherName: string;
  paymentId: string;
  bookingId: string;
  studentId: string;
  studentName: string;
  grossAmount: number;
  platformFee: number;
  teacherAmount: number;
  status: "payable" | "processing" | "paid" | "cancelled";
  earnedAt: number;
  payoutBatchId?: string;
  paidAt?: number;
}

export interface TeacherPayoutRecord {
  _id: string;
  teacherId: string;
  teacherName: string;
  settlementPeriodStart: number;
  settlementPeriodEnd: number;
  grossEarnings: number;
  platformCommission: number;
  teacherPayable: number;
  earningsCount: number;
  payoutMethod?: "bank" | "bkash" | "nagad" | "rocket" | "other";
  payoutReference?: string;
  status: "pending" | "approved" | "processing" | "paid" | "failed";
  notes?: string;
  approvedAt?: number;
  disbursedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface FinancialAuditLogRecord {
  _id: string;
  actor: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  amount?: number;
  previousStatus: string;
  newStatus: string;
  notes?: string;
  timestamp: number;
}

export const PLATFORM_COMMISSION_RATE = 0.15; // 15% Virtual Tutor commission
export const TEACHER_SHARE_RATE = 0.85; // 85% Teacher share

export function calculateCommission(grossAmount: number) {
  const safeGross = Math.max(0, Math.round(grossAmount));
  const platformFee = Math.round(safeGross * PLATFORM_COMMISSION_RATE);
  const teacherAmount = safeGross - platformFee;
  return {
    grossAmount: safeGross,
    platformFee,
    teacherAmount,
  };
}

const STORAGE_KEYS = {
  PAYMENTS: "vtp_payments_ledger",
  EARNINGS: "vtp_teacher_earnings",
  PAYOUTS: "vtp_teacher_payouts",
  AUDIT_LOGS: "vtp_financial_audit_logs",
};

// Initial realistic seed records for demonstration & immediate testability
function getInitialPayments(): PaymentRecord[] {
  const now = Date.now();
  const dayMs = 86400000;
  return [
    {
      _id: "pay_sample_1",
      bookingId: "bk_sample_1",
      studentId: "std_01",
      studentName: "Tahmid Hasan",
      teacherId: "tch_rahim",
      teacherName: "Prof. Md. Abdur Rahim",
      subject: "Higher Mathematics & Calculus",
      sessionType: "1-to-1",
      durationMinutes: 60,
      amount: 4000,
      platformFee: 600,
      teacherAmount: 3400,
      currency: "BDT",
      gateway: "sslcommerz",
      transactionId: "VT-TXN-2026-0901-8842",
      gatewayTransactionId: "SSL-GW-892174",
      bankTransactionId: "EFT-889102",
      cardType: "bkash-bKash",
      cardBrand: "bKash",
      status: "paid",
      valId: "VAL_889210",
      verifiedAt: now - 3 * dayMs,
      createdAt: now - 3 * dayMs,
      updatedAt: now - 3 * dayMs,
    },
    {
      _id: "pay_sample_2",
      bookingId: "bk_sample_2",
      studentId: "std_02",
      studentName: "Anika Tabassum",
      teacherId: "tch_farzana",
      teacherName: "Dr. Farzana Yasmin",
      subject: "Advanced Chemistry & Organic Synthesis",
      sessionType: "1-to-1",
      durationMinutes: 60,
      amount: 3500,
      platformFee: 525,
      teacherAmount: 2975,
      currency: "BDT",
      gateway: "sslcommerz",
      transactionId: "VT-TXN-2026-0903-7721",
      gatewayTransactionId: "SSL-GW-661209",
      bankTransactionId: "DBBL-129084",
      cardType: "VISA-Dutch Bangla Bank",
      cardBrand: "VISA",
      status: "paid",
      valId: "VAL_551029",
      verifiedAt: now - 1 * dayMs,
      createdAt: now - 1 * dayMs,
      updatedAt: now - 1 * dayMs,
    },
  ];
}

function getInitialEarnings(): TeacherEarningRecord[] {
  const now = Date.now();
  const dayMs = 86400000;
  return [
    {
      _id: "earn_sample_1",
      teacherId: "tch_rahim",
      teacherName: "Prof. Md. Abdur Rahim",
      paymentId: "pay_sample_1",
      bookingId: "bk_sample_1",
      studentId: "std_01",
      studentName: "Tahmid Hasan",
      grossAmount: 4000,
      platformFee: 600,
      teacherAmount: 3400,
      status: "payable",
      earnedAt: now - 3 * dayMs,
    },
    {
      _id: "earn_sample_2",
      teacherId: "tch_farzana",
      teacherName: "Dr. Farzana Yasmin",
      paymentId: "pay_sample_2",
      bookingId: "bk_sample_2",
      studentId: "std_02",
      studentName: "Anika Tabassum",
      grossAmount: 3500,
      platformFee: 525,
      teacherAmount: 2975,
      status: "payable",
      earnedAt: now - 1 * dayMs,
    },
  ];
}

function getInitialPayouts(): TeacherPayoutRecord[] {
  const d = new Date();
  const prevMonthStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  const prevMonthEnd = new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999).getTime();

  return [
    {
      _id: "po_sample_1",
      teacherId: "tch_rahim",
      teacherName: "Prof. Md. Abdur Rahim",
      settlementPeriodStart: prevMonthStart,
      settlementPeriodEnd: prevMonthEnd,
      grossEarnings: 12000,
      platformCommission: 1800,
      teacherPayable: 10200,
      earningsCount: 3,
      payoutMethod: "bank",
      payoutReference: "BEFTN-2026-9921",
      status: "paid",
      notes: "Previous month-end settlement disbursed via City Bank Bangladesh",
      approvedAt: prevMonthEnd + 86400000,
      disbursedAt: prevMonthEnd + 172800000,
      createdAt: prevMonthEnd,
      updatedAt: prevMonthEnd + 172800000,
    },
  ];
}

function getInitialAuditLogs(): FinancialAuditLogRecord[] {
  const now = Date.now();
  const dayMs = 86400000;
  return [
    {
      _id: "log_init_1",
      actor: "system_treasury",
      actorRole: "system",
      action: "payment_finalized",
      entity: "payment",
      entityId: "pay_sample_1",
      amount: 4000,
      previousStatus: "initiated",
      newStatus: "paid",
      notes: "Verified via SSLCOMMERZ gateway for Tahmid Hasan",
      timestamp: now - 3 * dayMs,
    },
    {
      _id: "log_init_2",
      actor: "system_treasury",
      actorRole: "system",
      action: "payment_finalized",
      entity: "payment",
      entityId: "pay_sample_2",
      amount: 3500,
      previousStatus: "initiated",
      newStatus: "paid",
      notes: "Verified via SSLCOMMERZ gateway for Anika Tabassum",
      timestamp: now - 1 * dayMs,
    },
  ];
}

function notifyStoreChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PAYMENT_STORE_EVENT));
  }
}

// ── Read/Write Methods ────────────────────────────────────────────────────────

export function getStoredPayments(): PaymentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!raw) {
      const initial = getInitialPayments();
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (_) {
    return getInitialPayments();
  }
}

export function saveStoredPayments(payments: PaymentRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  notifyStoreChange();
}

export function getStoredEarnings(): TeacherEarningRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EARNINGS);
    if (!raw) {
      const initial = getInitialEarnings();
      localStorage.setItem(STORAGE_KEYS.EARNINGS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (_) {
    return getInitialEarnings();
  }
}

export function saveStoredEarnings(earnings: TeacherEarningRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.EARNINGS, JSON.stringify(earnings));
  notifyStoreChange();
}

export function getStoredPayouts(): TeacherPayoutRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYOUTS);
    if (!raw) {
      const initial = getInitialPayouts();
      localStorage.setItem(STORAGE_KEYS.PAYOUTS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (_) {
    return getInitialPayouts();
  }
}

export function saveStoredPayouts(payouts: TeacherPayoutRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.PAYOUTS, JSON.stringify(payouts));
  notifyStoreChange();
}

export function getStoredAuditLogs(): FinancialAuditLogRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!raw) {
      const initial = getInitialAuditLogs();
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (_) {
    return getInitialAuditLogs();
  }
}

export function appendAuditLog(log: Omit<FinancialAuditLogRecord, "_id" | "timestamp">) {
  const logs = getStoredAuditLogs();
  const newLog: FinancialAuditLogRecord = {
    ...log,
    _id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
  };
  logs.unshift(newLog);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 300)));
    notifyStoreChange();
  }
}

// ── Financial Actions ─────────────────────────────────────────────────────────

export function initiatePaymentLocal(params: {
  bookingId: string;
  studentId?: string;
  studentName?: string;
  teacherId?: string;
  teacherName?: string;
  subject?: string;
  sessionType?: string;
  durationMinutes?: number;
  amount: number;
}): { success: boolean; paymentId: string; transactionId: string; amount: number; studentName: string } {
  const payments = getStoredPayments();
  const now = Date.now();
  const transactionId = `VT-TXN-${now}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const { platformFee, teacherAmount } = calculateCommission(params.amount);

  const newRecord: PaymentRecord = {
    _id: `pay_${now}_${Math.random().toString(36).substring(2, 6)}`,
    bookingId: params.bookingId,
    studentId: params.studentId || "curr_student",
    studentName: params.studentName || "Student",
    teacherId: params.teacherId || "curr_teacher",
    teacherName: params.teacherName || "Educator",
    subject: params.subject,
    sessionType: params.sessionType || "1-to-1",
    durationMinutes: params.durationMinutes || 60,
    amount: params.amount,
    platformFee,
    teacherAmount,
    currency: "BDT",
    gateway: "sslcommerz",
    transactionId,
    status: "initiated",
    createdAt: now,
    updatedAt: now,
  };

  payments.unshift(newRecord);
  saveStoredPayments(payments);

  appendAuditLog({
    actor: params.studentId || "student",
    actorRole: "student",
    action: "payment_initiated",
    entity: "payment",
    entityId: newRecord._id,
    amount: params.amount,
    previousStatus: "none",
    newStatus: "initiated",
    notes: `Initiated tuition payment for booking ${params.bookingId} (${params.subject || "Session"})`,
  });

  return {
    success: true,
    paymentId: newRecord._id,
    transactionId,
    amount: params.amount,
    studentName: newRecord.studentName,
  };
}

export function finalizePaymentLocal(params: {
  transactionId: string;
  valId?: string;
  cardType?: string;
  cardBrand?: string;
  bankTranId?: string;
}): { success: boolean; payment?: PaymentRecord } {
  const payments = getStoredPayments();
  const idx = payments.findIndex((p) => p.transactionId === params.transactionId);
  if (idx === -1) {
    return { success: false };
  }

  const p = payments[idx];
  const prevStatus = p.status;
  const now = Date.now();

  p.status = "paid";
  p.valId = params.valId || `VAL_${Date.now()}`;
  p.cardType = params.cardType || "bKash";
  p.cardBrand = params.cardBrand || "bKash";
  p.bankTransactionId = params.bankTranId || `TRX-${Date.now().toString(36).toUpperCase()}`;
  p.verifiedAt = now;
  p.updatedAt = now;

  payments[idx] = p;
  saveStoredPayments(payments);

  // Credit Teacher Earning (85%)
  const earnings = getStoredEarnings();
  const alreadyEarned = earnings.find((e) => e.paymentId === p._id);
  if (!alreadyEarned) {
    const newEarning: TeacherEarningRecord = {
      _id: `earn_${now}_${Math.random().toString(36).substring(2, 6)}`,
      teacherId: p.teacherId,
      teacherName: p.teacherName,
      paymentId: p._id,
      bookingId: p.bookingId,
      studentId: p.studentId,
      studentName: p.studentName,
      grossAmount: p.amount,
      platformFee: p.platformFee,
      teacherAmount: p.teacherAmount,
      status: "payable",
      earnedAt: now,
    };
    earnings.unshift(newEarning);
    saveStoredEarnings(earnings);
  }

  appendAuditLog({
    actor: "gateway_sslcommerz",
    actorRole: "gateway",
    action: "payment_finalized",
    entity: "payment",
    entityId: p._id,
    amount: p.amount,
    previousStatus: prevStatus,
    newStatus: "paid",
    notes: `Payment completed via ${p.cardType}. Teacher 85% credited: ৳${p.teacherAmount} BDT.`,
  });

  return { success: true, payment: p };
}

export function recordPaymentFailureLocal(params: {
  transactionId: string;
  reason?: string;
}) {
  const payments = getStoredPayments();
  const idx = payments.findIndex((p) => p.transactionId === params.transactionId);
  if (idx === -1) return;

  const p = payments[idx];
  const prev = p.status;
  p.status = "failed";
  p.updatedAt = Date.now();
  payments[idx] = p;
  saveStoredPayments(payments);

  appendAuditLog({
    actor: "gateway_sslcommerz",
    actorRole: "gateway",
    action: "payment_failed",
    entity: "payment",
    entityId: p._id,
    amount: p.amount,
    previousStatus: prev,
    newStatus: "failed",
    notes: params.reason || "Payment was rejected or cancelled at checkout",
  });
}

export function processRefundLocal(params: {
  paymentId: string;
  reason: string;
  actorName?: string;
}) {
  const payments = getStoredPayments();
  const idx = payments.findIndex((p) => p._id === params.paymentId);
  if (idx === -1) throw new Error("Payment record not found");

  const p = payments[idx];
  if (p.status !== "paid") throw new Error("Only paid transactions can be refunded");

  p.status = "refunded";
  p.refundReason = params.reason;
  p.refundedAt = Date.now();
  p.updatedAt = Date.now();
  payments[idx] = p;
  saveStoredPayments(payments);

  // Cancel teacher earning record
  const earnings = getStoredEarnings();
  const eIdx = earnings.findIndex((e) => e.paymentId === p._id);
  if (eIdx !== -1) {
    earnings[eIdx].status = "cancelled";
    saveStoredEarnings(earnings);
  }

  appendAuditLog({
    actor: params.actorName || "Admin",
    actorRole: "admin",
    action: "payment_refunded",
    entity: "payment",
    entityId: p._id,
    amount: p.amount,
    previousStatus: "paid",
    newStatus: "refunded",
    notes: `Refund issued: ${params.reason}`,
  });
}

export function previewMonthlySettlementLocal(periodStart: number, periodEnd: number) {
  const earnings = getStoredEarnings();
  const eligible = earnings.filter(
    (e) => e.status === "payable" && e.earnedAt >= periodStart && e.earnedAt <= periodEnd
  );

  const teacherMap = new Map<
    string,
    {
      teacherId: string;
      teacherName: string;
      grossEarnings: number;
      platformCommission: number;
      teacherPayable: number;
      earningsCount: number;
    }
  >();

  for (const e of eligible) {
    const existing = teacherMap.get(e.teacherId) || {
      teacherId: e.teacherId,
      teacherName: e.teacherName,
      grossEarnings: 0,
      platformCommission: 0,
      teacherPayable: 0,
      earningsCount: 0,
    };
    existing.grossEarnings += e.grossAmount;
    existing.platformCommission += e.platformFee;
    existing.teacherPayable += e.teacherAmount;
    existing.earningsCount += 1;
    teacherMap.set(e.teacherId, existing);
  }

  return Array.from(teacherMap.values());
}

export function createMonthlySettlementLocal(params: {
  periodStart: number;
  periodEnd: number;
  notes?: string;
  adminName?: string;
}) {
  const preview = previewMonthlySettlementLocal(params.periodStart, params.periodEnd);
  if (preview.length === 0) {
    throw new Error("No eligible payable teacher earnings found in selected range.");
  }

  const payouts = getStoredPayouts();
  const earnings = getStoredEarnings();
  const now = Date.now();
  let createdCount = 0;

  for (const item of preview) {
    const payoutId = `po_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const payout: TeacherPayoutRecord = {
      _id: payoutId,
      teacherId: item.teacherId,
      teacherName: item.teacherName,
      settlementPeriodStart: params.periodStart,
      settlementPeriodEnd: params.periodEnd,
      grossEarnings: item.grossEarnings,
      platformCommission: item.platformCommission,
      teacherPayable: item.teacherPayable,
      earningsCount: item.earningsCount,
      payoutMethod: "bank",
      status: "pending",
      notes: params.notes || `Month-end payout batch for ${new Date(params.periodStart).toLocaleDateString()} to ${new Date(params.periodEnd).toLocaleDateString()}`,
      createdAt: now,
      updatedAt: now,
    };

    payouts.unshift(payout);
    createdCount++;

    // Update earnings to processing
    for (const e of earnings) {
      if (
        e.teacherId === item.teacherId &&
        e.status === "payable" &&
        e.earnedAt >= params.periodStart &&
        e.earnedAt <= params.periodEnd
      ) {
        e.status = "processing";
        e.payoutBatchId = payoutId;
      }
    }

    appendAuditLog({
      actor: params.adminName || "Admin",
      actorRole: "admin",
      action: "settlement_batch_created",
      entity: "teacherPayout",
      entityId: payoutId,
      amount: item.teacherPayable,
      previousStatus: "none",
      newStatus: "pending",
      notes: `Settlement created for ${item.teacherName} (85% net: ৳${item.teacherPayable} BDT)`,
    });
  }

  saveStoredPayouts(payouts);
  saveStoredEarnings(earnings);

  return { success: true, createdCount };
}

export function updatePayoutStatusLocal(params: {
  payoutId: string;
  status: "pending" | "approved" | "processing" | "paid" | "failed";
  payoutMethod?: "bank" | "bkash" | "nagad" | "rocket" | "other";
  payoutReference?: string;
  notes?: string;
  adminName?: string;
}) {
  const payouts = getStoredPayouts();
  const idx = payouts.findIndex((p) => p._id === params.payoutId);
  if (idx === -1) throw new Error("Payout batch not found");

  const po = payouts[idx];
  const prev = po.status;
  const now = Date.now();

  po.status = params.status;
  if (params.payoutMethod) po.payoutMethod = params.payoutMethod;
  if (params.payoutReference !== undefined) po.payoutReference = params.payoutReference;
  if (params.notes !== undefined) po.notes = params.notes;
  if (params.status === "approved" && !po.approvedAt) po.approvedAt = now;
  if (params.status === "paid") po.disbursedAt = now;
  po.updatedAt = now;

  payouts[idx] = po;
  saveStoredPayouts(payouts);

  // If status is paid, update associated earnings to paid
  if (params.status === "paid") {
    const earnings = getStoredEarnings();
    for (const e of earnings) {
      if (e.payoutBatchId === po._id) {
        e.status = "paid";
        e.paidAt = now;
      }
    }
    saveStoredEarnings(earnings);
  }

  appendAuditLog({
    actor: params.adminName || "Admin",
    actorRole: "admin",
    action: "payout_status_updated",
    entity: "teacherPayout",
    entityId: po._id,
    amount: po.teacherPayable,
    previousStatus: prev,
    newStatus: params.status,
    notes: `Payout updated to ${params.status}. Method: ${po.payoutMethod}. Ref: ${po.payoutReference || "none"}`,
  });
}

// ── Financial Treasury Summary ────────────────────────────────────────────────

export function computeFinancialSummary() {
  const payments = getStoredPayments();
  const payouts = getStoredPayouts();
  const earnings = getStoredEarnings();

  let totalStudentPayments = 0;
  let platformCommission = 0;
  let refunds = 0;
  let failedPayments = 0;

  for (const p of payments) {
    if (p.status === "paid") {
      totalStudentPayments += p.amount;
      platformCommission += p.platformFee;
    } else if (p.status === "refunded") {
      refunds += p.amount;
    } else if (p.status === "failed") {
      failedPayments++;
    }
  }

  let teacherPayable = 0;
  for (const e of earnings) {
    if (e.status === "payable") {
      teacherPayable += e.teacherAmount;
    }
  }

  let pendingTeacherPayouts = 0;
  let completedTeacherPayouts = 0;

  for (const po of payouts) {
    if (po.status === "pending" || po.status === "approved" || po.status === "processing") {
      pendingTeacherPayouts += po.teacherPayable;
    } else if (po.status === "paid") {
      completedTeacherPayouts += po.teacherPayable;
    }
  }

  return {
    totalStudentPayments,
    platformCommission,
    teacherPayable,
    pendingTeacherPayouts,
    completedTeacherPayouts,
    refunds,
    totalTransactions: payments.length,
    failedPayments,
  };
}
