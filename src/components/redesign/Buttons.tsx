import React, { useRef, useState, useEffect } from "react";
import { ArrowRight, LucideIcon } from "lucide-react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: LucideIcon;
  showArrow?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "primary" | "secondary" | "violet" | "teal" | "white" | "ghost" | "dark" | "orange";
  magnetic?: boolean;
}

export const PillButton: React.FC<ButtonProps> = ({
  children,
  icon: Icon,
  showArrow = false,
  size = "md",
  className = "",
  variant = "primary",
  magnetic = true,
  ...props
}) => {
  const hasTrailingIcon = Boolean(showArrow || Icon);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Magnetic spring values
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const magneticX = useSpring(rawX, springConfig);
  const magneticY = useSpring(rawY, springConfig);

  useEffect(() => {
    const mql = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!magnetic || !isDesktop || shouldReduceMotion || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distX = e.clientX - centerX;
    const distY = e.clientY - centerY;
    // Cap magnetic movement to 5px max
    const maxPull = 5;
    const clampedX = Math.max(-maxPull, Math.min(maxPull, distX * 0.18));
    const clampedY = Math.max(-maxPull, Math.min(maxPull, distY * 0.18));
    rawX.set(clampedX);
    rawY.set(clampedY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rawX.set(0);
    rawY.set(0);
  };

  const sizeClasses = {
    sm: hasTrailingIcon ? "text-xs pl-3.5 pr-2 py-1.5 gap-2 h-9" : "text-xs px-3.5 py-1.5 gap-2 h-9",
    md: hasTrailingIcon ? "text-xs sm:text-[13px] pl-4 sm:pl-5 pr-2 py-2 gap-2.5 h-11" : "text-xs sm:text-[13px] px-4 sm:px-5 py-2 gap-2.5 h-11",
    lg: hasTrailingIcon ? "text-sm sm:text-[15px] pl-5 sm:pl-6 pr-2.5 py-2.5 gap-3 h-13" : "text-sm sm:text-[15px] px-5 sm:px-6 py-2.5 gap-3 h-13",
  };

  const arrowCircleSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6 sm:w-7 sm:h-7",
    lg: "w-7 h-7 sm:w-8 sm:h-8",
  };

  const arrowIconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  const variantStyles = {
    primary: "bg-[#312E81] hover:bg-[#6D5DFB] text-white shadow-sm hover:shadow-[0_8px_24px_rgba(109,93,251,0.28)] transition-all",
    secondary: "bg-white hover:bg-[#F8FAFC] text-[#312E81] border border-[#E2E8F0] hover:border-[#6D5DFB]/40 shadow-2xs hover:shadow-xs",
    violet: "bg-[#6D5DFB] hover:bg-[#5B4BE8] text-white shadow-sm hover:shadow-[0_8px_24px_rgba(109,93,251,0.32)]",
    teal: "bg-[#14B8A6] hover:bg-[#0D9488] text-white shadow-sm hover:shadow-[0_8px_24px_rgba(20,184,166,0.28)]",
    white: "bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] shadow-xs",
    ghost: "bg-transparent hover:bg-[#312E81]/5 text-[#312E81] hover:text-[#6D5DFB]",
    dark: "bg-[#0F172A] hover:bg-[#1E293B] text-white",
    orange: "bg-[#312E81] hover:bg-[#6D5DFB] text-white",
  };

  const circleStyles = {
    primary: "bg-white/15 text-white group-hover:bg-white group-hover:text-[#6D5DFB]",
    secondary: "bg-[#312E81]/10 text-[#312E81] group-hover:bg-[#6D5DFB] group-hover:text-white",
    violet: "bg-white/15 text-white group-hover:bg-white group-hover:text-[#6D5DFB]",
    teal: "bg-white/15 text-white group-hover:bg-white group-hover:text-[#14B8A6]",
    white: "bg-[#312E81] text-white",
    ghost: "bg-[#312E81]/10 text-[#312E81]",
    dark: "bg-white/20 text-white",
    orange: "bg-white/15 text-white",
  };

  const defaultJustify = hasTrailingIcon ? "justify-between" : "justify-center";

  return (
    <motion.button
      ref={buttonRef}
      style={{
        x: magnetic && isDesktop && !shouldReduceMotion ? magneticX : 0,
        y: magnetic && isDesktop && !shouldReduceMotion ? magneticY : 0,
      }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      data-interactive="true"
      className={`group relative inline-flex items-center ${defaultJustify} font-semibold rounded-full select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden ${variantStyles[variant] || variantStyles.primary} ${sizeClasses[size]} ${className}`}
      {...(props as any)}
    >
      {/* Specular Light Sweep on Hover */}
      {!shouldReduceMotion && (
        <motion.div
          animate={{
            x: isHovered ? ["-140%", "140%"] : "-140%",
          }}
          transition={{
            duration: 0.75,
            ease: "easeInOut",
          }}
          className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none z-0"
          aria-hidden="true"
        />
      )}

      {/* Hover Text Roll Effect */}
      <span className="relative z-10 overflow-hidden h-[18px] sm:h-[20px] flex flex-col justify-start">
        <span className="block transform transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-full whitespace-nowrap">
          {children}
        </span>
        <span className="block transform transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] translate-y-0 group-hover:-translate-y-full whitespace-nowrap" aria-hidden="true">
          {children}
        </span>
      </span>

      {/* Rotating Arrow / Icon Circle */}
      {(showArrow || Icon) && (
        <span
          className={`relative z-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:rotate-[-45deg] ${circleStyles[variant] || circleStyles.primary} ${arrowCircleSizes[size]}`}
        >
          {Icon ? (
            <Icon className={arrowIconSizes[size]} />
          ) : (
            <ArrowRight className={arrowIconSizes[size]} />
          )}
        </span>
      )}
    </motion.button>
  );
};

export const PrimaryButton: React.FC<ButtonProps> = (props) => {
  return <PillButton variant="primary" showArrow {...props} />;
};

export const SecondaryButton: React.FC<ButtonProps> = (props) => {
  return <PillButton variant="secondary" showArrow {...props} />;
};

export const GhostButton: React.FC<ButtonProps> = (props) => {
  return <PillButton variant="ghost" {...props} />;
};
