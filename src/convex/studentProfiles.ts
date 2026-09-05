import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Sample discoverable students used if DB is newly initialized or for demonstration (neutral initials fallback)
const SAMPLE_DISCOVERABLE_STUDENTS = [
  {
    userId: "usr_student_alex",
    name: "Alex Rivera",
    institution: "Oakridge High Academy",
    educationLevel: "High School",
    classLevel: "Grade 11",
    curriculum: "Cambridge / Edexcel (O/A Level)",
    board: "Cambridge International",
    subjects: ["AP Calculus BC", "Physics Mechanics", "Chemistry"],
    learningGoals: ["Score 5 on AP Calculus", "Prepare for Engineering prerequisites", "Problem-solving drill"],
    preferredLanguages: ["English"],
    preferredSchedule: "Weekday Evenings (6 PM - 9 PM)",
    preferredLearningMode: "1-on-1 Interactive",
    targetExams: ["AP Calculus", "AP Physics C", "SAT Math"],
    skillLevel: "Advanced",
    preferredTeachingStyle: "Problem-solving & interactive whiteboarding",
    weeklyHours: 4,
    bio: "High school junior focused on STEM excellence. Seeking an experienced calculus and physics tutor for rigorous weekly problem solving.",
    isDiscoverable: true,
    verificationStatus: "verified" as const,
    profileCompletionPct: 90,
  },
  {
    userId: "usr_student_sophia",
    name: "Sophia Chen",
    institution: "Maple Valley Collegiate",
    educationLevel: "Middle School",
    classLevel: "Grade 9",
    curriculum: "National Curriculum (English Version)",
    board: "National Board",
    subjects: ["Mathematics", "General Science", "English Literature"],
    learningGoals: ["Build foundation in algebra", "Improve essay writing skills", "Exam preparation"],
    preferredLanguages: ["English", "Mandarin"],
    preferredSchedule: "Weekends (Morning 10 AM - 1 PM)",
    preferredLearningMode: "Conceptual Deep-Dive",
    targetExams: ["Junior Board Exams", "Math Olympiad"],
    skillLevel: "Intermediate",
    preferredTeachingStyle: "Patient, step-by-step visual explanations",
    weeklyHours: 3,
    bio: "Looking for an engaging tutor who can break down complex algebra concepts and guide English critical analysis.",
    isDiscoverable: true,
    verificationStatus: "verified" as const,
    profileCompletionPct: 85,
  },
  {
    userId: "usr_student_rahim",
    name: "Rahim Chowdhury",
    institution: "Dhaka Residential Model College",
    educationLevel: "College / Higher Secondary",
    classLevel: "HSC 2nd Year (Grade 12)",
    curriculum: "National Curriculum (Bangla Medium)",
    board: "Dhaka Board",
    subjects: ["Higher Mathematics", "Physics", "ICT & Programming"],
    learningGoals: ["HSC Board Exam A+ Preparation", "University Admission Test Readiness", "Python basics"],
    preferredLanguages: ["Bangla", "English"],
    preferredSchedule: "Flexible (Evenings & Friday/Saturday)",
    preferredLearningMode: "Exam Prep Crash Course",
    targetExams: ["HSC 2026", "Engineering Admission"],
    skillLevel: "Intermediate-Advanced",
    preferredTeachingStyle: "Structured syllabus coverage with practice sheets",
    weeklyHours: 6,
    bio: "Aiming for top percentile in upcoming board exams. Need dedicated mentorship in higher math calculus and physics electricity chapters.",
    isDiscoverable: true,
    verificationStatus: "verified" as const,
    profileCompletionPct: 90,
  },
  {
    userId: "usr_student_maya",
    name: "Maya Patel",
    institution: "St. Jude International School",
    educationLevel: "High School",
    classLevel: "O-Level (Grade 10)",
    curriculum: "Cambridge / Edexcel (O/A Level)",
    board: "Edexcel International GCSE",
    subjects: ["Biology", "Chemistry", "Human Biology"],
    learningGoals: ["Target straight A* in IGCSE Sciences", "Medical school preparation early foundation"],
    preferredLanguages: ["English"],
    preferredSchedule: "Weekdays (4 PM - 7 PM)",
    preferredLearningMode: "1-on-1 Interactive",
    targetExams: ["IGCSE May/June", "Biology Olympiad"],
    skillLevel: "Advanced",
    preferredTeachingStyle: "Past paper solving and examiner tips",
    weeklyHours: 4,
    bio: "Passionate about life sciences. Looking for an experienced Cambridge tutor to master paper 4 structured questions and paper 6 alt to practical.",
    isDiscoverable: true,
    verificationStatus: "verified" as const,
    profileCompletionPct: 88,
  },
  {
    userId: "usr_student_daniel",
    name: "Daniel Martinez",
    institution: "Horizon Academy",
    educationLevel: "Middle School",
    classLevel: "Grade 8",
    curriculum: "IB / International Baccalaureate",
    board: "IB MYP",
    subjects: ["Spanish", "World History", "English Language"],
    learningGoals: ["Conversational Spanish fluency", "Essay structure mastery", "Interactive speaking practice"],
    preferredLanguages: ["English", "Spanish"],
    preferredSchedule: "Weekends (Afternoon)",
    preferredLearningMode: "1-on-1 Interactive",
    targetExams: ["IB MYP Assessments", "DELE A2"],
    skillLevel: "Beginner",
    preferredTeachingStyle: "Conversational immersion & dynamic quizzes",
    weeklyHours: 2,
    bio: "Motivated 8th grader looking to accelerate Spanish speaking and reading comprehension with a native or bilingual instructor.",
    isDiscoverable: true,
    verificationStatus: "verified" as const,
    profileCompletionPct: 80,
  },
];

