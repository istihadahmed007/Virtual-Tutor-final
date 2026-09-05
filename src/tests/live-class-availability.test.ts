import { describe, it, expect } from "vitest";
import {
  computeLessonAvailability,
  verifyLessonUserAuthorization,
  formatCountdown,
  isValidLessonTransition,
  STUDENT_JOIN_WINDOW_LEAD_MS,
  LessonData,
} from "../lib/live-class-availability";

describe("Live Class Availability & Lifecycle Engine", () => {
  const baseLesson: LessonData = {
    _id: "lesson_test_101",
    title: "AP Calculus: Limits & Continuity",
    subject: "Mathematics",
    teacherId: "teacher_sarah_01",
    teacherName: "Dr. Sarah Chen",
    teacherTimezone: "America/New_York",
    studentId: "student_alex_01",
    studentName: "Alex Rivera",
    studentTimezone: "America/Los_Angeles",
    scheduledAt: 1700000000000, // Fixed baseline time
    durationMinutes: 60,
    status: "scheduled",
  };

  const studentUser = {
    _id: "student_alex_01",
    name: "Alex Rivera",
    email: "alex.rivera@liveclass.edu",
    role: "student",
  };

  const teacherUser = {
    _id: "teacher_sarah_01",
    name: "Dr. Sarah Chen",
    email: "sarah.chen@virtualtutorpro.com",
    role: "teacher",
  };

  const strangerUser = {
    _id: "stranger_bob_99",
    name: "Bob Roberts",
    email: "bob@example.com",
    role: "student",
  };

  const adminUser = {
    _id: "admin_superuser_01",
    name: "Platform Admin",
    email: "admin@virtualtutorpro.com",
    role: "admin",
  };

  describe("Join window eligibility rules", () => {
    it("locks student joining when current time is earlier than 15 minutes before start", () => {
      // 20 minutes before start
      const currentTime = baseLesson.scheduledAt - 20 * 60 * 1000;
      const res = computeLessonAvailability({
        lesson: baseLesson,
        user: studentUser,
        currentTime,
      });

      expect(res.canJoin).toBe(false);
      expect(res.computedStatus).toBe("scheduled");
      expect(res.joinDisabledReason).toContain("Join available 15 minutes before start");
      expect(res.countdownMs).toBe(5 * 60 * 1000); // 5 minutes until window opens
    });

    it("enables student joining exactly within the 15-minute lead window (starting soon)", () => {
      // 10 minutes before start
      const currentTime = baseLesson.scheduledAt - 10 * 60 * 1000;
      const res = computeLessonAvailability({
        lesson: baseLesson,
        user: studentUser,
        currentTime,
      });

      expect(res.canJoin).toBe(true);
      expect(res.computedStatus).toBe("starting_soon");
      expect(res.isStartingSoon).toBe(true);
      expect(res.joinDisabledReason).toBeNull();
    });

    it("enables student joining at the exact 15-minute boundary", () => {
      const currentTime = baseLesson.scheduledAt - STUDENT_JOIN_WINDOW_LEAD_MS;
      const res = computeLessonAvailability({
        lesson: baseLesson,
        user: studentUser,
        currentTime,
      });

      expect(res.canJoin).toBe(true);
      expect(res.computedStatus).toBe("starting_soon");
    });

    it("enables teacher joining 25 minutes before start (30-minute teacher setup lead)", () => {
      // 25 minutes before start (within teacher 30m window, but outside student 15m window)
      const currentTime = baseLesson.scheduledAt - 25 * 60 * 1000;
      
      const teacherRes = computeLessonAvailability({
        lesson: baseLesson,
        user: teacherUser,
        currentTime,
      });
      expect(teacherRes.canJoin).toBe(true);

      const studentRes = computeLessonAvailability({
        lesson: baseLesson,
        user: studentUser,
        currentTime,
      });
      expect(studentRes.canJoin).toBe(false);
      expect(studentRes.joinDisabledReason).toContain("15 minutes before start");
    });

    it("enables joining while class is active/live", () => {
      // 20 minutes into the class
      const currentTime = baseLesson.scheduledAt + 20 * 60 * 1000;
      const res = computeLessonAvailability({
        lesson: baseLesson,
        user: studentUser,
        currentTime,
      });

      expect(res.canJoin).toBe(true);
      expect(res.computedStatus).toBe("live");
      expect(res.isLive).toBe(true);
    });

    it("disallows joining after the lesson scheduled duration has ended", () => {
      // 65 minutes after start (duration is 60 min)
      const currentTime = baseLesson.scheduledAt + 65 * 60 * 1000;
      const res = computeLessonAvailability({
        lesson: baseLesson,
        user: studentUser,
        currentTime,
      });

      expect(res.canJoin).toBe(false);
      expect(res.computedStatus).toBe("completed");
    });
  });

  describe("Lifecycle statuses and terminal states", () => {
    it("handles cancelled lesson state", () => {
      const cancelledLesson: LessonData = {
        ...baseLesson,
        status: "cancelled",
        cancellationReason: "Teacher unwell",
      };
      const currentTime = baseLesson.scheduledAt - 5 * 60 * 1000;
      const res = computeLessonAvailability({
        lesson: cancelledLesson,
        user: studentUser,
        currentTime,
      });

      expect(res.canJoin).toBe(false);
      expect(res.computedStatus).toBe("cancelled");
      expect(res.statusVariant).toBe("error");
      expect(res.joinDisabledReason).toContain("Teacher unwell");
    });

    it("handles completed lesson state", () => {
      const completedLesson: LessonData = {
        ...baseLesson,
        status: "completed",
      };
      const currentTime = baseLesson.scheduledAt;
      const res = computeLessonAvailability({
        lesson: completedLesson,
        user: studentUser,
        currentTime,
      });

      expect(res.canJoin).toBe(false);
      expect(res.computedStatus).toBe("completed");
      expect(res.statusVariant).toBe("neutral");
    });

    it("handles pending confirmation lesson state", () => {
      const pendingLesson: LessonData = {
        ...baseLesson,
        status: "pending",
      };
      const currentTime = baseLesson.scheduledAt - 5 * 60 * 1000;
      const res = computeLessonAvailability({
        lesson: pendingLesson,
        user: studentUser,
        currentTime,
      });

      expect(res.canJoin).toBe(false);
      expect(res.computedStatus).toBe("pending");
      expect(res.statusVariant).toBe("warning");
      expect(res.joinDisabledReason).toContain("Awaiting teacher confirmation");
    });

    it("handles no-show status", () => {
      const noShowLesson: LessonData = {
        ...baseLesson,
        status: "no_show",
      };
      const res = computeLessonAvailability({
        lesson: noShowLesson,
        user: studentUser,
        currentTime: baseLesson.scheduledAt,
      });

      expect(res.canJoin).toBe(false);
      expect(res.computedStatus).toBe("no_show");
      expect(res.joinDisabledReason).toContain("no-show");
    });
  });

  describe("Authorization checks", () => {
    it("authorizes assigned student", () => {
      const auth = verifyLessonUserAuthorization(baseLesson, studentUser);
      expect(auth.isAuthorized).toBe(true);
      expect(auth.role).toBe("student");
    });

    it("authorizes assigned teacher", () => {
      const auth = verifyLessonUserAuthorization(baseLesson, teacherUser);
      expect(auth.isAuthorized).toBe(true);
      expect(auth.role).toBe("teacher");
    });

    it("authorizes administrator", () => {
      const auth = verifyLessonUserAuthorization(baseLesson, adminUser);
      expect(auth.isAuthorized).toBe(true);
      expect(auth.role).toBe("admin");
    });

    it("rejects unauthorized user who is not assigned", () => {
      const auth = verifyLessonUserAuthorization(baseLesson, strangerUser);
      expect(auth.isAuthorized).toBe(false);
      expect(auth.role).toBe("unauthorized");

      const res = computeLessonAvailability({
        lesson: baseLesson,
        user: strangerUser,
        currentTime: baseLesson.scheduledAt,
      });
      expect(res.canJoin).toBe(false);
      expect(res.isAuthorized).toBe(false);
      expect(res.joinDisabledReason).toContain("not enrolled or assigned");
    });
  });

  describe("Timezone and countdown formatting", () => {
    it("detects differing student and teacher timezones", () => {
      const res = computeLessonAvailability({
        lesson: baseLesson,
        user: studentUser,
        currentTime: baseLesson.scheduledAt - 60000,
      });

      expect(res.timezonesDiffer).toBe(true);
      expect(res.studentTimezone).toBe("America/Los_Angeles");
      expect(res.teacherTimezone).toBe("America/New_York");
    });

    it("formats countdown intervals correctly", () => {
      expect(formatCountdown(45 * 1000)).toBe("45s");
      expect(formatCountdown(90 * 1000)).toBe("1m 30s");
      expect(formatCountdown(3600 * 1000 + 120 * 1000)).toBe("1h 2m");
      expect(formatCountdown(86400 * 1000 * 2 + 3600 * 1000 * 3)).toBe("2d 3h");
      expect(formatCountdown(0)).toBe("0s");
    });
  });

  describe("State transition validity", () => {
    it("validates permissible lesson state transitions", () => {
      expect(isValidLessonTransition("scheduled", "starting_soon")).toBe(true);
      expect(isValidLessonTransition("starting_soon", "live")).toBe(true);
      expect(isValidLessonTransition("live", "completed")).toBe(true);
      expect(isValidLessonTransition("scheduled", "cancelled")).toBe(true);
      expect(isValidLessonTransition("completed", "live")).toBe(false); // terminal state cannot revive
      expect(isValidLessonTransition("cancelled", "live")).toBe(false);
    });
  });
});
