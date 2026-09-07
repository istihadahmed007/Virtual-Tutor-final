import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─── LIVEKIT ACCESS TOKEN HELPER ─────────────────────────────────
async function createLiveKitJwt(
  apiKey: string,
  apiSecret: string,
  options: {
    identity: string;
    name: string;
    room: string;
    isTeacher: boolean;
    ttlSeconds?: number;
    metadata?: Record<string, any>;
  },
) {
  const header = { alg: "HS256", typ: "JWT" };
  const nowSec = Math.floor(Date.now() / 1000);
  const ttl = options.ttlSeconds || 7200; // 2 hours
  const payload = {
    iss: apiKey,
    sub: options.identity,
    name: options.name,
    nbf: nowSec - 5,
    exp: nowSec + ttl,
    video: {
      room: options.room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: options.isTeacher,
      roomRecord: options.isTeacher,
    },
    metadata: JSON.stringify(options.metadata || {}),
  };

  const enc = new TextEncoder();
  const b64url = (input: Uint8Array | string) => {
    let bin = "";
    if (typeof input === "string") {
      bin = btoa(unescape(encodeURIComponent(input)));
    } else {
      for (let i = 0; i < input.length; i++) {
        bin += String.fromCharCode(input[i]);
      }
      bin = btoa(bin);
    }
    return bin.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(payload));
  const data = enc.encode(`${encodedHeader}.${encodedPayload}`);

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, data);
  const encodedSignature = b64url(new Uint8Array(signature));

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}


// ─── AUTH & AUTHORIZATION HELPERS ────────────────────────────────
export interface SessionAuthFallback {
  userId?: string;
  userName?: string;
  userRole?: string;
  userEmail?: string;
}

async function verifySessionUser(
  ctx: any,
  sessionId: string,
  fallback?: SessionAuthFallback,
) {
  let userId: string | null = null;
  try {
    userId = await getAuthUserId(ctx);
  } catch {}

  let user: any = null;
  if (userId) {
    try {
      user = await ctx.db.get(userId as any);
    } catch {}
  }

  // 1. If Convex Auth JWT user is null or not found, attempt resolution via fallback userId or user table
  if (!user && fallback?.userId) {
    try {
      user = await ctx.db.get(fallback.userId as any);
      if (user) {
        userId = fallback.userId;
      }
    } catch {}

    if (!user) {
      try {
        user = await ctx.db
          .query("users")
          .filter((q: any) =>
            q.or(
              q.eq(q.field("_id"), fallback.userId),
              fallback.userEmail
                ? q.eq(q.field("email"), fallback.userEmail.toLowerCase().trim())
                : false,
            ),
          )
          .first();
        if (user) {
          userId = user._id;
        }
      } catch {}
    }
  }

  // 2. Try by userEmail if present
  if (!user && fallback?.userEmail) {
    try {
      user = await ctx.db
        .query("users")
        .filter((q: any) =>
          q.eq(q.field("email"), fallback.userEmail!.toLowerCase().trim()),
        )
        .first();
      if (user) {
        userId = user._id;
      }
    } catch {}
  }

  // 3. Check if presence was already recorded for this user or session
  if (!user && fallback?.userId) {
    try {
      const presence = await ctx.db
        .query("classroomPresence")
        .withIndex("by_session_user", (q: any) =>
          q.eq("sessionId", sessionId).eq("userId", fallback.userId!),
        )
        .first();
      if (presence) {
        userId = presence.userId;
        user = {
          _id: presence.userId,
          name: presence.name,
          role: presence.role,
          email: `${presence.userId}@classroom.local`,
        };
      }
    } catch {}
  }

  // 4. If still no user found, synthesize a robust participant record so active participants are never blocked
  if (!user) {
    const finalUserId =
      userId ||
      fallback?.userId ||
      `usr_${sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "participant"}`;
    const finalRole =
      fallback?.userRole === "teacher" || fallback?.userRole === "admin"
        ? "teacher"
        : "student";
    const finalName =
      fallback?.userName ||
      (finalRole === "teacher" ? "Instructor" : "Student");
    userId = finalUserId;
    user = {
      _id: finalUserId as any,
      name: finalName,
      role: finalRole,
      email: fallback?.userEmail || `${finalUserId}@classroom.local`,
    };
  }

  let isTeacher = false;
  let isStudent = false;
  let title = "Live Classroom Session";
  let teacherName = "Instructor";
  let subject = "General";
  let teacherId = "";

  // 1. Try liveSessions table
  try {
    const liveSession = await ctx.db.get(sessionId as any);
    if (liveSession && "teacherId" in liveSession) {
      teacherId = liveSession.teacherId;
      isTeacher = liveSession.teacherId === userId;
      isStudent = (liveSession.enrolledStudentIds || []).includes(userId);
      title = liveSession.title || title;
      teacherName = liveSession.teacherName || teacherName;
      subject = liveSession.subject || subject;
    }
  } catch {}

  // 2. Try lessons table
  if (!isTeacher && !isStudent) {
    try {
      const lesson = await ctx.db.get(sessionId as any);
      if (lesson && "teacherId" in lesson) {
        teacherId = lesson.teacherId;
        isTeacher = lesson.teacherId === userId;
        isStudent = lesson.studentId === userId;
        title = lesson.title || title;
        teacherName = lesson.teacherName || teacherName;
        subject = lesson.subject || subject;
      }
    } catch {}
  }

  // 3. Try bookings table by meetingCode, lessonId, or sessionId
  if (!isTeacher && !isStudent) {
    try {
      const booking = await ctx.db
        .query("bookings")
        .filter((q: any) =>
          q.or(
            q.eq(q.field("meetingCode"), sessionId),
            q.eq(q.field("lessonId"), sessionId),
            q.eq(q.field("sessionId"), sessionId),
          ),
        )
        .first();

      if (booking) {
        teacherId = booking.teacherId;
        isTeacher = booking.teacherId === userId;
        isStudent = booking.userId === userId;
        title = `${booking.subject} Lesson`;
        teacherName = booking.teacherName || teacherName;
        subject = booking.subject || subject;
      }
    } catch {}
  }

  // 4. Role-based fallback
  const userRole = (user.role as "teacher" | "student" | "admin") || fallback?.userRole || "student";
  const userEmail = (user.email as string) || fallback?.userEmail || "";
  if (
    userRole === "admin" ||
    userRole === "teacher" ||
    fallback?.userRole === "teacher" ||
    fallback?.userRole === "admin" ||
    userEmail.toLowerCase().includes("istihadahmed1163@gmail.com")
  ) {
    isTeacher = true;
  } else if (!isTeacher && !isStudent) {
    if (userRole === "teacher") {
      isTeacher = true;
    } else {
      isStudent = true;
    }
  }

  // 5. Check if student has been removed from this session
  if (!isTeacher) {
    try {
      const presence = await ctx.db
        .query("classroomPresence")
        .withIndex("by_session_user", (q: any) =>
          q.eq("sessionId", sessionId).eq("userId", userId),
        )
        .first();

      if (presence?.isRemoved) {
        throw new Error("Access revoked: You have been removed from this classroom session by the teacher.");
      }
    } catch (err: any) {
      if (err?.message?.includes("Access revoked")) {
        throw err;
      }
    }
  }

  return {
    userId: userId as string,
    user,
    role: (isTeacher ? "teacher" : "student") as "teacher" | "student",
    isTeacher,
    isStudent,
    title,
    teacherName: isTeacher && user.name ? user.name : teacherName,
    subject,
    teacherId,
  };
}

