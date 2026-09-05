import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Generates an authorized upload URL using Convex storage.
 */
export const generateProfileImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Generate authoritative upload URL for Convex Storage
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Saves a validated image storageId into user, student, teacher, or parent profiles,
 * cleans up any superseded previous image file, and synchronizes live classroom presence.
 */
export const saveProfileImage = mutation({
  args: {
    storageId: v.id("_storage"),
    targetUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    const effectiveUserId = authUserId || args.targetUserId;
    if (!effectiveUserId) {
      throw new Error("Unauthenticated: Please sign in to upload and save a profile picture.");
    }

    // Resolve public/authoritative URL for the uploaded storage object
    const avatarUrl = await ctx.storage.getUrl(args.storageId);
    if (!avatarUrl) {
      throw new Error("Storage error: Could not resolve accessible URL for the uploaded profile picture.");
    }

    // 1. Update Users Table
    let user: Doc<"users"> | null = null;
    try {
      user = (await ctx.db.get(effectiveUserId as Id<"users">)) as Doc<"users"> | null;
    } catch {
      user = (await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("_id"), effectiveUserId as Id<"users">))
        .first()) as Doc<"users"> | null;
    }

    if (user) {
      // Clean up previous storage file if it exists and is different from new one
      if (user.avatarStorageId && user.avatarStorageId !== args.storageId) {
        try {
          await ctx.storage.delete(user.avatarStorageId);
        } catch (err) {
          console.warn("[Avatars] Failed to delete previous storage object:", err);
        }
      }

      await ctx.db.patch(user._id, {
        avatarStorageId: args.storageId,
        avatarUrl: avatarUrl,
        image: avatarUrl,
      });
    }

    // 2. Synchronize to Teacher Profile (if user is teacher)
    const teacherProfile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), String(effectiveUserId)))
      .first();

    if (teacherProfile) {
      if (
        teacherProfile.avatarStorageId &&
        teacherProfile.avatarStorageId !== args.storageId &&
        teacherProfile.avatarStorageId !== user?.avatarStorageId
      ) {
        try {
          await ctx.storage.delete(teacherProfile.avatarStorageId);
        } catch (err) {
          console.warn("[Avatars] Failed to clean teacher previous avatar:", err);
        }
      }

      await ctx.db.patch(teacherProfile._id, {
        avatarStorageId: args.storageId,
        avatarUrl: avatarUrl,
      });
    }

    // 3. Synchronize to Student Profile (if user is student)
    const studentProfile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", String(effectiveUserId)))
      .first();

    if (studentProfile) {
      if (
        studentProfile.avatarStorageId &&
        studentProfile.avatarStorageId !== args.storageId &&
        studentProfile.avatarStorageId !== user?.avatarStorageId
      ) {
        try {
          await ctx.storage.delete(studentProfile.avatarStorageId);
        } catch (err) {
          console.warn("[Avatars] Failed to clean student previous avatar:", err);
        }
      }

      await ctx.db.patch(studentProfile._id, {
        avatarStorageId: args.storageId,
        avatarUrl: avatarUrl,
      });
    }

    // 4. Synchronize to Parent Profile (if user is parent)
    const parentProfile = await ctx.db
      .query("parentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", String(effectiveUserId)))
      .first();

    if (parentProfile) {
      await ctx.db.patch(parentProfile._id, {
        avatarStorageId: args.storageId,
        avatarUrl: avatarUrl,
      });
    }

    // 5. Real-time synchronisation with live Classroom presence
    const presenceList = await ctx.db
      .query("classroomPresence")
      .filter((q) => q.eq(q.field("userId"), String(effectiveUserId)))
      .collect();

    for (const pres of presenceList) {
      await ctx.db.patch(pres._id, { avatarUrl });
    }

    return {
      success: true,
      avatarUrl,
      storageId: args.storageId,
    };
  },
});

/**
 * Removes profile image, cleans up storage binary reference, and resets to default neutral avatar.
 */