// Helper to sanitize student profiles for teacher discovery
function sanitizePublicStudent(p: any) {
  return {
    _id: p._id || p.userId,
    userId: p.userId,
    name: p.name,
    avatarUrl: p.avatarUrl,
    educationLevel: p.educationLevel || "High School",
    classLevel: p.classLevel || "Grade 11",
    department: p.department,
    board: p.board,
    curriculum: p.curriculum || p.board || "Standard Curriculum",
    subjects: p.subjects || [],
    learningGoals: p.learningGoals || [],
    preferredLanguages: p.preferredLanguages || ["English"],
    preferredSchedule: p.preferredSchedule || "Flexible",
    preferredLearningMode: p.preferredLearningMode || "1-on-1 Interactive",
    targetExams: p.targetExams || [],
    skillLevel: p.skillLevel || "Intermediate",
    preferredTeachingStyle: p.preferredTeachingStyle,
    weeklyHours: p.weeklyHours || 2,
    bio: p.bio || "Motivated student eager to master core subjects and achieve academic goals.",
    verificationStatus: p.verificationStatus || "verified",
    profileCompletionPct: p.profileCompletionPct || 80,
    isDiscoverable: p.isDiscoverable !== false,
  };
}

export const get = query({
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

export const listDiscoverable = query({
  args: {
    subject: v.optional(v.string()),
    classLevel: v.optional(v.string()),
    curriculum: v.optional(v.string()),
    language: v.optional(v.string()),
    learningGoal: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
    sortBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch real student profiles from DB
    const dbProfiles = await ctx.db.query("studentProfiles").collect();

    // 2. Filter out non-discoverable students strictly according to Privacy Requirement
    let activeStudents = dbProfiles
      .filter((p) => p.isDiscoverable !== false)
      .map(sanitizePublicStudent);

    // 3. If DB has few students, merge sample discoverable students (avoiding duplicate userIds)
    const existingUserIds = new Set(activeStudents.map((s) => s.userId));
    for (const sample of SAMPLE_DISCOVERABLE_STUDENTS) {
      if (!existingUserIds.has(sample.userId)) {
        activeStudents.push(sanitizePublicStudent(sample));
      }
    }

    // 4. Search text filter
    if (args.searchQuery) {
      const q = args.searchQuery.toLowerCase().trim();
      activeStudents = activeStudents.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.classLevel.toLowerCase().includes(q) ||
          s.curriculum.toLowerCase().includes(q) ||
          s.subjects.some((sub: string) => sub.toLowerCase().includes(q)) ||
          s.learningGoals.some((g: string) => g.toLowerCase().includes(q)) ||
          s.bio.toLowerCase().includes(q),
      );
    }

    // 5. Subject filter
    if (args.subject) {
      const sub = args.subject.toLowerCase();
      activeStudents = activeStudents.filter((s) =>
        s.subjects.some((item: string) => item.toLowerCase().includes(sub)),
      );
    }

    // 6. Grade / Class Level filter
    if (args.classLevel) {
      const lvl = args.classLevel.toLowerCase();
      activeStudents = activeStudents.filter(
        (s) =>
          s.classLevel.toLowerCase().includes(lvl) ||
          s.educationLevel.toLowerCase().includes(lvl),
      );
    }

    // 7. Curriculum filter
    if (args.curriculum) {
      const cur = args.curriculum.toLowerCase();
      activeStudents = activeStudents.filter(
        (s) =>
          s.curriculum.toLowerCase().includes(cur) ||
          (s.board && s.board.toLowerCase().includes(cur)),
      );
    }

    // 8. Preferred Language filter
    if (args.language) {
      const lang = args.language.toLowerCase();
      activeStudents = activeStudents.filter((s) =>
        s.preferredLanguages.some((l: string) => l.toLowerCase().includes(lang)),
      );
    }

    // 9. Learning Goal / Requirement filter
    if (args.learningGoal) {
      const goal = args.learningGoal.toLowerCase();
      activeStudents = activeStudents.filter((s) =>
        s.learningGoals.some((g: string) => g.toLowerCase().includes(goal)),
      );
    }

    // 10. Sorting
    switch (args.sortBy) {
      case "completion":
        activeStudents.sort((a, b) => b.profileCompletionPct - a.profileCompletionPct);
        break;
      case "name":
        activeStudents.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "hours":
        activeStudents.sort((a, b) => b.weeklyHours - a.weeklyHours);
        break;
      default:
        // Default verified and comprehensive first
        activeStudents.sort((a, b) => (b.verificationStatus === "verified" ? 1 : 0) - (a.verificationStatus === "verified" ? 1 : 0));
    }

    return activeStudents;
  },
});

export const getPublicProfile = query({
  args: { studentUserId: v.string() },
  handler: async (ctx, args) => {
    // Check DB first
    const profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.studentUserId))
      .first();

    if (profile) {
      if (profile.isDiscoverable === false) {
        return null; // Respect discovery opt-out
      }
      return sanitizePublicStudent(profile);
    }

    // Check sample discoverable students
    const sample = SAMPLE_DISCOVERABLE_STUDENTS.find((s) => s.userId === args.studentUserId);
    if (sample) {
      return sanitizePublicStudent(sample);
    }

    return null;
  },
});

