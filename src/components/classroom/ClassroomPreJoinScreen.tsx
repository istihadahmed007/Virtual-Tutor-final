import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Video,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClassroomPreJoinScreenProps {
  sessionId: string;
  sessionTitle: string;
  subject: string;
  teacherName: string;
  userName: string;
  userRole: "teacher" | "student";
  initialCamOn?: boolean;
  initialMicOn?: boolean;
  onJoin: (config: {
    camOn: boolean;
    micOn: boolean;
    camDeviceId: string;
    micDeviceId: string;
    speakerDeviceId: string;
  }) => void;
  onCancel?: () => void;
}

export function ClassroomPreJoinScreen({
  sessionId,
  sessionTitle,
  subject,
  teacherName,
  userName,
  userRole,
  initialCamOn = true,
  initialMicOn = true,
  onJoin,
  onCancel,
}: ClassroomPreJoinScreenProps) {
  // Device Selection
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);

  const [selectedCam, setSelectedCam] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");

  const [camOn, setCamOn] = useState<boolean>(initialCamOn);
  const [micOn, setMicOn] = useState<boolean>(initialMicOn);

  // Audio level meter
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState<boolean>(false);
  const [serverCheckStatus, setServerCheckStatus] = useState<"checking" | "ready" | "error">("checking");
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Video Element Ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 1. Enumerate Media Devices
  const refreshDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const v = devices.filter((d) => d.kind === "videoinput");
      const aIn = devices.filter((d) => d.kind === "audioinput");
      const aOut = devices.filter((d) => d.kind === "audiooutput");

      setVideoDevices(v);
      setAudioInputDevices(aIn);
      setAudioOutputDevices(aOut);

      if (!selectedCam && v.length > 0) setSelectedCam(v[0].deviceId);
      if (!selectedMic && aIn.length > 0) setSelectedMic(aIn[0].deviceId);
      if (!selectedSpeaker && aOut.length > 0) setSelectedSpeaker(aOut[0].deviceId);
    } catch (e) {
      console.warn("Could not enumerate media devices:", e);
    }
  };

  // 2. Start Preview Media Stream
  const startPreview = async (camId?: string, micId?: string) => {
    try {
      setPermissionError(null);

      // Stop old tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const videoConstraints: MediaTrackConstraints = camId
        ? { deviceId: { exact: camId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } };

      const audioConstraints: MediaTrackConstraints = micId
        ? { deviceId: { exact: micId }, echoCancellation: true, noiseSuppression: true }
        : { echoCancellation: true, noiseSuppression: true };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: camOn ? videoConstraints : false,
          audio: audioConstraints,
        });
      } catch {
        // Fallback without exact constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: camOn,
          audio: true,
        });
      }

      streamRef.current = stream;
      if (videoRef.current && camOn) {
        videoRef.current.srcObject = stream;
      }

      await refreshDevices();

      // Setup audio analyzer
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close().catch(() => {});
        }
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyserRef.current = analyser;

        const src = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
        src.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          const normalized = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(normalized);
          animFrameRef.current = requestAnimationFrame(loop);
        };
        loop();
      }
    } catch (err: any) {
      console.warn("Pre-join user media error:", err);
      setPermissionError(err.message || "Camera or microphone permission required.");
    }
  };

  // 3. Play Speaker Audio Test (Gentle harmonic chime)
  const playTestSpeakerChime = () => {
    try {
      setIsPlayingTestSound(true);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Play a clean two-tone chime (523Hz C5 -> 659Hz E5)
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

        gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      playTone(523.25, 0, 0.4);
      playTone(659.25, 0.22, 0.55);

      setTimeout(() => {
        setIsPlayingTestSound(false);
        try {
          ctx.close();
        } catch {}
      }, 900);
    } catch (e) {
      console.warn("Speaker test error:", e);
      setIsPlayingTestSound(false);
    }
  };

  // 4. Test LiveKit Server & Token Endpoint
  useEffect(() => {
    let isMounted = true;
    async function checkServer() {
      try {
        setServerCheckStatus("checking");
        const res = await fetch(`/api/livekit-token?sessionId=${encodeURIComponent(sessionId)}&userId=probe&role=${userRole}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data?.configured) {
              setServerCheckStatus("ready");
            } else {
              setServerCheckStatus("error");
            }
          }
        } else {
          if (isMounted) setServerCheckStatus("error");
        }
      } catch {
        if (isMounted) setServerCheckStatus("error");
      }
    }
    checkServer();
    return () => {
      isMounted = false;
    };
  }, [sessionId, userRole]);

  // Initial preview on mount
  useEffect(() => {
    startPreview(selectedCam, selectedMic);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleToggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    if (streamRef.current) {
      const vTrack = streamRef.current.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = next;
      } else if (next) {
        startPreview(selectedCam, selectedMic);
      }
    } else if (next) {
      startPreview(selectedCam, selectedMic);
    }
  };

  const handleToggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    if (streamRef.current) {
      const aTrack = streamRef.current.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = next;
      }
    }
  };

  const handleCamChange = (deviceId: string) => {
    setSelectedCam(deviceId);
    startPreview(deviceId, selectedMic);
  };

  const handleMicChange = (deviceId: string) => {
    setSelectedMic(deviceId);
    startPreview(selectedCam, deviceId);
  };

  const handleJoin = () => {
    // Stop local preview tracks so classroom hook can claim hardware
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }

    onJoin({
      camOn,
      micOn,
      camDeviceId: selectedCam,
      micDeviceId: selectedMic,
      speakerDeviceId: selectedSpeaker,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
      <div className="w-full max-w-4xl mx-auto flex flex-col space-y-6 my-auto">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                LiveKit Cloud SFU
              </span>
              <span className="text-xs text-slate-400">Ready to join</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {sessionTitle || "Classroom Audio & Video Setup"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Subject: <span className="text-slate-200 font-medium">{subject}</span> • Instructor:{" "}
              <span className="text-slate-200 font-medium">{teacherName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {serverCheckStatus === "ready" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                Media Engine Online
              </span>
            )}
            {serverCheckStatus === "checking" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Verifying LiveKit SFU...
              </span>
            )}
            {serverCheckStatus === "error" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                <AlertCircle className="w-4 h-4" />
                LiveKit Offline
              </span>
            )}
          </div>
        </div>

        {/* Main Grid: Video Preview & Device Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Camera Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="relative aspect-video w-full rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
              {camOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
                    <CameraOff className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">Camera is turned off</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    You will enter the classroom with video disabled. You can turn your camera on anytime during the lesson.
                  </p>
                </div>
              )}

              {/* Floating Camera & Mic Quick Toggles on Video Tile */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleToggleMic}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md transition-all ${
                    micOn
                      ? "bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {micOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                  <span>{micOn ? "Mute Mic" : "Unmute Mic"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleCam}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md transition-all ${
                    camOn
                      ? "bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {camOn ? <Camera className="w-4 h-4 text-teal-400" /> : <CameraOff className="w-4 h-4" />}
                  <span>{camOn ? "Stop Cam" : "Start Cam"}</span>
                </button>
              </div>

              {/* Live Mic Meter in top right corner */}
              <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs">
                <span className="text-[11px] text-slate-300">Mic</span>
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75 rounded-full"
                    style={{ width: `${micOn ? Math.min(100, audioLevel * 1.5) : 0}%` }}
                  />
                </div>
              </div>

              {/* User Identity Chip */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-white">
                <span className="capitalize">{userName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 capitalize">
                  {userRole}
                </span>
              </div>
            </div>

            {permissionError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Device Permission Note:</span> {permissionError}. Please check your browser address bar permissions if camera or microphone is blocked.
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Device Selectors & Speaker Test (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4 bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-400" />
                Input & Output Devices
              </h2>
              <button
                type="button"
                onClick={refreshDevices}
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {/* Camera Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-400" /> Camera
              </label>
              <select
                value={selectedCam}
                onChange={(e) => handleCamChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              >
                {videoDevices.length > 0 ? (
                  videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera (${d.deviceId.slice(0, 6)}...)`}
                    </option>
                  ))
                ) : (
                  <option value="">Default Web Camera</option>
                )}
              </select>
            </div>

            {/* Microphone Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-emerald-400" /> Microphone
              </label>
              <select
                value={selectedMic}
                onChange={(e) => handleMicChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              >
                {audioInputDevices.length > 0 ? (
                  audioInputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone (${d.deviceId.slice(0, 6)}...)`}
                    </option>
                  ))
                ) : (
                  <option value="">Default Microphone</option>
                )}
              </select>
            </div>

            {/* Speaker / Output Dropdown & Test Sound */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" /> Speakers & Headphones
                </span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {audioOutputDevices.length > 0 ? (
                    audioOutputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Speaker (${d.deviceId.slice(0, 6)}...)`}
                      </option>
                    ))
                  ) : (
                    <option value="">Default System Audio Output</option>
                  )}
                </select>

                <Button
                  type="button"
                  size="sm"
                  onClick={playTestSpeakerChime}
                  disabled={isPlayingTestSound}
                  className="h-8 text-xs bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 px-3 shrink-0"
                >
                  <Play className={`w-3 h-3 mr-1 ${isPlayingTestSound ? "animate-spin text-teal-400" : ""}`} />
                  {isPlayingTestSound ? "Testing..." : "Test Audio"}
                </Button>
              </div>
            </div>

            {/* Diagnostic Details */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Room Identifier:</span>
                <span className="font-mono text-slate-200">classroom-{sessionId.slice(0, 10)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Media Transport:</span>
                <span className="text-teal-300 font-medium">LiveKit SFU / Cloud WebSockets</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex flex-col sm:flex-row items-center gap-2.5">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="w-full sm:w-auto border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                onClick={handleJoin}
                className="w-full flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Join Classroom</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
