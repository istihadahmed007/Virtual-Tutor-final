import React, { useRef, useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AgentWaveCanvas } from "./AgentWaveCanvas";

interface CinematicBackgroundProps {
  variant?: "hero" | "studio" | "fullscreen" | "hero-dark";
  theme?: "dark" | "light";
  className?: string;
  opacity?: number;
  showGrain?: boolean;
}

const LOCAL_VIDEO_SRC = "/background-video.mp4";
const REMOTE_VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4";

export const CinematicBackgroundAnimation: React.FC<CinematicBackgroundProps> = ({
  variant = "hero",
  theme = "dark",
  className = "",
  opacity,
  showGrain = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoSrc, setVideoSrc] = useState(LOCAL_VIDEO_SRC);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.autoplay = true;

    if (shouldReduceMotion) {
      video.pause();
      return;
    }

    const attemptPlay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsVideoPlaying(true);
          })
          .catch(() => {
            // If browser blocks video autoplay or codec is unsupported, AgentWaveCanvas handles 100% of rendering seamlessly
          });
      }
    };

    attemptPlay();
    video.addEventListener("playing", () => setIsVideoPlaying(true));

    return () => {
      video.removeEventListener("playing", () => setIsVideoPlaying(true));
    };
  }, [videoSrc, shouldReduceMotion]);

  const isDarkMode = theme === "dark" || variant === "studio" || variant === "hero-dark";

  return (
    <div
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0 ${
        isDarkMode ? "bg-black" : "bg-[#F8FAFC]"
      } ${className}`}
      aria-hidden="true"
    >
      {/* 1. Core 60fps Procedural 3D Agent Wave Canvas (Always active, interactive, 100% reliable) */}
      <AgentWaveCanvas
        className="absolute inset-0 w-full h-full"
        speed={1}
        interactive={true}
      />

      {/* 2. Optional Video Layer (Overlays if browser hardware codec is supported) */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onError={() => {
          if (videoSrc !== REMOTE_VIDEO_SRC) {
            setVideoSrc(REMOTE_VIDEO_SRC);
          }
        }}
        className={`w-full h-full object-cover object-center scale-100 transition-opacity duration-1000 ${
          isVideoPlaying ? "opacity-40 mix-blend-screen" : "opacity-0"
        }`}
      />

      {/* 3. Subtle edge fade only at extreme top/bottom to blend seamlessly with surrounding elements */}
      {isDarkMode ? (
        <>
          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#F8FAFC]/40 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/50 to-transparent pointer-events-none" />
        </>
      )}
    </div>
  );
};
export default CinematicBackgroundAnimation;
