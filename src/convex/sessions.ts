import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── List upcoming sessions ────────────────────────────
export const listUpcoming = query({
  args: { subject: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    let sessions = await ctx.db
      .query("liveSessions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "scheduled"),
          q.gte(q.field("scheduledAt"), now),
        ),
      )
      .collect();

    if (args.subject) {
      sessions = sessions.filter((s) => s.subject === args.subject);
    }

    sessions.sort((a, b) => a.scheduledAt - b.scheduledAt);
    return sessions;
  },
});

// ─── Get sessions for a teacher ────────────────────────
export const listByTeacher = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("liveSessions")
      .filter((q) => q.eq(q.field("teacherId"), userId as string))
      .collect();
  },
});

// ─── Get sessions a student is enrolled in ─────────────
export const listByStudent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sessions = await ctx.db
      .query("liveSessions")
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    return sessions.filter((s) =>
      s.enrolledStudentIds.includes(userId as string),
    );
  },
});

// ─── Get session by ID ────────────────────────────────
export const get = query({
  args: { sessionId: v.id("liveSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// ─── Create a live session ────────────────────────────
export const create = mutation({
  args: {
    title: v.string(),
    subject: v.string(),
    description: v.optional(v.string()),
    scheduledAt: v.number(),
    durationMinutes: v.number(),
    maxStudents: v.number(),
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

    const profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (!profile) throw new Error("Teacher profile not found");

    const meetingCode = `LC-${Date.now().toString(36).toUpperCase()}`;

    await ctx.db.insert("liveSessions", {
      teacherId: profile.userId,
      teacherName: profile.name,
      title: args.title,
      subject: args.subject,
      description: args.description,
      scheduledAt: args.scheduledAt,
      durationMinutes: args.durationMinutes,
      maxStudents: args.maxStudents,
      enrolledCount: 0,
      enrolledStudentIds: [],
      status: "scheduled",
      meetingCode,
      sessionType: args.sessionType,
      price: args.price,
    });

    return { success: true, meetingCode };
  },
});

// ─── Enroll in a session ──────────────────────────────
export const enroll = mutation({
  args: { sessionId: v.id("liveSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.status !== "scheduled") throw new Error("Session is not available");
    if (session.enrolledCount >= session.maxStudents) throw new Error("Session is full");
    if (session.enrolledStudentIds.includes(userId as string)) {
      throw new Error("Already enrolled");
    }

    await ctx.db.patch(args.sessionId, {
      enrolledCount: session.enrolledCount + 1,
      enrolledStudentIds: [...session.enrolledStudentIds, userId as string],
    });

    return { success: true };
  },
});

// ─── Cancel session (teacher only) ─────────────────────
export const cancel = mutation({
  args: { sessionId: v.id("liveSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.teacherId !== (userId as string)) throw new Error("Not authorized");

    await ctx.db.patch(args.sessionId, { status: "cancelled" });
    return { success: true };
  },
});

// ─── Verify access to classroom ────────────────────────
export const verifyAccess = query({
  args: { sessionId: v.id("liveSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { allowed: false, reason: "Not authenticated" };

    const session = await ctx.db.get(args.sessionId);
    if (!session) return { allowed: false, reason: "Session not found" };

    const isTeacher = session.teacherId === (userId as string);
    const isStudent = session.enrolledStudentIds.includes(userId as string);

    if (!isTeacher && !isStudent) {
      return { allowed: false, reason: "Not authorized for this session" };
    }

    return {
      allowed: true,
      role: isTeacher ? "teacher" : "student",
      session,
    };
  },
});
