import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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

  const lessons = allLessons ?? [];
  const filtered =
    tab === "upcoming"
      ? lessons.filter((l) => l.status === "scheduled" || l.status === "in_progress")
      : tab === "completed"
        ? lessons.filter((l) => l.status === "completed")
        : lessons;

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <PageHeader
          title="Lessons"
          description="View and manage your learning sessions"
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { key: "upcoming" as Tab, label: "Upcoming" },
            { key: "completed" as Tab, label: "Completed" },
            { key: "all" as Tab, label: "All" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-teal-600 text-white"
                  : "bg-white border border-stone-200 text-slate-600 hover:bg-stone-50"
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
          <div className="space-y-2">
            {filtered.map((lesson) => {
              const date = new Date(lesson.scheduledAt);
              const isUpcoming = lesson.status === "scheduled";
              const isNow = lesson.status === "in_progress";

              return (
                <button
                  key={lesson._id}
                  onClick={() => navigate(`/classroom?session=${lesson._id}`)}
                  className="w-full bg-white rounded-xl border border-stone-200/80 p-4 flex items-center gap-4 hover:border-stone-300/80 hover:shadow-md transition-all text-left"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 ${
                      lesson.status === "completed"
                        ? "bg-emerald-500"
                        : isNow
                          ? "bg-indigo-500 animate-pulse"
                          : "bg-gradient-to-br from-teal-500 to-teal-600"
                    }`}
                  >
                    {lesson.status === "completed" ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {lesson.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lesson.teacherName} · {lesson.subject} ·{" "}
                      {lesson.durationMinutes} min
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-900">
                      {date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {date.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="mt-1">
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
