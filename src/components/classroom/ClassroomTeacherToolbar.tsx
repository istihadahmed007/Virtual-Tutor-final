import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Square,
  Disc,
  Lock,
  Unlock,
  PenTool,
  MonitorUp,
  MonitorX,
  VolumeX,
  VideoOff,
  Users,
  Shield,
  Clock,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  UserX,
  Mic,
  MicOff,
  Video,
  Presentation,
  Calculator,
  Languages,
  FileCheck2,
  LayoutGrid,
  ScreenShare,
} from "lucide-react";
import { ParticipantPresence } from "./ClassroomVideoGrid";
import { ClassroomViewMode } from "./ClassroomBottomBar";

interface ClassroomTeacherToolbarProps {
  sessionId: string;
  isTeacher: boolean;
  sessionStatus?: "scheduled" | "waiting" | "live" | "paused" | "completed" | "cancelled";
  isRecording?: boolean;
  recordingStartedAt?: number;
  isLocked?: boolean;
  allowAnnotation?: boolean;
  allowScreenShare?: boolean;
  allowChat?: boolean;
  allowFileUpload?: boolean;
  activeTab?: ClassroomViewMode;
  participants?: ParticipantPresence[];
  timerRemainingSeconds?: number;
  timerRunning?: boolean;
  isSharingScreen?: boolean;
  onToggleScreenShare?: () => void;
  onScreenStreamChange?: (stream: MediaStream | null) => void;
  onOpenEndLessonModal?: () => void;
  onOpenHostControlsModal?: () => void;
  onChangeViewMode?: (mode: ClassroomViewMode) => void;
  className?: string;
}

