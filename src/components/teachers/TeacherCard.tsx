import { useNavigate } from "react-router";
import { 
  Star, 
  CheckCircle2, 
  Globe, 
  Clock, 
  Calendar, 
  MessageSquare, 
  Sparkles, 
  GraduationCap, 
  ArrowRight,
  ShieldCheck
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

  const handleViewAvailability = () => {
    navigate(`/teachers/${teacher.userId}#availability`);
  };

  const handleCardClick = () => {
    navigate(`/teachers/${teacher.userId}`);
  };

  return (
    <div
      role="article"
      aria-label={`Teacher Profile: ${teacher.name}`}
      className={`group relative flex flex-col justify-between rounded-3xl border border-[#E5E4DE] bg-white p-6 shadow-xs transition-all hover:border-[#111111]/40 hover:shadow-md ${className}`}
    >
      <div>
        {/* Top Header: Avatar + Name + Verified Badge + Match Chip */}
        <div className="flex items-start gap-3.5 mb-3.5">
          <div className="relative shrink-0">
            {teacher.avatarUrl ? (
              <img
                src={teacher.avatarUrl}
                alt={teacher.name}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-[#E5E4DE]"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5F4EF] text-[#111111] font-bold text-lg ring-2 ring-[#E5E4DE]">
                {teacher.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            {teacher.isVerified && (
              <div 
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F26522] text-white shadow-xs"
                title="Verified Educator"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
              <h3 
                onClick={handleCardClick}
                className="text-base font-bold text-[#111111] hover:text-[#F26522] cursor-pointer truncate transition-colors font-display"
              >
                {teacher.name}
              </h3>

              {/* Match Reason Chip */}
              {matchReason && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F4EF] px-2.5 py-0.5 text-[11px] font-semibold text-[#111111] border border-[#E5E4DE] shrink-0">
                  <Sparkles className="h-3 w-3 text-[#F26522]" />
                  <span>{matchReason}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-[#111111]/70 line-clamp-1 font-medium mb-1.5">
              {teacher.title}
            </p>

            {/* Authoritative Rating & Review Count */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-1 font-bold text-amber-500">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{teacher.rating.toFixed(2)}</span>
              </div>
              <span className="text-[#111111]/30">·</span>
              <span className="text-[#111111]/70 font-medium">
                {teacher.reviewCount} reviews
              </span>
              <span className="text-[#111111]/30">·</span>
              <span className="text-[#111111]/50">
                {teacher.totalStudents} students
              </span>
            </div>
          </div>
        </div>

        {/* Bio Excerpt */}
        <p className="text-xs md:text-sm text-[#111111]/70 line-clamp-2 leading-relaxed mb-4">
          {teacher.bio}
        </p>

        {/* Subject Fit Tags */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5">
            {teacher.subjects.slice(0, 3).map((sub) => (
              <span
                key={sub}
                className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#F5F4EF] text-[#111111] border border-[#E5E4DE]"
              >
                {sub}
              </span>
            ))}
            {teacher.subjects.length > 3 && (
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-white text-[#111111]/60 border border-[#E5E4DE]">
                +{teacher.subjects.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Scan Details: Languages + Experience + Next Available Time */}
        <div className="grid grid-cols-2 gap-2 text-xs text-[#111111]/70 pt-3 pb-4 border-t border-[#E5E4DE]">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-[#111111]/40 shrink-0" />
            <span className="truncate">{teacher.languages.join(", ")}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-[#111111]/40 shrink-0" />
            <span>{teacher.yearsExperience} yrs experience</span>
          </div>

          <div className="col-span-2 flex items-center justify-between rounded-xl bg-[#F5F4EF] px-3 py-2 border border-[#E5E4DE] text-[11px]">
            <div className="flex items-center gap-1.5 font-medium text-[#111111]">
              <Calendar className="h-3.5 w-3.5 text-[#F26522] shrink-0" />
              <span>Next: {teacher.nextAvailableTime}</span>
            </div>
            <span className="font-semibold text-[#111111] bg-white px-2.5 py-0.5 rounded-full border border-[#E5E4DE]">
              Available
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Monthly Tuition + Actions */}
      <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-[#E5E4DE]">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-[#111111] font-display">
              {formatTk(teacher.monthlyTuition)}
            </span>
            <span className="text-xs text-[#111111]/60 font-medium">/ month</span>
          </div>
          <span className="inline-flex items-center text-[10px] font-semibold text-[#111111]/80 bg-[#F5F4EF] px-2 py-0.5 rounded-full border border-[#E5E4DE]">
            Monthly Plan
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct Message Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMessageClick ? onMessageClick(teacher) : navigate(`/messages?to=${teacher.userId}`)}
            aria-label={`Send message to ${teacher.name}`}
            className="h-9 w-9 p-0 rounded-full border-[#E5E4DE] text-[#111111] hover:text-[#F26522] hover:border-[#111111]/40"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>

          {/* Primary Action: Explicitly "View availability" */}
          <Button
            size="sm"
            onClick={handleViewAvailability}
            className="h-9 px-4 rounded-full bg-[#111111] hover:bg-[#F26522] text-white text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <span>View availability</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
