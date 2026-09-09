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
    <main className="min-h-screen bg-[#F5F4EF] text-[#111111] pb-24">
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
                  className="bg-white rounded-3xl border border-[#E5E4DE] p-6 hover:border-[#111111]/40 transition-all shadow-xs"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#F5F4EF] text-[#111111] border border-[#E5E4DE] flex items-center justify-center mb-4">
                    <s.icon className="w-5 h-5 text-[#F26522]" />
                  </div>
                  <p className="text-3xl font-extrabold text-[#111111] font-display">
                    {s.value}
                  </p>
                  <p className="text-xs font-semibold text-[#111111]/70 mt-1">{s.label}</p>
                  <p className="text-[11px] text-[#111111]/40 mt-1">{s.hint}</p>
                </div>
              ))}
            </div>

            {/* Subject Breakdown */}
            {subjects.length > 0 && (
              <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 lg:p-8 mb-8 shadow-xs">
                <h3 className="text-lg font-bold text-[#111111] mb-6 font-display">
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
                          <span className="text-sm font-semibold text-[#111111]">
                            {s.subject}
                          </span>
                          <span className="text-xs text-[#111111]/60 font-medium">
                            {s.lessonsCompleted} lesson
                            {s.lessonsCompleted !== 1 ? "s" : ""} ·{" "}
                            {s.hoursLearned}h
                          </span>
                        </div>
                        <div className="h-2.5 bg-[#F5F4EF] rounded-full overflow-hidden border border-[#E5E4DE]/60">
                          <div
                            className="h-full bg-[#111111] rounded-full transition-all"
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
              <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 lg:p-8 shadow-xs">
                <h3 className="text-lg font-bold text-[#111111] mb-4 font-display">
                  Active Enrolled Subjects
                </h3>
                <div className="flex flex-wrap gap-2">
                  {progress.subjectsStudied.map((s) => (
                    <span
                      key={s}
                      className="px-4 py-2 bg-[#F5F4EF] text-[#111111] text-xs font-semibold rounded-full border border-[#E5E4DE]"
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
