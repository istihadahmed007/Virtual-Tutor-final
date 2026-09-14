import React, { useState } from "react";
import { Star, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { motion, useReducedMotion } from "framer-motion";

export interface TutorData {
  _id: string;
  name: string;
  avatarUrl?: string;
  image?: string;
  subjects?: string[];
  hourlyRate?: number;
  monthlyTuition?: number;
  rating?: number;
  reviewCount?: number;
  bio?: string;
  isVerified?: boolean;
  verificationStatus?: string;
  totalHoursTaught?: number;
  isOnline?: boolean;
}

interface TutorCardProps {
  tutor: TutorData;
  onBook?: (tutorId: string) => void;
  className?: string;
  theme?: "light" | "dark";
}

export const TutorCard: React.FC<TutorCardProps> = ({
  tutor,
  onBook,
  className = "",
  theme = "light",
}) => {
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const shouldReduceMotion = useReducedMotion();

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const tutorTargetId = tutor._id || (tutor as any).userId || "";

  const handleCardClick = () => {
    navigate(`/teachers/${tutorTargetId}`);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  const displayName = tutor.name || "Verified Educator";
  const displaySubjects = tutor.subjects?.length ? tutor.subjects.slice(0, 3) : ["General Studies"];
  
  // Resolve authoritative monthly tuition in Bangladeshi Taka (৳):
  const resolvedTuition =
    typeof tutor.monthlyTuition === "number" && tutor.monthlyTuition > 0
      ? tutor.monthlyTuition
      : typeof tutor.hourlyRate === "number" && tutor.hourlyRate > 0
        ? (tutor.hourlyRate >= 500 ? tutor.hourlyRate : Math.round(tutor.hourlyRate * 100))
        : 3500;

  const displayRate = `৳${resolvedTuition.toLocaleString()}`;

  const isVerified = Boolean(
    tutor.isVerified || tutor.verificationStatus === "verified"
  );

  const hasRating = typeof tutor.rating === "number" && tutor.rating > 0;
  const displayRating = hasRating
    ? tutor.rating!.toFixed(1)
    : (tutor.reviewCount && tutor.reviewCount > 0 ? "5.0" : "New");
  const displayReviews = tutor.reviewCount ?? 0;

  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { y: -6 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      onClick={handleCardClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-interactive="true"
      className={`group relative rounded-2xl border p-5 sm:p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden ${
        isDark
          ? "bg-slate-900/40 backdrop-blur-xl border-white/12 hover:border-[#6D5DFB]/60 hover:bg-slate-900/60 shadow-[0_16px_36px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.12)] hover:shadow-[0_20px_44px_rgba(109,93,251,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] text-white"
          : "bg-white border-[#E2E8F0] hover:border-[#6D5DFB]/40 hover:shadow-[0_16px_36px_rgba(49,46,129,0.09)]"
      } ${className}`}
    >
      {/* Local Spotlight Follower */}
      {mousePos && !shouldReduceMotion && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-100 transition-opacity duration-200 z-0"
          style={{
            background: `radial-gradient(320px circle at ${mousePos.x}px ${mousePos.y}px, ${
              isDark ? "rgba(109, 93, 251, 0.16)" : "rgba(109, 93, 251, 0.08)"
            }, transparent 70%)`,
          }}
          aria-hidden="true"
        />
      )}

      <div className="relative z-10">
        {/* Top bar: Avatar, Name, Verified, and Rating */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`relative w-12 h-12 rounded-full overflow-hidden border shrink-0 flex items-center justify-center font-bold text-sm transition-transform duration-500 ${
                isDark
                  ? "bg-white/10 border-white/15 text-white"
                  : "bg-[#F8FAFC] border-[#E2E8F0] text-[#312E81]"
              }`}
            >
              {tutor.avatarUrl || tutor.image ? (
                <img
                  src={tutor.avatarUrl || tutor.image}
                  alt={displayName}
                  className="w-full h-full object-cover transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              ) : (
                displayName.slice(0, 2).toUpperCase()
              )}
              {tutor.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#14B8A6] border-2 border-white ring-2 ring-[#14B8A6]/20 animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3
                  className={`font-bold text-sm sm:text-base transition-colors ${
                    isDark
                      ? "text-white group-hover:text-[#6D5DFB]"
                      : "text-[#0F172A] group-hover:text-[#312E81]"
                  }`}
                >
                  {displayName}
                </h3>
                {isVerified && (
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 8 }}
                    transition={{ duration: 0.18 }}
                    className="relative shrink-0 flex items-center justify-center"
                    title="Verified Instructor"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#14B8A6] shrink-0 drop-shadow-[0_0_6px_rgba(20,184,166,0.4)]" />
                  </motion.div>
                )}
              </div>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? "text-white/60" : "text-[#64748B]"
                }`}
              >
                {isVerified ? "Verified Instructor" : "Faculty Specialist"}
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all duration-300 group-hover:border-[#F59E0B]/30 ${
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-[#F8FAFC] border-[#E2E8F0]"
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
            <span
              className={`text-xs font-bold ${
                isDark ? "text-white" : "text-[#0F172A]"
              }`}
            >
              {displayRating}
            </span>
            {displayReviews > 0 && (
              <span
                className={`text-[10px] ${
                  isDark ? "text-white/50" : "text-[#64748B]"
                }`}
              >
                ({displayReviews})
              </span>
            )}
          </div>
        </div>

        {/* Bio preview */}
        {tutor.bio && (
          <p
            className={`mt-3.5 text-xs sm:text-[13px] line-clamp-2 leading-relaxed font-normal ${
              isDark ? "text-white/70" : "text-[#64748B]"
            }`}
          >
            {tutor.bio}
          </p>
        )}

        {/* Subjects tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {displaySubjects.map((sub, i) => (
            <span
              key={i}
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border transition-all duration-200 group-hover:border-[#6D5DFB]/30 ${
                isDark
                  ? "bg-white/5 text-white/80 border-white/10"
                  : "bg-[#F8FAFC] text-[#312E81] border-[#E2E8F0]"
              }`}
            >
              {sub}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Footer: Rate & Action */}
      <div
        className={`relative z-10 mt-5 pt-4 border-t flex items-center justify-between ${
          isDark ? "border-white/10" : "border-[#E2E8F0]"
        }`}
      >
        <div>
          <span
            className={`text-base sm:text-lg font-bold font-display ${
              isDark ? "text-white" : "text-[#0F172A]"
            }`}
          >
            {displayRate}
          </span>
          <span
            className={`text-xs ${
              isDark ? "text-white/50" : "text-[#64748B]"
            }`}
          >
            {" "}
            / month
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onBook) onBook(tutorTargetId);
            else navigate(`/teachers/${tutorTargetId}`);
          }}
          className={`inline-flex items-center gap-1.5 text-xs font-bold text-[#312E81] hover:text-[#6D5DFB] transition-colors cursor-pointer ${
            isDark ? "text-white/90 hover:text-[#6D5DFB]" : ""
          }`}
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1.5" />
        </button>
      </div>
    </motion.div>
  );
};