export const removeProfileImage = mutation({
  args: {
    targetUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    const effectiveUserId = authUserId || args.targetUserId;
    if (!effectiveUserId) {
      throw new Error("Unauthenticated: Please sign in to remove your profile picture.");
    }

    let user: Doc<"users"> | null = null;
    try {
      user = (await ctx.db.get(effectiveUserId as Id<"users">)) as Doc<"users"> | null;
    } catch {
      user = (await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("_id"), effectiveUserId as Id<"users">))
        .first()) as Doc<"users"> | null;
    }

    if (user) {
      if (user.avatarStorageId) {
        try {
          await ctx.storage.delete(user.avatarStorageId);
        } catch (err) {
          console.warn("[Avatars] Could not delete user avatar from storage:", err);
        }
      }

      await ctx.db.patch(user._id, {
        avatarStorageId: undefined,
        avatarUrl: undefined,
        image: undefined,
      });
    }

    // Clean student profile
    const studentProfile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", String(effectiveUserId)))
      .first();
    if (studentProfile) {
      if (studentProfile.avatarStorageId && studentProfile.avatarStorageId !== user?.avatarStorageId) {
        try {
          await ctx.storage.delete(studentProfile.avatarStorageId);
        } catch (err) {
          console.warn("[Avatars] Could not delete student avatar from storage:", err);
        }
      }
      await ctx.db.patch(studentProfile._id, {
        avatarStorageId: undefined,
        avatarUrl: undefined,
      });
    }

    // Clean teacher profile
    const teacherProfile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), String(effectiveUserId)))
      .first();
    if (teacherProfile) {
      if (teacherProfile.avatarStorageId && teacherProfile.avatarStorageId !== user?.avatarStorageId) {
        try {
          await ctx.storage.delete(teacherProfile.avatarStorageId);
        } catch (err) {
          console.warn("[Avatars] Could not delete teacher avatar from storage:", err);
        }
      }
      await ctx.db.patch(teacherProfile._id, {
        avatarStorageId: undefined,
        avatarUrl: undefined,
      });
    }

    // Clean parent profile
    const parentProfile = await ctx.db
      .query("parentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", String(effectiveUserId)))
      .first();
    if (parentProfile) {
      await ctx.db.patch(parentProfile._id, {
        avatarStorageId: undefined,
        avatarUrl: undefined,
      });
    }

    // Clear live classroom presence
    const presenceList = await ctx.db
      .query("classroomPresence")
      .filter((q) => q.eq(q.field("userId"), String(effectiveUserId)))
      .collect();
    for (const pres of presenceList) {
      await ctx.db.patch(pres._id, { avatarUrl: undefined });
    }

    return { success: true };
  },
});

/**
 * Authoritative query to get a user's profile image respecting student privacy settings.
 */
export const getProfileAvatar = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);

    // 1. Check Student Profile & Privacy Rule
    const studentProfile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (studentProfile) {
      // If student disabled teacher discovery, hide private avatar unless caller is the student or admin
      if (studentProfile.isDiscoverable === false && callerId !== args.userId) {
        let caller: Doc<"users"> | null = null;
        if (callerId) {
          try {
            caller = (await ctx.db.get(callerId as Id<"users">)) as Doc<"users"> | null;
          } catch {}
        }
        if (caller?.role !== "admin") {
          return {
            avatarUrl: null,
            name: studentProfile.name,
            role: "student",
            isPrivate: true,
          };
        }
      }

      return {
        avatarUrl: studentProfile.avatarUrl || null,
        name: studentProfile.name,
        role: "student",
        isPrivate: false,
      };
    }

    // 2. Check Teacher Profile
    const teacherProfile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (teacherProfile) {
      return {
        avatarUrl: teacherProfile.avatarUrl || null,
        name: teacherProfile.name,
        role: "teacher",
        isPrivate: false,
        isVerified: teacherProfile.isVerified,
      };
    }

    // 3. Check User record
    try {
      const user = (await ctx.db.get(args.userId as Id<"users">)) as Doc<"users"> | null;
      if (user) {
        return {
          avatarUrl: user.avatarUrl || user.image || null,
          name: user.name || "User",
          role: user.role || "student",
          isPrivate: false,
        };
      }
    } catch {}

    return {
      avatarUrl: null,
      name: "User",
      role: "student",
      isPrivate: false,
    };
  },
});
