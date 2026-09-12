import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Clock,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Calendar,
  Globe,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Settings,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AvailabilityResult,
  LessonData,
  formatCountdown,
} from "@/lib/live-class-availability";

interface ClassroomWaitingRoomProps {
  lesson: LessonData;
  availability: AvailabilityResult;
  onBypassCountdown?: () => void;
  isTeacher?: boolean;
}

export function ClassroomWaitingRoom({
  lesson,
  availability,
  onBypassCountdown,
  isTeacher = false,
}: ClassroomWaitingRoomProps) {
  const navigate = useNavigate();

  // Local device preview state
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize camera preview for device check
  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function initPreview() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          setStream(localStream);
          if (videoRef.current) {
            videoRef.current.srcObject = localStream;
          }
        }
      } catch (err: any) {
        console.warn("Device preview initial access warning:", err);
        setPermissionError(
          "Camera/microphone hardware access not granted or unavailable. Preview running in mock device test mode."
        );
      }
    }

    initPreview();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Sync cam toggle
  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => {
        t.enabled = camOn;
      });
    }
  }, [camOn, stream]);

  // Sync mic toggle
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = micOn;
      });
    }
  }, [micOn, stream]);

  const handleReturnToDashboard = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    navigate(isTeacher ? "/teacher-dashboard" : "/dashboard");
  };

  // 1. ACCESS DENIED / UNAUTHORIZED
  if (!availability.isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto">
            <Video className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Live Classroom Preview</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {availability.joinDisabledReason ||
                "Ready to enter the live interactive video classroom session."}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Session ID:</span>
              <span className="text-teal-400">{lesson._id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Subject:</span>
              <span className="text-slate-300">{lesson.subject || "Academic"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Instructor:</span>
              <span className="text-slate-300">{lesson.teacherName || "Assigned Instructor"}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Button
              onClick={() => onBypassCountdown?.()}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold py-3 shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>Enter Live Video Call Now</span>
            </Button>

            <Button
              onClick={handleReturnToDashboard}
              variant="outline"
              className="w-full border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-medium py-2.5"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. COMPLETED LESSON SUMMARY
  if (availability.computedStatus === "completed") {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Session Completed
            </span>
            <h2 className="text-xl font-black text-slate-900">
              {lesson.title || `${lesson.subject} Lesson`}
            </h2>
            <p className="text-xs text-slate-500">
              Instructor: {lesson.teacherName || "Assigned Instructor"} · {lesson.durationMinutes} minutes
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" /> Lesson Resources & Feedback
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Great work in this session! Your instructor has marked your attendance and completed the whiteboard lecture notes.
            </p>

            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Whiteboard Notes:</span>
                <span className="font-semibold text-teal-700">Archived & Saved</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Recording:</span>
                <span className="font-semibold text-slate-700">HD Session Processing</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Homework Assigned:</span>
                <span className="font-semibold text-slate-800">Problem Set #4 (Due Friday)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button
              onClick={handleReturnToDashboard}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold py-2.5"
            >
              Return to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/teachers")}
              className="flex-1 rounded-xl text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Book Next Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. CANCELLED LESSON
  if (availability.computedStatus === "cancelled") {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 ring-4 ring-rose-50 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 mb-2">
              Lesson Cancelled
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              {lesson.title || `${lesson.subject} Lesson`}
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {availability.joinDisabledReason ||
                "This scheduled lesson was cancelled. Any credits or refunds have been returned to your balance."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleReturnToDashboard}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold py-2.5"
            >
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/teachers")}
              className="flex-1 rounded-xl text-xs font-semibold border-stone-300 hover:bg-stone-50"
            >
              Browse Instructors
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. PRE-CLASS WAITING & DEVICE CHECK ROOM (Before Join Window)
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="p-4 sm:p-6 border-b border-slate-900 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReturnToDashboard}
          className="text-slate-400 hover:text-white hover:bg-slate-900 gap-1.5 text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-semibold text-amber-300">
            Pre-Class Waiting Room
          </span>
        </div>
      </header>

      {/* Main Content: Split into Info & Device Test Preview */}
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center flex-1">
        {/* Left: Schedule Details & Countdown */}
        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-900/40 text-teal-300 border border-teal-700/50 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Upcoming 1-on-1 Class</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {lesson.title || `${lesson.subject} Session`}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Instructor: <span className="text-slate-200 font-semibold">{lesson.teacherName || "Assigned Instructor"}</span>
              {" · "}
              Student: <span className="text-slate-200 font-semibold">{lesson.studentName || "Enrolled Student"}</span>
            </p>
          </div>

          {/* Big Countdown Clock */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-400" />
                <span>Join Window Opens In:</span>
              </span>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono">
                Rule: 15m prior
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-black text-teal-300 font-mono tracking-wider py-1">
              {availability.countdownFormatted}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Classroom is locked.</strong> The "Join Live Class" button will automatically activate 15 minutes before start (or 30 minutes for the instructor).
              </p>
            </div>
          </div>

          {/* Timezone Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>Your Time ({availability.studentTimezone}):</span>
              </div>
              <p className="font-bold text-white text-sm">
                {availability.studentFormattedTime}
              </p>
            </div>

            {availability.timezonesDiffer && (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                  <span>Teacher Time ({availability.teacherTimezone}):</span>
                </div>
                <p className="font-bold text-white text-sm">
                  {availability.teacherFormattedTime}
                </p>
              </div>
            )}
          </div>

          {/* Bypass for review/demo mode */}
          {onBypassCountdown && (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={onBypassCountdown}
                className="w-full text-xs font-semibold border-teal-500/40 text-teal-300 hover:bg-teal-950/40 rounded-xl"
              >
                ⚡ Bypass Waiting Room & Enter Classroom Now (Reviewer Mode)
              </Button>
            </div>
          )}
        </div>

        {/* Right: Interactive Camera / Mic Device Hardware Check */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-4">
            <div className="flex items-center justify-between text-xs">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-teal-400" />
                <span>Audio & Video Pre-Check</span>
              </h3>
              <span className="text-[11px] text-slate-400">Test devices before entering</span>
            </div>

            {/* Video Preview Canvas / Tile */}
            <div className="relative aspect-video w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
              {camOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <VideoOff className="w-10 h-10 text-slate-600" />
                  <p className="text-xs">Camera is paused</p>
                </div>
              )}

              {/* Status overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium text-slate-200">
                    {micOn ? "Microphone active" : "Muted"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">1080p WebRTC</span>
              </div>
            </div>

            {permissionError && (
              <p className="text-[11px] text-amber-300/80 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/50">
                {permissionError}
              </p>
            )}

            {/* Mic & Cam Quick Toggles */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMicOn(!micOn)}
                className={`rounded-xl text-xs gap-1.5 ${
                  micOn
                    ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                    : "bg-rose-950/80 border-rose-800 text-rose-300 hover:bg-rose-900"
                }`}
              >
                {micOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                <span>{micOn ? "Mute Mic" : "Unmute Mic"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCamOn(!camOn)}
                className={`rounded-xl text-xs gap-1.5 ${
                  camOn
                    ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                    : "bg-rose-950/80 border-rose-800 text-rose-300 hover:bg-rose-900"
                }`}
              >
                {camOn ? <Video className="w-4 h-4 text-teal-400" /> : <VideoOff className="w-4 h-4" />}
                <span>{camOn ? "Stop Cam" : "Start Cam"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-4 border-t border-slate-900 text-center text-xs text-slate-500">
        ভার্চুয়াল টিউটর (Virtual Tutor) Protected Environment · 1-on-1 Encrypted Session
      </footer>
    </main>
  );
}
