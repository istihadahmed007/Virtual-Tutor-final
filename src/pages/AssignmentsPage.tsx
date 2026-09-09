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
    <main className="min-h-screen bg-[#F5F4EF] text-[#111111] pb-24">
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
              className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all ${
                tab === t.key
                  ? "bg-[#111111] text-white shadow-xs"
                  : "bg-white border border-[#E5E4DE] text-[#111111]/70 hover:border-[#111111]/40"
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
                  className="bg-white rounded-3xl border border-[#E5E4DE] p-6 hover:border-[#111111]/40 transition-all shadow-xs"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        a.status === "graded"
                          ? "bg-[#F5F4EF] text-[#111111] border-[#E5E4DE]"
                          : isOverdue
                            ? "bg-rose-50 text-rose-600 border-rose-200"
                            : "bg-[#F5F4EF] text-[#F26522] border-[#E5E4DE]"
                      }`}
                    >
                      {a.status === "graded" ? (
                        <CheckCircle className="w-5 h-5 text-[#111111]" />
                      ) : isOverdue ? (
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-[#F26522]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-[#111111] font-display">
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
                      <p className="text-xs text-[#111111]/60 mt-1">
                        {a.subject} · {isTeacher ? `Student: ${a.studentName}` : `Assigned by ${a.teacherName}`}
                      </p>
                      <p className="text-sm text-[#111111]/80 mt-2 leading-relaxed line-clamp-2">
                        {a.description}
                      </p>

                      {/* Attachments / Student response if submitted */}
                      {a.attachments && a.attachments.length > 0 && (
                        <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
                          <p className="text-xs font-semibold text-slate-700">Submission Note / Work:</p>
                          <p className="text-xs text-slate-600 mt-1">{a.attachments[0]}</p>
                        </div>
                      )}

                      {/* Grade and feedback */}
                      {a.grade && (
                        <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                          <p className="text-sm font-bold text-emerald-700">
                            Grade: {a.grade}
                          </p>
                          {a.feedback && (
                            <p className="text-xs text-emerald-600 mt-1">
                              {a.feedback}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Due date and Actions */}
                      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-stone-100">
                        <span className="text-xs text-slate-400">
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
                          <Button
                            size="sm"
                            onClick={() => setSubmittingAssignment(a)}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" /> Submit Work
                          </Button>
                        )}

                        {/* Teacher Action */}
                        {isTeacher && a.status === "submitted" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setGradingAssignment(a);
                              setGradeInput("A");
                              setFeedbackInput("");
                            }}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5"
                          >
                            <Award className="w-3.5 h-3.5" /> Grade Submission
                          </Button>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSubmittingAssignment(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Submit Assignment</h3>
            <p className="text-xs text-slate-500 mb-4">{submittingAssignment.title}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Your Answer / Submission Notes / Link
                </label>
                <textarea
                  rows={4}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Paste your solution, link to Google Docs / GitHub / PDF, or notes here..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !submissionNotes.trim()}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSubmitting ? "Submitting..." : "Confirm & Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Assignment Modal */}
      {gradingAssignment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setGradingAssignment(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Grade Assignment</h3>
            <p className="text-xs text-slate-500 mb-4">Student: {gradingAssignment.studentName}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Grade</label>
                <select
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                >
                  <option value="A+">A+ (Outstanding)</option>
                  <option value="A">A (Excellent)</option>
                  <option value="A-">A- (Very Good)</option>
                  <option value="B+">B+ (Good)</option>
                  <option value="B">B (Satisfactory)</option>
                  <option value="Pass">Pass</option>
                  <option value="Needs Revision">Needs Revision</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Feedback & Comments
                </label>
                <textarea
                  rows={3}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Great comprehension! For problem 4, review the formula..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                />
              </div>
              <Button
                onClick={handleGrade}
                disabled={isGrading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isGrading ? "Saving..." : "Submit Grade & Feedback"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
