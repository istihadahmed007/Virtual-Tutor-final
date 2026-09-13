import React, { useRef, useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface CinematicBackgroundProps {
  variant?: "hero" | "studio" | "fullscreen";
  className?: string;
  opacity?: number;
  showGrain?: boolean;
}

const LOCAL_VIDEO_SRC = "/background-video.mp4";
const REMOTE_VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4";

export const CinematicBackgroundAnimation: React.FC<CinematicBackgroundProps> = ({
  variant = "hero",
  className = "",
  opacity,
  showGrain = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Browser autoplay policy requires DOM-level muted = true
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");

    if (shouldReduceMotion) {
      video.pause();
      return;
    }

    const startPlay = () => {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          // Fallback: retry on first user interaction
          console.warn("[CinematicBackground] Autoplay blocked, waiting for interaction:", err);
          const unlock = () => {
            if (videoRef.current) {
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
            window.removeEventListener("click", unlock);
            window.removeEventListener("touchstart", unlock);
            window.removeEventListener("scroll", unlock);
          };
          window.addEventListener("click", unlock, { once: true });
          window.addEventListener("touchstart", unlock, { once: true });
          window.addEventListener("scroll", unlock, { once: true });
        });
    };

    if (video.readyState >= 3) {
      startPlay();
    } else {
      video.addEventListener("canplay", startPlay, { once: true });
    }
  }, [shouldReduceMotion]);

  // Variant-specific styles
  const defaultOpacity = variant === "studio" ? 0.32 : variant === "fullscreen" ? 1 : 0.22;
  const targetOpacity = opacity !== undefined ? opacity : defaultOpacity;

  return (
    <div
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* HTML5 Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className={`w-full h-full object-cover object-center scale-105 transition-opacity duration-1000 ${
          variant === "studio"
            ? "mix-blend-screen"
            : variant === "fullscreen"
            ? ""
            : "mix-blend-luminosity"
        } ${isPlaying ? "opacity-100" : "opacity-75"}`}
        style={{
          opacity: targetOpacity,
        }}
      >
        <source src={LOCAL_VIDEO_SRC} type="video/mp4" />
        <source src={REMOTE_VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Film Grain Texture (z-index overlay) */}
      {showGrain && (
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* Protective Gradient Scrim according to variant */}
      {variant === "hero" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAFC]/75 via-[#F8FAFC]/85 to-[#F8FAFC]" />
          <div className="absolute inset-0 bg-radial from-transparent via-[#F8FAFC]/50 to-[#F8FAFC]" />
        </>
      )}

      {variant === "studio" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19] via-[#0B0F19]/80 to-[#0B0F19]/90" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19] via-transparent to-[#0B0F19]" />
        </>
      )}
    </div>
  );
};
export default CinematicBackgroundAnimation;
