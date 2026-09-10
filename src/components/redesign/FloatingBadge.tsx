import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface FloatingBadgeProps {
  icon?: LucideIcon;
  customIcon?: React.ReactNode;
  label: string;
  sublabel?: string;
  badge?: string;
  className?: string;
  pulse?: boolean;
  animateFloat?: boolean;
}

export const FloatingBadge: React.FC<FloatingBadgeProps> = ({
  icon: Icon,
  customIcon,
  label,
  sublabel,
  badge,
  className = "",
  pulse = false,
  animateFloat = true,
}) => {
  return (
    <motion.div
      animate={animateFloat ? { y: [0, -5, 0] } : undefined}
      transition={
        animateFloat
          ? {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
      className={`inline-flex items-center gap-2 sm:gap-2.5 bg-white/95 backdrop-blur-sm border border-[#E5E4DE] px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-xs sm:text-[13px] font-medium text-[#111111] transition-all hover:border-[#111111]/30 ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F26522] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F26522]" />
        </span>
      )}

      {customIcon && <span className="shrink-0">{customIcon}</span>}

      {Icon && (
        <span className="text-[#F26522] shrink-0">
          <Icon className="w-4 h-4" />
        </span>
      )}

      <span className="tracking-tight">{label}</span>

      {sublabel && (
        <span className="text-[#111111]/50 text-[11px] sm:text-xs">
          {sublabel}
        </span>
      )}

      {badge && (
        <span className="bg-[#111111] text-white text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </motion.div>
  );
};
