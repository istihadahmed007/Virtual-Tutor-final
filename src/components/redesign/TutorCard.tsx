import React from "react";
import { Star, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";

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

  const tutorTargetId = tutor._id || (tutor as any).userId || "";

  const handleCardClick = () => {
    navigate(`/teachers/${tutorTargetId}`);
  };

  const displayName = tutor.name || "Verified Educator";
  const displaySubjects = tutor.subjects?.length ? tutor.subjects.slice(0, 3) : ["General Studies"];
  
  // Resolve authoritative monthly tuition in Bangladeshi Taka (৳):
  // 1. If monthlyTuition is provided (>0), use it.
  // 2. If hourlyRate >= 500, it is already in BDT (e.g. ৳3,000). Never multiply by 100.
  // 3. If hourlyRate > 0 but < 500, convert legacy USD rates (e.g. 35 -> ৳3,500).
  // 4. Fallback to ৳3,500.
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
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={handleCardClick}
      className={`group rounded-2xl border p-5 sm:p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
        isDark
          ? "bg-[#0D0D0D]/85 backdrop-blur-md border-white/10 hover:border-[#F26522]/50 hover:shadow-[0_8px_32px_rgba(242,101,34,0.12)] text-white"
          : "bg-white border-[#E5E4DE] hover:border-[#111111]/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
      } ${className}`}
    >
      <div>
        {/* Top bar: Avatar, Name, Verified, and Rating */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`relative w-12 h-12 rounded-full overflow-hidden border shrink-0 flex items-center justify-center font-medium text-sm ${
                isDark
                  ? "bg-white/10 border-white/15 text-white"
                  : "bg-[#F5F4EF] border-[#E5E4DE] text-[#111111]"
              }`}
            >
              {tutor.avatarUrl || tutor.image ? (
                <img
                  src={tutor.avatarUrl || tutor.image}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                displayName.slice(0, 2).toUpperCase()
              )}
              {tutor.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#10B981] border-2 border-black" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3
                  className={`font-semibold text-sm sm:text-base transition-colors ${
                    isDark
                      ? "text-white group-hover:text-[#F26522]"
                      : "text-[#111111] group-hover:text-[#F26522]"
                  }`}
                >
                  {displayName}
                </h3>
                {isVerified && (
                  <ShieldCheck className="w-4 h-4 text-[#F26522] shrink-0" />
                )}
              </div>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? "text-white/60" : "text-[#111111]/60"
                }`}
              >
                {isVerified ? "Verified Instructor" : "Faculty Specialist"}
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-[#FAF9F5] border-[#E5E4DE]"
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-[#F26522] text-[#F26522]" />
            <span
              className={`text-xs font-bold ${
                isDark ? "text-white" : "text-[#111111]"
              }`}
            >
              {displayRating}
            </span>
            {displayReviews > 0 && (
              <span
                className={`text-[10px] ${
                  isDark ? "text-white/50" : "text-[#111111]/50"
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
              isDark ? "text-white/70" : "text-[#111111]/70"
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
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                isDark
                  ? "bg-white/5 text-white/80 border-white/10"
                  : "bg-[#F5F4EF] text-[#111111]/80 border-[#E5E4DE]/60"
              }`}
            >
              {sub}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Footer: Rate & Action */}
      <div
        className={`mt-5 pt-4 border-t flex items-center justify-between ${
          isDark ? "border-white/10" : "border-[#E5E4DE]"
        }`}
      >
        <div>
          <span
            className={`text-base sm:text-lg font-bold font-display ${
              isDark ? "text-white" : "text-[#111111]"
            }`}
          >
            {displayRate}
          </span>
          <span
            className={`text-xs ${
              isDark ? "text-white/50" : "text-[#111111]/50"
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
          className={`inline-flex items-center gap-1.5 text-xs font-semibold group-hover:text-[#F26522] transition-colors ${
            isDark ? "text-white/90" : "text-[#111111]"
          }`}
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
};
