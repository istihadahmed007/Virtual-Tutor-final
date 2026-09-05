import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Mic,
  Volume2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Play,
  Check,
} from "lucide-react";

interface ClassroomDeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCameraId?: string;
  activeMicId?: string;
  activeSpeakerId?: string;
  onSelectCamera: (deviceId: string) => Promise<void> | void;
  onSelectMic: (deviceId: string) => Promise<void> | void;
  onSelectSpeaker: (deviceId: string) => Promise<void> | void;
}

export function ClassroomDeviceSettingsModal({
  isOpen,
  onClose,
  activeCameraId,
  activeMicId,
  activeSpeakerId,
  onSelectCamera,
  onSelectMic,
  onSelectSpeaker,
}: ClassroomDeviceSettingsModalProps) {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [camPermission, setCamPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt">("prompt");

  const [selectedCam, setSelectedCam] = useState<string>(activeCameraId || "");
  const [selectedMic, setSelectedMic] = useState<string>(activeMicId || "");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>(activeSpeakerId || "");

  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync incoming props
  useEffect(() => {
    if (activeCameraId) setSelectedCam(activeCameraId);
    if (activeMicId) setSelectedMic(activeMicId);
    if (activeSpeakerId) setSelectedSpeaker(activeSpeakerId);
  }, [activeCameraId, activeMicId, activeSpeakerId]);

  // Enumerate devices and check permissions
  const refreshDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === "videoinput");
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const audioOutputs = devices.filter((d) => d.kind === "audiooutput");

      setVideoDevices(videos);
      setAudioInputDevices(audioInputs);
      setAudioOutputDevices(audioOutputs);

      // Default selection if not set
      if (!selectedCam && videos.length > 0) {
        setSelectedCam(videos[0].deviceId);
      }
      if (!selectedMic && audioInputs.length > 0) {
        setSelectedMic(audioInputs[0].deviceId);
      }
      if (!selectedSpeaker && audioOutputs.length > 0) {
        setSelectedSpeaker(audioOutputs[0].deviceId);
      }

      // Check permissions if query API supported
      if (navigator.permissions?.query) {
        try {
          const camQuery = await navigator.permissions.query({ name: "camera" as any });
          setCamPermission(camQuery.state as any);
          camQuery.onchange = () => setCamPermission(camQuery.state as any);
        } catch {}

        try {
          const micQuery = await navigator.permissions.query({ name: "microphone" as any });
          setMicPermission(micQuery.state as any);
          micQuery.onchange = () => setMicPermission(micQuery.state as any);
        } catch {}
      }
    } catch (err: any) {
      console.error("Device enumeration failed:", err);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupPreview();
      return;
    }

    refreshDevices();

    // Listen for plug/unplug events
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
        cleanupPreview();
      };
    }
    return () => cleanupPreview();
  }, [isOpen]);

  // Clean up preview streams
  const cleanupPreview = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
  };

  // Start preview stream when camera or mic changes in modal
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function startPreview() {
      cleanupPreview();
      setPreviewError(null);

      try {
        const videoConstraints: boolean | MediaTrackConstraints = selectedCam
          ? { deviceId: { exact: selectedCam }, width: { ideal: 640 }, height: { ideal: 360 } }
          : true;

        const audioConstraints: boolean | MediaTrackConstraints = selectedMic
          ? { deviceId: { exact: selectedMic }, echoCancellation: true, noiseSuppression: true }
          : true;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: audioConstraints,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        previewStreamRef.current = stream;

        // Attach video track to video tag
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = new MediaStream(stream.getVideoTracks());
        }

        // Setup real-time audio volume visualizer
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioMeter = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((avg / 128) * 100));
            setAudioLevel(normalized);
            animFrameRef.current = requestAnimationFrame(updateAudioMeter);
          };
          updateAudioMeter();
        }

        setCamPermission("granted");
        setMicPermission("granted");
      } catch (err: any) {
        if (!isMounted) return;
        console.warn("Could not start device preview:", err);
        setPreviewError(err.message || "Failed to access camera or microphone.");
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCamPermission("denied");
          setMicPermission("denied");
        }
      }
    }

    startPreview();

    return () => {
      isMounted = false;
      cleanupPreview();
    };
  }, [isOpen, selectedCam, selectedMic]);

  // Request media permissions
  const handleRequestPermissions = async () => {
    try {
      setPreviewError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setCamPermission("granted");
      setMicPermission("granted");
      await refreshDevices();
    } catch (err: any) {
      setPreviewError("Permission request denied. Please check your browser settings.");
      setCamPermission("denied");
      setMicPermission("denied");
    }
  };

  // Test speaker output with a pleasant synthesized chime
  const handleTestSpeaker = async () => {
    if (isPlayingTestSound) return;
    setIsPlayingTestSound(true);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.65);

      setTimeout(() => {
        setIsPlayingTestSound(false);
        try {
          audioCtx.close();
        } catch {}
      }, 700);
    } catch (e) {
      setIsPlayingTestSound(false);
    }
  };

  // Handle saving and applying
  const handleApply = async () => {
    cleanupPreview();
    if (selectedCam && selectedCam !== activeCameraId) {
      await onSelectCamera(selectedCam);
    }
    if (selectedMic && selectedMic !== activeMicId) {
      await onSelectMic(selectedMic);
    }
    if (selectedSpeaker && selectedSpeaker !== activeSpeakerId) {
      await onSelectSpeaker(selectedSpeaker);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" />
              Audio & Video Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-0.5">
              Select cameras, microphones, and output speakers for your live session.
            </DialogDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={refreshDevices}
            className="h-8 px-2.5 text-xs text-slate-400 hover:text-white"
            title="Refresh Devices"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Permission warning banner if blocked */}
          {(camPermission === "denied" || micPermission === "denied" || previewError) && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl flex items-start gap-3 text-red-200">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-red-300">Device Permissions Required</p>
                <p className="text-red-300/80 leading-relaxed">
                  Your browser has restricted access to your camera or microphone. Click the lock
                  or camera icon next to the address bar, select <strong>Allow</strong>, and click
                  below.
                </p>
                <Button
                  size="sm"
                  onClick={handleRequestPermissions}
                  className="mt-2 bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-3"
                >
                  Request Permissions
                </Button>
              </div>
            </div>
          )}

          {/* 1. Camera Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-teal-400" /> Camera
              </span>
              {camPermission === "granted" && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              )}
            </label>

            <select
              value={selectedCam}
              onChange={(e) => setSelectedCam(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              {videoDevices.length === 0 ? (
                <option value="">No cameras detected</option>
              ) : (
                videoDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))
              )}
            </select>

            {/* Video preview canvas */}
            <div className="relative aspect-video w-full max-w-sm mx-auto bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] text-slate-300 backdrop-blur-xs font-mono">
                Live Preview
              </div>
            </div>
          </div>

          {/* 2. Microphone Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-teal-400" /> Microphone
              </span>
              {micPermission === "granted" && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              )}
            </label>

            <select
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              {audioInputDevices.length === 0 ? (
                <option value="">No microphones detected</option>
              ) : (
                audioInputDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Microphone ${idx + 1}`}
                  </option>
                ))
              )}
            </select>

            {/* Live Audio Level Meter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Input Level (speak to test)</span>
                <span className="font-mono text-teal-400">{audioLevel}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex items-center p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    audioLevel > 70
                      ? "bg-amber-400"
                      : audioLevel > 10
                        ? "bg-emerald-400"
                        : "bg-slate-700"
                  }`}
                  style={{ width: `${Math.max(4, audioLevel)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3. Speaker / Audio Output Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-teal-400" /> Speaker / Audio Output
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestSpeaker}
                disabled={isPlayingTestSound}
                className="h-7 px-2.5 text-[11px] border-slate-700 bg-slate-800 hover:bg-slate-700 text-teal-300 gap-1"
              >
                <Play className="w-3 h-3 fill-current" />
                {isPlayingTestSound ? "Playing..." : "Test Audio"}
              </Button>
            </label>

            <select
              value={selectedSpeaker}
              onChange={(e) => setSelectedSpeaker(e.target.value)}
              disabled={audioOutputDevices.length === 0}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 disabled:opacity-60"
            >
              {audioOutputDevices.length === 0 ? (
                <option value="">Default System Speaker</option>
              ) : (
                audioOutputDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Speaker ${idx + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-4 font-semibold gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Save & Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
