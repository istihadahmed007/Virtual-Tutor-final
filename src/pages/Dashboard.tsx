import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useStudentPayments } from "@/hooks/use-payments";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { LEGACY_FAKE_IDS } from "@/lib/teacher-store";
import {
  StatBlock,
  SectionLabel,
  LessonCard,
  PillButton,
  PrimaryButton,
} from "@/components/redesign";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { OnboardingChecklist, OnboardingStatus } from "@/components/dashboard/OnboardingChecklist";
import { WeeklyLearningSummary } from "@/components/dashboard/WeeklyLearningSummary";
import { NextBestAction, NextActionState } from "@/components/dashboard/NextBestAction";
import { PrivacyDiscoverabilityCard } from "@/components/dashboard/PrivacyDiscoverabilityCard";
import {
  Calendar,
  BookOpen,
  TrendingUp,
  CheckCircle,
  Users,
  MessageCircle,
  Sparkles,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Clock,
  CreditCard,
  Video,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Cloud queries
  const cloudLessons = useQuery(api.lessons.listUpcoming, {});
  const progress = useQuery(api.progress.get);
  const assignments = useQuery(api.assignments.getPending);
  const profileStatus = useQuery(api.users.getProfileStatus);
  const studentProfile = useQuery(api.studentProfiles.get);
  const studentPayments = useStudentPayments();

  // Local student state
  const [localLessons, setLocalLessons] = useState<any[]>([]);
  const [hasViewedTeachers, setHasViewedTeachers] = useState(false);
  const [hasGoals, setHasGoals] = useState(false);
  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const [isDiscoverable, setIsDiscoverable] = useState(true);

  useEffect(() => {
    try {
      const storedLessons = localStorage.getItem("vtp_student_lessons");
      if (storedLessons) {
        const parsed = JSON.parse(storedLessons);
        if (Array.isArray(parsed)) {
          const realLessons = parsed.filter(
            (l) =>
              l &&
              !LEGACY_FAKE_IDS.has(l.teacherId) &&
              l.teacherId !== "demo_teacher_01" &&
              l.studentId !== "demo_student_01"
          );
          setLocalLessons(realLessons);
          localStorage.setItem("vtp_student_lessons", JSON.stringify(realLessons));
        }
      }
      setHasViewedTeachers(
        localStorage.getItem("vtp_has_viewed_teachers") === "true"
      );
      setHasGoals(localStorage.getItem("vtp_student_goals") !== null);

      const storedTarget = localStorage.getItem("vtp_weekly_target_hours");
      if (storedTarget) setWeeklyTarget(parseFloat(storedTarget));

      const storedDisc = localStorage.getItem("vtp_student_discoverable");
      if (storedDisc !== null) setIsDiscoverable(storedDisc === "true");
    } catch (e) {
      console.debug("Local student state read fallback:", e);
    }
  }, []);

  // Merge cloud lessons and local simulated bookings
  const upcomingLessons = useMemo(() => {
    const combined = [...(cloudLessons || []), ...localLessons];
    for (const p of studentPayments) {
      if (p.status === "paid" && p.bookingId) {
        const alreadyExists = combined.some(
          (l) => l._id === p.bookingId || l.bookingId === p.bookingId
        );
        if (!alreadyExists) {
          combined.push({
            _id: p.bookingId,
            title: `${p.subject} with ${p.teacherName}`,
            subject: p.subject,
            teacherId: p.teacherId,
            teacherName: p.teacherName,
            studentId: p.studentId,
            studentName: p.studentName,
            scheduledAt: p.createdAt + 86400000,
            durationMinutes: p.durationMinutes || 60,
            status: "scheduled",
            meetingCode: `vtp-${p.bookingId.replace(/[^a-zA-Z0-9]/g, "")}`,
          });
        }
      }
    }
    return combined.sort((a, b) => (a.scheduledAt || 0) - (b.scheduledAt || 0));
  }, [cloudLessons, localLessons, studentPayments]);

  const nextLesson = upcomingLessons[0] || null;
  const pendingAssignments = assignments ?? [];

  // Determine whether this student is a "New Student" with no history
  const isNewStudent = useMemo(() => {
    const hasCompletedClasses = (progress?.classesCompleted ?? 0) > 0;
    const hasUpcoming = upcomingLessons.length > 0;
    const hasActiveAssignments = pendingAssignments.length > 0;
    return !hasCompletedClasses && !hasUpcoming && !hasActiveAssignments;
  }, [progress, upcomingLessons, pendingAssignments]);

  const onboardingStatus: OnboardingStatus = {
    hasGoals: hasGoals || !!studentProfile?.subjects?.length,
    hasProfile: !!profileStatus?.isComplete,
    hasViewedTeachers,
    hasBookedLesson:
      upcomingLessons.length > 0 || (progress?.classesCompleted ?? 0) > 0,
  };

  // Determine next best action state for active students
  const nextActionState: NextActionState = useMemo(() => {
    if (nextLesson) {
      return "prepare_lesson";
    }
    if (pendingAssignments.length > 0) {
      return "complete_assignment";
    }
    if ((progress?.classesCompleted ?? 0) > 0) {
      return "review_feedback";
    }
    return "book_next_lesson";
  }, [nextLesson, pendingAssignments, progress]);

  // Hours studied this week (authoritative database count only)
  const hoursStudiedThisWeek = useMemo(() => {
    return progress?.totalHoursLearned ?? 0;
  }, [progress]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F4EF] text-[#111111] pb-24 pt-6 sm:pt-8">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        {/* Editorial Top Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
          <div>
            <SectionLabel number="01" text="Student Workspace" className="mb-2.5" />
            <h1 className="text-2xl sm:text-4xl font-bold tracking-[-0.03em] text-[#111111] font-display">
              {greeting}{user?.name ? `, ${user.name}` : ""}
            </h1>
            <p className="text-xs sm:text-sm text-[#111111]/70 mt-1 font-normal">
              Here's what needs your attention today.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <PillButton
              variant="white"
              size="sm"
              onClick={() => navigate("/teachers")}
              showArrow
            >
              Find Tutors
            </PillButton>
            <PrimaryButton
              size="sm"
              onClick={() => navigate("/ai-assistant")}
            >
              AI Assistant
            </PrimaryButton>
          </div>
        </div>

        {/* Compact Workspace Navigation Bar */}
        <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { label: "Find Tutor", path: "/teachers", icon: Users },
            { label: "My Lessons", path: "/lessons", icon: Video },
            { label: "Calendar", path: "/calendar", icon: Calendar },
            { label: "Assignments", path: "/assignments", icon: BookOpen, badge: pendingAssignments.length || undefined },
            { label: "Messages", path: "/messages", icon: MessageCircle },
            { label: "Progress", path: "/progress", icon: TrendingUp },
            { label: "AI Assistant", path: "/ai-assistant", icon: Sparkles },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E5E4DE] text-xs font-semibold text-[#111111] hover:border-[#111111] hover:shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <item.icon className="w-3.5 h-3.5 text-[#F26522]" />
              <span>{item.label}</span>
              {typeof item.badge === "number" && item.badge > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#F26522] text-white text-[10px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Profile Completion Alert Banner if incomplete */}
        {profileStatus &&
          !profileStatus.isComplete &&
          profileStatus.role === "student" && (
            <div className="bg-white border border-[#F26522]/30 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#F26522]/10 text-[#F26522] flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111111]">
                    Complete your learning goals & academic profile
                  </p>
                  <p className="text-xs text-[#111111]/70 mt-0.5">
                    Your profile is {profileStatus.completionPercentage}% complete.
                    Adding target exams helps tutors prepare custom lesson plans.
                  </p>
                </div>
              </div>
              <PrimaryButton
                size="sm"
                onClick={() => navigate("/profile")}
                className="shrink-0"
              >
                Complete profile
              </PrimaryButton>
            </div>
          )}

        {/* =========================================================================
            STATE-AWARE HERO WORKSPACE:
            NEW STUDENT: Onboarding Checklist
            ACTIVE STUDENT: NextBestAction & WeeklyLearningSummary
        ========================================================================= */}
        {isNewStudent ? (
          <div className="mb-10 bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
            <OnboardingChecklist
              status={onboardingStatus}
              onUpdateGoals={() => {
                setHasGoals(true);
              }}
            />
          </div>
        ) : (
          <div className="space-y-6 mb-10">
            {/* Contextual Next Best Action Banner */}
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
              <NextBestAction
                state={nextActionState}
                lesson={nextLesson}
                pendingAssignment={pendingAssignments[0]}
                completedLessonsCount={progress?.classesCompleted ?? 0}
              />
            </div>

            {/* Active Student Weekly Workspace Summary */}
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
              <WeeklyLearningSummary
                nextLesson={nextLesson}
                pendingAssignmentsCount={pendingAssignments.length}
                soonestAssignmentDueDate={pendingAssignments[0]?.dueDate}
                hoursStudiedThisWeek={hoursStudiedThisWeek}
                weeklyTargetHours={weeklyTarget}
                onUpdateTargetHours={(newTarget) => setWeeklyTarget(newTarget)}
              />
            </div>
          </div>
        )}

        {/* 4 Quantitative Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          <StatBlock
            label="Upcoming lessons"
            value={upcomingLessons.length}
            icon={Calendar}
            trend={upcomingLessons.length > 0 ? "Active schedule" : undefined}
          />
          <StatBlock
            label="Pending assignments"
            value={pendingAssignments.length}
            icon={BookOpen}
            trend={pendingAssignments.length > 0 ? "Due soon" : "All caught up"}
          />
          <StatBlock
            label="Hours studied"
            value={progress?.totalHoursLearned ?? 0}
            suffix="hrs"
            icon={TrendingUp}
            subtext="Tracked classroom time"
          />
          <StatBlock
            label="Lessons completed"
            value={progress?.classesCompleted ?? 0}
            icon={CheckCircle}
            subtext="Verified completions"
          />
        </div>

        {/* Main Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / Center: Upcoming Lessons & Assignments */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Lessons Card */}
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E4DE]">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#111111] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#F26522]" />
                    <span>Upcoming Lessons</span>
                  </h3>
                  <p className="text-xs text-[#111111]/60 mt-0.5">
                    Live classroom rooms become active 10 minutes prior to session
                  </p>
                </div>
                {upcomingLessons.length > 0 && (
                  <button
                    onClick={() => navigate("/lessons")}
                    className="text-xs font-semibold text-[#111111] hover:text-[#F26522] transition-colors cursor-pointer"
                  >
                    View all ({upcomingLessons.length}) →
                  </button>
                )}
              </div>

              {upcomingLessons.length === 0 ? (
                <DashboardEmptyState
                  type="lessons"
                  actionLabel="Find a Teacher & Book"
                  actionPath="/teachers"
                />
              ) : (
                <div className="space-y-3.5">
                  {upcomingLessons.slice(0, 3).map((lesson: any, index: number) => {
                    const normalizedLesson = {
                      _id: lesson._id || `lesson_${index}`,
                      title: lesson.title || `${lesson.subject || "Academic"} Lesson`,
                      subject: lesson.subject || "Academic Tutoring",
                      teacherName: lesson.teacherName || "Instructor",
                      studentName: lesson.studentName || user?.name || "Student",
                      scheduledAt: lesson.scheduledAt || Date.now() + 3600000,
                      durationMinutes: lesson.durationMinutes || 60,
                      status: lesson.status || "scheduled",
                      meetingCode: lesson.meetingCode || `CLASS-${lesson._id?.slice(-4) || "7710"}`,
                    };

                    return (
                      <LessonCard
                        key={lesson._id || index}
                        lesson={normalizedLesson}
                        onJoin={() =>
                          navigate(
                            `/classroom/${lesson._id || normalizedLesson.meetingCode}`
                          )
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assignments Card */}
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E4DE]">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#111111] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#F26522]" />
                    <span>Pending Assignments & Homework</span>
                  </h3>
                  <p className="text-xs text-[#111111]/60 mt-0.5">
                    Tasks assigned by your tutors to reinforce classroom concepts
                  </p>
                </div>
                {pendingAssignments.length > 0 && (
                  <button
                    onClick={() => navigate("/assignments")}
                    className="text-xs font-semibold text-[#111111] hover:text-[#F26522] transition-colors cursor-pointer"
                  >
                    View all ({pendingAssignments.length}) →
                  </button>
                )}
              </div>

              {pendingAssignments.length === 0 ? (
                <DashboardEmptyState
                  type="assignments"
                  actionLabel="Browse Available Tutors"
                  actionPath="/teachers"
                />
              ) : (
                <div className="space-y-3">
                  {pendingAssignments.slice(0, 3).map((assignment) => (
                    <div
                      key={assignment._id}
                      className="flex items-center justify-between p-4 rounded-2xl border border-[#E5E4DE] bg-[#FAF9F5] hover:bg-white transition-all"
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-[#111111]">
                          {assignment.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-[#111111]/60 mt-1">
                          <span className="font-medium text-[#111111]">
                            {assignment.subject}
                          </span>
                          {assignment.dueDate && (
                            <span>
                              · Due{" "}
                              {new Date(assignment.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <PillButton
                        size="sm"
                        variant="white"
                        onClick={() => navigate("/assignments")}
                        showArrow
                      >
                        Submit
                      </PillButton>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tuition Invoices & Payment Receipts Card */}
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E4DE]">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#111111] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#F26522]" />
                    <span>Tuition Invoices & Payment Receipts</span>
                  </h3>
                  <p className="text-xs text-[#111111]/60 mt-0.5">
                    Official payment receipts for your private tutoring bookings
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Verified Payment
                </span>
              </div>

              {(!studentPayments || studentPayments.length === 0) ? (
                <div className="p-6 text-center text-[#111111]/50 text-xs bg-[#FAF9F5] rounded-2xl border border-[#E5E4DE]/60">
                  <CreditCard className="w-6 h-6 mx-auto mb-2 text-[#111111]/30" />
                  <p className="font-semibold text-slate-700">No payment receipts yet</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    When you book and confirm a live tutoring session, your official invoice and payment receipt will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentPayments.slice(0, 4).map((pmt) => (
                    <div
                      key={pmt._id}
                      className="p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E5E4DE] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {pmt.transactionId}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pmt.status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : pmt.status === "refunded"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {pmt.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-[#111111]/70 mt-1">
                          Teacher: <span className="font-semibold text-slate-800">{pmt.teacherName || "Instructor"}</span> · Tuition:{" "}
                          <span className="font-bold text-teal-700">৳{pmt.amount.toLocaleString()} BDT</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Date: {new Date(pmt.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => navigate(`/checkout/${pmt.transactionId}`)}
                          className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-[#E5E4DE] text-xs font-semibold text-slate-800 transition-colors shadow-2xs cursor-pointer"
                        >
                          {pmt.status === "paid" ? "View Receipt" : "Complete Payment"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Discoverability, Quick Links, Progress */}
          <div className="space-y-8">
            {/* Transparent Privacy & Teacher Discoverability Card */}
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
              <PrivacyDiscoverabilityCard
                isDiscoverable={isDiscoverable}
                onToggleDiscoverable={(val) => setIsDiscoverable(val)}
              />
            </div>

            {/* Quick Navigation Links */}
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]/40 mb-4">
                Learning Workspace
              </h4>
              <div className="space-y-2">
                {[
                  {
                    label: "Explore Verified Teachers",
                    path: "/teachers",
                    icon: Users,
                    primary: true,
                  },
                  {
                    label: "My Lesson Schedule",
                    path: "/lessons",
                    icon: Calendar,
                  },
                  {
                    label: "Practice & Homework",
                    path: "/assignments",
                    icon: BookOpen,
                  },
                  {
                    label: "Messages with Tutors",
                    path: "/messages",
                    icon: MessageCircle,
                  },
                  {
                    label: "Analytics & Progress",
                    path: "/progress",
                    icon: TrendingUp,
                  },
                ].map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                      link.primary
                        ? "bg-[#111111] text-white hover:bg-[#222222]"
                        : "bg-[#FAF9F5] text-[#111111] hover:bg-[#F5F4EF] border border-[#E5E4DE]/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <link.icon
                        className={`w-4 h-4 ${
                          link.primary ? "text-[#F26522]" : "text-[#111111]/60"
                        }`}
                      />
                      <span>{link.label}</span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 ${
                        link.primary ? "text-white/50" : "text-[#111111]/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Mastery & Milestones Overview */}
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]/40 mb-4 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#F26522]" />
                <span>Mastery & Milestones</span>
              </h4>

              {progress && progress.classesCompleted > 0 ? (
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between py-2 border-b border-[#E5E4DE]">
                    <span className="text-[#111111]/60">Total Hours:</span>
                    <span className="font-bold text-[#111111]">
                      {progress.totalHoursLearned}h
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#E5E4DE]">
                    <span className="text-[#111111]/60">Completed Sessions:</span>
                    <span className="font-bold text-[#111111]">
                      {progress.classesCompleted}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#E5E4DE]">
                    <span className="text-[#111111]/60">Active Streak:</span>
                    <span className="font-bold text-[#F26522]">
                      {progress.streakDays || 1} days 🔥
                    </span>
                  </div>
                  <PillButton
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/progress")}
                    className="w-full justify-center mt-3"
                  >
                    View detailed analytics
                  </PillButton>
                </div>
              ) : (
                <DashboardEmptyState
                  type="progress"
                  actionLabel="Book a Class to Begin"
                  actionPath="/teachers"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
