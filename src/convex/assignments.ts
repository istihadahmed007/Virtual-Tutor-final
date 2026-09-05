import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listMyAssignments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];

    if (user.role === "teacher") {
      return await ctx.db
        .query("assignments")
        .withIndex("by_teacher", (q) => q.eq("teacherId", userId as string))
        .collect();
    }

    return await ctx.db
      .query("assignments")
      .withIndex("by_student", (q) => q.eq("studentId", userId as string))
      .collect();
  },
});

export const listByStudent = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    // Students see own assignments; teachers see their students'; admins see all
    if (user.role !== "admin" && userId as string !== args.studentId) {
      const isTeacherOf = await ctx.db.query("lessons").filter((q) =>
        q.and(q.eq(q.field("teacherId"), userId as string), q.eq(q.field("studentId"), args.studentId))
      ).first();
      if (!isTeacherOf) throw new Error("Not authorized");
    }
    return await ctx.db
      .query("assignments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
  },
});

export const listByTeacher = query({
  args: { teacherId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "admin" && userId as string !== args.teacherId) {
      throw new Error("Not authorized");
    }
    return await ctx.db
      .query("assignments")
      .withIndex("by_teacher", (q) => q.eq("teacherId", args.teacherId))
      .collect();
  },
});

export const getPending = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const all = await ctx.db
      .query("assignments")
      .withIndex("by_student", (q) => q.eq("studentId", userId as string))
      .collect();
    return all.filter((a) => a.status === "assigned" || a.status === "in_progress");
  },
});

export const create = mutation({
  args: {
    teacherId: v.string(),
    teacherName: v.string(),
    studentId: v.string(),
    studentName: v.string(),
    lessonId: v.optional(v.string()),
    subject: v.string(),
    title: v.string(),
    description: v.string(),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    // Only teachers and admins can create assignments
    const user = await ctx.db.get(userId);
    if (user?.role !== "teacher" && user?.role !== "admin") {
      throw new Error("Only teachers can create assignments");
    }
    if (args.title.length < 1 || args.title.length > 200) {
      throw new Error("Title must be 1-200 characters");
    }
    if (args.description.length > 5000) {
      throw new Error("Description must be under 5000 characters");
    }
    if (args.dueDate < Date.now()) {
      throw new Error("Due date cannot be in the past");
    }
    // Resolve names server-side
    const teacherProfile = await ctx.db.query("teacherProfiles").filter((q) => q.eq(q.field("userId"), args.teacherId)).first();
    const studentDoc = await ctx.db.get(args.studentId as any);
    if (!teacherProfile) throw new Error("Teacher not found");
    if (!studentDoc) throw new Error("Student not found");
    const studentName = 'name' in studentDoc ? (studentDoc.name || "Student") : "Student";
    return await ctx.db.insert("assignments", {
      teacherId: args.teacherId,
      teacherName: teacherProfile.name,
      studentId: args.studentId,
      studentName,
      lessonId: args.lessonId,
      subject: args.subject,
      title: args.title,
      description: args.description,
      dueDate: args.dueDate,
      status: "assigned",
      createdAt: Date.now(),
    });
  },
});

export const submit = mutation({
  args: {
    assignmentId: v.id("assignments"),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");
    // Only the assigned student can submit
    if (assignment.studentId !== (userId as string)) {
      throw new Error("Only the assigned student can submit");
    }
    // Only allow submission from assigned or in_progress states
    if (assignment.status !== "assigned" && assignment.status !== "in_progress") {
      throw new Error(`Cannot submit assignment in '${assignment.status}' status`);
    }
    await ctx.db.patch(args.assignmentId, {
      status: "submitted",
      attachments: args.attachments,
    });
  },
});

export const grade = mutation({
  args: {
    assignmentId: v.id("assignments"),
    grade: v.string(),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");
    // Only the teacher who assigned or admin can grade
    if (user?.role !== "admin" && assignment.teacherId !== (userId as string)) {
      throw new Error("Only the teacher can grade assignments");
    }
    if (assignment.status !== "submitted") {
      throw new Error(`Cannot grade assignment in '${assignment.status}' status`);
    }
    if (args.grade.length < 1 || args.grade.length > 50) {
      throw new Error("Grade must be 1-50 characters");
    }
    if (args.feedback.length > 5000) {
      throw new Error("Feedback must be under 5000 characters");
    }
    await ctx.db.patch(args.assignmentId, {
      status: "graded",
      grade: args.grade,
      feedback: args.feedback,
    });
  },
});
