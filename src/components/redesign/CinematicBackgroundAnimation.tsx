import React, { useRef, useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Direct DOM property configuration ensures 100% browser autoplay policy compliance
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
            setIsPlaying(true);
          })
          .catch((error) => {
            console.warn("[CinematicBackground] Autoplay blocked, listening for user gesture:", error);
            const unlock = () => {
              video.play().then(() => setIsPlaying(true)).catch(() => {});
              window.removeEventListener("pointerdown", unlock);
              window.removeEventListener("touchstart", unlock);
              window.removeEventListener("keydown", unlock);
              window.removeEventListener("scroll", unlock);
            };
            window.addEventListener("pointerdown", unlock, { once: true });
            window.addEventListener("touchstart", unlock, { once: true });
            window.addEventListener("keydown", unlock, { once: true });
            window.addEventListener("scroll", unlock, { once: true });
          });
      }
    };

    // Attempt playback immediately and on readiness events
    attemptPlay();
    video.addEventListener("loadeddata", attemptPlay, { once: true });
    video.addEventListener("canplay", attemptPlay, { once: true });
    video.addEventListener("playing", () => setIsPlaying(true));

    return () => {
      video.removeEventListener("loadeddata", attemptPlay);
      video.removeEventListener("canplay", attemptPlay);
    };
  }, [videoSrc, shouldReduceMotion]);

  const isDarkMode = theme === "dark" || variant === "studio" || variant === "hero-dark";

  // Target opacity calculation
  const targetOpacity =
    opacity !== undefined
      ? opacity
      : isDarkMode
      ? variant === "studio"
        ? 0.42
        : 0.88
      : 0.65;

  return (
    <div
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0 ${
        isDarkMode ? "bg-[#030712]" : "bg-[#F8FAFC]"
      } ${className}`}
      aria-hidden="true"
    >
      {/* HTML5 Background Video */}
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
            console.info("[CinematicBackground] Local video fallback to CloudFront URL");
            setVideoSrc(REMOTE_VIDEO_SRC);
          }
        }}
        className={`w-full h-full object-cover object-center scale-105 transition-opacity duration-700 ${
          isDarkMode
            ? variant === "studio"
              ? "mix-blend-screen"
              : ""
            : "filter invert brightness-105 contrast-125 mix-blend-multiply"
        } ${isPlaying ? "opacity-100" : "opacity-80"}`}
        style={{
          opacity: targetOpacity,
        }}
      />

      {/* Film Grain Texture (z-index overlay) */}
      {showGrain && (
        <div
          className="absolute inset-0 opacity-[0.038] pointer-events-none z-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* Subtle atmospheric vignette / bottom transition without washing out video */}
      {isDarkMode ? (
        <>
          {/* Subtle top header gradient for navbar readability */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          {/* Gentle bottom blend into following section */}
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#030712] via-[#030712]/60 to-transparent pointer-events-none" />
          {/* Ambient radial accent glows */}
          <div className="absolute -top-32 right-1/4 w-96 h-96 bg-[#6D5DFB]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 left-10 w-96 h-96 bg-[#14B8A6]/10 rounded-full blur-3xl pointer-events-none" />
        </>
      ) : (
        <>
          {/* Light mode gentle edge blends */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#F8FAFC]/40 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/50 to-transparent pointer-events-none" />
        </>
      )}
    </div>
  );
};
export default CinematicBackgroundAnimation;
