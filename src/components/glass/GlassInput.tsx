import React, { forwardRef, InputHTMLAttributes } from "react";

export interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className = "", icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`glass-input w-full h-11 rounded-xl px-4 text-sm text-white placeholder-slate-400/70 outline-hidden ${
            icon ? "pl-10" : ""
          } ${className}`}
          {...props}
        />
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";
