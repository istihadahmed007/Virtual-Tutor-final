import { ReactNode } from "react";
import { useNavigate } from "react-router";
import { 
  Calendar, 
  FileText, 
  TrendingUp, 
  MessageSquare, 
  Video, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2,
  Clock,
  UserCheck
} from "lucide-react";
import { Button } from "../ui/button";

export type DashboardEmptyStateType = 
  | "lessons" 
  | "assignments" 
  | "progress" 
  | "messages" 
  | "classes"
  | "custom";

interface DashboardEmptyStateProps {
  type: DashboardEmptyStateType;
  title?: string;
  explanation?: string;
  whyEmpty?: string;
  actionLabel?: string;
  actionPath?: string;
  onAction?: () => void;
  previewContent?: ReactNode;
  className?: string;
}

const DEFAULT_CONFIGS: Record<DashboardEmptyStateType, {
  icon: typeof Calendar;
  title: string;
  explanation: string;
  whyEmpty: string;
  actionLabel: string;
  actionPath: string;
  previewCard?: {
    tag: string;
    title: string;
    sub: string;
    meta: string;
  };
}> = {
  lessons: {
    icon: Calendar,
    title: "No Upcoming Lessons Scheduled",
    explanation: "Scheduled 1-on-1 and small group live video sessions with your verified educators appear here.",
    whyEmpty: "You haven't scheduled your first lesson yet. Choose a tutor and reserve a slot.",
    actionLabel: "Find a Teacher & Book",
    actionPath: "/teachers",
    previewCard: {
      tag: "Preview: Active Lesson View",
      title: "AP Calculus BC · Derivatives & Optimization",
      sub: "With your verified instructor · Live Interactive Whiteboard",
      meta: "45 mins · 1-on-1 Private Session",
    },
  },
  assignments: {
    icon: FileText,
    title: "No Assignments Due",
    explanation: "Homework, practice problem sets, essay drafts, and exercise sheets assigned by your tutors appear here.",
    whyEmpty: "Assignments are assigned by your teacher during or immediately following your live sessions.",
    actionLabel: "Browse Teachers",
    actionPath: "/teachers",
    previewCard: {
      tag: "Preview: Sample Assignment",
      title: "Problem Set 4: Integration by Parts",
      sub: "5 problems · Digital worksheet with step-by-step submission",
      meta: "Due within 4 days after lesson",
    },
  },
  progress: {
    icon: TrendingUp,
    title: "Learning Analytics Awaiting First Lesson",
    explanation: "Tracks total hours learned, attended sessions, weekly study goals, subject mastery, and teacher notes.",
    whyEmpty: "Progress tracking unlocks automatically as soon as you complete your first live classroom lesson.",
    actionLabel: "Schedule First Lesson",
    actionPath: "/teachers",
    previewCard: {
      tag: "Preview: What You'll Track",
      title: "Subject Mastery & Attendance Streaks",
      sub: "Calculus: 85% · Physics: 90% · 4-week active study streak",
      meta: "Updated in real-time by your tutors",
    },
  },
  messages: {
    icon: MessageSquare,
    title: "No Conversations Yet",
    explanation: "Direct messaging with verified teachers to discuss syllabus, schedule adjustments, or ask quick doubts.",
    whyEmpty: "Reach out to any teacher directly from their profile to start a conversation.",
    actionLabel: "Find Teachers to Message",
    actionPath: "/teachers",
    previewCard: {
      tag: "Preview: Direct Teacher Chat",
      title: "Live Q&A with Tutors",
      sub: "Send questions and share curriculum files before booking",
      meta: "Average response time: < 1 hour",
    },
  },
  classes: {
    icon: Video,
    title: "No Class Recordings or Notes",
    explanation: "High-definition lesson recordings, chat transcripts, and exported whiteboard drawings are archived here.",
    whyEmpty: "Your recorded sessions and shared notes will be automatically saved after you complete a live class.",
    actionLabel: "Book Your Next Class",
    actionPath: "/teachers",
    previewCard: {
      tag: "Preview: Class Archive",
      title: "Lesson Recording & Whiteboard Export",
      sub: "Full video replay + PDF notes download",
      meta: "Permanent access across all devices",
    },
  },
  custom: {
    icon: Sparkles,
    title: "No Items to Display",
    explanation: "Content will appear here as your learning journey progresses.",
    whyEmpty: "Complete actions to unlock this section.",
    actionLabel: "Explore Features",
    actionPath: "/dashboard",
  },
};

export function DashboardEmptyState({
  type,
  title,
  explanation,
  whyEmpty,
  actionLabel,
  actionPath,
  onAction,
  previewContent,
  className = "",
}: DashboardEmptyStateProps) {
  const navigate = useNavigate();
  const config = DEFAULT_CONFIGS[type] || DEFAULT_CONFIGS.custom;
  const Icon = config.icon;

  const displayTitle = title || config.title;
  const displayExplanation = explanation || config.explanation;
  const displayWhyEmpty = whyEmpty || config.whyEmpty;
  const displayActionLabel = actionLabel || config.actionLabel;
  const displayActionPath = actionPath || config.actionPath;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (displayActionPath) {
      navigate(displayActionPath);
    }
  };

  return (
    <div
      role="region"
      aria-label={displayTitle}
      className={`relative overflow-hidden rounded-2xl border border-dashed border-teal-200/80 bg-gradient-to-b from-teal-50/40 via-white to-stone-50/50 p-6 md:p-8 text-center transition-all ${className}`}
    >
      <div className="mx-auto max-w-lg">
        {/* Subtle Icon Badge */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100/70 text-teal-700 shadow-sm ring-4 ring-teal-50">
          <Icon className="h-7 w-7 stroke-[1.75]" aria-hidden="true" />
        </div>

        {/* Title */}
        <h4 className="text-base md:text-lg font-semibold text-slate-900 tracking-tight mb-2">
          {displayTitle}
        </h4>

        {/* Concise Explanation */}
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          {displayExplanation}
        </p>

        {/* Why Empty Callout Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/80 border border-amber-200/70 text-amber-800 text-xs font-medium mb-5">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{displayWhyEmpty}</span>
        </div>

        {/* Preview / Example Content if provided or available in config */}
        {previewContent ? (
          <div className="mb-6 text-left">{previewContent}</div>
        ) : config.previewCard ? (
          <div className="mb-6 rounded-xl border border-slate-200/80 bg-white/90 p-4 text-left shadow-xs transition hover:border-teal-300/80">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                <Sparkles className="h-3 w-3 text-teal-600" />
                {config.previewCard.tag}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Sample Outline</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-0.5">
              {config.previewCard.title}
            </p>
            <p className="text-xs text-slate-500 mb-2">
              {config.previewCard.sub}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
              {config.previewCard.meta}
            </div>
          </div>
        ) : null}

        {/* Single Contextual Next Action */}
        <div>
          <Button
            onClick={handleAction}
            className="h-10 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-xs transition-transform active:scale-[0.98] inline-flex items-center gap-2"
          >
            <span>{displayActionLabel}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
