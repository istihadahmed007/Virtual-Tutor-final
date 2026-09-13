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
      className={`rounded-3xl border border-[#E5E4DE] bg-white p-6 md:p-7 shadow-xs ${className}`}
    >
      {/* Header with Explicit Availability State */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                teacher.isAvailable
                  ? "bg-teal-50 text-teal-800 border border-teal-200/60"
                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${teacher.isAvailable ? "bg-teal-500 animate-pulse" : "bg-amber-500"}`} />
              {teacher.isAvailable ? "Available for Booking" : "Fully Booked This Week"}
            </span>
            <span className="text-xs text-slate-500">
              ⚡ {teacher.responseTime}
            </span>
          </div>
          <h3 className="text-base md:text-lg font-bold text-[#0F172A] tracking-tight font-display">
            Live Booking & Timezone Schedule
          </h3>
        </div>

        {/* Earliest Slot Pill */}
        <div className="text-left sm:text-right">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
            Next Opening
          </span>
          <span className="text-xs font-bold text-[#0F172A] bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 inline-block mt-0.5">
            {teacher.nextAvailableTime}
          </span>
        </div>
      </div>

      {/* If fully booked: show waitlist & direct message option */}
      {!teacher.isAvailable && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">
                {teacher.name} has no open slots this week.
              </p>
              <p className="text-amber-800 leading-relaxed mb-3">
                You can join the priority notification list or message {teacher.name.split(" ")[0]} directly to request a custom emergency or weekend slot.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onMessageTeacher}
                  className="h-8 text-xs border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-semibold rounded-full"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
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
          <label className="text-xs font-bold uppercase tracking-wider text-[#111111]/60">
            1. Tuition Plan (Monthly Plan Only)
          </label>
          <span className="text-[11px] font-bold text-[#111111] bg-[#F5F4EF] px-2.5 py-0.5 rounded-full border border-[#E5E4DE]">
            Monthly Charge Only
          </span>
        </div>

        <div className="rounded-2xl border border-[#111111] bg-[#F5F4EF]/60 p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#111111] font-display">
                  Standard Monthly Tuition Plan
                </span>
                <span className="text-[10px] uppercase font-bold bg-[#111111] text-white px-2.5 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-xs text-[#111111]/70 mt-1.5 leading-relaxed">
                Full month curriculum coverage • Scheduled recurring 1-on-1 live sessions • Doubt solving, assignments & direct messaging
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xl font-bold text-[#111111] font-display">
                {formatTk(teacher.monthlyTuition)}
              </span>
              <span className="text-xs text-[#111111]/50 block font-medium">/ month</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Available Days */}
      <div className="mb-5">
        <label className="text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-2 block">
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
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                  isSelected
                    ? "bg-[#111111] text-white border-[#111111] shadow-xs"
                    : "bg-white border-[#E5E4DE] text-[#111111]/80 hover:border-[#111111]/40"
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
        <label className="text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-2 block">
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
                className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition ${
                  isSelected
                    ? "bg-[#111111] text-white border-[#111111] shadow-xs font-bold"
                    : "bg-white border-[#E5E4DE] text-[#111111]/80 hover:bg-[#F5F4EF]"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timezone Comparison & Converter Box */}
      <div className="mb-6 rounded-2xl bg-slate-50 border border-slate-200 p-3.5 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-[#0F172A] mb-2 font-display">
          <Globe className="w-3.5 h-3.5 text-[#6D5DFB]" />
          <span>Automatic Timezone Conversion</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Teacher's Timezone ({teacher.timezone})
            </span>
            <span className="font-semibold text-[#0F172A]">
              {selectedDay} at {selectedTime}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-[#6D5DFB] block mb-0.5">
              Your Local Timezone ({studentTimezone})
            </span>
            <span className="font-bold text-[#0F172A]">
              {convertedTimeInfo.studentTime}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-2">
          🛡️ {teacher.cancellationPolicy}.
        </p>
      </div>

      {/* Booking CTA Trigger */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#0F172A] font-display">
              {formatTk(currentPrice)}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              / month (Monthly Plan)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Billed monthly in Tk • Includes regular live classes & materials
          </p>
        </div>

        <Button
          onClick={handleBookNow}
          className="w-full sm:w-auto h-11 px-6 rounded-full bg-[#312E81] hover:bg-[#6D5DFB] text-white font-bold text-xs shadow-xs inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <span>Enroll in Monthly Plan</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
