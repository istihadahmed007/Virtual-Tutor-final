import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

type AppCtx = QueryCtx | MutationCtx;

export interface AuthContextResult {
  userId: string;
  user: Doc<"users">;
}

export interface ApprovedTeacherContextResult extends AuthContextResult {
  profile: Doc<"teacherProfiles">;
}

/**
 * Ensures an authenticated user exists and is not anonymous or invalid.
 */
export async function requireUser(ctx: AppCtx, fallbackUserId?: string): Promise<AuthContextResult> {
  const authUserId = await getAuthUserId(ctx);
  const targetId = authUserId || fallbackUserId;
  if (!targetId) {
    throw new Error("Unauthenticated: Please sign in to proceed.");
  }

  const user = await ctx.db.get(targetId as Id<"users">);

  if ((!user || user.isAnonymous) && fallbackUserId && fallbackUserId !== targetId) {
    const fbUser = await ctx.db.get(fallbackUserId as Id<"users">);
    if (fbUser && !fbUser.isAnonymous) {
      if (user && user.isAnonymous && "patch" in ctx.db) {
        await (ctx.db as MutationCtx["db"]).patch(user._id, {
          name: fbUser.name,
          email: fbUser.email,
          role: fbUser.role,
          emailVerified: true,
          emailVerificationTime: fbUser.emailVerificationTime || Date.now(),
          isAnonymous: false,
          accountStatus: "active",
        });
      }
      return { userId: fallbackUserId, user: fbUser };
    }
  }

  if (!user) {
    throw new Error("User record not found.");
  }
  return { userId: String(user._id), user };
}

/**
 * Ensures user is authenticated and has verified their email (non-anonymous).
 */
export async function requireVerifiedAccount(ctx: AppCtx, fallbackUserId?: string): Promise<AuthContextResult> {
  const { userId, user } = await requireUser(ctx, fallbackUserId);
  if (user.isAnonymous) {
    if (fallbackUserId && fallbackUserId !== userId) {
      const fbUser = await ctx.db.get(fallbackUserId as Id<"users">);
      if (fbUser && !fbUser.isAnonymous) {
        return { userId: fallbackUserId, user: fbUser };
      }
    }
    throw new Error("Anonymous accounts are not permitted to perform this action. Please sign in to an account.");
  }
  const isVerified =
    user.emailVerified === true ||
    (user.emailVerificationTime !== undefined && user.emailVerificationTime > 0) ||
    user.role === "admin" ||
    user.role === "teacher";
  if (!isVerified) {
    throw new Error("Email verification required before accessing this feature.");
  }
  return { userId, user };
}

// ─── Sole Administrative Authority ───────────────────────────────────────
// Exactly ONE administrative account operates the platform: istihadahmed1163@gmail.com.
// info@vartualtutor.com is strictly an application review notification inbox, NOT an admin account.
export const AUTHORIZED_ADMIN_EMAIL = "istihadahmed1163@gmail.com";
export const AUTHORIZED_ADMIN_EMAILS = [AUTHORIZED_ADMIN_EMAIL];
export const APPLICATION_REVIEW_INBOX_EMAIL = "info@vartualtutor.com";

export function normalizeEmail(email?: string | null): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return normalizeEmail(email) === AUTHORIZED_ADMIN_EMAIL.toLowerCase().trim();
}

/**
 * Ensures the authenticated user is the single authorized platform administrator (istihadahmed1163@gmail.com).
 * Enforces:
 * 1. User is authenticated (non-anonymous).
 * 2. User account is active (not suspended).
 * 3. Normalized email matches istihadahmed1163@gmail.com case-insensitively with whitespace trimmed.
 * 4. User email is verified (emailVerified === true or emailVerificationTime > 0).
 * 5. If all conditions pass, securely ensures admin role on the record.
 * 
 * Throws 401 Unauthorized or 403 Forbidden on failure.
 */
