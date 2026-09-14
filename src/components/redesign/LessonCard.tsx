import React from "react";
import { Video, Clock, Calendar, ArrowRight, User } from "lucide-react";
import { useNavigate } from "react-router";

export interface LessonCardData {
  _id: string;
  title?: string;
  subject?: string;
  teacherName?: string;
  studentName?: string;
  scheduledAt: number;
  durationMinutes?: number;
  status?: "scheduled" | "live" | "completed" | "cancelled";
  meetingCode?: string;
}

interface LessonCardProps {
  lesson: LessonCardData;
  onJoin?: () => void;
  className?: string;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  onJoin,
  className = "",
}) => {
  const navigate = useNavigate();

  const isLive = lesson.status === "live" || (lesson.scheduledAt && Math.abs(Date.now() - lesson.scheduledAt) < 15 * 60 * 1000);
  const formattedDate = lesson.scheduledAt
    ? new Date(lesson.scheduledAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Today";
  const formattedTime = lesson.scheduledAt
    ? new Date(lesson.scheduledAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "10:00 AM";

  const handleAction = () => {
    if (onJoin) {
      onJoin();
    } else {
      navigate(`/classroom/${lesson._id || lesson.meetingCode || "session"}`);
    }
  };

  return (
    <div
      className={`bg-white/[0.055] backdrop-blur-xl rounded-2xl border border-white/10 p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.18)] transition-all duration-300 hover:border-[#4169E1]/40 hover:bg-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isLive ? "bg-emerald-500 text-white shadow-sm" : "bg-[#4169E1]/15 text-[#8EA7FF] border border-[#4169E1]/30"
          }`}
        >
          <Video className="w-5 h-5" />
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm sm:text-base text-[#F8FAFF]">
              {lesson.title || `${lesson.subject || "Academic"} Lesson`}
            </h4>
            {isLive && (
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE NOW
              </span>
            )}
            <span className="text-[11px] font-medium text-[#8EA7FF] bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-white/10">
              {lesson.subject || "General"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#B8C5E0] mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 font-medium text-[#F8FAFF]">
              <User className="w-3.5 h-3.5 text-[#8493B3]" />
              {lesson.teacherName || "Instructor"}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#8493B3]" />
              {formattedDate} at {formattedTime}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#8493B3]" />
              {lesson.durationMinutes || 60}m
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:self-center shrink-0">
        <button
          onClick={handleAction}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            isLive
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
              : "bg-[#4169E1] hover:bg-[#5B7CFF] text-white shadow-xs"
          }`}
        >
          <span>{isLive ? "Join Classroom" : "Enter Room"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
