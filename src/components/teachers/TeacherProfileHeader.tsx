import { 
  Star, 
  CheckCircle2, 
  Globe, 
  MapPin, 
  Clock, 
  Award, 
  GraduationCap, 
  Users, 
  BookOpen,
  Sparkles
} from "lucide-react";
import { AuthoritativeTeacher } from "@/lib/teacher-authoritative-data";

interface TeacherProfileHeaderProps {
  teacher: AuthoritativeTeacher;
  className?: string;
}

export function TeacherProfileHeader({
  teacher,
  className = "",
}: TeacherProfileHeaderProps) {
  return (
    <div
      role="banner"
      aria-label={`${teacher.name} Profile Overview`}
      className={`rounded-3xl border border-[#E5E4DE] bg-white p-6 md:p-8 shadow-xs ${className}`}
    >
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Large Avatar */}
        <div className="relative shrink-0">
          {teacher.avatarUrl ? (
            <img
              src={teacher.avatarUrl}
              alt={teacher.name}
              className="h-24 w-24 md:h-28 md:w-28 rounded-2xl object-cover ring-4 ring-[#F5F4EF]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-2xl bg-[#F5F4EF] text-[#111111] font-bold text-2xl ring-4 ring-[#F5F4EF]">
              {teacher.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          {teacher.isVerified && (
            <div
              className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#F26522] text-white shadow-sm ring-2 ring-white"
              title="Verified Identity & Credentials"
            >
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h1 className="text-xl md:text-2xl font-bold text-[#111111] tracking-tight font-display">
              {teacher.name}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F4EF] px-3 py-0.5 text-xs font-semibold text-[#111111] border border-[#E5E4DE]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#F26522]" />
              Verified Educator
            </span>
          </div>

          <p className="text-sm text-[#111111]/70 font-medium leading-relaxed mb-3">
            {teacher.title}
          </p>

          {/* Key Metrics Grid */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-[#111111]/70 mb-4 pb-4 border-b border-[#E5E4DE]/60">
            <div className="flex items-center gap-1.5 font-bold text-amber-500">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm text-[#111111] font-display">{teacher.rating.toFixed(2)}</span>
              <span className="text-[#111111]/50 font-normal">
                ({teacher.reviewCount} reviews)
              </span>
            </div>

            <span className="text-[#111111]/20 hidden sm:inline">|</span>

            <div className="flex items-center gap-1.5 font-medium">
              <Users className="h-3.5 w-3.5 text-[#F26522]" />
              <span>{teacher.totalStudents} active students</span>
            </div>

            <span className="text-[#111111]/20 hidden sm:inline">|</span>

            <div className="flex items-center gap-1.5 font-medium">
              <BookOpen className="h-3.5 w-3.5 text-[#F26522]" />
              <span>{teacher.totalHours}+ hours taught</span>
            </div>

            <span className="text-[#111111]/20 hidden sm:inline">|</span>

            <div className="flex items-center gap-1.5 font-medium">
              <GraduationCap className="h-3.5 w-3.5 text-[#F26522]" />
              <span>{teacher.yearsExperience} years experience</span>
            </div>
          </div>

          {/* Details Row: Location, Timezone, Languages */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{teacher.country}</span>
            </div>

            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Timezone: {teacher.timezone}</span>
            </div>

            <div className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <span>Teaches in {teacher.languages.join(", ")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
