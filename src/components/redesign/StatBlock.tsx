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
}) => {
  return (
    <div
      className={`rounded-2xl border p-6 transition-all duration-300 bg-white/[0.055] backdrop-blur-xl border-white/10 hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.22)] ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13.5px] font-semibold tracking-tight text-[#B8C5E0]">
          {label}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#4169E1]/15 text-[#8EA7FF] border border-[#4169E1]/25">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#F8FAFF]">
          {value}
        </span>
        {suffix && (
          <span className="text-base font-medium text-[#B8C5E0]">
            {suffix}
          </span>
        )}
      </div>

      {(subtext || trend) && (
        <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between text-xs">
          {subtext && (
            <span className="text-[#8493B3] text-[12px] truncate">{subtext}</span>
          )}
          {trend && (
            <span className="text-[#8EA7FF] font-semibold text-[12px] ml-auto">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
