import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Get reviews for a teacher ─────────────────────────
export const listByTeacher = query({
  args: { teacherId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reviews")
      .filter((q) => q.eq(q.field("teacherId"), args.teacherId))
      .collect();
  },
});

// ─── Check if user is eligible to review teacher ─────────────────────
export const canReview = query({
  args: { teacherId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { canReview: false, reason: "Please sign in to write a review" };
    if (userId as string === args.teacherId) {
      return { canReview: false, reason: "You cannot review your own profile" };
    }

    const existingReview = await ctx.db
      .query("reviews")
      .filter((q) =>
        q.and(
          q.eq(q.field("teacherId"), args.teacherId),
          q.eq(q.field("studentId"), userId as string),
        ),
      )
      .first();

    if (existingReview) {
      return { canReview: false, reason: "You have already reviewed this teacher", existingReview };
    }

    // Check for completed lesson or confirmed booking
    const completedLesson = await ctx.db
      .query("lessons")
      .withIndex("by_student", (q) => q.eq("studentId", userId as string))
      .filter((q) =>
        q.and(
          q.eq(q.field("teacherId"), args.teacherId),
          q.eq(q.field("status"), "completed"),
        ),
      )
      .first();

    const confirmedBooking = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .filter((q) =>
        q.and(
          q.eq(q.field("teacherId"), args.teacherId),
          q.or(
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "completed"),
          ),
        ),
      )
      .first();

    if (!completedLesson && !confirmedBooking) {
      return {
        canReview: false,
        reason: "You can leave a review after completing a lesson with this teacher",
      };
    }

    return { canReview: true };
  },
});

// ─── Create a review ───────────────────────────────────
export const create = mutation({
  args: {
    teacherId: v.string(),
    rating: v.number(),
    comment: v.string(),
    subject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Prevent teachers from reviewing themselves
    if (userId as string === args.teacherId) {
      throw new Error("Cannot review yourself");
    }

    // Prevent duplicate reviews - check if student already reviewed this teacher
    const existingReview = await ctx.db
      .query("reviews")
      .filter((q) =>
        q.and(
          q.eq(q.field("teacherId"), args.teacherId),
          q.eq(q.field("studentId"), userId as string),
        ),
      )
      .first();
    if (existingReview) {
      throw new Error("You have already reviewed this teacher");
    }

    // Validate completed lesson or booking relationship
    const completedLesson = await ctx.db
      .query("lessons")
      .withIndex("by_student", (q) => q.eq("studentId", userId as string))
      .filter((q) =>
        q.and(
          q.eq(q.field("teacherId"), args.teacherId),
          q.eq(q.field("status"), "completed"),
        ),
      )
      .first();

    const confirmedBooking = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .filter((q) =>
        q.and(
          q.eq(q.field("teacherId"), args.teacherId),
          q.or(
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "completed"),
          ),
        ),
      )
      .first();

    if (!completedLesson && !confirmedBooking) {
      throw new Error("Reviews can only be submitted after attending or booking a lesson with this teacher.");
    }

    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    if (args.comment.length < 5 || args.comment.length > 2000) {
      throw new Error("Review must be between 5 and 2000 characters");
    }

    // Verify the teacher exists and is verified
    const teacherProfile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.teacherId))
      .first();
    if (!teacherProfile) throw new Error("Teacher not found");

    await ctx.db.insert("reviews", {
      teacherId: args.teacherId,
      studentId: userId as string,
      studentName: user.name || "Student",
      rating: args.rating,
      comment: args.comment,
      subject: args.subject,
      createdAt: Date.now(),
    });

    // Update teacher's average rating
    const reviews = await ctx.db
      .query("reviews")
      .filter((q) => q.eq(q.field("teacherId"), args.teacherId))
      .collect();

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await ctx.db.patch(teacherProfile._id, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
    });

    return { success: true };
  },
});
