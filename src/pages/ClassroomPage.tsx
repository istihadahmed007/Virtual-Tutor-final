import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { ClassroomHeader } from "@/components/classroom/ClassroomHeader";
import { ClassroomVideoGrid } from "@/components/classroom/ClassroomVideoGrid";
import { ClassroomWhiteboard } from "@/components/classroom/ClassroomWhiteboard";
import { ClassroomPresentation } from "@/components/classroom/ClassroomPresentation";
import { ClassroomMathTools } from "@/components/classroom/ClassroomMathTools";
import { ClassroomLanguageTools } from "@/components/classroom/ClassroomLanguageTools";
import { ClassroomInteractions } from "@/components/classroom/ClassroomInteractions";
import { ClassroomSidePanels } from "@/components/classroom/ClassroomSidePanels";
import { ClassroomBottomBar, ClassroomViewMode } from "@/components/classroom/ClassroomBottomBar";
import { ClassroomEndLessonModal } from "@/components/classroom/ClassroomEndLessonModal";
import { ClassroomHostControlsModal } from "@/components/classroom/ClassroomHostControlsModal";
import { ClassroomTeacherToolbar } from "@/components/classroom/ClassroomTeacherToolbar";
import { ClassroomDeviceSettingsModal } from "@/components/classroom/ClassroomDeviceSettingsModal";
import { ClassroomWaitingRoom } from "@/components/classroom/ClassroomWaitingRoom";
import { ClassroomConnectionBanner } from "@/components/classroom/ClassroomConnectionBanner";
import { ClassroomPreJoinScreen } from "@/components/classroom/ClassroomPreJoinScreen";
import {
  computeLessonAvailability,
  LessonData,
  AvailabilityResult,
} from "@/lib/live-class-availability";
import { useClassroomMedia } from "@/hooks/useClassroomMedia";
import {
  Loader2,
  AlertTriangle,
  ShieldCheck,
  UserX,
  Lock,
  Pause,
  Award,
  CheckCircle,
  Video,
  PenTool,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClassroomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();

  // Extract session identifier from URL params or search query
  const rawSessionId =
    params.sessionId ||
    params.lessonId ||
    searchParams.get("sessionId") ||
    searchParams.get("id") ||
    searchParams.get("code") ||
    "live-session-1";

  const sessionId = rawSessionId;

  const { user } = useAuth();
  const authUserId = user?._id || (user as any)?.id || (user as any)?.userId || "";
  const authUserName = user?.name || "Participant";
  const authUserRole = user?.role === "teacher" || (user as any)?.role === "instructor" ? "teacher" : "student";

  // Convex Queries
  const context = useQuery(api.classroom.getContext, { sessionId });
  const classroomState = useQuery(api.classroom.getState, { sessionId });
  const whiteboardPages = useQuery(api.classroom.listWhiteboardPages, { sessionId });
  const presenceList = useQuery(api.classroom.listPresence, { sessionId });
  const messages = useQuery(api.classroom.listMessages, { sessionId });
  const materials = useQuery(api.classroom.listMaterials, { sessionId });
  const polls = useQuery(api.classroom.listPolls, { sessionId });
  const quizzes = useQuery(api.classroom.listQuizzes, { sessionId });
  const worksheets = useQuery(api.classroom.listWorksheets, { sessionId });
  const languageBoard = useQuery(api.classroom.getLanguageBoard, { sessionId });
  const attendanceRecords = useQuery(api.classroom.getAttendance, { sessionId });
  const auditLogs = useQuery(api.classroom.getAuditLogs, { sessionId });

  // Convex Mutations
  const updateStateMut = useMutation(api.classroom.updateState);
  const setSessionStatusMut = useMutation(api.classroom.setSessionStatus);
  const startRecordingMut = useMutation(api.classroom.startRecording);
  const stopRecordingMut = useMutation(api.classroom.stopRecording);
  const manageParticipantMut = useMutation(api.classroom.manageParticipant);
  const saveWhiteboardMut = useMutation(api.classroom.saveWhiteboardPage);
  const createWhiteboardMut = useMutation(api.classroom.createWhiteboardPage);
  const clearWhiteboardMut = useMutation(api.classroom.clearWhiteboardPage);
  const heartbeatMut = useMutation(api.classroom.heartbeatPresence);
  const toggleHandMut = useMutation(api.classroom.toggleHandRaise);
  const sendMessageMut = useMutation(api.classroom.sendMessage);
  const uploadMaterialMut = useMutation(api.classroom.uploadMaterial);
  const updateMaterialPageMut = useMutation(api.classroom.updateMaterialPage);
  const createPollMut = useMutation(api.classroom.createPoll);
  const votePollMut = useMutation(api.classroom.votePoll);
  const closePollMut = useMutation(api.classroom.closePoll);
  const createQuizMut = useMutation(api.classroom.createQuiz);
  const submitQuizMut = useMutation(api.classroom.submitQuiz);
  const createWorksheetMut = useMutation(api.classroom.createWorksheet);
  const submitWorksheetMut = useMutation(api.classroom.submitWorksheet);
  const gradeWorksheetMut = useMutation(api.classroom.gradeWorksheet);
  const updateAttendanceMut = useMutation(api.classroom.updateAttendanceRecord);
  const finalizeAttendanceMut = useMutation(api.classroom.finalizeAttendance);
  const updateLanguageBoardMut = useMutation(api.classroom.updateLanguageBoard);
  const finishLessonMut = useMutation(api.classroom.finishLessonSession);

  const isTeacher = context?.userRole === "teacher" || authUserRole === "teacher";

  // Check if teacher has muted student or disabled cam
  const isMutedByTeacher = !isTeacher && (context?.isMutedByTeacher ?? false);
  const isCamDisabledByTeacher = !isTeacher && (context?.isCamDisabledByTeacher ?? false);
  const canScreenShare = isTeacher || (classroomState?.allowStudentScreenShare && context?.canScreenShare);
  const canAnnotate = isTeacher || (classroomState?.allowStudentAnnotation && context?.canAnnotate);

  // Local UI State
  const [deviceSettingsOpen, setDeviceSettingsOpen] = useState(false);
  const [remoteOps, setRemoteOps] = useState<any[]>([]);
  const handleRemoteWhiteboardData = useCallback((data: any) => {
    setRemoteOps((prev) => [...prev, data]);
  }, []);

  // Real WebRTC / LiveKit Media Engine Hook
  const media = useClassroomMedia({
    sessionId,
    currentUserId: context?.userId || authUserId,
    currentUserName: context?.userName || authUserName,
    currentUserRole: (context?.userRole as "teacher" | "student") || authUserRole,
    initialCamOn: true,
    initialMicOn: true,
    onRemoteWhiteboardData: handleRemoteWhiteboardData,
  });

  const presenceQuality: "excellent" | "fair" | "poor" =
    media.connectionQuality === "excellent"
      ? "excellent"
      : media.connectionQuality === "good"
        ? "fair"
        : "poor";

  const [handRaised, setHandRaised] = useState(false);

  // Classroom UI View States - default to full video call grid so users see the video call right away
  const [viewMode, setViewMode] = useState<ClassroomViewMode>(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const v = sp.get("view");
      if (v === "whiteboard" || v === "presentation" || v === "math" || v === "language" || v === "worksheet") {
        return v as ClassroomViewMode;
      }
    } catch {}
    return "grid";
  });
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);

  // Side Drawer & Modal states
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<"chat" | "participants" | "plan" | "notes">("chat");
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [hostControlsOpen, setHostControlsOpen] = useState(false);
  const [hasJoinedPreJoin, setHasJoinedPreJoin] = useState<boolean>(() => {
    try {
      return new URLSearchParams(window.location.search).get("skipPreJoin") === "true";
    } catch {
      return false;
    }
  });

  // Handle Screen Sharing via Media Engine
  const handleToggleScreenShare = async () => {
    if (!canScreenShare && !isTeacher) {
      alert("Screen sharing is locked by the instructor.");
      return;
    }

    await media.toggleScreenShare();
    if (isTeacher) {
      updateStateMut({ sessionId, teacherSharingScreen: !media.isScreenSharing });
    }
  };

  // Real Recording integration with MediaRecorder + Convex storage
  const handleStartRecording = async () => {
    try {
      await media.startRecording();
      await startRecordingMut({ sessionId });
    } catch (e: any) {
      console.warn("Media recorder warning:", e);
      await startRecordingMut({ sessionId });
    }
  };

  const handleStopRecording = async () => {
    try {
      await media.stopRecording();
      await stopRecordingMut({ sessionId });
    } catch (e: any) {
      console.warn("Stop media recording warning:", e);
      await stopRecordingMut({ sessionId });
    }
  };

  // Periodic Presence Heartbeat (Every 5 seconds)
  useEffect(() => {
    // Only dispatch presence heartbeats if context has loaded and user is authenticated in the session
    if (!context?.authenticated || !context?.userId) {
      return;
    }

    const sendHeartbeat = () => {
      heartbeatMut({
        sessionId,
        micOn: isMutedByTeacher ? false : media.micOn,
        camOn: isCamDisabledByTeacher ? false : media.camOn,
        isScreenSharing: media.isScreenSharing,
        handRaised,
        connectionQuality: presenceQuality,
      }).catch((e) => {
        // Catch gracefully to avoid uncaught rejection noise during navigation or session termination
        console.debug("Presence heartbeat sync notice:", e);
      });
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [
    context?.authenticated,
    context?.userId,
    sessionId,
    media.micOn,
    media.camOn,
    isMutedByTeacher,
    isCamDisabledByTeacher,
    media.isScreenSharing,
    media.connectionQuality,
    handRaised,
    heartbeatMut,
  ]);

  // Hand Raise Toggle
  const handleToggleHandRaise = () => {
    const next = !handRaised;
    setHandRaised(next);
    if (context?.authenticated) {
      toggleHandMut({
        sessionId,
        raised: next,
      }).catch((err) => {
        console.warn("Hand raise error:", err);
      });
    }
  };

  // Emoji Reaction
  const handleSendReaction = (emoji: string) => {
    if (context?.authenticated) {
      heartbeatMut({
        sessionId,
        micOn: isMutedByTeacher ? false : media.micOn,
        camOn: isCamDisabledByTeacher ? false : media.camOn,
        isScreenSharing: media.isScreenSharing,
        handRaised,
        connectionQuality: presenceQuality,
        lastReaction: emoji,
      }).catch((e) => console.warn("Reaction heartbeat error:", e));

      sendMessageMut({
        sessionId,
        text: `${emoji} (Reaction)`,
        type: "reaction",
      }).catch((e) => console.warn("Send reaction message error:", e));
    }
  };

  // Change View Mode & Sync with Classroom State if teacher
  const handleChangeViewMode = (mode: ClassroomViewMode) => {
    setViewMode(mode);
    if (isTeacher) {
      updateStateMut({ sessionId, activeTab: mode });
    }
  };

  // Sync viewMode from teacher's state for students
  useEffect(() => {
    if (classroomState?.activeTab && !isTeacher) {
      setViewMode(classroomState.activeTab);
    }
  }, [classroomState?.activeTab, isTeacher]);

  // Handle Lesson Finalize Submission
  const handleFinishLesson = async (data: {
    feedback: string;
    rating: number;
    homeworkText: string;
    strengths: string[];
    improvements: string[];
  }) => {
    try {
      await finishLessonMut({
        sessionId,
        teacherFeedback: data.feedback,
        rating: data.rating,
        homeworkText: data.homeworkText,
        strengths: data.strengths,
        improvements: data.improvements,
      });
      setEndModalOpen(false);
      navigate("/teacher/dashboard");
    } catch (e: any) {
      alert("Failed to finalize lesson: " + e.message);
    }
  };

  const [bypassWaitingRoom, setBypassWaitingRoom] = useState(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("bypass") === "true" || sp.get("join") === "true";
    } catch {
      return false;
    }
  });

  // Check local storage for scheduled lessons matching this sessionId
  const activeLesson: LessonData = useMemo(() => {
    try {
      const raw = localStorage.getItem("vtp_student_lessons");
      const list: LessonData[] = raw ? JSON.parse(raw) : [];
      const found = list.find((l) => l._id === sessionId || l.meetingCode === sessionId);
      if (found) return found;
    } catch (_) {
      // ignore local storage read error
    }

    const currentUserId = user?._id || (user as any)?.id || (user as any)?.userId || "";
    const currentUserName = user?.name || "Participant";
    const isTeacherRole = user?.role === "teacher" || (user as any)?.role === "instructor";

    return {
      _id: sessionId,
      title: context?.title || "1-on-1 Live Class Session",
      subject: context?.subject || "Academic Mentoring",
      teacherId: (context as any)?.teacherId || (isTeacherRole ? currentUserId : "instructor"),
      teacherName: context?.teacherName || (isTeacherRole ? currentUserName : "Instructor"),
      teacherTimezone: "America/New_York",
      studentId: context?.userId || (!isTeacherRole ? currentUserId : "student"),
      studentName: context?.userName || (!isTeacherRole ? currentUserName : "Student"),
      studentTimezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
      scheduledAt: Date.now(),
      durationMinutes: 60,
      status: classroomState?.sessionStatus === "completed" ? "completed" : "live",
      meetingCode: `LIVE-${sessionId.toUpperCase()}`,
    };
  }, [sessionId, context, classroomState, user]);

  const availability = useMemo(() => {
    return computeLessonAvailability({
      lesson: activeLesson,
      user,
      currentTime: Date.now(),
    });
  }, [activeLesson, user]);

  // Leave room handler
  const handleLeaveRoom = () => {
    if (media.localStream) {
      media.localStream.getTracks().forEach((t) => t.stop());
    }
    if (media.screenStream) {
      media.screenStream.getTracks().forEach((t) => t.stop());
    }
    if (isTeacher) {
      navigate("/teacher-dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  // Intercept waiting room or completion before entering active WebRTC grid
  if (!bypassWaitingRoom && (!availability.canJoin || !availability.isAuthorized)) {
    return (
      <ClassroomWaitingRoom
        lesson={activeLesson}
        availability={availability}
        isTeacher={isTeacher}
        onBypassCountdown={() => setBypassWaitingRoom(true)}
      />
    );
  }

  // Loading state
  if (context === undefined || classroomState === undefined) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
        <p className="text-sm font-medium text-slate-400">Verifying classroom host authorization & security tokens...</p>
      </div>
    );
  }

  // Check if student was removed by teacher
  if (context?.isRemoved) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl max-w-md text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
            <UserX className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Access Revoked</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            You have been removed from this live classroom session by the instructor. Please contact your teacher or institution administrator if this was a mistake.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="w-full bg-slate-800 hover:bg-slate-700 text-white">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Not authenticated / access error
  if (!context?.authenticated && !user) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md text-center space-y-4 shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold">Classroom Access Verification</h2>
          <p className="text-xs text-slate-400">
            Please log in with an authorized student or teacher account to join this live classroom session.
          </p>
          <Button onClick={() => navigate("/auth")} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
            Log In to Continue
          </Button>
        </div>
      </div>
    );
  }

  if (!hasJoinedPreJoin) {
    return (
      <ClassroomPreJoinScreen
        sessionId={sessionId}
        sessionTitle={context.title || "Live Class Session"}
        subject={context.subject || "General"}
        teacherName={context.teacherName || "Course Instructor"}
        userName={context.userName || authUserName}
        userRole={isTeacher ? "teacher" : "student"}
        initialCamOn={media.camOn}
        initialMicOn={media.micOn}
        onJoin={(cfg) => {
          if (cfg.camDeviceId) media.switchCamera(cfg.camDeviceId);
          if (cfg.micDeviceId) media.switchMicrophone(cfg.micDeviceId);
          if (cfg.speakerDeviceId) media.switchSpeaker(cfg.speakerDeviceId);
          if (!cfg.camOn && media.camOn) media.toggleCam(false);
          if (!cfg.micOn && media.micOn) media.toggleMic(false);
          setHasJoinedPreJoin(true);
        }}
        onCancel={() => navigate(-1)}
      />
    );
  }

  const activeMaterial = (materials || []).find((m: any) => m._id === activeMaterialId) || materials?.[0] || null;

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans select-none">
      {/* ─── 1. TOP HEADER WITH TEACHER RECORDING & HOST ACCESS ──────── */}
      <ClassroomHeader
        title={context.title || "Live Class Session"}
        subject={context.subject || "General"}
        teacherName={context.teacherName || "Teacher"}
        sessionId={sessionId}
        isTeacher={isTeacher}
        sessionStatus={classroomState.sessionStatus}
        isRecording={classroomState.isRecording || media.isRecording}
        recordingStartedAt={classroomState.recordingStartedAt}
        isLocked={classroomState.locked}
        onLeave={handleLeaveRoom}
        onEndLesson={() => setEndModalOpen(true)}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onTogglePauseLesson={() =>
          setSessionStatusMut({
            sessionId,
            status: classroomState.sessionStatus === "paused" ? "live" : "paused",
          })
        }
        onToggleLockRoom={() => updateStateMut({ sessionId, locked: !classroomState.locked })}
        onOpenHostControls={() => setHostControlsOpen(true)}
        timerRemainingSeconds={classroomState.timerRemainingSeconds ?? 1800}
        timerRunning={classroomState.timerRunning ?? false}
        onUpdateTimer={(rem, run) =>
          updateStateMut({ sessionId, timerRemainingSeconds: rem, timerRunning: run })
        }
        connectionQuality={presenceQuality}
      />

      {/* ─── LIVE MEDIA INFRASTRUCTURE & DIAGNOSTICS BANNER ─────────── */}
      <ClassroomConnectionBanner
        connectionStatus={media.connectionStatus}
        connectionQuality={media.connectionQuality}
        latencyMs={media.latencyMs}
        audioBlocked={media.audioBlocked}
        connectionError={media.connectionError}
        onReconnect={media.reconnect}
        onResumeAudio={media.resumeAudio}
      />

      {/* ─── PRIMARY MODE SELECTOR (Video Call vs Whiteboard) ──────── */}
      <div className="bg-[#111111] border-b border-white/10 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-[#F26522] text-white shadow-xs"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video Call Gallery</span>
          </button>

          <button
            onClick={() => setViewMode("whiteboard")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode !== "grid"
                ? "bg-[#F26522] text-white shadow-xs"
                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Interactive Board</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "grid" ? (
            <span className="text-[11px] text-[#F26522] flex items-center gap-1.5 font-semibold bg-[#F26522]/10 px-2.5 py-1 rounded-full border border-[#F26522]/20">
              <span className="w-2 h-2 rounded-full bg-[#F26522] animate-pulse" />
              <span>Full Video Call Active</span>
            </span>
          ) : (
            <button
              onClick={() => setViewMode("grid")}
              className="text-[11px] text-white/70 hover:text-white font-medium bg-white/10 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              Switch to Video Call
            </button>
          )}
        </div>
      </div>

      {/* ─── TEACHER AUTHORITATIVE TOOLBAR (Hidden from Students) ────── */}
      <ClassroomTeacherToolbar
        sessionId={sessionId}
        isTeacher={isTeacher}
        sessionStatus={classroomState.sessionStatus}
        isRecording={classroomState.isRecording || media.isRecording}
        recordingStartedAt={classroomState.recordingStartedAt}
        isLocked={classroomState.locked}
        allowAnnotation={classroomState.allowStudentAnnotation}
        allowScreenShare={classroomState.allowStudentScreenShare}
        allowChat={classroomState.allowStudentChat}
        allowFileUpload={classroomState.allowStudentFileSubmit}
        activeTab={viewMode}
        participants={presenceList || []}
        timerRemainingSeconds={classroomState.timerRemainingSeconds ?? 1800}
        timerRunning={classroomState.timerRunning ?? false}
        isSharingScreen={media.isScreenSharing}
        onToggleScreenShare={handleToggleScreenShare}
        onScreenStreamChange={() => {}}
        onOpenEndLessonModal={() => setEndModalOpen(true)}
        onOpenHostControlsModal={() => setHostControlsOpen(true)}
        onChangeViewMode={handleChangeViewMode}
      />

      {/* ─── Reconnection Banner ─────────────────────────────────────── */}
      {media.connectionStatus === "reconnecting" && (
        <div className="bg-amber-600/90 text-white text-xs px-4 py-2 flex items-center justify-between font-medium z-50 shrink-0">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Connection interrupted. Reconnecting to live media peer session...</span>
          </div>
          <Button
            size="sm"
            onClick={media.reconnect}
            className="h-6 text-xs bg-black/40 hover:bg-black/60 text-white px-2.5 rounded"
          >
            Reconnect
          </Button>
        </div>
      )}

      {/* ─── Session Paused Banner (if applicable) ───────────────────── */}
      {classroomState.sessionStatus === "paused" && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-amber-300 text-xs shrink-0">
          <div className="flex items-center gap-2 font-semibold">
            <Pause className="w-4 h-4 text-amber-400" />
            <span>Lesson is currently paused by instructor. Audio and whiteboard interaction are on standby.</span>
          </div>
          {isTeacher && (
            <Button
              size="sm"
              onClick={() => setSessionStatusMut({ sessionId, status: "live" })}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-6 px-2.5 rounded"
            >
              Resume Class
            </Button>
          )}
        </div>
      )}

      {/* ─── 2. MAIN TEACHING WORKSPACE + COLLAPSIBLE SIDES ────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left / Center Teaching Canvas */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 relative">
          {/* A. DIGITAL WHITEBOARD */}
          {viewMode === "whiteboard" && (
            <ClassroomWhiteboard
              sessionId={sessionId}
              isTeacher={isTeacher}
              canDraw={Boolean(canAnnotate)}
              pages={whiteboardPages || []}
              currentPageIndex={currentPageIndex}
              onSavePage={(idx, title, elementsJson) =>
                saveWhiteboardMut({ sessionId, pageIndex: idx, title, elementsJson })
              }
              onCreatePage={(title) => createWhiteboardMut({ sessionId, title })}
              onClearPage={(idx) => clearWhiteboardMut({ sessionId, pageIndex: idx })}
              onSwitchPage={(idx) => setCurrentPageIndex(idx)}
              onBroadcastOp={media.broadcastWhiteboardOp}
              remoteOps={remoteOps}
              authorRole={isTeacher ? "teacher" : "student"}
              authorName={context?.userName || (isTeacher ? "Instructor" : "Student")}
              onClearStudentAnnotations={() => {
                // Annotations are filtered and synced locally by ClassroomWhiteboard
              }}
            />
          )}

          {/* B. PRESENTATION & PDF VIEWER */}
          {viewMode === "presentation" && (
            <ClassroomPresentation
              isTeacher={isTeacher}
              materials={materials || []}
              activeMaterial={activeMaterial}
              onSelectMaterial={(m) => setActiveMaterialId(m._id)}
              onUploadMaterial={(title, fileUrl, fileType, totalPages) =>
                uploadMaterialMut({ sessionId, title, fileUrl, fileType, totalPages })
              }
              onUpdatePage={(matId, page) =>
                updateMaterialPageMut({ materialId: matId as any, currentPage: page })
              }
            />
          )}

          {/* C. MATHEMATICS & SCIENCE TOOLS */}
          {viewMode === "math" && <ClassroomMathTools />}

          {/* D. LANGUAGE & SPEECH STUDIO */}
          {viewMode === "language" && (
            <ClassroomLanguageTools
              isTeacher={isTeacher}
              sharedText={languageBoard?.sharedText || ""}
              vocabulary={languageBoard?.vocabulary || []}
              conversationPrompts={languageBoard?.conversationPrompts || []}
              onUpdateText={(text) => updateLanguageBoardMut({ sessionId, sharedText: text })}
              onAddVocab={(vocab) => {
                const current = languageBoard?.vocabulary || [];
                updateLanguageBoardMut({ sessionId, vocabulary: [...current, vocab] });
              }}
              onDeleteVocab={(id) => {
                const current = languageBoard?.vocabulary || [];
                updateLanguageBoardMut({ sessionId, vocabulary: current.filter((v: any) => v.id !== id) });
              }}
            />
          )}

          {/* E. INTERACTIVE POLLS, QUIZZES & WORKSHEETS */}
          {viewMode === "worksheet" && (
            <ClassroomInteractions
              currentUserId={context.userId}
              currentUserName={context.userName}
              isTeacher={isTeacher}
              polls={polls || []}
              quizzes={quizzes || []}
              worksheets={worksheets || []}
              onCreatePoll={(question, options) => createPollMut({ sessionId, question, options })}
              onVotePoll={(pollId, optionIndex) => votePollMut({ pollId: pollId as any, optionIndex })}
              onClosePoll={(pollId) => closePollMut({ pollId: pollId as any })}
              onCreateQuiz={(title, questions) => createQuizMut({ sessionId, title, questions })}
              onSubmitQuiz={(quizId, answers) => submitQuizMut({ quizId: quizId as any, answers })}
              onCreateWorksheet={(title, instructions, questions) =>
                createWorksheetMut({ sessionId, title, instructions, questions })
              }
              onSubmitWorksheet={(worksheetId, answers) =>
                submitWorksheetMut({ worksheetId: worksheetId as any, answers })
              }
              onGradeWorksheet={(worksheetId, studentId, grade, feedback) =>
                gradeWorksheetMut({ worksheetId: worksheetId as any, studentId, grade, feedback })
              }
            />
          )}

          {/* F. FULL VIDEO GALLERY GRID */}
          {viewMode === "grid" && (
            <div className="flex-1 p-4 overflow-y-auto">
              <ClassroomVideoGrid
                currentUserId={context.userId}
                currentUserName={context.userName}
                currentUserRole={context.userRole}
                micOn={isMutedByTeacher ? false : media.micOn}
                camOn={isCamDisabledByTeacher ? false : media.camOn}
                localStream={media.localStream}
                screenStream={media.screenStream}
                isScreenSharing={media.isScreenSharing}
                isLocalSpeaking={media.isLocalSpeaking}
                participants={presenceList || []}
                remoteMediaParticipants={media.remoteParticipants}
                layoutMode="grid"
              />
            </div>
          )}
        </main>

        {/* Video Strip (when not in full video gallery mode) */}
        {viewMode !== "grid" && (
          <div className="hidden lg:block w-72 border-l border-slate-800 bg-slate-950/90 shrink-0 overflow-y-auto">
            <ClassroomVideoGrid
              currentUserId={context.userId}
              currentUserName={context.userName}
              currentUserRole={context.userRole}
              micOn={isMutedByTeacher ? false : media.micOn}
              camOn={isCamDisabledByTeacher ? false : media.camOn}
              localStream={media.localStream}
              screenStream={media.screenStream}
              isScreenSharing={media.isScreenSharing}
              isLocalSpeaking={media.isLocalSpeaking}
              participants={presenceList || []}
              remoteMediaParticipants={media.remoteParticipants}
              layoutMode="compact"
            />
          </div>
        )}

        {/* Mobile floating picture-in-picture preview when not on grid mode */}
        {viewMode !== "grid" && (
          <div
            onClick={() => setViewMode("grid")}
            className="lg:hidden absolute bottom-16 right-3 z-30 w-36 sm:w-48 aspect-video rounded-2xl overflow-hidden border-2 border-teal-500 shadow-2xl bg-slate-900 cursor-pointer active:scale-95 transition-transform group"
            title="Tap to switch to full Video Call"
          >
            <ClassroomVideoGrid
              currentUserId={context.userId}
              currentUserName={context.userName}
              currentUserRole={context.userRole}
              micOn={isMutedByTeacher ? false : media.micOn}
              camOn={isCamDisabledByTeacher ? false : media.camOn}
              localStream={media.localStream}
              screenStream={media.screenStream}
              isScreenSharing={media.isScreenSharing}
              isLocalSpeaking={media.isLocalSpeaking}
              participants={presenceList || []}
              remoteMediaParticipants={media.remoteParticipants}
              layoutMode="compact"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold gap-1 backdrop-blur-xs">
              <Maximize2 className="w-3.5 h-3.5" /> Full Video
            </div>
          </div>
        )}

        {/* Right Tabbed Drawer: Chat, Participants, Plan, Notes */}
        {sidePanelOpen && (
          <ClassroomSidePanels
            activeTab={sidePanelTab}
            onTabChange={(t) => setSidePanelTab(t)}
            currentUserId={context.userId}
            currentUserName={context.userName}
            isTeacher={isTeacher}
            messages={messages || []}
            participants={presenceList || []}
            objectives={classroomState.objectives || []}
            onSendMessage={(text, type) => sendMessageMut({ sessionId, text, type })}
            onToggleObjective={(id, completed) => {
              const current = classroomState.objectives || [];
              const updated = current.map((o: any) => (o.id === id ? { ...o, completed } : o));
              updateStateMut({ sessionId, objectives: updated });
            }}
            onManageParticipant={(targetUserId, action) =>
              manageParticipantMut({ sessionId, targetUserId, action })
            }
            onOpenHostControls={() => setHostControlsOpen(true)}
            onClose={() => setSidePanelOpen(false)}
          />
        )}
      </div>

      {/* ─── 3. BOTTOM CONTROL DOCK ───────────────────────────────────── */}
      <ClassroomBottomBar
        micOn={isMutedByTeacher ? false : media.micOn}
        camOn={isCamDisabledByTeacher ? false : media.camOn}
        isScreenSharing={media.isScreenSharing}
        handRaised={handRaised}
        viewMode={viewMode}
        sidePanelOpen={sidePanelOpen}
        sidePanelTab={sidePanelTab}
        unreadMessagesCount={0}
        isTeacher={isTeacher}
        isMutedByTeacher={isMutedByTeacher}
        isCamDisabledByTeacher={isCamDisabledByTeacher}
        canScreenShare={canScreenShare}
        onToggleMic={media.toggleMic}
        onToggleCam={media.toggleCam}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHandRaise={handleToggleHandRaise}
        onSendReaction={handleSendReaction}
        onChangeViewMode={handleChangeViewMode}
        onToggleSidePanel={(tab) => {
          if (sidePanelOpen && sidePanelTab === tab) {
            setSidePanelOpen(false);
          } else {
            setSidePanelOpen(true);
            setSidePanelTab(tab);
          }
        }}
        onOpenHostControls={() => setHostControlsOpen(true)}
        onOpenDeviceSettings={() => setDeviceSettingsOpen(true)}
      />

      {/* ─── 4. TEACHER HOST CONTROLS MODAL ───────────────────────────── */}
      {isTeacher && (
        <ClassroomHostControlsModal
          isOpen={hostControlsOpen}
          onClose={() => setHostControlsOpen(false)}
          sessionId={sessionId}
          isLocked={classroomState.locked ?? false}
          allowAnnotation={classroomState.allowStudentAnnotation ?? false}
          allowScreenShare={classroomState.allowStudentScreenShare ?? false}
          allowChat={classroomState.allowStudentChat ?? true}
          allowFileUpload={classroomState.allowStudentFileSubmit ?? true}
          participants={presenceList || []}
          attendanceRecords={attendanceRecords || []}
          auditLogs={auditLogs || []}
          onToggleLock={(locked) => updateStateMut({ sessionId, locked })}
          onToggleAnnotation={(allowStudentAnnotation) =>
            updateStateMut({ sessionId, allowStudentAnnotation })
          }
          onToggleScreenShare={(allowStudentScreenShare) =>
            updateStateMut({ sessionId, allowStudentScreenShare })
          }
          onToggleChat={(allowStudentChat) => updateStateMut({ sessionId, allowStudentChat })}
          onToggleFileUpload={(allowStudentFileSubmit) =>
            updateStateMut({ sessionId, allowStudentFileSubmit })
          }
          onManageParticipant={(targetUserId, action) =>
            manageParticipantMut({ sessionId, targetUserId, action })
          }
          onMuteAll={() => {
            (presenceList || [])
              .filter((p) => p.role === "student" && p.micOn)
              .forEach((p) => manageParticipantMut({ sessionId, targetUserId: p.userId, action: "mute" }));
          }}
          onDisableAllCams={() => {
            (presenceList || [])
              .filter((p) => p.role === "student" && p.camOn)
              .forEach((p) => manageParticipantMut({ sessionId, targetUserId: p.userId, action: "disable_cam" }));
          }}
          onUpdateAttendance={(attendanceId, status, notes) =>
            updateAttendanceMut({ attendanceId: attendanceId as any, status, notes })
          }
          onFinalizeAttendance={() => finalizeAttendanceMut({ sessionId })}
        />
      )}

      {/* ─── 5. TEACHER FINALIZE LESSON MODAL ─────────────────────────── */}
      {isTeacher && (
        <ClassroomEndLessonModal
          isOpen={endModalOpen}
          onClose={() => setEndModalOpen(false)}
          onSubmit={handleFinishLesson}
        />
      )}

      {/* ─── 6. HARDWARE DEVICE SETTINGS MODAL ────────────────────────── */}
      <ClassroomDeviceSettingsModal
        isOpen={deviceSettingsOpen}
        onClose={() => setDeviceSettingsOpen(false)}
        activeCameraId={media.activeCameraId}
        activeMicId={media.activeMicId}
        activeSpeakerId={media.activeSpeakerId}
        onSelectCamera={media.switchCamera}
        onSelectMic={media.switchMicrophone}
        onSelectSpeaker={media.switchSpeaker}
      />
    </div>
  );
}
