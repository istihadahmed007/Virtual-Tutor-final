import React from "react";

interface SectionLabelProps {
  number?: string | number;
  text?: string;
  label?: string;
  children?: React.ReactNode;
  className?: string;
  accent?: boolean;
  theme?: "light" | "dark";
}

export const SectionLabel: React.FC<SectionLabelProps> = ({
  number,
  text,
  label,
  children,
  className = "",
  accent = false,
  theme = "light",
}) => {
  const content = children || text || label;
  const isDark = theme === "dark";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {number !== undefined && (
        <span
          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[11px] sm:text-xs font-bold flex items-center justify-center tracking-tight shrink-0 ${
            isDark
              ? "bg-[#F26522] text-white"
              : "bg-[#111111] text-white"
          }`}
        >
          {number}
        </span>
      )}
      <span
        className={`text-xs sm:text-[13px] font-semibold tracking-wide px-3 sm:px-3.5 py-1 rounded-full border ${
          accent
            ? "border-[#F26522]/30 bg-[#F26522]/10 text-[#F26522]"
            : isDark
            ? "border-white/15 bg-white/10 text-white/90 backdrop-blur-sm"
            : "border-[#E5E4DE] bg-white text-[#111111]"
        }`}
      >
        {content}
      </span>
    </div>
  );
};
