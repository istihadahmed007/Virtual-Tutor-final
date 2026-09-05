import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  requireSuperAdmin,
  requireAdmin,
  requireUser,
  isAuthorizedAdminEmail,
  AUTHORIZED_ADMIN_EMAIL,
  normalizeEmail,
} from "./authHelpers";

// ─── Admin Check: Non-throwing verification for UI route protection ─────────
export const checkIsAdmin = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) {
      return { isAdmin: false, reason: "unauthenticated" };
    }

    const user = await ctx.db.get(authUserId as Id<"users">);
    if (!user || (user as any).isAnonymous) {
      return { isAdmin: false, reason: "unauthenticated" };
    }

    if (user.accountStatus === "suspended") {
      return { isAdmin: false, reason: "suspended" };
    }

    const normalizedEmail = user.email ? user.email.toLowerCase().trim() : "";
    if (!isAuthorizedAdminEmail(normalizedEmail)) {
      return {
        isAdmin: false,
        email: user.email,
        name: user.name,
        reason: "unauthorized_email",
      };
    }

    const isVerified =
      user.emailVerified === true ||
      (user.emailVerificationTime !== undefined && user.emailVerificationTime > 0);

    if (!isVerified) {
      return {
        isAdmin: false,
        email: user.email,
        name: user.name,
        reason: "unverified_email",
      };
    }

    return {
      isAdmin: true,
      email: normalizedEmail,
      name: user.name || "Platform Administrator",
      reason: "authorized",
    };
  },
});

// ─── Admin: Get authoritative system & platform statistics ───────────────────
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    // Strictly requires authenticated, verified istihadahmed1163@gmail.com
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const teachers = await ctx.db.query("teacherProfiles").collect();
    const students = await ctx.db.query("studentProfiles").collect();
    const lessons = await ctx.db.query("lessons").collect();
    const liveSessions = await ctx.db.query("liveSessions").collect();
    const bookings = await ctx.db.query("bookings").collect();
    const reviews = await ctx.db.query("reviews").collect();
    const posts = await ctx.db.query("communityPosts").collect();
    const vLogs = await ctx.db.query("verificationLogs").collect();
    const aLogs = await ctx.db.query("adminAuditLogs").collect();
    const reports = await ctx.db.query("moderationReports").collect();

    const verifiedTeachers = teachers.filter((t) => t.isVerified && t.verificationStatus === "verified");
    const underReviewTeachers = teachers.filter((t) => t.verificationStatus === "under_review");
    const needsAttentionTeachers = teachers.filter((t) => t.verificationStatus === "needs_attention");
    const rejectedTeachers = teachers.filter((t) => t.verificationStatus === "rejected");
    const suspendedUsers = users.filter((u) => u.accountStatus === "suspended");
    const suspendedTeachers = users.filter((u) => u.role === "teacher" && u.accountStatus === "suspended");

    const upcomingLessons = lessons.filter((l) => l.status === "scheduled" || l.status === "in_progress");
    const completedLessons = lessons.filter((l) => l.status === "completed");
    const pendingReports = reports.filter((r) => r.status === "pending" || r.status === "investigating");

    return {
      totalUsers: users.length,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      verifiedTeachers: verifiedTeachers.length,
      underReviewApplications: underReviewTeachers.length,
      needsAttentionApplications: needsAttentionTeachers.length,
      rejectedApplications: rejectedTeachers.length,
      suspendedUsers: suspendedUsers.length,
      suspendedTeachers: suspendedTeachers.length,
      totalLessons: lessons.length,
      upcomingLessons: upcomingLessons.length,
      completedLessons: completedLessons.length,
      totalLiveSessions: liveSessions.length,
      totalBookings: bookings.length,
      totalReviews: reviews.length,
      totalCommunityPosts: posts.length,
      totalReports: reports.length,
      pendingReports: pendingReports.length,
      totalAuditLogs: vLogs.length + aLogs.length,
    };
  },
});

