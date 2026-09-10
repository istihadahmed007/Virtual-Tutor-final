import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import {
  requireUser,
  requireVerifiedAccount,
  requireApprovedTeacher,
  AUTHORIZED_ADMIN_EMAIL,
} from "./authHelpers";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  TARGET_ADMIN_EMAILS,
  TARGET_ADMIN_EMAIL,
  APPLICATION_REVIEW_EMAIL,
  dispatchEmailViaProvider,
  buildTeacherApplicationEmailHtml,
} from "./emailService";

// ─── Profile Completion Calculation ──────────────────────────────────────────
export function calculateTeacherProfileCompletion(p: {
  name?: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
  avatarStorageId?: string;
  subjects?: string[];
  classLevels?: string[];
  expertise?: string[];
  languages?: string[];
  education?: Array<{ degree: string; institution: string }>;
  hourlyRate?: number;
  yearsExperience?: number;
  country?: string;
  timezone?: string;
  onlineTeachingExperience?: string;
  preferredPlatforms?: string[];
  classTypes?: string[];
  preferredClassDuration?: string;
  nidNumber?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
}): number {
  const checks = [
    Boolean(p.name && p.name.trim().length > 1),
    Boolean(p.title && p.title.trim().length > 2),
    Boolean(p.bio && p.bio.trim().length > 15),
    Boolean(p.avatarUrl || p.avatarStorageId), // Profile picture required for 100% completion
    Boolean(p.subjects && p.subjects.length > 0),
    Boolean(p.classLevels && p.classLevels.length > 0),
    Boolean(p.languages && p.languages.length > 0),
    Boolean(p.education && p.education.length > 0 && p.education[0].degree && p.education[0].institution),
    Boolean(p.hourlyRate && p.hourlyRate > 0),
    Boolean(p.yearsExperience !== undefined && p.yearsExperience >= 0),
    Boolean(p.country && p.country.trim().length > 1),
    Boolean(p.onlineTeachingExperience && p.onlineTeachingExperience.trim().length > 2),
    Boolean(p.preferredPlatforms && p.preferredPlatforms.length > 0),
    Boolean(p.classTypes && p.classTypes.length > 0),
    Boolean(p.preferredClassDuration && p.preferredClassDuration.trim().length > 1),
    Boolean(p.nidNumber && p.nidNumber.trim().length > 3),
    Boolean(p.nidFrontUrl && p.nidFrontUrl.trim().length > 5),
    Boolean(p.nidBackUrl && p.nidBackUrl.trim().length > 5),
  ];

  const completed = checks.filter(Boolean).length;
  return Math.min(100, Math.round((completed / checks.length) * 100));
}

// ─── Public Queries (Registered & Verified Active Teachers) ───────────────────
export const list = query({
  args: {},
  handler: async (ctx) => {
    // 1. Fetch all registered teacher profiles
    const profiles = await ctx.db
      .query("teacherProfiles")
      .collect();

    const seenUserIds = new Set<string>();
    const activeProfiles = [];

    for (const p of profiles) {
      const vStatus = (p.verificationStatus || "") as string;
      if (vStatus === "rejected" || vStatus === "suspended") {
        continue;
      }

      let isSuspended = false;
      try {
        const normId = ctx.db.normalizeId("users", p.userId);
        if (normId) {
          const user = await ctx.db.get(normId);
          if (user && user.accountStatus === "suspended") {
            isSuspended = true;
          }
        }
      } catch {
        // non-fatal
      }

      if (!isSuspended) {
        seenUserIds.add(p.userId);
        const {
          nidNumber,
          nidFrontUrl,
          nidBackUrl,
          nidReviewedBy,
          ...publicSafe
        } = p;
        activeProfiles.push({
          ...publicSafe,
          isAvailable: p.isAvailable !== false,
        });
      }
    }

    // 2. Cross-check users table for registered teachers
    const teacherUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "teacher"))
      .collect();

    for (const u of teacherUsers) {
      const uId = String(u._id);
      if (seenUserIds.has(uId) || u.accountStatus === "suspended") {
        continue;
      }
      seenUserIds.add(uId);
      activeProfiles.push({
        _id: u._id,
        userId: uId,
        name: u.name || "Educator",
        title: "Educator & Subject Specialist",
        bio: "Dedicated registered educator ready for live interactive lessons.",
        avatarUrl: u.image,
        country: "Bangladesh",
        timezone: u.timezone || "Asia/Dhaka",
        hourlyRate: 35,
        subjects: ["General Studies"],
        classLevels: ["All Levels"],
        expertise: ["Tutoring"],
        languages: ["English", "Bangla"],
        yearsExperience: 2,
        isVerified: Boolean(u.emailVerified),
        verificationStatus: u.emailVerified ? "verified" : "under_review",
        isAvailable: true,
        rating: 5.0,
        reviewCount: 0,
        totalStudents: 0,
        totalHours: 0,
        profileCompletionPct: 50,
      });
    }

    return activeProfiles;
  },
});

