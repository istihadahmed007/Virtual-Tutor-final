import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

export const MouseSpotlight: React.FC<{ isDark?: boolean }> = ({ isDark = false }) => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  const springConfig = { damping: 28, stiffness: 90, mass: 0.6 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Only enable on fine pointer desktop devices
    const mql = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    setIsDesktop(mql.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    mql.addEventListener("change", handleMediaChange);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
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
  }, [mouseX, mouseY, isVisible]);

  if (!isDesktop || shouldReduceMotion || !isVisible) return null;

  return (
    <motion.div
      style={{
        x: smoothX,
        y: smoothY,
        translateX: "-50%",
        translateY: "-50%",
      }}
      className="fixed top-0 left-0 w-[550px] h-[550px] rounded-full pointer-events-none z-30 select-none"
      aria-hidden="true"
    >
      <div
        className={`w-full h-full rounded-full blur-3xl transition-opacity duration-700 ${
          isDark
            ? "bg-gradient-to-tr from-[#6D5DFB]/12 via-[#14B8A6]/8 to-transparent opacity-80"
            : "bg-gradient-to-tr from-[#6D5DFB]/8 via-[#312E81]/5 to-transparent opacity-60"
        }`}
      />
    </motion.div>
  );
};
export default MouseSpotlight;