// ─── Admin: List teacher applications with search and filters ─────────────────
export const listApplications = query({
  args: {
    status: v.optional(v.string()), // "all", "submitted", "under_review", "needs_resubmission", "needs_attention", "approved", "verified", "rejected", "suspended"
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const profiles = await ctx.db.query("teacherProfiles").collect();
    const users = await ctx.db.query("users").collect();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const logs = await ctx.db.query("verificationLogs").collect();
    const logsMap = new Map<string, typeof logs>();
    for (const log of logs) {
      const existing = logsMap.get(log.teacherId) || [];
      existing.push(log);
      logsMap.set(log.teacherId, existing);
    }

    let results = profiles.map((p) => {
      const user = userMap.get(p.userId);
      const teacherLogs = (logsMap.get(p.userId) || []).sort(
        (a, b) => b.timestamp - a.timestamp,
      );
      return {
        ...p,
        userEmail: user?.email || "",
        userName: user?.name || p.name,
        userAccountStatus: user?.accountStatus || "active",
        userRole: user?.role || "student",
        isEmailVerified: user?.emailVerified ?? true,
        userCreatedAt: user?._creationTime,
        lastLoginAt: user?.lastLoginAt,
        auditLogs: teacherLogs,
        latestLog: teacherLogs[0] || null,
      };
    });

    // Filter by status
    if (args.status && args.status !== "all") {
      const target = args.status.toLowerCase();
      if (target === "suspended") {
        results = results.filter((r) => r.userAccountStatus === "suspended");
      } else if (target === "approved" || target === "verified") {
        results = results.filter((r) => r.verificationStatus === "verified" || r.isVerified);
      } else if (target === "needs_resubmission" || target === "needs_attention") {
        results = results.filter((r) => r.verificationStatus === "needs_attention");
      } else if (target === "submitted" || target === "under_review") {
        results = results.filter((r) => r.verificationStatus === "under_review");
      } else {
        results = results.filter((r) => r.verificationStatus === target);
      }
    }

    // Filter by search query
    if (args.searchQuery && args.searchQuery.trim().length > 0) {
      const q = args.searchQuery.toLowerCase().trim();
      results = results.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.userEmail.toLowerCase().includes(q) ||
          r.userId.toLowerCase().includes(q) ||
          (r.country && r.country.toLowerCase().includes(q)) ||
          r.subjects.some((s) => s.toLowerCase().includes(q)),
      );
    }

    // Sort by review priority: under_review first, then recent submission
    results.sort((a, b) => {
      if (a.verificationStatus === "under_review" && b.verificationStatus !== "under_review") return -1;
      if (b.verificationStatus === "under_review" && a.verificationStatus !== "under_review") return 1;
      return (b.nidSubmittedAt || b._creationTime) - (a.nidSubmittedAt || a._creationTime);
    });

    return results;
  },
});

// ─── Admin: Get complete teacher application details (including NID) ──────────
export const getTeacherDetail = query({
  args: { teacherId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.teacherId))
      .first();

    if (!profile) return null;

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.teacherId as any))
      .first();

    const vLogs = await ctx.db
      .query("verificationLogs")
      .filter((q) => q.eq(q.field("teacherId"), args.teacherId))
      .collect();

    const aLogs = await ctx.db
      .query("adminAuditLogs")
      .filter((q) => q.and(q.eq(q.field("entityType"), "teacher_application"), q.eq(q.field("entityId"), args.teacherId)))
      .collect();

    const allLogs = [
      ...vLogs.map((l) => ({
        id: l._id,
        action: l.action,
        reason: l.reason,
        adminId: l.adminId,
        timestamp: l.timestamp,
        type: "verification" as const,
      })),
      ...aLogs.map((l) => ({
        id: l._id,
        action: l.action,
        reason: l.reason,
        adminId: l.adminId,
        timestamp: l.timestamp,
        type: "audit" as const,
      })),
    ].sort((a, b) => b.timestamp - a.timestamp);

    return {
      profile,
      user,
      auditLogs: allLogs,
    };
  },
});