export const toggleDiscoverability = mutation({
  args: { isDiscoverable: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { isDiscoverable: args.isDiscoverable });
    } else {
      const user = await ctx.db.get(userId);
      await ctx.db.insert("studentProfiles", {
        userId: userId as string,
        name: user && "name" in user ? user.name || "Student" : "Student",
        subjects: ["Mathematics", "Science"],
        learningGoals: ["Find great tutors", "Master course subjects"],
        isDiscoverable: args.isDiscoverable,
        verificationStatus: "verified",
        profileCompletionPct: 80,
      });
    }

    return { success: true, isDiscoverable: args.isDiscoverable };
  },
});

export const upsert = mutation({
  args: {
    name: v.string(),
    avatarUrl: v.optional(v.string()),
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
    isDiscoverable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .first();

    const fields = [
      args.name,
      args.subjects.length > 0,
      args.learningGoals.length > 0,
      args.classLevel,
      args.curriculum,
      args.preferredSchedule,
      args.bio,
    ];
    const filled = fields.filter(Boolean).length;
    const profileCompletionPct = Math.round((filled / fields.length) * 100);

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, profileCompletionPct });
    } else {
      await ctx.db.insert("studentProfiles", {
        userId: userId as string,
        ...args,
        isDiscoverable: args.isDiscoverable !== undefined ? args.isDiscoverable : true,
        verificationStatus: "not_submitted",
        profileCompletionPct,
      });
    }
  },
});

export const sendLessonInvite = mutation({
  args: {
    studentUserId: v.string(),
    subject: v.string(),
    message: v.string(),
    proposedTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const teacherId = await getAuthUserId(ctx);
    if (!teacherId) throw new Error("Not authenticated");

    const teacher = await ctx.db.get(teacherId);
    const teacherName = teacher && "name" in teacher ? teacher.name || "A Teacher" : "A Teacher";

    // 1. Create a notification for the student
    await ctx.db.insert("notifications", {
      userId: args.studentUserId,
      type: "lesson_invite",
      title: `Lesson Invitation from ${teacherName}`,
      message: `${teacherName} sent you an invitation for ${args.subject}: "${args.message.slice(0, 120)}..."`,
      actionUrl: "/messages",
      read: false,
      createdAt: Date.now(),
    });

    // 2. Ensure conversation exists and send message
    const allConvos = await ctx.db.query("conversations").collect();
    let conv = allConvos.find(
      (c) =>
        c.participants.includes(teacherId as string) &&
        c.participants.includes(args.studentUserId),
    );

    let convId = conv?._id;
    if (!convId) {
      const student = await ctx.db.get(args.studentUserId as any);
      const studentName = student && "name" in student ? student.name || "Student" : "Student";
      convId = await ctx.db.insert("conversations", {
        participants: [teacherId as string, args.studentUserId],
        participantNames: [teacherName, studentName],
        lastMessage: args.message,
        lastMessageAt: Date.now(),
        lastSenderId: teacherId as string,
      });
    }

    // Insert invitation message
    const formattedText = `🎓 **Lesson Invitation: ${args.subject}**\n\n${args.message}${args.proposedTime ? `\n\n📅 **Proposed Schedule:** ${args.proposedTime}` : ""}`;
    await ctx.db.insert("messages", {
      conversationId: convId as string,
      senderId: teacherId as string,
      senderName: teacherName,
      text: formattedText,
      timestamp: Date.now(),
      read: false,
    });

    await ctx.db.patch(convId as any, {
      lastMessage: formattedText.slice(0, 80) + "...",
      lastMessageAt: Date.now(),
      lastSenderId: teacherId as string,
    });

    return { success: true, conversationId: convId };
  },
});

