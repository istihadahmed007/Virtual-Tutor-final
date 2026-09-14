import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTeacherEarnings } from "@/hooks/use-payments";
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
  Wallet,
  DollarSign,
  CheckCircle,
} from "lucide-react";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sessions = useQuery(api.sessions.listByTeacher);
  const { profile: teacherProfile } = useTeacherProfile();
  const bookings = useQuery(api.bookings.listByTeacher);
  const discoverableStudents = useQuery(api.studentProfiles.listDiscoverable, {});
  const earningsData = useTeacherEarnings();

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
    <main className="min-h-screen bg-transparent text-white pb-24 pt-6 sm:pt-8">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        {/* Editorial Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/15 mb-3">
              <span className="text-violet-400 font-mono">01</span>
              <span>Faculty Management</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-[-0.03em] text-white">
              Teacher Dashboard{user?.name ? `, ${user.name}` : ""}
            </h1>
            <p className="text-xs sm:text-sm text-white/70 mt-1 font-normal">
              Manage your live classes, schedule, student discovery, and teaching requests.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={handleToggleAvailability}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                isAvailable
                  ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                  : "bg-white/5 border-white/15 text-white/60"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAvailable ? "bg-emerald-400 animate-pulse" : "bg-white/30"
                }`}
              />
              <span>{isAvailable ? "Accepting Students" : "Unavailable"}</span>
            </button>
            <button
              onClick={() => navigate("/calendar")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              <span>Calendar Schedule</span>
            </button>
            <button
              onClick={() => navigate("/classroom")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_4px_16px_rgba(109,93,251,0.35)] transition-all cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Start Classroom</span>
            </button>
          </div>
        </div>

        {/* Verification Status Banner if Pending */}
        {teacherProfile && !teacherProfile.isVerified && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-amber-500/30 rounded-3xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.36)] text-white">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Your educator credentials are under verification review
                </p>
                <p className="text-xs text-white/70 mt-0.5">
                  Our academic verification team audits degree transcripts and teaching certifications. You will receive an email confirmation once activated.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/profile")}
              className="px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              View Profile →
            </button>
          </div>
        )}

        {/* Hero Banner: Student Discovery Invitation */}
        <div className="relative rounded-3xl bg-gradient-to-br from-violet-950/40 via-slate-950/60 to-indigo-950/40 backdrop-blur-xl border border-white/12 text-white p-7 sm:p-9 mb-8 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.36)]">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/15 mb-4">
                <Search className="w-3.5 h-3.5 text-violet-400" />
                <span>Reciprocal Discovery · Active Learners</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Find Students & Propose Live Lessons
              </h2>
              <p className="text-xs sm:text-sm text-white/70 mt-2 leading-relaxed font-normal">
                Discover active students seeking guidance in your subjects. Review academic goals, curriculum targets, and preferred schedules, then send custom lesson invitations.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => navigate("/students")}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_4px_20px_rgba(109,93,251,0.35)] transition-all cursor-pointer"
              >
                Browse Student Requests
              </button>
            </div>
          </div>
          {/* Subtle Violet Radial Glow */}
          <div className="absolute right-0 bottom-0 w-80 h-80 bg-radial from-violet-600/20 to-transparent rounded-full blur-3xl pointer-events-none" />
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
            value={teacherProfile?.rating ? `${teacherProfile.rating}` : "New Tutor"}
            suffix={teacherProfile?.rating ? "★" : undefined}
            icon={Star}
            subtext={teacherProfile?.rating ? "Verified student feedback" : "Awaiting student reviews"}
          />
        </div>

        {/* Pending Bookings Alert */}
        {needsAttention && (
          <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-amber-500/30 p-6 sm:p-8 mb-8 shadow-[0_8px_32px_rgba(0,0,0,0.36)] text-white">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Booking requests awaiting your response</span>
            </h3>
            <div className="space-y-3">
              {pendingBookings.slice(0, 3).map((booking) => (
                <div
                  key={booking._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/5 rounded-2xl border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                      {booking.studentName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {booking.studentName}
                      </p>
                      <p className="text-xs text-white/60">
                        {booking.subject} · {booking.date} · {booking.timeSlot}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => navigate("/lessons")}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-[0_4px_16px_rgba(109,93,251,0.35)] cursor-pointer"
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
            {/* Educator Earnings & Month-End Settlement Card */}
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36)] text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2 mb-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-violet-400" />
                    <span>Tuition Earnings & Monthly Settlement (85% Allocation)</span>
                  </h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    Student tuition fees collected up front; your 85% share accumulates for month-end disbursement.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-white/80 bg-white/10 border border-white/15 px-3 py-1 rounded-full w-fit">
                  Month-End Payout Model
                </span>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    This Month (85% Net)
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-white">
                      ৳{(earningsData?.currentMonthEarnings ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-white/40 font-bold">BDT</span>
                  </div>
                  <p className="text-[10px] text-white/60 mt-1">Accumulating for payout</p>
                </div>

                <div className="bg-gradient-to-r from-violet-600/25 to-indigo-600/25 rounded-2xl p-4 border border-violet-500/30 text-white shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                    Payable Month-End Settlement
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-white">
                      ৳{(earningsData?.pendingPayout ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-violet-400 font-bold">BDT</span>
                  </div>
                  <p className="text-[10px] text-white/70 mt-1">Scheduled for end of month</p>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Lifetime Received
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-white">
                      ৳{(earningsData?.lifetimeEarnings ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-white/40 font-bold">BDT</span>
                  </div>
                  <p className="text-[10px] text-white/60 mt-1">Total earned on Virtual Tutor</p>
                </div>
              </div>

              {/* Recent Lesson Earnings Breakdown */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                <div className="p-3 bg-white/5 border-b border-white/10 text-xs font-bold text-white flex justify-between items-center">
                  <span>Recent Lesson Earnings (85% Split)</span>
                  <span className="text-[10px] font-normal text-white/50">
                    Virtual Tutor retains 15% platform commission
                  </span>
                </div>

                {(!earningsData || earningsData.earningsList.length === 0) ? (
                  <div className="p-6 text-center text-white/40 text-xs">
                    No tuition earnings recorded yet. When students book and pay for your classes, your 85% earnings will accumulate here.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] font-bold text-white/40 uppercase bg-white/[0.02]">
                          <th className="py-2.5 px-4">Student</th>
                          <th className="py-2.5 px-4">Gross Tuition</th>
                          <th className="py-2.5 px-4">Platform Fee (15%)</th>
                          <th className="py-2.5 px-4">Your Earning (85%)</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {earningsData.earningsList.slice(0, 5).map((e) => (
                          <tr key={e._id} className="hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-white">
                              {e.studentName || "Student"}
                            </td>
                            <td className="py-2.5 px-4 text-white/70">
                              ৳{e.grossAmount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 text-white/40 text-[11px]">
                              ৳{e.platformFee.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-white">
                              ৳{e.teacherAmount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  e.status === "paid"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : e.status === "processing"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-white/10 border border-white/15 text-white/80"
                                }`}
                              >
                                {e.status === "payable" ? "Accruing" : e.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-white/40 text-[11px]">
                              {new Date(e.earnedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Sessions Card */}
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36)] text-white">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-violet-400" />
                    <span>Upcoming Live Sessions</span>
                  </h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    Launch live classrooms or review student attendees
                  </p>
                </div>
                {upcomingSessions.length > 0 && (
                  <button
                    onClick={() => navigate("/calendar")}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
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
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36)] text-white">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span>Recent Student Learning Requests</span>
                  </h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    Students currently looking for guidance in your subject areas
                  </p>
                </div>
                <button
                  onClick={() => navigate("/students")}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
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
                      className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-violet-400/40 hover:bg-white/[0.08] transition-all cursor-pointer flex items-center justify-between gap-3 text-white"
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
                            <p className="text-xs font-bold text-white truncate">
                              {student.name}
                            </p>
                            <span className="text-[10px] text-white/80 font-semibold bg-white/10 border border-white/15 px-2 py-0.5 rounded-full">
                              {student.classLevel}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 mt-0.5 truncate">
                            Needs help with:{" "}
                            <span className="font-semibold text-white">
                              {student.subjects.join(", ")}
                            </span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/students");
                        }}
                        className="px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold cursor-pointer"
                      >
                        Connect →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Quick Links & All Bookings */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36)] text-white">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
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
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-[0_4px_16px_rgba(109,93,251,0.3)]"
                        : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white border border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <link.icon
                        className={`w-4 h-4 ${
                          link.primary ? "text-white" : "text-violet-400"
                        }`}
                      />
                      <span>{link.label}</span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 ${
                        link.primary ? "text-white/70" : "text-white/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* All bookings card */}
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36)] text-white">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-violet-400" />
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
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10 text-white"
                    >
                      <ProfileAvatar
                        name={booking.studentName}
                        role="student"
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {booking.studentName}
                        </p>
                        <p className="text-[11px] text-white/60">
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
