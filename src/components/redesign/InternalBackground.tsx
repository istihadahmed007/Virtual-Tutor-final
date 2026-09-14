import React from "react";

interface InternalBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * InternalBackground - Refined, static ambient background for all internal pages.
 * 
 * Design Specifications:
 * - Clean, deep luxury obsidian foundation (#07080D).
 * - Calming, static atmospheric lighting via layered CSS radial gradients.
 * - ZERO moving particles, ZERO canvas RAF loops, ZERO video codecs.
 * - Subdued, professional ambient glow supporting the glass UI without competing with content.
 * - Tactile noise grain overlay for physical texture and depth.
 */
export const InternalBackground: React.FC<InternalBackgroundProps> = ({
  className = "",
  children,
}) => {
  return (
    <div
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none bg-[#07080D] ${className}`}
      aria-hidden="true"
    >
      {/* Primary Ambient Atmosphere: Top-center Soft Violet/Indigo Glow */}
      <div
        className="absolute -top-[25%] left-1/2 -translate-x-1/2 w-[1000px] sm:w-[1400px] h-[550px] sm:h-[750px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 30%, rgba(109, 93, 251, 0.13), rgba(49, 46, 129, 0.07) 50%, transparent 80%)",
          filter: "blur(60px)",
        }}
      />

      {/* Secondary Ambient Accent: Subtle Emerald/Teal Horizon Light on bottom-right */}
      <div
        className="absolute -bottom-[20%] right-[-10%] w-[650px] sm:w-[900px] h-[500px] sm:h-[700px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 50%, rgba(20, 184, 166, 0.055), transparent 75%)",
          filter: "blur(75px)",
        }}
      />

      {/* Tertiary Soft Fill: Subtle Indigo Depth on middle-left */}
      <div
        className="absolute top-[35%] -left-[15%] w-[500px] sm:w-[700px] h-[400px] sm:h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(99, 102, 241, 0.045), transparent 75%)",
          filter: "blur(70px)",
        }}
      />

      {/* Subtle Vignette Framing */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 40%, transparent 45%, rgba(4, 5, 8, 0.6) 100%)",
        }}
      />

      {/* Micro-grain film texture overlay for tactile depth */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {children}
    </div>
  );
};

export default InternalBackground;
