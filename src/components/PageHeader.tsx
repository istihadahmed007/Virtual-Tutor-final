import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

interface Breadcrumb {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  action?: {
    label: string;
    onClick?: () => void;
    path?: string;
    icon?: ReactNode;
  };
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  children,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={`mb-8 lg:mb-10 ${className ?? ""}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-[#111111]/40 mb-3">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3 text-[#111111]/30" />}
              {crumb.path ? (
                <button
                  onClick={() => navigate(crumb.path!)}
                  className="hover:text-[#F26522] transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-[#111111]/70 font-medium">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-[#111111] tracking-tight font-display">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-[#111111]/60 mt-1.5 max-w-2xl">{description}</p>
          )}
        </div>
        {action && (
          <Button
            onClick={() => {
              if (action.onClick) action.onClick();
              else if (action.path) navigate(action.path);
            }}
            className="rounded-full bg-[#111111] hover:bg-[#F26522] text-white px-5 py-2.5 text-xs font-semibold transition-all shrink-0 gap-2 shadow-xs"
          >
            {action.icon}
            {action.label}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
