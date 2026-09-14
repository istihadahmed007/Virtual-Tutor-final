import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Video } from "lucide-react";
import { useNavigate } from "react-router";
import { SectionLabel } from "@/components/redesign/SectionLabel";

export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const lessons = useQuery(api.lessons.listUpcoming, {});

  const lessonList = lessons ?? [];

  // Get days in month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getLessonsForDay = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split("T")[0];
    return lessonList.filter((l) => {
      const lessonDate = new Date(l.scheduledAt).toISOString().split("T")[0];
      return lessonDate === dateStr;
    });
  };

  return (
    <main className="min-h-screen bg-transparent text-white pb-24 relative z-10">
      <header className="bg-slate-950/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="mb-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full text-xs font-semibold gap-2 border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <SectionLabel label="ACADEMIC SCHEDULE" />
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display mt-1">
                Calendar & Sessions
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)]">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
            <button
              onClick={prevMonth}
              className="p-2.5 hover:bg-white/10 rounded-full border border-white/15 text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white font-display">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2.5 hover:bg-white/10 rounded-full border border-white/15 text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-bold text-white/40 py-2 font-display uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayLessons = getLessonsForDay(day);
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              return (
                <div
                  key={day}
                  className={`aspect-square p-2.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? "border-violet-400 bg-violet-600/20 text-white font-bold shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                      : "border-white/10 hover:border-white/30 bg-white/[0.02]"
                  } ${dayLessons.length > 0 ? "cursor-pointer bg-white/[0.06] hover:bg-white/10" : ""}`}
                >
                  <div className={`text-xs ${isToday ? "text-violet-300 font-bold" : "text-white/70"}`}>
                    {day}
                  </div>
                  {dayLessons.length > 0 && (
                    <div className="mt-auto space-y-1">
                      {dayLessons.slice(0, 2).map((l) => (
                        <div key={l._id} className="w-full h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" />
                      ))}
                      {dayLessons.length > 2 && (
                        <p className="text-[9px] text-violet-400 font-bold">+{dayLessons.length - 2}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming list */}
        {lessonList.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white font-display">Upcoming Confirmed Lessons</h3>
            <div className="space-y-3">
              {lessonList.slice(0, 5).map((l) => {
                const date = new Date(l.scheduledAt);
                return (
                  <div
                    key={l._id}
                    className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-5 flex items-center gap-4 cursor-pointer hover:border-violet-400/40 hover:bg-white/[0.07] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] group"
                    onClick={() => navigate(`/classroom/${l._id}`)}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-violet-400 group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-indigo-600 group-hover:text-white transition-all">
                      <Video className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white font-display truncate group-hover:text-violet-300 transition-colors">{l.title}</p>
                      <p className="text-xs text-white/60 mt-0.5">
                        {l.teacherName} • {date.toLocaleDateString()} {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-1.5 shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all"
                    >
                      Enter Room
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