export function ClassroomTeacherToolbar({
  sessionId,
  isTeacher,
  sessionStatus = "live",
  isRecording = false,
  recordingStartedAt,
  isLocked = false,
  allowAnnotation = false,
  allowScreenShare = false,
  allowChat = true,
  allowFileUpload = true,
  activeTab = "whiteboard",
  participants = [],
  timerRemainingSeconds = 1800,
  timerRunning = false,
  isSharingScreen,
  onToggleScreenShare,
  onScreenStreamChange,
  onOpenEndLessonModal,
  onOpenHostControlsModal,
  onChangeViewMode,
  className = "",
}: ClassroomTeacherToolbarProps) {
  // CRITICAL AUTHORIZATION GUARD: If user is not the teacher, render NOTHING.
  if (!isTeacher) {
    return null;
  }

  // Convex mutations
  const startSessionMut = useMutation(api.classroom.startSession);
  const endSessionMut = useMutation(api.classroom.endSession);
  const setSessionStatusMut = useMutation(api.classroom.setSessionStatus);
  const updateStateMut = useMutation(api.classroom.updateState);
  const startRecordingMut = useMutation(api.classroom.startRecording);
  const stopRecordingMut = useMutation(api.classroom.stopRecording);
  const manageParticipantMut = useMutation(api.classroom.manageParticipant);

  // Local state for toolbar expansion, screen sharing, and quick popups
  const [isExpanded, setIsExpanded] = useState(false);
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false);
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Internal screen share state (fallback if parent does not control it)
  const [internalIsScreenSharing, setInternalIsScreenSharing] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);

  const activeScreenSharing =
    isSharingScreen !== undefined ? isSharingScreen : internalIsScreenSharing;

  // Recording counter
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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  // Handler: Start Session
  const handleStartSession = async () => {
    try {
      await startSessionMut({ sessionId });
      showNotification("Session successfully started & activated!");
    } catch (err: any) {
      alert("Failed to start session: " + err.message);
    }
  };

  // Handler: Toggle Pause / Resume
  const handleTogglePause = async () => {
    try {
      const nextStatus = sessionStatus === "paused" ? "live" : "paused";
      await setSessionStatusMut({ sessionId, status: nextStatus });
      showNotification(nextStatus === "live" ? "Class resumed." : "Class paused.");
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  // Handler: End Session
  const handleEndSession = () => {
    if (onOpenEndLessonModal) {
      onOpenEndLessonModal();
    } else {
      if (confirm("Are you sure you want to end this lesson session for all attendees?")) {
        endSessionMut({ sessionId }).catch((e) => alert(e.message));
      }
    }
  };

  // Handler: Toggle Recording
  const handleToggleRecording = async () => {
    try {
      if (isRecording) {
        await stopRecordingMut({ sessionId });
        showNotification("Recording stopped and saved to cloud archive.");
      } else {
        await startRecordingMut({ sessionId });
        showNotification("Class recording started.");
      }
    } catch (err: any) {
      alert("Recording action failed: " + err.message);
    }
  };

  // Handler: Start / Stop Screen Share using MediaDevices API
  const handleStartScreenShare = async () => {
    // If parent component (ClassroomPage) provided its own toggle handler, delegate to it
    if (onToggleScreenShare) {
      onToggleScreenShare();
      return;
    }

    if (activeScreenSharing) {
      // Stop active screen share stream
      if (localScreenStream) {
        localScreenStream.getTracks().forEach((track) => track.stop());
        setLocalScreenStream(null);
        if (onScreenStreamChange) onScreenStreamChange(null);
      }
      setInternalIsScreenSharing(false);
      try {
        await updateStateMut({ sessionId, teacherSharingScreen: false });
      } catch (err) {
        console.warn("Failed to sync screen share state:", err);
      }
      showNotification("Screen sharing stopped.");
      return;
    }

    // Check for Browser MediaDevices API support
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getDisplayMedia
    ) {
      alert("Screen sharing is not supported by your browser environment or requires HTTPS.");
      return;
    }

    try {
      // Prompt user for screen sharing permissions and selection
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      setLocalScreenStream(displayStream);
      setInternalIsScreenSharing(true);
      if (onScreenStreamChange) onScreenStreamChange(displayStream);

      try {
        await updateStateMut({ sessionId, teacherSharingScreen: true });
      } catch (err) {
        console.warn("Failed to sync screen share state:", err);
      }

      showNotification("Screen sharing active & broadcasting to classroom.");

      // Handle when teacher stops screen share through the native browser control bar
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setInternalIsScreenSharing(false);
          setLocalScreenStream(null);
          if (onScreenStreamChange) onScreenStreamChange(null);
          updateStateMut({ sessionId, teacherSharingScreen: false }).catch(() => {});
          showNotification("Screen sharing ended.");
        };
      }
    } catch (err: any) {
      // Handle user cancellation of the browser prompt gracefully
      if (err?.name === "NotAllowedError" || err?.name === "AbortError") {
        console.info("Teacher cancelled screen share selection prompt.");
      } else {
        console.error("Screen share error:", err);
        alert("Failed to prompt screen share: " + (err?.message || "Permission denied or unavailable."));
      }
    }
  };

  // Handlers for Global Permissions
  const handleToggleLock = async () => {
    try {
      await updateStateMut({ sessionId, locked: !isLocked });
      showNotification(!isLocked ? "Room locked. No new entrants." : "Room unlocked.");
    } catch (err: any) {
      alert("Failed to update room lock: " + err.message);
    }
  };

  const handleToggleAnnotation = async () => {
    try {
      await updateStateMut({ sessionId, allowStudentAnnotation: !allowAnnotation });
      showNotification(
        !allowAnnotation ? "Student annotation enabled." : "Student annotation restricted to teacher.",
      );
    } catch (err: any) {
      alert("Failed to update annotation permission: " + err.message);
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      await updateStateMut({ sessionId, allowStudentScreenShare: !allowScreenShare });
      showNotification(
        !allowScreenShare ? "Student screen sharing enabled." : "Student screen sharing locked.",
      );
    } catch (err: any) {
      alert("Failed to update screen share permission: " + err.message);
    }
  };

  const handleToggleChat = async () => {
    try {
      await updateStateMut({ sessionId, allowStudentChat: !allowChat });
      showNotification(!allowChat ? "Student chat enabled." : "Student chat disabled (Host only).");
    } catch (err: any) {
      alert("Failed to update chat permission: " + err.message);
    }
  };

  const handleToggleFileUpload = async () => {
    try {
      await updateStateMut({ sessionId, allowStudentFileSubmit: !allowFileUpload });
      showNotification(
        !allowFileUpload ? "Student file uploads enabled." : "Student file uploads disabled.",
      );
    } catch (err: any) {
      alert("Failed to update file upload permission: " + err.message);
    }
  };

  // Batch Moderation
  const handleMuteAllStudents = () => {
    const studentParticipants = participants.filter((p) => p.role === "student" && p.micOn);
    if (studentParticipants.length === 0) {
      showNotification("All students are already muted.");
      return;
    }
    studentParticipants.forEach((p) => {
      manageParticipantMut({ sessionId, targetUserId: p.userId, action: "mute" });
    });
    showNotification(`Muted ${studentParticipants.length} student microphones.`);
  };

  const handleDisableAllCams = () => {
    const activeCams = participants.filter((p) => p.role === "student" && p.camOn);
    if (activeCams.length === 0) {
      showNotification("All student cameras are already off.");
      return;
    }
    activeCams.forEach((p) => {
      manageParticipantMut({ sessionId, targetUserId: p.userId, action: "disable_cam" });
    });
    showNotification(`Disabled cameras for ${activeCams.length} students.`);
  };

  // Timer Adjustments
  const handleAddTimerMinutes = (mins: number) => {
    const current = timerRemainingSeconds || 1800;
    const updated = Math.max(0, current + mins * 60);
    updateStateMut({ sessionId, timerRemainingSeconds: updated, timerRunning: true });
    showNotification(`Added ${mins} minutes to classroom timer.`);
  };

  const handleToggleTimer = () => {
    updateStateMut({ sessionId, timerRunning: !timerRunning });
    showNotification(timerRunning ? "Timer paused." : "Timer running.");
  };

  // Stage Switch
  const handleSelectStage = (mode: ClassroomViewMode) => {
    if (onChangeViewMode) onChangeViewMode(mode);
    updateStateMut({ sessionId, activeTab: mode });
    setShowStageDropdown(false);
    showNotification(`Broadcasted stage view: ${mode.toUpperCase()}`);
  };

  const studentCount = participants.filter((p) => p.role === "student").length;

  return (
    <div
      id="classroom-teacher-toolbar"
      className={`bg-slate-900/95 border-b border-teal-500/30 text-slate-100 shadow-xl backdrop-blur-md transition-all select-none z-30 ${className}`}
    >
      {/* ─── ACTION TOAST NOTIFICATION ─── */}
      {actionSuccessMessage && (
        <div className="bg-teal-500/20 border-b border-teal-500/40 text-teal-300 px-4 py-1 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-teal-400/80 hover:text-teal-200 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── PRIMARY COMPACT HOST RIBBON ─── */}
      <div className="px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto">
        {/* Left: Host Badge & Lifecycle Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-950/80 border border-teal-500/40 rounded-lg text-teal-300 text-xs font-semibold shadow-inner">
            <Shield className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>INSTRUCTOR HOST</span>
          </div>

          {/* Session Status Pill */}
          <div
            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
              sessionStatus === "live"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : sessionStatus === "paused"
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  : sessionStatus === "waiting"
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {sessionStatus === "live" ? "🟢 Live Session" : sessionStatus === "paused" ? "⏸️ Paused" : sessionStatus}
          </div>

          {/* Start Session Mutation (if not live) */}
          {sessionStatus !== "live" && (
            <Button
              id="teacher-start-session-btn"
              size="sm"
              onClick={handleStartSession}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-7 px-3 rounded-lg shadow-sm flex items-center gap-1.5"
              title="Activate live class session for all students"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Session</span>
            </Button>
          )}

          {/* Pause / Resume Session Mutation */}
          {sessionStatus === "live" && (
            <Button
              id="teacher-pause-session-btn"
              size="sm"
              variant="outline"
              onClick={handleTogglePause}
              className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs h-7 px-2.5 rounded-lg flex items-center gap-1.5"
              title="Pause classroom audio and activities temporarily"
            >
              <Pause className="w-3 h-3" />
              <span>Pause</span>
            </Button>
          )}

          {/* End Session Mutation */}
          <Button
            id="teacher-end-session-btn"
            size="sm"
            onClick={handleEndSession}
            className="bg-red-600/90 hover:bg-red-600 text-white font-medium text-xs h-7 px-2.5 rounded-lg shadow-sm flex items-center gap-1.5"
            title="Conclude lesson, finalize attendance & save notes"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>End Session</span>
          </Button>
        </div>

        {/* Center: Live Recording, Screen Sharing & Stage Controller */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Recording Control */}
          <Button
            id="teacher-toggle-recording-btn"
            size="sm"
            onClick={handleToggleRecording}
            className={`text-xs h-7 px-3 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              isRecording
                ? "bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/20"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            }`}
            title={isRecording ? "Stop cloud recording" : "Start session cloud recording"}
          >
            <Disc className={`w-3.5 h-3.5 ${isRecording ? "animate-spin" : "text-red-400"}`} />
            <span>{isRecording ? `REC ${formatTime(recElapsed)}` : "Record Class"}</span>
          </Button>

          {/* Start Screen Share Button (MediaDevices API) */}
          <Button
            id="teacher-start-screenshare-btn"
            size="sm"
            onClick={handleStartScreenShare}
            className={`text-xs h-7 px-3 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeScreenSharing
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 animate-pulse border border-blue-400/60 font-semibold"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-teal-500/50"
            }`}
            title={
              activeScreenSharing
                ? "Stop screen sharing broadcast"
                : "Start Screen Share: Share desktop, application window, or browser tab with students using browser MediaDevices"
            }
          >
            {activeScreenSharing ? (
              <MonitorX className="w-3.5 h-3.5 text-blue-200" />
            ) : (
              <ScreenShare className="w-3.5 h-3.5 text-teal-400" />
            )}
            <span>{activeScreenSharing ? "Stop Screen Share" : "Start Screen Share"}</span>
          </Button>

          {/* Stage Director Dropdown */}
          <div className="relative">
            <Button
              id="teacher-stage-director-btn"
              size="sm"
              variant="outline"
              onClick={() => setShowStageDropdown(!showStageDropdown)}
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs h-7 px-2.5 rounded-lg flex items-center gap-1.5"
            >
              <span className="text-teal-400 font-bold uppercase text-[10px]">STAGE:</span>
              <span className="capitalize">{activeTab}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </Button>

            {showStageDropdown && (
              <div className="absolute top-full mt-1 left-0 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs">
                <button
                  onClick={() => handleSelectStage("whiteboard")}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                    activeTab === "whiteboard" ? "bg-teal-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5 text-teal-300" />
                  <span>Whiteboard</span>
                </button>
                <button
                  onClick={() => handleSelectStage("presentation")}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                    activeTab === "presentation" ? "bg-teal-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <Presentation className="w-3.5 h-3.5 text-blue-300" />
                  <span>Presentation / PDF</span>
                </button>
                <button
                  onClick={() => handleSelectStage("math")}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                    activeTab === "math" ? "bg-teal-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Math & Calculator</span>
                </button>
                <button
                  onClick={() => handleSelectStage("language")}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                    activeTab === "language" ? "bg-teal-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <Languages className="w-3.5 h-3.5 text-amber-300" />
                  <span>Language Studio</span>
                </button>
                <button
                  onClick={() => handleSelectStage("worksheet")}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                    activeTab === "worksheet" ? "bg-teal-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Polls & Worksheets</span>
                </button>
                <button
                  onClick={() => handleSelectStage("grid")}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                    activeTab === "grid" ? "bg-teal-600 text-white font-semibold" : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-purple-300" />
                  <span>Video Gallery</span>
                </button>
              </div>
            )}
          </div>

          {/* Timer Quick Display & Presets */}
          <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 px-2 py-0.5 rounded-lg text-xs">
            <Clock className={`w-3.5 h-3.5 ${timerRunning ? "text-teal-400 animate-spin" : "text-slate-500"}`} />
            <span className="font-mono font-bold text-slate-200">{formatTime(timerRemainingSeconds)}</span>
            <button
              onClick={handleToggleTimer}
              className="p-1 hover:text-teal-300 text-slate-400 transition-colors"
              title={timerRunning ? "Pause timer" : "Start timer"}
            >
              {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleAddTimerMinutes(5)}
              className="px-1 py-0.5 hover:bg-slate-800 text-[10px] text-teal-400 font-bold rounded"
              title="Add 5 minutes"
            >
              +5m
            </button>
          </div>
        </div>

        {/* Right: Quick Permission Toggles & Expand Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Annotation Toggle */}
          <Button
            id="teacher-toggle-annotation-btn"
            size="sm"
            variant="outline"
            onClick={handleToggleAnnotation}
            className={`text-xs h-7 px-2 rounded-lg border transition-all flex items-center gap-1 ${
              allowAnnotation
                ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
            title={allowAnnotation ? "Student annotation enabled (Click to lock)" : "Student annotation locked (Click to allow)"}
          >
            <PenTool className="w-3 h-3" />
            <span className="hidden sm:inline">Draw</span>
          </Button>

          {/* Quick Screen Share Toggle */}
          <Button
            id="teacher-toggle-screenshare-btn"
            size="sm"
            variant="outline"
            onClick={handleToggleScreenShare}
            className={`text-xs h-7 px-2 rounded-lg border transition-all flex items-center gap-1 ${
              allowScreenShare
                ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
            title={allowScreenShare ? "Student screen sharing allowed" : "Student screen sharing locked"}
          >
            <MonitorUp className="w-3 h-3" />
            <span className="hidden sm:inline">Screen</span>
          </Button>

          {/* Quick Lock Room Toggle */}
          <Button
            id="teacher-toggle-lock-room-btn"
            size="sm"
            variant="outline"
            onClick={handleToggleLock}
            className={`text-xs h-7 px-2 rounded-lg border transition-all flex items-center gap-1 ${
              isLocked
                ? "bg-red-500/20 text-red-300 border-red-500/40"
                : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
            title={isLocked ? "Room locked from new attendees" : "Room unlocked"}
          >
            {isLocked ? <Lock className="w-3 h-3 text-red-400" /> : <Unlock className="w-3 h-3" />}
            <span className="hidden sm:inline">{isLocked ? "Locked" : "Unlocked"}</span>
          </Button>

          {/* Mute All Button */}
          <Button
            id="teacher-mute-all-btn"
            size="sm"
            variant="outline"
            onClick={handleMuteAllStudents}
            className="border-slate-700 bg-slate-800/80 hover:bg-red-500/20 hover:text-red-300 text-slate-300 text-xs h-7 px-2 rounded-lg flex items-center gap-1"
            title="Mute all student microphones"
          >
            <VolumeX className="w-3 h-3" />
            <span className="hidden md:inline">Mute All</span>
          </Button>

          {/* Participants Quick Drawer Toggle */}
          <div className="relative">
            <Button
              id="teacher-participants-quick-btn"
              size="sm"
              variant="outline"
              onClick={() => setShowParticipantDropdown(!showParticipantDropdown)}
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs h-7 px-2 rounded-lg flex items-center gap-1"
            >
              <Users className="w-3 h-3 text-teal-400" />
              <span>{studentCount}</span>
            </Button>

            {/* Quick Participant Moderation Dropdown */}
            {showParticipantDropdown && (
              <div className="absolute top-full mt-1 right-0 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs space-y-2 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-400" />
                    Student Roster ({studentCount})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleMuteAllStudents}
                      className="px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-[10px] font-semibold hover:bg-red-500/30"
                    >
                      Mute All
                    </button>
                    <button
                      onClick={handleDisableAllCams}
                      className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[10px] font-semibold hover:bg-slate-700"
                    >
                      Cams Off
                    </button>
                  </div>
                </div>

                {participants.filter((p) => p.role === "student").length === 0 ? (
                  <p className="text-slate-500 text-center py-4 italic">No students in room yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {participants
                      .filter((p) => p.role === "student")
                      .map((p) => (
                        <div
                          key={p.userId}
                          className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800/80"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center font-bold text-teal-300 text-[10px]">
                              {p.name.charAt(0)}
                            </div>
                            <div className="truncate">
                              <p className="font-medium text-slate-200 truncate">{p.name}</p>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <span>{p.micOn ? "Mic ON" : "Muted"}</span>
                                <span>•</span>
                                <span>{p.canAnnotate ? "Can Draw" : "View Only"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Toggle Mute */}
                            <button
                              onClick={() =>
                                manageParticipantMut({
                                  sessionId,
                                  targetUserId: p.userId,
                                  action: p.isMutedByTeacher || !p.micOn ? "unmute" : "mute",
                                })
                              }
                              className={`p-1 rounded ${
                                p.isMutedByTeacher || !p.micOn
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-slate-800 text-slate-300 hover:text-white"
                              }`}
                              title={p.isMutedByTeacher ? "Unmute student" : "Mute student"}
                            >
                              {p.isMutedByTeacher || !p.micOn ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                            </button>

                            {/* Toggle Cam */}
                            <button
                              onClick={() =>
                                manageParticipantMut({
                                  sessionId,
                                  targetUserId: p.userId,
                                  action: p.isCamDisabledByTeacher || !p.camOn ? "allow_cam" : "disable_cam",
                                })
                              }
                              className={`p-1 rounded ${
                                p.isCamDisabledByTeacher || !p.camOn
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-slate-800 text-slate-300 hover:text-white"
                              }`}
                              title={p.isCamDisabledByTeacher ? "Allow camera" : "Disable camera"}
                            >
                              {p.isCamDisabledByTeacher || !p.camOn ? (
                                <VideoOff className="w-3 h-3" />
                              ) : (
                                <Video className="w-3 h-3" />
                              )}
                            </button>

                            {/* Toggle Annotate */}
                            <button
                              onClick={() =>
                                manageParticipantMut({
                                  sessionId,
                                  targetUserId: p.userId,
                                  action: p.canAnnotate ? "revoke_annotate" : "grant_annotate",
                                })
                              }
                              className={`p-1 rounded ${
                                p.canAnnotate
                                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                              title={p.canAnnotate ? "Revoke whiteboard access" : "Grant whiteboard draw access"}
                            >
                              <PenTool className="w-3 h-3" />
                            </button>

                            {/* Remove / Kick */}
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${p.name} from the classroom session?`)) {
                                  manageParticipantMut({
                                    sessionId,
                                    targetUserId: p.userId,
                                    action: "remove_participant",
                                  });
                                }
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-red-500/30 text-slate-400 hover:text-red-300"
                              title="Remove student from session"
                            >
                              <UserX className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Full Host Modal Trigger */}
          {onOpenHostControlsModal && (
            <Button
              id="teacher-open-modal-btn"
              size="sm"
              variant="outline"
              onClick={onOpenHostControlsModal}
              className="border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs h-7 px-2 rounded-lg flex items-center gap-1"
              title="Open complete host security & attendance modal"
            >
              <Sliders className="w-3 h-3" />
              <span className="hidden lg:inline">Host Suite</span>
            </Button>
          )}

          {/* Expand Toolbar Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            title={isExpanded ? "Collapse advanced teacher toolbar" : "Expand advanced teacher toolbar"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── EXPANDED DETAILED MANAGEMENT DRAWER ─── */}
      {isExpanded && (
        <div className="border-t border-slate-800 bg-slate-950/80 px-4 py-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-fadeIn">
          {/* Policy Panel */}
          <div className="space-y-1.5 border-r border-slate-800/80 pr-3">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-teal-400" />
              Classroom Policies
            </span>
            <div className="flex flex-col gap-1">
              <label className="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white py-0.5">
                <span>Student Chat:</span>
                <input
                  type="checkbox"
                  checked={allowChat}
                  onChange={handleToggleChat}
                  className="rounded border-slate-700 text-teal-500 focus:ring-teal-400"
                />
              </label>
              <label className="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white py-0.5">
                <span>File Uploads:</span>
                <input
                  type="checkbox"
                  checked={allowFileUpload}
                  onChange={handleToggleFileUpload}
                  className="rounded border-slate-700 text-teal-500 focus:ring-teal-400"
                />
              </label>
              <label className="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white py-0.5">
                <span>Whiteboard Annotation:</span>
                <input
                  type="checkbox"
                  checked={allowAnnotation}
                  onChange={handleToggleAnnotation}
                  className="rounded border-slate-700 text-teal-500 focus:ring-teal-400"
                />
              </label>
            </div>
          </div>

          {/* Broadcast & Screen Share */}
          <div className="space-y-1.5 border-r border-slate-800/80 pr-3">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <MonitorUp className="w-3 h-3 text-blue-400" />
              Teacher Broadcast
            </span>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Screen Broadcast:</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    activeScreenSharing
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {activeScreenSharing ? "Active" : "Off"}
                </span>
              </div>
              <Button
                size="sm"
                onClick={handleStartScreenShare}
                className={`w-full h-6 text-[11px] font-medium flex items-center justify-center gap-1 rounded ${
                  activeScreenSharing
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                }`}
              >
                {activeScreenSharing ? (
                  <>
                    <MonitorX className="w-3 h-3 text-blue-200" />
                    <span>Stop Screen Share</span>
                  </>
                ) : (
                  <>
                    <ScreenShare className="w-3 h-3 text-teal-400" />
                    <span>Start Screen Share</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Batch Actions & Timers */}
          <div className="space-y-1.5 border-r border-slate-800/80 pr-3">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-teal-400" />
              Batch & Pacing
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleMuteAllStudents}
                className="h-6 text-[11px] px-2 bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20"
              >
                <VolumeX className="w-3 h-3 mr-1" />
                Mute All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDisableAllCams}
                className="h-6 text-[11px] px-2 bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <VideoOff className="w-3 h-3 mr-1" />
                Cams Off
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddTimerMinutes(5)}
                className="h-6 text-[11px] px-2 bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200"
              >
                +5m
              </Button>
            </div>
          </div>

          {/* Session Overview */}
          <div className="space-y-1">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Session Identity
            </span>
            <p className="text-[11px] text-slate-400 font-mono truncate">ID: {sessionId}</p>
            <p className="text-[11px] text-teal-400 font-medium">
              Authoritative host controls active & synced to database.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
