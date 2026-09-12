import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Video,
  Play,
  Clock,
  Globe,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  Radio,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  FileText,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  computeLessonAvailability,
  LessonData,
  LessonLifecycleStatus,
} from "@/lib/live-class-availability";
import { useAuth } from "@/hooks/use-auth";

interface LiveClassAvailabilityProps {
  lesson: LessonData;
  variant?: "card" | "banner" | "compact";
  showProviderStatus?: boolean;
  onStatusChange?: (status: LessonLifecycleStatus) => void;
  className?: string;
  isTeacher?: boolean;
  user?: any;
  compact?: boolean;
}

export function LiveClassAvailability({
  lesson,
  variant = "card",
  showProviderStatus = true,
  onStatusChange,
  className = "",
  isTeacher,
  user: propUser,
  compact = false,
}: LiveClassAvailabilityProps) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const user = propUser || authUser;
  const effectiveVariant = compact ? "compact" : variant;

  // Tick every second to keep countdowns and join windows real-time accurate
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const availability = useMemo(() => {
    return computeLessonAvailability({
      lesson,
      user,
      currentTime,
      isTeacherOverride: isTeacher,
    });
  }, [lesson, user, currentTime, isTeacher]);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(availability.computedStatus);
    }
  }, [availability.computedStatus, onStatusChange]);

  // Check if real LiveKit provider is configured via environment variable
  const hasLiveKitConfigured = Boolean(
    import.meta.env.VITE_LIVEKIT_URL &&
    !import.meta.env.VITE_LIVEKIT_URL.includes("placeholder")
  );

  const isTeacherRole = isTeacher !== undefined ? isTeacher : (availability.authorizationRole === "teacher" || user?.role === "teacher");

  const handleAction = () => {
    if (availability.canJoin) {
      navigate(availability.classroomPath);
    }
  };

  // Status badge styling
  const getBadgeStyle = () => {
    switch (availability.computedStatus) {
      case "live":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse";
      case "starting_soon":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "scheduled":
        return "bg-teal-50 text-teal-800 border-teal-200";
      case "completed":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "pending":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "no_show":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Compact variant (e.g. for tables or small widgets)
  if (effectiveVariant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle()}`}
        >
          {availability.isLive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
          {availability.statusLabel}
        </span>

        {availability.canJoin ? (
          <Button
            size="sm"
            onClick={handleAction}
            className="h-7 text-xs px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Join Live</span>
          </Button>
        ) : availability.computedStatus === "scheduled" ? (
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{availability.countdownFormatted}</span>
          </span>
        ) : null}
      </div>
    );
  }

  // Full Card Variant
  return (
    <div
      className={`rounded-2xl border transition-all ${
        availability.isLive
          ? "border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-400/40"
          : availability.isStartingSoon
            ? "border-amber-300 bg-amber-50/40 ring-1 ring-amber-400/30"
            : "border-slate-200 bg-white"
      } p-5 sm:p-6 shadow-xs ${className}`}
      aria-live="polite"
    >
      {/* Top row: Status Badge + Provider status + Authorization pill */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getBadgeStyle()}`}
          >
            {availability.isLive ? (
              <>
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                <span>Live Class in Progress</span>
              </>
            ) : availability.isStartingSoon ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>Starting Soon ({availability.countdownFormatted})</span>
              </>
            ) : (
              availability.statusLabel
            )}
          </span>

          {/* User Authorization Badge */}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <ShieldCheck className="w-3 h-3 text-teal-600" />
            <span className="capitalize">
              {availability.authorizationRole === "teacher"
                ? "Instructor"
                : availability.authorizationRole === "student"
                  ? "Enrolled Student"
                  : availability.authorizationRole === "admin"
                    ? "Admin Supervisor"
                    : availability.authorizationRole === "parent"
                      ? "Guardian"
                      : "Unauthorized"}
            </span>
          </span>
        </div>

        {/* Video Infrastructure Provider Indicator */}
        {showProviderStatus && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
            <span
              className={`w-2 h-2 rounded-full ${
                hasLiveKitConfigured ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>
              {hasLiveKitConfigured
                ? "LiveKit SFU Active"
                : "Dev Fallback Mode (WebRTC/Mock)"}
            </span>
          </div>
        )}
      </div>

      {/* Main Content Info */}
      <div className="space-y-3 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              {lesson.title || `${lesson.subject} Lesson`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTeacher
                ? `Student: ${lesson.studentName || "Enrolled Student"}`
                : `Instructor: ${lesson.teacherName || "Assigned Instructor"}`}
              {" · "}
              {lesson.durationMinutes || 60} minutes
            </p>
          </div>

          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/60">
            <Video className="w-5 h-5" />
          </div>
        </div>

        {/* Timezone and Schedule Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Your Scheduled Time ({availability.studentTimezone}):</span>
            </div>
            <p className="font-bold text-slate-900 text-xs sm:text-sm">
              {availability.studentFormattedTime}
            </p>
          </div>

          {availability.timezonesDiffer && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                <Globe className="w-3.5 h-3.5 text-teal-600" />
                <span>{isTeacher ? "Student's Timezone" : "Teacher's Timezone"} ({availability.teacherTimezone}):</span>
              </div>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">
                {availability.teacherFormattedTime}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Join Window Notification Banner */}
      <div className="mb-5">
        {availability.canJoin ? (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">
                {availability.isLive ? "Live Classroom In Session" : "Join Window is Open!"}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {isTeacher
                  ? "Your classroom tools and whiteboard are initialized. Click below to start teaching."
                  : "You can enter the room now to test your audio, camera, and join your instructor."}
              </p>
            </div>
          </div>
        ) : availability.computedStatus === "scheduled" ? (
          <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/70 text-teal-950 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">
                Join available 15 minutes before start
              </p>
              <p className="text-[11px] text-teal-700 mt-0.5">
                Countdown: <span className="font-semibold">{availability.countdownFormatted}</span> until access opens. We will notify you when the room unlocks.
              </p>
            </div>
          </div>
        ) : availability.computedStatus === "completed" ? (
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Class Session Completed</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Feedback and session resources have been published for this lesson.
              </p>
            </div>
          </div>
        ) : availability.computedStatus === "cancelled" ? (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Lesson Cancelled</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {availability.joinDisabledReason || "This scheduled session was cancelled."}
              </p>
            </div>
          </div>
        ) : availability.computedStatus === "no_show" ? (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Marked as Missed / No-Show</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                The session was not attended during the scheduled window. You can reschedule below.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Pending Confirmation</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Waiting for the instructor to confirm this proposed time slot.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Primary Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="text-[11px] text-slate-400">
          Room ID: <span className="font-mono text-slate-600 font-semibold">{lesson._id}</span>
        </div>

        <div className="flex items-center gap-2">
          {availability.canJoin ? (
            <Button
              onClick={handleAction}
              className={`rounded-xl px-5 py-2.5 font-bold text-xs sm:text-sm text-white shadow-sm flex items-center gap-2 ${
                availability.isLive
                  ? "bg-emerald-600 hover:bg-emerald-700 animate-pulse"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              {isTeacherRole ? (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Class (Instructor)</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Join Live Class</span>
                </>
              )}
            </Button>
          ) : availability.computedStatus === "completed" ? (
            <Button
              variant="outline"
              onClick={() => navigate(availability.classroomPath)}
              className="rounded-xl text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>Review Session Notes & Feedback</span>
            </Button>
          ) : availability.computedStatus === "cancelled" || availability.computedStatus === "no_show" ? (
            <Button
              variant="outline"
              onClick={() => navigate("/teachers")}
              className="rounded-xl text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
              <span>Reschedule Session</span>
            </Button>
          ) : (
            <Button
              disabled
              variant="outline"
              className="rounded-xl text-xs font-semibold text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Join Locked (15m before)</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
