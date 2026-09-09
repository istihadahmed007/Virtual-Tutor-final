import React from "react";
import { Star, ShieldCheck, ArrowRight, Video } from "lucide-react";
import { useNavigate } from "react-router";

export interface TutorData {
  _id: string;
  name: string;
  avatarUrl?: string;
  image?: string;
  subjects?: string[];
  hourlyRate?: number;
  rating?: number;
  reviewCount?: number;
  bio?: string;
  isVerified?: boolean;
  totalHoursTaught?: number;
  isOnline?: boolean;
}

interface TutorCardProps {
  tutor: TutorData;
  onBook?: (tutorId: string) => void;
  className?: string;
}

export const TutorCard: React.FC<TutorCardProps> = ({
  tutor,
  onBook,
  className = "",
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/teachers/${tutor._id}`);
  };

  const displayName = tutor.name || "Verified Educator";
  const displaySubjects = tutor.subjects?.length ? tutor.subjects.slice(0, 3) : ["Mathematics", "Science"];
  const displayRate = tutor.hourlyRate ? `$${tutor.hourlyRate}` : "$35";
  const displayRating = tutor.rating ? tutor.rating.toFixed(1) : "4.9";
  const displayReviews = tutor.reviewCount ?? 28;

  return (
    <div
      onClick={handleCardClick}
      className={`group bg-white rounded-2xl border border-[#E5E4DE] p-5 sm:p-6 transition-all duration-300 hover:border-[#111111]/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] cursor-pointer flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Top bar: Avatar, Name, Verified, and Rating */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#F5F4EF] border border-[#E5E4DE] shrink-0 flex items-center justify-center font-medium text-[#111111] text-sm">
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
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm sm:text-base text-[#111111] group-hover:text-[#F26522] transition-colors">
                  {displayName}
                </h3>
                {tutor.isVerified !== false && (
                  <ShieldCheck className="w-4 h-4 text-[#F26522] shrink-0" />
                )}
              </div>
              <p className="text-xs text-[#111111]/60 mt-0.5">Verified Instructor</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#FAF9F5] px-2.5 py-1 rounded-full border border-[#E5E4DE]">
            <Star className="w-3.5 h-3.5 fill-[#F26522] text-[#F26522]" />
            <span className="text-xs font-bold text-[#111111]">{displayRating}</span>
            <span className="text-[10px] text-[#111111]/50">({displayReviews})</span>
          </div>
        </div>

        {/* Bio preview */}
        {tutor.bio && (
          <p className="mt-3.5 text-xs sm:text-[13px] text-[#111111]/70 line-clamp-2 leading-relaxed font-normal">
            {tutor.bio}
          </p>
        )}

        {/* Subjects tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {displaySubjects.map((sub, i) => (
            <span
              key={i}
              className="text-[11px] font-medium bg-[#F5F4EF] text-[#111111]/80 px-2.5 py-0.5 rounded-full border border-[#E5E4DE]/60"
            >
              {sub}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Footer: Rate & Action */}
      <div className="mt-5 pt-4 border-t border-[#E5E4DE] flex items-center justify-between">
        <div>
          <span className="text-base sm:text-lg font-bold text-[#111111]">
            {displayRate}
          </span>
          <span className="text-xs text-[#111111]/50"> / hour</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onBook) onBook(tutor._id);
            else navigate(`/teachers/${tutor._id}`);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] group-hover:text-[#F26522] transition-colors"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
