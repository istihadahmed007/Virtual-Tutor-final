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
      className={`bg-white rounded-2xl border border-[#E5E4DE] p-4 sm:p-5 transition-all duration-300 hover:border-[#111111]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isLive ? "bg-[#F26522] text-white" : "bg-[#F5F4EF] text-[#111111]"
          }`}
        >
          <Video className="w-5 h-5" />
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm sm:text-base text-[#111111]">
              {lesson.title || `${lesson.subject || "Academic"} Lesson`}
            </h4>
            {isLive && (
              <span className="inline-flex items-center gap-1 bg-[#F26522]/10 text-[#F26522] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#F26522]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F26522] animate-pulse" />
                LIVE NOW
              </span>
            )}
            <span className="text-[11px] font-medium text-[#111111]/60 bg-[#F5F4EF] px-2 py-0.5 rounded-full border border-[#E5E4DE]">
              {lesson.subject || "General"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#111111]/60 mt-1 flex-wrap">
            <span className="flex items-center gap-1 font-medium text-[#111111]/80">
              <User className="w-3.5 h-3.5 text-[#111111]/40" />
              {lesson.teacherName || "Instructor"}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#111111]/40" />
              {formattedDate} at {formattedTime}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#111111]/40" />
              {lesson.durationMinutes || 60}m
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:self-center shrink-0">
        <button
          onClick={handleAction}
          className={`w-full sm:w-auto px-4 py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isLive
              ? "bg-[#F26522] hover:bg-[#e05a1a] text-white shadow-xs"
              : "bg-[#111111] hover:bg-[#222222] text-white"
          }`}
        >
          <span>{isLive ? "Join Classroom Now" : "Enter Room"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
