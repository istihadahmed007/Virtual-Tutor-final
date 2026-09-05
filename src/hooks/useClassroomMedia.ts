import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Room, RoomEvent, Track, ConnectionState, RemoteParticipant } from "livekit-client";

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
  connectionQuality: "excellent" | "fair" | "poor";
}

interface UseClassroomMediaProps {
  sessionId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: "teacher" | "student";
  initialCamOn?: boolean;
  initialMicOn?: boolean;
  onRemoteWhiteboardData?: (data: any) => void;
}

export function useClassroomMedia({
  sessionId,
  currentUserId,
  currentUserName,
  currentUserRole,
  initialCamOn = true,
  initialMicOn = true,
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
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [activeMicId, setActiveMicId] = useState<string>("");
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>("");

  // Connection & Transport State
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "reconnecting" | "disconnected"
  >("connecting");
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "fair" | "poor">("excellent");
  const [audioBlocked, setAudioBlocked] = useState<boolean>(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Remote participants state
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, RemoteMediaParticipant>>(
    new Map()
  );

  // Recording State (Real Client-Side Recorder backed by Convex storage)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingStatus, setRecordingStatus] = useState<
    "idle" | "preparing" | "recording" | "stopping" | "processing" | "ready" | "failed"
  >("idle");
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | undefined>(undefined);
  const [recordingDurationSeconds, setRecordingDurationSeconds] = useState<number>(0);
  const [recordingStorageUrl, setRecordingStorageUrl] = useState<string | undefined>(undefined);

  // ─── Convex Integrations ─────────────────────────────────────────
  const liveKitConfig = useQuery(api.classroom.getLiveKitToken, { sessionId });
  const sendSignalingMut = useMutation(api.classroom.sendSignaling);
  const updateRecordingStateMut = useMutation(api.classroom.updateRecordingState);
  const generateUploadUrlMut = useMutation(api.classroom.generateRecordingUploadUrl);

  // Poll signaling messages when not using LiveKit SFU
  const [lastSignalingTimestamp, setLastSignalingTimestamp] = useState<number>(Date.now() - 10000);
  const signalingMessages = useQuery(
    api.classroom.listSignaling,
    liveKitConfig?.configured
      ? "skip"
      : { sessionId, sinceTimestamp: lastSignalingTimestamp }
  );

  // ─── Internal Refs ───────────────────────────────────────────────
  const liveKitRoomRef = useRef<Room | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const localAudioAnalyserRef = useRef<AnalyserNode | null>(null);
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<any>(null);

  // ─── 1. Initialize Local Media ──────────────────────────────────
  const initLocalMedia = useCallback(
    async (camDeviceId?: string, micDeviceId?: string) => {
      try {
        setDeviceError(null);
        const videoConstraints: MediaTrackConstraints = camDeviceId
          ? { deviceId: { exact: camDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } };

        const audioConstraints: MediaTrackConstraints = micDeviceId
          ? { deviceId: { exact: micDeviceId }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: audioConstraints,
        });

        // Set track enabled states according to user preference
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

        // Setup real local speaking detector
        if (audioTrack) {
          try {
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
            console.warn("AudioContext setup error:", e);
          }
        }

        return stream;
      } catch (err: any) {
        console.error("Local media error:", err);
        setDeviceError(err.message || "Failed to access camera or microphone.");
        return null;
      }
    },
    [camOn, micOn]
  );

  // Initial load
  useEffect(() => {
    initLocalMedia();

    return () => {
      if (localAudioTrackRef.current) localAudioTrackRef.current.stop();
      if (localVideoTrackRef.current) localVideoTrackRef.current.stop();
      if (localAudioContextRef.current && localAudioContextRef.current.state !== "closed") {
        try {
          localAudioContextRef.current.close();
        } catch {}
      }
    };
  }, []);

  // ─── 2. Handle Camera & Mic Toggles ─────────────────────────────
  const toggleCam = useCallback(
    async (explicitState?: boolean) => {
      const next = explicitState !== undefined ? explicitState : !camOn;
      setCamOn(next);
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.enabled = next;
      } else if (next) {
        await initLocalMedia(activeCameraId, activeMicId);
      }
      // If LiveKit room is connected
      if (liveKitRoomRef.current?.localParticipant) {
        await liveKitRoomRef.current.localParticipant.setCameraEnabled(next);
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
      // If LiveKit room is connected
      if (liveKitRoomRef.current?.localParticipant) {
        await liveKitRoomRef.current.localParticipant.setMicrophoneEnabled(next);
      }
    },
    [micOn, activeCameraId, activeMicId, initLocalMedia]
  );

  // ─── 3. Screen Sharing ──────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      if (liveKitRoomRef.current?.localParticipant) {
        await liveKitRoomRef.current.localParticipant.setScreenShareEnabled(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" } as any,
          audio: true,
        });

        const screenTrack = stream.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.onended = () => {
            setIsScreenSharing(false);
            setScreenStream(null);
            if (liveKitRoomRef.current?.localParticipant) {
              liveKitRoomRef.current.localParticipant.setScreenShareEnabled(false);
            }
          };
        }

        setScreenStream(stream);
        setIsScreenSharing(true);

        if (liveKitRoomRef.current?.localParticipant) {
          await liveKitRoomRef.current.localParticipant.setScreenShareEnabled(true);
        }

        // If direct WebRTC peer connection
        if (peerConnectionRef.current && screenTrack) {
          const senders = peerConnectionRef.current.getSenders();
          const existing = senders.find((s) => s.track?.kind === "video" && s.track !== localVideoTrackRef.current);
          if (existing) {
            existing.replaceTrack(screenTrack);
          } else {
            peerConnectionRef.current.addTrack(screenTrack, stream);
          }
        }
      } catch (err: any) {
        console.warn("Screen share cancelled or rejected:", err);
      }
    }
  }, [isScreenSharing, screenStream]);

  // ─── 4. Device Switching ────────────────────────────────────────
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

          // Replace track in localStream
          if (localStream) {
            const oldTrack = localStream.getVideoTracks()[0];
            if (oldTrack) localStream.removeTrack(oldTrack);
            localStream.addTrack(newTrack);
            setLocalStream(new MediaStream(localStream.getTracks()));
          }

          // Replace track in LiveKit Room if connected
          if (liveKitRoomRef.current) {
            await liveKitRoomRef.current.switchActiveDevice("videoinput", deviceId);
          }

          // Replace track in direct RTCPeerConnection if active
          if (peerConnectionRef.current) {
            const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(newTrack);
          }
        }
      } catch (e: any) {
        console.error("Failed to switch camera:", e);
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
            await liveKitRoomRef.current.switchActiveDevice("audioinput", deviceId);
          }

          if (peerConnectionRef.current) {
            const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === "audio");
            if (sender) sender.replaceTrack(newTrack);
          }
        }
      } catch (e: any) {
        console.error("Failed to switch microphone:", e);
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
          console.warn("setSinkId failed:", e);
        }
      }
    });
  }, []);

  // ─── 5. Connect to LiveKit SFU (When configured) ───────────────
  useEffect(() => {
    if (!liveKitConfig?.configured || !liveKitConfig.token || !liveKitConfig.serverUrl) return;

    let room: Room;

    async function connectLiveKit() {
      try {
        setConnectionStatus("connecting");
        room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        liveKitRoomRef.current = room;

        // Remote participant joined / left
        room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
          setRemoteParticipants((prev) => {
            const copy = new Map(prev);
            copy.set(p.identity, {
              id: p.identity,
              name: p.name || "Participant",
              role: (p.metadata && JSON.parse(p.metadata).role) || "student",
              videoStream: null,
              audioStream: null,
              screenStream: null,
              isCamOn: p.isCameraEnabled,
              isMicOn: p.isMicrophoneEnabled,
              isScreenSharing: p.isScreenShareEnabled,
              isSpeaking: false,
              audioLevel: 0,
              connectionQuality: "excellent",
            });
            return copy;
          });
        });

        room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
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

        // Remote track subscribed
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          setRemoteParticipants((prev) => {
            const copy = new Map(prev);
            const current = copy.get(participant.identity) || {
              id: participant.identity,
              name: participant.name || "Participant",
              role: (participant.metadata && JSON.parse(participant.metadata).role) || "student",
              videoStream: null,
              audioStream: null,
              screenStream: null,
              isCamOn: participant.isCameraEnabled,
              isMicOn: participant.isMicrophoneEnabled,
              isScreenSharing: participant.isScreenShareEnabled,
              isSpeaking: false,
              audioLevel: 0,
              connectionQuality: "excellent",
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

              // Play remote audio
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

        // Track unsubscribed
        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
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

        // Active speakers changed
        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
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

        // Connection state
        room.on(RoomEvent.Reconnecting, () => setConnectionStatus("reconnecting"));
        room.on(RoomEvent.Reconnected, () => setConnectionStatus("connected"));
        room.on(RoomEvent.Disconnected, () => setConnectionStatus("disconnected"));

        // Data received (Whiteboard real-time stroke streaming)
        room.on(RoomEvent.DataReceived, (payload) => {
          try {
            const decoded = JSON.parse(new TextDecoder().decode(payload));
            if (onRemoteWhiteboardData) onRemoteWhiteboardData(decoded);
          } catch {}
        });

        // Connect room
        await room.connect(liveKitConfig.serverUrl, liveKitConfig.token);
        setConnectionStatus("connected");

        // Publish local camera and mic
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          const audioTrack = localStream.getAudioTracks()[0];
          if (videoTrack && camOn) await room.localParticipant.publishTrack(videoTrack);
          if (audioTrack && micOn) await room.localParticipant.publishTrack(audioTrack);
        }
      } catch (err: any) {
        console.error("LiveKit connection error:", err);
        setConnectionStatus("disconnected");
      }
    }

    connectLiveKit();

    return () => {
      if (room) room.disconnect();
    };
  }, [liveKitConfig?.configured, liveKitConfig?.token, liveKitConfig?.serverUrl, localStream]);

  // ─── 6. Direct WebRTC Peer Connection (Seamless Fallback) ───────
  // When LiveKit cloud is not configured, direct RTCPeerConnection over Convex signaling
  useEffect(() => {
    if (liveKitConfig?.configured) return;
    if (!localStream) return;

    let pc = peerConnectionRef.current;
    if (!pc) {
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerConnectionRef.current = pc;

      // Add local tracks
      localStream.getTracks().forEach((track) => {
        pc!.addTrack(track, localStream);
      });

      // Handle remote tracks
      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        const track = event.track;

        setRemoteParticipants((prev) => {
          const copy = new Map(prev);
          const remoteId = "peer_user";
          const current = copy.get(remoteId) || {
            id: remoteId,
            name: currentUserRole === "teacher" ? "Student" : "Instructor",
            role: currentUserRole === "teacher" ? "student" : "teacher",
            videoStream: null,
            audioStream: null,
            screenStream: null,
            isCamOn: false,
            isMicOn: false,
            isScreenSharing: false,
            isSpeaking: false,
            audioLevel: 0,
            connectionQuality: "excellent",
          };

          if (track.kind === "video") {
            current.videoStream = stream;
            current.isCamOn = true;
          } else if (track.kind === "audio") {
            current.audioStream = stream;
            current.isMicOn = true;

            // Play remote audio
            let audioEl = remoteAudioElementsRef.current.get(remoteId);
            if (!audioEl) {
              audioEl = new Audio();
              audioEl.autoplay = true;
              remoteAudioElementsRef.current.set(remoteId, audioEl);
            }
            audioEl.srcObject = stream;
            audioEl.play().catch(() => setAudioBlocked(true));
          }

          copy.set(remoteId, current);
          return copy;
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMut({
            sessionId,
            type: "ice-candidate",
            payload: JSON.stringify(event.candidate),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc!.connectionState;
        if (state === "connected") setConnectionStatus("connected");
        else if (state === "connecting") setConnectionStatus("connecting");
        else if (state === "disconnected" || state === "failed") setConnectionStatus("disconnected");
      };

      // Teacher initiates offer
      if (currentUserRole === "teacher") {
        pc.createOffer().then((offer) => {
          pc!.setLocalDescription(offer);
          sendSignalingMut({
            sessionId,
            type: "offer",
            payload: JSON.stringify(offer),
          });
        });
      }
    }
  }, [liveKitConfig?.configured, localStream, currentUserRole, sessionId, sendSignalingMut]);

  // Handle incoming signaling messages
  useEffect(() => {
    if (liveKitConfig?.configured || !signalingMessages) return;

    const pc = peerConnectionRef.current;
    if (!pc) return;

    signalingMessages.forEach(async (msg) => {
      try {
        if (msg.type === "offer" && currentUserRole === "student") {
          const offer = JSON.parse(msg.payload);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignalingMut({
            sessionId,
            type: "answer",
            payload: JSON.stringify(answer),
          });
        } else if (msg.type === "answer" && currentUserRole === "teacher") {
          const answer = JSON.parse(msg.payload);
          if (pc.signalingState !== "stable") {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          }
        } else if (msg.type === "ice-candidate") {
          const candidate = JSON.parse(msg.payload);
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else if (msg.type === "whiteboard-op") {
          if (onRemoteWhiteboardData) {
            onRemoteWhiteboardData(JSON.parse(msg.payload));
          }
        }
      } catch (err) {
        console.warn("Signaling process error:", err);
      }
    });

    if (signalingMessages.length > 0) {
      const maxTs = Math.max(...signalingMessages.map((m) => m.timestamp));
      setLastSignalingTimestamp(maxTs);
    }
  }, [signalingMessages, liveKitConfig?.configured, currentUserRole, sessionId, sendSignalingMut, onRemoteWhiteboardData]);

  // Broadcast whiteboard stroke (LiveKit data channel or WebRTC signaling)
  const broadcastWhiteboardOp = useCallback(
    (op: any) => {
      const serialized = JSON.stringify(op);
      if (liveKitRoomRef.current?.localParticipant) {
        liveKitRoomRef.current.localParticipant.publishData(
          new TextEncoder().encode(serialized),
          { reliable: true }
        );
      } else {
        sendSignalingMut({
          sessionId,
          type: "whiteboard-op",
          payload: serialized,
        });
      }
    },
    [sessionId, sendSignalingMut]
  );

  // ─── 7. Real MediaRecorder Recording System ─────────────────────
  const startRecording = useCallback(async () => {
    if (currentUserRole !== "teacher") return;

    try {
      setRecordingStatus("preparing");
      await updateRecordingStateMut({
        sessionId,
        status: "preparing",
      });

      // Capture real audio and video
      // If screen sharing is active, combine screen with microphone.
      // Otherwise record localStream (webcam + mic).
      let streamToRecord: MediaStream;

      if (screenStream) {
        const audioTracks = localStream ? localStream.getAudioTracks() : [];
        streamToRecord = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...audioTracks,
        ]);
      } else if (localStream) {
        streamToRecord = localStream;
      } else {
        streamToRecord = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      // Choose supported mimeType
      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const selectedMime = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "";

      const recorder = new MediaRecorder(streamToRecord, {
        mimeType: selectedMime || undefined,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      recordedChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      const now = Date.now();
      recorder.onstart = async () => {
        setIsRecording(true);
        setRecordingStatus("recording");
        setRecordingStartedAt(now);
        setRecordingDurationSeconds(0);
        await updateRecordingStateMut({
          sessionId,
          status: "recording",
        });

        // Duration ticker
        recTimerRef.current = setInterval(() => {
          setRecordingDurationSeconds(Math.floor((Date.now() - now) / 1000));
        }, 1000);
      };

      recorder.onerror = async (err: any) => {
        console.error("MediaRecorder error:", err);
        setRecordingStatus("failed");
        await updateRecordingStateMut({
          sessionId,
          status: "failed",
          errorMessage: err.message || "Media recorder failure.",
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start(2000); // 2 second chunk intervals
    } catch (err: any) {
      console.error("Could not start recording:", err);
      setRecordingStatus("failed");
      await updateRecordingStateMut({
        sessionId,
        status: "failed",
        errorMessage: err.message || "Failed to start recording.",
      });
    }
  }, [currentUserRole, sessionId, screenStream, localStream, updateRecordingStateMut]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;

    setRecordingStatus("stopping");
    if (recTimerRef.current) clearInterval(recTimerRef.current);

    const recorder = mediaRecorderRef.current;
    const finalDuration = recordingDurationSeconds;

    recorder.onstop = async () => {
      setIsRecording(false);
      setRecordingStatus("processing");
      await updateRecordingStateMut({
        sessionId,
        status: "processing",
        durationSeconds: finalDuration,
      });

      try {
        const mimeType = recorder.mimeType || "video/webm";
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const fileSizeMb = Number((blob.size / (1024 * 1024)).toFixed(2));

        // Get real Convex storage upload URL
        const uploadUrl = await generateUploadUrlMut({ sessionId });

        // Upload the actual binary video to Convex storage
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: blob,
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed with status ${uploadRes.status}`);
        }

        const { storageId } = await uploadRes.json();

        // Update recording state with storageId
        const updateRes = await updateRecordingStateMut({
          sessionId,
          status: "ready",
          storageId,
          fileSizeMb,
          durationSeconds: finalDuration,
        });

        setRecordingStatus("ready");
        if (updateRes.storageUrl) {
          setRecordingStorageUrl(updateRes.storageUrl);
        }
      } catch (err: any) {
        console.error("Recording upload error:", err);
        setRecordingStatus("failed");
        await updateRecordingStateMut({
          sessionId,
          status: "failed",
          errorMessage: err.message || "Failed to upload recording file.",
        });
      }
    };

    recorder.stop();
  }, [sessionId, recordingDurationSeconds, updateRecordingStateMut, generateUploadUrlMut]);

  // Resume audio when blocked by browser autoplay policy
  const resumeAudio = useCallback(() => {
    remoteAudioElementsRef.current.forEach((el) => {
      el.play().catch(() => {});
    });
    if (localAudioContextRef.current && localAudioContextRef.current.state === "suspended") {
      localAudioContextRef.current.resume();
    }
    setAudioBlocked(false);
  }, []);

  // Reconnect media session
  const reconnect = useCallback(async () => {
    setConnectionStatus("reconnecting");
    if (liveKitRoomRef.current) {
      try {
        await liveKitRoomRef.current.disconnect();
      } catch {}
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      } catch {}
    }
    await initLocalMedia(activeCameraId, activeMicId);
    setConnectionStatus("connected");
  }, [activeCameraId, activeMicId, initLocalMedia]);

  return {
    // Media Streams
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
    audioBlocked,
    resumeAudio,
    reconnect,
    deviceError,

    // Remote Participants
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