export const search = query({
  args: {
    subject: v.optional(v.string()),
    classLevel: v.optional(v.string()),
    availableOnly: v.optional(v.boolean()),
    classType: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
    sortBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rawProfiles = await ctx.db
      .query("teacherProfiles")
      .collect();

    const seenUserIds = new Set<string>();
    let safeProfiles: any[] = [];

    for (const p of rawProfiles) {
      const vStatus = (p.verificationStatus || "") as string;
      if (vStatus === "rejected" || vStatus === "suspended") {
        continue;
      }

      let isSuspended = false;
      try {
        const normId = ctx.db.normalizeId("users", p.userId);
        if (normId) {
          const user = await ctx.db.get(normId);
          if (user && user.accountStatus === "suspended") {
            isSuspended = true;
          }
        }
      } catch {
        // non-fatal
      }

      if (!isSuspended) {
        seenUserIds.add(p.userId);
        const {
          nidNumber,
          nidFrontUrl,
          nidBackUrl,
          nidReviewedBy,
          ...publicSafe
        } = p;
        safeProfiles.push({
          ...publicSafe,
          isAvailable: p.isAvailable !== false,
        });
      }
    }

    // Include registered teachers from users table
    const teacherUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "teacher"))
      .collect();

    for (const u of teacherUsers) {
      const uId = String(u._id);
      if (seenUserIds.has(uId) || u.accountStatus === "suspended") {
        continue;
      }
      seenUserIds.add(uId);
      safeProfiles.push({
        _id: u._id,
        userId: uId,
        name: u.name || "Educator",
        title: "Educator & Subject Specialist",
        bio: "Dedicated registered educator ready for live interactive lessons.",
        avatarUrl: u.image,
        country: "Bangladesh",
        timezone: u.timezone || "Asia/Dhaka",
        hourlyRate: 35,
        subjects: ["General Studies"],
        classLevels: ["All Levels"],
        expertise: ["Tutoring"],
        languages: ["English", "Bangla"],
        yearsExperience: 2,
        isVerified: Boolean(u.emailVerified),
        verificationStatus: u.emailVerified ? "verified" : "under_review",
        isAvailable: true,
        rating: 5.0,
        reviewCount: 0,
        totalStudents: 0,
        totalHours: 0,
        profileCompletionPct: 50,
      });
    }

    if (args.searchQuery) {
      const q = args.searchQuery.toLowerCase();
      safeProfiles = safeProfiles.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.bio?.toLowerCase().includes(q) ||
          p.subjects?.some((s: string) => s.toLowerCase().includes(q)) ||
          (p.country && p.country.toLowerCase().includes(q)),
      );
    }

    if (args.subject && args.subject !== "All Subjects") {
      safeProfiles = safeProfiles.filter((p) =>
        p.subjects?.some((s: string) => s.toLowerCase().includes(args.subject!.toLowerCase())),
      );
    }
    if (args.classLevel && args.classLevel !== "All Levels") {
      safeProfiles = safeProfiles.filter((p) =>
        p.classLevels?.some((c: string) => c.toLowerCase().includes(args.classLevel!.toLowerCase())),
      );
    }
    if (args.availableOnly) {
      safeProfiles = safeProfiles.filter((p) => p.isAvailable !== false);
    }
    if (args.classType) {
      safeProfiles = safeProfiles.filter((p) =>
        p.classTypes?.includes(args.classType!),
      );
    }

    switch (args.sortBy) {
      case "rating":
        safeProfiles.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "experience":
        safeProfiles.sort((a, b) => (b.yearsExperience || 0) - (a.yearsExperience || 0));
        break;
      case "price-low":
      case "price_low":
        safeProfiles.sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
        break;
      case "price-high":
      case "price_high":
        safeProfiles.sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0));
        break;
      case "reviews":
        safeProfiles.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
      default:
        safeProfiles.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return safeProfiles;
  },
});

