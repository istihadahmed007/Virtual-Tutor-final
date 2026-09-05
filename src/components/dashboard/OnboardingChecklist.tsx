import { useState } from "react";
import { useNavigate } from "react-router";
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Sparkles, 
  Compass, 
  UserCheck, 
  Search, 
  CalendarCheck,
  ChevronRight,
  BookOpen,
  Check
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
import { subjects, learningGoals } from "@/lib/data";

export interface OnboardingStatus {
  hasGoals: boolean;
  hasProfile: boolean;
  hasViewedTeachers: boolean;
  hasBookedLesson: boolean;
}

interface OnboardingChecklistProps {
  status: OnboardingStatus;
  onUpdateGoals?: (selectedSubjects: string[], goal: string) => void;
  className?: string;
}

export function OnboardingChecklist({
  status,
  onUpdateGoals,
  className = "",
}: OnboardingChecklistProps) {
  const navigate = useNavigate();

  // Local state for goals selector dialog
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["Mathematics"]);
  const [selectedGoal, setSelectedGoal] = useState<string>("Exam preparation");
  const [localHasGoals, setLocalHasGoals] = useState(status.hasGoals);

  const steps = [
    {
      id: 1,
      title: "Choose your subject & learning goals",
      isCompleted: localHasGoals || status.hasGoals,
      benefit: "Unlocks personalized tutor recommendations tailored to your curriculum and target grade.",
      actionLabel: "Choose Subjects & Goals",
      onClick: () => setIsGoalsModalOpen(true),
      icon: Compass,
    },
    {
      id: 2,
      title: "Complete your student profile",
      isCompleted: status.hasProfile,
      benefit: "Ensures teachers understand your curriculum (Cambridge, Edexcel, IB, National), grade level, and schedule.",
      actionLabel: "Complete Profile",
      onClick: () => navigate("/profile"),
      icon: UserCheck,
    },
    {
      id: 3,
      title: "Find a verified teacher",
      isCompleted: status.hasViewedTeachers || status.hasBookedLesson,
      benefit: "Explore verified educators with authentic student reviews, video intros, and live availability.",
      actionLabel: "Explore Teachers",
      onClick: () => {
        try {
          localStorage.setItem("vtp_has_viewed_teachers", "true");
        } catch (_) {}
        navigate("/teachers");
      },
      icon: Search,
    },
    {
      id: 4,
      title: "Book your first live lesson",
      isCompleted: status.hasBookedLesson,
      benefit: "Gain instant access to the HD video classroom, digital stylus whiteboard, and shared class notes.",
      actionLabel: "Book First Lesson",
      onClick: () => navigate("/teachers"),
      icon: CalendarCheck,
    },
  ];

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Determine which step is currently the primary active step
  const activeStep = steps.find((s) => !s.isCompleted) || steps[steps.length - 1];

  const handleSaveGoals = () => {
    setLocalHasGoals(true);
    try {
      localStorage.setItem("vtp_student_goals", JSON.stringify({
        subjects: selectedSubjects,
        goal: selectedGoal,
      }));
    } catch (_) {}

    if (onUpdateGoals) {
      onUpdateGoals(selectedSubjects, selectedGoal);
    }
    setIsGoalsModalOpen(false);
  };

  const toggleSubject = (name: string) => {
    if (selectedSubjects.includes(name)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== name));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, name]);
    }
  };

  return (
    <div
      id="onboarding-checklist"
      role="region"
      aria-label="Getting Started Checklist"
      className={`rounded-2xl border border-teal-100 bg-white p-6 md:p-8 shadow-xs ${className}`}
    >
      {/* Header with Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">
              <Sparkles className="w-3.5 h-3.5" />
              New Student Onboarding
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {completedCount} of {steps.length} steps completed
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
            Steps to Your First Live Lesson
          </h3>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Follow this quick checklist to personalize your learning and schedule your first class.
          </p>
        </div>

        {/* Progress Visual */}
        <div className="sm:w-48 shrink-0">
          <div className="flex justify-between items-center text-xs font-medium text-slate-600 mb-1.5">
            <span>Setup Progress</span>
            <span className="text-teal-700 font-bold">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2.5 bg-slate-100" />
        </div>
      </div>

      {/* 4 Steps List */}
      <div className="space-y-4">
        {steps.map((step) => {
          const isCurrentActive = activeStep.id === step.id && !step.isCompleted;
          const StepIcon = step.icon;

          return (
            <div
              key={step.id}
              className={`group rounded-xl p-4 md:p-5 transition-all border ${
                step.isCompleted
                  ? "bg-slate-50/50 border-slate-200/70 opacity-90"
                  : isCurrentActive
                  ? "bg-teal-50/40 border-teal-300 ring-2 ring-teal-100/80 shadow-xs"
                  : "bg-white border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  {/* Status Indicator Checkmark */}
                  <div className="mt-0.5 shrink-0">
                    {step.isCompleted ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                          isCurrentActive
                            ? "border-teal-600 bg-white text-teal-700"
                            : "border-slate-300 bg-white text-slate-400"
                        }`}
                      >
                        {step.id}
                      </div>
                    )}
                  </div>

                  {/* Text & Benefit */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm md:text-base font-semibold ${
                          step.isCompleted
                            ? "text-slate-700 line-through decoration-slate-300"
                            : "text-slate-900"
                        }`}
                      >
                        {step.title}
                      </h4>
                      {isCurrentActive && (
                        <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                          Next Step
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 mt-1 leading-relaxed max-w-xl">
                      {step.benefit}
                    </p>
                  </div>
                </div>

                {/* Action Button: ONLY primary styling on the active incomplete step! */}
                <div className="sm:self-center shrink-0 pl-9 sm:pl-0">
                  {step.isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200/50">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  ) : isCurrentActive ? (
                    <Button
                      onClick={step.onClick}
                      className="h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs md:text-sm shadow-xs inline-flex items-center gap-1.5 transition-transform active:scale-[0.98]"
                    >
                      <span>{step.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={step.onClick}
                      className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium text-xs md:text-sm"
                    >
                      <span>{step.actionLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Subject & Goal Selection Dialog */}
      <Dialog open={isGoalsModalOpen} onOpenChange={setIsGoalsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Choose Your Subjects & Learning Goal
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Select the subjects you want to master. We'll prioritize verified educators specialized in these areas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 block">
                Target Subjects (Select 1 or more)
              </label>
              <div className="flex flex-wrap gap-2">
                {subjects.map((sub) => {
                  const isSelected = selectedSubjects.includes(sub.name);
                  return (
                    <button
                      key={sub.name}
                      type="button"
                      onClick={() => toggleSubject(sub.name)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isSelected
                          ? "bg-teal-50 border-teal-500 text-teal-800 ring-1 ring-teal-500"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span>{sub.icon}</span>
                      <span>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 block">
                Primary Goal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {learningGoals.map((goal) => {
                  const isSelected = selectedGoal === goal;
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setSelectedGoal(goal)}
                      className={`p-2.5 text-left rounded-lg text-xs font-medium border transition-all ${
                        isSelected
                          ? "bg-teal-50 border-teal-500 text-teal-800 ring-1 ring-teal-500"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {goal}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setIsGoalsModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveGoals}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium"
            >
              Save Goals & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
