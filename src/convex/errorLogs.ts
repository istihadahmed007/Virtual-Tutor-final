import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Log a frontend or client-side error to the Convex error logs table.
 */
export const logFrontendError = mutation({
  args: {
    message: v.string(),
    stack: v.optional(v.string()),
    componentStack: v.optional(v.string()),
    level: v.union(
      v.literal("error"),
      v.literal("warn"),
      v.literal("info"),
      v.literal("fatal"),
    ),
    category: v.optional(v.string()),
    route: v.optional(v.string()),
    url: v.optional(v.string()),
    userId: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userRole: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If not explicitly provided, try extracting authenticated user info from ctx
    let userId = args.userId;
    let userEmail = args.userEmail;
    let userRole = args.userRole;

    try {
      const authUserId = await getAuthUserId(ctx);
      if (authUserId) {
        const user = await ctx.db.get(authUserId);
        if (user) {
          if (!userId) userId = String(user._id);
          if (!userEmail && user.email) userEmail = user.email;
          if (!userRole && user.role) userRole = user.role;
        }
      }
    } catch {
      // Ignore auth resolution errors during error logging
    }

    // Sanitize error message to prevent overflow
    const cleanMessage = args.message.slice(0, 1500);
    const cleanStack = args.stack ? args.stack.slice(0, 4000) : undefined;
    const cleanCompStack = args.componentStack
      ? args.componentStack.slice(0, 4000)
      : undefined;
    const cleanContext = args.context ? args.context.slice(0, 5000) : undefined;

    const errorId = await ctx.db.insert("frontendErrors", {
      message: cleanMessage,
      stack: cleanStack,
      componentStack: cleanCompStack,
      level: args.level,
      category: args.category || "general",
      route: args.route || "/",
      url: args.url,
      userId,
      userEmail,
      userRole,
      userAgent: args.userAgent,
      context: cleanContext,
      timestamp: Date.now(),
      resolved: false,
    });

    return { success: true, errorId };
  },
});

/**
 * Get recent error logs with optional filtering.
 */
export const getErrorLogs = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
    level: v.optional(
      v.union(
        v.literal("error"),
        v.literal("warn"),
        v.literal("info"),
        v.literal("fatal"),
      ),
    ),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    let logs = await ctx.db
      .query("frontendErrors")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit * 2);

    if (args.category && args.category !== "all") {
      logs = logs.filter((l) => l.category === args.category);
    }

    if (args.level) {
      logs = logs.filter((l) => l.level === args.level);
    }

    if (args.search) {
      const q = args.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.route?.toLowerCase().includes(q) ||
          l.userEmail?.toLowerCase().includes(q) ||
          l.category?.toLowerCase().includes(q),
      );
    }

    return logs.slice(0, limit);
  },
});

/**
 * Get statistical overview of errors.
 */
export const getErrorStats = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db
      .query("frontendErrors")
      .withIndex("by_timestamp")
      .order("desc")
      .take(500);

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recent = logs.filter((l) => l.timestamp >= oneDayAgo);
    const authErrors = logs.filter((l) => l.category === "auth");
    const fatalErrors = logs.filter((l) => l.level === "fatal");
    const unresolved = logs.filter((l) => !l.resolved);

    const byCategory: Record<string, number> = {};
    for (const log of logs) {
      const cat = log.category || "general";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    return {
      total: logs.length,
      last24Hours: recent.length,
      authErrors: authErrors.length,
      fatalErrors: fatalErrors.length,
      unresolved: unresolved.length,
      byCategory,
    };
  },
});

/**
 * Mark an error as resolved.
 */
export const resolveErrorLog = mutation({
  args: {
    errorId: v.id("frontendErrors"),
    resolved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    await ctx.db.patch(args.errorId, {
      resolved: args.resolved,
      resolvedAt: args.resolved ? Date.now() : undefined,
      resolvedBy: authUserId ? String(authUserId) : undefined,
    });
    return { success: true };
  },
});

/**
 * Clear all resolved error logs or all error logs.
 */
export const clearErrorLogs = mutation({
  args: {
    onlyResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db.query("frontendErrors").collect();
    let deletedCount = 0;

    for (const log of logs) {
      if (!args.onlyResolved || log.resolved) {
        await ctx.db.delete(log._id);
        deletedCount++;
      }
    }

    return { success: true, deletedCount };
  },
});