export const get = query({
  args: { teacherId: v.string() },
  handler: async (ctx, args) => {
    let profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.teacherId))
      .first();

    if (!profile) {
      try {
        const normId = ctx.db.normalizeId("teacherProfiles", args.teacherId);
        if (normId) {
          profile = await ctx.db.get(normId);
        }
      } catch {
        // non-fatal
      }
    }

    if (!profile) {
      try {
        const normUserId = ctx.db.normalizeId("users", args.teacherId);
        if (normUserId) {
          const user = await ctx.db.get(normUserId);
          if (user && user.role === "teacher" && user.accountStatus !== "suspended") {
            return {
              _id: user._id,
              userId: String(user._id),
              name: user.name || "Educator",
              title: "Educator & Subject Specialist",
              bio: "Dedicated registered educator ready for live interactive lessons.",
              avatarUrl: user.image,
              country: "Bangladesh",
              timezone: user.timezone || "Asia/Dhaka",
              hourlyRate: 35,
              subjects: ["General Studies"],
              classLevels: ["All Levels"],
              expertise: ["Tutoring"],
              languages: ["English", "Bangla"],
              yearsExperience: 2,
              isVerified: Boolean(user.emailVerified),
              verificationStatus: user.emailVerified ? "verified" : "under_review",
              isAvailable: true,
              rating: 5.0,
              reviewCount: 0,
              totalStudents: 0,
              totalHours: 0,
              education: [],
            };
          }
        }
      } catch {
        // non-fatal
      }
      return null;
    }

    if ((profile.verificationStatus as string) === "suspended" || profile.verificationStatus === "rejected") {
      return null;
    }

    // Check if requester is admin or the teacher themselves to include NID
    const authUserId = await getAuthUserId(ctx);
    let isPrivileged = false;

    if (authUserId) {
      if (authUserId === args.teacherId || authUserId === profile.userId) {
        isPrivileged = true;
      } else {
        const caller = await ctx.db.get(authUserId);
        if (caller?.role === "admin") {
          isPrivileged = true;
        }
      }
    }

    if (!isPrivileged) {
      const {
        nidNumber,
        nidFrontUrl,
        nidBackUrl,
        nidReviewedBy,
        ...publicSafe
      } = profile;
      return {
        ...publicSafe,
        isAvailable: profile.isAvailable !== false,
      };
    }

    return profile;
  },
});

// ─── Applicant / Teacher Own Profile ─────────────────────────────────────────
export const getMyProfile = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId = await getAuthUserId(ctx);
    if (!userId && args.userId) {
      userId = args.userId as any;
    }
    if (!userId) return null;

    const profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) =>
        q.or(
          q.eq(q.field("userId"), userId as string),
          args.userId ? q.eq(q.field("userId"), args.userId) : false,
        ),
      )
      .first();

    return profile;
  },
});

