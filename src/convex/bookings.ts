import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Get bookings for current user ─────────────────────
export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
  },
});

// ─── Get bookings for a teacher ────────────────────────
export const listByTeacher = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("teacherId"), userId as string))
      .collect();
  },
});

// ─── Create a booking ─────────────────────────────────
export const create = mutation({
  args: {
    teacherId: v.string(),
    date: v.string(),
    timeSlot: v.string(),
    durationMinutes: v.number(),
    subject: v.string(),
    sessionType: v.string(),
  },
  handler: async (ctx, args) => {
    let authUserId = await getAuthUserId(ctx);
    let user: any = null;

    if (authUserId) {
      try {
        user = await ctx.db.get(authUserId);
      } catch {}
    }

    if (!user || !authUserId) {
      throw new Error("Unauthenticated: Please sign in or register to book a lesson.");
    }

    // Lookup Teacher Profile
    let teacherProfile: any = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.teacherId))
      .first();

    if (!teacherProfile) {
      try {
        teacherProfile = await ctx.db.get(args.teacherId as any);
      } catch {}
    }

    // Check teacher account status from users table if available
    let teacherUser: any = null;
    try {
      teacherUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("_id"), args.teacherId as any))
        .first();
    } catch {}

    if (teacherUser?.accountStatus === "suspended") {
      throw new Error("Teacher account is suspended.");
    }

    const teacherName = teacherProfile?.name || teacherUser?.name || "Faculty Specialist";

    // Resolve price server-side (monthly tuition plan in Tk)
    let price = teacherProfile?.hourlyRate && teacherProfile.hourlyRate >= 500
      ? teacherProfile.hourlyRate
      : Math.round(((teacherProfile?.hourlyRate) || 40) * 100);

    if (!price || price < 500) {
      price = 4000;
    }
    if (args.sessionType === "small-group" && teacherProfile?.groupPrice && teacherProfile.groupPrice >= 500) {
      price = teacherProfile.groupPrice;
    }

    // Validate date is in the future
    const bookingDate = new Date(args.date);
    if (bookingDate.getTime() < Date.now()) {
      throw new Error("Cannot book a session in the past");
    }

    // Check for double-booking
    const existingBooking = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("teacherId"), args.teacherId),
          q.eq(q.field("date"), args.date),
          q.eq(q.field("timeSlot"), args.timeSlot),
          q.neq(q.field("status"), "cancelled"),
        ),
      )
      .first();
    if (existingBooking) {
      throw new Error("This time slot is already booked");
    }

    const meetingCode = `BK-${Date.now().toString(36).toUpperCase()}`;

    const bookingId = await ctx.db.insert("bookings", {
      userId: String(authUserId),
      teacherId: args.teacherId,
      teacherName,
      studentName: user.name || "Student",
      date: args.date,
      timeSlot: args.timeSlot,
      durationMinutes: args.durationMinutes,
      subject: args.subject,
      sessionType: args.sessionType,
      price,
      status: "pending",
      meetingCode,
      createdAt: Date.now(),
    });

    // Notify teacher
    try {
      await ctx.db.insert("notifications", {
        userId: args.teacherId,
        type: "booking_request",
        title: "New Booking Request",
        message: `${user.name || "A student"} requested a ${args.durationMinutes}-min ${args.subject} lesson on ${args.date} at ${args.timeSlot}.`,
        read: false,
        actionUrl: "/teacher-dashboard",
        createdAt: Date.now(),
      });
    } catch {}

    return { success: true, bookingId, meetingCode };
  },
});

