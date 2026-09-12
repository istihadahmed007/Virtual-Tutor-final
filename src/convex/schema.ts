import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

export const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  PARENT: "parent",
  ADMIN: "admin",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.STUDENT),
  v.literal(ROLES.TEACHER),
  v.literal(ROLES.PARENT),
  v.literal(ROLES.ADMIN),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    ...authTables,

    // ─── Users ───────────────────────────────────────────
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      avatarStorageId: v.optional(v.id("_storage")),
      avatarUrl: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      bio: v.optional(v.string()),
      timezone: v.optional(v.string()),
      phone: v.optional(v.string()),
      gender: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      country: v.optional(v.string()),
      preferredLanguage: v.optional(v.string()),
      notificationPrefs: v.optional(
        v.object({
          email: v.boolean(),
          push: v.boolean(),
          sms: v.boolean(),
        }),
      ),
      // Password auth
      passwordHash: v.optional(v.string()),
      emailVerified: v.optional(v.boolean()),
      accountStatus: v.optional(
        v.union(
          v.literal("active"),
          v.literal("suspended"),
          v.literal("pending_verification"),
        ),
      ),
      lastLoginAt: v.optional(v.number()),
      loginAttempts: v.optional(v.number()),
      lockedUntil: v.optional(v.number()),
    }).index("email", ["email"]),

    // ─── Email Verification Tokens ─────────────────────
    emailVerifications: defineTable({
      userId: v.string(),
      token: v.string(),
      email: v.string(),
      expiresAt: v.number(),
      used: v.boolean(),
    }).index("by_token", ["token"])
      .index("by_user", ["userId"]),

    // ─── Password Reset Tokens ─────────────────────────
    passwordResets: defineTable({
      userId: v.string(),
      token: v.string(),
      expiresAt: v.number(),
      used: v.boolean(),
    }).index("by_token", ["token"])
      .index("by_user", ["userId"]),

    // ─── One-Time Passwords (OTP) ─────────────────────
    otps: defineTable({
      email: v.string(),
      codeHash: v.string(),
      salt: v.string(),
      purpose: v.union(
        v.literal("register"),
        v.literal("login"),
        v.literal("reset"),
        v.literal("verify_email"),
      ),
      expiresAt: v.number(),
      createdAt: v.number(),
      lastSentAt: v.number(),
      attempts: v.number(),
      maxAttempts: v.optional(v.number()),
      verified: v.boolean(),
      consumedAt: v.optional(v.number()),
      payload: v.optional(v.string()),
    }).index("by_email_purpose", ["email", "purpose"])
      .index("by_email", ["email"]),

    // ─── Student Profiles ────────────────────────────────
    studentProfiles: defineTable({
      userId: v.string(),
      name: v.string(),
      avatarStorageId: v.optional(v.id("_storage")),
      avatarUrl: v.optional(v.string()),
      // Academic info
      institution: v.optional(v.string()),
      studentIdNumber: v.optional(v.string()),
      educationLevel: v.optional(v.string()),
      classLevel: v.optional(v.string()),
      department: v.optional(v.string()),
      board: v.optional(v.string()),
      curriculum: v.optional(v.string()),
      subjects: v.array(v.string()),
      learningGoals: v.array(v.string()),
      preferredLanguages: v.optional(v.array(v.string())),
      preferredSchedule: v.optional(v.string()),
      preferredLearningMode: v.optional(v.string()),
      targetExams: v.optional(v.array(v.string())),
      skillLevel: v.optional(v.string()),
      preferredTeachingStyle: v.optional(v.string()),
      weeklyHours: v.optional(v.number()),
      bio: v.optional(v.string()),
      // Privacy & Discovery Control
      isDiscoverable: v.optional(v.boolean()),
      // Verification
      verificationStatus: v.union(
        v.literal("not_submitted"),
        v.literal("pending"),
        v.literal("verified"),
        v.literal("rejected"),
        v.literal("resubmission_required"),
      ),
      studentCardUrl: v.optional(v.string()),
      verificationNotes: v.optional(v.string()),
      verifiedAt: v.optional(v.number()),
      // Profile completion
      profileCompletionPct: v.number(),
    }).index("by_user", ["userId"]),

    // ─── Parent Profiles ─────────────────────────────────
    parentProfiles: defineTable({
      userId: v.string(),
      name: v.string(),
      avatarStorageId: v.optional(v.id("_storage")),
      avatarUrl: v.optional(v.string()),
      phone: v.optional(v.string()),
      relationship: v.optional(v.string()),
      linkedStudentIds: v.array(v.string()),
      linkedStudentEmails: v.array(v.string()),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // ─── Teacher Profiles ────────────────────────────────
    teacherProfiles: defineTable({
      userId: v.string(),
      name: v.string(),
      title: v.string(),
      bio: v.string(),
      avatarStorageId: v.optional(v.id("_storage")),
      avatarUrl: v.optional(v.string()),
      // Subjects & Classes
      subjects: v.array(v.string()),
      classLevels: v.array(v.string()),
      expertise: v.array(v.string()),
      // Education
      education: v.array(
        v.object({
          degree: v.string(),
          institution: v.string(),
          department: v.optional(v.string()),
          passingYear: v.optional(v.string()),
          result: v.optional(v.string()),
          certificateUrl: v.optional(v.string()),
        }),
      ),
      certifications: v.optional(v.array(v.string())),
      // Languages & Pricing
      languages: v.array(v.string()),
      hourlyRate: v.number(),
      trialPrice: v.optional(v.number()),
      price30min: v.optional(v.number()),
      price60min: v.optional(v.number()),
      groupPrice: v.optional(v.number()),
      // Teaching info
      yearsExperience: v.number(),
      totalTeachingExperience: v.optional(v.string()),
      currentPosition: v.optional(v.string()),
      previousExperience: v.optional(v.string()),
      teachingStyle: v.optional(v.array(v.string())),
      targetStudents: v.optional(v.array(v.string())),
      // Online Teaching Setup
      onlineTeachingExperience: v.optional(v.string()),
      preferredPlatforms: v.optional(v.array(v.string())),
      onlineTools: v.optional(v.array(v.string())),
      internetQuality: v.optional(v.string()),
      webcamAvailable: v.optional(v.boolean()),
      microphoneAvailable: v.optional(v.boolean()),
      digitalTabletAvailable: v.optional(v.boolean()),
      screenSharingCapability: v.optional(v.boolean()),
      // Class Preferences
      preferredClassDuration: v.optional(v.string()),
      classTypes: v.optional(v.array(v.string())),
      maxStudentsPerClass: v.optional(v.number()),
      // Stats
      rating: v.number(),
      reviewCount: v.number(),
      totalStudents: v.number(),
      totalHours: v.number(),
      totalClassesCompleted: v.optional(v.number()),
      // Verification & Profile
      isVerified: v.boolean(),
      isAvailable: v.boolean(),
      introVideoUrl: v.optional(v.string()),
      country: v.optional(v.string()),
      verificationStatus: v.union(
        v.literal("not_started"),
        v.literal("under_review"),
        v.literal("verified"),
        v.literal("needs_attention"),
        v.literal("rejected"),
      ),
      rejectionReason: v.optional(v.string()),
      profileCompletionPct: v.number(),
      // NID Verification (private - never exposed publicly)
      nidNumber: v.optional(v.string()),
      nidFrontUrl: v.optional(v.string()),
      nidBackUrl: v.optional(v.string()),
      nidVerified: v.optional(v.boolean()),
      nidSubmittedAt: v.optional(v.number()),
      nidReviewedAt: v.optional(v.number()),
      nidReviewedBy: v.optional(v.string()),
    })
      .index("by_user", ["userId"])
      .index("by_subject", ["subjects"])
      .index("by_rating", ["rating"])
      .index("by_verification", ["verificationStatus"]),

    // ─── Teacher Availability ────────────────────────────
    availability: defineTable({
      teacherId: v.string(),
      dayOfWeek: v.number(), // 0=Sun, 6=Sat
      startTime: v.string(), // "09:00"
      endTime: v.string(), // "17:00"
      isActive: v.boolean(),
    }).index("by_teacher", ["teacherId"]),

    // ─── Lessons (scheduled 1-on-1 or group) ─────────────
    lessons: defineTable({
      teacherId: v.string(),
      teacherName: v.string(),
      studentId: v.string(),
      studentName: v.string(),
      subject: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      scheduledAt: v.number(),
      durationMinutes: v.number(),
      status: v.union(
        v.literal("scheduled"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("no_show"),
      ),
      sessionType: v.union(
        v.literal("1-to-1"),
        v.literal("small-group"),
        v.literal("trial"),
        v.literal("mentoring"),
        v.literal("exam-prep"),
        v.literal("project-help"),
      ),
      price: v.number(),
      meetingCode: v.optional(v.string()),
      recordingUrl: v.optional(v.string()),
      teacherFeedback: v.optional(v.string()),
      homework: v.optional(v.string()),
      rating: v.optional(v.number()),
      studentRating: v.optional(v.number()),
    })
      .index("by_teacher", ["teacherId"])
      .index("by_student", ["studentId"])
      .index("by_scheduled", ["scheduledAt"])
      .index("by_status", ["status"]),

    // ─── Live Sessions (group classes) ───────────────────
    liveSessions: defineTable({
      teacherId: v.string(),
      teacherName: v.string(),
      teacherAvatar: v.optional(v.string()),
      title: v.string(),
      subject: v.string(),
      description: v.optional(v.string()),
      scheduledAt: v.number(),
      durationMinutes: v.number(),
      maxStudents: v.number(),
      enrolledCount: v.number(),
      enrolledStudentIds: v.array(v.string()),
      status: v.union(
        v.literal("scheduled"),
        v.literal("live"),
        v.literal("ended"),
        v.literal("cancelled"),
      ),
      meetingCode: v.optional(v.string()),
      recordingUrl: v.optional(v.string()),
      sessionType: v.union(
        v.literal("1-to-1"),
        v.literal("small-group"),
        v.literal("trial"),
        v.literal("mentoring"),
        v.literal("exam-prep"),
        v.literal("project-help"),
      ),
      price: v.number(),
    })
      .index("by_teacher", ["teacherId"])
      .index("by_status", ["status"])
      .index("by_scheduled", ["scheduledAt"]),

    // ─── Bookings ────────────────────────────────────────
    bookings: defineTable({
      userId: v.string(),
      teacherId: v.string(),
      teacherName: v.string(),
      studentName: v.string(),
      lessonId: v.optional(v.string()),
      sessionId: v.optional(v.string()),
      date: v.string(),
      timeSlot: v.string(),
      durationMinutes: v.number(),
      subject: v.string(),
      sessionType: v.string(),
      price: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
      meetingCode: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_teacher", ["teacherId"])
      .index("by_date", ["date"]),

    // ─── Assignments ─────────────────────────────────────
    assignments: defineTable({
      teacherId: v.string(),
      teacherName: v.string(),
      studentId: v.string(),
      studentName: v.string(),
      lessonId: v.optional(v.string()),
      subject: v.string(),
      title: v.string(),
      description: v.string(),
      dueDate: v.number(),
      status: v.union(
        v.literal("assigned"),
        v.literal("in_progress"),
        v.literal("submitted"),
        v.literal("graded"),
        v.literal("returned"),
      ),
      grade: v.optional(v.string()),
      feedback: v.optional(v.string()),
      attachments: v.optional(v.array(v.string())),
      createdAt: v.number(),
    })
      .index("by_student", ["studentId"])
      .index("by_teacher", ["teacherId"])
      .index("by_status", ["status"]),

    // ─── Class Messages (real-time chat in sessions) ─────
    classMessages: defineTable({
      sessionId: v.string(),
      senderId: v.string(),
      senderName: v.string(),
      senderRole: v.string(),
      text: v.string(),
      timestamp: v.number(),
      type: v.union(
        v.literal("chat"),
        v.literal("question"),
        v.literal("reaction"),
        v.literal("hand-raise"),
        v.literal("system"),
      ),
    }).index("by_session", ["sessionId"]),

    // ─── Direct Messages ─────────────────────────────────
    conversations: defineTable({
      participants: v.array(v.string()),
      participantNames: v.array(v.string()),
      lastMessage: v.string(),
      lastMessageAt: v.number(),
      lastSenderId: v.string(),
    }).index("by_participants", ["participants"]),

    messages: defineTable({
      conversationId: v.string(),
      senderId: v.string(),
      senderName: v.string(),
      text: v.string(),
      timestamp: v.number(),
      read: v.boolean(),
    }).index("by_conversation", ["conversationId"]),

    // ─── AI Conversations ────────────────────────────────
    aiConversations: defineTable({
      userId: v.string(),
      title: v.string(),
      subject: v.optional(v.string()),
      lastMessageAt: v.number(),
    }).index("by_user", ["userId"]),

    aiMessages: defineTable({
      conversationId: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
    }).index("by_conversation", ["conversationId"]),

    // ─── Notifications ───────────────────────────────────
    notifications: defineTable({
      userId: v.string(),
      type: v.string(),
      title: v.string(),
      message: v.string(),
      read: v.boolean(),
      actionUrl: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // ─── Community Posts ─────────────────────────────────
    communityPosts: defineTable({
      authorId: v.string(),
      authorName: v.string(),
      authorRole: v.string(),
      authorAvatar: v.optional(v.string()),
      title: v.string(),
      content: v.string(),
      subject: v.optional(v.string()),
      tags: v.array(v.string()),
      likesCount: v.number(),
      repliesCount: v.number(),
      createdAt: v.number(),
    })
      .index("by_subject", ["subject"])
      .index("by_created", ["createdAt"]),

    communityReplies: defineTable({
      postId: v.string(),
      authorId: v.string(),
      authorName: v.string(),
      authorRole: v.string(),
      content: v.string(),
      likesCount: v.number(),
      createdAt: v.number(),
    }).index("by_post", ["postId"]),

    // ─── Reviews ─────────────────────────────────────────
    reviews: defineTable({
      teacherId: v.string(),
      studentId: v.string(),
      studentName: v.string(),
      rating: v.number(),
      comment: v.string(),
      subject: v.optional(v.string()),
      lessonId: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_teacher", ["teacherId"]),

    // ─── Session Notes / Feedback ────────────────────────
    sessionNotes: defineTable({
      sessionId: v.string(),
      teacherId: v.string(),
      studentId: v.string(),
      feedback: v.string(),
      homework: v.optional(v.string()),
      strengths: v.array(v.string()),
      improvements: v.array(v.string()),
      createdAt: v.number(),
    }).index("by_session", ["sessionId"]),

    // ─── Learning Progress ───────────────────────────────
    learningProgress: defineTable({
      userId: v.string(),
      totalHoursLearned: v.number(),
      classesCompleted: v.number(),
      subjectsStudied: v.array(v.string()),
      streakDays: v.number(),
      lastActiveDate: v.number(),
      weeklyData: v.optional(
        v.array(
          v.object({
            week: v.string(),
            hours: v.number(),
            lessons: v.number(),
            accuracy: v.number(),
          }),
        ),
      ),
    }).index("by_user", ["userId"]),

    // ─── Classroom Advanced Tables ───────────────────────
    classroomState: defineTable({
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
      activeTab: v.union(
        v.literal("whiteboard"),
        v.literal("presentation"),
        v.literal("math"),
        v.literal("language"),
        v.literal("worksheet"),
        v.literal("grid"),
      ),
      teacherSharingScreen: v.boolean(),
      allowStudentDraw: v.boolean(),
      allowStudentMic: v.boolean(),
      allowStudentCam: v.boolean(),
      allowStudentScreenShare: v.optional(v.boolean()),
      allowStudentAnnotation: v.optional(v.boolean()),
      allowStudentChat: v.optional(v.boolean()),
      allowStudentFileSubmit: v.optional(v.boolean()),
      locked: v.optional(v.boolean()),
      isRecording: v.optional(v.boolean()),
      recordingStatus: v.optional(
        v.union(
          v.literal("idle"),
          v.literal("preparing"),
          v.literal("recording"),
          v.literal("stopping"),
          v.literal("processing"),
          v.literal("ready"),
          v.literal("failed"),
        ),
      ),
      recordingStartedAt: v.optional(v.number()),
      recordingDurationSeconds: v.optional(v.number()),
      recordingUrl: v.optional(v.string()),
      recordingStorageId: v.optional(v.id("_storage")),
      activeMaterialId: v.optional(v.string()),
      activeMaterialPage: v.optional(v.number()),
      timerRemainingSeconds: v.optional(v.number()),
      timerRunning: v.boolean(),
      timerDurationSeconds: v.optional(v.number()),
      objectives: v.array(
        v.object({
          id: v.string(),
          text: v.string(),
          completed: v.boolean(),
        }),
      ),
      updatedAt: v.number(),
    }).index("by_session", ["sessionId"]),

    classroomWhiteboardPages: defineTable({
      sessionId: v.string(),
      pageIndex: v.number(),
      title: v.string(),
      elementsJson: v.string(), // Array of drawing strokes/shapes/text in JSON
      updatedAt: v.number(),
    })
      .index("by_session", ["sessionId"])
      .index("by_session_page", ["sessionId", "pageIndex"]),

    classroomMaterials: defineTable({
      sessionId: v.string(),
      uploaderId: v.string(),
      uploaderName: v.string(),
      title: v.string(),
      fileUrl: v.string(),
      fileType: v.union(
        v.literal("pdf"),
        v.literal("image"),
        v.literal("slides"),
        v.literal("doc"),
      ),
      totalPages: v.number(),
      currentPage: v.number(),
      annotationsJson: v.optional(v.string()),
      uploadedAt: v.number(),
    }).index("by_session", ["sessionId"]),

    classroomPolls: defineTable({
      sessionId: v.string(),
      creatorId: v.string(),
      question: v.string(),
      options: v.array(v.string()),
      votes: v.array(
        v.object({
          studentId: v.string(),
          studentName: v.string(),
          optionIndex: v.number(),
        }),
      ),
      status: v.union(v.literal("active"), v.literal("closed")),
      createdAt: v.number(),
    }).index("by_session", ["sessionId"]),

    classroomQuizzes: defineTable({
      sessionId: v.string(),
      creatorId: v.string(),
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
      submissions: v.array(
        v.object({
          studentId: v.string(),
          studentName: v.string(),
          answers: v.array(v.number()),
          score: v.number(),
          submittedAt: v.number(),
        }),
      ),
      status: v.union(v.literal("active"), v.literal("completed")),
      createdAt: v.number(),
    }).index("by_session", ["sessionId"]),

    classroomWorksheets: defineTable({
      sessionId: v.string(),
      creatorId: v.string(),
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
      submissions: v.array(
        v.object({
          studentId: v.string(),
          studentName: v.string(),
          answers: v.array(
            v.object({
              questionId: v.string(),
              response: v.string(),
            }),
          ),
          teacherFeedback: v.optional(v.string()),
          grade: v.optional(v.string()),
          submittedAt: v.number(),
        }),
      ),
      status: v.union(v.literal("active"), v.literal("graded")),
      createdAt: v.number(),
    }).index("by_session", ["sessionId"]),

    classroomPresence: defineTable({
      sessionId: v.string(),
      userId: v.string(),
      name: v.string(),
      role: v.union(v.literal("teacher"), v.literal("student")),
      avatarUrl: v.optional(v.string()),
      micOn: v.boolean(),
      camOn: v.boolean(),
      isScreenSharing: v.boolean(),
      handRaised: v.boolean(),
      canScreenShare: v.optional(v.boolean()),
      canAnnotate: v.optional(v.boolean()),
      isMutedByTeacher: v.optional(v.boolean()),
      isCamDisabledByTeacher: v.optional(v.boolean()),
      isRemoved: v.optional(v.boolean()),
      joinedAt: v.optional(v.number()),
      lastReaction: v.optional(v.string()),
      lastReactionAt: v.optional(v.number()),
      connectionQuality: v.union(
        v.literal("excellent"),
        v.literal("fair"),
        v.literal("poor"),
      ),
      lastSeenAt: v.number(),
    })
      .index("by_session", ["sessionId"])
      .index("by_session_user", ["sessionId", "userId"]),

    classroomAttendance: defineTable({
      sessionId: v.string(),
      studentId: v.string(),
      studentName: v.string(),
      joinedAt: v.number(),
      leftAt: v.optional(v.number()),
      durationSeconds: v.number(),
      status: v.union(
        v.literal("present"),
        v.literal("late"),
        v.literal("absent"),
      ),
      isFinalized: v.boolean(),
      markedBy: v.optional(v.string()),
      notes: v.optional(v.string()),
    })
      .index("by_session", ["sessionId"])
      .index("by_session_student", ["sessionId", "studentId"]),

    classroomAuditLogs: defineTable({
      sessionId: v.string(),
      actorId: v.string(),
      actorName: v.string(),
      actorRole: v.string(),
      action: v.string(),
      details: v.string(),
      timestamp: v.number(),
    })
      .index("by_session", ["sessionId"])
      .index("by_session_time", ["sessionId", "timestamp"]),

    recordings: defineTable({
      sessionId: v.string(),
      teacherId: v.string(),
      title: v.string(),
      durationSeconds: v.number(),
      storageId: v.optional(v.id("_storage")),
      storageUrl: v.optional(v.string()),
      status: v.union(
        v.literal("preparing"),
        v.literal("recording"),
        v.literal("stopping"),
        v.literal("processing"),
        v.literal("ready"),
        v.literal("failed"),
      ),
      errorMessage: v.optional(v.string()),
      startedAt: v.number(),
      endedAt: v.optional(v.number()),
      fileSizeMb: v.optional(v.number()),
    })
      .index("by_session", ["sessionId"])
      .index("by_teacher", ["teacherId"]),

    classroomSignaling: defineTable({
      sessionId: v.string(),
      senderId: v.string(),
      receiverId: v.optional(v.string()),
      type: v.union(
        v.literal("offer"),
        v.literal("answer"),
        v.literal("ice-candidate"),
        v.literal("whiteboard-op"),
      ),
      payload: v.string(),
      timestamp: v.number(),
    })
      .index("by_session", ["sessionId"])
      .index("by_session_time", ["sessionId", "timestamp"]),

    classroomLanguageBoard: defineTable({
      sessionId: v.string(),
      sharedText: v.string(),
      vocabulary: v.array(
        v.object({
          id: v.string(),
          word: v.string(),
          meaning: v.string(),
          pos: v.string(),
          example: v.string(),
        }),
      ),
      conversationPrompts: v.array(v.string()),
      updatedAt: v.number(),
    }).index("by_session", ["sessionId"]),

    // ─── Admin Verification Log ──────────────────────────
    verificationLogs: defineTable({
      teacherId: v.string(),
      adminId: v.string(),
      action: v.union(
        v.literal("submitted"),
        v.literal("under_review"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("resubmission_requested"),
        v.literal("account_suspended"),
        v.literal("account_reactivated"),
      ),
      reason: v.optional(v.string()),
      timestamp: v.number(),
    })
      .index("by_teacher", ["teacherId"])
      .index("by_admin", ["adminId"])
      .index("by_action", ["action"]),

    // ─── Comprehensive Admin Audit Logs ───────────────────
    adminAuditLogs: defineTable({
      adminId: v.string(),
      adminName: v.string(),
      adminEmail: v.optional(v.string()),
      action: v.string(),
      entityType: v.string(),
      entityId: v.string(),
      previousState: v.optional(v.string()),
      newState: v.optional(v.string()),
      reason: v.optional(v.string()),
      metadata: v.optional(v.string()),
      timestamp: v.number(),
    })
      .index("by_timestamp", ["timestamp"])
      .index("by_admin", ["adminId"])
      .index("by_entity", ["entityType", "entityId"]),

    // ─── Moderation & System Reports ─────────────────────
    moderationReports: defineTable({
      reporterId: v.string(),
      reporterName: v.string(),
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
      status: v.union(
        v.literal("pending"),
        v.literal("investigating"),
        v.literal("resolved"),
        v.literal("dismissed"),
      ),
      resolvedBy: v.optional(v.string()),
      resolutionNote: v.optional(v.string()),
      createdAt: v.number(),
      resolvedAt: v.optional(v.number()),
    })
      .index("by_status", ["status"])
      .index("by_created", ["createdAt"]),

    // ─── Frontend & Auth Error Tracking ─────────────────
    frontendErrors: defineTable({
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
      timestamp: v.number(),
      resolved: v.optional(v.boolean()),
      resolvedAt: v.optional(v.number()),
      resolvedBy: v.optional(v.string()),
    })
      .index("by_timestamp", ["timestamp"])
      .index("by_level", ["level"])
      .index("by_category", ["category"])
      .index("by_user", ["userId"])
      .index("by_route", ["route"]),
    // ─── Security & Authentication Audit Trail ───────────
    securityAuditLogs: defineTable({
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
      timestamp: v.number(),
    })
      .index("by_timestamp", ["timestamp"])
      .index("by_email", ["email"])
      .index("by_eventType", ["eventType"]),

    // ─── Contact Form & Inquiries ────────────────────────
    contactInquiries: defineTable({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      category: v.string(),
      subject: v.string(),
      message: v.string(),
      status: v.union(
        v.literal("new"),
        v.literal("read"),
        v.literal("in_progress"),
        v.literal("resolved"),
        v.literal("archived"),
      ),
      emailDeliveryStatus: v.optional(v.string()),
      createdAt: v.number(),
      resolvedAt: v.optional(v.number()),
      adminNotes: v.optional(v.string()),
    })
      .index("by_status", ["status"])
      .index("by_created", ["createdAt"])
      .index("by_email", ["email"]),

    // ─── Financial: Payments ──────────────────────────────
    payments: defineTable({
      bookingId: v.string(),
      orderId: v.optional(v.string()),
      studentId: v.string(),
      studentName: v.optional(v.string()),
      studentPhone: v.optional(v.string()),
      studentEmail: v.optional(v.string()),
      teacherId: v.string(),
      teacherName: v.optional(v.string()),
      teacherPhoto: v.optional(v.string()),
      courseId: v.optional(v.string()),
      courseName: v.optional(v.string()),
      subject: v.optional(v.string()),
      numberOfClasses: v.optional(v.number()),
      amount: v.number(),
      currency: v.string(), // "BDT"
      gateway: v.string(), // "direct" | "gateway" | "uddoktapay"
      paymentGateway: v.optional(v.string()), // "bKash" | "Nagad" | "Rocket" | "Cards"
      gatewayInvoiceId: v.optional(v.string()),
      transactionId: v.string(), // Virtual Tutor internal Tran ID (e.g. VT-TXN-...)
      gatewayTransactionId: v.optional(v.string()), // val_id or bank_tran_id
      paymentMethod: v.optional(v.string()), // e.g. "BKASH-BKash", "NAGAD-Nagad", "VISA-CityBank"
      paymentStatus: v.optional(
        v.union(
          v.literal("PENDING"),
          v.literal("PAID"),
          v.literal("FAILED"),
          v.literal("CANCELLED"),
          v.literal("REFUNDED"),
        ),
      ),
      enrollmentStatus: v.optional(
        v.union(
          v.literal("PENDING"),
          v.literal("ACTIVE"),
          v.literal("CANCELLED"),
        ),
      ),
      status: v.union(
        v.literal("initiated"),
        v.literal("pending"),
        v.literal("paid"),
        v.literal("failed"),
        v.literal("cancelled"),
        v.literal("refunded"),
      ),
      sessionKey: v.optional(v.string()),
      gatewayUrl: v.optional(v.string()),
      paidAt: v.optional(v.number()),
      refundReason: v.optional(v.string()),
      refundedAt: v.optional(v.number()),
      refundedBy: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_booking", ["bookingId"])
      .index("by_student", ["studentId"])
      .index("by_teacher", ["teacherId"])
      .index("by_transaction", ["transactionId"])
      .index("by_status", ["status"])
      .index("by_created", ["createdAt"]),

    // ─── Financial: Orders & Bangladesh Course Enrollments ──
    orders: defineTable({
      orderId: v.string(),
      studentId: v.string(),
      studentName: v.string(),
      studentEmail: v.string(),
      studentPhone: v.optional(v.string()),
      teacherId: v.string(),
      teacherName: v.string(),
      teacherPhoto: v.optional(v.string()),
      courseId: v.string(),
      courseName: v.string(),
      subject: v.string(),
      numberOfClasses: v.number(),
      amount: v.number(),
      currency: v.string(), // "BDT"
      paymentGateway: v.string(), // "bKash" | "Nagad" | "Rocket" | "Cards / Internet Banking"
      gatewayInvoiceId: v.optional(v.string()),
      gatewayPaymentUrl: v.optional(v.string()),
      paymentStatus: v.union(
        v.literal("PENDING"),
        v.literal("PAID"),
        v.literal("FAILED"),
        v.literal("CANCELLED"),
        v.literal("REFUNDED"),
      ),
      enrollmentStatus: v.union(
        v.literal("PENDING"),
        v.literal("ACTIVE"),
        v.literal("CANCELLED"),
      ),
      bookingId: v.optional(v.string()),
      lessonId: v.optional(v.string()),
      paidAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_order_id", ["orderId"])
      .index("by_student", ["studentId"])
      .index("by_teacher", ["teacherId"])
      .index("by_payment_status", ["paymentStatus"])
      .index("by_enrollment_status", ["enrollmentStatus"])
      .index("by_created", ["createdAt"]),

    // ─── Financial: Teacher Earnings (Commission Engine) ───
    teacherEarnings: defineTable({
      teacherId: v.string(),
      teacherName: v.optional(v.string()),
      bookingId: v.string(),
      paymentId: v.optional(v.string()),
      studentId: v.string(),
      studentName: v.optional(v.string()),
      grossAmount: v.number(), // Authoritative verified student payment
      platformFee: v.number(), // 15% platform commission
      teacherAmount: v.number(), // 85% teacher earning
      status: v.union(
        v.literal("pending"),
        v.literal("earned"),
        v.literal("payable"),
        v.literal("processing"),
        v.literal("paid"),
        v.literal("held"),
        v.literal("reversed"),
      ),
      earnedAt: v.number(),
      payableAt: v.optional(v.number()),
      paidAt: v.optional(v.number()),
      payoutId: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_teacher", ["teacherId"])
      .index("by_status", ["status"])
      .index("by_booking", ["bookingId"])
      .index("by_payout", ["payoutId"])
      .index("by_earnedAt", ["earnedAt"]),

    // ─── Financial: Monthly Teacher Payouts ───────────────
    teacherPayouts: defineTable({
      teacherId: v.string(),
      teacherName: v.string(),
      teacherEmail: v.optional(v.string()),
      settlementPeriodStart: v.number(), // timestamp start of period
      settlementPeriodEnd: v.number(), // timestamp end of period
      grossEarnings: v.number(),
      platformCommission: v.number(),
      teacherPayable: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("processing"),
        v.literal("paid"),
        v.literal("failed"),
      ),
      payoutMethod: v.optional(
        v.union(
          v.literal("bank"),
          v.literal("bkash"),
          v.literal("nagad"),
          v.literal("rocket"),
          v.literal("other"),
        ),
      ),
      payoutReference: v.optional(v.string()), // Bank Trx / MFS ID
      notes: v.optional(v.string()),
      approvedAt: v.optional(v.number()),
      paidAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_teacher", ["teacherId"])
      .index("by_status", ["status"])
      .index("by_period", ["settlementPeriodStart", "settlementPeriodEnd"])
      .index("by_created", ["createdAt"]),

    // ─── Financial: Audit Trail ───────────────────────────
    financialAuditLogs: defineTable({
      actor: v.string(),
      actorRole: v.string(),
      action: v.string(), // "payment_initiated", "payment_verified", "refund_completed", etc.
      entity: v.string(), // "payment", "teacher_earning", "payout", "refund"
      entityId: v.string(),
      amount: v.optional(v.number()),
      previousStatus: v.optional(v.string()),
      newStatus: v.string(),
      notes: v.optional(v.string()),
      metadata: v.optional(v.string()),
      timestamp: v.number(),
    })
      .index("by_timestamp", ["timestamp"])
      .index("by_entity", ["entity", "entityId"])
      .index("by_action", ["action"]),

    // ─── Financial: Adjustments & Reversals ───────────────
    financialAdjustments: defineTable({
      teacherId: v.string(),
      originalPaymentId: v.string(),
      earningId: v.string(),
      adjustmentAmount: v.number(),
      reason: v.string(),
      recoveryStatus: v.union(
        v.literal("pending_deduction"),
        v.literal("deducted"),
        v.literal("waived"),
      ),
      deductedFromPayoutId: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_teacher", ["teacherId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