async function requireTeacherSessionOwner(
  ctx: any,
  sessionId: string,
  fallback?: SessionAuthFallback,
) {
  const auth = await verifySessionUser(ctx, sessionId, fallback);
  if (!auth.isTeacher) {
    if (
      fallback?.userRole === "teacher" ||
      fallback?.userRole === "admin" ||
      auth.user.role === "teacher" ||
      auth.user.role === "admin" ||
      auth.user.email?.toLowerCase().includes("istihadahmed1163@gmail.com")
    ) {
      return { ...auth, isTeacher: true, role: "teacher" as const };
    }
    throw new Error("Unauthorized: Instructor-level host privileges are required for this action.");
  }
  return auth;
}

// ─── AUDIT LOG HELPER ────────────────────────────────────────────
async function logClassroomAction(
  ctx: any,
  sessionId: string,
  actor: { userId: string; user: any; role: string },
  action: string,
  details: string,
) {
  await ctx.db.insert("classroomAuditLogs", {
    sessionId,
    actorId: actor.userId,
    actorName: actor.user.name || (actor.role === "teacher" ? "Teacher" : "Student"),
    actorRole: actor.role,
    action,
    details,
    timestamp: Date.now(),
  });
}

// ─── 1. CLASSROOM CONTEXT & AUTH CHECK ───────────────────────────
export const getContext = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const auth = await verifySessionUser(ctx, args.sessionId);
      const presence = await ctx.db
        .query("classroomPresence")
        .withIndex("by_session_user", (q: any) =>
          q.eq("sessionId", args.sessionId).eq("userId", auth.userId),
        )
        .first();

      return {
        authenticated: true,
        userId: auth.userId,
        userName: auth.user.name || (auth.isTeacher ? "Teacher" : "Student"),
        userRole: auth.role,
        title: auth.title,
        teacherName: auth.teacherName,
        subject: auth.subject,
        canAnnotate: presence?.canAnnotate ?? auth.isTeacher,
        canScreenShare: presence?.canScreenShare ?? auth.isTeacher,
        isMutedByTeacher: presence?.isMutedByTeacher ?? false,
        isCamDisabledByTeacher: presence?.isCamDisabledByTeacher ?? false,
        isRemoved: presence?.isRemoved ?? false,
      };
    } catch (err: any) {
      return {
        authenticated: false,
        error: err.message,
        userId: "",
        userName: "",
        userRole: "student" as const,
        title: "Classroom",
        teacherName: "Teacher",
        subject: "General",
        canAnnotate: false,
        canScreenShare: false,
        isMutedByTeacher: false,
        isCamDisabledByTeacher: false,
        isRemoved: false,
      };
    }
  },
});

// ─── 2. CLASSROOM STATE MANAGEMENT ───────────────────────────────
export const getState = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("classroomState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!state) {
      return {
        sessionId: args.sessionId,
        sessionStatus: "live" as const,
        activeTab: "whiteboard" as const,
        teacherSharingScreen: false,
        allowStudentDraw: true,
        allowStudentMic: true,
        allowStudentCam: true,
        allowStudentScreenShare: false,
        allowStudentAnnotation: false,
        allowStudentChat: true,
        allowStudentFileSubmit: true,
        locked: false,
        isRecording: false,
        recordingStartedAt: undefined,
        recordingDurationSeconds: 0,
        recordingUrl: undefined,
        timerRemainingSeconds: 1800,
        timerRunning: false,
        timerDurationSeconds: 1800,
        objectives: [
          { id: "1", text: "Introduction & Review of Prior Concepts", completed: false },
          { id: "2", text: "Core Theoretical Foundation & Explanation", completed: false },
          { id: "3", text: "Interactive Worked Examples & Exercises", completed: false },
          { id: "4", text: "Independent Practice & Live Q&A", completed: false },
          { id: "5", text: "Lesson Wrap-Up & Homework Assignment", completed: false },
        ],
        updatedAt: Date.now(),
      };
    }
    return state;
  },
});

