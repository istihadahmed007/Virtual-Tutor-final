import { useNavigate } from "react-router";
import { 
  Star, 
  CheckCircle2, 
  Globe, 
  Calendar, 
  MessageSquare, 
  Sparkles, 
  GraduationCap, 
  ArrowRight
} from "lucide-react";
import { Button } from "../ui/button";
import { 
  AuthoritativeTeacher, 
  getTeacherMatchReason,
  formatTk
} from "@/lib/teacher-authoritative-data";

interface TeacherCardProps {
  teacher: AuthoritativeTeacher;
  searchContext?: {
    subject?: string;
    curriculum?: string;
    grade?: string;
    query?: string;
  };
  onMessageClick?: (teacher: AuthoritativeTeacher) => void;
  className?: string;
}

export function TeacherCard({
  teacher,
  searchContext,
  onMessageClick,
  className = "",
}: TeacherCardProps) {
  const navigate = useNavigate();

  const matchReason = getTeacherMatchReason(teacher, searchContext);

  const handleCardClick = () => {
    navigate(`/teachers/${teacher.userId}`);
  };

  return (
    <div
      role="article"
      aria-label={`Teacher Profile: ${teacher.name}`}
      className={`group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.055] backdrop-blur-xl p-6 text-[#F8FAFF] shadow-[0_12px_40px_rgba(0,0,0,0.18)] transition-all duration-300 hover:border-[#4169E1]/50 hover:bg-white/[0.08] hover:shadow-[0_16px_40px_rgba(65,105,225,0.2)] ${className}`}
    >
      <div>
        {/* Top Header: Avatar + Name + Verified Badge + Match Chip */}
        <div className="flex items-start gap-3.5 mb-3.5">
          <div className="relative shrink-0">
            {teacher.avatarUrl ? (
              <img
                src={teacher.avatarUrl}
                alt={teacher.name}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/15"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white font-bold text-lg ring-2 ring-white/15">
                {teacher.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            {teacher.isVerified ? (
              <div 
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs"
                title="Verified Educator"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            ) : (
              <div 
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs"
                title="Registered Instructor"
              >
                <GraduationCap className="h-3 w-3" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
              <h3 
                onClick={handleCardClick}
                className="text-base font-bold text-[#F8FAFF] hover:text-[#8EA7FF] cursor-pointer truncate transition-colors font-display"
              >
                {teacher.name}
              </h3>

              {/* Match Reason Chip */}
              {matchReason && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#4169E1]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#8EA7FF] border border-[#4169E1]/30 shrink-0">
                  <Sparkles className="h-3 w-3 text-[#8EA7FF]" />
                  <span>{matchReason}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-[#B8C5E0] line-clamp-1 font-medium mb-1.5">
              {teacher.title}
            </p>

            {/* Authoritative Rating & Review Count */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-1 font-bold text-amber-400">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{teacher.rating.toFixed(2)}</span>
              </div>
              <span className="text-white/20">·</span>
              <span className="text-[#B8C5E0] font-medium">
                {teacher.reviewCount} reviews
              </span>
              <span className="text-white/20">·</span>
              <span className="text-[#8493B3]">
                {teacher.totalStudents} students
              </span>
            </div>
          </div>
        </div>

        {/* Bio Excerpt */}
        <p className="text-xs md:text-sm text-[#B8C5E0] line-clamp-2 leading-relaxed mb-4">
          {teacher.bio}
        </p>

        {/* Subject Fit Tags */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5">
            {teacher.subjects.slice(0, 3).map((sub) => (
              <span
                key={sub}
                className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-white/[0.06] text-[#B8C5E0] border border-white/10"
              >
                {sub}
              </span>
            ))}
            {teacher.subjects.length > 3 && (
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.04] text-[#8493B3] border border-white/10">
                +{teacher.subjects.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Scan Details: Languages + Experience + Next Available Time */}
        <div className="grid grid-cols-2 gap-2 text-xs text-[#B8C5E0] pt-3 pb-4 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-white/40 shrink-0" />
            <span className="truncate">{teacher.languages.join(", ")}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-white/40 shrink-0" />
            <span>{teacher.yearsExperience} yrs experience</span>
          </div>

          <div className="col-span-2 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 border border-white/10 text-[11px]">
            <div className="flex items-center gap-1.5 font-medium text-[#F8FAFF]">
              <Calendar className="h-3.5 w-3.5 text-[#8EA7FF] shrink-0" />
              <span>Next: {teacher.nextAvailableTime}</span>
            </div>
            <span className="font-semibold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Available
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Monthly Tuition + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-white/10">
        <div className="flex items-center justify-between sm:block">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-[#F8FAFF] font-display">
              {formatTk(teacher.monthlyTuition)}
            </span>
            <span className="text-xs text-[#8493B3] font-medium">/ month</span>
          </div>
          <span className="inline-flex items-center text-[10px] font-semibold text-[#B8C5E0] bg-white/[0.08] px-2 py-0.5 rounded-full border border-white/10">
            Monthly Plan
          </span>
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          {/* Direct Message Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMessageClick ? onMessageClick(teacher) : navigate(`/messages?to=${teacher.userId}`)}
            aria-label={`Send message to ${teacher.name}`}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl border-white/12 bg-white/[0.06] text-[#B8C5E0] hover:text-white hover:bg-white/15 shrink-0 cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>

          {/* Secondary Action: Book Lesson */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/teachers/${teacher.userId}#booking`)}
            className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl border-white/12 bg-white/[0.06] hover:bg-white/15 text-[#F8FAFF] text-xs font-semibold cursor-pointer shrink-0"
          >
            Book Lesson
          </Button>

          {/* Primary Action: View Profile */}
          <Button
            size="sm"
            onClick={() => navigate(`/teachers/${teacher.userId}`)}
            className="h-8 sm:h-9 px-3.5 sm:px-4 rounded-xl bg-[#4169E1] hover:bg-[#5B7CFF] text-white text-xs font-semibold shadow-[0_4px_16px_rgba(65,105,225,0.35)] inline-flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shrink-0"
          >
            <span>View Profile</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
