import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("learningProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();
  },
});

export const upsert = mutation({
  args: {
    totalHoursLearned: v.number(),
    classesCompleted: v.number(),
    subjectsStudied: v.array(v.string()),
    streakDays: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("learningProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        lastActiveDate: Date.now(),
      });
    } else {
      await ctx.db.insert("learningProgress", {
        userId: userId as string,
        ...args,
        lastActiveDate: Date.now(),
      });
    }
  },
});

export const getSubjectBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_student", (q) => q.eq("studentId", userId as string))
      .collect();
    const completed = lessons.filter((l) => l.status === "completed");

    const subjectMap = new Map<string, { count: number; hours: number }>();
    for (const l of completed) {
      const existing = subjectMap.get(l.subject) || { count: 0, hours: 0 };
      existing.count += 1;
      existing.hours += l.durationMinutes / 60;
      subjectMap.set(l.subject, existing);
    }

    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      lessonsCompleted: data.count,
      hoursLearned: Math.round(data.hours * 10) / 10,
    }));
  },
});
