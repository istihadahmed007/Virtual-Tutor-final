import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useStudentPayments } from "@/hooks/use-payments";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Video, Play, CheckCircle, Calendar } from "lucide-react";
import { useNavigate } from "react-router";

type Tab = "upcoming" | "completed" | "all";

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Missed",
};

const statusVariants: Record<string, "info" | "success" | "warning" | "error" | "neutral"> = {
  scheduled: "info",
  in_progress: "success",
  completed: "success",
  cancelled: "error",
  no_show: "warning",
};

export default function LessonsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("upcoming");
  const allLessons = useQuery(api.lessons.listUpcoming, {});
  const studentPayments = useStudentPayments();

  const lessons = useMemo(() => {
    const list = [...(allLessons ?? [])];
    for (const p of studentPayments) {
      if (p.status === "paid" && p.bookingId) {
        const alreadyExists = list.some(
          (l) => l._id === p.bookingId || (l as any).bookingId === p.bookingId
        );
        if (!alreadyExists) {
          list.push({
            _id: p.bookingId as any,
            title: `${p.subject} with ${p.teacherName}`,
            subject: p.subject,
            teacherId: p.teacherId as any,
            teacherName: p.teacherName,
            studentId: p.studentId as any,
            studentName: p.studentName,
            scheduledAt: p.createdAt + 86400000,
            durationMinutes: p.durationMinutes || 60,
            status: "scheduled",
            meetingCode: `vtp-${p.bookingId.replace(/[^a-zA-Z0-9]/g, "")}`,
            joinUrl: `/classroom/vtp-${p.bookingId.replace(/[^a-zA-Z0-9]/g, "")}`,
            _creationTime: p.createdAt,
          } as any);
        }
      }
    }
    return list;
  }, [allLessons, studentPayments]);
  const filtered =
    tab === "upcoming"
      ? lessons.filter((l) => l.status === "scheduled" || l.status === "in_progress")
      : tab === "completed"
        ? lessons.filter((l) => l.status === "completed")
        : lessons;

  return (
    <main className="min-h-screen bg-transparent text-white pb-24 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <PageHeader
          title="Lessons & Classes"
          description="View and manage your real-time learning sessions and history"
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {([
            { key: "upcoming" as Tab, label: "Upcoming" },
            { key: "completed" as Tab, label: "Completed" },
            { key: "all" as Tab, label: "All Sessions" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all backdrop-blur-sm ${
                tab === t.key
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)] border border-violet-400/30"
                  : "bg-white/[0.04] border border-white/10 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Lesson list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Video}
            title={
              tab === "upcoming"
                ? "No upcoming lessons"
                : tab === "completed"
                  ? "No completed lessons yet"
                  : "No lessons yet"
            }
            description={
              tab === "upcoming"
                ? "Book your first lesson to see it here. Find a tutor who teaches your subject."
                : tab === "completed"
                  ? "Lessons you finish will appear here with feedback from your tutor."
                  : "Your learning sessions will appear here once you book a lesson."
            }
            actionLabel={tab === "upcoming" ? "Find a tutor" : undefined}
            actionPath={tab === "upcoming" ? "/teachers" : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((lesson) => {
              const date = new Date(lesson.scheduledAt);
              const isUpcoming = lesson.status === "scheduled";
              const isNow = lesson.status === "in_progress";

              return (
                <button
                  key={lesson._id}
                  onClick={() => navigate(`/classroom?session=${lesson._id}`)}
                  className="w-full bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-5 flex items-center gap-4 hover:border-violet-400/40 hover:bg-white/[0.07] transition-all text-left group shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] cursor-pointer"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                      lesson.status === "completed"
                        ? "bg-white/10 text-white/70 border-white/15"
                        : isNow
                          ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse"
                          : "bg-white/10 text-violet-400 border-white/15 group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-indigo-600 group-hover:text-white group-hover:border-violet-400/30"
                    }`}
                  >
                    {lesson.status === "completed" ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Play className="w-5 h-5 fill-current" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white truncate font-display group-hover:text-violet-300 transition-colors">
                      {lesson.title}
                    </p>
                    <p className="text-xs text-white/60 mt-0.5">
                      {lesson.teacherName} · {lesson.subject} ·{" "}
                      {lesson.durationMinutes} min
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-white">
                      {date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-white/50">
                      {date.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="mt-1.5">
                      <StatusBadge
                        label={statusLabels[lesson.status] || lesson.status}
                        variant={statusVariants[lesson.status] || "neutral"}
                        dot={isNow}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
