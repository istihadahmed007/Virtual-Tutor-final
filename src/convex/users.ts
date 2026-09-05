import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { calculateTeacherProfileCompletion } from "./teachers";
import {
  requireSuperAdmin,
  isAuthorizedAdminEmail,
  AUTHORIZED_ADMIN_EMAIL,
  normalizeEmail,
} from "./authHelpers";
import { hashWithSalt, generateSecureSalt } from "./otp";
import { writeSecurityAudit } from "./securityAudit";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

// Keep the application user record aligned with the verified Convex Auth identity.
// Teacher profiles use this Convex user ID as their owner, so this sync must happen
// before a teacher saves or submits an application.
export const syncAuthenticatedUser = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("student"),
        v.literal("teacher"),
        v.literal("parent"),
        v.literal("admin"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Authenticated user record not found");

    const effectiveEmail = args.email || user.email;
    const isSuperAdmin = isAuthorizedAdminEmail(effectiveEmail);

    // Only the single authorized admin email can have or be given the admin role, AND only when email is verified
    const isEmailVerified = Boolean(
      user.emailVerified ||
      (user.emailVerificationTime && user.emailVerificationTime > 0)
    );

    let assignedRole = args.role || user.role || "student";
    if (assignedRole === "admin" && (!isSuperAdmin || !isEmailVerified)) {
      assignedRole = "student";
    } else if (isSuperAdmin && isEmailVerified) {
      assignedRole = "admin";
    }

    await ctx.db.patch(userId, {
      name: args.name || user.name || "User",
      email: effectiveEmail,
      role: assignedRole,
      emailVerified: true,
      emailVerificationTime: user.emailVerificationTime || Date.now(),
      isAnonymous: false,
      accountStatus: user.accountStatus || "active",
      lastLoginAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});

export const getUserProfileImage = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let targetUserId = args.userId;
    if (!targetUserId) {
      const authId = await getAuthUserId(ctx);
      if (!authId) return null;
      targetUserId = authId as string;
    }
    const user = await ctx.db.get(targetUserId as any);
    if (!user) return null;
    return {
      avatarUrl: (user as any).avatarUrl || (user as any).image || null,
      avatarStorageId: (user as any).avatarStorageId || null,
      name: (user as any).name || "User",
      role: (user as any).role || "student",
    };
  },
});

// ─── Generate Convex Storage Upload URL ──────────────────────
export const generateProfileImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

// ─── Save Profile Image Reference in DB ───────────────────────
export const saveProfileImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const avatarUrl = await ctx.storage.getUrl(args.storageId);
    if (!avatarUrl) throw new Error("Failed to generate download URL for uploaded profile image");

    // Clean up previous storage file if it exists and is distinct
    if (user.avatarStorageId && user.avatarStorageId !== args.storageId) {
      try {
        await ctx.storage.delete(user.avatarStorageId);
      } catch (err) {
        console.warn("Could not delete old avatar file from storage:", err);
      }
    }

    // 1. Update user record
    await ctx.db.patch(userId, {
      avatarStorageId: args.storageId,
      avatarUrl,
      image: avatarUrl,
    });

    // 2. Update teacher profile if exists
    const teacherProfile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), userId as string))
      .first();

    if (teacherProfile) {
      const updatedTeacher = {
        ...teacherProfile,
        avatarStorageId: args.storageId,
        avatarUrl,
      };
      const completionPct = calculateTeacherProfileCompletion(updatedTeacher);
      await ctx.db.patch(teacherProfile._id, {
        avatarStorageId: args.storageId,
        avatarUrl,
        profileCompletionPct: completionPct,
      });
    }

    // 3. Update student profile if exists
    const studentProfile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();

    if (studentProfile) {
      const updatedStudent = {
        ...studentProfile,
        avatarStorageId: args.storageId,
        avatarUrl,
      };
      const fields = [
        updatedStudent.name,
        updatedStudent.institution,
        updatedStudent.educationLevel,
        updatedStudent.classLevel,
        updatedStudent.board,
        updatedStudent.subjects && updatedStudent.subjects.length > 0,
        updatedStudent.learningGoals && updatedStudent.learningGoals.length > 0,
        Boolean(updatedStudent.avatarStorageId || updatedStudent.avatarUrl),
      ];
      const filled = fields.filter(Boolean).length;
      const completionPct = Math.round((filled / fields.length) * 100);

      await ctx.db.patch(studentProfile._id, {
        avatarStorageId: args.storageId,
        avatarUrl,
        profileCompletionPct: completionPct,
      });
    }

    // 4. Update parent profile if exists
    const parentProfile = await ctx.db
      .query("parentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();

    if (parentProfile) {
      await ctx.db.patch(parentProfile._id, {
        avatarStorageId: args.storageId,
        avatarUrl,
      });
    }

    return {
      success: true,
      storageId: args.storageId,
      avatarUrl,
    };
  },
});