// ─── Save Application Draft ──────────────────────────────────────────────────
export const saveDraft = mutation({
  args: {
    userId: v.optional(v.string()),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    subjects: v.optional(v.array(v.string())),
    classLevels: v.optional(v.array(v.string())),
    expertise: v.optional(v.array(v.string())),
    languages: v.optional(v.array(v.string())),
    education: v.optional(
      v.array(
        v.object({
          degree: v.string(),
          institution: v.string(),
          department: v.optional(v.string()),
          passingYear: v.optional(v.string()),
          result: v.optional(v.string()),
          certificateUrl: v.optional(v.string()),
        }),
      ),
    ),
    certifications: v.optional(v.array(v.string())),
    hourlyRate: v.optional(v.number()),
    trialPrice: v.optional(v.number()),
    price30min: v.optional(v.number()),
    price60min: v.optional(v.number()),
    groupPrice: v.optional(v.number()),
    yearsExperience: v.optional(v.number()),
    currentPosition: v.optional(v.string()),
    previousExperience: v.optional(v.string()),
    teachingStyle: v.optional(v.array(v.string())),
    targetStudents: v.optional(v.array(v.string())),
    onlineTeachingExperience: v.optional(v.string()),
    preferredPlatforms: v.optional(v.array(v.string())),
    onlineTools: v.optional(v.array(v.string())),
    internetQuality: v.optional(v.string()),
    webcamAvailable: v.optional(v.boolean()),
    microphoneAvailable: v.optional(v.boolean()),
    digitalTabletAvailable: v.optional(v.boolean()),
    screenSharingCapability: v.optional(v.boolean()),
    preferredClassDuration: v.optional(v.string()),
    classTypes: v.optional(v.array(v.string())),
    maxStudentsPerClass: v.optional(v.number()),
    country: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    introVideoUrl: v.optional(v.string()),
    nidNumber: v.optional(v.string()),
    nidFrontUrl: v.optional(v.string()),
    nidBackUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx, args.userId);

    const existing = await ctx.db
      .query("teacherProfiles")
      .filter((q) =>
        q.or(
          q.eq(q.field("userId"), userId),
          args.userId ? q.eq(q.field("userId"), args.userId) : false,
        ),
      )
      .first();

    // If currently under review, the application is strictly read-only
    if (existing && existing.verificationStatus === "under_review") {
      throw new Error(
        "Application is currently under review by our administration team and cannot be modified at this time.",
      );
    }

    const merged = {
      name: args.name ?? existing?.name ?? user.name ?? "",
      title: args.title ?? existing?.title ?? "",
      bio: args.bio ?? existing?.bio ?? "",
      subjects: args.subjects ?? existing?.subjects ?? [],
      classLevels: args.classLevels ?? existing?.classLevels ?? [],
      expertise: args.expertise ?? existing?.expertise ?? [],
      languages: args.languages ?? existing?.languages ?? ["English"],
      education: args.education ?? existing?.education ?? [],
      certifications: args.certifications ?? existing?.certifications ?? [],
      hourlyRate: args.hourlyRate ?? existing?.hourlyRate ?? 0,
      trialPrice: args.trialPrice ?? existing?.trialPrice,
      price30min: args.price30min ?? existing?.price30min,
      price60min: args.price60min ?? existing?.price60min,
      groupPrice: args.groupPrice ?? existing?.groupPrice,
      yearsExperience: args.yearsExperience ?? existing?.yearsExperience ?? 0,
      currentPosition: args.currentPosition ?? existing?.currentPosition,
      previousExperience: args.previousExperience ?? existing?.previousExperience,
      teachingStyle: args.teachingStyle ?? existing?.teachingStyle,
      targetStudents: args.targetStudents ?? existing?.targetStudents,
      onlineTeachingExperience: args.onlineTeachingExperience ?? existing?.onlineTeachingExperience,
      preferredPlatforms: args.preferredPlatforms ?? existing?.preferredPlatforms,
      onlineTools: args.onlineTools ?? existing?.onlineTools,
      internetQuality: args.internetQuality ?? existing?.internetQuality,
      webcamAvailable: args.webcamAvailable ?? existing?.webcamAvailable,
      microphoneAvailable: args.microphoneAvailable ?? existing?.microphoneAvailable,
      digitalTabletAvailable: args.digitalTabletAvailable ?? existing?.digitalTabletAvailable,
      screenSharingCapability: args.screenSharingCapability ?? existing?.screenSharingCapability,
      preferredClassDuration: args.preferredClassDuration ?? existing?.preferredClassDuration,
      classTypes: args.classTypes ?? existing?.classTypes,
      maxStudentsPerClass: args.maxStudentsPerClass ?? existing?.maxStudentsPerClass,
      country: args.country ?? existing?.country,
      avatarUrl: args.avatarUrl ?? existing?.avatarUrl ?? user.image,
      introVideoUrl: args.introVideoUrl ?? existing?.introVideoUrl,
      nidNumber: args.nidNumber ?? existing?.nidNumber,
      nidFrontUrl: args.nidFrontUrl ?? existing?.nidFrontUrl,
      nidBackUrl: args.nidBackUrl ?? existing?.nidBackUrl,
    };

    const completionPct = calculateTeacherProfileCompletion(merged);

    // Rule: If an approved teacher edits key verified fields (NID, education, name),
    // automatically revoke active teaching permission and force re-review.
    let targetStatus = existing?.verificationStatus || "not_started";
    let isVerified = existing?.isVerified || false;
    let isAvailable = existing?.isAvailable || false;

    if (existing?.isVerified && existing.verificationStatus === "verified") {
      const coreFieldsChanged =
        (args.nidNumber && args.nidNumber !== existing.nidNumber) ||
        (args.nidFrontUrl && args.nidFrontUrl !== existing.nidFrontUrl) ||
        (args.nidBackUrl && args.nidBackUrl !== existing.nidBackUrl) ||
        (args.name && args.name !== existing.name) ||
        (args.education && JSON.stringify(args.education) !== JSON.stringify(existing.education));

      if (coreFieldsChanged) {
        targetStatus = "needs_attention";
        isVerified = false;
        isAvailable = false;

        // Downgrade user role until re-verified
        await ctx.db.patch(user._id, { role: "student" });

        await ctx.db.insert("verificationLogs", {
          teacherId: userId,
          adminId: "system",
          action: "resubmission_requested",
          reason: "Critical identity or education fields were modified. Re-verification required.",
          timestamp: Date.now(),
        });
      }
    }

    if (!existing) {
      await ctx.db.insert("teacherProfiles", {
        userId,
        ...merged,
        rating: 5.0,
        reviewCount: 0,
        totalStudents: 0,
        totalHours: 0,
        totalClassesCompleted: 0,
        isVerified: false,
        isAvailable: false,
        verificationStatus: "not_started",
        profileCompletionPct: completionPct,
      });
    } else {
      await ctx.db.patch(existing._id, {
        ...merged,
        profileCompletionPct: completionPct,
        verificationStatus: targetStatus,
        isVerified,
        isAvailable,
      });
    }

    return {
      success: true,
      profileCompletionPct: completionPct,
      status: targetStatus,
    };
  },
});

