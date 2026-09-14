import React, { forwardRef, HTMLAttributes } from "react";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "strong" | "dock";
  hover?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className = "", variant = "default", hover = false, children, ...props }, ref) => {
    const variantClass =
      variant === "strong"
        ? "glass-panel-strong"
        : variant === "subtle"
          ? "glass-panel-subtle"
          : variant === "dock"
            ? "glass-dock"
            : "glass-panel";

    return (
      <div
        ref={ref}
        className={`rounded-2xl sm:rounded-3xl ${variantClass} ${
          hover ? "glass-panel-hover cursor-pointer" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";