// ─── Admin: Approve Teacher Application (Confirm Application) ────────────────
export const approveTeacherApplication = mutation({
  args: {
    teacherId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId, user: adminUser } = await requireAdmin(ctx);

    const profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.teacherId))
      .first();
    if (!profile) throw new Error("Teacher profile record not found.");

    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.teacherId as any))
      .first();
    if (!targetUser) throw new Error("User record not found.");

    // Check if already approved to prevent double mutation side-effects
    if (profile.verificationStatus === "verified" && profile.isVerified && targetUser.role === "teacher") {
      return { success: true, message: "Teacher application was already approved and verified." };
    }

    const previousState = profile.verificationStatus;
    const approvalReason = args.reason?.trim() || "Teacher credentials and identity documents verified successfully.";

    // Atomically transition state:
    // 1. Mark profile verified
    // 2. Keep availability false until teacher explicitly configures their schedule
    // 3. Update user role to "teacher" and status to "active"
    // 4. Record verification log and admin audit log
    await ctx.db.patch(profile._id, {
      verificationStatus: "verified",
      isVerified: true,
      isAvailable: false,
      rejectionReason: undefined,
      nidVerified: true,
      nidReviewedAt: Date.now(),
      nidReviewedBy: adminId,
    });

    await ctx.db.patch(targetUser._id, {
      role: "teacher",
      accountStatus: "active",
    });

    // Verification log
    await ctx.db.insert("verificationLogs", {
      teacherId: args.teacherId,
      adminId,
      action: "approved",
      reason: approvalReason,
      timestamp: Date.now(),
    });

    // Comprehensive Admin Audit log
    await ctx.db.insert("adminAuditLogs", {
      adminId,
      adminName: adminUser.name || "Administrator",
      adminEmail: adminUser.email,
      action: "approve_teacher_application",
      entityType: "teacher_application",
      entityId: args.teacherId,
      previousState,
      newState: "verified",
      reason: approvalReason,
      timestamp: Date.now(),
    });

    // Direct in-app notification for the applicant
    await ctx.db.insert("notifications", {
      userId: args.teacherId,
      title: "Teacher Application Approved!",
      message: "Congratulations! Your teacher application has been verified and approved. You can now access your teacher dashboard.",
      type: "system",
      read: false,
      createdAt: Date.now(),
      actionUrl: "/teacher-dashboard",
    });

    return { success: true, verificationStatus: "verified" };
  },
});

// Alias for backward compatibility
export const approveTeacher = approveTeacherApplication;

// ─── Admin: Reject Teacher Application ───────────────────────────────────────
export const rejectTeacherApplication = mutation({
  args: {
    teacherId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId, user: adminUser } = await requireAdmin(ctx);

    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error("A specific written reason is required when rejecting an application.");
    }

    const profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.teacherId))
      .first();
    if (!profile) throw new Error("Teacher profile record not found.");

    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.teacherId as any))
      .first();
    if (!targetUser) throw new Error("User record not found.");

    const previousState = profile.verificationStatus;
    const cleanReason = args.reason.trim();

    // Atomically transition state:
    // 1. Mark status rejected
    // 2. Revoke isVerified & isAvailable
    // 3. User remains student
    await ctx.db.patch(profile._id, {
      verificationStatus: "rejected",
      isVerified: false,
      isAvailable: false,
      rejectionReason: cleanReason,
    });

    await ctx.db.patch(targetUser._id, {
      role: "student",
    });

    await ctx.db.insert("verificationLogs", {
      teacherId: args.teacherId,
      adminId,
      action: "rejected",
      reason: cleanReason,
      timestamp: Date.now(),
    });

    await ctx.db.insert("adminAuditLogs", {
      adminId,
      adminName: adminUser.name || "Administrator",
      adminEmail: adminUser.email,
      action: "reject_teacher_application",
      entityType: "teacher_application",
      entityId: args.teacherId,
      previousState,
      newState: "rejected",
      reason: cleanReason,
      timestamp: Date.now(),
    });

    // Notify applicant
    await ctx.db.insert("notifications", {
      userId: args.teacherId,
      title: "Teacher Application Update",
      message: `Your application could not be approved at this time. Reason: ${cleanReason}`,
      type: "system",
      read: false,
      createdAt: Date.now(),
      actionUrl: "/teacher-application",
    });

    return { success: true, verificationStatus: "rejected" };
  },
});

// Alias for backward compatibility
export const rejectTeacher = rejectTeacherApplication;

