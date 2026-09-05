import React, { useState } from "react";
import { getInitials, getDeterministicGradient } from "@/lib/image-utils";
import { ShieldCheck, GraduationCap, School, Shield } from "lucide-react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type AvatarShape = "circle" | "rounded";
export type PresenceStatus = "online" | "available" | "busy" | "offline";

export interface ProfileAvatarProps {
  id?: string;
  name?: string | null;
  image?: string | null;
  userId?: string | null;
  role?: "student" | "teacher" | "parent" | "admin" | string | null;
  size?: AvatarSize;
  shape?: AvatarShape;
  showStatus?: boolean;
  status?: PresenceStatus;
  isVerified?: boolean;
  showRoleBadge?: boolean;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

const sizeConfig: Record<
  AvatarSize,
  {
    container: string;
    text: string;
    statusDot: string;
    badgeIcon: string;
    badgeContainer: string;
  }
> = {
  xs: {
    container: "w-6 h-6",
    text: "text-[10px]",
    statusDot: "w-2 h-2 border",
    badgeIcon: "w-2.5 h-2.5",
    badgeContainer: "-bottom-0.5 -right-0.5 p-0.5",
  },
  sm: {
    container: "w-8 h-8",
    text: "text-xs font-bold",
    statusDot: "w-2.5 h-2.5 border-1.5",
    badgeIcon: "w-3 h-3",
    badgeContainer: "-bottom-0.5 -right-0.5 p-0.5",
  },
  md: {
    container: "w-10 h-10 sm:w-11 sm:h-11",
    text: "text-sm font-bold",
    statusDot: "w-3 h-3 border-2",
    badgeIcon: "w-3.5 h-3.5",
    badgeContainer: "-bottom-1 -right-1 p-0.5",
  },
  lg: {
    container: "w-14 h-14 sm:w-16 sm:h-16",
    text: "text-lg font-extrabold",
    statusDot: "w-3.5 h-3.5 border-2",
    badgeIcon: "w-4 h-4",
    badgeContainer: "-bottom-1 -right-1 p-1",
  },
  xl: {
    container: "w-20 h-20 sm:w-24 sm:h-24",
    text: "text-2xl font-extrabold",
    statusDot: "w-4 h-4 border-2",
    badgeIcon: "w-5 h-5",
    badgeContainer: "bottom-0 right-0 p-1",
  },
  "2xl": {
    container: "w-28 h-28 sm:w-32 sm:h-32",
    text: "text-3xl sm:text-4xl font-black",
    statusDot: "w-5 h-5 border-2",
    badgeIcon: "w-6 h-6",
    badgeContainer: "bottom-1 right-1 p-1.5",
  },
  "3xl": {
    container: "w-36 h-36 sm:w-40 sm:h-40",
    text: "text-4xl sm:text-5xl font-black",
    statusDot: "w-6 h-6 border-3",
    badgeIcon: "w-7 h-7",
    badgeContainer: "bottom-1.5 right-1.5 p-1.5",
  },
};

const statusColors: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  available: "bg-emerald-500",
  busy: "bg-amber-500",
  offline: "bg-slate-400",
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  id,
  name,
  image,
  userId,
  role,
  size = "md",
  shape = "circle",
  showStatus = false,
  status = "online",
  isVerified = false,
  showRoleBadge = false,
  className = "",
  alt,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const cfg = sizeConfig[size] || sizeConfig.md;
  const initials = getInitials(name);
  const palette = getDeterministicGradient(userId || name || "user");
  const displayName = name || "User";
  const avatarAlt = alt || `${displayName}'s profile picture`;

  const hasValidImage = Boolean(image && image.trim().length > 0 && !imageError);
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-2xl";

  const getRoleIcon = () => {
    switch (role) {
      case "teacher":
        return <GraduationCap className={cfg.badgeIcon} />;
      case "student":
        return <School className={cfg.badgeIcon} />;
      case "admin":
        return <Shield className={cfg.badgeIcon} />;
      default:
        return <ShieldCheck className={cfg.badgeIcon} />;
    }
  };

  return (
    <div
      id={id}
      className={`relative inline-flex shrink-0 select-none ${cfg.container} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* ─── Avatar Image or Initials Fallback ─────────────────── */}
      <div
        className={`w-full h-full overflow-hidden flex items-center justify-center shadow-xs transition-all ${shapeClass} ${
          hasValidImage ? "bg-stone-100" : `bg-gradient-to-br ${palette.bgClass}`
        }`}
      >
        {hasValidImage ? (
          <>
            {!imageLoaded && (
              <div
                className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${palette.bgClass} text-white ${cfg.text}`}
              >
                {initials}
              </div>
            )}
            <img
              src={image!}
              alt={avatarAlt}
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                imageLoaded ? "opacity-100" : "opacity-0 absolute"
              }`}
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(false);
              }}
            />
          </>
        ) : (
          <span
            className={`text-white tracking-wider font-bold drop-shadow-xs ${cfg.text}`}
            aria-label={avatarAlt}
          >
            {initials}
          </span>
        )}
      </div>

      {/* ─── Presence Status Dot ────────────────────────────── */}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 ${cfg.statusDot} ${statusColors[status]} border-white rounded-full shadow-xs`}
          title={`Status: ${status}`}
          aria-label={`Status: ${status}`}
        />
      )}

      {/* ─── Verification Badge ─────────────────────────────── */}
      {isVerified && !showStatus && (
        <span
          className={`absolute ${cfg.badgeContainer} bg-teal-600 text-white rounded-full shadow-sm border-2 border-white flex items-center justify-center`}
          title="Verified Educator"
          aria-label="Verified Educator"
        >
          <ShieldCheck className={cfg.badgeIcon} />
        </span>
      )}

      {/* ─── Role Badge ─────────────────────────────────────── */}
      {showRoleBadge && !isVerified && !showStatus && role && (
        <span
          className={`absolute ${cfg.badgeContainer} bg-slate-900 text-white rounded-full shadow-sm border-2 border-white flex items-center justify-center`}
          title={`Role: ${role}`}
          aria-label={`Role: ${role}`}
        >
          {getRoleIcon()}
        </span>
      )}
    </div>
  );
};
