import React from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

export const GlobalScrollProgress: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (shouldReduceMotion) return null;

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#312E81] via-[#6D5DFB] to-[#14B8A6] origin-left z-[100] pointer-events-none"
      aria-hidden="true"
    />
  );
};
export default GlobalScrollProgress;
