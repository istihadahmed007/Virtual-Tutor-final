import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useTeacherProfile } from "@/hooks/use-teacher-profile";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { LiveClassAvailability } from "@/components/classroom/LiveClassAvailability";
import {
  Video,
  Users,
  Calendar,
  Clock,
  Star,
  MessageCircle,
  BookOpen,
  AlertCircle,
  Search,
  Sparkles,
  ChevronRight,
  Send,
  UserCheck,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sessions = useQuery(api.sessions.listByTeacher);
  const { profile: teacherProfile } = useTeacherProfile();
  const bookings = useQuery(api.bookings.listByTeacher);
  const discoverableStudents = useQuery(api.studentProfiles.listDiscoverable, {});

  const sessionList = sessions ?? [];
  const bookingList = bookings ?? [];
  const studentList = discoverableStudents ?? [];
  const pendingBookings = bookingList.filter((b) => b.status === "pending");
  const upcomingSessions = useMemo(() => {
    return sessionList
      .filter((s) => s.status === "scheduled")
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [sessionList]);

  const needsAttention = pendingBookings.length > 0;

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <PageHeader
          title={`Teacher Dashboard${user?.name ? `, ${user.name}` : ""}`}
          description="Manage your live classes, schedule, student discovery, and teaching requests"
        />

        {/* Verification/Profile Status */}
        {teacherProfile && !teacherProfile.isVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  Your profile is under review
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Our team is reviewing your credentials. You'll be notified once
                  verified.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 shrink-0"
              onClick={() => navigate("/profile")}
            >
              View profile
            </Button>
          </div>
        )}

        {/* Prominent Discovery Callout: Find Students */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-teal-900 text-white p-6 sm:p-7 mb-6 shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30 mb-3">
                <Search className="w-3.5 h-3.5" />
                <span>Reciprocal Discovery · Teacher Experience</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Find Students & Propose Live Lessons
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/90 mt-1.5 leading-relaxed">
                Discover active learners seeking help in your subjects. Review academic goals, curriculum requirements, and preferred learning formats, then send customized lesson invitations.
              </p>

              {/* Journey Path Pills */}
              <div className="mt-4 flex items-center gap-2 text-[11px] text-teal-200/80 flex-wrap">
                <span className="font-semibold text-white">Find Students</span>
                <ChevronRight className="w-3 h-3 text-teal-400" />
                <span>Student Profile</span>
                <ChevronRight className="w-3 h-3 text-teal-400" />
                <span>Learning Requirements</span>
                <ChevronRight className="w-3 h-3 text-teal-400" />
                <span className="text-emerald-300 font-semibold">Send Lesson Invite</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Button
                size="lg"
                onClick={() => navigate("/students")}
                className="bg-white hover:bg-teal-50 text-slate-950 font-bold px-6 shadow-md gap-2"
              >
                <Users className="w-4 h-4 text-teal-700" />
                Find Students Now ({studentList.length})
              </Button>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-6 pointer-events-none">
            <Users className="w-64 h-64 text-white" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={Video}
            label="Total sessions"
            value={sessionList.length}
            iconBg="bg-teal-50"
          />
          <StatCard
            icon={BookOpen}
            label="Pending bookings"
            value={pendingBookings.length}
            iconBg="bg-amber-50"
          />
          <StatCard
            icon={Users}
            label="Discoverable students"
            value={studentList.length}
            iconBg="bg-indigo-50"
          />
          <StatCard
            icon={Star}
            label="Rating"
            value={teacherProfile?.rating ? `${teacherProfile.rating} ★` : "5.0 ★"}
            iconBg="bg-amber-50"
          />
        </div>

        {/* Pending bookings alert */}
        {needsAttention && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" /> Booking requests needing
              attention
            </h3>
            <div className="space-y-2">
              {pendingBookings.slice(0, 3).map((booking) => (
                <div
                  key={booking._id}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-100"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0">
                    {booking.studentName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {booking.studentName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {booking.subject} · {booking.date} · {booking.timeSlot}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs shrink-0"
                  >
                    Accept
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Today's / Upcoming sessions */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-500" /> Upcoming
                  sessions
                </h3>
                {upcomingSessions.length > 0 && (
                  <button
                    onClick={() => navigate("/calendar")}
                    className="text-xs font-medium text-teal-600 hover:text-teal-700"
                  >
                    View calendar
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
                <div className="space-y-3">
                  {upcomingSessions.slice(0, 5).map((session, idx) => {
                    const sessionData = {
                      _id: session._id,
                      title: session.title,
                      subject: session.subject || "Academic Tutoring",
                      teacherId: session.teacherId || user?._id || "teacher_01",
                      teacherName: user?.name || "Teacher",
                      teacherTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                      studentId: "student_enrolled",
                      studentName: `${session.enrolledCount} enrolled students`,
                      studentTimezone: "America/New_York",
                      scheduledAt: session.scheduledAt,
                      durationMinutes: session.durationMinutes,
                      status: session.status || "scheduled",
                      meetingCode: `CLASS-${session._id.slice(-4)}`,
                    };

                    return (
                      <LiveClassAvailability
                        key={session._id}
                        lesson={sessionData}
                        user={user}
                        isTeacher={true}
                        compact={idx > 0}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discoverable Students Spotlight */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" /> Recent Student Learning Requests
                </h3>
                <button
                  onClick={() => navigate("/students")}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {studentList.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No student requests yet"
                  description="Students seeking tutoring will appear here once they create learning requests."
                />
              ) : (
                <div className="space-y-3">
                  {studentList.slice(0, 3).map((student) => (
                    <div
                      key={student._id}
                      onClick={() => navigate("/students")}
                      className="p-3.5 bg-[#FAFAF8] rounded-xl border border-stone-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
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
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {student.name}
                            </p>
                            <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.2 rounded">
                              {student.classLevel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            Needs help with: <span className="font-semibold text-slate-700">{student.subjects.join(", ")}</span>
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/students");
                        }}
                        className="text-xs border-stone-200 shrink-0 gap-1"
                      >
                        <Send className="w-3 h-3 text-teal-600" />
                        Connect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All bookings */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-indigo-500" /> All bookings
              </h3>
              {bookingList.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title="No bookings yet"
                  description="Booking requests from students will appear here."
                />
              ) : (
                <div className="space-y-2">
                  {bookingList.slice(0, 5).map((booking) => (
                    <div
                      key={booking._id}
                      className="flex items-center gap-3 p-3 bg-[#FAFAF8] rounded-xl"
                    >
                      <ProfileAvatar
                        name={booking.studentName}
                        role="student"
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {booking.studentName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {booking.subject} · {booking.date} · {booking.timeSlot}
                        </p>
                      </div>
                      <StatusBadge
                        label={
                          booking.status === "pending"
                            ? "Pending"
                            : booking.status === "confirmed"
                              ? "Confirmed"
                              : booking.status === "completed"
                                ? "Completed"
                                : "Cancelled"
                        }
                        variant={
                          booking.status === "pending"
                            ? "warning"
                            : booking.status === "confirmed"
                              ? "success"
                              : booking.status === "completed"
                                ? "info"
                                : "neutral"
                        }
                        dot
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick actions (Specified: Find Students, My Students, Calendar, Assignments) */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Quick Actions</span>
                <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
                  Educator
                </span>
              </h3>
              <div className="space-y-1.5">
                {[
                  { label: "Find Students", icon: Users, path: "/students", primary: true },
                  { label: "My Students", icon: UserCheck, path: "/calendar" },
                  { label: "Calendar", icon: Calendar, path: "/calendar" },
                  { label: "Assignments", icon: BookOpen, path: "/assignments" },
                  { label: "Messages", icon: MessageCircle, path: "/messages" },
                  { label: "Set Availability", icon: Clock, path: "/profile" },
                ].map((link, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(link.path)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all text-left ${
                      link.primary
                        ? "bg-teal-600 text-white hover:bg-teal-700 shadow-xs"
                        : "text-slate-700 hover:text-teal-700 hover:bg-stone-50 border border-transparent hover:border-stone-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <link.icon className={`w-4 h-4 ${link.primary ? "text-white" : "text-teal-600"}`} />
                      <span>{link.label}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 ${link.primary ? "text-teal-200" : "text-slate-300"}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Status */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Teacher Profile Status
              </h3>
              {teacherProfile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Verification</span>
                    <StatusBadge
                      label={
                        teacherProfile.isVerified ? "Verified" : "Under review"
                      }
                      variant={
                        teacherProfile.isVerified ? "success" : "pending"
                      }
                      dot
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Available for Bookings</span>
                    <StatusBadge
                      label={teacherProfile.isAvailable ? "Yes" : "No"}
                      variant={
                        teacherProfile.isAvailable ? "success" : "neutral"
                      }
                      dot
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Profile Completion</span>
                    <span className="text-sm font-bold text-slate-900">
                      {teacherProfile.profileCompletionPct || teacherProfile.profileCompletionScore || 0}%
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-xs border-stone-200"
                    onClick={() => navigate("/profile")}
                  >
                    Edit Profile & Availability
                  </Button>
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="Complete your profile"
                  description="Set up your teaching profile to start receiving student bookings."
                  actionLabel="Create profile"
                  actionPath="/profile"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
