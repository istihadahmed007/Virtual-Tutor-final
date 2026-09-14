import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  BookOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Award,
  Plus,
  X,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type Tab = "pending" | "graded" | "all";

const statusLabels: Record<string, string> = {
  assigned: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  graded: "Graded",
  returned: "Needs revision",
};

const statusVariants: Record<string, "warning" | "info" | "success" | "error" | "neutral"> = {
  assigned: "warning",
  in_progress: "info",
  submitted: "info",
  graded: "success",
  returned: "error",
};

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const assignments = useQuery(api.assignments.listMyAssignments);

  // Submit Modal State
  const [submittingAssignment, setSubmittingAssignment] = useState<any | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitAssignment = useMutation(api.assignments.submit);

  // Grade Modal State
  const [gradingAssignment, setGradingAssignment] = useState<any | null>(null);
  const [gradeInput, setGradeInput] = useState("A");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const gradeAssignment = useMutation(api.assignments.grade);

  const isTeacher = user?.role === "teacher";
  const assignmentList = assignments ?? [];

  const filtered =
    tab === "pending"
      ? assignmentList.filter(
          (a) => a.status === "assigned" || a.status === "in_progress" || (isTeacher && a.status === "submitted"),
        )
      : tab === "graded"
        ? assignmentList.filter((a) => a.status === "graded")
        : assignmentList;

  const handleSubmit = async () => {
    if (!submittingAssignment) return;
    setIsSubmitting(true);
    try {
      await submitAssignment({
        assignmentId: submittingAssignment._id as Id<"assignments">,
        attachments: submissionNotes ? [submissionNotes] : [],
      });
      setSubmittingAssignment(null);
      setSubmissionNotes("");
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGrade = async () => {
    if (!gradingAssignment) return;
    setIsGrading(true);
    try {
      await gradeAssignment({
        assignmentId: gradingAssignment._id as Id<"assignments">,
        grade: gradeInput,
        feedback: feedbackInput || "Good work!",
      });
      setGradingAssignment(null);
      setFeedbackInput("");
    } catch (err) {
      console.error("Grading failed:", err);
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <main className="min-h-screen bg-transparent text-white pb-24 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <PageHeader
          title="Assignments & Coursework"
          description={
            isTeacher
              ? "Track, review, and grade homework assigned to your students"
              : "View, submit, and track your assignment progress and academic feedback"
          }
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {([
            { key: "pending" as Tab, label: isTeacher ? "Needs Review / Active" : "Needs attention" },
            { key: "graded" as Tab, label: "Completed" },
            { key: "all" as Tab, label: "All Assignments" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all backdrop-blur-sm ${
                tab === t.key
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)] border border-violet-400/30"
                  : "bg-white/[0.04] border border-white/10 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Assignment list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={
              tab === "pending"
                ? "No pending assignments"
                : tab === "graded"
                  ? "No graded assignments yet"
                  : "No assignments yet"
            }
            description={
              tab === "pending"
                ? "All caught up! Assignments from your tutors will appear here when assigned."
                : tab === "graded"
                  ? "Graded assignments with feedback will appear here."
                  : "Assignments from your tutors will appear here."
            }
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((a) => {
              const isOverdue =
                (a.status === "assigned" || a.status === "in_progress") &&
                new Date(a.dueDate) < new Date();
              const dueDate = new Date(a.dueDate);
              const daysUntilDue = Math.ceil(
                (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              );

              return (
                <div
                  key={a._id}
                  className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 hover:border-violet-400/40 hover:bg-white/[0.07] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        a.status === "graded"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : isOverdue
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : "bg-violet-600/20 text-violet-400 border-violet-500/30"
                      }`}
                    >
                      {a.status === "graded" ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : isOverdue ? (
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-violet-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white font-display">
                          {a.title}
                        </h3>
                        <StatusBadge
                          label={
                            isOverdue
                              ? "Overdue"
                              : statusLabels[a.status] || a.status
                          }
                          variant={
                            isOverdue
                              ? "error"
                              : statusVariants[a.status] || "neutral"
                          }
                        />
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        {a.subject} · {isTeacher ? `Student: ${a.studentName}` : `Assigned by ${a.teacherName}`}
                      </p>
                      <p className="text-sm text-white/80 mt-2 leading-relaxed line-clamp-2">
                        {a.description}
                      </p>

                      {/* Attachments / Student response if submitted */}
                      {a.attachments && a.attachments.length > 0 && (
                        <div className="mt-3 p-3 bg-white/[0.04] rounded-xl border border-white/10">
                          <p className="text-xs font-semibold text-white/80">Submission Note / Work:</p>
                          <p className="text-xs text-white/60 mt-1">{a.attachments[0]}</p>
                        </div>
                      )}

                      {/* Grade and feedback */}
                      {a.grade && (
                        <div className="mt-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                          <p className="text-sm font-bold text-emerald-400">
                            Grade: {a.grade}
                          </p>
                          {a.feedback && (
                            <p className="text-xs text-emerald-300 mt-1">
                              {a.feedback}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Due date and Actions */}
                      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-white/10">
                        <span className="text-xs text-white/50">
                          {a.status === "graded"
                            ? `Graded on ${dueDate.toLocaleDateString()}`
                            : isOverdue
                              ? `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? "s" : ""}`
                              : daysUntilDue === 0
                                ? "Due today"
                                : daysUntilDue === 1
                                  ? "Due tomorrow"
                                  : daysUntilDue > 0
                                    ? `Due in ${daysUntilDue} days`
                                    : `Due ${dueDate.toLocaleDateString()}`}
                        </span>

                        {/* Student Action */}
                        {!isTeacher && (a.status === "assigned" || a.status === "in_progress") && (
                          <button
                            onClick={() => setSubmittingAssignment(a)}
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(139,92,246,0.3)] cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Submit Work</span>
                          </button>
                        )}

                        {/* Teacher Action */}
                        {isTeacher && a.status === "submitted" && (
                          <button
                            onClick={() => {
                              setGradingAssignment(a);
                              setGradeInput("A");
                              setFeedbackInput("");
                            }}
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(139,92,246,0.3)] cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Grade Submission</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Assignment Modal */}
      {submittingAssignment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950/90 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.8)] relative border border-white/15 text-white">
            <button
              onClick={() => setSubmittingAssignment(null)}
              className="absolute top-5 right-5 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white font-display mb-1">Submit Assignment</h3>
            <p className="text-xs text-white/60 mb-5">{submittingAssignment.title}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5">
                  Your Answer / Submission Notes / Link
                </label>
                <textarea
                  rows={4}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Paste your solution, link to Google Docs / GitHub / PDF, or notes here..."
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-2xl text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !submissionNotes.trim()}
                className="w-full h-11 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Assignment Modal */}
      {gradingAssignment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950/90 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.8)] relative border border-white/15 text-white">
            <button
              onClick={() => setGradingAssignment(null)}
              className="absolute top-5 right-5 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white font-display mb-1">Grade Assignment</h3>
            <p className="text-xs text-white/60 mb-5">Student: {gradingAssignment.studentName}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5">Grade</label>
                <select
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                >
                  <option value="A+" className="bg-slate-900 text-white">A+ (Outstanding)</option>
                  <option value="A" className="bg-slate-900 text-white">A (Excellent)</option>
                  <option value="A-" className="bg-slate-900 text-white">A- (Very Good)</option>
                  <option value="B+" className="bg-slate-900 text-white">B+ (Good)</option>
                  <option value="B" className="bg-slate-900 text-white">B (Satisfactory)</option>
                  <option value="Pass" className="bg-slate-900 text-white">Pass</option>
                  <option value="Needs Revision" className="bg-slate-900 text-white">Needs Revision</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5">
                  Feedback & Comments
                </label>
                <textarea
                  rows={3}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Great comprehension! For problem 4, review the formula..."
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-2xl text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
              <button
                onClick={handleGrade}
                disabled={isGrading}
                className="w-full h-11 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGrading ? "Saving..." : "Submit Grade & Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
