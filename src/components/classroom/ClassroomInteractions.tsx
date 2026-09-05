import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  HelpCircle,
  FileCheck2,
  Plus,
  CheckCircle2,
  XCircle,
  Award,
  Send,
  Trash2,
} from "lucide-react";

export interface PollItem {
  _id: string;
  question: string;
  options: string[];
  votes: { studentId: string; studentName: string; optionIndex: number }[];
  status: "active" | "closed";
}

export interface QuizItem {
  _id: string;
  title: string;
  questions: {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }[];
  submissions: {
    studentId: string;
    studentName: string;
    answers: number[];
    score: number;
    submittedAt: number;
  }[];
  status: "active" | "completed";
}

export interface WorksheetItem {
  _id: string;
  title: string;
  instructions: string;
  questions: {
    id: string;
    prompt: string;
    type: "short_answer" | "long_answer" | "multiple_choice";
    options?: string[];
  }[];
  submissions: {
    studentId: string;
    studentName: string;
    answers: { questionId: string; response: string }[];
    teacherFeedback?: string;
    grade?: string;
    submittedAt: number;
  }[];
  status: "active" | "graded";
}

interface ClassroomInteractionsProps {
  currentUserId: string;
  currentUserName: string;
  isTeacher: boolean;
  polls: PollItem[];
  quizzes: QuizItem[];
  worksheets: WorksheetItem[];
  onCreatePoll: (question: string, options: string[]) => void;
  onVotePoll: (pollId: string, optionIndex: number) => void;
  onClosePoll: (pollId: string) => void;
  onCreateQuiz: (title: string, questions: any[]) => void;
  onSubmitQuiz: (quizId: string, answers: number[]) => void;
  onCreateWorksheet: (title: string, instructions: string, questions: any[]) => void;
  onSubmitWorksheet: (worksheetId: string, answers: { questionId: string; response: string }[]) => void;
  onGradeWorksheet: (worksheetId: string, studentId: string, grade: string, feedback: string) => void;
}

