import type { LucideIcon } from "lucide-react";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "pending";

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  error: "bg-red-50 text-red-700 border-red-100",
  info: "bg-sky-50 text-sky-700 border-sky-100",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
};

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: LucideIcon;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({
  label,
  variant = "neutral",
  icon: Icon,
  dot,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${variantStyles[variant]} ${className ?? ""}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === "success"
              ? "bg-emerald-500"
              : variant === "warning"
                ? "bg-amber-500"
                : variant === "error"
                  ? "bg-red-500"
                  : variant === "info"
                    ? "bg-sky-500"
                    : "bg-slate-400"
          }`}
        />
      )}
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}