// ─── Remove Profile Image ─────────────────────────────────────
export const removeProfileImage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (user.avatarStorageId) {
      try {
        await ctx.storage.delete(user.avatarStorageId);
      } catch (err) {
        console.warn("Could not delete avatar from storage:", err);
      }
    }

    await ctx.db.patch(userId, {
      avatarStorageId: undefined,
      avatarUrl: undefined,
      image: undefined,
    });

    // Update teacher profile
    const teacherProfile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), userId as string))
      .first();

    if (teacherProfile) {
      const updatedTeacher = {
        ...teacherProfile,
        avatarStorageId: undefined,
        avatarUrl: undefined,
      };
      const completionPct = calculateTeacherProfileCompletion(updatedTeacher);
      await ctx.db.patch(teacherProfile._id, {
        avatarStorageId: undefined,
        avatarUrl: undefined,
        profileCompletionPct: completionPct,
      });
    }

    // Update student profile
    const studentProfile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();

    if (studentProfile) {
      const updatedStudent = {
        ...studentProfile,
        avatarStorageId: undefined,
        avatarUrl: undefined,
      };
      const fields = [
        updatedStudent.name,
        updatedStudent.institution,
        updatedStudent.educationLevel,
        updatedStudent.classLevel,
        updatedStudent.board,
        updatedStudent.subjects && updatedStudent.subjects.length > 0,
        updatedStudent.learningGoals && updatedStudent.learningGoals.length > 0,
        Boolean(updatedStudent.avatarStorageId || updatedStudent.avatarUrl),
      ];
      const filled = fields.filter(Boolean).length;
      const completionPct = Math.round((filled / fields.length) * 100);

      await ctx.db.patch(studentProfile._id, {
        avatarStorageId: undefined,
        avatarUrl: undefined,
        profileCompletionPct: completionPct,
      });
    }

    // Update parent profile
    const parentProfile = await ctx.db
      .query("parentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();

    if (parentProfile) {
      await ctx.db.patch(parentProfile._id, {
        avatarStorageId: undefined,
        avatarUrl: undefined,
      });
    }

    return { success: true };
  },
});

export const getProfileStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const teacherProfile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), userId as string))
      .first();

    const studentProfile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();

    const role = user.role || "student";
    let completionPct = 0;
    let isComplete = false;

    if (role === "teacher" && teacherProfile) {
      completionPct = teacherProfile.profileCompletionPct || 0;
      isComplete = completionPct >= 80;
    } else if (role === "student" && studentProfile) {
      completionPct = studentProfile.profileCompletionPct || 0;
      isComplete = completionPct >= 60;
    }

    return {
      role,
      isComplete,
      completionPercentage: completionPct,
      hasProfile: !!(teacherProfile || studentProfile),
      teacherProfile,
      studentProfile,
    };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    timezone: v.optional(v.string()),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    country: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.timezone !== undefined) updates.timezone = args.timezone;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth;
    if (args.country !== undefined) updates.country = args.country;
    if (args.preferredLanguage !== undefined) updates.preferredLanguage = args.preferredLanguage;
    if (args.image !== undefined) updates.image = args.image;
    await ctx.db.patch(userId, updates);
  },
});

