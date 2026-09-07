import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Hand,
  Smile,
  PenTool,
  Presentation,
  Calculator,
  Languages,
  FileCheck2,
  LayoutGrid,
  MessageSquare,
  Users,
  Shield,
  Lock,
  Settings,
} from "lucide-react";

export type ClassroomViewMode =
  | "whiteboard"
  | "presentation"
  | "math"
  | "language"
  | "worksheet"
  | "grid";

interface ClassroomBottomBarProps {
  micOn: boolean;
  camOn: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  viewMode: ClassroomViewMode;
  sidePanelOpen: boolean;
  sidePanelTab: "chat" | "participants" | "plan" | "notes";
  unreadMessagesCount?: number;
  isTeacher: boolean;
  isMutedByTeacher?: boolean;
  isCamDisabledByTeacher?: boolean;
  canScreenShare?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onSendReaction: (emoji: string) => void;
  onChangeViewMode: (mode: ClassroomViewMode) => void;
  onToggleSidePanel: (tab: "chat" | "participants" | "plan" | "notes") => void;
  onOpenHostControls?: () => void;
  onOpenDeviceSettings?: () => void;
}

const REACTIONS = ["👍", "❤️", "👏", "💡", "🤔", "🎯", "⭐", "🎉"];

export function ClassroomBottomBar({
  micOn,
  camOn,
  isScreenSharing,
  handRaised,
  viewMode,
  sidePanelOpen,
  sidePanelTab,
  unreadMessagesCount = 0,
  isTeacher,
  isMutedByTeacher = false,
  isCamDisabledByTeacher = false,
  canScreenShare = true,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleHandRaise,
  onSendReaction,
  onChangeViewMode,
  onToggleSidePanel,
  onOpenHostControls,
  onOpenDeviceSettings,
}: ClassroomBottomBarProps) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <footer className="bg-slate-900 border-t border-slate-800 px-3 py-2 flex items-center justify-between shrink-0 select-none relative z-20">
      {/* ─── Left Section: Audio, Video & Screen Share ─────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Mic Toggle */}
        <button
          onClick={() => {
            if (isMutedByTeacher && !isTeacher) return;
            onToggleMic();
          }}
          disabled={isMutedByTeacher && !isTeacher}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative ${
            isMutedByTeacher && !isTeacher
              ? "bg-slate-800/60 text-slate-500 cursor-not-allowed opacity-70"
              : micOn
                ? "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
          }`}
          title={
            isMutedByTeacher && !isTeacher
              ? "Microphone locked by instructor"
              : micOn
                ? "Mute Microphone"
                : "Unmute Microphone"
          }
        >
          {micOn && !isMutedByTeacher ? (
            <Mic className="w-4 h-4 text-emerald-400" />
          ) : (
            <MicOff className="w-4 h-4 text-red-400" />
          )}
          {isMutedByTeacher && !isTeacher && (
            <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-amber-400" />
          )}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={() => {
            if (isCamDisabledByTeacher && !isTeacher) return;
            onToggleCam();
          }}
          disabled={isCamDisabledByTeacher && !isTeacher}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center relative ${
            isCamDisabledByTeacher && !isTeacher
              ? "bg-slate-800/60 text-slate-500 cursor-not-allowed opacity-70"
              : camOn
                ? "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
          }`}
          title={
            isCamDisabledByTeacher && !isTeacher
              ? "Camera locked by instructor"
              : camOn
                ? "Turn off camera"
                : "Turn on camera"
          }
        >
          {camOn && !isCamDisabledByTeacher ? (
            <Video className="w-4 h-4 text-emerald-400" />
          ) : (
            <VideoOff className="w-4 h-4 text-red-400" />
          )}
          {isCamDisabledByTeacher && !isTeacher && (
            <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-amber-400" />
          )}
        </button>

        {/* Screen Share */}
        <button
          onClick={() => {
            if (!canScreenShare && !isTeacher) return;
            onToggleScreenShare();
          }}
          disabled={!canScreenShare && !isTeacher}
          className={`p-2.5 rounded-xl transition-all hidden sm:flex items-center justify-center relative ${
            !canScreenShare && !isTeacher
              ? "bg-slate-800/40 text-slate-600 cursor-not-allowed"
              : isScreenSharing
                ? "bg-teal-500 text-slate-950 font-bold shadow-md"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
          title={
            !canScreenShare && !isTeacher
              ? "Screen sharing disabled by instructor"
              : isScreenSharing
                ? "Stop screen share"
                : "Share screen"
          }
        >
          <MonitorUp className="w-4 h-4" />
          {!canScreenShare && !isTeacher && (
            <Lock className="w-2 h-2 absolute -top-1 -right-1 text-slate-500" />
          )}
        </button>

        {/* Settings button for Camera / Mic / Speaker selection */}
        {onOpenDeviceSettings && (
          <button
            onClick={onOpenDeviceSettings}
            className="p-2.5 bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-all flex items-center justify-center"
            title="Audio & Video Device Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Teacher Quick Host Controls button in bottom bar */}
        {isTeacher && onOpenHostControls && (
          <button
            onClick={onOpenHostControls}
            className="p-2.5 bg-slate-800 border border-slate-700 text-teal-400 hover:bg-slate-700 rounded-xl transition-all flex items-center justify-center"
            title="Classroom Host Controls & Permissions"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ─── Middle Section: Digital Teaching Tools Switcher ──────────── */}
      <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
        {[
          { id: "grid" as const, label: "Video Call", icon: Video },
          { id: "whiteboard" as const, label: "Board", icon: PenTool },
          { id: "presentation" as const, label: "Slides", icon: Presentation },
          { id: "math" as const, label: "Math", icon: Calculator },
          { id: "language" as const, label: "Language", icon: Languages },
          { id: "worksheet" as const, label: "Activities", icon: FileCheck2 },
        ].map((mode) => (
          <button
            key={mode.id}
            onClick={() => onChangeViewMode(mode.id)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === mode.id
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title={`Switch to ${mode.label}`}
          >
            <mode.icon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* ─── Right Section: Reactions, Raise Hand, Side Panels ───────── */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Raise Hand Toggle */}
        <button
          onClick={onToggleHandRaise}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
            handRaised
              ? "bg-amber-500 text-slate-950 font-bold shadow-lg animate-bounce"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
          title={handRaised ? "Lower Hand" : "Raise Hand"}
        >
          <Hand className="w-4 h-4" />
        </button>

        {/* Reaction Picker Button */}
        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-2.5 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-all flex items-center justify-center"
            title="Send Reaction"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Reactions Popover */}
          {showReactions && (
            <div className="absolute bottom-12 right-0 bg-slate-900 border border-slate-700 p-2 rounded-2xl shadow-2xl flex items-center gap-1 z-50 animate-in fade-in zoom-in-95">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji);
                    setShowReactions(false);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-slate-800 text-lg flex items-center justify-center transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Drawer Toggle */}
        <button
          onClick={() => onToggleSidePanel("chat")}
          className={`p-2.5 rounded-xl transition-all relative flex items-center justify-center ${
            sidePanelOpen && sidePanelTab === "chat"
              ? "bg-teal-600 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
          title="Toggle Chat"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-teal-500 text-white font-bold text-[9px] flex items-center justify-center">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        {/* Participants Drawer Toggle */}
        <button
          onClick={() => onToggleSidePanel("participants")}
          className={`p-2.5 rounded-xl transition-all hidden sm:flex items-center justify-center ${
            sidePanelOpen && sidePanelTab === "participants"
              ? "bg-teal-600 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
          title="Toggle Participants"
        >
          <Users className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
}
