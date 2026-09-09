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
    <main className="min-h-screen bg-[#F5F4EF] text-[#111111] pb-24">
      <header className="bg-white/80 backdrop-blur-xs border-b border-[#E5E4DE] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="mb-3 text-[#111111]/70 hover:text-[#111111] hover:bg-white rounded-full text-xs font-semibold gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <SectionLabel label="ACADEMIC SCHEDULE" />
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111] font-display mt-1">
                Calendar & Sessions
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="bg-white rounded-3xl border border-[#E5E4DE] p-6 sm:p-8 shadow-xs">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E5E4DE]">
            <button
              onClick={prevMonth}
              className="p-2.5 hover:bg-[#F5F4EF] rounded-full border border-[#E5E4DE] text-[#111111] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[#111111] font-display">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2.5 hover:bg-[#F5F4EF] rounded-full border border-[#E5E4DE] text-[#111111] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-bold text-[#111111]/50 py-2 font-display uppercase tracking-wider">
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
                  className={`aspect-square p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? "border-[#111111] bg-[#F5F4EF] font-bold"
                      : "border-[#E5E4DE]/70 hover:border-[#111111]/40"
                  } ${dayLessons.length > 0 ? "cursor-pointer bg-white" : ""}`}
                >
                  <div className={`text-xs ${isToday ? "text-[#111111] font-bold" : "text-[#111111]/70"}`}>
                    {day}
                  </div>
                  {dayLessons.length > 0 && (
                    <div className="mt-auto space-y-1">
                      {dayLessons.slice(0, 2).map((l) => (
                        <div key={l._id} className="w-full h-1.5 bg-[#F26522] rounded-full" />
                      ))}
                      {dayLessons.length > 2 && (
                        <p className="text-[9px] text-[#F26522] font-bold">+{dayLessons.length - 2}</p>
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
            <h3 className="text-lg font-bold text-[#111111] font-display">Upcoming Confirmed Lessons</h3>
            <div className="space-y-3">
              {lessonList.slice(0, 5).map((l) => {
                const date = new Date(l.scheduledAt);
                return (
                  <div
                    key={l._id}
                    className="bg-white rounded-3xl border border-[#E5E4DE] p-5 flex items-center gap-4 cursor-pointer hover:border-[#111111] transition-all shadow-xs"
                    onClick={() => navigate(`/classroom/${l._id}`)}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#F5F4EF] border border-[#E5E4DE] flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-[#F26522]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#111111] font-display truncate">{l.title}</p>
                      <p className="text-xs text-[#111111]/60 mt-0.5">
                        {l.teacherName} • {date.toLocaleDateString()} {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-[#E5E4DE] text-xs font-semibold hover:bg-[#111111] hover:text-white transition-colors"
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
