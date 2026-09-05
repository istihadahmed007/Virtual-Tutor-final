import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, normalizeEmail } from "./authHelpers";
import { MutationCtx } from "./_generated/server";

export async function writeSecurityAudit(
  ctx: { db: MutationCtx["db"] },
  data: {
    eventType:
      | "login_success"
      | "login_failure"
      | "role_change"
      | "admin_access_attempt"
      | "password_reset_request"
      | "password_reset_success"
      | "registration"
      | "logout";
    userId?: string;
    email: string;
    outcome: "success" | "failure";
    role?: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: string;
  }
) {
  try {
    await ctx.db.insert("securityAuditLogs", {
      ...data,
      email: normalizeEmail(data.email),
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("[SecurityAudit] Failed to record security log:", err);
  }
}

// ─── Public Mutation for UI & Handshake Client Logging ────────────────────────
export const recordSecurityEvent = mutation({
  args: {
    eventType: v.union(
      v.literal("login_success"),
      v.literal("login_failure"),
      v.literal("role_change"),
      v.literal("admin_access_attempt"),
      v.literal("password_reset_request"),
      v.literal("password_reset_success"),
      v.literal("registration"),
      v.literal("logout"),
    ),
    userId: v.optional(v.string()),
    email: v.string(),
    outcome: v.union(v.literal("success"), v.literal("failure")),
    role: v.optional(v.string()),
    reason: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await writeSecurityAudit(ctx, args);
    return { recorded: true };
  },
});

// ─── Internal Mutation for Server Actions ─────────────────────────────────────
export const internalRecordSecurityEvent = internalMutation({
  args: {
    eventType: v.union(
      v.literal("login_success"),
      v.literal("login_failure"),
      v.literal("role_change"),
      v.literal("admin_access_attempt"),
      v.literal("password_reset_request"),
      v.literal("password_reset_success"),
      v.literal("registration"),
      v.literal("logout"),
    ),
    userId: v.optional(v.string()),
    email: v.string(),
    outcome: v.union(v.literal("success"), v.literal("failure")),
    role: v.optional(v.string()),
    reason: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await writeSecurityAudit(ctx, args);
    return { recorded: true };
  },
});

// ─── Admin Query: Retrieve Security Audit Trail ──────────────────────────────
export const getSecurityAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    eventType: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Strictly requires authenticated, verified istihadahmed1163@gmail.com
    await requireAdmin(ctx);

    const limit = args.limit || 100;
    let logs = await ctx.db
      .query("securityAuditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    if (args.eventType) {
      logs = logs.filter((l) => l.eventType === args.eventType);
    }
    if (args.email) {
      const filterEmail = normalizeEmail(args.email);
      logs = logs.filter((l) => l.email === filterEmail);
    }

    return logs;
  },
});