// ─── Admin: Request Resubmission / Changes ───────────────────────────────────
export const requestTeacherChanges = mutation({
  args: {
    teacherId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId, user: adminUser } = await requireAdmin(ctx);

    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error("Please specify what corrections or documents are needed.");
    }

    const profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.teacherId))
      .first();
    if (!profile) throw new Error("Teacher profile record not found.");

    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.teacherId as any))
      .first();
    if (!targetUser) throw new Error("User record not found.");

    const previousState = profile.verificationStatus;
    const cleanReason = args.reason.trim();

    // Atomically transition state:
    // 1. Mark status needs_attention (resubmission required)
    // 2. Revoke isVerified & isAvailable
    // 3. User remains student
    await ctx.db.patch(profile._id, {
      verificationStatus: "needs_attention",
      isVerified: false,
      isAvailable: false,
      rejectionReason: cleanReason,
    });

    await ctx.db.patch(targetUser._id, {
      role: "student",
    });

    await ctx.db.insert("verificationLogs", {
      teacherId: args.teacherId,
      adminId,
      action: "resubmission_requested",
      reason: cleanReason,
      timestamp: Date.now(),
    });

    await ctx.db.insert("adminAuditLogs", {
      adminId,
      adminName: adminUser.name || "Administrator",
      adminEmail: adminUser.email,
      action: "request_teacher_resubmission",
      entityType: "teacher_application",
      entityId: args.teacherId,
      previousState,
      newState: "needs_attention",
      reason: cleanReason,
      timestamp: Date.now(),
    });

    // Notify applicant
    await ctx.db.insert("notifications", {
      userId: args.teacherId,
      title: "Action Required: Teacher Application",
      message: `Corrections requested on your teacher application: ${cleanReason}`,
      type: "system",
      read: false,
      createdAt: Date.now(),
      actionUrl: "/teacher-application",
    });

    return { success: true, verificationStatus: "needs_attention" };
  },
});

// Alias for backward compatibility
export const requestResubmission = requestTeacherChanges;

// ─── Admin: List All Users ───────────────────────────────────────────────────
export const listUsers = query({
  args: {
    role: v.optional(v.string()),
    status: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const teachers = await ctx.db.query("teacherProfiles").collect();
    const students = await ctx.db.query("studentProfiles").collect();

    const teacherMap = new Map(teachers.map((t) => [t.userId, t]));
    const studentMap = new Map(students.map((s) => [s.userId, s]));

    let results = users.map((u) => {
      const teacher = teacherMap.get(String(u._id));
      const student = studentMap.get(String(u._id));
      return {
        _id: String(u._id),
        name: u.name || "Unnamed User",
        email: u.email || "No Email",
        role: u.role || "student",
        accountStatus: u.accountStatus || "active",
        emailVerified: u.emailVerified ?? false,
        createdAt: u._creationTime,
        lastLoginAt: u.lastLoginAt,
        country: u.country,
        avatarUrl: u.avatarUrl || u.image,
        isTeacherVerified: teacher?.isVerified || false,
        teacherVerificationStatus: teacher?.verificationStatus || "not_started",
        isStudentVerified: student?.verificationStatus === "verified",
        studentInstitution: student?.institution,
        studentClassLevel: student?.classLevel,
      };
    });

    // Filter by role
    if (args.role && args.role !== "all") {
      results = results.filter((u) => u.role === args.role);
    }

    // Filter by account status
    if (args.status && args.status !== "all") {
      results = results.filter((u) => u.accountStatus === args.status);
    }

    // Filter by search
    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.toLowerCase().trim();
      results = results.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u._id.toLowerCase().includes(q) ||
          (u.country && u.country.toLowerCase().includes(q)),
      );
    }

    // Sort newest first
    results.sort((a, b) => b.createdAt - a.createdAt);
    return results;
  },
});

// ─── Admin: List All Teachers ────────────────────────────────────────────────
export const listTeachers = query({
  args: {
    verificationStatus: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const teachers = await ctx.db.query("teacherProfiles").collect();
    const users = await ctx.db.query("users").collect();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    let results = teachers.map((t) => {
      const user = userMap.get(t.userId);
      return {
        ...t,
        userEmail: user?.email || "",
        userAccountStatus: user?.accountStatus || "active",
        userCreatedAt: user?._creationTime,
        lastLoginAt: user?.lastLoginAt,
      };
    });

    if (args.verificationStatus && args.verificationStatus !== "all") {
      results = results.filter((t) => t.verificationStatus === args.verificationStatus);
    }

    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.toLowerCase().trim();
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.userEmail.toLowerCase().includes(q) ||
          t.subjects.some((s) => s.toLowerCase().includes(q)),
      );
    }

    results.sort((a, b) => b.rating - a.rating || (b.totalStudents || 0) - (a.totalStudents || 0));
    return results;
  },
});