// ─── Confirm booking (teacher) ─────────────────────────
export const confirm = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.teacherId !== (userId as string)) throw new Error("Not authorized");

    // Convert date + timeSlot to scheduledAt timestamp
    let scheduledAt = Date.now() + 24 * 60 * 60 * 1000;
    try {
      const parsedDate = new Date(`${booking.date} ${booking.timeSlot}`);
      if (!isNaN(parsedDate.getTime())) {
        scheduledAt = parsedDate.getTime();
      }
    } catch {}

    // Map sessionType to valid lesson union
    const validSessionType: "1-to-1" | "small-group" | "trial" | "mentoring" | "exam-prep" | "project-help" =
      booking.sessionType === "small-group" ? "small-group" :
      booking.sessionType === "trial" ? "trial" :
      booking.sessionType === "mentoring" ? "mentoring" :
      booking.sessionType === "exam-prep" ? "exam-prep" :
      booking.sessionType === "project-help" ? "project-help" :
      "1-to-1";

    // Create lesson entry
    const lessonId = await ctx.db.insert("lessons", {
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

    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
      lessonId: lessonId as string,
    });

    // Notify student
    try {
      await ctx.db.insert("notifications", {
        userId: booking.userId,
        type: "booking_confirmed",
        title: "Lesson Confirmed!",
        message: `${booking.teacherName} has confirmed your ${booking.subject} session for ${booking.date} at ${booking.timeSlot}.`,
        read: false,
        actionUrl: `/classroom?sessionId=${lessonId}`,
        createdAt: Date.now(),
      });
    } catch {}

    return { success: true, lessonId };
  },
});

// ─── Cancel booking ───────────────────────────────────
export const cancel = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    // Only the booker or teacher can cancel
    if (booking.userId !== (userId as string) && booking.teacherId !== (userId as string)) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.bookingId, { status: "cancelled" });

    // Cancel related lesson if exists
    if (booking.lessonId) {
      try {
        await ctx.db.patch(booking.lessonId as any, { status: "cancelled" });
      } catch {}
    }

    const otherUserId = booking.userId === userId ? booking.teacherId : booking.userId;
    try {
      await ctx.db.insert("notifications", {
        userId: otherUserId,
        type: "booking_cancelled",
        title: "Booking Cancelled",
        message: `The lesson scheduled for ${booking.date} at ${booking.timeSlot} (${booking.subject}) has been cancelled.`,
        read: false,
        actionUrl: "/calendar",
        createdAt: Date.now(),
      });
    } catch {}

    return { success: true };
  },
});

// ─── Direct Confirm from Payment Webhook / IPN ────────
export const confirmBookingFromPayment = mutation({
  args: {
    bookingId: v.string(),
    transactionId: v.string(),
    paymentMethod: v.optional(v.string()),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let booking: any = null;
    try {
      booking = await ctx.db.get(args.bookingId as any);
    } catch (_) {}

    if (!booking) {
      booking = await ctx.db
        .query("bookings")
        .filter((q) =>
          q.or(
            q.eq(q.field("_id"), args.bookingId as any),
            q.eq(q.field("meetingCode"), args.bookingId),
          ),
        )
        .first();
    }

    if (!booking) {
      return { success: false, reason: "Booking not found" };
    }

    if (booking.status === "confirmed") {
      return { success: true, alreadyConfirmed: true, bookingId: String(booking._id), lessonId: booking.lessonId };
    }

    let scheduledAt = Date.now() + 24 * 60 * 60 * 1000;
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

    let lessonId = booking.lessonId;
    if (!lessonId) {
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
    }

    await ctx.db.patch(booking._id, {
      status: "confirmed",
      lessonId: lessonId,
    });

    const now = Date.now();
    try {
      await ctx.db.insert("notifications", {
        userId: booking.userId,
        type: "payment_success",
        title: "Tuition Confirmed via UddoktaPay",
        message: `Your booking for ${booking.subject} with ${booking.teacherName} on ${booking.date} is confirmed!`,
        read: false,
        actionUrl: `/classroom?sessionId=${lessonId}`,
        createdAt: now,
      });

      await ctx.db.insert("notifications", {
        userId: booking.teacherId,
        type: "booking_confirmed",
        title: "New Student Tuition Confirmed",
        message: `${booking.studentName} confirmed tuition for ${booking.subject} on ${booking.date} at ${booking.timeSlot}.`,
        read: false,
        actionUrl: "/teacher-dashboard",
        createdAt: now,
      });
    } catch {}

    return { success: true, bookingId: String(booking._id), lessonId };
  },
});

