import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  requireUser,
  requireSuperAdmin,
  isAuthorizedAdminEmail,
} from "./authHelpers";

// ─── Mathematical Commission Rate Constants ─────────────────────────────────
export const PLATFORM_COMMISSION_RATE = 0.15; // 15% Virtual Tutor Platform Take Rate
export const TEACHER_SHARE_RATE = 0.85; // 85% Teacher Earning Rate

/**
 * Calculates authoritative platform commission and teacher earning.
 * Always calculated on the backend using authoritative amount.
 */
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

// ─── Initiate Payment ────────────────────────────────────────────────────────
export const initiatePayment = mutation({
  args: {
    bookingId: v.string(),
    studentUserId: v.optional(v.string()),
    studentEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let authUserId = await getAuthUserId(ctx);
    let user: any = null;

    if (authUserId) {
      try {
        user = await ctx.db.get(authUserId as Id<"users">);
      } catch {}
    }

    if (!user && args.studentUserId) {
      try {
        user = await ctx.db.get(args.studentUserId as any);
        if (user) {
          authUserId = user._id;
        }
      } catch {}
    }

    if (!user && args.studentEmail) {
      const normalizedEmail = args.studentEmail.trim().toLowerCase();
      user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", normalizedEmail))
        .first();
      if (user) {
        authUserId = user._id;
      }
    }

    if (!authUserId || !user) {
      throw new Error("Unauthenticated: Please sign in to book and pay.");
    }

    let booking: any = null;
    try {
      booking = await ctx.db.get(args.bookingId as any);
    } catch {}

    if (!booking) {
      booking = await ctx.db
        .query("bookings")
        .filter((q) => q.eq(q.field("_id"), args.bookingId as any))
        .first();
    }

    if (!booking) {
      throw new Error("Booking record not found.");
    }

    // Authorization: User must be the student who created the booking or admin
    const isAdmin = isAuthorizedAdminEmail(user.email);
    if (booking.userId !== (authUserId as string) && !isAdmin) {
      throw new Error("Unauthorized: You may only pay for your own bookings.");
    }

    // Verify booking is not already confirmed/paid
    if (booking.status === "confirmed" || booking.status === "completed") {
      // Check if payment already exists
      const existingPaid = await ctx.db
        .query("payments")
        .withIndex("by_booking", (q) => q.eq("bookingId", String(args.bookingId)))
        .filter((q) => q.eq(q.field("status"), "paid"))
        .first();

      if (existingPaid) {
        return {
          success: true,
          alreadyPaid: true,
          paymentId: existingPaid._id,
          transactionId: existingPaid.transactionId,
          amount: existingPaid.amount,
          status: "paid",
          message: "This booking is already paid and confirmed.",
        };
      }
    }

    if (booking.status === "cancelled") {
      throw new Error("Cannot initiate payment for a cancelled booking.");
    }

    // Authoritative Amount: Resolve server-side price from booking
    const amount = booking.price && booking.price >= 500 ? booking.price : 4000;

    // Idempotency check: Reuse existing initiated or pending payment if available
    const existingInitiated = await ctx.db
      .query("payments")
      .withIndex("by_booking", (q) => q.eq("bookingId", String(args.bookingId)))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "initiated"),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    const now = Date.now();
    let paymentId: Id<"payments">;
    let transactionId: string;

    if (existingInitiated) {
      // Reuse existing pending payment record
      paymentId = existingInitiated._id;
      transactionId = existingInitiated.transactionId;
      await ctx.db.patch(paymentId, {
        amount,
        updatedAt: now,
      });
    } else {
      // Generate unique transaction ID: VT-TXN-{TIMESTAMP}-{RANDOM}
      transactionId = `VT-TXN-${now}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      paymentId = await ctx.db.insert("payments", {
        bookingId: String(booking._id),
        studentId: String(booking.userId),
        studentName: booking.studentName || user.name || "Student",
        teacherId: String(booking.teacherId),
        teacherName: booking.teacherName || "Instructor",
        amount,
        currency: "BDT",
        gateway: "uddoktapay",
        transactionId,
        status: "initiated",
        createdAt: now,
        updatedAt: now,
      });

      // Audit Log
      await ctx.db.insert("financialAuditLogs", {
        actor: String(user._id),
        actorRole: user.role || "student",
        action: "payment_initiated",
        entity: "payment",
        entityId: String(paymentId),
        amount,
        previousStatus: "none",
        newStatus: "initiated",
        notes: `Initiated payment for booking ${booking._id} (${booking.subject})`,
        timestamp: now,
      });
    }

    return {
      success: true,
      paymentId,
      transactionId,
      amount,
      currency: "BDT",
      bookingId: booking._id,
      studentName: booking.studentName,
      teacherName: booking.teacherName,
      subject: booking.subject,
      date: booking.date,
      timeSlot: booking.timeSlot,
    };
  },
});

// ─── Verify and Finalize Payment (Authoritative Server Mutation) ──────────────
export const verifyAndFinalizePayment = mutation({
  args: {
    transactionId: v.string(),
    bookingId: v.optional(v.string()),
    valId: v.optional(v.string()),
    bankTranId: v.optional(v.string()),
    cardType: v.optional(v.string()),
    gatewayStatus: v.string(), // "VALID" | "VALIDATED" | "SUCCESS"
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let payment = await ctx.db
      .query("payments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .first();

    // Resilient fallback 1: Search by bookingId index
    if (!payment && args.bookingId) {
      payment = await ctx.db
        .query("payments")
        .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId!))
        .first();
    }

    // Resilient fallback 2: Check if transactionId was actually bookingId
    if (!payment) {
      payment = await ctx.db
        .query("payments")
        .withIndex("by_booking", (q) => q.eq("bookingId", args.transactionId))
        .first();
    }

    // Resilient fallback 3: Check by gatewayTransactionId
    if (!payment && args.valId) {
      payment = await ctx.db
        .query("payments")
        .filter((q) => q.eq(q.field("gatewayTransactionId"), args.valId))
        .first();
    }

    if (!payment) {
      // If payment record still doesn't exist, check if booking exists to link
      const targetBookingId = args.bookingId || args.transactionId;
      let directBooking: any = null;
      try {
        directBooking = await ctx.db.get(targetBookingId as Id<"bookings">);
      } catch (_) {}

      if (directBooking) {
        const now = Date.now();
        const newPaymentId = await ctx.db.insert("payments", {
          bookingId: String(directBooking._id),
          studentId: directBooking.userId,
          studentName: directBooking.studentName,
          teacherId: directBooking.teacherId,
          teacherName: directBooking.teacherName,
          amount: args.amount || directBooking.price || 4000,
          currency: args.currency || "BDT",
          gateway: "uddoktapay",
          transactionId: args.transactionId,
          gatewayTransactionId: args.valId || args.bankTranId,
          paymentMethod: args.cardType || "UddoktaPay",
          status: "paid",
          paidAt: now,
          createdAt: now,
          updatedAt: now,
        });
        payment = await ctx.db.get(newPaymentId);
      }
    }

    if (!payment) {
      throw new Error(`Payment record with transaction ID ${args.transactionId} not found.`);
    }

    // Idempotency: If already paid, return early to prevent duplicate booking/earnings
    if (payment.status === "paid") {
      return {
        success: true,
        alreadyProcessed: true,
        paymentId: payment._id,
        bookingId: payment.bookingId,
        message: "Payment was already verified and processed.",
      };
    }

    // Validate gateway status
    const isValidStatus =
      args.gatewayStatus === "VALID" ||
      args.gatewayStatus === "VALIDATED" ||
      args.gatewayStatus === "SUCCESS";

    if (!isValidStatus) {
      throw new Error(`Invalid gateway status: ${args.gatewayStatus}`);
    }

    // Authoritative Amount Verification: If amount passed from gateway validation, check match
    if (args.amount !== undefined && Math.abs(args.amount - payment.amount) > 1) {
      throw new Error(
        `Amount mismatch: Gateway amount (${args.amount}) does not match expected amount (${payment.amount}).`
      );
    }

    const now = Date.now();

    // 1. Update payment to PAID
    await ctx.db.patch(payment._id, {
      status: "paid",
      gatewayTransactionId: args.valId || args.bankTranId || `GTX-${now}`,
      paymentMethod: args.cardType || "Direct Gateway",
      paidAt: now,
      updatedAt: now,
    });

    // 2. Fetch the corresponding booking
    let booking: any = null;
    try {
      booking = await ctx.db.get(payment.bookingId as Id<"bookings">);
    } catch (_) {}

    if (!booking && args.bookingId) {
      try {
        booking = await ctx.db.get(args.bookingId as Id<"bookings">);
      } catch (_) {}
    }

    if (!booking) {
      booking = await ctx.db
        .query("bookings")
        .filter((q) =>
          q.or(
            q.eq(q.field("_id"), payment.bookingId as any),
            q.eq(q.field("meetingCode"), payment.bookingId),
          ),
        )
        .first();
    }

    let lessonId: string | undefined = undefined;

    if (booking) {
      // Calculate scheduledAt timestamp
      let scheduledAt = now + 24 * 60 * 60 * 1000;
      try {
        const parsedDate = new Date(`${booking.date} ${booking.timeSlot}`);
        if (!isNaN(parsedDate.getTime())) {
          scheduledAt = parsedDate.getTime();
        }
      } catch {}

      const validSessionType:
        | "1-to-1"
        | "small-group"
        | "trial"
        | "mentoring"
        | "exam-prep"
        | "project-help" =
        booking.sessionType === "small-group"
          ? "small-group"
          : booking.sessionType === "trial"
          ? "trial"
          : booking.sessionType === "mentoring"
          ? "mentoring"
          : booking.sessionType === "exam-prep"
          ? "exam-prep"
          : booking.sessionType === "project-help"
          ? "project-help"
          : "1-to-1";

      // Create lesson entry if not already present
      if (!booking.lessonId) {
        const newLesson = await ctx.db.insert("lessons", {
          teacherId: booking.teacherId,
          teacherName: booking.teacherName,
          studentId: booking.userId,
          studentName: booking.studentName,
          subject: booking.subject,
          title: `${booking.subject} Lesson with ${booking.teacherName}`,
          scheduledAt,
          durationMinutes: booking.durationMinutes,
          status: "scheduled",
          sessionType: validSessionType,
          price: booking.price,
          meetingCode: booking.meetingCode,
        });
        lessonId = String(newLesson);
      } else {
        lessonId = booking.lessonId;
      }

      // Update booking status to CONFIRMED
      await ctx.db.patch(booking._id, {
        status: "confirmed",
        lessonId,
      });

      // Send notifications to Student and Teacher
      try {
        await ctx.db.insert("notifications", {
          userId: booking.userId,
          type: "payment_success",
          title: "Tuition Payment Confirmed!",
          message: `Payment of ৳${payment.amount.toLocaleString()} for ${booking.subject} with ${booking.teacherName} was confirmed. Your session is scheduled!`,
          read: false,
          actionUrl: `/classroom?sessionId=${lessonId}`,
          createdAt: now,
        });

        await ctx.db.insert("notifications", {
          userId: booking.teacherId,
          type: "booking_confirmed",
          title: "New Student Tuition Confirmed",
          message: `${booking.studentName} paid tuition of ৳${payment.amount.toLocaleString()} for ${booking.subject} on ${booking.date} at ${booking.timeSlot}.`,
          read: false,
          actionUrl: "/teacher-dashboard",
          createdAt: now,
        });
      } catch {}
    }

    // 3. Create Teacher Earning Record (Idempotently: Check if already created)
    const existingEarning = await ctx.db
      .query("teacherEarnings")
      .withIndex("by_booking", (q) => q.eq("bookingId", payment.bookingId))
      .first();

    if (!existingEarning) {
      const { platformFee, teacherAmount } = calculateCommission(payment.amount);

      const earningId = await ctx.db.insert("teacherEarnings", {
        teacherId: payment.teacherId,
        teacherName: payment.teacherName,
        bookingId: payment.bookingId,
        paymentId: String(payment._id),
        studentId: payment.studentId,
        studentName: payment.studentName,
        grossAmount: payment.amount,
        platformFee,
        teacherAmount,
        status: "payable", // Accumulates during the month for month-end payout
        earnedAt: now,
        payableAt: now,
        notes: `15% commission: ৳${platformFee.toLocaleString()}, Teacher 85%: ৳${teacherAmount.toLocaleString()}`,
        createdAt: now,
        updatedAt: now,
      });

      // Audit Log for Teacher Earning
      await ctx.db.insert("financialAuditLogs", {
        actor: "system_payment_ipn",
        actorRole: "system",
        action: "teacher_earning_created",
        entity: "teacher_earning",
        entityId: String(earningId),
        amount: teacherAmount,
        previousStatus: "none",
        newStatus: "payable",
        notes: `Earned ৳${teacherAmount.toLocaleString()} (Gross ৳${payment.amount.toLocaleString()}, Fee ৳${platformFee.toLocaleString()})`,
        timestamp: now,
      });
    }

    // Audit Log for Payment Verification
    await ctx.db.insert("financialAuditLogs", {
      actor: "system_payment_ipn",
      actorRole: "system",
      action: "payment_verified",
      entity: "payment",
      entityId: String(payment._id),
      amount: payment.amount,
      previousStatus: payment.status,
      newStatus: "paid",
      notes: `Transaction ${args.transactionId} verified. Booking confirmed.`,
      timestamp: now,
    });

    return {
      success: true,
      paymentId: payment._id,
      bookingId: payment.bookingId,
      lessonId,
      amount: payment.amount,
      status: "paid",
    };
  },
});

// ─── Record Payment Failure or Cancellation ──────────────────────────────────
export const recordPaymentFailure = mutation({
  args: {
    transactionId: v.string(),
    reason: v.optional(v.string()),
    isCancelled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let payment = await ctx.db
      .query("payments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .first();

    if (!payment) {
      payment = await ctx.db
        .query("payments")
        .withIndex("by_booking", (q) => q.eq("bookingId", args.transactionId))
        .first();
    }

    if (!payment) return { success: false, reason: "Payment not found" };

    if (payment.status === "paid") {
      return { success: false, reason: "Payment is already marked as paid" };
    }

    const nextStatus = args.isCancelled ? "cancelled" : "failed";
    const now = Date.now();

    await ctx.db.patch(payment._id, {
      status: nextStatus,
      updatedAt: now,
    });

    // Booking remains pending so student can retry payment without creating duplicate bookings
    await ctx.db.insert("financialAuditLogs", {
      actor: "system_gateway",
      actorRole: "system",
      action: args.isCancelled ? "payment_cancelled" : "payment_failed",
      entity: "payment",
      entityId: String(payment._id),
      amount: payment.amount,
      previousStatus: payment.status,
      newStatus: nextStatus,
      notes: args.reason || "Payment was not completed by user or gateway failed",
      timestamp: now,
    });

    return { success: true, status: nextStatus };
  },
});

// ─── Secure IPN Event Audit Logging ──────────────────────────────────────────
export const logIpnEvent = mutation({
  args: {
    actor: v.string(),
    action: v.string(),
    entityId: v.string(),
    amount: v.optional(v.number()),
    status: v.string(),
    notes: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const logId = await ctx.db.insert("financialAuditLogs", {
      actor: args.actor,
      actorRole: "system",
      action: args.action,
      entity: "payment",
      entityId: args.entityId,
      amount: args.amount,
      newStatus: args.status,
      notes: args.notes,
      metadata: args.metadata,
      timestamp: now,
    });
    return { success: true, logId };
  },
});


// ─── Get Payment Details (For Checkout / Status Polling) ─────────────────────
export const getPaymentDetails = query({
  args: {
    transactionId: v.string(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .first();

    if (!payment) return null;

    const booking = await ctx.db.get(payment.bookingId as Id<"bookings">);

    return {
      ...payment,
      booking: booking
        ? {
            subject: booking.subject,
            date: booking.date,
            timeSlot: booking.timeSlot,
            durationMinutes: booking.durationMinutes,
            status: booking.status,
            meetingCode: booking.meetingCode,
            lessonId: booking.lessonId,
          }
        : null,
    };
  },
});

// ─── List Payments by Student (For Student Dashboard) ───────────────────────
export const listPaymentsByStudent = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return [];

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_student", (q) => q.eq("studentId", authUserId as string))
      .order("desc")
      .collect();

    return payments;
  },
});

// ─── List Earnings by Teacher (For Teacher Dashboard) ───────────────────────
export const listEarningsByTeacher = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) {
      return {
        currentMonthEarnings: 0,
        pendingPayout: 0,
        lastPaidAmount: 0,
        lifetimeEarnings: 0,
        earningsList: [],
        payoutsList: [],
      };
    }

    const earnings = await ctx.db
      .query("teacherEarnings")
      .withIndex("by_teacher", (q) => q.eq("teacherId", authUserId as string))
      .order("desc")
      .collect();

    const payouts = await ctx.db
      .query("teacherPayouts")
      .withIndex("by_teacher", (q) => q.eq("teacherId", authUserId as string))
      .order("desc")
      .collect();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let currentMonthEarnings = 0;
    let pendingPayout = 0;
    let lifetimeEarnings = 0;

    for (const e of earnings) {
      if (e.status !== "reversed" && e.status !== "held") {
        lifetimeEarnings += e.teacherAmount;

        if (e.earnedAt >= startOfMonth) {
          currentMonthEarnings += e.teacherAmount;
        }

        if (e.status === "payable" || e.status === "earned") {
          pendingPayout += e.teacherAmount;
        }
      }
    }

    const lastPaidPayout = payouts.find((p) => p.status === "paid");
    const lastPaidAmount = lastPaidPayout ? lastPaidPayout.teacherPayable : 0;

    return {
      currentMonthEarnings,
      pendingPayout,
      lastPaidAmount,
      lifetimeEarnings,
      earningsList: earnings,
      payoutsList: payouts,
    };
  },
});

// ─── ADMIN FINANCE SYSTEM ───────────────────────────────────────────────────

/**
 * Admin Financial Summary KPI Metric Card Data.
 * Strictly protected via requireSuperAdmin.
 */
export const adminGetFinancialSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    const allPayments = await ctx.db.query("payments").collect();
    const allEarnings = await ctx.db.query("teacherEarnings").collect();
    const allPayouts = await ctx.db.query("teacherPayouts").collect();

    let totalStudentPayments = 0;
    let platformCommission = 0;
    let teacherPayable = 0;
    let pendingTeacherPayouts = 0;
    let completedTeacherPayouts = 0;
    let refunds = 0;
    let failedPayments = 0;

    for (const p of allPayments) {
      if (p.status === "paid") {
        totalStudentPayments += p.amount;
        platformCommission += Math.round(p.amount * PLATFORM_COMMISSION_RATE);
      } else if (p.status === "refunded") {
        refunds += p.amount;
      } else if (p.status === "failed") {
        failedPayments += 1;
      }
    }

    // Teacher Payable from payable/earned teacher earnings not yet in paid payouts
    for (const e of allEarnings) {
      if (e.status === "payable" || e.status === "earned") {
        teacherPayable += e.teacherAmount;
      }
    }

    // Payouts breakdown
    for (const po of allPayouts) {
      if (po.status === "paid") {
        completedTeacherPayouts += po.teacherPayable;
      } else if (po.status === "pending" || po.status === "approved" || po.status === "processing") {
        pendingTeacherPayouts += po.teacherPayable;
      }
    }

    return {
      totalStudentPayments,
      platformCommission,
      teacherPayable,
      pendingTeacherPayouts,
      completedTeacherPayouts,
      refunds,
      failedPayments,
      totalTransactions: allPayments.length,
      commissionRatePercent: 15,
    };
  },
});

/**
 * Admin List All Payment Transactions.
 * Shows: Transaction ID, Student, Teacher, Booking, Gross Amount, 15% Fee, Teacher Amount, Status, Date.
 */
export const adminListTransactions = query({
  args: {
    statusFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    let queryBuilder = ctx.db.query("payments").order("desc");
    const payments = await queryBuilder.collect();

    const filtered = args.statusFilter && args.statusFilter !== "all"
      ? payments.filter((p) => p.status === args.statusFilter)
      : payments;

    return filtered.map((p) => {
      const { platformFee, teacherAmount } = calculateCommission(p.amount);
      return {
        ...p,
        platformFee,
        teacherAmount,
      };
    });
  },
});

/**
 * Admin List Teacher Payouts.
 */
export const adminListPayouts = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    const payouts = await ctx.db
      .query("teacherPayouts")
      .order("desc")
      .collect();

    return payouts;
  },
});

/**
 * Admin List Audit Logs for Financial Activity.
 */
export const adminListFinancialAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const logs = await ctx.db
      .query("financialAuditLogs")
      .order("desc")
      .take(args.limit || 100);

    return logs;
  },
});

/**
 * Admin Monthly Settlement Preview & Generator.
 * Groups all unpaid, eligible teacher earnings within the settlement window.
 */
export const adminPreviewMonthlySettlement = query({
  args: {
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    // Fetch all payable earnings
    const payableEarnings = await ctx.db
      .query("teacherEarnings")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "payable"),
          q.gte(q.field("earnedAt"), args.periodStart),
          q.lte(q.field("earnedAt"), args.periodEnd)
        )
      )
      .collect();

    // Group by teacherId
    const teacherMap: Record<
      string,
      {
        teacherId: string;
        teacherName: string;
        grossEarnings: number;
        platformCommission: number;
        teacherPayable: number;
        earningsCount: number;
        earningIds: string[];
      }
    > = {};

    for (const e of payableEarnings) {
      if (!teacherMap[e.teacherId]) {
        teacherMap[e.teacherId] = {
          teacherId: e.teacherId,
          teacherName: e.teacherName || "Instructor",
          grossEarnings: 0,
          platformCommission: 0,
          teacherPayable: 0,
          earningsCount: 0,
          earningIds: [],
        };
      }

      teacherMap[e.teacherId].grossEarnings += e.grossAmount;
      teacherMap[e.teacherId].platformCommission += e.platformFee;
      teacherMap[e.teacherId].teacherPayable += e.teacherAmount;
      teacherMap[e.teacherId].earningsCount += 1;
      teacherMap[e.teacherId].earningIds.push(String(e._id));
    }

    return Object.values(teacherMap);
  },
});

/**
 * Admin Create Monthly Settlement Payouts.
 */
export const adminCreateMonthlySettlement = mutation({
  args: {
    periodStart: v.number(),
    periodEnd: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireSuperAdmin(ctx);

    // Fetch eligible payable earnings
    const payableEarnings = await ctx.db
      .query("teacherEarnings")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "payable"),
          q.gte(q.field("earnedAt"), args.periodStart),
          q.lte(q.field("earnedAt"), args.periodEnd)
        )
      )
      .collect();

    if (payableEarnings.length === 0) {
      throw new Error("No eligible payable teacher earnings found for this settlement period.");
    }

    const teacherMap: Record<
      string,
      {
        teacherId: string;
        teacherName: string;
        grossEarnings: number;
        platformCommission: number;
        teacherPayable: number;
        earningRecords: Doc<"teacherEarnings">[];
      }
    > = {};

    for (const e of payableEarnings) {
      if (!teacherMap[e.teacherId]) {
        teacherMap[e.teacherId] = {
          teacherId: e.teacherId,
          teacherName: e.teacherName || "Instructor",
          grossEarnings: 0,
          platformCommission: 0,
          teacherPayable: 0,
          earningRecords: [],
        };
      }
      teacherMap[e.teacherId].grossEarnings += e.grossAmount;
      teacherMap[e.teacherId].platformCommission += e.platformFee;
      teacherMap[e.teacherId].teacherPayable += e.teacherAmount;
      teacherMap[e.teacherId].earningRecords.push(e);
    }

    const now = Date.now();
    const createdPayoutIds: string[] = [];

    for (const tId of Object.keys(teacherMap)) {
      const summary = teacherMap[tId];

      const payoutId = await ctx.db.insert("teacherPayouts", {
        teacherId: summary.teacherId,
        teacherName: summary.teacherName,
        settlementPeriodStart: args.periodStart,
        settlementPeriodEnd: args.periodEnd,
        grossEarnings: summary.grossEarnings,
        platformCommission: summary.platformCommission,
        teacherPayable: summary.teacherPayable,
        status: "pending", // Starts as pending review
        notes: args.notes || `Monthly settlement for ${new Date(args.periodStart).toLocaleDateString()} to ${new Date(args.periodEnd).toLocaleDateString()}`,
        createdAt: now,
        updatedAt: now,
      });

      // Link earnings to this payout and update status to processing
      for (const rec of summary.earningRecords) {
        await ctx.db.patch(rec._id, {
          payoutId: String(payoutId),
          status: "processing",
          updatedAt: now,
        });
      }

      createdPayoutIds.push(String(payoutId));

      // Audit Log
      await ctx.db.insert("financialAuditLogs", {
        actor: String(user._id),
        actorRole: "admin",
        action: "payout_created",
        entity: "payout",
        entityId: String(payoutId),
        amount: summary.teacherPayable,
        previousStatus: "none",
        newStatus: "pending",
        notes: `Settlement created for ${summary.teacherName}: ৳${summary.teacherPayable.toLocaleString()}`,
        timestamp: now,
      });
    }

    return {
      success: true,
      createdCount: createdPayoutIds.length,
      payoutIds: createdPayoutIds,
    };
  },
});

/**
 * Admin Update Payout Status (Approve / Mark Processing / Mark Paid).
 */
export const adminUpdatePayoutStatus = mutation({
  args: {
    payoutId: v.id("teacherPayouts"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("processing"),
      v.literal("paid"),
      v.literal("failed")
    ),
    payoutMethod: v.optional(
      v.union(
        v.literal("bank"),
        v.literal("bkash"),
        v.literal("nagad"),
        v.literal("rocket"),
        v.literal("other")
      )
    ),
    payoutReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireSuperAdmin(ctx);

    const payout = await ctx.db.get(args.payoutId);
    if (!payout) throw new Error("Payout record not found.");

    const now = Date.now();
    const updates: any = {
      status: args.status,
      updatedAt: now,
    };

    if (args.payoutMethod) updates.payoutMethod = args.payoutMethod;
    if (args.payoutReference !== undefined) updates.payoutReference = args.payoutReference;
    if (args.notes) updates.notes = args.notes;

    if (args.status === "approved") {
      updates.approvedAt = now;
    } else if (args.status === "paid") {
      updates.paidAt = now;

      // Update all attached teacherEarnings to "paid"
      const linkedEarnings = await ctx.db
        .query("teacherEarnings")
        .withIndex("by_payout", (q) => q.eq("payoutId", String(args.payoutId)))
        .collect();

      for (const earning of linkedEarnings) {
        await ctx.db.patch(earning._id, {
          status: "paid",
          paidAt: now,
          updatedAt: now,
        });
      }

      // Notify teacher of paid payout
      try {
        await ctx.db.insert("notifications", {
          userId: payout.teacherId,
          type: "payout_paid",
          title: "Monthly Payout Disbursed",
          message: `Your monthly tuition payout of ৳${payout.teacherPayable.toLocaleString()} has been marked as paid (Ref: ${args.payoutReference || "Processed"}).`,
          read: false,
          actionUrl: "/teacher-dashboard",
          createdAt: now,
        });
      } catch {}
    } else if (args.status === "failed") {
      // Revert attached earnings back to "payable" so they can be re-attempted
      const linkedEarnings = await ctx.db
        .query("teacherEarnings")
        .withIndex("by_payout", (q) => q.eq("payoutId", String(args.payoutId)))
        .collect();

      for (const earning of linkedEarnings) {
        await ctx.db.patch(earning._id, {
          status: "payable",
          payoutId: undefined,
          updatedAt: now,
        });
      }
    }

    await ctx.db.patch(payout._id, updates);

    // Audit Log
    await ctx.db.insert("financialAuditLogs", {
      actor: String(user._id),
      actorRole: "admin",
      action: `payout_${args.status}`,
      entity: "payout",
      entityId: String(payout._id),
      amount: payout.teacherPayable,
      previousStatus: payout.status,
      newStatus: args.status,
      notes: args.notes || `Payout marked as ${args.status} by admin`,
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Admin Process Refund.
 * Reverses teacher earning if unpaid, or logs adjustment if already paid.
 */
export const adminProcessRefund = mutation({
  args: {
    paymentId: v.id("payments"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireSuperAdmin(ctx);

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment record not found.");

    if (payment.status === "refunded") {
      throw new Error("Payment is already refunded.");
    }

    const now = Date.now();

    // 1. Mark payment as refunded
    await ctx.db.patch(payment._id, {
      status: "refunded",
      refundReason: args.reason,
      refundedAt: now,
      refundedBy: user.email,
      updatedAt: now,
    });

    // 2. Check associated teacher earning
    const earning = await ctx.db
      .query("teacherEarnings")
      .withIndex("by_booking", (q) => q.eq("bookingId", payment.bookingId))
      .first();

    if (earning) {
      if (earning.status !== "paid") {
        // Reverse earning so teacher is not paid
        await ctx.db.patch(earning._id, {
          status: "reversed",
          notes: `Reversed due to student refund: ${args.reason}`,
          updatedAt: now,
        });
      } else {
        // Teacher was already paid out: record recovery adjustment
        await ctx.db.insert("financialAdjustments", {
          teacherId: earning.teacherId,
          originalPaymentId: String(payment._id),
          earningId: String(earning._id),
          adjustmentAmount: earning.teacherAmount,
          reason: `Refund clawback for payment ${payment.transactionId}: ${args.reason}`,
          recoveryStatus: "pending_deduction",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 3. Update booking if exists
    try {
      const booking = await ctx.db.get(payment.bookingId as Id<"bookings">);
      if (booking && booking.status !== "cancelled") {
        await ctx.db.patch(booking._id, {
          status: "cancelled",
        });
      }
    } catch {}

    // Audit Log
    await ctx.db.insert("financialAuditLogs", {
      actor: String(user._id),
      actorRole: "admin",
      action: "refund_completed",
      entity: "payment",
      entityId: String(payment._id),
      amount: payment.amount,
      previousStatus: payment.status,
      newStatus: "refunded",
      notes: args.reason,
      timestamp: now,
    });

    return { success: true };
  },
});

// ─── 1-Page Modern Checkout: Secure Order Creation ───────────────────────────
export const createOrder = mutation({
  args: {
    teacherId: v.string(),
    courseId: v.optional(v.string()),
    courseName: v.optional(v.string()),
    subject: v.optional(v.string()),
    numberOfClasses: v.optional(v.number()),
    amount: v.optional(v.number()),
    paymentGateway: v.optional(v.string()), // "bKash" | "Nagad" | "Rocket" | "Cards / Internet Banking"
    studentPhone: v.optional(v.string()),
    studentEmail: v.optional(v.string()),
    studentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let authUserId = await getAuthUserId(ctx);
    let user: any = null;

    if (authUserId) {
      try {
        user = await ctx.db.get(authUserId as Id<"users">);
      } catch {}
    }

    if (!user && args.studentEmail) {
      const normalizedEmail = args.studentEmail.trim().toLowerCase();
      user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", normalizedEmail))
        .first();
      if (user) {
        authUserId = user._id;
      }
    }

    // Fetch Teacher Profile for authoritative verification
    let teacherProfile: any = null;
    try {
      teacherProfile = await ctx.db
        .query("teacherProfiles")
        .withIndex("by_user", (q) => q.eq("userId", args.teacherId))
        .first();
    } catch {}

    if (!teacherProfile) {
      try {
        teacherProfile = await ctx.db.get(args.teacherId as any);
      } catch {}
    }

    const teacherName = teacherProfile?.name || "Verified Virtual Tutor Instructor";
    const teacherPhoto = teacherProfile?.avatarUrl || undefined;
    const resolvedSubject = args.subject || teacherProfile?.subjects?.[0] || "Academic Tutoring";
    const resolvedCourseName =
      args.courseName || `${resolvedSubject} Monthly Tuition Package`;
    const resolvedClasses = args.numberOfClasses || 12;

    // Authoritative pricing: resolve from teacher hourly/monthly rate
    let resolvedAmount = 3000;
    if (teacherProfile?.hourlyRate && teacherProfile.hourlyRate >= 500) {
      resolvedAmount = Math.round(teacherProfile.hourlyRate);
    } else if (args.amount && args.amount >= 500) {
      resolvedAmount = Math.round(args.amount);
    }

    const now = Date.now();
    const orderId = `VT-ORD-${now.toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const gateway = args.paymentGateway || "bKash";
    const gatewayInvoiceId = `INV-${orderId}`;

    const studentId = authUserId ? String(authUserId) : "student_guest";
    const studentName = args.studentName || user?.name || "Student";
    const studentEmail = args.studentEmail || user?.email || "student@vartualtutor.com";
    const studentPhone = args.studentPhone || user?.phone || "";

    // 1. Create order record in orders table
    const orderDocId = await ctx.db.insert("orders", {
      orderId,
      studentId,
      studentName,
      studentEmail,
      studentPhone: studentPhone || undefined,
      teacherId: args.teacherId,
      teacherName,
      teacherPhoto,
      courseId: args.courseId || `crs_${args.teacherId}`,
      courseName: resolvedCourseName,
      subject: resolvedSubject,
      numberOfClasses: resolvedClasses,
      amount: resolvedAmount,
      currency: "BDT",
      paymentGateway: gateway,
      gatewayInvoiceId,
      paymentStatus: "PENDING",
      enrollmentStatus: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    // 2. Also create linked payment record for full backward compatibility
    const paymentDocId = await ctx.db.insert("payments", {
      orderId,
      bookingId: orderId,
      studentId,
      studentName,
      studentPhone: studentPhone || undefined,
      studentEmail,
      teacherId: args.teacherId,
      teacherName,
      teacherPhoto,
      courseId: args.courseId || `crs_${args.teacherId}`,
      courseName: resolvedCourseName,
      subject: resolvedSubject,
      numberOfClasses: resolvedClasses,
      amount: resolvedAmount,
      currency: "BDT",
      gateway: gateway.toLowerCase().includes("bkash")
        ? "bkash"
        : gateway.toLowerCase().includes("nagad")
        ? "nagad"
        : gateway.toLowerCase().includes("rocket")
        ? "rocket"
        : "card",
      paymentGateway: gateway,
      gatewayInvoiceId,
      transactionId: orderId,
      status: "pending",
      paymentStatus: "PENDING",
      enrollmentStatus: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    // Audit Log
    await ctx.db.insert("financialAuditLogs", {
      actor: studentId,
      actorRole: "student",
      action: "order_created",
      entity: "order",
      entityId: String(orderDocId),
      amount: resolvedAmount,
      previousStatus: "none",
      newStatus: "PENDING",
      notes: `Order created for ${resolvedCourseName} with ${teacherName} (${gateway})`,
      timestamp: now,
    });

    return {
      success: true,
      orderId,
      paymentId: paymentDocId,
      amount: resolvedAmount,
      currency: "BDT",
      gatewayInvoiceId,
      courseName: resolvedCourseName,
      teacherName,
      teacherPhoto,
      subject: resolvedSubject,
      numberOfClasses: resolvedClasses,
      studentName,
      studentEmail,
      studentPhone,
    };
  },
});

// ─── Authoritative Server-Side Payment Verification & Enrollment Activation ───
export const verifyPaymentOrder = mutation({
  args: {
    orderId: v.string(),
    gatewayInvoiceId: v.optional(v.string()),
    paymentGateway: v.optional(v.string()),
    gatewayStatus: v.string(), // Server-side validated status (e.g. "PAID" | "COMPLETED" | "SUCCESS")
    paidAmount: v.optional(v.number()),
    serverSignature: v.optional(v.string()),
    bankTranId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Authoritative Lookup
    let order = await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();

    if (!order) {
      // Fallback: check payments table by transactionId
      const paymentFallback = await ctx.db
        .query("payments")
        .withIndex("by_transaction", (q) => q.eq("transactionId", args.orderId))
        .first();

      if (paymentFallback) {
        order = {
          _id: paymentFallback._id as any,
          orderId: paymentFallback.orderId || paymentFallback.transactionId,
          studentId: paymentFallback.studentId,
          studentName: paymentFallback.studentName || "Student",
          studentEmail: paymentFallback.studentEmail || "student@vartualtutor.com",
          studentPhone: paymentFallback.studentPhone,
          teacherId: paymentFallback.teacherId,
          teacherName: paymentFallback.teacherName || "Instructor",
          teacherPhoto: paymentFallback.teacherPhoto,
          courseId: paymentFallback.courseId || "crs_default",
          courseName: paymentFallback.courseName || "Academic Tutoring Course",
          subject: paymentFallback.subject || "Tuition",
          numberOfClasses: paymentFallback.numberOfClasses || 12,
          amount: paymentFallback.amount,
          currency: paymentFallback.currency || "BDT",
          paymentGateway: args.paymentGateway || paymentFallback.paymentGateway || "bKash",
          gatewayInvoiceId: paymentFallback.gatewayInvoiceId,
          paymentStatus: (paymentFallback.paymentStatus || "PENDING") as any,
          enrollmentStatus: (paymentFallback.enrollmentStatus || "PENDING") as any,
          createdAt: paymentFallback.createdAt,
          updatedAt: paymentFallback.updatedAt,
        } as any;
      }
    }

    if (!order) {
      throw new Error(`Order ${args.orderId} not found.`);
    }

    // Idempotency: If already PAID and ACTIVE, return success
    if (order.paymentStatus === "PAID" && order.enrollmentStatus === "ACTIVE") {
      return {
        success: true,
        alreadyVerified: true,
        orderId: order.orderId,
        paymentStatus: "PAID",
        enrollmentStatus: "ACTIVE",
        message: "Payment already verified and enrollment active.",
      };
    }

    // 2. Strict Server-Side Validation: Never mark paid without successful status check
    const normalizedStatus = args.gatewayStatus.toUpperCase();
    const isSuccess =
      normalizedStatus === "PAID" ||
      normalizedStatus === "COMPLETED" ||
      normalizedStatus === "VALID" ||
      normalizedStatus === "SUCCESS";

    const now = Date.now();

    if (!isSuccess) {
      // Mark as FAILED / CANCELLED and do NOT activate enrollment
      const failedStatus = normalizedStatus === "CANCELLED" ? "CANCELLED" : "FAILED";
      if (order._id) {
        try {
          await ctx.db.patch(order._id, {
            paymentStatus: failedStatus,
            enrollmentStatus: "CANCELLED",
            updatedAt: now,
          });
        } catch {}
      }

      // Update linked payment record
      const linkedPayment = await ctx.db
        .query("payments")
        .withIndex("by_transaction", (q) => q.eq("transactionId", args.orderId))
        .first();

      if (linkedPayment) {
        await ctx.db.patch(linkedPayment._id, {
          status: "failed",
          paymentStatus: failedStatus,
          enrollmentStatus: "CANCELLED",
          updatedAt: now,
        });
      }

      return {
        success: false,
        orderId: order.orderId,
        paymentStatus: failedStatus,
        enrollmentStatus: "CANCELLED",
        message: "Payment was not completed by the gateway.",
      };
    }

    // Authoritative Amount Verification
    if (args.paidAmount !== undefined && Math.abs(args.paidAmount - order.amount) > 1) {
      throw new Error(
        `Security verification failed: Charged amount (৳${args.paidAmount}) does not match order amount (৳${order.amount}).`
      );
    }

    // 3. Create or Activate Lesson & Booking in the Virtual Tutor system
    const scheduledAt = now + 24 * 60 * 60 * 1000;
    const meetingCode = `VT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    let lessonId: string | undefined = order.lessonId;
    let bookingId: string | undefined = order.bookingId;

    if (!lessonId) {
      const lessonDoc = await ctx.db.insert("lessons", {
        teacherId: order.teacherId,
        teacherName: order.teacherName,
        studentId: order.studentId,
        studentName: order.studentName,
        subject: order.subject,
        title: `${order.courseName} - Live Classroom`,
        scheduledAt,
        durationMinutes: 60,
        status: "scheduled",
        sessionType: "1-to-1",
        price: order.amount,
        meetingCode,
      });
      lessonId = String(lessonDoc);
    }

    if (!bookingId) {
      const bookingDoc = await ctx.db.insert("bookings", {
        userId: order.studentId,
        teacherId: order.teacherId,
        teacherName: order.teacherName,
        studentName: order.studentName,
        lessonId,
        date: new Date(scheduledAt).toISOString().split("T")[0],
        timeSlot: "10:00 AM - 11:00 AM",
        durationMinutes: 60,
        subject: order.subject,
        sessionType: "1-to-1",
        price: order.amount,
        status: "confirmed",
        meetingCode,
        createdAt: now,
      });
      bookingId = String(bookingDoc);
    }

    // 4. Update order to PAID and enrollment to ACTIVE
    try {
      await ctx.db.patch(order._id, {
        paymentStatus: "PAID",
        enrollmentStatus: "ACTIVE",
        paidAt: now,
        lessonId,
        bookingId,
        updatedAt: now,
      });
    } catch {}

    // Update linked payments record
    const linkedPayment = await ctx.db
      .query("payments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.orderId))
      .first();

    if (linkedPayment) {
      await ctx.db.patch(linkedPayment._id, {
        status: "paid",
        paymentStatus: "PAID",
        enrollmentStatus: "ACTIVE",
        paidAt: now,
        bookingId: bookingId || linkedPayment.bookingId,
        gatewayTransactionId: args.bankTranId || `GTX-${now}`,
        updatedAt: now,
      });
    }

    // 5. Credit Educator Earnings (85% Educator, 15% Platform Commission)
    const { platformFee, teacherAmount } = calculateCommission(order.amount);
    const existingEarning = await ctx.db
      .query("teacherEarnings")
      .withIndex("by_booking", (q) => q.eq("bookingId", bookingId || order.orderId))
      .first();

    if (!existingEarning) {
      await ctx.db.insert("teacherEarnings", {
        teacherId: order.teacherId,
        teacherName: order.teacherName,
        paymentId: linkedPayment ? String(linkedPayment._id) : String(order._id),
        bookingId: bookingId || order.orderId,
        studentId: order.studentId,
        studentName: order.studentName,
        grossAmount: order.amount,
        platformFee,
        teacherAmount,
        status: "payable",
        earnedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 6. Send In-App Notifications
    try {
      await ctx.db.insert("notifications", {
        userId: order.studentId,
        type: "payment_success",
        title: "Payment Successful ✓ Class Activated!",
        message: `Your payment of ৳${order.amount.toLocaleString()} for ${order.courseName} with ${order.teacherName} has been verified. Your class enrollment is now ACTIVE.`,
        read: false,
        actionUrl: `/classroom?sessionId=${lessonId}`,
        createdAt: now,
      });

      await ctx.db.insert("notifications", {
        userId: order.teacherId,
        type: "booking_confirmed",
        title: "New Student Enrolled & Paid",
        message: `${order.studentName} enrolled in ${order.courseName} (৳${order.amount.toLocaleString()} BDT). Net payable: ৳${teacherAmount.toLocaleString()} BDT.`,
        read: false,
        actionUrl: "/teacher-dashboard",
        createdAt: now,
      });
    } catch {}

    // Audit Log
    await ctx.db.insert("financialAuditLogs", {
      actor: "server_gateway_verifier",
      actorRole: "system",
      action: "order_payment_verified",
      entity: "order",
      entityId: String(order._id),
      amount: order.amount,
      previousStatus: "PENDING",
      newStatus: "PAID",
      notes: `Order ${order.orderId} verified via ${order.paymentGateway}. Enrollment status ACTIVE.`,
      timestamp: now,
    });

    return {
      success: true,
      orderId: order.orderId,
      paymentStatus: "PAID",
      enrollmentStatus: "ACTIVE",
      amount: order.amount,
      teacherName: order.teacherName,
      courseName: order.courseName,
      lessonId,
      bookingId,
      paidAt: now,
    };
  },
});

// ─── Query: Get Order by ID ──────────────────────────────────────────────────
export const getOrder = query({
  args: {
    orderId: v.string(),
  },
  handler: async (ctx, args) => {
    let order = await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();

    if (!order) {
      const payment = await ctx.db
        .query("payments")
        .withIndex("by_transaction", (q) => q.eq("transactionId", args.orderId))
        .first();

      if (payment) {
        return {
          _id: payment._id,
          orderId: payment.orderId || payment.transactionId,
          studentId: payment.studentId,
          studentName: payment.studentName || "Student",
          studentEmail: payment.studentEmail || "student@vartualtutor.com",
          studentPhone: payment.studentPhone || "",
          teacherId: payment.teacherId,
          teacherName: payment.teacherName || "Instructor",
          teacherPhoto: payment.teacherPhoto,
          courseId: payment.courseId || "crs_default",
          courseName: payment.courseName || "Academic Course",
          subject: payment.subject || "Tutoring",
          numberOfClasses: payment.numberOfClasses || 12,
          amount: payment.amount,
          currency: payment.currency || "BDT",
          paymentGateway: payment.paymentGateway || payment.gateway || "bKash",
          gatewayInvoiceId: payment.gatewayInvoiceId,
          paymentStatus: (payment.paymentStatus || (payment.status === "paid" ? "PAID" : "PENDING")) as any,
          enrollmentStatus: (payment.enrollmentStatus || (payment.status === "paid" ? "ACTIVE" : "PENDING")) as any,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        };
      }
    }

    return order;
  },
});

// ─── Query: List Admin Orders with Details ────────────────────────────────────
export const listAdminOrders = query({
  args: {
    statusFilter: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let orders = await ctx.db.query("orders").order("desc").take(200);

    if (orders.length === 0) {
      // Synthesize from payments if orders table is new
      const payments = await ctx.db.query("payments").order("desc").take(200);
      orders = payments.map((p) => ({
        _id: p._id as any,
        orderId: p.orderId || p.transactionId,
        studentId: p.studentId,
        studentName: p.studentName || "Student",
        studentEmail: p.studentEmail || "student@vartualtutor.com",
        studentPhone: p.studentPhone,
        teacherId: p.teacherId,
        teacherName: p.teacherName || "Instructor",
        teacherPhoto: p.teacherPhoto,
        courseId: p.courseId || "crs_default",
        courseName: p.courseName || (p.subject ? `${p.subject} Class Package` : "Academic Course"),
        subject: p.subject || "Tutoring",
        numberOfClasses: p.numberOfClasses || 12,
        amount: p.amount,
        currency: p.currency || "BDT",
        paymentGateway: p.paymentGateway || p.gateway || "bKash",
        gatewayInvoiceId: p.gatewayInvoiceId,
        paymentStatus: (p.paymentStatus || (p.status === "paid" ? "PAID" : p.status === "failed" ? "FAILED" : p.status === "refunded" ? "REFUNDED" : "PENDING")) as any,
        enrollmentStatus: (p.enrollmentStatus || (p.status === "paid" ? "ACTIVE" : "PENDING")) as any,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })) as any[];
    }

    if (args.statusFilter && args.statusFilter !== "all") {
      const sf = args.statusFilter.toUpperCase();
      orders = orders.filter((o) => o.paymentStatus === sf);
    }

    if (args.searchTerm && args.searchTerm.trim()) {
      const term = args.searchTerm.trim().toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderId.toLowerCase().includes(term) ||
          o.studentName.toLowerCase().includes(term) ||
          o.teacherName.toLowerCase().includes(term) ||
          o.courseName.toLowerCase().includes(term) ||
          o.subject.toLowerCase().includes(term)
      );
    }

    return orders;
  },
});

// ─── Admin Action: Authoritatively Verify Pending Payment ────────────────────
export const adminVerifyPendingPayment = mutation({
  args: {
    orderId: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireSuperAdmin(ctx);
    const now = Date.now();

    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();

    if (!order) {
      throw new Error(`Order ${args.orderId} not found`);
    }

    // Activate order and enrollment
    await ctx.db.patch(order._id, {
      paymentStatus: "PAID",
      enrollmentStatus: "ACTIVE",
      paidAt: now,
      updatedAt: now,
    });

    // Update linked payments
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.orderId))
      .first();

    if (payment) {
      await ctx.db.patch(payment._id, {
        status: "paid",
        paymentStatus: "PAID",
        enrollmentStatus: "ACTIVE",
        paidAt: now,
        updatedAt: now,
      });
    }

    // Audit log
    await ctx.db.insert("financialAuditLogs", {
      actor: String(auth.user?._id || auth.userId),
      actorRole: "admin",
      action: "admin_manual_payment_verified",
      entity: "order",
      entityId: String(order._id),
      amount: order.amount,
      previousStatus: order.paymentStatus,
      newStatus: "PAID",
      notes: args.notes || `Admin verified order ${order.orderId}`,
      timestamp: now,
    });

    return { success: true, orderId: order.orderId, paymentStatus: "PAID", enrollmentStatus: "ACTIVE" };
  },
});

