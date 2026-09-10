import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useTeacherProfile } from "@/hooks/use-teacher-profile";
import { useNavigate } from "react-router";
import {
  StatBlock,
  LessonCard,
  PillButton,
  PrimaryButton,
  SectionLabel,
} from "@/components/redesign";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import {
  Video,
  Users,
  Calendar,
  Star,
  MessageCircle,
  BookOpen,
  AlertCircle,
  Search,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sessions = useQuery(api.sessions.listByTeacher);
  const { profile: teacherProfile } = useTeacherProfile();
  const bookings = useQuery(api.bookings.listByTeacher);
  const discoverableStudents = useQuery(api.studentProfiles.listDiscoverable, {});

  const [isAvailable, setIsAvailable] = useState<boolean>(
    teacherProfile?.isAvailable ?? true
  );

  const sessionList = useMemo(() => sessions ?? [], [sessions]);
  const bookingList = bookings ?? [];
  const studentList = discoverableStudents ?? [];
  const pendingBookings = bookingList.filter((b) => b.status === "pending");
  const upcomingSessions = useMemo(() => {
    return sessionList
      .filter((s) => s.status === "scheduled")
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [sessionList]);

  const needsAttention = pendingBookings.length > 0;

  const handleToggleAvailability = () => {
    const next = !isAvailable;
    setIsAvailable(next);
    toast.success(
      next
        ? "You are now marked Available for new student bookings."
        : "You are marked Unavailable. Existing sessions remain scheduled."
    );
  };

  return (
    <main className="min-h-screen bg-[#F5F4EF] text-[#111111] pb-24 pt-6 sm:pt-8">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        {/* Editorial Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <SectionLabel number="01" text="Faculty Management" className="mb-3" />
            <h1 className="text-2xl sm:text-4xl font-medium tracking-[-0.03em] text-[#111111]">
              Teacher Dashboard{user?.name ? `, ${user.name}` : ""}
            </h1>
            <p className="text-xs sm:text-sm text-[#111111]/70 mt-1 font-normal">
              Manage your live classes, schedule, student discovery, and teaching requests.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleAvailability}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                isAvailable
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-[#EBEAE5] border-[#E5E4DE] text-[#111111]/60"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAvailable ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                }`}
              />
              <span>{isAvailable ? "Accepting Students" : "Unavailable"}</span>
            </button>
            <PillButton
              variant="white"
              size="sm"
              onClick={() => navigate("/calendar")}
              showArrow
            >
              Calendar Schedule
            </PillButton>
            <PrimaryButton
              size="sm"
              onClick={() => navigate("/students")}
            >
              Find Students ({studentList.length})
            </PrimaryButton>
          </div>
        </div>

        {/* Verification Status Banner if Pending */}
        {teacherProfile && !teacherProfile.isVerified && (
          <div className="bg-white border border-[#F26522]/30 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#F26522]/10 text-[#F26522] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111111]">
                  Your educator credentials are under verification review
                </p>
                <p className="text-xs text-[#111111]/70 mt-0.5">
                  Our academic verification team audits degree transcripts and teaching certifications. You will receive an email confirmation once activated.
                </p>
              </div>
            </div>
            <PillButton
              size="sm"
              variant="white"
              onClick={() => navigate("/profile")}
              className="shrink-0"
              showArrow
            >
              View Profile
            </PillButton>
          </div>
        )}

        {/* Hero Banner: Student Discovery Invitation */}
        <div className="relative rounded-3xl bg-[#111111] text-white p-7 sm:p-9 mb-8 overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/15 mb-4">
                <Search className="w-3.5 h-3.5 text-[#F26522]" />
                <span>Reciprocal Discovery · Active Learners</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-white">
                Find Students & Propose Live Lessons
              </h2>
              <p className="text-xs sm:text-sm text-white/70 mt-2 leading-relaxed font-normal">
                Discover active students seeking guidance in your subjects. Review academic goals, curriculum targets, and preferred schedules, then send custom lesson invitations.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <PrimaryButton
                size="lg"
                onClick={() => navigate("/students")}
              >
                Browse Student Requests
              </PrimaryButton>
            </div>
          </div>
          {/* Subtle Orange Radial Glow */}
          <div className="absolute right-0 bottom-0 w-80 h-80 bg-radial from-[#F26522]/20 to-transparent rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* 4 Quantitative Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          <StatBlock
            label="Total sessions"
            value={sessionList.length}
            icon={Video}
            trend={upcomingSessions.length > 0 ? `${upcomingSessions.length} upcoming` : undefined}
          />
          <StatBlock
            label="Pending bookings"
            value={pendingBookings.length}
            icon={BookOpen}
            trend={pendingBookings.length > 0 ? "Requires action" : "Zero pending"}
          />
          <StatBlock
            label="Discoverable students"
            value={studentList.length}
            icon={Users}
            subtext="Ready for connection"
          />
          <StatBlock
            label="Instructor Rating"
            value={teacherProfile?.rating ? `${teacherProfile.rating}` : "5.0"}
            suffix="★"
            icon={Star}
            subtext="Verified student feedback"
          />
        </div>

        {/* Pending Bookings Alert */}
        {needsAttention && (
          <div className="bg-white rounded-3xl border border-blue-200 p-6 sm:p-8 mb-8 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span>Booking requests awaiting your response</span>
            </h3>
            <div className="space-y-3">
              {pendingBookings.slice(0, 3).map((booking) => (
                <div
                  key={booking._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {booking.studentName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {booking.studentName}
                      </p>
                      <p className="text-xs text-slate-600">
                        {booking.subject} · {booking.date} · {booking.timeSlot}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => navigate("/lessons")}
                      className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      Accept Booking
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upcoming Sessions & Student Requests */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Sessions Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Upcoming Live Sessions</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Launch live classrooms or review student attendees
                  </p>
                </div>
                {upcomingSessions.length > 0 && (
                  <button
                    onClick={() => navigate("/calendar")}
                    className="text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    View calendar →
                  </button>
                )}
              </div>

              {upcomingSessions.length === 0 ? (
                <EmptyState
                  icon={Video}
                  title="No upcoming sessions"
                  description="Create a live session or connect with discoverable students to schedule classes."
                  actionLabel="Find Students"
                  actionPath="/students"
                />
              ) : (
                <div className="space-y-3.5">
                  {upcomingSessions.slice(0, 5).map((session) => {
                    const sessionData = {
                      _id: session._id,
                      title: session.title,
                      subject: session.subject || "Academic Tutoring",
                      teacherName: user?.name || "Teacher",
                      studentName: `${session.enrolledCount} enrolled students`,
                      scheduledAt: session.scheduledAt,
                      durationMinutes: session.durationMinutes,
                      status: (session.status as any) || "scheduled",
                      meetingCode: `CLASS-${session._id.slice(-4)}`,
                    };

                    return (
                      <LessonCard
                        key={session._id}
                        lesson={sessionData}
                        onJoin={() => navigate(`/classroom/${session._id}`)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discoverable Students Spotlight */}
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E4DE]">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#111111] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#F26522]" />
                    <span>Recent Student Learning Requests</span>
                  </h3>
                  <p className="text-xs text-[#111111]/60 mt-0.5">
                    Students currently looking for guidance in your subject areas
                  </p>
                </div>
                <button
                  onClick={() => navigate("/students")}
                  className="text-xs font-semibold text-[#111111] hover:text-[#F26522] transition-colors cursor-pointer"
                >
                  View all ({studentList.length}) →
                </button>
              </div>

              {studentList.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No student requests yet"
                  description="Students seeking tutoring will appear here once they post learning goals."
                />
              ) : (
                <div className="space-y-3">
                  {studentList.slice(0, 3).map((student) => (
                    <div
                      key={student._id}
                      onClick={() => navigate("/students")}
                      className="p-4 bg-[#FAF9F5] rounded-2xl border border-[#E5E4DE] hover:border-[#111111]/30 hover:bg-white transition-all cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <ProfileAvatar
                          name={student.name}
                          image={student.avatarUrl || (student as any).image}
                          userId={student.userId}
                          role="student"
                          size="md"
                          shape="rounded"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-[#111111] truncate">
                              {student.name}
                            </p>
                            <span className="text-[10px] text-[#111111] font-semibold bg-[#E5E4DE] px-2 py-0.5 rounded-full">
                              {student.classLevel}
                            </span>
                          </div>
                          <p className="text-xs text-[#111111]/60 mt-0.5 truncate">
                            Needs help with:{" "}
                            <span className="font-semibold text-[#111111]">
                              {student.subjects.join(", ")}
                            </span>
                          </p>
                        </div>
                      </div>

                      <PillButton
                        size="sm"
                        variant="white"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/students");
                        }}
                        showArrow
                      >
                        Connect
                      </PillButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Quick Links & All Bookings */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]/40 mb-4">
                Instructor Actions
              </h4>
              <div className="space-y-2">
                {[
                  {
                    label: "Discover New Students",
                    path: "/students",
                    icon: Users,
                    primary: true,
                  },
                  {
                    label: "Manage Schedule & Calendar",
                    path: "/calendar",
                    icon: Calendar,
                  },
                  {
                    label: "Student Messages",
                    path: "/messages",
                    icon: MessageCircle,
                  },
                  {
                    label: "Teacher Profile Settings",
                    path: "/profile",
                    icon: ShieldCheck,
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

            {/* All bookings card */}
            <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]/40 mb-4 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#F26522]" />
                <span>Recent Bookings</span>
              </h4>

              {bookingList.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title="No bookings yet"
                  description="Booking requests from students will appear here."
                />
              ) : (
                <div className="space-y-2.5">
                  {bookingList.slice(0, 5).map((booking) => (
                    <div
                      key={booking._id}
                      className="flex items-center gap-3 p-3 bg-[#FAF9F5] rounded-2xl border border-[#E5E4DE]"
                    >
                      <ProfileAvatar
                        name={booking.studentName}
                        role="student"
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#111111] truncate">
                          {booking.studentName}
                        </p>
                        <p className="text-[11px] text-[#111111]/60">
                          {booking.subject} · {booking.date}
                        </p>
                      </div>
                      <StatusBadge
                        label={booking.status}
                        variant={
                          booking.status === "confirmed" ? "success" : "neutral"
                        }
                        dot
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
