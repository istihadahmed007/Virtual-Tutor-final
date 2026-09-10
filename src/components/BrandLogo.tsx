import React from "react";
import logoSvg from "@/assets/logo.svg";
import logoIconSvg from "@/assets/logo-icon.svg";

export interface BrandLogoProps {
  /**
   * Presentation variant:
   * - "icon": Just the circular emblem (teacher, screen, student, open book)
   * - "horizontal": Emblem + Bengali wordmark "ভার্চুয়াল টিউটর"
   * - "full": Complete emblem + Bengali wordmark + tagline
   */
  variant?: "icon" | "horizontal" | "full";
  /**
   * Predefined size presets or custom pixel dimension
   */
  size?: "sm" | "md" | "lg" | "xl" | number;
  /**
   * Optional custom class name
   */
  className?: string;
  /**
   * Show subtitle or English name badge alongside
   */
  showSubtext?: boolean;
  /**
   * Custom subtitle text override
   */
  subtitle?: string;
  /**
   * Whether to optimize colors for a dark background (e.g. footer, dark hero)
   */
  isDark?: boolean;
  /**
   * Optional click handler
   */
  onClick?: () => void;
}

const SIZE_MAP = {
  sm: { icon: 32, height: 32 },
  md: { icon: 40, height: 40 },
  lg: { icon: 52, height: 52 },
  xl: { icon: 72, height: 72 },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "horizontal",
  size = "md",
  className = "",
  showSubtext = false,
  subtitle,
  isDark = false,
  onClick,
}) => {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size].icon;

  if (variant === "icon") {
    return (
      <div
        onClick={onClick}
        className={`relative inline-flex items-center justify-center shrink-0 select-none ${
          onClick ? "cursor-pointer" : ""
        } ${className}`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <img
          src={logoIconSvg}
          alt="ভার্চুয়াল টিউটর"
          width={pixelSize}
          height={pixelSize}
          className="w-full h-full object-contain rounded-xl drop-shadow-xs"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div
        onClick={onClick}
        className={`relative inline-flex flex-col items-center select-none ${
          onClick ? "cursor-pointer" : ""
        } ${className}`}
      >
        <img
          src={logoSvg}
          alt="ভার্চুয়াল টিউটর - শিখুন • শেখান • এগিয়ে যান"
          className="w-full max-w-[280px] sm:max-w-[340px] h-auto object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // "horizontal" variant (standard for navbars and headers)
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 sm:gap-3 select-none text-left ${
        onClick ? "cursor-pointer group" : ""
      } ${className}`}
    >
      <div
        className={`relative shrink-0 rounded-xl overflow-hidden shadow-xs group-hover:scale-105 transition-transform ${
          isDark ? "bg-white p-0.5" : ""
        }`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <img
          src={logoIconSvg}
          alt="ভার্চুয়াল টিউটর"
          width={pixelSize}
          height={pixelSize}
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-black tracking-tight text-lg sm:text-xl font-heading ${
            isDark ? "text-white" : "text-[#111111]"
          }`}
        >
          ভার্চুয়াল <span className={isDark ? "text-[#F26522]" : "text-[#F26522]"}>টিউটর</span>
        </span>
        {showSubtext && (
          <span
            className={`text-[11px] font-medium tracking-normal mt-0.5 ${
              isDark ? "text-white/60" : "text-[#111111]/60"
            }`}
          >
            {subtitle ?? "শিখুন • শেখান • এগিয়ে যান"}
          </span>
        )}
      </div>
    </div>
  );
};
