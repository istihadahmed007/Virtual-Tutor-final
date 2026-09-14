import React, { HTMLAttributes } from "react";

export interface GlassBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "accent" | "danger";
  size?: "sm" | "md";
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  className = "",
  variant = "default",
  size = "md",
  children,
  ...props
}) => {
  const sizeClasses = size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  let variantClasses = "bg-white/10 text-white border-white/20";
  if (variant === "success") {
    variantClasses = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  } else if (variant === "accent") {
    variantClasses = "bg-[#14B8A6]/15 text-[#2DD4BF] border-[#14B8A6]/35";
  } else if (variant === "warning") {
    variantClasses = "bg-amber-500/15 text-amber-300 border-amber-500/30";
  } else if (variant === "danger") {
    variantClasses = "bg-rose-500/15 text-rose-300 border-rose-500/30";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide backdrop-blur-md border ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
