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
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none ${className}`}
      style={{
        background: "linear-gradient(135deg, #07142F 0%, #0B1D41 45%, #102A5C 100%)",
      }}
      aria-hidden="true"
    >
      {/* Primary Ambient Blue Light: Top-Center Royal Blue Ambient Diffusion */}
      <div
        className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1100px] sm:w-[1500px] h-[600px] sm:h-[800px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 30%, rgba(65, 105, 225, 0.16), rgba(39, 71, 184, 0.08) 50%, transparent 80%)",
          filter: "blur(70px)",
        }}
      />

      {/* Secondary Ambient Accent: Soft Blue Horizon on Bottom-Right */}
      <div
        className="absolute -bottom-[20%] right-[-10%] w-[700px] sm:w-[950px] h-[550px] sm:h-[750px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 50%, rgba(91, 124, 255, 0.09), transparent 75%)",
          filter: "blur(80px)",
        }}
      />

      {/* Tertiary Soft Fill: Deep Royal Blue Light on middle-left */}
      <div
        className="absolute top-[35%] -left-[15%] w-[550px] sm:w-[750px] h-[450px] sm:h-[650px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(142, 167, 255, 0.06), transparent 75%)",
          filter: "blur(75px)",
        }}
      />

      {/* Subtle Vignette Framing */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 40%, transparent 45%, rgba(7, 20, 47, 0.5) 100%)",
        }}
      />

      {/* Micro-grain film texture overlay for tactile luxury */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {children}
    </div>
  );
};

export default InternalBackground;