// ─── Admin: List All Students ────────────────────────────────────────────────
export const listStudents = query({
  args: {
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const students = await ctx.db.query("studentProfiles").collect();
    const users = await ctx.db.query("users").collect();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    let results = students.map((s) => {
      const user = userMap.get(s.userId);
      return {
        ...s,
        userEmail: user?.email || "",
        userAccountStatus: user?.accountStatus || "active",
        userCreatedAt: user?._creationTime,
        lastLoginAt: user?.lastLoginAt,
      };
    });

    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.toLowerCase().trim();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.userEmail.toLowerCase().includes(q) ||
          (s.institution && s.institution.toLowerCase().includes(q)) ||
          s.subjects.some((sub) => sub.toLowerCase().includes(q)),
      );
    }

    results.sort((a, b) => (b.userCreatedAt || 0) - (a.userCreatedAt || 0));
    return results;
  },
});

// ─── Admin: List All Bookings ────────────────────────────────────────────────
export const listBookings = query({
  args: {
    status: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const bookings = await ctx.db.query("bookings").collect();
    let results = bookings;

    if (args.status && args.status !== "all") {
      results = results.filter((b) => b.status === args.status);
    }

    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.toLowerCase().trim();
      results = results.filter(
        (b) =>
          b.teacherName.toLowerCase().includes(q) ||
          b.studentName.toLowerCase().includes(q) ||
          b.subject.toLowerCase().includes(q) ||
          b.date.includes(q),
      );
    }

    results.sort((a, b) => b.createdAt - a.createdAt);
    return results;
  },
});

// ─── Admin: List All Sessions / Lessons ──────────────────────────────────────
export const listSessions = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const lessons = await ctx.db.query("lessons").collect();
    const liveSessions = await ctx.db.query("liveSessions").collect();

    let combined = [
      ...lessons.map((l) => ({
        ...l,
        type: "one-on-one" as const,
      })),
      ...liveSessions.map((s) => ({
        ...s,
        studentName: `${s.enrolledCount}/${s.maxStudents} Students Enrolled`,
        studentId: "group",
        type: "group-live" as const,
      })),
    ];

    if (args.status && args.status !== "all") {
      combined = combined.filter((s) => s.status === args.status);
    }

    combined.sort((a, b) => b.scheduledAt - a.scheduledAt);
    return combined;
  },
});

// ─── Admin: List Reviews ─────────────────────────────────────────────────────
export const listReviews = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const reviews = await ctx.db.query("reviews").collect();
    const teachers = await ctx.db.query("teacherProfiles").collect();
    const teacherMap = new Map(teachers.map((t) => [t.userId, t.name]));

    const results = reviews.map((r) => ({
      ...r,
      teacherName: teacherMap.get(r.teacherId) || "Teacher",
    }));

    results.sort((a, b) => b.createdAt - a.createdAt);
    return results;
  },
});

