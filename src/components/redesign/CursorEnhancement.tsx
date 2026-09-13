import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

export const CursorEnhancement: React.FC = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 24, stiffness: 200, mass: 0.3 };
  const smoothX = useSpring(cursorX, springConfig);
  const smoothY = useSpring(cursorY, springConfig);

  useEffect(() => {
    const mql = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    setIsDesktop(mql.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    mql.addEventListener("change", handleMediaChange);

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      // Check if hovering over interactive elements
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest(
          'a, button, input, [role="button"], [data-interactive="true"]'
        );
        setIsHoveringInteractive(Boolean(interactive));
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      mql.removeEventListener("change", handleMediaChange);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [cursorX, cursorY, isVisible]);

  if (!isDesktop || shouldReduceMotion || !isVisible) return null;

  return (
    <motion.div
      style={{
        x: smoothX,
        y: smoothY,
        translateX: "-50%",
        translateY: "-50%",
      }}
      className="fixed top-0 left-0 pointer-events-none z-50 select-none"
      aria-hidden="true"
    >
      <motion.div
        animate={{
          scale: isHoveringInteractive ? 1.6 : 1,
          opacity: isHoveringInteractive ? 0.35 : 0.18,
          borderColor: isHoveringInteractive ? "#6D5DFB" : "rgba(100, 116, 139, 0.4)",
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-8 h-8 rounded-full border border-slate-400 bg-[#6D5DFB]/10 backdrop-blur-[1px]"
      />
    </motion.div>
  );
};
export default CursorEnhancement;
