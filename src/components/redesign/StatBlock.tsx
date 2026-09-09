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
}

export const StatBlock: React.FC<StatBlockProps> = ({
  label,
  value,
  suffix = "",
  subtext,
  icon: Icon,
  trend,
  className = "",
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#E5E4DE] p-5 sm:p-6 transition-all duration-300 hover:border-[#111111]/20 ${className}`}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <span className="text-xs sm:text-[13px] font-medium text-[#111111]/60 tracking-tight">
          {label}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-full bg-[#F5F4EF] flex items-center justify-center text-[#111111] shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.03em] text-[#111111]">
          {value}
        </span>
        {suffix && (
          <span className="text-sm sm:text-base font-normal text-[#111111]/60">
            {suffix}
          </span>
        )}
      </div>

      {(subtext || trend) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-[#111111]/60">
          {trend && (
            <span className="font-semibold text-[#F26522]">{trend}</span>
          )}
          {subtext && <span>{subtext}</span>}
        </div>
      )}
    </div>
  );
};