// ─── Admin: Delete / Moderate Review ─────────────────────────────────────────
export const deleteReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId, user: adminUser } = await requireAdmin(ctx);

    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review record not found.");

    await ctx.db.delete(args.reviewId);

    // Record audit log
    await ctx.db.insert("adminAuditLogs", {
      adminId,
      adminName: adminUser.name || "Administrator",
      adminEmail: adminUser.email,
      action: "delete_review",
      entityType: "review",
      entityId: String(args.reviewId),
      reason: args.reason || "Violated review guidelines",
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// ─── Admin: List Community Posts & Moderate ──────────────────────────────────
export const listCommunityPosts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const posts = await ctx.db.query("communityPosts").collect();
    return posts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const deleteCommunityPost = mutation({
  args: {
    postId: v.id("communityPosts"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId, user: adminUser } = await requireAdmin(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found.");

    // Delete replies
    const replies = await ctx.db
      .query("communityReplies")
      .filter((q) => q.eq(q.field("postId"), String(args.postId)))
      .collect();

    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    await ctx.db.delete(args.postId);

    await ctx.db.insert("adminAuditLogs", {
      adminId,
      adminName: adminUser.name || "Administrator",
      adminEmail: adminUser.email,
      action: "delete_community_post",
      entityType: "community_post",
      entityId: String(args.postId),
      reason: args.reason || "Violated community guidelines",
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// ─── Admin: List Moderation Reports ──────────────────────────────────────────
export const listReports = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const reports = await ctx.db.query("moderationReports").collect();

    let results = reports;
    if (args.status && args.status !== "all") {
      results = results.filter((r) => r.status === args.status);
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ─── Admin: Resolve Moderation Report ────────────────────────────────────────
export const resolveReport = mutation({
  args: {
    reportId: v.id("moderationReports"),
    status: v.union(v.literal("resolved"), v.literal("dismissed"), v.literal("investigating")),
    resolutionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId, user: adminUser } = await requireAdmin(ctx);

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report record not found.");

    await ctx.db.patch(args.reportId, {
      status: args.status,
      resolvedBy: adminUser.name || adminId,
      resolutionNote: args.resolutionNote?.trim() || undefined,
      resolvedAt: Date.now(),
    });

    await ctx.db.insert("adminAuditLogs", {
      adminId,
      adminName: adminUser.name || "Administrator",
      adminEmail: adminUser.email,
      action: `report_${args.status}`,
      entityType: "moderation_report",
      entityId: String(args.reportId),
      reason: args.resolutionNote || `Report marked as ${args.status}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// ─── Create Moderation Report (User / Admin) ─────────────────────────────────
export const createReport = mutation({
  args: {
    reportedEntityType: v.union(
      v.literal("user"),
      v.literal("teacher"),
      v.literal("post"),
      v.literal("review"),
      v.literal("booking"),
      v.literal("technical"),
      v.literal("other"),
    ),
    reportedEntityId: v.string(),
    reportedEntityTitle: v.optional(v.string()),
    reason: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);

    const reportId = await ctx.db.insert("moderationReports", {
      reporterId: userId,
      reporterName: user.name || "Anonymous Reporter",
      reportedEntityType: args.reportedEntityType,
      reportedEntityId: args.reportedEntityId,
      reportedEntityTitle: args.reportedEntityTitle,
      reason: args.reason.trim(),
      details: args.details?.trim(),
      status: "pending",
      createdAt: Date.now(),
    });

    return { success: true, reportId };
  },
});

// ─── Admin: List All Audit Logs ──────────────────────────────────────────────
export const listAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const aLogs = await ctx.db.query("adminAuditLogs").collect();
    const vLogs = await ctx.db.query("verificationLogs").collect();

    const formattedVLogs = vLogs.map((vl) => ({
      _id: String(vl._id),
      adminId: vl.adminId,
      adminName: "Verification Admin",
      action: `teacher_verification_${vl.action}`,
      entityType: "teacher_application",
      entityId: vl.teacherId,
      reason: vl.reason,
      timestamp: vl.timestamp,
    }));

    const all = [...aLogs, ...formattedVLogs].sort((a, b) => b.timestamp - a.timestamp);
    if (args.limit) {
      return all.slice(0, args.limit);
    }
    return all;
  },
});

// ─── Admin: Suspend User ─────────────────────────────────────────────────────
export const suspendUser = mutation({
  args: {
    userId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId, user: adminUser } = await requireAdmin(ctx);

    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error("A reason must be provided when suspending an account.");
    }

    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.userId as any))
      .first();
    if (!targetUser) throw new Error("User record not found.");

    await ctx.db.patch(targetUser._id, {
      accountStatus: "suspended",
    });

    // If teacher, disable availability & active verification
    const teacherProfile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    if (teacherProfile) {
      await ctx.db.patch(teacherProfile._id, {
        isAvailable: false,
        isVerified: false,
      });
    }

    await ctx.db.insert("adminAuditLogs", {
      adminId,
      adminName: adminUser.name || "Administrator",
      adminEmail: adminUser.email,
      action: "suspend_user",
      entityType: "user",
      entityId: args.userId,
      reason: args.reason.trim(),
      timestamp: Date.now(),
    });

    // Notify user
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Account Suspended",
      message: `Your account has been suspended by administration. Reason: ${args.reason.trim()}`,
      type: "system",
      read: false,
      createdAt: Date.now(),
      actionUrl: "/auth",
    });

    return { success: true };
  },
});

// ─── Admin: Reactivate User ──────────────────────────────────────────────────
export const reactivateUser = mutation({
  args: {
    userId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId, user: adminUser } = await requireAdmin(ctx);

    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.userId as any))
      .first();
    if (!targetUser) throw new Error("User record not found.");

    const teacherProfile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    await ctx.db.patch(targetUser._id, {
      accountStatus: "active",
    });

    if (teacherProfile && teacherProfile.verificationStatus === "verified") {
      await ctx.db.patch(teacherProfile._id, {
        isVerified: true,
      });
    }

    await ctx.db.insert("adminAuditLogs", {
      adminId,
      adminName: adminUser.name || "Administrator",
      adminEmail: adminUser.email,
      action: "reactivate_user",
      entityType: "user",
      entityId: args.userId,
      reason: args.reason || "Reactivated by administration",
      timestamp: Date.now(),
    });

    // Notify user
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Account Reactivated",
      message: "Your account has been restored to active status.",
      type: "system",
      read: false,
      createdAt: Date.now(),
      actionUrl: "/dashboard",
    });

    return { success: true };
  },
});

// ─── Admin: Suspend Teacher ──────────────────────────────────────────────────
export const suspendTeacher = mutation({
  args: {
    teacherId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAdmin(ctx);

    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error("A reason must be provided when suspending a teacher account.");
    }

    const profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.teacherId))
      .first();

    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.teacherId as any))
      .first();
    if (!targetUser) throw new Error("User record not found.");

    await ctx.db.patch(targetUser._id, {
      accountStatus: "suspended",
    });

    if (profile) {
      await ctx.db.patch(profile._id, {
        isAvailable: false,
        isVerified: false,
      });
    }

    await ctx.db.insert("verificationLogs", {
      teacherId: args.teacherId,
      adminId,
      action: "account_suspended",
      reason: args.reason.trim(),
      timestamp: Date.now(),
    });

    // Notify user
    await ctx.db.insert("notifications", {
      userId: args.teacherId,
      title: "Account Suspended",
      message: `Your teaching account has been suspended by administration. Reason: ${args.reason.trim()}`,
      type: "system",
      read: false,
      createdAt: Date.now(),
      actionUrl: "/profile",
    });

    return { success: true };
  },
});

// ─── Admin: Reactivate Suspended Teacher ─────────────────────────────────────
export const reactivateTeacher = mutation({
  args: {
    teacherId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAdmin(ctx);

    const profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.teacherId))
      .first();

    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.teacherId as any))
      .first();
    if (!targetUser) throw new Error("User record not found.");

    await ctx.db.patch(targetUser._id, {
      accountStatus: "active",
      role: profile?.verificationStatus === "verified" ? "teacher" : targetUser.role,
    });

    if (profile && profile.verificationStatus === "verified") {
      await ctx.db.patch(profile._id, {
        isVerified: true,
      });
    }

    await ctx.db.insert("verificationLogs", {
      teacherId: args.teacherId,
      adminId,
      action: "account_reactivated",
      reason: args.reason || "Account reactivated by administrator.",
      timestamp: Date.now(),
    });

    // Notify user
    await ctx.db.insert("notifications", {
      userId: args.teacherId,
      title: "Account Reactivated",
      message: "Your teaching account has been reactivated. You can now access your teacher dashboard.",
      type: "system",
      read: false,
      createdAt: Date.now(),
      actionUrl: "/teacher-dashboard",
    });

    return { success: true };
  },
});

// ─── Admin: Fetch Audit Verification Logs ────────────────────────────────────
export const getVerificationLogs = query({
  args: { teacherId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const logs = await ctx.db
      .query("verificationLogs")
      .filter((q) => q.eq(q.field("teacherId"), args.teacherId))
      .collect();

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  },
});

// ─── Admin: Assign Admin Role ────────────────────────────────────────────────
export const makeAdmin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const normalizedTarget = args.email.toLowerCase().trim();
    if (!isAuthorizedAdminEmail(normalizedTarget)) {
      throw new Error(
        `Unauthorized: Only the designated administrator (${AUTHORIZED_ADMIN_EMAIL}) can be assigned administrator privileges.`
      );
    }

    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), normalizedTarget))
      .collect();
    if (users.length === 0) throw new Error("User not found.");

    await ctx.db.patch(users[0]._id, { role: "admin" });
    return { success: true };
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