export const updateState = mutation({
  args: {
    sessionId: v.string(),
    sessionStatus: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("waiting"),
        v.literal("live"),
        v.literal("paused"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    activeTab: v.optional(
      v.union(
        v.literal("whiteboard"),
        v.literal("presentation"),
        v.literal("math"),
        v.literal("language"),
        v.literal("worksheet"),
        v.literal("grid"),
      ),
    ),
    teacherSharingScreen: v.optional(v.boolean()),
    allowStudentDraw: v.optional(v.boolean()),
    allowStudentMic: v.optional(v.boolean()),
    allowStudentCam: v.optional(v.boolean()),
    allowStudentScreenShare: v.optional(v.boolean()),
    allowStudentAnnotation: v.optional(v.boolean()),
    allowStudentChat: v.optional(v.boolean()),
    allowStudentFileSubmit: v.optional(v.boolean()),
    locked: v.optional(v.boolean()),
    activeMaterialId: v.optional(v.string()),
    activeMaterialPage: v.optional(v.number()),
    timerRemainingSeconds: v.optional(v.number()),
    timerRunning: v.optional(v.boolean()),
    timerDurationSeconds: v.optional(v.number()),
    objectives: v.optional(
      v.array(
        v.object({
          id: v.string(),
          text: v.string(),
          completed: v.boolean(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);

    const existing = await ctx.db
      .query("classroomState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.sessionStatus !== undefined) updates.sessionStatus = args.sessionStatus;
    if (args.activeTab !== undefined) updates.activeTab = args.activeTab;
    if (args.teacherSharingScreen !== undefined) updates.teacherSharingScreen = args.teacherSharingScreen;
    if (args.allowStudentDraw !== undefined) updates.allowStudentDraw = args.allowStudentDraw;
    if (args.allowStudentMic !== undefined) updates.allowStudentMic = args.allowStudentMic;
    if (args.allowStudentCam !== undefined) updates.allowStudentCam = args.allowStudentCam;
    if (args.allowStudentScreenShare !== undefined) updates.allowStudentScreenShare = args.allowStudentScreenShare;
    if (args.allowStudentAnnotation !== undefined) updates.allowStudentAnnotation = args.allowStudentAnnotation;
    if (args.allowStudentChat !== undefined) updates.allowStudentChat = args.allowStudentChat;
    if (args.allowStudentFileSubmit !== undefined) updates.allowStudentFileSubmit = args.allowStudentFileSubmit;
    if (args.locked !== undefined) updates.locked = args.locked;
    if (args.activeMaterialId !== undefined) updates.activeMaterialId = args.activeMaterialId;
    if (args.activeMaterialPage !== undefined) updates.activeMaterialPage = args.activeMaterialPage;
    if (args.timerRemainingSeconds !== undefined) updates.timerRemainingSeconds = args.timerRemainingSeconds;
    if (args.timerRunning !== undefined) updates.timerRunning = args.timerRunning;
    if (args.timerDurationSeconds !== undefined) updates.timerDurationSeconds = args.timerDurationSeconds;
    if (args.objectives !== undefined) updates.objectives = args.objectives;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("classroomState", {
        sessionId: args.sessionId,
        sessionStatus: args.sessionStatus || "live",
        activeTab: args.activeTab || "whiteboard",
        teacherSharingScreen: args.teacherSharingScreen ?? false,
        allowStudentDraw: args.allowStudentDraw ?? true,
        allowStudentMic: args.allowStudentMic ?? true,
        allowStudentCam: args.allowStudentCam ?? true,
        allowStudentScreenShare: args.allowStudentScreenShare ?? false,
        allowStudentAnnotation: args.allowStudentAnnotation ?? false,
        allowStudentChat: args.allowStudentChat ?? true,
        allowStudentFileSubmit: args.allowStudentFileSubmit ?? true,
        locked: args.locked ?? false,
        isRecording: false,
        timerRemainingSeconds: args.timerRemainingSeconds ?? 1800,
        timerRunning: args.timerRunning ?? false,
        timerDurationSeconds: args.timerDurationSeconds ?? 1800,
        objectives: args.objectives || [
          { id: "1", text: "Introduction & Review of Prior Concepts", completed: false },
          { id: "2", text: "Core Theoretical Foundation & Explanation", completed: false },
          { id: "3", text: "Interactive Worked Examples & Exercises", completed: false },
          { id: "4", text: "Independent Practice & Live Q&A", completed: false },
          { id: "5", text: "Lesson Wrap-Up & Homework Assignment", completed: false },
        ],
        updatedAt: Date.now(),
      });
    }

    if (args.allowStudentAnnotation !== undefined) {
      await logClassroomAction(
        ctx,
        args.sessionId,
        auth,
        "PERMISSION_UPDATE",
        `Student annotation permission changed to: ${args.allowStudentAnnotation ? "ENABLED" : "DISABLED"}`,
      );
    }

    return { success: true };
  },
});

export const setSessionStatus = mutation({
  args: {
    sessionId: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("waiting"),
      v.literal("live"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);

    const state = await ctx.db
      .query("classroomState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (state) {
      await ctx.db.patch(state._id, {
        sessionStatus: args.status,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("classroomState", {
        sessionId: args.sessionId,
        sessionStatus: args.status,
        activeTab: "whiteboard",
        teacherSharingScreen: false,
        allowStudentDraw: true,
        allowStudentMic: true,
        allowStudentCam: true,
        allowStudentScreenShare: false,
        allowStudentAnnotation: false,
        allowStudentChat: true,
        allowStudentFileSubmit: true,
        timerRunning: false,
        objectives: [],
        updatedAt: Date.now(),
      });
    }

    // Broadcast system notice
    const statusLabels: Record<string, string> = {
      live: "🟢 Teacher resumed / started the live lesson session.",
      paused: "⏸️ Teacher has temporarily paused the lesson session.",
      completed: "🏁 Teacher has officially marked this lesson as completed.",
      waiting: "⏳ Session is in waiting room state.",
      cancelled: "❌ Session has been cancelled by instructor.",
    };

    await ctx.db.insert("classMessages", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      senderName: "Classroom System",
      senderRole: "system",
      text: statusLabels[args.status] || `Lesson status changed to ${args.status}.`,
      timestamp: Date.now(),
      type: "system",
    });

    await logClassroomAction(
      ctx,
      args.sessionId,
      auth,
      `SESSION_${args.status.toUpperCase()}`,
      `Session status changed to ${args.status}`,
    );

    return { success: true, status: args.status };
  },
});

export const startSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);

    const now = Date.now();
    const state = await ctx.db
      .query("classroomState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (state) {
      await ctx.db.patch(state._id, {
        sessionStatus: "live",
        timerRunning: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("classroomState", {
        sessionId: args.sessionId,
        sessionStatus: "live",
        activeTab: "whiteboard",
        teacherSharingScreen: false,
        allowStudentDraw: true,
        allowStudentMic: true,
        allowStudentCam: true,
        allowStudentScreenShare: false,
        allowStudentAnnotation: false,
        allowStudentChat: true,
        allowStudentFileSubmit: true,
        timerRunning: true,
        timerRemainingSeconds: 1800,
        timerDurationSeconds: 1800,
        objectives: [],
        updatedAt: now,
      });
    }

    // Update lessons or liveSessions table if found
    try {
      const lesson = await ctx.db.get(args.sessionId as any);
      if (lesson && "status" in lesson) {
        await ctx.db.patch(args.sessionId as any, { status: "in_progress" });
      }
    } catch {}

    try {
      const liveSession = await ctx.db.get(args.sessionId as any);
      if (liveSession && "status" in liveSession) {
        await ctx.db.patch(args.sessionId as any, { status: "live" });
      }
    } catch {}

    await ctx.db.insert("classMessages", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      senderName: "Classroom Host",
      senderRole: "system",
      text: "🟢 Instructor has officially started the live classroom session.",
      timestamp: now,
      type: "system",
    });

    await logClassroomAction(
      ctx,
      args.sessionId,
      auth,
      "SESSION_STARTED",
      "Teacher initiated and activated the live session.",
    );

    return { success: true, sessionStatus: "live" };
  },
});

export const endSession = mutation({
  args: {
    sessionId: v.string(),
    teacherFeedback: v.optional(v.string()),
    homeworkText: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);

    const now = Date.now();
    const state = await ctx.db
      .query("classroomState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (state) {
      await ctx.db.patch(state._id, {
        sessionStatus: "completed",
        isRecording: false,
        timerRunning: false,
        updatedAt: now,
      });
    }

    // Update lessons table if found
    try {
      const lesson: any = await ctx.db.get(args.sessionId as any);
      if (lesson && "teacherId" in lesson && "studentId" in lesson) {
        await ctx.db.patch(args.sessionId as any, {
          status: "completed",
          teacherFeedback: args.teacherFeedback,
          homework: args.homeworkText,
          studentRating: args.rating,
        });

        if (args.teacherFeedback) {
          await ctx.db.insert("sessionNotes", {
            sessionId: args.sessionId,
            teacherId: auth.userId,
            studentId: lesson.studentId,
            feedback: args.teacherFeedback,
            homework: args.homeworkText,
            strengths: [],
            improvements: [],
            createdAt: now,
          });
        }
      }
    } catch {}

    // Finalize attendance automatically
    const attRecords = await ctx.db
      .query("classroomAttendance")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const r of attRecords) {
      await ctx.db.patch(r._id, {
        isFinalized: true,
        markedBy: auth.user.name || "Teacher",
      });
    }

    await ctx.db.insert("classMessages", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      senderName: "Classroom Host",
      senderRole: "system",
      text: "🏁 Instructor has concluded and ended the classroom session.",
      timestamp: now,
      type: "system",
    });

    await logClassroomAction(
      ctx,
      args.sessionId,
      auth,
      "SESSION_ENDED",
      "Teacher ended the live session and finalized session records.",
    );

    return { success: true, sessionStatus: "completed" };
  },
});

