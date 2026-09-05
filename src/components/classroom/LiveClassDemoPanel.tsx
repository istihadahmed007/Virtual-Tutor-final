import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  Wrench,
  UserCheck,
  Video,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Lock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { setActiveSession, getRegisteredUsers } from "@/lib/auth-store";
import { LessonData } from "@/lib/live-class-availability";
import { toast } from "sonner";

interface LiveClassDemoPanelProps {
  onLessonUpdated?: (lesson: LessonData) => void;
  currentLessonId?: string;
  className?: string;
}

export function LiveClassDemoPanel({
  onLessonUpdated,
  currentLessonId,
  className = "",
}: LiveClassDemoPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // 1. Role Switching
  const handleSwitchUser = (targetEmail: string, roleName: string) => {
    const users = getRegisteredUsers();
    const target = users.find((u) => u.email.toLowerCase() === targetEmail.toLowerCase());
    if (target) {
      setActiveSession(target);
      toast.success(`Switched active user to ${target.name} (${roleName})`);
      window.location.reload();
    } else {
      toast.error(`Could not locate account for ${targetEmail}`);
    }
  };

  // 2. Preset Lesson Generator
  const applyPresetLesson = (preset: "live_now" | "starting_10m" | "tomorrow_locked" | "completed" | "pending" | "cancelled") => {
    const now = Date.now();
    const sessionId = currentLessonId || `live-session-${Date.now().toString().slice(-4)}`;

    let scheduledAt = now;
    let status = "scheduled";
    let title = "AP Calculus & Physics: Limits & Derivatives";
    let cancellationReason: string | undefined = undefined;

    switch (preset) {
      case "live_now":
        scheduledAt = now - 15 * 60 * 1000; // Started 15 minutes ago
        status = "in_progress";
        title = "🔴 LIVE NOW: AP Calculus Masterclass";
        break;
      case "starting_10m":
        scheduledAt = now + 10 * 60 * 1000; // 10 minutes from now (inside 15m window)
        status = "scheduled";
        title = "⚡ Starting in 10m: AP Calculus Practice Session";
        break;
      case "tomorrow_locked":
        scheduledAt = now + 24 * 60 * 60 * 1000; // Tomorrow (locked countdown)
        status = "scheduled";
        title = "🔒 Tomorrow: Physics Mechanics Lab";
        break;
      case "completed":
        scheduledAt = now - 90 * 60 * 1000; // Completed
        status = "completed";
        title = "✅ Completed: Honors Chemistry Breakdown";
        break;
      case "pending":
        scheduledAt = now + 12 * 60 * 60 * 1000;
        status = "pending";
        title = "⏳ Pending Confirmation: Organic Chemistry";
        break;
      case "cancelled":
        scheduledAt = now + 2 * 60 * 60 * 1000;
        status = "cancelled";
        cancellationReason = "Instructor emergency reschedule";
        title = "❌ Cancelled: Linear Algebra Problem Set";
        break;
    }

    const testLesson: LessonData = {
      _id: sessionId,
      title,
      subject: "Mathematics",
      teacherId: "demo_teacher_01",
      teacherName: "Dr. Sarah Chen",
      teacherTimezone: "America/New_York",
      studentId: "demo_student_01",
      studentName: "Alex Rivera",
      studentTimezone: "America/Los_Angeles",
      scheduledAt,
      durationMinutes: 60,
      status,
      cancellationReason,
      meetingCode: `LIVE-${sessionId.toUpperCase()}`,
      price: 45,
    };

    try {
      const existing = localStorage.getItem("vtp_mock_student_lessons");
      const list: LessonData[] = existing ? JSON.parse(existing) : [];
      const filtered = list.filter((l) => l._id !== testLesson._id);
      filtered.unshift(testLesson);
      localStorage.setItem("vtp_mock_student_lessons", JSON.stringify(filtered));
      localStorage.setItem("vtp_has_booked_first_lesson", "true");
    } catch (_) {}

    if (onLessonUpdated) {
      onLessonUpdated(testLesson);
    }

    toast.success(`Preset applied: ${title}`);
  };

  return (
    <div className={`border border-teal-200/80 bg-teal-50/70 rounded-2xl p-4 text-xs shadow-xs ${className}`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 font-bold text-teal-950">
          <Wrench className="w-4 h-4 text-teal-700" />
          <span>Live Class Demo / Reviewer State Switcher</span>
          <span className="text-[10px] bg-teal-200/80 text-teal-900 px-2 py-0.5 rounded-full font-mono">
            Dev Tools
          </span>
        </div>
        <button className="text-teal-700 hover:text-teal-900 p-1">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-3 border-t border-teal-200/60 space-y-4">
          {/* Active User Information */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-teal-100">
            <div>
              <p className="text-[11px] text-slate-500">Current Logged-in User:</p>
              <p className="font-bold text-slate-900">
                {user?.name || "Guest"} ({user?.role || "unauthorized"})
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSwitchUser("alex.rivera@liveclass.edu", "Student")}
                className="h-7 text-[11px] rounded-lg border-slate-200 hover:bg-teal-50"
              >
                👤 Switch to Student (Alex)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSwitchUser("sarah.chen@virtualtutorpro.com", "Teacher")}
                className="h-7 text-[11px] rounded-lg border-slate-200 hover:bg-teal-50"
              >
                👩‍🏫 Switch to Teacher (Dr. Chen)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSwitchUser("admin@virtualtutorpro.com", "Admin")}
                className="h-7 text-[11px] rounded-lg border-slate-200 hover:bg-teal-50"
              >
                🛡️ Admin
              </Button>
            </div>
          </div>

          {/* Quick Preset State Buttons */}
          <div>
            <p className="font-bold text-slate-900 mb-2">Simulate Lesson Lifecycle State:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => applyPresetLesson("live_now")}
                className="p-2.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-900 font-semibold text-left transition-all"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <Radio className="w-3.5 h-3.5" />
                  <span>1. Live Right Now</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Class in session, "Join Live" active
                </p>
              </button>

              <button
                onClick={() => applyPresetLesson("starting_10m")}
                className="p-2.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 font-semibold text-left transition-all"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>2. Starting in 10m</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Join window open (&lt;15m)
                </p>
              </button>

              <button
                onClick={() => applyPresetLesson("tomorrow_locked")}
                className="p-2.5 rounded-xl bg-white border border-teal-300 hover:bg-teal-50 text-teal-900 font-semibold text-left transition-all"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700">
                  <Lock className="w-3.5 h-3.5" />
                  <span>3. Tomorrow (Locked)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Countdown active, join disabled
                </p>
              </button>

              <button
                onClick={() => applyPresetLesson("completed")}
                className="p-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 font-semibold text-left transition-all"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>4. Completed Lesson</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Archived with notes & recording
                </p>
              </button>

              <button
                onClick={() => applyPresetLesson("pending")}
                className="p-2.5 rounded-xl bg-white border border-amber-200 hover:bg-amber-50 text-amber-900 font-semibold text-left transition-all"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>5. Pending Confirmation</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Awaiting teacher acceptance
                </p>
              </button>

              <button
                onClick={() => applyPresetLesson("cancelled")}
                className="p-2.5 rounded-xl bg-white border border-rose-300 hover:bg-rose-50 text-rose-900 font-semibold text-left transition-all"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>6. Cancelled Session</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  With cancellation reason
                </p>
              </button>
            </div>
          </div>

          {/* Quick Classroom Route Jump */}
          <div className="flex items-center justify-between gap-3 pt-2 text-[11px]">
            <span className="text-slate-600">Direct Navigation & Route Verification:</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/classroom/${currentLessonId || "live-session-1"}`)}
                className="h-7 text-xs rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Jump to /classroom/:lessonId</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
