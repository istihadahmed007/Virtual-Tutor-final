import type { LucideIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
  onAction?: () => void;
  illustration?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionPath,
  onAction,
  illustration,
  className,
}: EmptyStateProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className ?? ""}`}
    >
      {illustration && (
        <div className="w-full max-w-[240px] mb-6 opacity-80">
          {illustration}
        </div>
      )}
      {!illustration && (
        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-300" />
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">
        {description}
      </p>
      {actionLabel && (
        <Button
          onClick={() => {
            if (onAction) onAction();
            else if (actionPath) navigate(actionPath);
          }}
          className="mt-6 bg-teal-600 hover:bg-teal-700 text-white"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
