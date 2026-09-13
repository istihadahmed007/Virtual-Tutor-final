import React from "react";
import { ArrowRight, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: LucideIcon;
  showArrow?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "primary" | "secondary" | "violet" | "teal" | "white" | "ghost" | "dark" | "orange";
}

export const PillButton: React.FC<ButtonProps> = ({
  children,
  icon: Icon,
  showArrow = false,
  size = "md",
  className = "",
  variant = "primary",
  ...props
}) => {
  const sizeClasses = {
    sm: "text-xs pl-3.5 pr-2 py-1.5 gap-2 h-9",
    md: "text-xs sm:text-[13px] pl-4 sm:pl-5 pr-2 py-2 gap-2.5 h-11",
    lg: "text-sm sm:text-[15px] pl-5 sm:pl-6 pr-2.5 py-2.5 gap-3 h-13",
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
    primary: "bg-[#312E81] hover:bg-[#6D5DFB] text-white shadow-sm hover:shadow-[0_8px_20px_rgba(109,93,251,0.25)] transition-all",
    secondary: "bg-white hover:bg-[#F8FAFC] text-[#312E81] border border-[#E2E8F0] hover:border-[#6D5DFB]/40 shadow-2xs hover:shadow-xs",
    violet: "bg-[#6D5DFB] hover:bg-[#5B4BE8] text-white shadow-sm hover:shadow-[0_8px_20px_rgba(109,93,251,0.3)]",
    teal: "bg-[#14B8A6] hover:bg-[#0D9488] text-white shadow-sm hover:shadow-[0_8px_20px_rgba(20,184,166,0.25)]",
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

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className={`group relative inline-flex items-center justify-between font-semibold rounded-full select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${variantStyles[variant] || variantStyles.primary} ${sizeClasses[size]} ${className}`}
      {...(props as any)}
    >
      {/* Hover Text Roll Effect */}
      <span className="relative overflow-hidden h-[18px] sm:h-[20px] flex flex-col justify-start">
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
          className={`shrink-0 rounded-full flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:rotate-[-45deg] ${circleStyles[variant] || circleStyles.primary} ${arrowCircleSizes[size]}`}
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
