import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Hand,
  Wifi,
  Sparkles,
  Volume2,
  Users,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { RemoteMediaParticipant } from "@/hooks/useClassroomMedia";

export interface ParticipantPresence {
  _id: string;
  userId: string;
  name: string;
  role: "teacher" | "student";
  avatarUrl?: string;
  micOn: boolean;
  camOn: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  lastReaction?: string;
  connectionQuality: "excellent" | "fair" | "poor";
  canAnnotate?: boolean;
  canScreenShare?: boolean;
  isMutedByTeacher?: boolean;
  isCamDisabledByTeacher?: boolean;
  isRemoved?: boolean;
}

interface ClassroomVideoGridProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: "teacher" | "student";
  micOn: boolean;
  camOn: boolean;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isScreenSharing: boolean;
  isLocalSpeaking?: boolean;
  localAudioLevel?: number;
  participants: ParticipantPresence[];
  remoteMediaParticipants?: RemoteMediaParticipant[];
  layoutMode?: "compact" | "theater" | "grid";
}

// ─── Individual Remote Participant Tile with Real Video Element ──────
function RemoteVideoTile({
  presence,
  media,
  layoutMode,
}: {
  presence: ParticipantPresence;
  media?: RemoteMediaParticipant;
  layoutMode: "compact" | "theater" | "grid";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = media?.videoStream;
  const isSpeaking = media?.isSpeaking || false;
  const isCamActive = media ? media.isCamOn && !!media.videoStream : presence.camOn;
  const isMicActive = media ? media.isMicOn : presence.micOn;

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCamActive]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-900 border shadow-xl group transition-all duration-200 ${
        isSpeaking
          ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/20"
          : "border-slate-800 hover:border-slate-700"
      } ${
        layoutMode === "compact"
          ? "w-48 sm:w-full aspect-video shrink-0"
          : "flex-1 min-h-[220px] w-full aspect-video"
      }`}
    >
      {/* Real Video Element if camera is active */}
      {isCamActive && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        /* Camera Off Avatar Fallback */
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 p-3 text-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md mb-2 transition-transform ${
              isSpeaking ? "scale-110 ring-4 ring-emerald-500/40" : ""
            } ${
              presence.role === "teacher"
                ? "bg-gradient-to-br from-teal-500 to-teal-600"
                : "bg-gradient-to-br from-blue-600 to-indigo-600"
            }`}
          >
            {presence.name.charAt(0).toUpperCase()}
          </div>
          <p className="text-sm font-semibold text-slate-200 truncate max-w-[160px]">
            {presence.name}
          </p>
          <span className="text-xs text-slate-400 capitalize">{presence.role}</span>
        </div>
      )}

      {/* Speaking Glow Ripple Indicator */}
      {isSpeaking && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] shadow-md animate-pulse">
          <Volume2 className="w-3 h-3 fill-current" />
          Speaking
        </div>
      )}

      {/* Video Overlay Info */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-white truncate max-w-[140px]">
            {presence.name}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
              presence.role === "teacher"
                ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                : "bg-blue-500/20 text-blue-300 border-blue-500/30"
            }`}
          >
            {presence.role === "teacher" ? "Teacher" : "Student"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              isMicActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            }`}
          >
            {isMicActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {/* Hand Raised badge */}
      {presence.handRaised && (
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-lg animate-bounce">
          <Hand className="w-3.5 h-3.5" /> Hand Raised
        </div>
      )}

      {/* Reaction */}
      {presence.lastReaction && (
        <div className="absolute top-3 right-3 text-3xl animate-pulse">
          {presence.lastReaction}
        </div>
      )}
    </div>
  );
}