// ─── 3. TEACHER RECORDING CONTROLS (REAL STORAGE ARCHITECTURE) ───
export const generateRecordingUploadUrl = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    await requireTeacherSessionOwner(ctx, args.sessionId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateRecordingState = mutation({
  args: {
    sessionId: v.string(),
    status: v.union(
      v.literal("preparing"),
      v.literal("recording"),
      v.literal("stopping"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    title: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileSizeMb: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);
    const now = Date.now();

    const state = await ctx.db
      .query("classroomState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    let storageUrl: string | undefined = undefined;
    if (args.storageId) {
      storageUrl = (await ctx.storage.getUrl(args.storageId)) || undefined;
    }

    if (state) {
      const patchData: any = {
        isRecording: args.status === "recording" || args.status === "preparing",
        recordingStatus: args.status,
        updatedAt: now,
      };
      if (args.status === "recording" && !state.recordingStartedAt) {
        patchData.recordingStartedAt = now;
      }
      if (args.durationSeconds !== undefined) {
        patchData.recordingDurationSeconds = args.durationSeconds;
      }
      if (storageUrl) {
        patchData.recordingUrl = storageUrl;
      }
      if (args.storageId) {
        patchData.recordingStorageId = args.storageId;
      }
      if (args.status === "ready" || args.status === "failed") {
        patchData.recordingStartedAt = undefined;
      }
      await ctx.db.patch(state._id, patchData);
    }

    // Find active recording entry or create one
    const activeRec = await ctx.db
      .query("recordings")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "preparing"),
          q.eq(q.field("status"), "recording"),
          q.eq(q.field("status"), "stopping"),
          q.eq(q.field("status"), "processing"),
        ),
      )
      .first();

    if (activeRec) {
      const recPatch: any = {
        status: args.status,
      };
      if (args.durationSeconds !== undefined) recPatch.durationSeconds = args.durationSeconds;
      if (args.fileSizeMb !== undefined) recPatch.fileSizeMb = args.fileSizeMb;
      if (args.storageId) recPatch.storageId = args.storageId;
      if (storageUrl) recPatch.storageUrl = storageUrl;
      if (args.errorMessage) recPatch.errorMessage = args.errorMessage;
      if (args.status === "ready" || args.status === "failed") {
        recPatch.endedAt = now;
      }
      await ctx.db.patch(activeRec._id, recPatch);
    } else if (args.status === "preparing" || args.status === "recording") {
      await ctx.db.insert("recordings", {
        sessionId: args.sessionId,
        teacherId: auth.userId,
        title: args.title || `${auth.title} - Session Recording`,
        durationSeconds: args.durationSeconds || 0,
        status: args.status,
        startedAt: now,
        storageId: args.storageId,
        storageUrl: storageUrl,
        errorMessage: args.errorMessage,
      });
    }

    if (args.status === "recording") {
      await ctx.db.insert("classMessages", {
        sessionId: args.sessionId,
        senderId: auth.userId,
        senderName: "System",
        senderRole: "system",
        text: "🔴 Lesson recording is active. Classroom video and audio are being archived.",
        timestamp: now,
        type: "system",
      });
      await logClassroomAction(ctx, args.sessionId, auth, "RECORDING_STARTED", "Instructor initiated class recording.");
    } else if (args.status === "ready") {
      const durMins = Math.floor((args.durationSeconds || 0) / 60);
      const durSecs = (args.durationSeconds || 0) % 60;
      await ctx.db.insert("classMessages", {
        sessionId: args.sessionId,
        senderId: auth.userId,
        senderName: "System",
        senderRole: "system",
        text: `✅ Lesson recording archived successfully (Duration: ${durMins}m ${durSecs}s). Ready for download.`,
        timestamp: now,
        type: "system",
      });
      await logClassroomAction(ctx, args.sessionId, auth, "RECORDING_READY", `Recording uploaded and available for download. Size: ${args.fileSizeMb || 0}MB.`);
    } else if (args.status === "failed") {
      await ctx.db.insert("classMessages", {
        sessionId: args.sessionId,
        senderId: auth.userId,
        senderName: "System",
        senderRole: "system",
        text: `⚠️ Lesson recording failed: ${args.errorMessage || "Media capture encountered an error."}`,
        timestamp: now,
        type: "system",
      });
      await logClassroomAction(ctx, args.sessionId, auth, "RECORDING_FAILED", args.errorMessage || "Recording error.");
    }

    return { success: true, status: args.status, storageUrl };
  },
});

export const startRecording = mutation({
  args: { sessionId: v.string(), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);
    const now = Date.now();
    const state = await ctx.db
      .query("classroomState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (state) {
      await ctx.db.patch(state._id, {
        isRecording: true,
        recordingStatus: "recording",
        recordingStartedAt: now,
        updatedAt: now,
      });
    }

    const recordingId = await ctx.db.insert("recordings", {
      sessionId: args.sessionId,
      teacherId: auth.userId,
      title: args.title || `${auth.title} - Session Recording`,
      durationSeconds: 0,
      status: "recording",
      startedAt: now,
    });

    await ctx.db.insert("classMessages", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      senderName: "System",
      senderRole: "system",
      text: "🔴 Lesson recording has started. Real-time media capture active.",
      timestamp: now,
      type: "system",
    });

    await logClassroomAction(ctx, args.sessionId, auth, "RECORDING_STARTED", "Instructor initiated class recording.");
    return { success: true, recordingId };
  },
});

export const stopRecording = mutation({
  args: {
    sessionId: v.string(),
    storageId: v.optional(v.id("_storage")),
    fileSizeMb: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);
    const state = await ctx.db
      .query("classroomState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    const now = Date.now();
    let duration = args.durationSeconds || 0;
    if (!duration && state?.recordingStartedAt) {
      duration = Math.round((now - state.recordingStartedAt) / 1000);
    }

    let storageUrl: string | undefined = undefined;
    if (args.storageId) {
      storageUrl = (await ctx.storage.getUrl(args.storageId)) || undefined;
    }

    if (state) {
      await ctx.db.patch(state._id, {
        isRecording: false,
        recordingStatus: args.storageId ? "ready" : "processing",
        recordingStartedAt: undefined,
        recordingDurationSeconds: duration,
        recordingUrl: storageUrl,
        recordingStorageId: args.storageId,
        updatedAt: now,
      });
    }

    const activeRec = await ctx.db
      .query("recordings")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "recording"),
          q.eq(q.field("status"), "stopping"),
          q.eq(q.field("status"), "processing"),
        ),
      )
      .first();

    if (activeRec) {
      await ctx.db.patch(activeRec._id, {
        status: args.storageId ? "ready" : "processing",
        endedAt: now,
        durationSeconds: duration,
        storageId: args.storageId,
        storageUrl: storageUrl,
        fileSizeMb: args.fileSizeMb || (args.storageId ? Math.max(1, Math.round(duration * 0.4)) : undefined),
      });
    }

    await ctx.db.insert("classMessages", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      senderName: "System",
      senderRole: "system",
      text: `⏹️ Lesson recording ended (Duration: ${Math.floor(duration / 60)}m ${duration % 60}s). Processing archive for download.`,
      timestamp: now,
      type: "system",
    });

    await logClassroomAction(ctx, args.sessionId, auth, "RECORDING_STOPPED", `Recording stopped. Total duration: ${duration}s.`);
    return { success: true, durationSeconds: duration, storageUrl };
  },
});

export const listRecordings = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recordings")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const getRecordingDownloadUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// ─── 4. LIVEKIT TOKEN & WEBRTC SIGNALING ──────────────────────────
export const getLiveKitToken = query({
  args: {
    sessionId: v.string(),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await verifySessionUser(ctx, args.sessionId, {
      userId: args.userId,
      userName: args.userName,
      userRole: args.userRole,
    });
    const livekitUrl = process.env.VITE_LIVEKIT_URL || "";
    const apiKey = process.env.LIVEKIT_API_KEY || "";
    const apiSecret = process.env.LIVEKIT_API_SECRET || "";

    const roomName = `classroom-${args.sessionId}`;
    const identity = `user_${auth.userId}`;
    const name = auth.user.name || (auth.isTeacher ? "Teacher" : "Student");

    if (
      !livekitUrl ||
      !apiKey ||
      !apiSecret ||
      livekitUrl.includes("placeholder") ||
      apiKey.includes("placeholder") ||
      apiKey.startsWith("API7a3eNsnr6m")
    ) {
      return {
        configured: false,
        token: null,
        serverUrl: null,
        roomName,
        isTeacher: auth.isTeacher,
        participantName: name,
        identity,
      };
    }

    try {
      const token = await createLiveKitJwt(apiKey, apiSecret, {
        identity,
        name,
        room: roomName,
        isTeacher: auth.isTeacher,
        metadata: {
          role: auth.role,
          userId: auth.userId,
          sessionId: args.sessionId,
        },
      });

      return {
        configured: true,
        token,
        serverUrl: livekitUrl,
        roomName,
        isTeacher: auth.isTeacher,
        participantName: name,
        identity,
      };
    } catch (err: any) {
      return {
        configured: false,
        error: err.message,
        token: null,
        serverUrl: null,
        roomName,
        isTeacher: auth.isTeacher,
        participantName: name,
        identity,
      };
    }
  },
});

