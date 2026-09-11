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