// ─── Submit Teacher Application for Verification ─────────────────────────────
export const submitApplication = mutation({
  args: {
    userId: v.optional(v.string()),
    nidNumber: v.optional(v.string()),
    nidFrontUrl: v.optional(v.string()),
    nidBackUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireVerifiedAccount(ctx, args.userId);

    const profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) =>
        q.or(
          q.eq(q.field("userId"), userId),
          args.userId ? q.eq(q.field("userId"), args.userId) : false,
        ),
      )
      .first();

    if (!profile) {
      throw new Error("No teacher profile draft found. Please complete the application form first.");
    }

    if (profile.verificationStatus === "under_review") {
      throw new Error("Your application has already been submitted and is currently under review.");
    }

    // Merge latest NID document data if supplied in submit payload
    const effectiveNidNumber = (args.nidNumber || profile.nidNumber || "").trim();
    const effectiveNidFront = args.nidFrontUrl || profile.nidFrontUrl || "";
    const effectiveNidBack = args.nidBackUrl || profile.nidBackUrl || "";

    // Validation Requirements:
    if (!profile.name || profile.name.trim().length < 2) {
      throw new Error("Please provide your full legal name.");
    }
    if (!profile.title || profile.title.trim().length < 3) {
      throw new Error("Please specify your professional teaching title.");
    }
    if (!profile.bio || profile.bio.trim().length < 15) {
      throw new Error("Please provide a detailed biography (minimum 15 characters).");
    }
    if (!profile.subjects || profile.subjects.length === 0) {
      throw new Error("Please select at least one teaching subject.");
    }
    if (!profile.languages || profile.languages.length === 0) {
      throw new Error("Please select at least one language of instruction.");
    }
    if (!profile.education || profile.education.length === 0) {
      throw new Error("Please add your education history (degree and institution).");
    }
    if (!profile.hourlyRate || profile.hourlyRate <= 0) {
      throw new Error("Please specify a valid hourly teaching rate.");
    }
    if (!effectiveNidNumber) {
      throw new Error("Government ID / NID number is required for verification.");
    }
    if (!effectiveNidFront) {
      throw new Error("Front image/document of your Government ID is required.");
    }
    // Back ID is optional for single-sided IDs or passports

    // Check minimum completion threshold (40%)
    const completionPct = calculateTeacherProfileCompletion({
      ...profile,
      nidNumber: effectiveNidNumber,
      nidFrontUrl: effectiveNidFront,
      nidBackUrl: effectiveNidBack,
    });

    if (completionPct < 40) {
      throw new Error(
        `Application is ${completionPct}% complete. A minimum of 40% completion is required before submission.`,
      );
    }

    // Atomically transition status to under_review, lock availability & verified state
    await ctx.db.patch(profile._id, {
      nidNumber: effectiveNidNumber,
      nidFrontUrl: effectiveNidFront,
      nidBackUrl: effectiveNidBack,
      nidSubmittedAt: Date.now(),
      verificationStatus: "under_review",
      isVerified: false,
      isAvailable: false,
      rejectionReason: undefined,
      profileCompletionPct: completionPct,
    });

    // Record audit log
    await ctx.db.insert("verificationLogs", {
      teacherId: userId,
      adminId: userId,
      action: "submitted",
      reason: "Application submitted for administrator verification review.",
      timestamp: Date.now(),
    });

    // Create confirmation notification for applicant
    await ctx.db.insert("notifications", {
      userId,
      title: "Teacher Application Submitted",
      message:
        "Your teacher credentials and ID documents have been submitted to the administration team for review.",
      type: "system",
      read: false,
      createdAt: Date.now(),
      actionUrl: "/teacher-application",
    });

    // Create immediate administrative notification for the single platform administrator (istihadahmed1163@gmail.com)
    const adminUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), AUTHORIZED_ADMIN_EMAIL))
      .first();

    const adminNotificationTargetId = adminUser ? (adminUser._id as string) : "admin";

    await ctx.db.insert("notifications", {
      userId: adminNotificationTargetId,
      title: `Teacher Application: ${profile.name}`,
      message: `${profile.name} (${user.email}) submitted credentials for review (${completionPct}% complete). Review notification sent to ${APPLICATION_REVIEW_EMAIL}.`,
      type: "system",
      read: false,
      createdAt: Date.now(),
      actionUrl: "/admin/verification",
    });

    return {
      success: true,
      verificationStatus: "under_review",
      profileCompletionPct: completionPct,
      deliveredTo: APPLICATION_REVIEW_EMAIL,
    };
  },
});