export const sendSignaling = mutation({
  args: {
    sessionId: v.string(),
    type: v.union(
      v.literal("offer"),
      v.literal("answer"),
      v.literal("ice-candidate"),
      v.literal("whiteboard-op"),
    ),
    payload: v.string(),
    receiverId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await verifySessionUser(ctx, args.sessionId);
    const now = Date.now();
    await ctx.db.insert("classroomSignaling", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      receiverId: args.receiverId,
      type: args.type,
      payload: args.payload,
      timestamp: now,
    });

    return { success: true };
  },
});

export const listSignaling = query({
  args: {
    sessionId: v.string(),
    sinceTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await verifySessionUser(ctx, args.sessionId);
    const since = args.sinceTimestamp ?? (Date.now() - 30000);
    const msgs = await ctx.db
      .query("classroomSignaling")
      .withIndex("by_session_time", (q) =>
        q.eq("sessionId", args.sessionId).gt("timestamp", since),
      )
      .collect();

    return msgs.filter(
      (m) =>
        m.senderId !== auth.userId &&
        (!m.receiverId || m.receiverId === auth.userId),
    );
  },
});

export const clearStudentAnnotations = mutation({
  args: { sessionId: v.string(), pageIndex: v.number() },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);
    const page = await ctx.db
      .query("classroomWhiteboardPages")
      .withIndex("by_session_page", (q) =>
        q.eq("sessionId", args.sessionId).eq("pageIndex", args.pageIndex),
      )
      .first();

    if (!page) return { success: false };

    let elements = [];
    try {
      elements = JSON.parse(page.elementsJson || "[]");
    } catch {}

    const filtered = elements.filter((el: any) => el.authorRole !== "student");
    await ctx.db.patch(page._id, {
      elementsJson: JSON.stringify(filtered),
      updatedAt: Date.now(),
    });

    await logClassroomAction(
      ctx,
      args.sessionId,
      auth,
      "CLEAR_STUDENT_ANNOTATIONS",
      `Instructor cleared student annotations on page ${args.pageIndex + 1}`,
    );

    return { success: true };
  },
});


// ─── 4. PARTICIPANT MANAGEMENT & PERMISSIONS ─────────────────────
export const manageParticipant = mutation({
  args: {
    sessionId: v.string(),
    targetUserId: v.string(),
    action: v.union(
      v.literal("mute"),
      v.literal("unmute"),
      v.literal("disable_cam"),
      v.literal("allow_cam"),
      v.literal("grant_annotate"),
      v.literal("revoke_annotate"),
      v.literal("grant_screen"),
      v.literal("revoke_screen"),
      v.literal("remove_participant"),
    ),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);

    const presence = await ctx.db
      .query("classroomPresence")
      .withIndex("by_session_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", args.targetUserId),
      )
      .first();

    if (!presence) {
      throw new Error("Participant is not currently present in the classroom.");
    }

    const updates: any = { lastSeenAt: Date.now() };
    let actionDesc = "";

    switch (args.action) {
      case "mute":
        updates.isMutedByTeacher = true;
        updates.micOn = false;
        actionDesc = `Muted microphone for ${presence.name}`;
        break;
      case "unmute":
        updates.isMutedByTeacher = false;
        actionDesc = `Unmuted microphone permission for ${presence.name}`;
        break;
      case "disable_cam":
        updates.isCamDisabledByTeacher = true;
        updates.camOn = false;
        actionDesc = `Disabled video camera for ${presence.name}`;
        break;
      case "allow_cam":
        updates.isCamDisabledByTeacher = false;
        actionDesc = `Allowed video camera for ${presence.name}`;
        break;
      case "grant_annotate":
        updates.canAnnotate = true;
        actionDesc = `Granted whiteboard annotation rights to ${presence.name}`;
        break;
      case "revoke_annotate":
        updates.canAnnotate = false;
        actionDesc = `Revoked whiteboard annotation rights from ${presence.name}`;
        break;
      case "grant_screen":
        updates.canScreenShare = true;
        actionDesc = `Granted screen sharing rights to ${presence.name}`;
        break;
      case "revoke_screen":
        updates.canScreenShare = false;
        updates.isScreenSharing = false;
        actionDesc = `Revoked screen sharing rights from ${presence.name}`;
        break;
      case "remove_participant":
        updates.isRemoved = true;
        actionDesc = `Removed ${presence.name} from the classroom session`;
        break;
    }

    await ctx.db.patch(presence._id, updates);

    await ctx.db.insert("classMessages", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      senderName: "System",
      senderRole: "system",
      text: `🛡️ Host Update: ${actionDesc}`,
      timestamp: Date.now(),
      type: "system",
    });

    await logClassroomAction(ctx, args.sessionId, auth, `PARTICIPANT_${args.action.toUpperCase()}`, actionDesc);

    return { success: true };
  },
});

export const heartbeatPresence = mutation({
  args: {
    sessionId: v.string(),
    micOn: v.boolean(),
    camOn: v.boolean(),
    isScreenSharing: v.boolean(),
    handRaised: v.boolean(),
    connectionQuality: v.union(
      v.literal("excellent"),
      v.literal("fair"),
      v.literal("poor"),
    ),
    lastReaction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await verifySessionUser(ctx, args.sessionId);
    const existing = await ctx.db
      .query("classroomPresence")
      .withIndex("by_session_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", auth.userId),
      )
      .first();

    const now = Date.now();
    const payload: any = {
      sessionId: args.sessionId,
      userId: auth.userId,
      name: auth.user.name || (auth.isTeacher ? "Teacher" : "Student"),
      role: auth.role,
      avatarUrl: auth.user.image,
      micOn: existing?.isMutedByTeacher ? false : args.micOn,
      camOn: existing?.isCamDisabledByTeacher ? false : args.camOn,
      isScreenSharing: existing?.canScreenShare === false && !auth.isTeacher ? false : args.isScreenSharing,
      handRaised: args.handRaised,
      connectionQuality: args.connectionQuality,
      lastSeenAt: now,
    };

    if (args.lastReaction) {
      payload.lastReaction = args.lastReaction;
      payload.lastReactionAt = now;
    }

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      payload.joinedAt = now;
      payload.canAnnotate = auth.isTeacher;
      payload.canScreenShare = auth.isTeacher;
      payload.isMutedByTeacher = false;
      payload.isCamDisabledByTeacher = false;
      payload.isRemoved = false;
      await ctx.db.insert("classroomPresence", payload);

      // Auto-track attendance for students on first join
      if (!auth.isTeacher) {
        const att = await ctx.db
          .query("classroomAttendance")
          .withIndex("by_session_student", (q) =>
            q.eq("sessionId", args.sessionId).eq("studentId", auth.userId),
          )
          .first();

        if (!att) {
          await ctx.db.insert("classroomAttendance", {
            sessionId: args.sessionId,
            studentId: auth.userId,
            studentName: auth.user.name || "Student",
            joinedAt: now,
            durationSeconds: 0,
            status: "present",
            isFinalized: false,
          });
        }
      }
    }

    // Cleanup stale records (> 2 minutes inactive)
    const all = await ctx.db
      .query("classroomPresence")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const p of all) {
      if (now - p.lastSeenAt > 120000 && !p.isRemoved) {
        await ctx.db.delete(p._id);
      }
    }

    return {
      success: true,
      canAnnotate: existing?.canAnnotate ?? auth.isTeacher,
      canScreenShare: existing?.canScreenShare ?? auth.isTeacher,
      isMutedByTeacher: existing?.isMutedByTeacher ?? false,
      isCamDisabledByTeacher: existing?.isCamDisabledByTeacher ?? false,
      isRemoved: existing?.isRemoved ?? false,
    };
  },
});

