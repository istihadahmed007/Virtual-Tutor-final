import React, { useEffect, useMemo } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

interface ParticleItem {
  id: number;
  initialX: number; // percentage
  initialY: number; // percentage
  size: number;
  type: "dot" | "orb" | "sparkle" | "ring";
  color: string;
  glowColor: string;
  depthX: number;
  depthY: number;
  duration: number;
  delay: number;
  driftRangeX: number;
  driftRangeY: number;
  opacityRange: [number, number, number];
  rotate: boolean;
}

interface FloatingParticlesProps {
  count?: number;
  className?: string;
  showCursorGlow?: boolean;
}

// Deterministic particle generation so layout remains stable across renders
function generateParticles(count: number): ParticleItem[] {
  const particles: ParticleItem[] = [];
  const colors = [
    { base: "rgba(255, 255, 255, 0.85)", glow: "rgba(255, 255, 255, 0.4)" },
    { base: "rgba(242, 101, 34, 0.85)", glow: "rgba(242, 101, 34, 0.45)" }, // Vesper accent orange
    { base: "rgba(251, 146, 60, 0.75)", glow: "rgba(251, 146, 60, 0.35)" }, // Warm amber
    { base: "rgba(255, 255, 255, 0.65)", glow: "rgba(255, 255, 255, 0.25)" },
  ];

  const types: ("dot" | "orb" | "sparkle" | "ring")[] = [
    "dot",
    "dot",
    "orb",
    "dot",
    "sparkle",
    "orb",
    "ring",
    "dot",
    "sparkle",
  ];

  // Pseudo-random deterministic generator based on linear congruential method
  let seed = 42;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const colorPair = colors[Math.floor(rnd() * colors.length)];
    const type = types[Math.floor(rnd() * types.length)];
    const size =
      type === "orb"
        ? 8 + rnd() * 10
        : type === "sparkle"
        ? 10 + rnd() * 8
        : type === "ring"
        ? 14 + rnd() * 10
        : 2.5 + rnd() * 3.5;

    // Mouse depth parallax multiplier (-0.06 to +0.07)
    // Divergent signs create realistic 3D depth separation when moving the mouse
    const depthMagnitude = 0.02 + rnd() * 0.055;
    const depthDirection = rnd() > 0.4 ? 1 : -1;
    const depthX = depthMagnitude * depthDirection;
    const depthY = depthMagnitude * (rnd() > 0.4 ? 1 : -1);

    const driftRangeX = 10 + rnd() * 22;
    const driftRangeY = 14 + rnd() * 26;
    const duration = 12 + rnd() * 14;
    const delay = rnd() * 7;
    const minOpacity = 0.2 + rnd() * 0.25;
    const maxOpacity = 0.65 + rnd() * 0.35;

    particles.push({
      id: i,
      initialX: rnd() * 96 + 2, // 2% to 98%
      initialY: rnd() * 94 + 3, // 3% to 97%
      size,
      type,
      color: colorPair.base,
      glowColor: colorPair.glow,
      depthX,
      depthY,
      duration,
      delay,
      driftRangeX,
      driftRangeY,
      opacityRange: [minOpacity, maxOpacity, minOpacity],
      rotate: type === "sparkle" || type === "ring",
    });
  }

  return particles;
}

