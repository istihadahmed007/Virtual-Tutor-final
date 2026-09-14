import React, { forwardRef, HTMLAttributes } from "react";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className = "", interactive = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`glass-card p-5 sm:p-6 text-white ${
          interactive ? "cursor-pointer hover:border-white/30 hover:shadow-[0_20px_48px_rgba(109,93,251,0.18)]" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";