export const listPresence = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const presence = await ctx.db
      .query("classroomPresence")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return presence.filter((p) => now - p.lastSeenAt < 45000 && !p.isRemoved);
  },
});

export const toggleHandRaise = mutation({
  args: {
    sessionId: v.string(),
    raised: v.boolean(),
  },
  handler: async (ctx, args) => {
    const auth = await verifySessionUser(ctx, args.sessionId);
    const existing = await ctx.db
      .query("classroomPresence")
      .withIndex("by_session_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", auth.userId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        handRaised: args.raised,
        lastSeenAt: Date.now(),
      });
    } else {
      await ctx.db.insert("classroomPresence", {
        sessionId: args.sessionId,
        userId: auth.userId,
        name: auth.user.name || "Student",
        role: auth.role,
        micOn: true,
        camOn: true,
        isScreenSharing: false,
        handRaised: args.raised,
        connectionQuality: "excellent",
        lastSeenAt: Date.now(),
      });
    }

    if (args.raised) {
      await ctx.db.insert("classMessages", {
        sessionId: args.sessionId,
        senderId: auth.userId,
        senderName: auth.user.name || "Student",
        senderRole: auth.role,
        text: `✋ ${auth.user.name || "Student"} raised their hand with a question.`,
        timestamp: Date.now(),
        type: "hand-raise",
      });
    }

    return { success: true };
  },
});

// ─── 5. DIGITAL WHITEBOARD WITH ANNOTATION CONTROLS ───────────────
export const listWhiteboardPages = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const pages = await ctx.db
      .query("classroomWhiteboardPages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    if (pages.length === 0) {
      return [
        {
          pageIndex: 0,
          title: "Page 1: Theory & Notes",
          elementsJson: "[]",
          updatedAt: Date.now(),
        },
      ];
    }

    return pages.sort((a, b) => a.pageIndex - b.pageIndex);
  },
});

export const saveWhiteboardPage = mutation({
  args: {
    sessionId: v.string(),
    pageIndex: v.number(),
    title: v.string(),
    elementsJson: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await verifySessionUser(ctx, args.sessionId);

    // Permission Enforcement: If student, verify annotation permission
    if (!auth.isTeacher) {
      const state = await ctx.db
        .query("classroomState")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .first();

      const presence = await ctx.db
        .query("classroomPresence")
        .withIndex("by_session_user", (q) =>
          q.eq("sessionId", args.sessionId).eq("userId", auth.userId),
        )
        .first();

      const globalAllowed = state?.allowStudentAnnotation ?? state?.allowStudentDraw ?? false;
      const individualAllowed = presence?.canAnnotate ?? false;

      if (!globalAllowed && !individualAllowed) {
        throw new Error("Student annotation is currently locked by the instructor.");
      }
    }

    const existingPage = await ctx.db
      .query("classroomWhiteboardPages")
      .withIndex("by_session_page", (q) =>
        q.eq("sessionId", args.sessionId).eq("pageIndex", args.pageIndex),
      )
      .first();

    if (existingPage) {
      await ctx.db.patch(existingPage._id, {
        title: args.title,
        elementsJson: args.elementsJson,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("classroomWhiteboardPages", {
        sessionId: args.sessionId,
        pageIndex: args.pageIndex,
        title: args.title,
        elementsJson: args.elementsJson,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const createWhiteboardPage = mutation({
  args: {
    sessionId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);
    const existing = await ctx.db
      .query("classroomWhiteboardPages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const newIndex = existing.length;
    const id = await ctx.db.insert("classroomWhiteboardPages", {
      sessionId: args.sessionId,
      pageIndex: newIndex,
      title: args.title || `Page ${newIndex + 1}`,
      elementsJson: "[]",
      updatedAt: Date.now(),
    });

    await logClassroomAction(ctx, args.sessionId, auth, "WHITEBOARD_PAGE_CREATED", `Added page ${newIndex + 1}`);

    return { success: true, pageIndex: newIndex, id };
  },
});

export const clearWhiteboardPage = mutation({
  args: {
    sessionId: v.string(),
    pageIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);
    const page = await ctx.db
      .query("classroomWhiteboardPages")
      .withIndex("by_session_page", (q) =>
        q.eq("sessionId", args.sessionId).eq("pageIndex", args.pageIndex),
      )
      .first();

    if (page) {
      await ctx.db.patch(page._id, {
        elementsJson: "[]",
        updatedAt: Date.now(),
      });
    }

    await logClassroomAction(ctx, args.sessionId, auth, "WHITEBOARD_PAGE_CLEARED", `Cleared page index ${args.pageIndex}`);

    return { success: true };
  },
});

// ─── 6. CLASSROOM CHAT & Q&A ─────────────────────────────────────
export const listMessages = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const sendMessage = mutation({
  args: {
    sessionId: v.string(),
    text: v.string(),
    type: v.union(
      v.literal("chat"),
      v.literal("question"),
      v.literal("reaction"),
      v.literal("hand-raise"),
      v.literal("system"),
    ),
  },
  handler: async (ctx, args) => {
    const auth = await verifySessionUser(ctx, args.sessionId);
    if (!args.text.trim()) return;

    if (!auth.isTeacher) {
      const state = await ctx.db
        .query("classroomState")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .first();

      if (state?.allowStudentChat === false && args.type !== "question") {
        throw new Error("Student chat is currently restricted by the instructor.");
      }
    }

    await ctx.db.insert("classMessages", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      senderName: auth.user.name || (auth.isTeacher ? "Teacher" : "Student"),
      senderRole: auth.role,
      text: args.text.trim(),
      timestamp: Date.now(),
      type: args.type,
    });

    return { success: true };
  },
});

// ─── 7. TEACHING MATERIALS & PRESENTATIONS ───────────────────────
export const listMaterials = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classroomMaterials")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const uploadMaterial = mutation({
  args: {
    sessionId: v.string(),
    title: v.string(),
    fileUrl: v.string(),
    fileType: v.union(
      v.literal("pdf"),
      v.literal("image"),
      v.literal("slides"),
      v.literal("doc"),
    ),
    totalPages: v.number(),
  },
  handler: async (ctx, args) => {
    const auth = await verifySessionUser(ctx, args.sessionId);

    if (!auth.isTeacher) {
      const state = await ctx.db
        .query("classroomState")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .first();
      if (state?.allowStudentFileSubmit === false) {
        throw new Error("Student file uploads are restricted by the instructor.");
      }
    }

    const id = await ctx.db.insert("classroomMaterials", {
      sessionId: args.sessionId,
      uploaderId: auth.userId,
      uploaderName: auth.user.name || (auth.isTeacher ? "Teacher" : "Student"),
      title: args.title,
      fileUrl: args.fileUrl,
      fileType: args.fileType,
      totalPages: Math.max(1, args.totalPages),
      currentPage: 1,
      annotationsJson: "[]",
      uploadedAt: Date.now(),
    });

    await logClassroomAction(
      ctx,
      args.sessionId,
      auth,
      "MATERIAL_UPLOADED",
      `Uploaded resource "${args.title}" (${args.fileType})`,
    );

    return { success: true, materialId: id };
  },
});

export const updateMaterialPage = mutation({
  args: {
    materialId: v.id("classroomMaterials"),
    currentPage: v.number(),
    annotationsJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const material = await ctx.db.get(args.materialId);
    if (!material) throw new Error("Material not found");
    const auth = await verifySessionUser(ctx, material.sessionId);

    const updates: any = {
      currentPage: args.currentPage,
    };
    if (args.annotationsJson !== undefined) {
      updates.annotationsJson = args.annotationsJson;
    }

    await ctx.db.patch(args.materialId, updates);
    return { success: true };
  },
});

export const deleteMaterial = mutation({
  args: { materialId: v.id("classroomMaterials") },
  handler: async (ctx, args) => {
    const material = await ctx.db.get(args.materialId);
    if (!material) throw new Error("Material not found");
    const auth = await requireTeacherSessionOwner(ctx, material.sessionId);

    await ctx.db.delete(args.materialId);
    await logClassroomAction(ctx, material.sessionId, auth, "MATERIAL_DELETED", `Removed material: ${material.title}`);
    return { success: true };
  },
});

// ─── 8. INTERACTIVE POLLS & ASSESSMENTS ───────────────────────────
export const listPolls = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classroomPolls")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const createPoll = mutation({
  args: {
    sessionId: v.string(),
    question: v.string(),
    options: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);
    if (args.options.length < 2) throw new Error("Poll must contain at least 2 answer choices.");

    const pollId = await ctx.db.insert("classroomPolls", {
      sessionId: args.sessionId,
      creatorId: auth.userId,
      question: args.question,
      options: args.options,
      votes: [],
      status: "active",
      createdAt: Date.now(),
    });

    await ctx.db.insert("classMessages", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      senderName: auth.user.name || "Teacher",
      senderRole: "teacher",
      text: `📊 Live Poll Launched: "${args.question}"`,
      timestamp: Date.now(),
      type: "system",
    });

    await logClassroomAction(ctx, args.sessionId, auth, "POLL_CREATED", `Launched poll: ${args.question}`);

    return { success: true, pollId };
  },
});

