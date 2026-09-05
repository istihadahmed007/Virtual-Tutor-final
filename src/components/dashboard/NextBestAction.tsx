import { useNavigate } from "react-router";
import { 
  Video, 
  FileText, 
  CalendarPlus, 
  MessageSquare, 
  ArrowRight, 
  Sparkles,
  Clock,
  CheckCircle,
  Award
} from "lucide-react";
import { Button } from "../ui/button";

export type NextActionState = 
  | "prepare_lesson" 
  | "complete_assignment" 
  | "book_next_lesson" 
  | "review_feedback";

interface NextBestActionProps {
  state: NextActionState;
  lesson?: {
    _id: string;
    subject: string;
    scheduledAt: number;
    teacherName?: string;
  } | null;
  pendingAssignment?: {
    _id: string;
    title: string;
    subject: string;
    dueDate?: number;
  } | null;
  completedLessonsCount?: number;
  className?: string;
}

export function NextBestAction({
  state,
  lesson,
  pendingAssignment,
  completedLessonsCount = 0,
  className = "",
}: NextBestActionProps) {
  const navigate = useNavigate();

  const renderContent = () => {
    switch (state) {
      case "prepare_lesson": {
        const timeStr = lesson?.scheduledAt
          ? new Date(lesson.scheduledAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "soon";

        const now = Date.now();
        const isWithinWindow = lesson?.scheduledAt ? lesson.scheduledAt - 15 * 60 * 1000 <= now : false;

        return {
          badge: isWithinWindow ? "Classroom Open Now" : "Upcoming Live Lesson",
          badgeIcon: Video,
          title: isWithinWindow
            ? `Join ${lesson?.subject || "Live Session"} Now`
            : `Prepare for ${lesson?.subject || "Your Lesson"}`,
          description: isWithinWindow
            ? `Your classroom with ${lesson?.teacherName || "your educator"} is currently active and waiting for you.`
            : `Your 1-on-1 session with ${lesson?.teacherName || "your educator"} starts at ${timeStr}. Audio and camera check is available now in the waiting room.`,
          actionLabel: isWithinWindow ? "Join Live Class" : "Open Classroom (Waiting Room)",
          actionIcon: Video,
          onAction: () => {
            if (lesson?._id) {
              navigate(`/classroom/${lesson._id}`);
            } else {
              navigate("/lessons");
            }
          },
          secondaryActionLabel: "View Lesson Details",
          onSecondaryAction: () => navigate("/lessons"),
        };
      }

      case "complete_assignment": {
        return {
          badge: "Assignment Pending",
          badgeIcon: FileText,
          title: `Complete "${pendingAssignment?.title || "Pending Assignment"}"`,
          description: `You have an assignment due in ${pendingAssignment?.subject || "your coursework"}. Submit your work early so your tutor can prepare feedback before your next class.`,
          actionLabel: "Start Assignment",
          actionIcon: FileText,
          onAction: () => navigate("/assignments"),
          secondaryActionLabel: "View All Tasks",
          onSecondaryAction: () => navigate("/assignments"),
        };
      }

      case "review_feedback": {
        return {
          badge: "Teacher Feedback Ready",
          badgeIcon: Award,
          title: "Review Notes & Feedback From Your Last Class",
          description: "Your tutor left personalized study tips and topic mastery notes. Reviewing feedback solidifies retention.",
          actionLabel: "Review Teacher Feedback",
          actionIcon: Award,
          onAction: () => navigate("/progress"),
          secondaryActionLabel: "Book Next Session",
          onSecondaryAction: () => navigate("/teachers"),
        };
      }

      case "book_next_lesson":
      default: {
        return {
          badge: "Maintain Momentum",
          badgeIcon: CalendarPlus,
          title: completedLessonsCount > 0 
            ? "Schedule Your Next Live Lesson" 
            : "Book Your Next Learning Session",
          description: "Keep your weekly study streak active. Choose a verified educator in Mathematics, Physics, Programming, or Languages.",
          actionLabel: "Browse Available Tutors",
          actionIcon: CalendarPlus,
          onAction: () => navigate("/teachers"),
          secondaryActionLabel: "View Study Plan",
          onSecondaryAction: () => navigate("/progress"),
        };
      }
    }
  };

  const config = renderContent();
  const BadgeIcon = config.badgeIcon;
  const ActionIcon = config.actionIcon;

  return (
    <div
      role="region"
      aria-label="Next Recommended Step"
      className={`relative overflow-hidden rounded-2xl border border-teal-200/90 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-6 md:p-8 text-white shadow-md ${className}`}
    >
      {/* Background Accent Gradients */}
      <div 
        className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl" 
        aria-hidden="true" 
      />
      <div 
        className="pointer-events-none absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" 
        aria-hidden="true" 
      />

      <div className="relative z-10 max-w-2xl">
        {/* Top Eyebrow Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30 mb-3.5 backdrop-blur-xs">
          <BadgeIcon className="w-3.5 h-3.5 text-teal-300" />
          <span>{config.badge}</span>
        </div>

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2">
          {config.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-teal-100/90 leading-relaxed mb-6 max-w-xl">
          {config.description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={config.onAction}
            className="h-10 px-5 rounded-xl bg-teal-400 hover:bg-teal-300 text-teal-950 font-semibold text-sm shadow-sm transition-transform active:scale-[0.98] inline-flex items-center gap-2"
          >
            <ActionIcon className="w-4 h-4" />
            <span>{config.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>

          {config.secondaryActionLabel && (
            <Button
              variant="outline"
              onClick={config.onSecondaryAction}
              className="h-10 px-4 rounded-xl border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium text-xs md:text-sm backdrop-blur-xs"
            >
              {config.secondaryActionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