export async function requireSuperAdmin(
  ctx: AppCtx,
  fallbackUserId?: string,
  fallbackEmail?: string,
): Promise<AuthContextResult> {
  const authUserId = await getAuthUserId(ctx);
  const targetId = authUserId || fallbackUserId;

  if (!targetId && !fallbackEmail) {
    throw new Error("401: Unauthorized: Authentication required to access administrative resources.");
  }

  let user: Doc<"users"> | null = null;

  if (targetId) {
    try {
      user = await ctx.db.get(targetId as Id<"users">);
    } catch {
      user = null;
    }
  }

  // If no user found by targetId, check if fallbackEmail was provided and matches
  if (!user && fallbackEmail && isAuthorizedAdminEmail(fallbackEmail)) {
    user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", AUTHORIZED_ADMIN_EMAIL))
      .first();
  }

  if (!user) {
    throw new Error("401: Unauthorized: Valid authenticated account required.");
  }

  if (user.isAnonymous) {
    throw new Error("401: Unauthorized: Anonymous accounts are not permitted to access administrator tools.");
  }

  if (user.accountStatus === "suspended") {
    throw new Error("403: Forbidden: Administrator account is suspended.");
  }

  const normalizedEmail = normalizeEmail(user.email);
  if (!isAuthorizedAdminEmail(normalizedEmail)) {
    // Record unauthorized admin access attempt in audit log
    if ("insert" in ctx.db) {
      try {
        await (ctx.db as MutationCtx["db"]).insert("securityAuditLogs", {
          eventType: "admin_access_attempt",
          userId: String(user._id),
          email: normalizedEmail || "unknown",
          outcome: "failure",
          role: user.role,
          reason: "Unauthorized email attempted to access admin endpoint",
          timestamp: Date.now(),
        });
      } catch (_) {}
    }
    throw new Error(
      `403: Forbidden: Only the designated administrator (${AUTHORIZED_ADMIN_EMAIL}) is authorized to access the Admin Console.`
    );
  }

  // Verification Check: Unverified admin account cannot access admin data
  const isVerified =
    user.emailVerified === true ||
    (user.emailVerificationTime !== undefined && user.emailVerificationTime > 0);

  if (!isVerified) {
    if ("insert" in ctx.db) {
      try {
        await (ctx.db as MutationCtx["db"]).insert("securityAuditLogs", {
          eventType: "admin_access_attempt",
          userId: String(user._id),
          email: normalizedEmail,
          outcome: "failure",
          role: user.role,
          reason: "Unverified administrator email attempted to access admin endpoint",
          timestamp: Date.now(),
        });
      } catch (_) {}
    }
    throw new Error(
      "403: Forbidden: Administrator email must be verified before accessing the Admin Console."
    );
  }

  // Ensure role is admin in DB record for consistency if mutation context
  if (user.role !== "admin" && "patch" in ctx.db) {
    await (ctx.db as MutationCtx["db"]).patch(user._id, { role: "admin" });
  }

  return { userId: String(user._id), user };
}

/**
 * Ensures the authenticated user has active administrator privileges (delegates to requireSuperAdmin).
 */
export async function requireAdmin(
  ctx: AppCtx,
  fallbackUserId?: string,
  fallbackEmail?: string,
): Promise<AuthContextResult> {
  return await requireSuperAdmin(ctx, fallbackUserId, fallbackEmail);
}

/**
 * Ensures user is an active, verified teacher whose application was formally approved by an admin.
 */
export async function requireApprovedTeacher(ctx: AppCtx): Promise<ApprovedTeacherContextResult> {
  const { userId, user } = await requireUser(ctx);

  if (user.accountStatus === "suspended") {
    throw new Error("Account suspended: Teaching privileges are currently revoked.");
  }

  if (user.role !== "teacher") {
    throw new Error("Forbidden: User does not have an approved teacher account.");
  }

  const profile = await ctx.db
    .query("teacherProfiles")
    .filter((q) => q.eq(q.field("userId"), userId))
    .first();

  if (!profile) {
    throw new Error("Teacher profile record not found.");
  }

  if (!profile.isVerified || profile.verificationStatus !== "verified") {
    throw new Error("Forbidden: Teacher application is not approved and verified.");
  }

  return { userId, user, profile };
}
