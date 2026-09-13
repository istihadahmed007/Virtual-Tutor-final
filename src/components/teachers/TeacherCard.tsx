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
      className={`group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-[#6D5DFB]/40 hover:shadow-[0_12px_32px_rgba(49,46,129,0.08)] ${className}`}
    >
      <div>
        {/* Top Header: Avatar + Name + Verified Badge + Match Chip */}
        <div className="flex items-start gap-3.5 mb-3.5">
          <div className="relative shrink-0">
            {teacher.avatarUrl ? (
              <img
                src={teacher.avatarUrl}
                alt={teacher.name}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-[#312E81] font-bold text-lg ring-2 ring-slate-200">
                {teacher.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            {teacher.isVerified ? (
              <div 
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#14B8A6] text-white shadow-xs"
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
                className="text-base font-bold text-[#0F172A] hover:text-[#6D5DFB] cursor-pointer truncate transition-colors font-display"
              >
                {teacher.name}
              </h3>

              {/* Match Reason Chip */}
              {matchReason && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#6D5DFB] border border-violet-100 shrink-0">
                  <Sparkles className="h-3 w-3 text-[#6D5DFB]" />
                  <span>{matchReason}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 line-clamp-1 font-medium mb-1.5">
              {teacher.title}
            </p>

            {/* Authoritative Rating & Review Count */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-1 font-bold text-amber-500">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{teacher.rating.toFixed(2)}</span>
              </div>
              <span className="text-slate-300">·</span>
              <span className="text-slate-600 font-medium">
                {teacher.reviewCount} reviews
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400">
                {teacher.totalStudents} students
              </span>
            </div>
          </div>
        </div>

        {/* Bio Excerpt */}
        <p className="text-xs md:text-sm text-slate-600 line-clamp-2 leading-relaxed mb-4">
          {teacher.bio}
        </p>

        {/* Subject Fit Tags */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5">
            {teacher.subjects.slice(0, 3).map((sub) => (
              <span
                key={sub}
                className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-[#0F172A] border border-slate-200"
              >
                {sub}
              </span>
            ))}
            {teacher.subjects.length > 3 && (
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-white text-slate-500 border border-slate-200">
                +{teacher.subjects.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Scan Details: Languages + Experience + Next Available Time */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-3 pb-4 border-t border-slate-200">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{teacher.languages.join(", ")}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{teacher.yearsExperience} yrs experience</span>
          </div>

          <div className="col-span-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-200 text-[11px]">
            <div className="flex items-center gap-1.5 font-medium text-[#0F172A]">
              <Calendar className="h-3.5 w-3.5 text-[#6D5DFB] shrink-0" />
              <span>Next: {teacher.nextAvailableTime}</span>
            </div>
            <span className="font-semibold text-teal-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
              Available
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Monthly Tuition + Actions */}
      <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-slate-200">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-[#0F172A] font-display">
              {formatTk(teacher.monthlyTuition)}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ month</span>
          </div>
          <span className="inline-flex items-center text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            Monthly Plan
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Direct Message Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMessageClick ? onMessageClick(teacher) : navigate(`/messages?to=${teacher.userId}`)}
            aria-label={`Send message to ${teacher.name}`}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full border-slate-200 text-slate-700 hover:text-[#6D5DFB] hover:border-[#6D5DFB]/40"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>

          {/* Secondary Action: Book Lesson */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/teachers/${teacher.userId}#booking`)}
            className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-full border-slate-200 hover:border-[#312E81] text-[#0F172A] text-xs font-semibold cursor-pointer"
          >
            Book Lesson
          </Button>

          {/* Primary Action: View Profile */}
          <Button
            size="sm"
            onClick={() => navigate(`/teachers/${teacher.userId}`)}
            className="h-8 sm:h-9 px-3.5 sm:px-4 rounded-full bg-[#312E81] hover:bg-[#6D5DFB] text-white text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>View Profile</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
