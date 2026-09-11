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
    <main className="min-h-screen bg-[#F5F4EF] text-[#111111] pb-24">
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
              className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all ${
                tab === t.key
                  ? "bg-[#111111] text-white shadow-xs"
                  : "bg-white border border-[#E5E4DE] text-[#111111]/70 hover:border-[#111111]/40"
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
                  className="w-full bg-white rounded-3xl border border-[#E5E4DE] p-5 flex items-center gap-4 hover:border-[#111111]/40 hover:shadow-md transition-all text-left group shadow-xs"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                      lesson.status === "completed"
                        ? "bg-[#F5F4EF] text-[#111111] border-[#E5E4DE]"
                        : isNow
                          ? "bg-[#F26522] text-white border-transparent animate-pulse"
                          : "bg-[#111111] text-white border-[#111111] group-hover:bg-[#F26522] group-hover:border-[#F26522]"
                    }`}
                  >
                    {lesson.status === "completed" ? (
                      <CheckCircle className="w-5 h-5 text-[#111111]" />
                    ) : (
                      <Play className="w-5 h-5 fill-current" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-[#111111] truncate font-display">
                      {lesson.title}
                    </p>
                    <p className="text-xs text-[#111111]/60 mt-0.5">
                      {lesson.teacherName} · {lesson.subject} ·{" "}
                      {lesson.durationMinutes} min
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-[#111111]">
                      {date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-[#111111]/50">
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
