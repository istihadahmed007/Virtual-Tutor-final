import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const now = Date.now();
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_scheduled", (q) => q.gte("scheduledAt", now))
      .collect();
    return lessons.filter(
      (l) => l.studentId === (userId as string) || l.teacherId === (userId as string),
    );
  },
});

export const listByStudent = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    // Students can only see their own lessons; teachers/admins can see any
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "admin" && userId as string !== args.studentId) {
      // Check if caller is a teacher
      const isTeacher = await ctx.db.query("teacherProfiles").filter((q) => q.eq(q.field("userId"), userId as string)).first();
      if (!isTeacher) throw new Error("Not authorized");
    }
    return await ctx.db
      .query("lessons")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
  },
});

export const listByTeacher = query({
  args: { teacherId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    // Teachers can only see their own lessons; students can see their teachers'; admins can see all
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "admin" && userId as string !== args.teacherId) {
      // Check if the caller is a student enrolled in any of these lessons
      const callerLessons = await ctx.db.query("lessons").withIndex("by_student", (q) => q.eq("studentId", userId as string)).collect();
      const isStudentOf = callerLessons.some((l) => l.teacherId === args.teacherId);
      if (!isStudentOf) throw new Error("Not authorized");
    }
    return await ctx.db
      .query("lessons")
      .withIndex("by_teacher", (q) => q.eq("teacherId", args.teacherId))
      .collect();
  },
});

export const listByDateRange = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const all = await ctx.db
      .query("lessons")
      .withIndex("by_scheduled", (q) =>
        q.gte("scheduledAt", args.startDate).lte("scheduledAt", args.endDate),
      )
      .collect();
    return all.filter(
      (l) => l.studentId === (userId as string) || l.teacherId === (userId as string),
    );
  },
});

export const get = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) return null;
    // Only the teacher, student, or admin can view
    const user = await ctx.db.get(userId);
    if (user?.role === "admin") return lesson;
    if (lesson.teacherId === (userId as string) || lesson.studentId === (userId as string)) return lesson;
    throw new Error("Not authorized");
  },
});

export const create = mutation({
  args: {
    teacherId: v.string(),
    teacherName: v.string(),
    studentId: v.string(),
    studentName: v.string(),
    subject: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledAt: v.number(),
    durationMinutes: v.number(),
    sessionType: v.union(
      v.literal("1-to-1"),
      v.literal("small-group"),
      v.literal("trial"),
      v.literal("mentoring"),
      v.literal("exam-prep"),
      v.literal("project-help"),
    ),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    // Only a teacher can create lessons for students, or students can self-book
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const isTeacher = user.role === "teacher" || user.role === "admin";
    if (!isTeacher && userId as string !== args.studentId) {
      throw new Error("Not authorized");
    }
    // Validate price is non-negative
    if (args.price < 0) throw new Error("Price cannot be negative");
    if (args.durationMinutes < 15 || args.durationMinutes > 300) {
      throw new Error("Duration must be between 15 and 300 minutes");
    }
    if (args.scheduledAt < Date.now()) {
      throw new Error("Cannot schedule a lesson in the past");
    }
    // Use server-resolved names instead of client-supplied
    const teacherProfile = await ctx.db.query("teacherProfiles").filter((q) => q.eq(q.field("userId"), args.teacherId)).first();
    const studentDoc = await ctx.db.get(args.studentId as any);
    if (!teacherProfile) throw new Error("Teacher not found");
    if (!studentDoc) throw new Error("Student not found");
    const studentName = 'name' in studentDoc ? (studentDoc.name || "Student") : "Student";
    return await ctx.db.insert("lessons", {
      teacherId: args.teacherId,
      teacherName: teacherProfile.name,
      studentId: args.studentId,
      studentName,
      subject: args.subject,
      title: args.title,
      description: args.description,
      scheduledAt: args.scheduledAt,
      durationMinutes: args.durationMinutes,
      sessionType: args.sessionType,
      price: args.price,
      status: "scheduled",
    });
  },
});

const VALID_LESSON_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const updateStatus = mutation({
  args: {
    lessonId: v.id("lessons"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) throw new Error("Lesson not found");
    // Only the teacher or admin can update status
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin" && lesson.teacherId !== (userId as string)) {
      throw new Error("Not authorized");
    }
    // Enforce valid state transitions
    const allowed = VALID_LESSON_TRANSITIONS[lesson.status];
    if (!allowed || !allowed.includes(args.status)) {
      throw new Error(`Cannot transition from '${lesson.status}' to '${args.status}'`);
    }
    await ctx.db.patch(args.lessonId, { status: args.status });
  },
});

export const addFeedback = mutation({
  args: {
    lessonId: v.id("lessons"),
    feedback: v.string(),
    homework: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) throw new Error("Lesson not found");
    // Only the teacher of this lesson can add feedback
    if (lesson.teacherId !== (userId as string)) {
      throw new Error("Only the teacher can add feedback");
    }
    const updates: { teacherFeedback: string; homework?: string; studentRating?: number } = { teacherFeedback: args.feedback };
    if (args.homework) updates.homework = args.homework;
    if (args.rating !== undefined) {
      if (args.rating < 1 || args.rating > 5) throw new Error("Rating must be between 1 and 5");
      updates.studentRating = args.rating;
    }
    await ctx.db.patch(args.lessonId, updates);
  },
});
