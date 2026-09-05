import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TrendingUp, Clock, BookOpen, Flame, Target } from "lucide-react";

export default function ProgressPage() {
  const progress = useQuery(api.progress.get);
  const subjectBreakdown = useQuery(api.progress.getSubjectBreakdown);

  const subjects = subjectBreakdown ?? [];

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <PageHeader
          title="Your progress"
          description="Track your learning journey and see how far you've come"
        />

        {progress ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                {
                  icon: Clock,
                  label: "Hours studied",
                  value: `${progress.totalHoursLearned}h`,
                  hint: "Total time spent in lessons",
                  color: "bg-teal-50 text-teal-600",
                },
                {
                  icon: BookOpen,
                  label: "Lessons completed",
                  value: progress.classesCompleted,
                  hint: "Finished and attended lessons",
                  color: "bg-indigo-50 text-indigo-600",
                },
                {
                  icon: Flame,
                  label: "Current streak",
                  value: `${progress.streakDays} days`,
                  hint: "Consecutive days with at least one lesson",
                  color: "bg-amber-50 text-amber-600",
                },
                {
                  icon: Target,
                  label: "Subjects studied",
                  value: progress.subjectsStudied.length,
                  hint: "Different subjects you've had lessons in",
                  color: "bg-purple-50 text-purple-600",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-stone-200/80 p-4"
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}
                  >
                    <s.icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">
                    {s.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{s.hint}</p>
                </div>
              ))}
            </div>

            {/* Subject Breakdown */}
            {subjects.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200/80 p-5 mb-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">
                  Subject breakdown
                </h3>
                <div className="space-y-4">
                  {subjects.map((s) => {
                    const maxHours = Math.max(
                      ...subjects.map((x) => x.hoursLearned),
                      1,
                    );
                    const pct = (s.hoursLearned / maxHours) * 100;
                    return (
                      <div key={s.subject}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-slate-700">
                            {s.subject}
                          </span>
                          <span className="text-xs text-slate-500">
                            {s.lessonsCompleted} lesson
                            {s.lessonsCompleted !== 1 ? "s" : ""} ·{" "}
                            {s.hoursLearned}h
                          </span>
                        </div>
                        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subjects Studied */}
            {progress.subjectsStudied.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200/80 p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Subjects you're studying
                </h3>
                <div className="flex flex-wrap gap-2">
                  {progress.subjectsStudied.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-lg border border-teal-100"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="No progress yet"
            description="Complete your first lesson to start tracking your learning progress. Your hours, streaks, and subject breakdown will appear here."
            actionLabel="Find a tutor"
            actionPath="/teachers"
          />
        )}
      </div>
    </main>
  );
}