export function ClassroomInteractions({
  currentUserId,
  currentUserName,
  isTeacher,
  polls,
  quizzes,
  worksheets,
  onCreatePoll,
  onVotePoll,
  onClosePoll,
  onCreateQuiz,
  onSubmitQuiz,
  onCreateWorksheet,
  onSubmitWorksheet,
  onGradeWorksheet,
}: ClassroomInteractionsProps) {
  const [subTab, setSubTab] = useState<"polls" | "quizzes" | "worksheets">("polls");

  // New Poll Builder state
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["Option A", "Option B"]);

  // New Quiz Builder state
  const [quizTitle, setQuizTitle] = useState("");
  const [quizQuestions, setQuizQuestions] = useState([
    {
      id: "q1",
      question: "Which of the following represents the fundamental theorem?",
      options: ["Concept A", "Concept B", "Concept C", "Concept D"],
      correctIndex: 1,
    },
  ]);

  // Student Quiz Answer Selection
  const [studentQuizAnswers, setStudentQuizAnswers] = useState<Record<string, number[]>>({});

  // Student Worksheet Responses
  const [worksheetAnswers, setWorksheetAnswers] = useState<Record<string, Record<string, string>>>({});

  // Teacher Grading state
  const [gradeInput, setGradeInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, `Option ${String.fromCharCode(65 + pollOptions.length)}`]);
    }
  };

  const handleLaunchPoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || pollOptions.length < 2) return;
    onCreatePoll(pollQuestion.trim(), pollOptions);
    setPollQuestion("");
    setPollOptions(["Option A", "Option B"]);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-y-auto p-4 select-none">
      <div className="max-w-4xl mx-auto w-full space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {[
              { id: "polls" as const, label: "Live Polls", icon: BarChart3 },
              { id: "quizzes" as const, label: "Interactive Quizzes", icon: HelpCircle },
              { id: "worksheets" as const, label: "Worksheets & Practice", icon: FileCheck2 },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  subTab === t.id
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── 1. POLLS TAB ────────────────────────────────────────────── */}
        {subTab === "polls" && (
          <div className="space-y-4">
            {/* Teacher Poll Creator */}
            {isTeacher && (
              <form
                onSubmit={handleLaunchPoll}
                className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-lg space-y-3"
              >
                <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                  Create Fast Concept Poll
                </h3>

                <input
                  type="text"
                  placeholder="Poll Question (e.g. Is this equation linear or non-linear?)"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-teal-500"
                />

                <div className="space-y-2">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-6">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const copy = [...pollOptions];
                          copy[idx] = e.target.value;
                          setPollOptions(copy);
                        }}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-teal-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPollOption}
                    disabled={pollOptions.length >= 6}
                    className="border-slate-700 text-slate-300 text-xs h-7"
                  >
                    + Add Option
                  </Button>

                  <Button type="submit" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8">
                    Launch Poll
                  </Button>
                </div>
              </form>
            )}

            {/* Polls Feed */}
            {polls.map((poll) => {
              const totalVotes = poll.votes?.length || 0;
              const userVote = poll.votes?.find((v) => v.studentId === currentUserId);

              return (
                <div
                  key={poll._id}
                  className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{poll.question}</h4>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          poll.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {poll.status.toUpperCase()}
                      </span>
                      {isTeacher && poll.status === "active" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onClosePoll(poll._id)}
                          className="text-[10px] h-6 px-2"
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {poll.options.map((opt, idx) => {
                      const voteCount = (poll.votes || []).filter((v) => v.optionIndex === idx).length;
                      const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                      const isVoted = userVote?.optionIndex === idx;

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (poll.status === "active" && !isTeacher) {
                              onVotePoll(poll._id, idx);
                            }
                          }}
                          className={`relative overflow-hidden p-3 rounded-lg border cursor-pointer transition-all ${
                            isVoted
                              ? "border-teal-500 bg-teal-950/40"
                              : "border-slate-700 bg-slate-950/60 hover:border-slate-600"
                          }`}
                        >
                          <div
                            className="absolute top-0 bottom-0 left-0 bg-teal-500/20 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />

                          <div className="relative flex items-center justify-between text-xs z-10">
                            <span className="font-medium text-slate-200">
                              {String.fromCharCode(65 + idx)}. {opt}
                            </span>
                            <span className="font-bold text-teal-400">
                              {percentage}% ({voteCount})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-400 text-right">
                    Total Responses: {totalVotes} student{totalVotes !== 1 ? "s" : ""}
                  </p>
                </div>
              );
            })}

            {polls.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-8">
                No active polls right now. Teacher can launch one above.
              </p>
            )}
          </div>
        )}

        {/* ─── 2. QUIZZES TAB ──────────────────────────────────────────── */}
        {subTab === "quizzes" && (
          <div className="space-y-4">
            {quizzes.map((quiz) => {
              const mySubmission = quiz.submissions?.find((s) => s.studentId === currentUserId);
              const answers = studentQuizAnswers[quiz._id] || [];

              return (
                <div
                  key={quiz._id}
                  className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-lg space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{quiz.title}</h4>
                      <p className="text-[11px] text-slate-400">{quiz.questions.length} Questions</p>
                    </div>

                    {mySubmission && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs font-bold">
                        <Award className="w-3.5 h-3.5" /> Score: {mySubmission.score}%
                      </div>
                    )}
                  </div>

                  {/* Question list */}
                  <div className="space-y-4">
                    {quiz.questions.map((q, qIdx) => (
                      <div key={q.id} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                        <p className="text-xs font-semibold text-slate-200 mb-2">
                          {qIdx + 1}. {q.question}
                        </p>

                        <div className="space-y-1.5">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = answers[qIdx] === optIdx;
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={!!mySubmission || quiz.status !== "active"}
                                onClick={() => {
                                  const copy = [...answers];
                                  copy[qIdx] = optIdx;
                                  setStudentQuizAnswers({ ...studentQuizAnswers, [quiz._id]: copy });
                                }}
                                className={`w-full text-left p-2 rounded-md text-xs transition-colors flex items-center justify-between border ${
                                  isSelected
                                    ? "bg-teal-950 border-teal-500 text-teal-200"
                                    : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                                }`}
                              >
                                <span>{opt}</span>
                                {mySubmission && optIdx === q.correctIndex && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Submit button for students */}
                  {!isTeacher && !mySubmission && quiz.status === "active" && (
                    <Button
                      onClick={() => onSubmitQuiz(quiz._id, answers)}
                      disabled={answers.length < quiz.questions.length}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-8"
                    >
                      Submit Quiz Answers
                    </Button>
                  )}
                </div>
              );
            })}

            {quizzes.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-8">
                No active quizzes in this session.
              </p>
            )}
          </div>
        )}

        {/* ─── 3. WORKSHEETS TAB ───────────────────────────────────────── */}
        {subTab === "worksheets" && (
          <div className="space-y-4">
            {worksheets.map((ws) => {
              const mySub = ws.submissions?.find((s) => s.studentId === currentUserId);
              const responses = worksheetAnswers[ws._id] || {};

              return (
                <div
                  key={ws._id}
                  className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-lg space-y-4"
                >
                  <div className="border-b border-slate-700 pb-2 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{ws.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{ws.instructions}</p>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="space-y-3">
                    {ws.questions.map((q, idx) => (
                      <div key={q.id} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2">
                        <p className="text-xs font-semibold text-slate-200">
                          Problem {idx + 1}: {q.prompt}
                        </p>

                        {!isTeacher ? (
                          <textarea
                            rows={3}
                            disabled={!!mySub}
                            value={responses[q.id] || ""}
                            onChange={(e) => {
                              setWorksheetAnswers({
                                ...worksheetAnswers,
                                [ws._id]: {
                                  ...responses,
                                  [q.id]: e.target.value,
                                },
                              });
                            }}
                            placeholder="Write your step-by-step solution..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-teal-500"
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* Student submit button */}
                  {!isTeacher && !mySub && (
                    <Button
                      onClick={() => {
                        const formatted = ws.questions.map((q) => ({
                          questionId: q.id,
                          response: responses[q.id] || "",
                        }));
                        onSubmitWorksheet(ws._id, formatted);
                      }}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-8"
                    >
                      Submit Worksheet
                    </Button>
                  )}

                  {mySub && (
                    <div className="p-3 bg-teal-950/40 border border-teal-800/40 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-teal-300">
                        Status: Submitted {mySub.grade ? `· Grade: ${mySub.grade}` : "· Awaiting teacher review"}
                      </p>
                      {mySub.teacherFeedback && (
                        <p className="text-slate-300">Feedback: {mySub.teacherFeedback}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {worksheets.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-8">
                No active worksheets in this session.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
