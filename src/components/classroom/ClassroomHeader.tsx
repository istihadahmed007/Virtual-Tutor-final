import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Wifi,
  Radio,
  Copy,
  Check,
  Award,
  PhoneOff,
  Disc,
  Shield,
  Square,
  Lock,
  Unlock,
  Users,
} from "lucide-react";

interface ClassroomHeaderProps {
  title: string;
  subject: string;
  teacherName: string;
  sessionId: string;
  isTeacher: boolean;
  sessionStatus?: "scheduled" | "waiting" | "live" | "paused" | "completed" | "cancelled";
  isRecording?: boolean;
  recordingStartedAt?: number;
  isLocked?: boolean;
  onLeave: () => void;
  onEndLesson?: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onTogglePauseLesson?: () => void;
  onToggleLockRoom?: () => void;
  onOpenHostControls?: () => void;
  timerRemainingSeconds?: number;
  timerRunning?: boolean;
  onUpdateTimer?: (remaining: number, running: boolean) => void;
  connectionQuality?: "excellent" | "fair" | "poor";
}

export function ClassroomHeader({
  title,
  subject,
  teacherName,
  sessionId,
  isTeacher,
  sessionStatus = "live",
  isRecording = false,
  recordingStartedAt,
  isLocked = false,
  onLeave,
  onEndLesson,
  onStartRecording,
  onStopRecording,
  onTogglePauseLesson,
  onToggleLockRoom,
  onOpenHostControls,
  timerRemainingSeconds = 1800,
  timerRunning = false,
  onUpdateTimer,
  connectionQuality = "excellent",
}: ClassroomHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [localSeconds, setLocalSeconds] = useState(timerRemainingSeconds);
  const [localRunning, setLocalRunning] = useState(timerRunning);
  const [recElapsed, setRecElapsed] = useState(0);

  useEffect(() => {
    setLocalSeconds(timerRemainingSeconds);
  }, [timerRemainingSeconds]);

  useEffect(() => {
    setLocalRunning(timerRunning);
  }, [timerRunning]);

  // Recording elapsed counter
  useEffect(() => {
    if (!isRecording || !recordingStartedAt) {
      setRecElapsed(0);
      return;
    }
    const tick = () => {
      setRecElapsed(Math.max(0, Math.floor((Date.now() - recordingStartedAt) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRecording, recordingStartedAt]);

  // Local timer tick
  useEffect(() => {
    if (!localRunning) return;
    const interval = setInterval(() => {
      setLocalSeconds((prev) => {
        if (prev <= 1) {
          if (isTeacher && onUpdateTimer) onUpdateTimer(0, false);
          return 0;
        }
        const next = prev - 1;
        if (isTeacher && next % 5 === 0 && onUpdateTimer) {
          onUpdateTimer(next, true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [localRunning, isTeacher, onUpdateTimer]);

  const toggleTimer = () => {
    const nextRunning = !localRunning;
    setLocalRunning(nextRunning);
    if (onUpdateTimer) {
      onUpdateTimer(localSeconds, nextRunning);
    }
  };

  const resetTimer = (seconds: number) => {
    setLocalSeconds(seconds);
    setLocalRunning(false);
    if (onUpdateTimer) {
      onUpdateTimer(seconds, false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const copyMeetingCode = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-5 h-14 flex items-center justify-between shrink-0 select-none z-20">
      {/* ─── Left section: Navigation & Class Info ───────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onLeave}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          title="Back to Dashboard"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[160px] sm:max-w-[280px]">
              {title}
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium shrink-0">
              {subject}
            </span>
            {sessionStatus === "paused" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0 animate-pulse">
                PAUSED
              </span>
            )}
            {isLocked && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold flex items-center gap-1 shrink-0">
                <Lock className="w-2.5 h-2.5" /> LOCKED
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
            <span className="truncate">Teacher: {teacherName}</span>
            <span className="text-slate-600">·</span>
            <button
              onClick={copyMeetingCode}
              className="flex items-center gap-1 text-slate-400 hover:text-teal-400 transition-colors"
              title="Copy session link / room code"
            >
              <span>Code: {sessionId.slice(0, 8)}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Middle section: Recording Status & Lesson Timer ────────── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Recording status pill */}
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-full animate-pulse shadow-sm">
            <Radio className="w-3 h-3 text-red-400" />
            <span className="text-[10px] font-bold text-red-400 tracking-wider">
              REC {recElapsed > 0 ? formatTime(recElapsed) : ""}
            </span>
          </div>
        )}

        {/* Lesson Timer Dock */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1">
          <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span
            className={`text-xs font-mono font-bold ${
              localSeconds < 300 ? "text-amber-400 animate-pulse" : "text-white"
            }`}
          >
            {formatTime(localSeconds)}
          </span>

          {isTeacher && (
            <div className="flex items-center gap-1 ml-1 border-l border-slate-700 pl-1.5">
              <button
                onClick={toggleTimer}
                className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
                title={localRunning ? "Pause timer" : "Start timer"}
              >
                {localRunning ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-teal-400" />}
              </button>
              <button
                onClick={() => resetTimer(1800)}
                className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
                title="Reset to 30 mins"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Right section: Teacher Host Controls & Exit / End Lesson ── */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Host Controls Toggle (Teacher Only) */}
        {isTeacher && onOpenHostControls && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenHostControls}
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs h-8 px-2.5 gap-1.5 rounded-lg"
            title="Classroom Security & Permissions"
          >
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden lg:inline">Host Controls</span>
          </Button>
        )}

        {/* Teacher Recording Button */}
        {isTeacher && (
          <Button
            size="sm"
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`text-xs h-8 px-2.5 gap-1.5 rounded-lg font-medium transition-all ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
            }`}
            title={isRecording ? "Stop Classroom Recording" : "Start Classroom Recording"}
          >
            {isRecording ? <Square className="w-3 h-3 fill-current" /> : <Disc className="w-3.5 h-3.5 text-red-400" />}
            <span className="hidden sm:inline">{isRecording ? "Stop Rec" : "Record"}</span>
          </Button>
        )}

        {/* Teacher Pause/Resume toggle */}
        {isTeacher && onTogglePauseLesson && (
          <Button
            size="sm"
            onClick={onTogglePauseLesson}
            className={`text-xs h-8 px-2.5 gap-1 rounded-lg font-medium ${
              sessionStatus === "paused"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300"
            }`}
            title={sessionStatus === "paused" ? "Resume live lesson" : "Pause live lesson"}
          >
            {sessionStatus === "paused" ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span className="hidden xl:inline">{sessionStatus === "paused" ? "Resume" : "Pause"}</span>
          </Button>
        )}

        {/* Connection Quality */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 text-[10px]"
          title={`Connection Quality: ${connectionQuality}`}
        >
          <Wifi
            className={`w-3.5 h-3.5 ${
              connectionQuality === "excellent"
                ? "text-emerald-400"
                : connectionQuality === "fair"
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          />
        </div>

        {/* Teacher Finalize Lesson button */}
        {isTeacher && onEndLesson && (
          <Button
            size="sm"
            onClick={onEndLesson}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-3 gap-1.5 rounded-lg shadow-sm font-semibold"
          >
            <Award className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Finalize Lesson</span>
          </Button>
        )}

        {/* Exit Class */}
        <Button
          size="sm"
          variant="destructive"
          onClick={onLeave}
          className="bg-red-600/90 hover:bg-red-600 text-white text-xs h-8 px-2.5 sm:px-3 rounded-lg gap-1"
          title="Leave Room"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Leave</span>
        </Button>
      </div>
    </header>
  );
}
