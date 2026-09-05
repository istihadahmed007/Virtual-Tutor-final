import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { OnboardingChecklist, OnboardingStatus } from "@/components/dashboard/OnboardingChecklist";
import { WeeklyLearningSummary } from "@/components/dashboard/WeeklyLearningSummary";
import { NextBestAction, NextActionState } from "@/components/dashboard/NextBestAction";
import { PrivacyDiscoverabilityCard } from "@/components/dashboard/PrivacyDiscoverabilityCard";
import { LiveClassAvailability } from "@/components/classroom/LiveClassAvailability";
import { LiveClassDemoPanel } from "@/components/classroom/LiveClassDemoPanel";
import {
  Video,
  Users,
  BookOpen,
  MessageCircle,
  Calendar,
  TrendingUp,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Target,
  GraduationCap,
  Compass,
  Search,
  ChevronRight,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Cloud queries
  const cloudLessons = useQuery(api.lessons.listUpcoming, {});
  const progress = useQuery(api.progress.get);
  const assignments = useQuery(api.assignments.getPending);
  const profileStatus = useQuery(api.users.getProfileStatus);
  const studentProfile = useQuery(api.studentProfiles.get);

  // Local student state (for immediate prototype synchronization and testing)
  const [localLessons, setLocalLessons] = useState<any[]>([]);
  const [hasViewedTeachers, setHasViewedTeachers] = useState(false);
  const [hasGoals, setHasGoals] = useState(false);
  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const [isDiscoverable, setIsDiscoverable] = useState(true);

  useEffect(() => {
    try {
      const storedLessons = localStorage.getItem("vtp_mock_student_lessons");
      if (storedLessons) {
        setLocalLessons(JSON.parse(storedLessons));
      }
      setHasViewedTeachers(localStorage.getItem("vtp_has_viewed_teachers") === "true");
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
    return combined.sort((a, b) => (a.scheduledAt || 0) - (b.scheduledAt || 0));
  }, [cloudLessons, localLessons]);

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
    hasBookedLesson: upcomingLessons.length > 0 || (progress?.classesCompleted ?? 0) > 0,
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

  // Hours studied this week
  const hoursStudiedThisWeek = useMemo(() => {
    return progress?.totalHoursLearned ?? (isNewStudent ? 0 : 2.5);
  }, [progress, isNewStudent]);

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <PageHeader
          title={`Welcome back${user?.name ? `, ${user.name}` : ""}`}
          description="Your personalized learning workspace and live tutoring dashboard"
        />

        {/* Live Class Availability & Simulation Testing Bar */}
        <div className="mb-6">
          <LiveClassDemoPanel />
        </div>

        {/* Profile Completion Alert Banner if incomplete */}
        {profileStatus && !profileStatus.isComplete && profileStatus.role === "student" && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-900">
                  Complete your learning profile
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your profile is {profileStatus.completionPercentage}% complete. Add your target exams and grade to receive curated teacher recommendations.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 rounded-xl font-semibold text-xs"
              onClick={() => navigate("/profile")}
            >
              Complete profile
            </Button>
          </div>
        )}

        {/* =========================================================================
            STATE-AWARE HERO WORKSPACE:
            NEW STUDENT: Onboarding Checklist
            ACTIVE STUDENT: NextBestAction & WeeklyLearningSummary
        ========================================================================= */}
        {isNewStudent ? (
          <div className="mb-8">
            <OnboardingChecklist
              status={onboardingStatus}
              onUpdateGoals={(subjects) => {
                setHasGoals(true);
              }}
            />
          </div>
        ) : (
          <div className="space-y-6 mb-8">
            {/* Contextual Next Best Action Banner */}
            <NextBestAction
              state={nextActionState}
              lesson={nextLesson}
              pendingAssignment={pendingAssignments[0]}
              completedLessonsCount={progress?.classesCompleted ?? 0}
            />

            {/* Active Student Weekly Workspace Summary */}
            <WeeklyLearningSummary
              nextLesson={nextLesson}
              pendingAssignmentsCount={pendingAssignments.length}
              soonestAssignmentDueDate={pendingAssignments[0]?.dueDate}
              hoursStudiedThisWeek={hoursStudiedThisWeek}
              weeklyTargetHours={weeklyTarget}
              onUpdateTargetHours={(newTarget) => setWeeklyTarget(newTarget)}
            />
          </div>
        )}

        {/* Quick Quantitative Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
          <StatCard
            icon={Calendar}
            label="Upcoming lessons"
            value={upcomingLessons.length}
            iconBg="bg-teal-50"
          />
          <StatCard
            icon={BookOpen}
            label="Pending assignments"
            value={pendingAssignments.length}
            iconBg="bg-amber-50"
          />
          <StatCard
            icon={TrendingUp}
            label="Hours studied"
            value={progress?.totalHoursLearned ?? 0}
            iconBg="bg-indigo-50"
          />
          <StatCard
            icon={CheckCircle}
            label="Lessons completed"
            value={progress?.classesCompleted ?? 0}
            iconBg="bg-emerald-50"
          />
        </div>

        {/* Workspace Main Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Lessons Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" /> Upcoming lessons
                </h3>
                {upcomingLessons.length > 0 && (
                  <button
                    onClick={() => navigate("/lessons")}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                  >
                    View all ({upcomingLessons.length})
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
                <div className="space-y-4">
                  {upcomingLessons.slice(0, 3).map((lesson: any, index: number) => {
                    const normalizedLesson = {
                      _id: lesson._id || `lesson_${index}`,
                      title: lesson.title || `${lesson.subject} Lesson`,
                      subject: lesson.subject || "Academic Tutoring",
                      teacherId: lesson.teacherId || "teacher_default",
                      teacherName: lesson.teacherName || "Dr. Sarah Chen",
                      teacherTimezone: lesson.teacherTimezone || "America/New_York",
                      studentId: lesson.studentId || user?._id || "student_default",
                      studentName: lesson.studentName || user?.name || "Alex Rivera",
                      studentTimezone: lesson.studentTimezone || (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"),
                      scheduledAt: lesson.scheduledAt || 0,
                      durationMinutes: lesson.durationMinutes || 60,
                      status: lesson.status || "scheduled",
                      meetingCode: lesson.meetingCode || `CLASS-${lesson._id?.slice(-4) || "7710"}`,
                    };

                    return (
                      <LiveClassAvailability
                        key={lesson._id || index}
                        lesson={normalizedLesson}
                        user={user}
                        compact={index > 0}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assignments Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" /> Pending Assignments
                </h3>
                {pendingAssignments.length > 0 && (
                  <button
                    onClick={() => navigate("/assignments")}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                  >
                    View all ({pendingAssignments.length})
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
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-all"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {assignment.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {assignment.subject}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/assignments")}
                        className="rounded-xl text-xs font-semibold"
                      >
                        Submit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Quick Navigation, Privacy, and Progress */}
          <div className="space-y-6">
            {/* Transparent Privacy & Teacher Discoverability Card */}
            <PrivacyDiscoverabilityCard
              isDiscoverable={isDiscoverable}
              onToggleDiscoverable={(val) => setIsDiscoverable(val)}
            />

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
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
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                      link.primary
                        ? "bg-teal-600 text-white hover:bg-teal-700 shadow-xs"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <link.icon className={`w-4 h-4 ${link.primary ? "text-white" : "text-teal-600"}`} />
                      <span>{link.label}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 ${link.primary ? "text-teal-200" : "text-slate-400"}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Progress & Mastery Overview */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                <span>Mastery & Milestones</span>
              </h4>

              {progress && progress.classesCompleted > 0 ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Total Hours:</span>
                    <span className="font-bold text-slate-900">{progress.totalHoursLearned}h</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Completed Sessions:</span>
                    <span className="font-bold text-slate-900">{progress.classesCompleted}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Active Streak:</span>
                    <span className="font-bold text-teal-700">{progress.streakDays || 1} days 🔥</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/progress")}
                    className="w-full mt-2 rounded-xl text-xs font-semibold"
                  >
                    View detailed analytics
                  </Button>
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
