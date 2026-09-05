import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: { value: string; positive?: boolean } | null;
  iconBg?: string;
  className?: string;
  children?: ReactNode;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  change,
  iconBg = "bg-teal-50",
  className,
  children,
}: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-stone-200/80 p-4 hover:border-stone-300/80 transition-colors ${className ?? ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
          >
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">{label}</p>
            <p className="text-xl font-extrabold text-slate-900">{value}</p>
          </div>
        </div>
        {change && (
          <span
            className={`text-xs font-semibold ${change.positive ? "text-emerald-600" : "text-slate-400"}`}
          >
            {change.value}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
