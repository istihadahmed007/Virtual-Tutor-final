import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Award,
  Star,
  CheckCircle,
  FileText,
  Sparkles,
  BookOpen,
  X,
} from "lucide-react";

interface ClassroomEndLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    feedback: string;
    rating: number;
    homeworkText: string;
    strengths: string[];
    improvements: string[];
  }) => void;
}

export function ClassroomEndLessonModal({
  isOpen,
  onClose,
  onSubmit,
}: ClassroomEndLessonModalProps) {
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(5);
  const [homeworkText, setHomeworkText] = useState("");
  const [strengthInput, setStrengthInput] = useState("");
  const [strengths, setStrengths] = useState<string[]>([
    "Excellent conceptual grasping",
    "Active participation in problem solving",
  ]);
  const [improvementInput, setImprovementInput] = useState("");
  const [improvements, setImprovements] = useState<string[]>([
    "Practice speed on multi-step calculations",
  ]);

  if (!isOpen) return null;

  const handleAddStrength = () => {
    if (strengthInput.trim()) {
      setStrengths([...strengths, strengthInput.trim()]);
      setStrengthInput("");
    }
  };

  const handleAddImprovement = () => {
    if (improvementInput.trim()) {
      setImprovements([...improvements, improvementInput.trim()]);
      setImprovementInput("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      feedback: feedback.trim() || "Great work in today's session!",
      rating,
      homeworkText: homeworkText.trim(),
      strengths,
      improvements,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 max-w-xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Finalize & Summarize Lesson</h3>
              <p className="text-[11px] text-slate-400">Save session notes, homework and performance evaluation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Star Rating */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Student Engagement & Performance Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 text-slate-600 hover:text-amber-400 transition-colors"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-600"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-bold text-amber-400">{rating} / 5 Stars</span>
            </div>
          </div>

          {/* Feedback & Takeaways */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Teacher Feedback & Lesson Summary
            </label>
            <textarea
              rows={3}
              required
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Demonstrated strong understanding of quadratic formula derivations. Handled exercises with high accuracy."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 outline-none focus:border-teal-500"
            />
          </div>

          {/* Homework & Assignment Creator */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-400" /> Assigned Homework (Auto-syncs to Student Assignments)
            </label>
            <textarea
              rows={2}
              value={homeworkText}
              onChange={(e) => setHomeworkText(e.target.value)}
              placeholder="e.g. Complete problems 4 through 12 on textbook page 84. Review section 3 notes."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 outline-none focus:border-teal-500"
            />
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Key Strengths</label>
              <div className="flex items-center gap-1 mb-2">
                <input
                  type="text"
                  value={strengthInput}
                  onChange={(e) => setStrengthInput(e.target.value)}
                  placeholder="Add strength..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white outline-none"
                />
                <Button type="button" size="sm" onClick={handleAddStrength} className="h-7 text-[10px] bg-slate-800">
                  +
                </Button>
              </div>
              <div className="space-y-1">
                {strengths.map((s, idx) => (
                  <div key={idx} className="p-1.5 bg-slate-950 rounded border border-slate-800 text-[11px] text-teal-300">
                    ✓ {s}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Focus Areas</label>
              <div className="flex items-center gap-1 mb-2">
                <input
                  type="text"
                  value={improvementInput}
                  onChange={(e) => setImprovementInput(e.target.value)}
                  placeholder="Add focus area..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white outline-none"
                />
                <Button type="button" size="sm" onClick={handleAddImprovement} className="h-7 text-[10px] bg-slate-800">
                  +
                </Button>
              </div>
              <div className="space-y-1">
                {improvements.map((imp, idx) => (
                  <div key={idx} className="p-1.5 bg-slate-950 rounded border border-slate-800 text-[11px] text-amber-300">
                    • {imp}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              <CheckCircle className="w-4 h-4" /> Save & Complete Lesson
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
