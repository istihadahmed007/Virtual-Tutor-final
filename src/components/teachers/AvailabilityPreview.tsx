import { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  MessageSquare,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Button } from "../ui/button";
import { 
  AuthoritativeTeacher, 
  convertSlotTime,
  formatTk
} from "@/lib/teacher-authoritative-data";

interface AvailabilityPreviewProps {
  teacher: AuthoritativeTeacher;
  onSelectSlot?: (slot: {
    day: string;
    time: string;
    durationMinutes: number;
    price: number;
  }) => void;
  onMessageTeacher?: () => void;
  className?: string;
}

export function AvailabilityPreview({
  teacher,
  onSelectSlot,
  onMessageTeacher,
  className = "",
}: AvailabilityPreviewProps) {
  // Duration selection: 30, 45, or 60 min
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [selectedDay, setSelectedDay] = useState<string>(teacher.availableDays[0] || "Thursday");
  const [selectedTime, setSelectedTime] = useState<string>(teacher.availableTimeSlots[0] || "04:30 PM");

  const studentTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  }, []);

  // Monthly tuition price in Tk (charge monthly plan only)
  const currentPrice = useMemo(() => {
    return teacher.monthlyTuition || 4000;
  }, [teacher.monthlyTuition]);

  const convertedTimeInfo = useMemo(() => {
    return convertSlotTime(selectedTime, teacher.timezone, studentTimezone);
  }, [selectedTime, teacher.timezone, studentTimezone]);

  const handleBookNow = () => {
    if (onSelectSlot) {
      onSelectSlot({
        day: selectedDay,
        time: selectedTime,
        durationMinutes: selectedDuration,
        price: currentPrice,
      });
    }
  };

  return (
    <div
      id="availability-preview"
      role="region"
      aria-label="Teacher Live Availability & Timezone Converter"
      className={`rounded-3xl border border-white/12 bg-white/[0.04] backdrop-blur-xl p-6 md:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] text-white ${className}`}
    >
      {/* Header with Explicit Availability State */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                teacher.isAvailable
                  ? "bg-teal-500/20 text-teal-300 border border-teal-400/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${teacher.isAvailable ? "bg-teal-400 animate-pulse" : "bg-amber-400"}`} />
              {teacher.isAvailable ? "Available for Booking" : "Fully Booked This Week"}
            </span>
            <span className="text-xs text-white/50">
              ⚡ {teacher.responseTime}
            </span>
          </div>
          <h3 className="text-base md:text-lg font-bold text-white tracking-tight font-display">
            Live Booking & Timezone Schedule
          </h3>
        </div>

        {/* Earliest Slot Pill */}
        <div className="text-left sm:text-right">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-white/40 block">
            Next Opening
          </span>
          <span className="text-xs font-bold text-white bg-white/10 px-3 py-1 rounded-full border border-white/15 inline-block mt-0.5">
            {teacher.nextAvailableTime}
          </span>
        </div>
      </div>

      {/* If fully booked: show waitlist & direct message option */}
      {!teacher.isAvailable && (
        <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 backdrop-blur-md">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1 text-amber-200">
                {teacher.name} has no open slots this week.
              </p>
              <p className="text-amber-200/80 leading-relaxed mb-3">
                You can join the priority notification list or message {teacher.name.split(" ")[0]} directly to request a custom emergency or weekend slot.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onMessageTeacher}
                  className="h-8 text-xs border-amber-400/30 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold rounded-full cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1 text-amber-300" />
                  Message Teacher Directly
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Monthly Tuition Plan Selector (Monthly Plan Only) */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-white/60">
            1. Tuition Plan (Monthly Plan Only)
          </label>
          <span className="text-[11px] font-semibold text-white/75 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
            Monthly Charge Only
          </span>
        </div>

        <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-display">
                  Standard Monthly Tuition Plan
                </span>
                <span className="text-[10px] uppercase font-bold bg-violet-600 text-white px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(109,93,251,0.5)]">
                  Active
                </span>
              </div>
              <p className="text-xs text-white/70 mt-1.5 leading-relaxed">
                Full month curriculum coverage • Scheduled recurring 1-on-1 live sessions • Doubt solving, assignments & direct messaging
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xl font-bold text-white font-display">
                {formatTk(teacher.monthlyTuition)}
              </span>
              <span className="text-xs text-white/40 block font-medium">/ month</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Available Days */}
      <div className="mb-5">
        <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2 block">
          2. Select Day
        </label>
        <div className="flex flex-wrap gap-2">
          {teacher.availableDays.map((day) => {
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-400 shadow-[0_0_15px_rgba(109,93,251,0.4)]"
                    : "bg-white/5 border-white/12 text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Available Slots */}
      <div className="mb-5">
        <label className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2 block">
          3. Select Starting Time
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {teacher.availableTimeSlots.map((slot) => {
            const isSelected = selectedTime === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedTime(slot)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-400 shadow-[0_0_15px_rgba(109,93,251,0.4)] font-bold"
                    : "bg-white/5 border-white/12 text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timezone Comparison & Converter Box */}
      <div className="mb-6 rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 text-xs backdrop-blur-md">
        <div className="flex items-center gap-1.5 font-bold text-white mb-2 font-display">
          <Globe className="w-3.5 h-3.5 text-violet-400" />
          <span>Automatic Timezone Conversion</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-white/70">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-white/40 block mb-0.5">
              Teacher's Timezone ({teacher.timezone})
            </span>
            <span className="font-semibold text-white">
              {selectedDay} at {selectedTime}
            </span>
          </div>

          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-violet-400 block mb-0.5">
              Your Local Timezone ({studentTimezone})
            </span>
            <span className="font-bold text-white">
              {convertedTimeInfo.studentTime}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-white/40 mt-2">
          🛡️ {teacher.cancellationPolicy}.
        </p>
      </div>

      {/* Booking CTA Trigger */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white font-display">
              {formatTk(currentPrice)}
            </span>
            <span className="text-xs text-white/40 font-medium">
              / month (Monthly Plan)
            </span>
          </div>
          <p className="text-[11px] text-white/50 font-medium">
            Billed monthly in Tk • Includes regular live classes & materials
          </p>
        </div>

        <Button
          onClick={handleBookNow}
          className="w-full sm:w-auto h-11 px-6 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-[0_4px_20px_rgba(109,93,251,0.35)] inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <span>Enroll in Monthly Plan</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
