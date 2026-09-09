import React from "react";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Volume2,
  CheckCircle2,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClassroomConnectionBannerProps {
  connectionStatus: "connected" | "connecting" | "reconnecting" | "disconnected";
  connectionQuality: "excellent" | "good" | "weak" | "poor";
  latencyMs?: number;
  audioBlocked?: boolean;
  connectionError?: string | null;
  onReconnect?: () => void;
  onResumeAudio?: () => void;
}

export function ClassroomConnectionBanner({
  connectionStatus,
  connectionQuality,
  latencyMs,
  audioBlocked,
  connectionError,
  onReconnect,
  onResumeAudio,
}: ClassroomConnectionBannerProps) {
  // 1. Audio Blocked by Browser Autoplay Policy
  if (audioBlocked && onResumeAudio) {
    return (
      <div className="bg-blue-950/90 border-b border-blue-500/40 px-4 py-2 text-white text-xs shrink-0 z-40 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="font-semibold text-blue-200">Audio playback paused:</span>
            <span className="text-blue-100/90">
              Browser policy requires user interaction before playing incoming participant audio.
            </span>
          </div>
          <Button
            size="sm"
            onClick={onResumeAudio}
            className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 shrink-0"
          >
            <Volume2 className="w-3.5 h-3.5 mr-1" />
            Enable Participant Audio
          </Button>
        </div>
      </div>
    );
  }

  // 2. Reconnecting State
  if (connectionStatus === "reconnecting") {
    return (
      <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2 text-white text-xs shrink-0 z-40 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
            <span className="font-bold text-amber-200">Network Reconnecting:</span>
            <span className="text-amber-100/90">
              Re-establishing secure WebRTC session with LiveKit Cloud SFU...
            </span>
          </div>
          {onReconnect && (
            <Button
              size="sm"
              onClick={onReconnect}
              className="h-7 text-xs bg-amber-800 hover:bg-amber-700 text-amber-100 border border-amber-600/50 rounded-lg px-3 shrink-0"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Force Reconnect
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 3. Disconnected State / Credentials Notice
  if (connectionStatus === "disconnected") {
    const isCredentialsNotice =
      connectionError &&
      (connectionError.includes("Settings") ||
        connectionError.includes("credentials") ||
        connectionError.includes("masked") ||
        connectionError.includes("Secret") ||
        connectionError.includes("API Key"));

    return (
      <div
        className={`border-b px-4 py-2 text-white text-xs shrink-0 z-40 backdrop-blur-md ${
          isCredentialsNotice
            ? "bg-slate-900/95 border-amber-500/40 text-slate-200"
            : "bg-rose-950/90 border-rose-500/40 text-white"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            {isCredentialsNotice ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className={`font-bold ${isCredentialsNotice ? "text-amber-300" : "text-rose-200"}`}>
              {isCredentialsNotice ? "Media Setup:" : "Media Disconnected:"}
            </span>
            <span className={isCredentialsNotice ? "text-slate-300 text-xs" : "text-rose-100/90"}>
              {connectionError || "Connection to LiveKit SFU server was lost. Please check your internet connection."}
            </span>
          </div>
          {onReconnect && (
            <Button
              size="sm"
              onClick={onReconnect}
              className={`h-7 text-xs rounded-lg px-3 shrink-0 shadow-sm ${
                isCredentialsNotice
                  ? "bg-amber-600 hover:bg-amber-500 text-white font-medium"
                  : "bg-rose-700 hover:bg-rose-600 text-white"
              }`}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              {isCredentialsNotice ? "Check Connection" : "Reconnect Now"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 4. Weak connection warning
  if (connectionStatus === "connected" && connectionQuality === "weak") {
    return (
      <div className="bg-yellow-950/70 border-b border-yellow-500/30 px-4 py-1.5 text-white text-xs shrink-0 z-30">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <span className="text-yellow-100">
              High packet latency detected ({latencyMs || 120}ms). LiveKit dynacast is automatically prioritizing crystal-clear audio.
            </span>
          </div>
          {onReconnect && (
            <button
              onClick={onReconnect}
              className="text-yellow-300 hover:text-white underline text-[11px]"
            >
              Refresh link
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
