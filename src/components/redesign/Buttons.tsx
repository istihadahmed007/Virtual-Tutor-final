import React from "react";
import { ArrowRight, LucideIcon } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: LucideIcon;
  showArrow?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "orange" | "dark" | "white" | "outline";
}

export const PillButton: React.FC<ButtonProps> = ({
  children,
  icon: Icon,
  showArrow = false,
  size = "md",
  className = "",
  variant = "dark",
  ...props
}) => {
  const sizeClasses = {
    sm: "text-xs pl-3.5 pr-2 py-1.5 gap-2",
    md: "text-xs sm:text-[13px] pl-4 sm:pl-5 pr-2 py-2 gap-2.5",
    lg: "text-sm sm:text-[15px] pl-5 sm:pl-6 pr-2.5 py-2.5 gap-3",
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
    orange: "bg-[#F26522] hover:bg-[#e05a1a] text-white",
    dark: "bg-[#111111] hover:bg-[#222222] text-white",
    white: "bg-white hover:bg-[#FAF9F5] text-[#111111] border border-[#E5E4DE] shadow-xs",
    outline: "bg-transparent hover:bg-[#111111]/5 text-[#111111] border border-[#E5E4DE]",
  };

  const circleStyles = {
    orange: "bg-white text-[#F26522]",
    dark: "bg-white text-[#111111]",
    white: "bg-[#111111] text-white",
    outline: "bg-[#111111] text-white",
  };

  return (
    <button
      className={`group relative inline-flex items-center justify-between font-medium rounded-full transition-all duration-300 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
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
          className={`shrink-0 rounded-full flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:rotate-[-45deg] ${circleStyles[variant]} ${arrowCircleSizes[size]}`}
        >
          {Icon ? (
            <Icon className={arrowIconSizes[size]} />
          ) : (
            <ArrowRight className={arrowIconSizes[size]} />
          )}
        </span>
      )}
    </button>
  );
};

export const PrimaryButton: React.FC<ButtonProps> = (props) => {
  return <PillButton variant="orange" showArrow {...props} />;
};

export const SecondaryButton: React.FC<ButtonProps> = (props) => {
  return <PillButton variant="white" showArrow {...props} />;
};