// Individual Particle with decoupled Parallax (outer) and Drift (inner)
const ParticleNode: React.FC<{
  particle: ParticleItem;
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  shouldReduceMotion: boolean | null;
}> = ({ particle, springX, springY, shouldReduceMotion }) => {
  // Parallax displacement mapped via MotionValues
  const parallaxX = useTransform(springX, (val: number) =>
    shouldReduceMotion ? 0 : val * particle.depthX
  );
  const parallaxY = useTransform(springY, (val: number) =>
    shouldReduceMotion ? 0 : val * particle.depthY
  );

  return (
    <motion.div
      className="absolute pointer-events-none will-change-transform"
      style={{
        left: `${particle.initialX}%`,
        top: `${particle.initialY}%`,
        x: parallaxX,
        y: parallaxY,
      }}
    >
      {/* Inner element handles the continuous floating drift cycle */}
      <motion.div
        animate={
          shouldReduceMotion
            ? { opacity: particle.opacityRange[1] }
            : {
                x: [
                  0,
                  particle.driftRangeX * 0.7,
                  -particle.driftRangeX * 0.5,
                  particle.driftRangeX * 0.3,
                  0,
                ],
                y: [
                  0,
                  -particle.driftRangeY,
                  particle.driftRangeY * 0.4,
                  -particle.driftRangeY * 0.6,
                  0,
                ],
                scale: [1, 1.18, 0.92, 1.12, 1],
                opacity: [
                  particle.opacityRange[0],
                  particle.opacityRange[1],
                  particle.opacityRange[0] * 1.2,
                  particle.opacityRange[1] * 0.9,
                  particle.opacityRange[0],
                ],
                rotate: particle.rotate ? [0, 90, 180, 270, 360] : 0,
              }
        }
        transition={{
          duration: particle.duration,
          delay: particle.delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ width: particle.size, height: particle.size }}
        className="flex items-center justify-center"
      >
        {particle.type === "dot" && (
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 2.5}px ${particle.glowColor}`,
            }}
          />
        )}

        {particle.type === "orb" && (
          <div
            className="w-full h-full rounded-full blur-[0.5px]"
            style={{
              background: `radial-gradient(circle, ${particle.color} 0%, ${particle.glowColor} 50%, transparent 75%)`,
              boxShadow: `0 0 ${particle.size * 1.8}px ${particle.glowColor}`,
            }}
          />
        )}

        {particle.type === "ring" && (
          <div
            className="w-full h-full rounded-full border border-current"
            style={{
              color: particle.color,
              boxShadow: `0 0 ${particle.size}px ${particle.glowColor}`,
              opacity: 0.75,
            }}
          />
        )}

        {particle.type === "sparkle" && (
          <svg
            viewBox="0 0 24 24"
            className="w-full h-full"
            style={{
              fill: particle.color,
              filter: `drop-shadow(0 0 3px ${particle.glowColor})`,
            }}
          >
            {/* 4-point diamond star sparkle */}
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        )}
      </motion.div>
    </motion.div>
  );
};

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({
  count = 42,
  className = "",
  showCursorGlow = true,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Mouse coordinate tracker (distance from viewport center)
  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);

  // Absolute cursor position for subtle ambient spotlight
  const cursorPageX = useMotionValue(-1000);
  const cursorPageY = useMotionValue(-1000);

  // Spring physics for organic, lag-free floating response
  const springConfig = { damping: 28, stiffness: 60, mass: 0.6 };
  const smoothMouseX = useSpring(rawMouseX, springConfig);
  const smoothMouseY = useSpring(rawMouseY, springConfig);

  const smoothCursorX = useSpring(cursorPageX, { damping: 35, stiffness: 120 });
  const smoothCursorY = useSpring(cursorPageY, { damping: 35, stiffness: 120 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      // Offset from viewport center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      rawMouseX.set(e.clientX - centerX);
      rawMouseY.set(e.clientY - centerY);

      // Client viewport coordinates for spotlight
      cursorPageX.set(e.clientX);
      cursorPageY.set(e.clientY);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [rawMouseX, rawMouseY, cursorPageX, cursorPageY]);

  const particles = useMemo(() => generateParticles(count), [count]);

  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Interactive Soft Cursor Glow following pointer movement */}
      {showCursorGlow && !shouldReduceMotion && (
        <motion.div
          className="absolute w-[440px] h-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none blur-3xl opacity-30"
          style={{
            x: smoothCursorX,
            y: smoothCursorY,
            background:
              "radial-gradient(circle, rgba(242, 101, 34, 0.18) 0%, rgba(251, 146, 60, 0.08) 40%, transparent 70%)",
          }}
        />
      )}

      {/* Floating Particles Layer */}
      {particles.map((p) => (
        <ParticleNode
          key={p.id}
          particle={p}
          springX={smoothMouseX}
          springY={smoothMouseY}
          shouldReduceMotion={shouldReduceMotion}
        />
      ))}
    </div>
  );
};
