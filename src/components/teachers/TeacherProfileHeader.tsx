import { 
  Star, 
  CheckCircle2, 
  Globe, 
  MapPin, 
  Clock, 
  GraduationCap, 
  Users, 
  BookOpen
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
      className={`rounded-3xl border border-white/12 bg-white/[0.04] backdrop-blur-xl p-6 md:p-8 text-white shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] ${className}`}
    >
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Large Avatar */}
        <div className="relative shrink-0">
          {teacher.avatarUrl ? (
            <img
              src={teacher.avatarUrl}
              alt={teacher.name}
              className="h-24 w-24 md:h-28 md:w-28 rounded-2xl object-cover ring-2 ring-white/20 shadow-lg"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-2xl bg-white/10 text-white font-bold text-2xl ring-2 ring-white/20 shadow-lg">
              {teacher.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          {teacher.isVerified && (
            <div
              className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-white shadow-md ring-2 ring-black"
              title="Verified Identity & Credentials"
            >
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight font-display">
              {teacher.name}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-0.5 text-xs font-semibold text-teal-300 border border-teal-400/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              Verified Educator
            </span>
          </div>

          <p className="text-sm text-white/75 font-normal leading-relaxed mb-4">
            {teacher.title}
          </p>

          {/* Key Metrics Grid */}
          <div className="flex flex-wrap items-center gap-y-2.5 gap-x-4 text-xs text-white/70 mb-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm text-white font-display">{teacher.rating.toFixed(2)}</span>
              <span className="text-white/40 font-normal">
                ({teacher.reviewCount} reviews)
              </span>
            </div>

            <span className="text-white/20 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5 font-medium text-white/80">
              <Users className="h-3.5 w-3.5 text-violet-400" />
              <span>{teacher.totalStudents} active students</span>
            </div>

            <span className="text-white/20 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5 font-medium text-white/80">
              <BookOpen className="h-3.5 w-3.5 text-violet-400" />
              <span>{teacher.totalHours}+ hours taught</span>
            </div>

            <span className="text-white/20 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5 font-medium text-white/80">
              <GraduationCap className="h-3.5 w-3.5 text-violet-400" />
              <span>{teacher.yearsExperience} years experience</span>
            </div>
          </div>

          {/* Details Row: Location, Timezone, Languages */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-violet-400/70" />
              <span>{teacher.country}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-violet-400/70" />
              <span>Timezone: {teacher.timezone}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-violet-400/70" />
              <span>Teaches in {teacher.languages.join(", ")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