export const setRole = mutation({
  args: { role: v.union(v.literal("student"), v.literal("teacher"), v.literal("admin")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (args.role === "admin") {
      if (!isAuthorizedAdminEmail(user.email)) {
        throw new Error(
          `Unauthorized: Only the designated administrator (${AUTHORIZED_ADMIN_EMAIL}) can assume the admin role.`
        );
      }
    }
    
    await ctx.db.patch(userId, { role: args.role });
  },
});

export const setupDemoUser = mutation({
  args: {
    role: v.union(v.literal("student"), v.literal("teacher"), v.literal("parent")),
    demoType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const isTeacher = args.role === "teacher";
    const isParent = args.role === "parent";

    let demoName = "Alex Rivera";
    let demoEmail = "alex.rivera@liveclass.edu";

    if (isTeacher) {
      demoName = args.demoType === "language" ? "Elena Rostova" : "Dr. Sarah Jenkins";
      demoEmail = args.demoType === "language" ? "elena.rostova@liveclass.edu" : "sarah.jenkins@liveclass.edu";
    } else if (isParent) {
      demoName = "Mark Jenkins";
      demoEmail = "parent@liveclass.edu";
    }

    await ctx.db.patch(userId, {
      role: args.role,
      name: demoName,
      email: demoEmail,
      accountStatus: "active",
      emailVerified: true,
      lastLoginAt: Date.now(),
    });

    if (isTeacher) {
      const existingTeacher = await ctx.db
        .query("teacherProfiles")
        .filter((q) => q.eq(q.field("userId"), userId as string))
        .first();

      if (!existingTeacher) {
        await ctx.db.insert("teacherProfiles", {
          userId: userId as string,
          name: demoName,
          title:
            args.demoType === "language"
              ? "Senior IELTS & Spanish Language Specialist"
              : "Senior AP Calculus & Physics Specialist",
          bio:
            args.demoType === "language"
              ? "Passionate polyglot and certified IELTS instructor with 8+ years helping students achieve Band 8.0+ and conversational fluency."
              : "Passionate educator with 10+ years helping students excel in advanced mathematics, calculus, and physics mechanics.",
          subjects:
            args.demoType === "language"
              ? ["English", "Spanish", "IELTS Preparation", "Grammar"]
              : ["Mathematics", "Calculus", "Physics", "Linear Algebra"],
          classLevels: ["High School", "College / AP", "Undergraduate"],
          expertise:
            args.demoType === "language"
              ? ["Speaking & Pronunciation", "Writing Task 2", "Vocabulary Building"]
              : ["Calculus I & II", "Mechanics", "Differential Equations"],
          education: [
            {
              degree: "M.Sc. Education & STEM",
              institution: "University of Cambridge",
              passingYear: "2018",
            },
          ],
          languages: ["English", "Spanish", "French"],
          hourlyRate: args.demoType === "language" ? 38 : 45,
          yearsExperience: 8,
          rating: 4.95,
          reviewCount: 48,
          totalStudents: 142,
          totalHours: 360,
          isVerified: true,
          isAvailable: true,
          verificationStatus: "verified",
          profileCompletionPct: 100,
          classTypes: ["1-on-1", "Group", "Interactive Lab"],
        });
      }
    } else if (isParent) {
      const existingParent = await ctx.db
        .query("parentProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId as string))
        .first();

      if (!existingParent) {
        await ctx.db.insert("parentProfiles", {
          userId: userId as string,
          name: demoName,
          relationship: "Parent / Guardian",
          linkedStudentIds: [],
          linkedStudentEmails: ["alex.rivera@liveclass.edu"],
          createdAt: Date.now(),
        });
      }
    } else {
      const existingStudent = await ctx.db
        .query("studentProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId as string))
        .first();

      if (!existingStudent) {
        await ctx.db.insert("studentProfiles", {
          userId: userId as string,
          name: demoName,
          institution: "Oakridge High Academy",
          educationLevel: "High School",
          classLevel: "Grade 11",
          subjects: ["Mathematics", "Physics", "Chemistry"],
          learningGoals: ["Master AP Calculus BC", "Improve exam problem-solving speed"],
          verificationStatus: "verified",
          profileCompletionPct: 95,
        });
      }
    }

    return { success: true, role: args.role, name: demoName };
  },
});

export const quickDemoLogin = mutation({
  args: {
    role: v.union(v.literal("student"), v.literal("teacher"), v.literal("parent")),
    demoType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isTeacher = args.role === "teacher";
    const isParent = args.role === "parent";

    let demoName = "Alex Rivera";
    let demoEmail = "student@liveclass.edu";

    if (isTeacher) {
      demoName = args.demoType === "language" ? "Elena Rostova" : "Dr. Sarah Jenkins";
      demoEmail = args.demoType === "language" ? "elena.rostova@liveclass.edu" : "teacher@liveclass.edu";
    } else if (isParent) {
      demoName = "Mark Jenkins";
      demoEmail = "parent@liveclass.edu";
    }

    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", demoEmail))
      .first();

    if (!user) {
      const newUserId = await ctx.db.insert("users", {
        name: demoName,
        email: demoEmail,
        role: args.role,
        accountStatus: "active",
        emailVerified: true,
        emailVerificationTime: Date.now(),
        lastLoginAt: Date.now(),
        timezone: "America/New_York",
      });
      user = await ctx.db.get(newUserId);
    } else {
      await ctx.db.patch(user._id, {
        name: demoName,
        role: args.role,
        accountStatus: "active",
        emailVerified: true,
        lastLoginAt: Date.now(),
      });
    }

    if (!user) throw new Error("Failed to initialize demo account.");

    const currentAuthId = await getAuthUserId(ctx);
    if (currentAuthId && currentAuthId !== user._id) {
      const currentAuthUser = await ctx.db.get(currentAuthId);
      if (currentAuthUser?.isAnonymous) {
        await ctx.db.patch(currentAuthId, {
          name: demoName,
          email: demoEmail,
          role: args.role,
          emailVerified: true,
          isAnonymous: false,
          accountStatus: "active",
        });
      }
    }

    if (isTeacher) {
      const existingTeacher = await ctx.db
        .query("teacherProfiles")
        .filter((q) => q.eq(q.field("userId"), user!._id as string))
        .first();

      if (!existingTeacher) {
        await ctx.db.insert("teacherProfiles", {
          userId: user._id as string,
          name: demoName,
          title:
            args.demoType === "language"
              ? "Senior IELTS & Spanish Language Specialist"
              : "Senior AP Calculus & Physics Specialist",
          bio:
            args.demoType === "language"
              ? "Passionate polyglot and certified IELTS instructor with 8+ years helping students achieve Band 8.0+ and conversational fluency."
              : "Passionate educator with 10+ years helping students excel in advanced mathematics, calculus, and physics mechanics.",
          subjects:
            args.demoType === "language"
              ? ["English", "Spanish", "IELTS Preparation", "Grammar"]
              : ["Mathematics", "Calculus", "Physics", "Linear Algebra"],
          classLevels: ["High School", "College / AP", "Undergraduate"],
          expertise:
            args.demoType === "language"
              ? ["Speaking & Pronunciation", "Writing Task 2", "Vocabulary Building"]
              : ["Calculus I & II", "Mechanics", "Differential Equations"],
          education: [
            {
              degree: "M.Sc. Education & STEM",
              institution: "University of Cambridge",
              passingYear: "2018",
            },
          ],
          languages: ["English", "Spanish", "French"],
          hourlyRate: 45,
          yearsExperience: 10,
          rating: 4.95,
          reviewCount: 48,
          totalStudents: 142,
          totalHours: 360,
          isVerified: true,
          isAvailable: true,
          verificationStatus: "verified",
          profileCompletionPct: 100,
          classTypes: ["1-on-1", "Group", "Interactive Lab"],
        });
      }
    } else if (isParent) {
      const existingParent = await ctx.db
        .query("parentProfiles")
        .withIndex("by_user", (q) => q.eq("userId", user!._id as string))
        .first();

      if (!existingParent) {
        await ctx.db.insert("parentProfiles", {
          userId: user._id as string,
          name: demoName,
          relationship: "Parent / Guardian",
          linkedStudentIds: [],
          linkedStudentEmails: ["alex.rivera@liveclass.edu"],
          createdAt: Date.now(),
        });
      }
    } else {
      const existingStudent = await ctx.db
        .query("studentProfiles")
        .withIndex("by_user", (q) => q.eq("userId", user!._id as string))
        .first();

      if (!existingStudent) {
        await ctx.db.insert("studentProfiles", {
          userId: user._id as string,
          name: demoName,
          institution: "Oakridge High Academy",
          educationLevel: "High School",
          classLevel: "Grade 11",
          subjects: ["Mathematics", "Physics", "Chemistry"],
          learningGoals: ["Master AP Calculus BC", "Improve exam problem-solving speed"],
          verificationStatus: "verified",
          profileCompletionPct: 95,
        });
      }
    }

    return {
      success: true,
      user: {
        _id: String(user._id),
        name: demoName,
        email: demoEmail,
        role: args.role,
        isEmailVerified: true,
      },
    };
  },
});

// ─── Create student profile ────────────────────────────
export const createStudentProfile = mutation({
  args: {
    name: v.string(),
    institution: v.optional(v.string()),
    studentIdNumber: v.optional(v.string()),
    educationLevel: v.optional(v.string()),
    classLevel: v.optional(v.string()),
    department: v.optional(v.string()),
    board: v.optional(v.string()),
    subjects: v.array(v.string()),
    learningGoals: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();
    if (existing) throw new Error("Student profile already exists");

    await ctx.db.insert("studentProfiles", {
      userId: userId as string,
      name: args.name,
      institution: args.institution,
      studentIdNumber: args.studentIdNumber,
      educationLevel: args.educationLevel,
      classLevel: args.classLevel,
      department: args.department,
      board: args.board,
      subjects: args.subjects,
      learningGoals: args.learningGoals || [],
      verificationStatus: "not_submitted",
      profileCompletionPct: 20,
    });

    await ctx.db.patch(userId, { role: "student" });

    return { success: true };
  },
});

// ─── Update student profile ────────────────────────────
export const updateStudentProfile = mutation({
  args: {
    institution: v.optional(v.string()),
    studentIdNumber: v.optional(v.string()),
    educationLevel: v.optional(v.string()),
    classLevel: v.optional(v.string()),
    department: v.optional(v.string()),
    board: v.optional(v.string()),
    subjects: v.optional(v.array(v.string())),
    learningGoals: v.optional(v.array(v.string())),
    studentCardUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();
    if (!profile) throw new Error("Student profile not found");

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) updates[key] = value;
    }

    // Recalculate completion
    const p = { ...profile, ...updates };
    const fields = [
      p.name, p.institution, p.educationLevel, p.classLevel, p.board,
      p.subjects.length > 0, p.learningGoals.length > 0,
    ];
    const filled = fields.filter(Boolean).length;
    updates.profileCompletionPct = Math.round((filled / fields.length) * 100);

    if (args.studentCardUrl) {
      updates.verificationStatus = "pending";
    }

    await ctx.db.patch(profile._id, updates);
    return { success: true };
  },
});

// ─── Submit student card for verification ──────────────
export const submitStudentVerification = mutation({
  args: { studentCardUrl: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();
    if (!profile) throw new Error("Student profile not found");

    await ctx.db.patch(profile._id, {
      studentCardUrl: args.studentCardUrl,
      verificationStatus: "pending",
    });

    return { success: true };
  },
});

// ─── Get student profile ───────────────────────────────
export const getStudentProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    return await ctx.db.query("users").collect();
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    const teachers = await ctx.db.query("teacherProfiles").collect();
    const lessons = await ctx.db.query("lessons").collect();
    return {
      totalUsers: users.length,
      totalTeachers: teachers.length,
      totalLessons: lessons.length,
    };
  },
});

