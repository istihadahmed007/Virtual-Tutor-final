import React, { forwardRef, ButtonHTMLAttributes } from "react";

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className = "", variant = "secondary", size = "md", children, disabled, ...props }, ref) => {
    const sizeClasses =
      size === "sm"
        ? "h-9 px-4 text-xs font-semibold"
        : size === "lg"
          ? "h-12 px-7 text-base font-bold"
          : "h-11 px-5 text-sm font-semibold";

    let variantClasses = "";
    if (variant === "primary") {
      variantClasses =
        "bg-white text-slate-950 hover:bg-slate-100 shadow-[0_0_24px_rgba(255,255,255,0.3)] border border-white active:scale-[0.98]";
    } else if (variant === "secondary") {
      variantClasses =
        "glass-pill text-white hover:bg-white/12 hover:border-white/30 border border-white/15 active:scale-[0.98]";
    } else if (variant === "destructive") {
      variantClasses =
        "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-500/40 active:scale-[0.98]";
    } else {
      // ghost
      variantClasses = "text-slate-300 hover:text-white hover:bg-white/10 active:scale-[0.98]";
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-full tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-45 disabled:pointer-events-none select-none ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";