// ─── Simulated Remote Partner Tile (for interactive test / solo mode) ─
function SimulatedPartnerTile({
  currentUserRole,
  layoutMode,
}: {
  currentUserRole: "teacher" | "student";
  layoutMode: "compact" | "theater" | "grid";
}) {
  const isTeacher = currentUserRole === "teacher";
  const partnerName = isTeacher ? "Alex Rivera" : "Dr. Sarah Chen, Ph.D.";
  const partnerRole = isTeacher ? "Student" : "Course Instructor";
  const [isSimSpeaking, setIsSimSpeaking] = useState(true);

  // Gentle speaking pulse cycle to simulate real conversational presence
  useEffect(() => {
    const timer = setInterval(() => {
      setIsSimSpeaking((prev) => !prev);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-900 border shadow-xl transition-all duration-200 ${
        isSimSpeaking
          ? "border-teal-500/80 ring-2 ring-teal-500/30 shadow-teal-500/10"
          : "border-slate-800"
      } ${
        layoutMode === "compact"
          ? "w-48 sm:w-full aspect-video shrink-0"
          : "flex-1 min-h-[220px] w-full aspect-video"
      }`}
    >
      {/* Background with stylized live video presentation simulation */}
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 p-4 text-center relative">
        {/* Ambient subtle glow */}
        <div className="absolute inset-0 bg-radial from-teal-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />

        <div className="relative">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl shadow-2xl mb-3 transition-all duration-300 ${
              isSimSpeaking ? "scale-105 ring-4 ring-teal-400/50 shadow-teal-500/30" : ""
            } ${
              !isTeacher
                ? "bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600"
                : "bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600"
            }`}
          >
            {partnerName.charAt(0)}
          </div>

          {isSimSpeaking && (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
            </span>
          )}
        </div>

        <p className="text-sm sm:text-base font-bold text-white truncate max-w-[200px]">
          {partnerName}
        </p>
        <span className="text-xs text-teal-400 font-medium mt-0.5 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          {partnerRole}
        </span>
      </div>

      {/* Live status badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-teal-500/40 text-teal-300 font-semibold text-[10px] backdrop-blur-md">
        <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
        <span>Connected • HD 720p</span>
      </div>

      {/* Video Overlay Info */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-white truncate max-w-[140px]">
            {partnerName}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded font-semibold border bg-teal-500/20 text-teal-300 border-teal-500/30">
            {isTeacher ? "Student" : "Instructor"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Simulated Audio Visualizer Bars */}
          <div className="flex items-end gap-0.5 h-3.5">
            <div
              className={`w-1 bg-emerald-400 rounded-full transition-all duration-150 ${
                isSimSpeaking ? "h-3" : "h-1"
              }`}
            />
            <div
              className={`w-1 bg-emerald-400 rounded-full transition-all duration-150 ${
                isSimSpeaking ? "h-3.5" : "h-1.5"
              }`}
            />
            <div
              className={`w-1 bg-emerald-400 rounded-full transition-all duration-150 ${
                isSimSpeaking ? "h-2.5" : "h-1"
              }`}
            />
          </div>

          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Mic className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ClassroomVideoGrid Component ─────────────────────────────
export function ClassroomVideoGrid({
  currentUserId,
  currentUserName,
  currentUserRole,
  micOn,
  camOn,
  localStream,
  screenStream,
  isScreenSharing,
  isLocalSpeaking = false,
  localAudioLevel = 0,
  participants,
  remoteMediaParticipants = [],
  layoutMode = "compact",
}: ClassroomVideoGridProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local webcam stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, camOn]);

  // Attach screen share stream
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, isScreenSharing]);

  // Filter out current user from remote participant list
  const remotePresences = participants.filter((p) => p.userId !== currentUserId);
  const currentPresence = participants.find((p) => p.userId === currentUserId);

  // If someone is sharing screen in full theater mode:
  if (isScreenSharing && screenStream && layoutMode === "theater") {
    return (
      <div className="w-full h-full bg-slate-950 flex flex-col relative overflow-hidden">
        <div className="flex-1 relative flex items-center justify-center p-2">
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain rounded-xl bg-black border border-slate-800 shadow-2xl"
          />
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-teal-500/30 rounded-lg backdrop-blur-xs">
            <MonitorUp className="w-4 h-4 text-teal-400 animate-pulse" />
            <span className="text-xs font-semibold text-white">Live Screen Share</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full bg-slate-950/70 p-2 sm:p-4 overflow-y-auto ${
        layoutMode === "compact"
          ? "flex flex-row sm:flex-col gap-3 sm:w-64 max-h-full shrink-0 border-l border-slate-800/80"
          : "flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4 max-w-5xl mx-auto items-center justify-center"
      }`}
    >
      {/* 1. Local User Video Tile */}
      <div
        className={`relative rounded-2xl overflow-hidden bg-slate-900 border shadow-xl group transition-all duration-200 ${
          isLocalSpeaking
            ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/20"
            : "border-slate-800 hover:border-slate-700"
        } ${
          layoutMode === "compact"
            ? "w-48 sm:w-full aspect-video shrink-0"
            : "flex-1 min-h-[220px] w-full aspect-video"
        }`}
      >
        {camOn && localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 p-4 text-center">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md mb-2 transition-transform ${
                isLocalSpeaking ? "scale-110 ring-4 ring-emerald-500/40" : ""
              } ${
                currentUserRole === "teacher"
                  ? "bg-gradient-to-br from-teal-500 to-teal-600"
                  : "bg-gradient-to-br from-blue-600 to-indigo-600"
              }`}
            >
              {currentUserName.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-semibold text-slate-200 truncate max-w-[140px]">
              {currentUserName} (You)
            </p>
            <span className="text-xs text-slate-400 capitalize">{currentUserRole}</span>
          </div>
        )}

        {/* Local Speaking Badge */}
        {isLocalSpeaking && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] shadow-md animate-pulse">
            <Volume2 className="w-3 h-3 fill-current" />
            Speaking
          </div>
        )}

        {/* Video Overlay Info */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-white truncate max-w-[120px]">
              {currentUserName} (You)
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded font-semibold border border-teal-500/30">
              {currentUserRole === "teacher" ? "Teacher" : "Student"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Real Audio Volume Pulse */}
            {micOn && (
              <div className="flex items-end gap-0.5 h-3.5">
                <div
                  className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(20, Math.min(100, localAudioLevel * 1.2))}%` }}
                />
                <div
                  className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(30, Math.min(100, localAudioLevel * 1.6))}%` }}
                />
                <div
                  className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(20, Math.min(100, localAudioLevel * 0.9))}%` }}
                />
              </div>
            )}

            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                micOn ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              }`}
            >
              {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>

        {/* Hand Raised badge */}
        {currentPresence?.handRaised && (
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-lg animate-bounce">
            <Hand className="w-3.5 h-3.5" /> Hand Raised
          </div>
        )}

        {/* Reaction badge */}
        {currentPresence?.lastReaction && (
          <div className="absolute top-3 right-3 text-3xl animate-pulse">
            {currentPresence.lastReaction}
          </div>
        )}
      </div>

      {/* 2. Remote Participants Video Tiles with Real Video Elements */}
      {remotePresences.map((presence) => {
        const media = remoteMediaParticipants.find(
          (m) => m.id === presence.userId || m.name === presence.name
        );
        return (
          <RemoteVideoTile
            key={presence._id}
            presence={presence}
            media={media}
            layoutMode={layoutMode}
          />
        );
      })}

      {/* 3. Simulated Partner Tile when alone in room */}
      {remotePresences.length === 0 && (
        <SimulatedPartnerTile
          currentUserRole={currentUserRole}
          layoutMode={layoutMode}
        />
      )}
    </div>
  );
}
