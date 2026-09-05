import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Radio,
  Wifi,
  Video,
  VideoOff,
  Mic,
  MicOff,
  RefreshCw,
  Share2,
  Sliders,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DevVideoFallbackProps {
  isConfigured: boolean;
  serverUrl?: string | null;
  onSimulateReconnect?: () => void;
  onToggleRemoteSimulation?: () => void;
  hasRemotePeer?: boolean;
}

export function DevVideoFallbackBanner({
  isConfigured,
  serverUrl,
  onSimulateReconnect,
  onToggleRemoteSimulation,
  hasRemotePeer = true,
}: DevVideoFallbackProps) {
  const [dismissed, setDismissed] = useState(false);
  const [simulatingLag, setSimulatingLag] = useState(false);

  if (isConfigured || dismissed) {
    return null;
  }

  const handleSimulateNetworkGlitch = () => {
    setSimulatingLag(true);
    if (onSimulateReconnect) {
      onSimulateReconnect();
    }
    setTimeout(() => {
      setSimulatingLag(false);
    }, 2500);
  };

  return (
    <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2 text-white text-xs shrink-0 z-40 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-7xl mx-auto">
        <div className="flex items-start sm:items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-bold text-amber-200">
              Development Media Fallback Active:
            </span>{" "}
            <span className="text-amber-100/90">
              LiveKit server URL not configured in container environment. Live media running in browser WebRTC & simulated preview mode.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            size="sm"
            onClick={handleSimulateNetworkGlitch}
            disabled={simulatingLag}
            className="h-6 text-[11px] bg-amber-800/80 hover:bg-amber-700 text-amber-100 border border-amber-600/50 rounded-md px-2.5"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${simulatingLag ? "animate-spin" : ""}`} />
            <span>{simulatingLag ? "Simulating Reconnect..." : "Test Reconnection"}</span>
          </Button>

          {onToggleRemoteSimulation && (
            <Button
              size="sm"
              onClick={onToggleRemoteSimulation}
              className="h-6 text-[11px] bg-amber-800/80 hover:bg-amber-700 text-amber-100 border border-amber-600/50 rounded-md px-2.5"
            >
              <Video className="w-3 h-3 mr-1" />
              <span>{hasRemotePeer ? "Hide Simulated Peer" : "Show Simulated Peer"}</span>
            </Button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="text-amber-300 hover:text-white text-[11px] underline ml-1"
          >
            Hide Banner
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Procedural animated avatar feed for development fallback when no physical camera is attached
 */
export function SimulatedMediaFeed({
  name,
  role,
  isSpeaking,
  audioLevel = 0,
  isMuted = false,
  isCamOff = false,
}: {
  name: string;
  role: "teacher" | "student";
  isSpeaking: boolean;
  audioLevel?: number;
  isMuted?: boolean;
  isCamOff?: boolean;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 60);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Animated Subtle Grid */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Speaking Aura Ring */}
      <div
        className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
          isSpeaking && !isMuted
            ? "ring-4 ring-teal-400 ring-offset-4 ring-offset-slate-950 scale-105"
            : ""
        }`}
      >
        <div
          className={`h-24 w-24 sm:h-28 sm:w-28 rounded-full flex items-center justify-center font-black text-2xl sm:text-3xl text-white shadow-2xl ${
            role === "teacher"
              ? "bg-gradient-to-tr from-teal-600 to-teal-400"
              : "bg-gradient-to-tr from-indigo-600 to-indigo-400"
          }`}
        >
          {name.slice(0, 2).toUpperCase()}
        </div>

        {/* Dynamic Simulated Audio Waveform when speaking */}
        {isSpeaking && !isMuted && (
          <div className="absolute -bottom-2 flex items-center gap-1 bg-slate-900/90 px-2.5 py-0.5 rounded-full border border-teal-500/40">
            <span
              className="w-1 bg-teal-400 rounded-full animate-bounce"
              style={{ height: `${Math.max(6, (frame % 4) * 4 + 6)}px` }}
            />
            <span
              className="w-1 bg-teal-400 rounded-full animate-bounce"
              style={{ height: `${Math.max(6, ((frame + 2) % 5) * 5 + 6)}px` }}
            />
            <span
              className="w-1 bg-teal-400 rounded-full animate-bounce"
              style={{ height: `${Math.max(6, ((frame + 1) % 4) * 4 + 6)}px` }}
            />
          </div>
        )}
      </div>

      {/* Name and State Pill */}
      <div className="mt-4 text-center z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 backdrop-blur-xs">
          <span className="text-xs font-bold text-white">{name}</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-bold">
            {role}
          </span>
          {isMuted ? (
            <MicOff className="w-3 h-3 text-red-400" />
          ) : (
            <Mic className="w-3 h-3 text-emerald-400" />
          )}
        </div>
      </div>

      {/* Simulated Camera Off Notice */}
      {isCamOff && (
        <div className="absolute top-3 left-3 text-[10px] text-slate-400 flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded">
          <VideoOff className="w-3 h-3 text-slate-400" />
          <span>Camera Paused</span>
        </div>
      )}
    </div>
  );
}
