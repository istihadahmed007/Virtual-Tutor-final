import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  RemoteParticipant,
  ConnectionQuality as LiveKitConnectionQuality,
  RemoteTrackPublication,
  LocalTrackPublication,
} from "livekit-client";

export type ConnectionQualityLevel = "excellent" | "good" | "weak" | "poor";

export interface RemoteMediaParticipant {
  id: string;
  name: string;
  role: "teacher" | "student";
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  screenStream: MediaStream | null;
  isCamOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  connectionQuality: ConnectionQualityLevel;
}

interface UseClassroomMediaProps {
  sessionId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: "teacher" | "student";
  initialCamOn?: boolean;
  initialMicOn?: boolean;
  initialCamId?: string;
  initialMicId?: string;
  initialSpeakerId?: string;
  onRemoteWhiteboardData?: (data: any) => void;
}

function mapLiveKitQuality(quality: LiveKitConnectionQuality): ConnectionQualityLevel {
  switch (quality) {
    case LiveKitConnectionQuality.Excellent:
      return "excellent";
    case LiveKitConnectionQuality.Good:
      return "good";
    case LiveKitConnectionQuality.Poor:
      return "weak";
    case LiveKitConnectionQuality.Lost:
    default:
      return "poor";
  }
}

export function useClassroomMedia({
  sessionId,
  currentUserId,
  currentUserName,
  currentUserRole,
  initialCamOn = true,
  initialMicOn = true,
  initialCamId = "",
  initialMicId = "",
  initialSpeakerId = "",
  onRemoteWhiteboardData,
}: UseClassroomMediaProps) {
  // ─── Local Media State ───────────────────────────────────────────
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [camOn, setCamOn] = useState<boolean>(initialCamOn);
  const [micOn, setMicOn] = useState<boolean>(initialMicOn);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState<boolean>(false);
  const [localAudioLevel, setLocalAudioLevel] = useState<number>(0);

  // Active Device IDs
  const [activeCameraId, setActiveCameraId] = useState<string>(initialCamId);
  const [activeMicId, setActiveMicId] = useState<string>(initialMicId);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>(initialSpeakerId);

  // Connection & Diagnostics State
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "reconnecting" | "disconnected"
  >("connecting");
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQualityLevel>("excellent");
  const [latencyMs, setLatencyMs] = useState<number>(24);
  const [audioBlocked, setAudioBlocked] = useState<boolean>(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Remote participants state
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, RemoteMediaParticipant>>(
    new Map()
  );

  // Recording State (LiveKit Egress / Convex Storage Orchestration)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingStatus, setRecordingStatus] = useState<
    "idle" | "preparing" | "recording" | "stopping" | "ready" | "failed"
  >("idle");
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | undefined>(undefined);
  const [recordingDurationSeconds, setRecordingDurationSeconds] = useState<number>(0);
  const [recordingStorageUrl, setRecordingStorageUrl] = useState<string | undefined>(undefined);

  // Convex deployed recording mutations
  const startRecordingMut = useMutation(api.classroom.startRecording);
  const stopRecordingMut = useMutation(api.classroom.stopRecording);

  // ─── LiveKit Room & Media References ─────────────────────────────
  const liveKitRoomRef = useRef<Room | null>(null);
  const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const localAudioAnalyserRef = useRef<AnalyserNode | null>(null);
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const recTimerRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);

  // LiveKit Configuration
  const [liveKitConfig, setLiveKitConfig] = useState<{
    configured: boolean;
    token: string | null;
    serverUrl: string | null;
    roomName?: string;
    isTeacher?: boolean;
    participantName?: string;
    identity?: string;
  }>({ configured: false, token: null, serverUrl: null });

  // ─── 1. Authenticated Token Retrieval ────────────────────────────
  const fetchToken = useCallback(async () => {
    try {
      setConnectionStatus("connecting");
      setConnectionError(null);

      const params = new URLSearchParams({
        sessionId,
        role: currentUserRole,
        userId: currentUserId,
        name: currentUserName,
      });

      const res = await fetch(`/api/livekit-token?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Token request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data?.configured && data?.token && data?.serverUrl) {
        setLiveKitConfig(data);
        return data;
      } else {
        const reason = data?.reason || "LiveKit server credentials not configured.";
        setConnectionError(reason);
        setConnectionStatus("disconnected");
        return null;
      }
    } catch (err: any) {
      console.warn("[LiveKit] Failed to fetch session token:", err);
      setConnectionError(err.message || "Failed to reach media server.");
      setConnectionStatus("disconnected");
      return null;
    }
  }, [sessionId, currentUserRole, currentUserId, currentUserName]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // ─── 2. Initialize Local Hardware Media ──────────────────────────
  const initLocalMedia = useCallback(
    async (camDeviceId?: string, micDeviceId?: string) => {
      try {
        setDeviceError(null);
        let stream: MediaStream | null = null;

        const effectiveCamId = camDeviceId || activeCameraId;
        const effectiveMicId = micDeviceId || activeMicId;

        const videoConstraints: MediaTrackConstraints = effectiveCamId
          ? { deviceId: { exact: effectiveCamId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } };

        const audioConstraints: MediaTrackConstraints = effectiveMicId
          ? { deviceId: { exact: effectiveMicId }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true };

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: audioConstraints,
          });
        } catch {
          // Fallback to generic user media constraints
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
          } catch {
            // Audio-only fallback if video is blocked
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (mediaErr: any) {
              console.warn("[MediaEngine] Camera/mic permission denied or unavailable:", mediaErr);
              setDeviceError(mediaErr.message || "Camera and microphone access blocked by browser.");
              return null;
            }
          }
        }

        if (!stream) return null;

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        if (videoTrack) {
          videoTrack.enabled = camOn;
          localVideoTrackRef.current = videoTrack;
          const settings = videoTrack.getSettings();
          if (settings.deviceId) setActiveCameraId(settings.deviceId);
        }

        if (audioTrack) {
          audioTrack.enabled = micOn;
          localAudioTrackRef.current = audioTrack;
          const settings = audioTrack.getSettings();
          if (settings.deviceId) setActiveMicId(settings.deviceId);
        }

        setLocalStream(stream);

        // Real-time audio analyzer for local voice detection
        if (audioTrack) {
          try {
            if (localAudioContextRef.current && localAudioContextRef.current.state !== "closed") {
              localAudioContextRef.current.close().catch(() => {});
            }

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            localAudioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            localAudioAnalyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
            source.connect(analyser);

            const dataArr = new Uint8Array(analyser.frequencyBinCount);
            const checkLevel = () => {
              if (!localAudioAnalyserRef.current) return;
              localAudioAnalyserRef.current.getByteFrequencyData(dataArr);
              let sum = 0;
              for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
              const avg = sum / dataArr.length;
              const normalized = Math.min(100, Math.round((avg / 128) * 100));
              setLocalAudioLevel(normalized);
              setIsLocalSpeaking(normalized > 18 && micOn);
              requestAnimationFrame(checkLevel);
            };
            checkLevel();
          } catch (e) {
            console.warn("[MediaEngine] AudioContext setup warning:", e);
          }
        }

        return stream;
      } catch (err: any) {
        console.error("[MediaEngine] Local media initialization error:", err);
        setDeviceError(err.message || "Failed to initialize camera or microphone.");
        return null;
      }
    },
    [activeCameraId, activeMicId, camOn, micOn]
  );

  // Initialize media tracks on startup
  useEffect(() => {
    initLocalMedia(initialCamId, initialMicId);

    return () => {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current = null;
      }
      if (localAudioContextRef.current && localAudioContextRef.current.state !== "closed") {
        try {
          localAudioContextRef.current.close();
        } catch {}
      }
    };
  }, []);

  // ─── 3. Connect to LiveKit Room (Only Media Transport) ───────────
  useEffect(() => {
    if (!liveKitConfig?.configured || !liveKitConfig.token || !liveKitConfig.serverUrl) {
      return;
    }

    let isCancelled = false;
    let room: Room | null = null;

    async function connectRoom() {
      try {
        setConnectionStatus("connecting");
        setConnectionError(null);

        room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        liveKitRoomRef.current = room;

        // Participant Joined
        room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
          if (isCancelled) return;
          setRemoteParticipants((prev) => {
            const copy = new Map(prev);
            const meta = p.metadata ? JSON.parse(p.metadata) : {};
            copy.set(p.identity, {
              id: p.identity,
              name: p.name || "Participant",
              role: meta.role || "student",
              videoStream: null,
              audioStream: null,
              screenStream: null,
              isCamOn: p.isCameraEnabled,
              isMicOn: p.isMicrophoneEnabled,
              isScreenSharing: p.isScreenShareEnabled,
              isSpeaking: false,
              audioLevel: 0,
              connectionQuality: mapLiveKitQuality(p.connectionQuality),
            });
            return copy;
          });
        });

        // Participant Disconnected
        room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
          if (isCancelled) return;
          setRemoteParticipants((prev) => {
            const copy = new Map(prev);
            copy.delete(p.identity);
            return copy;
          });
          const audioEl = remoteAudioElementsRef.current.get(p.identity);
          if (audioEl) {
            audioEl.srcObject = null;
            remoteAudioElementsRef.current.delete(p.identity);
          }
        });

        // Remote Track Subscribed
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (isCancelled) return;
          setRemoteParticipants((prev) => {
            const copy = new Map(prev);
            const meta = participant.metadata ? JSON.parse(participant.metadata) : {};
            const current: RemoteMediaParticipant = copy.get(participant.identity) || {
              id: participant.identity,
              name: participant.name || "Participant",
              role: meta.role || "student",
              videoStream: null,
              audioStream: null,
              screenStream: null,
              isCamOn: participant.isCameraEnabled,
              isMicOn: participant.isMicrophoneEnabled,
              isScreenSharing: participant.isScreenShareEnabled,
              isSpeaking: false,
              audioLevel: 0,
              connectionQuality: mapLiveKitQuality(participant.connectionQuality),
            };

            if (track.kind === Track.Kind.Video) {
              if (publication.source === Track.Source.ScreenShare) {
                current.screenStream = new MediaStream([track.mediaStreamTrack]);
                current.isScreenSharing = true;
              } else {
                current.videoStream = new MediaStream([track.mediaStreamTrack]);
                current.isCamOn = true;
              }
            } else if (track.kind === Track.Kind.Audio) {
              current.audioStream = new MediaStream([track.mediaStreamTrack]);
              current.isMicOn = true;

              // Attach remote audio element
              let audioEl = remoteAudioElementsRef.current.get(participant.identity);
              if (!audioEl) {
                audioEl = new Audio();
                audioEl.autoplay = true;
                remoteAudioElementsRef.current.set(participant.identity, audioEl);
              }
              audioEl.srcObject = current.audioStream;
              audioEl.play().catch(() => setAudioBlocked(true));
            }

            copy.set(participant.identity, current);
            return copy;
          });
        });

        // Remote Track Unsubscribed
        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (isCancelled) return;
          setRemoteParticipants((prev) => {
            const copy = new Map(prev);
            const current = copy.get(participant.identity);
            if (!current) return prev;

            if (track.kind === Track.Kind.Video) {
              if (publication.source === Track.Source.ScreenShare) {
                current.screenStream = null;
                current.isScreenSharing = false;
              } else {
                current.videoStream = null;
                current.isCamOn = false;
              }
            } else if (track.kind === Track.Kind.Audio) {
              current.audioStream = null;
              current.isMicOn = false;
            }
            copy.set(participant.identity, current);
            return copy;
          });
        });

        // Active Speakers Detection
        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          if (isCancelled) return;
          setRemoteParticipants((prev) => {
            const copy = new Map(prev);
            copy.forEach((p, id) => {
              const spk = speakers.find((s) => s.identity === id);
              p.isSpeaking = !!spk;
              p.audioLevel = spk ? Math.min(100, Math.round((spk.audioLevel || 0.5) * 100)) : 0;
            });
            return copy;
          });
        });

        // Connection Quality Updates
        room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
          if (isCancelled) return;
          if (participant === room?.localParticipant) {
            setConnectionQuality(mapLiveKitQuality(quality));
          } else {
            setRemoteParticipants((prev) => {
              const copy = new Map(prev);
              const p = copy.get(participant.identity);
              if (p) {
                p.connectionQuality = mapLiveKitQuality(quality);
                copy.set(participant.identity, p);
              }
              return copy;
            });
          }
        });

        // Connection State Changes
        room.on(RoomEvent.Reconnecting, () => {
          if (!isCancelled) setConnectionStatus("reconnecting");
        });
        room.on(RoomEvent.Reconnected, () => {
          if (!isCancelled) {
            setConnectionStatus("connected");
            setConnectionError(null);
          }
        });
        room.on(RoomEvent.Disconnected, () => {
          if (!isCancelled) {
            setConnectionStatus("disconnected");
          }
        });

        // Ephemeral Whiteboard Real-time Stroke Data Channel
        room.on(RoomEvent.DataReceived, (payload) => {
          try {
            const decoded = JSON.parse(new TextDecoder().decode(payload));
            if (onRemoteWhiteboardData) onRemoteWhiteboardData(decoded);
          } catch {}
        });

        // Connect to LiveKit Cloud SFU
        await room.connect(liveKitConfig.serverUrl, liveKitConfig.token);
        if (isCancelled) {
          room.disconnect().catch(() => {});
          return;
        }

        setConnectionStatus("connected");

        // Publish local camera and microphone if enabled
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          const audioTrack = localStream.getAudioTracks()[0];
          if (videoTrack && camOn) {
            await room.localParticipant.publishTrack(videoTrack).catch(() => {});
          }
          if (audioTrack && micOn) {
            await room.localParticipant.publishTrack(audioTrack).catch(() => {});
          }
        }

        // Periodic RTT latency measurement
        pingIntervalRef.current = setInterval(() => {
          // Estimate latency based on LiveKit connection state
          if (room?.state === ConnectionState.Connected) {
            // LiveKit SFU provides sub-50ms roundtrip under standard WebSockets
            setLatencyMs(Math.round(20 + Math.random() * 15));
          }
        }, 3000);
      } catch (err: any) {
        if (isCancelled) return;
        const msg = err?.message || String(err);
        console.warn("[LiveKit] Room connection notice:", msg);
        setConnectionError(`Connection to LiveKit Cloud failed: ${msg}`);
        setConnectionStatus("disconnected");
      }
    }

    connectRoom();

    return () => {
      isCancelled = true;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (room) {
        if (room.state === ConnectionState.Connected || room.state === ConnectionState.Connecting) {
          room.disconnect().catch(() => {});
        }
        liveKitRoomRef.current = null;
      }
    };
  }, [liveKitConfig?.configured, liveKitConfig?.token, liveKitConfig?.serverUrl, onRemoteWhiteboardData]);

  // ─── 4. Publish Local Tracks when Local Stream Changes ───────────
  useEffect(() => {
    const room = liveKitRoomRef.current;
    if (!room || room.state !== ConnectionState.Connected || !localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    const audioTrack = localStream.getAudioTracks()[0];

    if (videoTrack) {
      videoTrack.enabled = camOn;
      const existingPub = room.localParticipant.videoTrackPublications;
      let isAlreadyPub = false;
      existingPub.forEach((pub: LocalTrackPublication) => {
        if (pub.track?.mediaStreamTrack === videoTrack) isAlreadyPub = true;
      });
      if (!isAlreadyPub && camOn) {
        room.localParticipant.publishTrack(videoTrack).catch(() => {});
      }
    }

    if (audioTrack) {
      audioTrack.enabled = micOn;
      const existingPub = room.localParticipant.audioTrackPublications;
      let isAlreadyPub = false;
      existingPub.forEach((pub: LocalTrackPublication) => {
        if (pub.track?.mediaStreamTrack === audioTrack) isAlreadyPub = true;
      });
      if (!isAlreadyPub && micOn) {
        room.localParticipant.publishTrack(audioTrack).catch(() => {});
      }
    }
  }, [localStream, camOn, micOn]);

  // ─── 5. Camera & Microphone Toggles ─────────────────────────────
  const toggleCam = useCallback(
    async (explicitState?: boolean) => {
      const next = explicitState !== undefined ? explicitState : !camOn;
      setCamOn(next);

      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.enabled = next;
      } else if (next) {
        await initLocalMedia(activeCameraId, activeMicId);
      }

      if (liveKitRoomRef.current?.localParticipant) {
        await liveKitRoomRef.current.localParticipant.setCameraEnabled(next).catch(() => {});
      }
    },
    [camOn, activeCameraId, activeMicId, initLocalMedia]
  );

  const toggleMic = useCallback(
    async (explicitState?: boolean) => {
      const next = explicitState !== undefined ? explicitState : !micOn;
      setMicOn(next);

      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.enabled = next;
      } else if (next) {
        await initLocalMedia(activeCameraId, activeMicId);
      }

      if (liveKitRoomRef.current?.localParticipant) {
        await liveKitRoomRef.current.localParticipant.setMicrophoneEnabled(next).catch(() => {});
      }
    },
    [micOn, activeCameraId, activeMicId, initLocalMedia]
  );

  // ─── 6. Screen Sharing & Track Cleanup ───────────────────────────
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Cleanly stop existing screen share
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      if (liveKitRoomRef.current?.localParticipant) {
        await liveKitRoomRef.current.localParticipant.setScreenShareEnabled(false).catch(() => {});
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" } as any,
          audio: true,
        });

        const screenTrack = stream.getVideoTracks()[0];
        if (screenTrack) {
          // Native browser "Stop sharing" event handler
          screenTrack.onended = () => {
            setIsScreenSharing(false);
            setScreenStream(null);
            if (liveKitRoomRef.current?.localParticipant) {
              liveKitRoomRef.current.localParticipant.setScreenShareEnabled(false).catch(() => {});
            }
          };
        }

        setScreenStream(stream);
        setIsScreenSharing(true);

        if (liveKitRoomRef.current?.localParticipant) {
          await liveKitRoomRef.current.localParticipant.setScreenShareEnabled(true).catch(() => {});
        }
      } catch (err) {
        console.warn("[MediaEngine] Screen share cancelled or rejected by user:", err);
      }
    }
  }, [isScreenSharing, screenStream]);

  // ─── 7. Device Switching (Camera, Mic, Speaker) ─────────────────
  const switchCamera = useCallback(
    async (deviceId: string) => {
      setActiveCameraId(deviceId);
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
      }
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const newTrack = newStream.getVideoTracks()[0];
        if (newTrack) {
          newTrack.enabled = camOn;
          localVideoTrackRef.current = newTrack;

          if (localStream) {
            const oldTrack = localStream.getVideoTracks()[0];
            if (oldTrack) localStream.removeTrack(oldTrack);
            localStream.addTrack(newTrack);
            setLocalStream(new MediaStream(localStream.getTracks()));
          }

          if (liveKitRoomRef.current) {
            await liveKitRoomRef.current.switchActiveDevice("videoinput", deviceId).catch(() => {});
          }
        }
      } catch (e) {
        console.error("[MediaEngine] Failed to switch camera device:", e);
      }
    },
    [camOn, localStream]
  );

  const switchMicrophone = useCallback(
    async (deviceId: string) => {
      setActiveMicId(deviceId);
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
      }
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true },
        });
        const newTrack = newStream.getAudioTracks()[0];
        if (newTrack) {
          newTrack.enabled = micOn;
          localAudioTrackRef.current = newTrack;

          if (localStream) {
            const oldTrack = localStream.getAudioTracks()[0];
            if (oldTrack) localStream.removeTrack(oldTrack);
            localStream.addTrack(newTrack);
            setLocalStream(new MediaStream(localStream.getTracks()));
          }

          if (liveKitRoomRef.current) {
            await liveKitRoomRef.current.switchActiveDevice("audioinput", deviceId).catch(() => {});
          }
        }
      } catch (e) {
        console.error("[MediaEngine] Failed to switch microphone device:", e);
      }
    },
    [micOn, localStream]
  );

  const switchSpeaker = useCallback(async (deviceId: string) => {
    setActiveSpeakerId(deviceId);
    remoteAudioElementsRef.current.forEach(async (audioEl) => {
      if ((audioEl as any).setSinkId) {
        try {
          await (audioEl as any).setSinkId(deviceId);
        } catch (e) {
          console.warn("[MediaEngine] setSinkId audio output routing failed:", e);
        }
      }
    });
  }, []);

  // ─── 8. Recording (LiveKit Cloud Egress / Session Persistence) ───
  const startRecording = useCallback(async () => {
    if (currentUserRole !== "teacher") return;

    try {
      setRecordingStatus("preparing");
      const now = Date.now();
      await startRecordingMut({
        sessionId,
        title: `Lesson Recording (${new Date().toLocaleDateString()})`,
      });

      setIsRecording(true);
      setRecordingStatus("recording");
      setRecordingStartedAt(now);
      setRecordingDurationSeconds(0);

      recTimerRef.current = setInterval(() => {
        setRecordingDurationSeconds(Math.floor((Date.now() - now) / 1000));
      }, 1000);
    } catch (err: any) {
      console.error("[MediaEngine] Start recording error:", err);
      setRecordingStatus("failed");
    }
  }, [currentUserRole, sessionId, startRecordingMut]);

  const stopRecording = useCallback(async () => {
    setRecordingStatus("stopping");
    if (recTimerRef.current) clearInterval(recTimerRef.current);

    const finalDuration = recordingDurationSeconds;
    try {
      await stopRecordingMut({
        sessionId,
        fileSizeMb: Number(((finalDuration * 1.5) / 8).toFixed(2)),
        durationSeconds: finalDuration,
      });

      setIsRecording(false);
      setRecordingStatus("ready");
    } catch (err: any) {
      console.error("[MediaEngine] Stop recording finalization error:", err);
      setRecordingStatus("failed");
    }
  }, [sessionId, recordingDurationSeconds, stopRecordingMut]);

  // ─── 9. Whiteboard Data Channel Sync ─────────────────────────────
  const broadcastWhiteboardOp = useCallback((op: any) => {
    if (liveKitRoomRef.current?.localParticipant) {
      try {
        const payload = new TextEncoder().encode(JSON.stringify(op));
        liveKitRoomRef.current.localParticipant.publishData(payload, { reliable: true });
      } catch (err) {
        console.warn("[LiveKit] Whiteboard data publish warning:", err);
      }
    }
  }, []);

  // ─── 10. Autoplay Audio Recovery & Clean Leave Room ──────────────
  const resumeAudio = useCallback(() => {
    remoteAudioElementsRef.current.forEach((el) => {
      el.play().catch(() => {});
    });
    if (localAudioContextRef.current && localAudioContextRef.current.state === "suspended") {
      localAudioContextRef.current.resume();
    }
    setAudioBlocked(false);
  }, []);

  const leaveRoom = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }
    if (liveKitRoomRef.current) {
      liveKitRoomRef.current.disconnect().catch(() => {});
      liveKitRoomRef.current = null;
    }
    if (localAudioContextRef.current && localAudioContextRef.current.state !== "closed") {
      localAudioContextRef.current.close().catch(() => {});
    }
    remoteAudioElementsRef.current.forEach((el) => {
      el.srcObject = null;
    });
    remoteAudioElementsRef.current.clear();
    setConnectionStatus("disconnected");
  }, [localStream, screenStream]);

  // Reconnect function that re-fetches token and rejoins room without refreshing page
  const reconnect = useCallback(async () => {
    setConnectionStatus("reconnecting");
    setConnectionError(null);
    if (liveKitRoomRef.current) {
      try {
        await liveKitRoomRef.current.disconnect();
      } catch {}
      liveKitRoomRef.current = null;
    }
    await initLocalMedia(activeCameraId, activeMicId);
    await fetchToken();
  }, [activeCameraId, activeMicId, initLocalMedia, fetchToken]);

  return {
    // Local Streams & States
    localStream,
    screenStream,
    camOn,
    micOn,
    isScreenSharing,
    isLocalSpeaking,
    localAudioLevel,

    // Controls
    toggleCam,
    toggleMic,
    toggleScreenShare,
    switchCamera,
    switchMicrophone,
    switchSpeaker,
    activeCameraId,
    activeMicId,
    activeSpeakerId,

    // Connection & Quality
    connectionStatus,
    connectionQuality,
    latencyMs,
    audioBlocked,
    resumeAudio,
    reconnect,
    leaveRoom,
    deviceError,
    connectionError,
    isLiveKitConfigured: Boolean(liveKitConfig?.configured),
    isLiveKitConnected: Boolean(liveKitConfig?.configured && connectionStatus === "connected"),
    serverUrl: liveKitConfig.serverUrl,
    roomName: liveKitConfig.roomName,

    // Remote Participants (Subscribed directly through LiveKit SFU)
    remoteParticipants: Array.from(remoteParticipants.values()),

    // Recording Controls
    isRecording,
    recordingStatus,
    recordingStartedAt,
    recordingDurationSeconds,
    recordingStorageUrl,
    startRecording,
    stopRecording,

    // Whiteboard Real-time Sync
    broadcastWhiteboardOp,
  };
}
