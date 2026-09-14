import React, { useRef, useEffect } from "react";
import { useReducedMotion } from "framer-motion";

interface AgentWaveCanvasProps {
  className?: string;
  speed?: number;
  interactive?: boolean;
}

/**
 * High-performance 60fps procedural 3D Agent Wave Canvas Animation.
 * Recreates the exact MotionSites "agent-wave" / Vesper.ai aesthetic:
 * - 3D hyperbolic undulating silk ribbons with dual-surface volumetric fill
 * - Intensely luminous silver-white crest line cutting through the focal plane
 * - Wave surface stippled particles & ambient floating starry dust
 * - Interactive pointer deflection with smooth spring physics
 * - 100% cross-browser compatible with zero video codec or autoplay restrictions
 */
export const AgentWaveCanvas: React.FC<AgentWaveCanvasProps> = ({
  className = "",
  speed = 1,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect() || {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // 1. Ambient floating cosmic dust particles
    const dustCount = 160;
    const dustParticles = Array.from({ length: dustCount }, () => ({
      x: Math.random() * (width || window.innerWidth),
      y: Math.random() * (height || window.innerHeight),
      z: 0.25 + Math.random() * 0.75,
      radius: 0.7 + Math.random() * 1.8,
      alpha: 0.15 + Math.random() * 0.65,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -0.06 - Math.random() * 0.18,
      phase: Math.random() * Math.PI * 2,
    }));

    // 2. Wave surface particles riding on the undulating ribbon
    const waveParticleCount = 260;
    const waveParticles = Array.from({ length: waveParticleCount }, () => ({
      u: Math.random(),
      layer: (Math.random() - 0.5) * 260,
      speed: 0.0006 + Math.random() * 0.0016,
      radius: 0.7 + Math.random() * 2.0,
      alpha: 0.25 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    }));

    let time = 0;
    let mouseX = (width || window.innerWidth) * 0.5;
    let mouseY = (height || window.innerHeight) * 0.5;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handlePointerMove = (e: PointerEvent) => {
      if (!interactive) return;
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    if (interactive) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
    }

    const getWaveY = (normX: number, t: number, layerOffset: number, mouseInfluence: number) => {
      // Hyperbolic infinity wave envelope (0 at edges, 1 at center)
      const env = Math.sin(Math.PI * Math.max(0, Math.min(1, (normX + 1) * 0.5)));

      const w1 = Math.sin(normX * 2.4 + t * 0.85) * 145;
      const w2 = Math.cos(normX * 3.8 - t * 0.65) * 58;
      const w3 = Math.sin(normX * 1.3 + t * 0.35) * 85;

      // 3D hyperbolic twist
      const twist = Math.sin(normX * Math.PI * 1.05 + t * 0.45) * layerOffset * 0.92;
      const mouseBend = mouseInfluence * Math.exp(-normX * normX * 2.2);

      return (w1 + w2 + w3) * env * 0.92 + twist + layerOffset * 0.28 + mouseBend;
    };

    const renderFrame = () => {
      time += 0.012 * speed;
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      const mouseNormY = (mouseY / (height || 1)) * 2 - 1;
      const mouseInfluence = mouseNormY * 50;
      const centerY = height * 0.45;

      // Pure deep pitch black background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // 1. Draw floating ambient star dust
      for (let i = 0; i < dustParticles.length; i++) {
        const p = dustParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        const tw = 0.5 + 0.5 * Math.sin(time * 2.4 + p.phase);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.z, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * (0.35 + 0.65 * tw)})`;
        ctx.fill();
      }

      // 2. Draw Volumetric Silk Ribbons (Sheet Fill)
      const ribbonCount = 64;
      const steps = 76;

      for (let i = 0; i < ribbonCount - 1; i += 2) {
        const p1 = i / ribbonCount;
        const p2 = (i + 1) / ribbonCount;
        const layer1 = (p1 - 0.5) * 260;
        const layer2 = (p2 - 0.5) * 260;

        ctx.beginPath();
        // Forward line
        for (let j = 0; j <= steps; j++) {
          const u = j / steps;
          const x = u * width;
          const normX = u * 2 - 1;
          const y = centerY + getWaveY(normX, time, layer1, mouseInfluence);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        // Backward line
        for (let j = steps; j >= 0; j--) {
          const u = j / steps;
          const x = u * width;
          const normX = u * 2 - 1;
          const y = centerY + getWaveY(normX, time, layer2, mouseInfluence);
          ctx.lineTo(x, y);
        }
        ctx.closePath();

        const distFromCenter = Math.abs(p1 - 0.5) * 2;
        const fillAlpha = Math.max(0.018, (1 - distFromCenter) * 0.085);
        ctx.fillStyle = `rgba(230, 240, 255, ${fillAlpha})`;
        ctx.fill();
      }

      // 3. Draw Fine Luminescent Contour Lines with intense Crest Glow
      for (let i = 0; i < ribbonCount; i++) {
        const p = i / ribbonCount;
        const layer = (p - 0.5) * 260;
        const distFromCenter = Math.abs(p - 0.5) * 2;
        const isCrest = Math.abs(p - 0.5) < 0.045;

        ctx.beginPath();
        for (let j = 0; j <= steps; j++) {
          const u = j / steps;
          const x = u * width;
          const normX = u * 2 - 1;
          const y = centerY + getWaveY(normX, time, layer, mouseInfluence);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        if (isCrest) {
          ctx.strokeStyle = "rgba(255, 255, 255, 1.0)";
          ctx.lineWidth = 3.2;
          ctx.shadowBlur = 35;
          ctx.shadowColor = "rgba(255, 255, 255, 0.98)";
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          const alpha = Math.max(0.035, (1 - distFromCenter * 0.8) * 0.28);
          ctx.strokeStyle = `rgba(235, 242, 255, ${alpha})`;
          ctx.lineWidth = 1.1;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
      }

      // 4. Draw Wave Surface Stippled Particles
      for (let i = 0; i < waveParticles.length; i++) {
        const wp = waveParticles[i];
        wp.u += wp.speed;
        if (wp.u > 1) wp.u = 0;

        const x = wp.u * width;
        const normX = wp.u * 2 - 1;
        const baseY = centerY + getWaveY(normX, time, wp.layer, mouseInfluence);
        const y = baseY + Math.sin(time * 3 + wp.phase) * 8;

        const edgeFade = Math.sin(wp.u * Math.PI);
        const tw = 0.5 + 0.5 * Math.sin(time * 3 + wp.phase);
        const alpha = wp.alpha * edgeFade * (0.6 + 0.4 * tw);

        ctx.beginPath();
        ctx.arc(x, y, wp.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(255, 255, 255, 0.75)";
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (!shouldReduceMotion) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    // Initial render
    renderFrame();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (interactive) {
        window.removeEventListener("pointermove", handlePointerMove);
      }
      cancelAnimationFrame(animId);
    };
  }, [speed, interactive, shouldReduceMotion]);

  return (
    <div
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none bg-black ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Subtle film grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.042] pointer-events-none z-10 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default AgentWaveCanvas;