// ─── Setup & Upgrade Sole Administrator Account ──────────────────────────────
export const ensureAuthorizedAdminAccount = mutation({
  args: {
    initialPassword: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanEmail = AUTHORIZED_ADMIN_EMAIL.toLowerCase().trim();
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", cleanEmail))
      .first();

    const now = Date.now();
    let passwordHash: string | undefined = undefined;
    if (args.initialPassword && args.initialPassword.length >= 8) {
      const salt = generateSecureSalt();
      const hash = await hashWithSalt(args.initialPassword, salt);
      passwordHash = `${salt}$${hash}`;
    }

    if (!user) {
      // Create verified administrator record
      const defaultSalt = generateSecureSalt();
      const defaultHash = await hashWithSalt("Susmoy1163", defaultSalt);
      const newUserId = await ctx.db.insert("users", {
        name: "Istihad Ahmed",
        email: cleanEmail,
        role: "admin",
        emailVerified: true,
        emailVerificationTime: now,
        accountStatus: "active",
        passwordHash: passwordHash || `${defaultSalt}$${defaultHash}`,
        lastLoginAt: now,
        timezone: "America/New_York",
      });
      user = await ctx.db.get(newUserId);

      await writeSecurityAudit(ctx, {
        eventType: "role_change",
        userId: String(newUserId),
        email: cleanEmail,
        outcome: "success",
        role: "admin",
        reason: "Initial setup of platform administrator account",
      });
    } else {
      // Securely upgrade existing account to admin
      await ctx.db.patch(user._id, {
        role: "admin",
        emailVerified: true,
        emailVerificationTime: user.emailVerificationTime || now,
        accountStatus: "active",
        ...(passwordHash ? { passwordHash } : {}),
      });

      await writeSecurityAudit(ctx, {
        eventType: "role_change",
        userId: String(user._id),
        email: cleanEmail,
        outcome: "success",
        role: "admin",
        reason: "Server-side administrator privilege upgrade for verified allowlisted email",
      });
    }

    return {
      success: true,
      email: cleanEmail,
      role: "admin",
      isEmailVerified: true,
    };
  },
});
