import React from "react";
import { LucideIcon } from "lucide-react";

interface StatBlockProps {
  label: string;
  value: string | number;
  suffix?: string;
  subtext?: string;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
  theme?: "light" | "dark";
}

export const StatBlock: React.FC<StatBlockProps> = ({
  label,
  value,
  suffix = "",
  subtext,
  icon: Icon,
  trend,
  className = "",
  theme = "light",
}) => {
  const isDark = theme === "dark";

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${
        isDark
          ? "bg-[#0D0D0D]/80 backdrop-blur-md border-white/10 hover:border-white/25 hover:shadow-[0_8px_30px_rgba(242,101,34,0.08)]"
          : "bg-white border-[#E5E4DE] hover:border-[#111111]/20"
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <span
          className={`text-xs sm:text-[13px] font-medium tracking-tight ${
            isDark ? "text-white/60" : "text-[#111111]/60"
          }`}
        >
          {label}
        </span>
        {Icon && (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isDark
                ? "bg-white/10 text-[#F26522]"
                : "bg-[#F5F4EF] text-[#111111]"
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span
          className={`text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.03em] ${
            isDark ? "text-white" : "text-[#111111]"
          }`}
        >
          {value}
        </span>
        {suffix && (
          <span
            className={`text-sm sm:text-base font-normal ${
              isDark ? "text-white/60" : "text-[#111111]/60"
            }`}
          >
            {suffix}
          </span>
        )}
      </div>

      {(subtext || trend) && (
        <div
          className={`mt-2.5 flex items-center gap-2 text-xs ${
            isDark ? "text-white/60" : "text-[#111111]/60"
          }`}
        >
          {trend && (
            <span className="font-semibold text-[#F26522]">{trend}</span>
          )}
          {subtext && <span>{subtext}</span>}
        </div>
      )}
    </div>
  );
};
