import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Video } from "lucide-react";
import { useNavigate } from "react-router";

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
    <main className="min-h-screen bg-[#FAFAF8]">
      <header className="bg-white border-b border-stone-200/60 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4"><ArrowLeft className="w-4 h-4" /> Dashboard</Button>
          <h1 className="text-2xl font-extrabold text-slate-900">Calendar</h1>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-stone-50 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
            <h2 className="text-lg font-bold text-slate-900">{currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-stone-50 rounded-lg"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayLessons = getLessonsForDay(day);
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              return (
                <div key={day} className={`aspect-square p-1 rounded-lg border ${isToday ? "border-teal-400 bg-teal-50/50" : "border-stone-100"} ${dayLessons.length > 0 ? "cursor-pointer hover:bg-teal-50/30" : ""}`}>
                  <div className={`text-xs font-semibold ${isToday ? "text-teal-700" : "text-slate-600"}`}>{day}</div>
                  {dayLessons.length > 0 && (
                    <div className="mt-0.5">
                      {dayLessons.slice(0, 2).map((l) => (
                        <div key={l._id} className="w-full h-1.5 bg-teal-400 rounded-full mt-0.5" />
                      ))}
                      {dayLessons.length > 2 && <p className="text-[8px] text-teal-600 mt-0.5">+{dayLessons.length - 2}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming list */}
        {lessonList.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Upcoming Lessons</h3>
            <div className="space-y-2">
              {lessonList.slice(0, 5).map((l) => {
                const date = new Date(l.scheduledAt);
                return (
                  <div key={l._id} className="bg-white rounded-xl border border-stone-200/80 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate(`/classroom/${l._id}`)}>
                    <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center"><Video className="w-5 h-5 text-teal-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{l.title}</p>
                      <p className="text-xs text-slate-500">{l.teacherName} • {date.toLocaleDateString()} {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
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
