import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router";

export interface NavItem {
  label: string;
  href: string;
  isExternalOrHash?: boolean;
}

interface FloatingNavPillProps {
  items: NavItem[];
  isDark?: boolean;
  isScrolled?: boolean;
  className?: string;
}

export const FloatingNavPill: React.FC<FloatingNavPillProps> = ({
  items,
  isDark = false,
  isScrolled = false,
  className = "",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <nav
      onMouseLeave={() => setHoveredIdx(null)}
      className={`relative hidden lg:flex items-center gap-0.5 px-2 py-1.5 rounded-full border transition-all duration-300 ${
        isDark
          ? isScrolled
            ? "bg-slate-900/65 border-white/20 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            : "bg-white/[0.07] border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
          : isScrolled
          ? "bg-white/90 border-slate-200/80 backdrop-blur-md shadow-sm"
          : "bg-white/70 border-slate-200/60 backdrop-blur-md shadow-2xs"
      } ${className}`}
    >
      {items.map((item, idx) => {
        const isHovered = hoveredIdx === idx;
        const linkClasses = `relative z-10 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 select-none cursor-pointer ${
          isDark
            ? isHovered
              ? "text-white"
              : "text-slate-300 hover:text-white"
            : isHovered
            ? "text-[#312E81]"
            : "text-slate-600 hover:text-[#312E81]"
        }`;

        const content = (
          <>
            {isHovered && (
              <motion.div
                layoutId="nav-pill"
                className={`absolute inset-0 rounded-full ${
                  isDark
                    ? "bg-white/15 border border-white/25 shadow-[0_2px_12px_rgba(255,255,255,0.12)]"
                    : "bg-slate-100/95 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                }`}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </>
        );

        return item.isExternalOrHash ? (
          <a
            key={item.label}
            href={item.href}
            onMouseEnter={() => setHoveredIdx(idx)}
            className={linkClasses}
          >
            {content}
          </a>
        ) : (
          <Link
            key={item.label}
            to={item.href}
            onMouseEnter={() => setHoveredIdx(idx)}
            className={linkClasses}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
};

export default FloatingNavPill;