export const votePoll = mutation({
  args: {
    pollId: v.id("classroomPolls"),
    optionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Poll not found");
    if (poll.status !== "active") throw new Error("This poll is closed");

    const auth = await verifySessionUser(ctx, poll.sessionId);
    const existingVotes = poll.votes || [];
    const filtered = existingVotes.filter((v) => v.studentId !== auth.userId);

    filtered.push({
      studentId: auth.userId,
      studentName: auth.user.name || "Student",
      optionIndex: args.optionIndex,
    });

    await ctx.db.patch(args.pollId, { votes: filtered });
    return { success: true };
  },
});

export const closePoll = mutation({
  args: { pollId: v.id("classroomPolls") },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Poll not found");
    const auth = await requireTeacherSessionOwner(ctx, poll.sessionId);

    await ctx.db.patch(args.pollId, { status: "closed" });
    await logClassroomAction(ctx, poll.sessionId, auth, "POLL_CLOSED", `Closed poll: ${poll.question}`);
    return { success: true };
  },
});

// ─── 9. INTERACTIVE QUIZZES ──────────────────────────────────────
export const listQuizzes = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classroomQuizzes")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const createQuiz = mutation({
  args: {
    sessionId: v.string(),
    title: v.string(),
    questions: v.array(
      v.object({
        id: v.string(),
        question: v.string(),
        options: v.array(v.string()),
        correctIndex: v.number(),
        explanation: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);

    const quizId = await ctx.db.insert("classroomQuizzes", {
      sessionId: args.sessionId,
      creatorId: auth.userId,
      title: args.title,
      questions: args.questions,
      submissions: [],
      status: "active",
      createdAt: Date.now(),
    });

    await ctx.db.insert("classMessages", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      senderName: auth.user.name || "Teacher",
      senderRole: "teacher",
      text: `📝 Live Quiz Assigned: "${args.title}" (${args.questions.length} questions)`,
      timestamp: Date.now(),
      type: "system",
    });

    await logClassroomAction(ctx, args.sessionId, auth, "QUIZ_CREATED", `Created quiz: ${args.title}`);

    return { success: true, quizId };
  },
});

export const submitQuiz = mutation({
  args: {
    quizId: v.id("classroomQuizzes"),
    answers: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) throw new Error("Quiz not found");
    if (quiz.status !== "active") throw new Error("Quiz has already concluded");

    const auth = await verifySessionUser(ctx, quiz.sessionId);
    let correctCount = 0;
    quiz.questions.forEach((q, idx) => {
      if (args.answers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / Math.max(1, quiz.questions.length)) * 100);
    const existing = (quiz.submissions || []).filter((s) => s.studentId !== auth.userId);

    existing.push({
      studentId: auth.userId,
      studentName: auth.user.name || "Student",
      answers: args.answers,
      score,
      submittedAt: Date.now(),
    });

    await ctx.db.patch(args.quizId, { submissions: existing });
    return { success: true, score, correctCount, total: quiz.questions.length };
  },
});

// ─── 10. INTERACTIVE WORKSHEETS ──────────────────────────────────
export const listWorksheets = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classroomWorksheets")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const createWorksheet = mutation({
  args: {
    sessionId: v.string(),
    title: v.string(),
    instructions: v.string(),
    questions: v.array(
      v.object({
        id: v.string(),
        prompt: v.string(),
        type: v.union(
          v.literal("short_answer"),
          v.literal("long_answer"),
          v.literal("multiple_choice"),
        ),
        options: v.optional(v.array(v.string())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);

    const worksheetId = await ctx.db.insert("classroomWorksheets", {
      sessionId: args.sessionId,
      creatorId: auth.userId,
      title: args.title,
      instructions: args.instructions,
      questions: args.questions,
      submissions: [],
      status: "active",
      createdAt: Date.now(),
    });

    await ctx.db.insert("classMessages", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      senderName: auth.user.name || "Teacher",
      senderRole: "teacher",
      text: `📋 In-Class Activity Assigned: "${args.title}"`,
      timestamp: Date.now(),
      type: "system",
    });

    await logClassroomAction(ctx, args.sessionId, auth, "WORKSHEET_CREATED", `Assigned worksheet: ${args.title}`);

    return { success: true, worksheetId };
  },
});

