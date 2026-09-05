import { useEffect, useRef } from "react";
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
  const isCamActive = (media ? media.isCamOn && !!media.videoStream : presence.camOn);
  const isMicActive = media ? media.isMicOn : presence.micOn;

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCamActive]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-slate-900 border shadow-lg group transition-all duration-200 ${
        isSpeaking
          ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/20"
          : "border-slate-800 hover:border-slate-700"
      } ${layoutMode === "compact" ? "w-48 sm:w-full aspect-video shrink-0" : "aspect-video"}`}
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
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md mb-1.5 transition-transform ${
              isSpeaking ? "scale-110 ring-4 ring-emerald-500/40" : ""
            } ${
              presence.role === "teacher"
                ? "bg-gradient-to-br from-teal-500 to-teal-600"
                : "bg-gradient-to-br from-blue-600 to-indigo-600"
            }`}
          >
            {presence.name.charAt(0).toUpperCase()}
          </div>
          <p className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">
            {presence.name}
          </p>
          <span className="text-[10px] text-slate-400 capitalize">{presence.role}</span>
        </div>
      )}

      {/* Speaking Glow Ripple Indicator */}
      {isSpeaking && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-slate-950 font-bold text-[9px] shadow-sm animate-pulse">
          <Volume2 className="w-2.5 h-2.5 fill-current" />
          Speaking
        </div>
      )}

      {/* Video Overlay Info */}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-medium text-white truncate max-w-[100px]">
            {presence.name}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
              presence.role === "teacher"
                ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                : "bg-blue-500/20 text-blue-300 border-blue-500/30"
            }`}
          >
            {presence.role === "teacher" ? "Teacher" : "Student"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Audio volume visualizer */}
          {isMicActive ? (
            <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Mic className="w-3 h-3" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md bg-red-500/20 text-red-400 flex items-center justify-center">
              <MicOff className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>

      {/* Hand Raised badge */}
      {presence.handRaised && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded-md text-[10px] flex items-center gap-1 shadow-lg animate-bounce">
          <Hand className="w-3 h-3" /> Hand Raised
        </div>
      )}

      {/* Reaction */}
      {presence.lastReaction && (
        <div className="absolute top-2 right-2 text-2xl animate-pulse">
          {presence.lastReaction}
        </div>
      )}
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
      className={`w-full h-full bg-slate-950/60 p-2 sm:p-3 overflow-y-auto ${
        layoutMode === "compact"
          ? "flex flex-row sm:flex-col gap-2.5 sm:w-64 max-h-full shrink-0 border-l border-slate-800/80"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-fr"
      }`}
    >
      {/* 1. Local User Video Tile */}
      <div
        className={`relative rounded-xl overflow-hidden bg-slate-900 border shadow-lg group transition-all duration-200 ${
          isLocalSpeaking
            ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/20"
            : "border-slate-800 hover:border-slate-700"
        } ${layoutMode === "compact" ? "w-48 sm:w-full aspect-video shrink-0" : "aspect-video"}`}
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
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 p-3 text-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md mb-1.5 transition-transform ${
                isLocalSpeaking ? "scale-110 ring-4 ring-emerald-500/40" : ""
              } ${
                currentUserRole === "teacher"
                  ? "bg-gradient-to-br from-teal-500 to-teal-600"
                  : "bg-gradient-to-br from-blue-600 to-indigo-600"
              }`}
            >
              {currentUserName.charAt(0).toUpperCase()}
            </div>
            <p className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">
              {currentUserName} (You)
            </p>
            <span className="text-[10px] text-slate-400 capitalize">{currentUserRole}</span>
          </div>
        )}

        {/* Local Speaking Badge */}
        {isLocalSpeaking && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-slate-950 font-bold text-[9px] shadow-sm animate-pulse">
            <Volume2 className="w-2.5 h-2.5 fill-current" />
            Speaking
          </div>
        )}

        {/* Video Overlay Info */}
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-medium text-white truncate max-w-[100px]">
              {currentUserName} (You)
            </span>
            <span className="text-[9px] px-1.5 py-0.2 bg-teal-500/20 text-teal-300 rounded font-semibold border border-teal-500/30">
              {currentUserRole === "teacher" ? "Teacher" : "Student"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Real Audio Volume Pulse */}
            {micOn && (
              <div className="flex items-end gap-0.5 h-3">
                <div
                  className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(20, Math.min(100, localAudioLevel * 1.2))}%` }}
                />
                <div
                  className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(30, Math.min(100, localAudioLevel * 1.6))}%` }}
                />
                <div
                  className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(20, Math.min(100, localAudioLevel * 0.9))}%` }}
                />
              </div>
            )}

            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center ${
                micOn ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              }`}
            >
              {micOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            </div>
          </div>
        </div>

        {/* Hand Raised badge */}
        {currentPresence?.handRaised && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded-md text-[10px] flex items-center gap-1 shadow-lg animate-bounce">
            <Hand className="w-3 h-3" /> Hand Raised
          </div>
        )}

        {/* Reaction badge */}
        {currentPresence?.lastReaction && (
          <div className="absolute top-2 right-2 text-2xl animate-pulse">
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

      {/* 3. Empty State when alone in room */}
      {remotePresences.length === 0 && (
        <div className="p-4 bg-slate-900/60 rounded-xl border border-dashed border-slate-800 text-center flex flex-col items-center justify-center shrink-0 w-full col-span-full">
          <Sparkles className="w-4 h-4 text-teal-400 mb-1" />
          <p className="text-[11px] font-semibold text-slate-300">Ready for Live Class</p>
          <p className="text-[9px] text-slate-500 mt-0.5 max-w-xs leading-relaxed">
            Invite your student or teacher to join with the meeting code to begin your interactive session.
          </p>
        </div>
      )}
    </div>
  );
}