// ─── Submit Application & Send Full Portfolio to Admin Email Action ──────────
export const submitApplicationAndNotifyAction = action({
  args: {
    userId: v.optional(v.string()),
    nidNumber: v.optional(v.string()),
    nidFrontUrl: v.optional(v.string()),
    nidBackUrl: v.optional(v.string()),
    // Optional snapshot fields if available from client
    profileSnapshot: v.optional(
      v.object({
        name: v.string(),
        email: v.string(),
        title: v.optional(v.string()),
        bio: v.optional(v.string()),
        country: v.optional(v.string()),
        timezone: v.optional(v.string()),
        hourlyRate: v.optional(v.number()),
        price30min: v.optional(v.number()),
        price60min: v.optional(v.number()),
        groupPrice: v.optional(v.number()),
        trialPrice: v.optional(v.number()),
        subjects: v.optional(v.array(v.string())),
        classLevels: v.optional(v.array(v.string())),
        expertise: v.optional(v.array(v.string())),
        languages: v.optional(v.array(v.string())),
        yearsExperience: v.optional(v.number()),
        currentPosition: v.optional(v.string()),
        previousExperience: v.optional(v.string()),
        education: v.optional(
          v.array(
            v.object({
              degree: v.string(),
              institution: v.string(),
              department: v.optional(v.string()),
              passingYear: v.optional(v.union(v.string(), v.number())),
              result: v.optional(v.string()),
            })
          )
        ),
        onlineTeachingExperience: v.optional(v.string()),
        preferredPlatforms: v.optional(v.array(v.string())),
        onlineTools: v.optional(v.array(v.string())),
        classTypes: v.optional(v.array(v.string())),
        preferredClassDuration: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    deliveredTo: string;
    verificationStatus: string;
    profileCompletionPct: number;
  }> => {
    // 1. Run the database state mutation
    const mutationResult: any = await ctx.runMutation((api as any).teachers.submitApplication, {
      userId: args.userId,
      nidNumber: args.nidNumber,
      nidFrontUrl: args.nidFrontUrl,
      nidBackUrl: args.nidBackUrl,
    });

    // 2. Dispatch the full application data to istihadahmed1163@gmail.com
    const snap = args.profileSnapshot;
    if (snap) {
      const { html, text } = buildTeacherApplicationEmailHtml({
        name: snap.name,
        email: snap.email,
        userId: args.userId || "applicant",
        title: snap.title,
        bio: snap.bio,
        country: snap.country,
        timezone: snap.timezone,
        hourlyRate: snap.hourlyRate,
        price30min: snap.price30min,
        price60min: snap.price60min,
        groupPrice: snap.groupPrice,
        trialPrice: snap.trialPrice,
        subjects: snap.subjects,
        classLevels: snap.classLevels,
        expertise: snap.expertise,
        languages: snap.languages,
        yearsExperience: snap.yearsExperience,
        currentPosition: snap.currentPosition,
        previousExperience: snap.previousExperience,
        education: snap.education as any,
        onlineTeachingExperience: snap.onlineTeachingExperience,
        preferredPlatforms: snap.preferredPlatforms,
        onlineTools: snap.onlineTools,
        classTypes: snap.classTypes,
        preferredClassDuration: snap.preferredClassDuration,
        nidNumber: args.nidNumber,
        nidFrontUrl: args.nidFrontUrl,
        nidBackUrl: args.nidBackUrl,
        profileCompletionPct: mutationResult.profileCompletionPct,
        submittedAt: new Date().toUTCString(),
      });

      await dispatchEmailViaProvider({
        to: APPLICATION_REVIEW_EMAIL,
        subject: `New teacher application submitted: ${snap.name} (${snap.title || "Educator"})`,
        html,
        text,
      });
    }

    return {
      success: true,
      deliveredTo: APPLICATION_REVIEW_EMAIL,
      verificationStatus: mutationResult.verificationStatus,
      profileCompletionPct: mutationResult.profileCompletionPct,
    };
  },
});

// ─── Teacher Availability Management (Approved Teachers Only) ────────────────
export const toggleAvailability = mutation({
  args: { isAvailable: v.boolean() },
  handler: async (ctx, args) => {
    const { profile } = await requireApprovedTeacher(ctx);

    await ctx.db.patch(profile._id, {
      isAvailable: args.isAvailable,
    });

    return { success: true, isAvailable: args.isAvailable };
  },
});

export const getAvailability = query({
  args: { teacherId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("availability")
      .filter((q) => q.eq(q.field("teacherId"), args.teacherId))
      .collect();
  },
});

export const setAvailability = mutation({
  args: {
    slots: v.array(
      v.object({
        dayOfWeek: v.number(),
        startTime: v.string(),
        endTime: v.string(),
        isActive: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireApprovedTeacher(ctx);

    const existing = await ctx.db
      .query("availability")
      .filter((q) => q.eq(q.field("teacherId"), userId))
      .collect();

    for (const slot of existing) {
      await ctx.db.delete(slot._id);
    }

    for (const slot of args.slots) {
      await ctx.db.insert("availability", {
        teacherId: userId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive,
      });
    }

    return { success: true };
  },
});

// ─── Real Document Storage Uploaders ─────────────────────────────────────────
export const generateDocumentUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getDocumentUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

