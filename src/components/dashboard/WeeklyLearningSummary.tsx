import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  Calendar, 
  Clock, 
  FileText, 
  Target, 
  ArrowRight, 
  TrendingUp, 
  CheckCircle2, 
  Edit2,
  Video
} from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "../ui/dialog";

interface WeeklyLearningSummaryProps {
  nextLesson?: {
    _id: string;
    subject: string;
    scheduledAt: number;
    durationMinutes?: number;
    teacherName?: string;
    meetingRoomUrl?: string;
  } | null;
  pendingAssignmentsCount: number;
  soonestAssignmentDueDate?: number;
  hoursStudiedThisWeek: number;
  weeklyTargetHours?: number;
  onUpdateTargetHours?: (target: number) => void;
  className?: string;
}

export function WeeklyLearningSummary({
  nextLesson,
  pendingAssignmentsCount,
  soonestAssignmentDueDate,
  hoursStudiedThisWeek,
  weeklyTargetHours = 5,
  onUpdateTargetHours,
  className = "",
}: WeeklyLearningSummaryProps) {
  const navigate = useNavigate();

  const [target, setTarget] = useState(weeklyTargetHours);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [customTargetInput, setCustomTargetInput] = useState(weeklyTargetHours.toString());

  const progressPercent = Math.min(
    100,
    Math.round((hoursStudiedThisWeek / (target > 0 ? target : 5)) * 100)
  );

  const formatDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleSaveTarget = () => {
    const val = parseFloat(customTargetInput);
    if (!isNaN(val) && val > 0 && val <= 40) {
      setTarget(val);
      try {
        localStorage.setItem("vtp_weekly_target_hours", val.toString());
      } catch (_) {}
      if (onUpdateTargetHours) onUpdateTargetHours(val);
    }
    setIsEditingTarget(false);
  };

  return (
    <div
      role="region"
      aria-label="Weekly Learning Workspace Summary"
      className={`rounded-2xl border border-teal-100/80 bg-white p-6 md:p-7 shadow-xs ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/50">
              <TrendingUp className="w-3.5 h-3.5" />
              Active Learning Pace
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
            This Week's Overview
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsEditingTarget(true)}
          className="inline-flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-800 font-medium px-2.5 py-1.5 rounded-lg hover:bg-teal-50/70 transition"
        >
          <Target className="w-3.5 h-3.5" />
          <span>Weekly Target: {target} hrs</span>
          <Edit2 className="w-3 h-3 text-teal-500 ml-0.5" />
        </button>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Next Lesson Box */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                Next Lesson
              </span>
              {nextLesson && (
                <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/50">
                  Confirmed
                </span>
              )}
            </div>

            {nextLesson ? (
              <>
                <p className="text-sm font-bold text-slate-900 line-clamp-1">
                  {nextLesson.subject}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {nextLesson.teacherName ? `with ${nextLesson.teacherName}` : "1-on-1 Class"}
                </p>
                <p className="text-xs font-medium text-teal-700 mt-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDateTime(nextLesson.scheduledAt)}
                </p>
              </>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-700">None scheduled</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Book a session to keep your streak going.
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/60">
            {nextLesson ? (
              <Button
                size="sm"
                onClick={() => navigate(`/classroom?session=${nextLesson._id}`)}
                className="w-full h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg inline-flex items-center justify-center gap-1.5 font-medium"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Prepare / Join Class</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/teachers")}
                className="w-full h-8 text-xs border-slate-200 text-slate-700 hover:bg-white rounded-lg inline-flex items-center justify-center gap-1 font-medium"
              >
                <span>Book a lesson</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </Button>
            )}
          </div>
        </div>

        {/* Assignments Due Box */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                Assignments Due
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  pendingAssignmentsCount > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {pendingAssignmentsCount}
              </span>
            </div>

            {pendingAssignmentsCount > 0 ? (
              <>
                <p className="text-sm font-bold text-slate-900">
                  {pendingAssignmentsCount} pending task{pendingAssignmentsCount > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {soonestAssignmentDueDate
                    ? `Next due ${formatDateTime(soonestAssignmentDueDate)}`
                    : "Submit before upcoming classes"}
                </p>
              </>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  No homework due before your next session.
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/assignments")}
              className="w-full h-8 text-xs border-slate-200 text-slate-700 hover:bg-white rounded-lg inline-flex items-center justify-center gap-1 font-medium"
            >
              <span>View assignments</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Weekly Study Hours & Target Box */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-teal-600" />
                Weekly Target
              </span>
              <span className="text-xs font-bold text-teal-700">
                {progressPercent}%
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">
                {hoursStudiedThisWeek.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                / {target} hrs
              </span>
            </div>

            <div className="mt-2.5">
              <Progress value={progressPercent} className="h-2 bg-slate-200/70" />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {progressPercent >= 100
                ? "🎉 Great work! You reached your goal for this week."
                : `${(target - hoursStudiedThisWeek > 0 ? (target - hoursStudiedThisWeek).toFixed(1) : "0")} hrs remaining to hit your target.`}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/progress")}
              className="w-full h-8 text-xs border-slate-200 text-slate-700 hover:bg-white rounded-lg inline-flex items-center justify-center gap-1 font-medium"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </Button>
          </div>
        </div>
      </div>

      {/* Target Setting Dialog */}
      <Dialog open={isEditingTarget} onOpenChange={setIsEditingTarget}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Set Weekly Study Target
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              How many hours of live lessons and study would you like to achieve per week?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 block">
              Hours per Week
            </label>
            <div className="flex gap-2 mb-4">
              {[3, 5, 8, 10, 15].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCustomTargetInput(preset.toString())}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    customTargetInput === preset.toString()
                      ? "bg-teal-50 border-teal-500 text-teal-800"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {preset} hrs
                </button>
              ))}
            </div>

            <input
              type="number"
              min="1"
              max="40"
              step="0.5"
              value={customTargetInput}
              onChange={(e) => setCustomTargetInput(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="e.g. 5"
            />
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsEditingTarget(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTarget}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium"
            >
              Save Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
