import React from "react";
import { motion } from "framer-motion";

/**
 * Tasteful, lightweight 3D educational geometric and mathematical objects
 * with glassmorphic depth, soft lighting, and smooth floating physics.
 */
export const Floating3DObjects: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* 1. Glassmorphic 3D Open Book (Top Right) */}
      <motion.div
        animate={{
          y: [-8, 12, -8],
          rotate: [6, 12, 6],
          rotateY: [15, 25, 15],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ perspective: 1000 }}
        className="absolute top-[12%] right-[8%] hidden lg:block"
      >
        <div className="relative w-28 h-20 rounded-2xl bg-gradient-to-br from-white/90 via-white/60 to-indigo-100/40 p-3 shadow-[0_20px_40px_rgba(49,46,129,0.12)] border border-white/80 backdrop-blur-md">
          {/* Spine & Page Crease */}
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-indigo-200/60 -translate-x-1/2 shadow-xs" />
          <div className="flex justify-between h-full px-2 pt-1 text-[8px] font-mono text-indigo-950/40">
            <div className="space-y-1">
              <div className="w-8 h-1 bg-indigo-500/30 rounded" />
              <div className="w-6 h-1 bg-indigo-400/20 rounded" />
              <div className="w-7 h-1 bg-indigo-400/20 rounded" />
            </div>
            <div className="space-y-1">
              <div className="w-8 h-1 bg-violet-500/30 rounded" />
              <div className="w-7 h-1 bg-violet-400/20 rounded" />
              <div className="w-5 h-1 bg-violet-400/20 rounded" />
            </div>
          </div>
          {/* Subtle 3D Bookmark Ribbon */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-7 bg-gradient-to-b from-[#6D5DFB] to-[#312E81] rounded-b shadow-sm" />
        </div>
      </motion.div>

      {/* 2. Glass Graduation Cap / Academic Prism (Left Middle) */}
      <motion.div
        animate={{
          y: [10, -10, 10],
          rotate: [-8, -2, -8],
          rotateX: [10, 20, 10],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ perspective: 1000 }}
        className="absolute top-[35%] left-[5%] hidden lg:block"
      >
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#312E81]/15 via-[#6D5DFB]/15 to-[#14B8A6]/20 p-4 shadow-[0_24px_48px_rgba(109,93,251,0.14)] border border-white/60 backdrop-blur-xl flex items-center justify-center">
          {/* Diamond Top Cap Representation */}
          <div className="w-12 h-12 bg-gradient-to-br from-[#312E81] to-[#6D5DFB] rotate-45 rounded-lg shadow-md flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#14B8A6] ring-2 ring-white/60" />
          </div>
          {/* Tassel */}
          <div className="absolute top-1/2 right-4 w-1.5 h-6 bg-[#14B8A6] rounded-full shadow-xs" />
        </div>
      </motion.div>

      {/* 3. Mathematical Integral & Sigma Curves (Floating in Background) */}
      <motion.div
        animate={{
          y: [-12, 8, -12],
          rotate: [-4, 6, -4],
        }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-[20%] right-[12%] hidden sm:block"
      >
        <div className="px-4 py-2 rounded-2xl bg-white/70 border border-slate-200/80 shadow-[0_16px_36px_rgba(49,46,129,0.08)] backdrop-blur-md flex items-center gap-2 font-mono text-xs font-bold text-[#312E81]">
          <span className="text-[#6D5DFB] text-base">∫</span>
          <span>f(x) dx = F(x) + C</span>
          <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
        </div>
      </motion.div>

      {/* 4. Ambient Indigo & Violet Radial Glow Orbs */}
      <div className="absolute -top-32 right-1/4 w-96 h-96 bg-gradient-to-br from-[#6D5DFB]/15 to-[#312E81]/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-80 h-80 bg-gradient-to-tr from-[#14B8A6]/15 to-[#6D5DFB]/10 rounded-full blur-3xl -z-10 pointer-events-none" />
    </div>
  );
};