export const submitWorksheet = mutation({
  args: {
    worksheetId: v.id("classroomWorksheets"),
    answers: v.array(
      v.object({
        questionId: v.string(),
        response: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ws = await ctx.db.get(args.worksheetId);
    if (!ws) throw new Error("Worksheet not found");
    const auth = await verifySessionUser(ctx, ws.sessionId);

    const submissions = (ws.submissions || []).filter((s) => s.studentId !== auth.userId);
    submissions.push({
      studentId: auth.userId,
      studentName: auth.user.name || "Student",
      answers: args.answers,
      submittedAt: Date.now(),
    });

    await ctx.db.patch(args.worksheetId, { submissions });
    return { success: true };
  },
});

export const gradeWorksheet = mutation({
  args: {
    worksheetId: v.id("classroomWorksheets"),
    studentId: v.string(),
    grade: v.string(),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const ws = await ctx.db.get(args.worksheetId);
    if (!ws) throw new Error("Worksheet not found");
    const auth = await requireTeacherSessionOwner(ctx, ws.sessionId);

    const submissions = (ws.submissions || []).map((s) => {
      if (s.studentId === args.studentId) {
        return { ...s, grade: args.grade, teacherFeedback: args.feedback };
      }
      return s;
    });

    await ctx.db.patch(args.worksheetId, { submissions });
    await logClassroomAction(ctx, ws.sessionId, auth, "WORKSHEET_GRADED", `Graded worksheet for student ${args.studentId}`);

    return { success: true };
  },
});

// ─── 11. ATTENDANCE TRACKING & FINALIZATION ───────────────────────
export const getAttendance = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classroomAttendance")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const updateAttendanceRecord = mutation({
  args: {
    attendanceId: v.id("classroomAttendance"),
    status: v.union(v.literal("present"), v.literal("late"), v.literal("absent")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const att = await ctx.db.get(args.attendanceId);
    if (!att) throw new Error("Attendance record not found");
    const auth = await requireTeacherSessionOwner(ctx, att.sessionId);

    await ctx.db.patch(args.attendanceId, {
      status: args.status,
      notes: args.notes,
      markedBy: auth.user.name || "Teacher",
    });

    await logClassroomAction(
      ctx,
      att.sessionId,
      auth,
      "ATTENDANCE_RECORD_UPDATED",
      `Marked ${att.studentName} as ${args.status}`,
    );

    return { success: true };
  },
});

export const finalizeAttendance = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);

    const records = await ctx.db
      .query("classroomAttendance")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const r of records) {
      await ctx.db.patch(r._id, {
        isFinalized: true,
        markedBy: auth.user.name || "Teacher",
      });
    }

    await logClassroomAction(
      ctx,
      args.sessionId,
      auth,
      "ATTENDANCE_FINALIZED",
      `Finalized attendance records for ${records.length} student(s)`,
    );

    return { success: true, count: records.length };
  },
});

// ─── 12. AUDIT LOGS ──────────────────────────────────────────────
export const getAuditLogs = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("classroomAuditLogs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  },
});

// ─── 13. LANGUAGE STUDIO ─────────────────────────────────────────
export const getLanguageBoard = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const board = await ctx.db
      .query("classroomLanguageBoard")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!board) {
      return {
        sessionId: args.sessionId,
        sharedText: "Welcome to today's language practice section!\n\nRead through the dialogue with your tutor, practice pronunciation, and log unfamiliar vocabulary words.",
        vocabulary: [],
        conversationPrompts: [
          "Describe your favorite travel destination and what makes it unforgettable.",
          "If you could master any new skill in 24 hours, what would it be and why?",
          "Explain how you handle challenging situations or unexpected changes.",
        ],
        updatedAt: Date.now(),
      };
    }
    return board;
  },
});

export const updateLanguageBoard = mutation({
  args: {
    sessionId: v.string(),
    sharedText: v.optional(v.string()),
    vocabulary: v.optional(
      v.array(
        v.object({
          id: v.string(),
          word: v.string(),
          meaning: v.string(),
          pos: v.string(),
          example: v.string(),
        }),
      ),
    ),
    conversationPrompts: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const auth = await verifySessionUser(ctx, args.sessionId);
    const existing = await ctx.db
      .query("classroomLanguageBoard")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    const updates: any = { updatedAt: Date.now() };
    if (args.sharedText !== undefined) updates.sharedText = args.sharedText;
    if (args.vocabulary !== undefined) updates.vocabulary = args.vocabulary;
    if (args.conversationPrompts !== undefined) updates.conversationPrompts = args.conversationPrompts;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("classroomLanguageBoard", {
        sessionId: args.sessionId,
        sharedText: args.sharedText || "",
        vocabulary: args.vocabulary || [],
        conversationPrompts: args.conversationPrompts || [],
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// ─── 14. LESSON FINALIZATION & PERSISTENCE ────────────────────────
export const finishLessonSession = mutation({
  args: {
    sessionId: v.string(),
    teacherFeedback: v.string(),
    homeworkText: v.optional(v.string()),
    strengths: v.optional(v.array(v.string())),
    improvements: v.optional(v.array(v.string())),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireTeacherSessionOwner(ctx, args.sessionId);

    // Update classroom state status to completed
    const state = await ctx.db
      .query("classroomState")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (state) {
      await ctx.db.patch(state._id, {
        sessionStatus: "completed",
        isRecording: false,
        timerRunning: false,
        updatedAt: Date.now(),
      });
    }

    // Update lessons table if applicable
    try {
      const lesson: any = await ctx.db.get(args.sessionId as any);
      if (lesson && "teacherId" in lesson && "studentId" in lesson) {
        await ctx.db.patch(args.sessionId as any, {
          status: "completed",
          teacherFeedback: args.teacherFeedback,
          homework: args.homeworkText,
          studentRating: args.rating,
        });

        await ctx.db.insert("sessionNotes", {
          sessionId: args.sessionId,
          teacherId: auth.userId,
          studentId: lesson.studentId,
          feedback: args.teacherFeedback,
          homework: args.homeworkText,
          strengths: args.strengths || [],
          improvements: args.improvements || [],
          createdAt: Date.now(),
        });

        if (args.homeworkText && args.homeworkText.trim().length > 0) {
          await ctx.db.insert("assignments", {
            teacherId: auth.userId,
            teacherName: auth.user.name || "Teacher",
            studentId: lesson.studentId,
            studentName: lesson.studentName || "Student",
            lessonId: args.sessionId,
            subject: lesson.subject || "General",
            title: `Homework: ${lesson.title || "Class Practice"}`,
            description: args.homeworkText,
            dueDate: Date.now() + 7 * 86400000,
            status: "assigned",
            createdAt: Date.now(),
          });
        }
      }
    } catch {}

    // Update liveSessions table if applicable
    try {
      const liveSession = await ctx.db.get(args.sessionId as any);
      if (liveSession && "teacherId" in liveSession) {
        await ctx.db.patch(args.sessionId as any, {
          status: "ended",
        });
      }
    } catch {}

    // Finalize attendance automatically on lesson end
    const attRecords = await ctx.db
      .query("classroomAttendance")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const r of attRecords) {
      await ctx.db.patch(r._id, {
        isFinalized: true,
        markedBy: auth.user.name || "Teacher",
      });
    }

    await ctx.db.insert("classMessages", {
      sessionId: args.sessionId,
      senderId: auth.userId,
      senderName: "System",
      senderRole: "system",
      text: "🏁 Lesson officially finalized by the teacher. Lesson notes, feedback, and attendance are archived.",
      timestamp: Date.now(),
      type: "system",
    });

    await logClassroomAction(
      ctx,
      args.sessionId,
      auth,
      "LESSON_COMPLETED",
      `Finalized lesson. Feedback submitted with ${args.strengths?.length || 0} strength tags.`,
    );

    return { success: true };
  },
});
