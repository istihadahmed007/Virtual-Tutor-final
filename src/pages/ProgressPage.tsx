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
    <main className="min-h-screen bg-transparent text-white pb-24 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <PageHeader
          title="Performance & Analytics"
          description="Track your learning milestones, total hours studied, and curriculum progression"
        />

        {progress ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                {
                  icon: Clock,
                  label: "Hours studied",
                  value: `${progress.totalHoursLearned}h`,
                  hint: "Total time spent in live sessions",
                },
                {
                  icon: BookOpen,
                  label: "Lessons completed",
                  value: progress.classesCompleted,
                  hint: "Completed and attended classes",
                },
                {
                  icon: Flame,
                  label: "Current streak",
                  value: `${progress.streakDays} days`,
                  hint: "Consecutive active learning days",
                },
                {
                  icon: Target,
                  label: "Subjects studied",
                  value: progress.subjectsStudied.length,
                  hint: "Active courses in curriculum",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 hover:border-violet-400/40 hover:bg-white/[0.07] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white/10 text-violet-400 border border-white/15 flex items-center justify-center mb-4">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-extrabold text-white font-display">
                    {s.value}
                  </p>
                  <p className="text-xs font-semibold text-white/70 mt-1">{s.label}</p>
                  <p className="text-[11px] text-white/40 mt-1">{s.hint}</p>
                </div>
              ))}
            </div>

            {/* Subject Breakdown */}
            {subjects.length > 0 && (
              <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 lg:p-8 mb-8 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <h3 className="text-lg font-bold text-white mb-6 font-display">
                  Subject Breakdown & Hours
                </h3>
                <div className="space-y-5">
                  {subjects.map((s) => {
                    const maxHours = Math.max(
                      ...subjects.map((x) => x.hoursLearned),
                      1,
                    );
                    const pct = (s.hoursLearned / maxHours) * 100;
                    return (
                      <div key={s.subject}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-white">
                            {s.subject}
                          </span>
                          <span className="text-xs text-white/60 font-medium">
                            {s.lessonsCompleted} lesson
                            {s.lessonsCompleted !== 1 ? "s" : ""} ·{" "}
                            {s.hoursLearned}h
                          </span>
                        </div>
                        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all shadow-[0_0_10px_rgba(139,92,246,0.5)]"
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
              <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 lg:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <h3 className="text-lg font-bold text-white mb-4 font-display">
                  Active Enrolled Subjects
                </h3>
                <div className="flex flex-wrap gap-2">
                  {progress.subjectsStudied.map((s) => (
                    <span
                      key={s}
                      className="px-4 py-2 bg-white/10 text-white text-xs font-semibold rounded-full border border-white/10"
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
