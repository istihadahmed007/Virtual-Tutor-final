import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useAuth } from "@/hooks/use-auth";
import { createOrGetLocalConversation } from "@/lib/messages-store";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  BookOpen,
  GraduationCap,
  Calendar,
  Clock,
  MessageCircle,
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
  Send,
  User,
  Globe2,
  CheckCircle2,
  Lock,
  Eye,
  Info,
  X,
  Target,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import { SectionLabel } from "@/components/redesign";

const popularSubjects = [
  "All Subjects",
  "Mathematics",
  "AP Calculus BC",
  "Physics Mechanics",
  "Chemistry",
  "Biology",
  "English Literature",
  "Higher Mathematics",
  "ICT & Programming",
  "Spanish",
];

const gradeOptions = [
  { value: "", label: "All Grade Levels" },
  { value: "Grade 8", label: "Grade 8 / Middle School" },
  { value: "Grade 9", label: "Grade 9 / Secondary" },
  { value: "Grade 10", label: "Grade 10 / O-Level / SSC" },
  { value: "Grade 11", label: "Grade 11 / AS-Level" },
  { value: "Grade 12", label: "Grade 12 / A-Level / HSC" },
  { value: "College", label: "College / Higher Secondary" },
];

const curriculumOptions = [
  { value: "", label: "All Curriculums" },
  { value: "Cambridge", label: "Cambridge / Edexcel (O/A Level)" },
  { value: "English Version", label: "National Curriculum (English Version)" },
  { value: "Bangla Medium", label: "National Curriculum (Bangla Medium)" },
  { value: "IB", label: "IB / International Baccalaureate" },
];

const languageOptions = [
  { value: "", label: "All Languages" },
  { value: "English", label: "English" },
  { value: "Bangla", label: "Bangla" },
  { value: "Spanish", label: "Spanish" },
  { value: "Mandarin", label: "Mandarin" },
];

const goalOptions = [
  { value: "", label: "All Learning Goals" },
  { value: "Calculus", label: "AP Calculus / Advanced Math" },
  { value: "Board", label: "Board Exam Preparation" },
  { value: "Foundation", label: "Concept & Foundation Mastery" },
  { value: "Admission", label: "University Admission Readiness" },
  { value: "Fluency", label: "Language Fluency & Writing" },
];

export default function StudentsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isConvexAuth } = useAuth();

  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("");
  const [sortBy, setSortBy] = useState("verified");
  const [showFilters, setShowFilters] = useState(false);

  // Active student for detailed profile modal
  const [activeStudent, setActiveStudent] = useState<any | null>(null);

  // Invite to lesson modal state
  const [inviteTarget, setInviteTarget] = useState<any | null>(null);
  const [inviteSubject, setInviteSubject] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteTime, setInviteTime] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const students = useQuery(api.studentProfiles.listDiscoverable, {
    subject: selectedSubject && selectedSubject !== "All Subjects" ? selectedSubject : undefined,
    classLevel: selectedGrade || undefined,
    curriculum: selectedCurriculum || undefined,
    language: selectedLanguage || undefined,
    learningGoal: selectedGoal || undefined,
    searchQuery: search || undefined,
    sortBy,
  });

  const sendLessonInviteMut = useMutation(api.studentProfiles.sendLessonInvite);
  const createConversationMut = useMutation(api.messages.createConversation);

  const studentList = students ?? [];
  const isLoading = students === undefined;

  const hasFilters = Boolean(
    (selectedSubject && selectedSubject !== "All Subjects") ||
      selectedGrade ||
      selectedCurriculum ||
      selectedLanguage ||
      selectedGoal ||
      search,
  );

  const clearFilters = () => {
    setSearch("");
    setSelectedSubject("");
    setSelectedGrade("");
    setSelectedCurriculum("");
    setSelectedLanguage("");
    setSelectedGoal("");
    setSortBy("verified");
  };

  const handleOpenInvite = (student: any) => {
    setInviteTarget(student);
    setInviteSubject(student.subjects[0] || "Mathematics");
    setInviteMessage(
      `Hello ${student.name.split(" ")[0]}! I noticed your goal to excel in ${student.subjects[0] || "your subjects"} and would love to help you master core concepts with interactive 1-on-1 lessons.`,
    );
    setInviteTime(student.preferredSchedule || "Tomorrow at 6:00 PM");
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteTarget) return;

    try {
      setIsSendingInvite(true);
      await sendLessonInviteMut({
        studentUserId: inviteTarget.userId,
        subject: inviteSubject,
        message: inviteMessage,
        proposedTime: inviteTime,
      });

      toast.success(`Lesson invitation sent to ${inviteTarget.name}!`);
      setInviteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation. Please try again.");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleStartChat = async (student: any) => {
    if (!isAuthenticated) {
      navigate(`/auth?returnTo=/students`);
      return;
    }
    if (user?._id === student.userId) {
      toast.info("This is your own profile.");
      return;
    }
    try {
      if (isConvexAuth) {
        try {
          await createConversationMut({
            participantId: student.userId,
          });
        } catch (convErr) {
          console.debug("Remote conversation creation skipped/fallback:", convErr);
        }
      }
      createOrGetLocalConversation(
        { _id: user?._id, name: user?.name, role: user?.role },
        { userId: student.userId, name: student.name, role: "student", avatarUrl: student.avatarUrl }
      );
      navigate("/messages");
    } catch (err: any) {
      toast.error(err.message || "Could not open chat with student.");
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F4EF] text-[#111111] pb-24">
      {/* Header */}
      <div className="border-b border-[#E5E4DE] bg-white/50 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <SectionLabel number="02" text="Academic Inquiries & Student Directory" />
              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111111] tracking-tight font-display mt-2">
                Student Learning Demands.
              </h1>
              <p className="text-sm sm:text-base text-[#111111]/70 mt-2 max-w-2xl">
                Browse discoverable student learning requirements, connect with learners, and propose personalized lessons.
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/calendar")}
                className="rounded-full border-[#E5E4DE] text-[#111111] hover:bg-[#F5F4EF] text-xs font-semibold px-4 py-2 gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-[#F26522]" />
                <span>My Schedule</span>
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/teacher-dashboard")}
                className="rounded-full bg-[#111111] hover:bg-[#F26522] text-white text-xs font-semibold px-4 py-2 gap-1.5 shadow-xs transition-all"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Teacher Space</span>
              </Button>
            </div>
          </div>

          {/* Privacy & Opt-In Assurance Banner */}
          <div className="mt-6 p-4 bg-white rounded-2xl border border-[#E5E4DE] flex items-start gap-3 text-xs text-[#111111]/80">
            <ShieldCheck className="w-4 h-4 text-[#F26522] mt-0.5 shrink-0" />
            <div className="flex-1 leading-relaxed">
              <span className="font-bold text-[#111111]">Student Privacy Protected:</span> All students listed below have explicitly opted into educator discovery. Only academic needs, target subjects, learning goals, and schedule preferences are displayed.
            </div>
          </div>

          {/* Search bar & filter trigger */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#111111]/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students by subject, curriculum, grade, or learning goal..."
                className="w-full h-11 pl-11 pr-4 bg-white border border-[#E5E4DE] rounded-full text-sm text-[#111111] placeholder:text-[#111111]/40 focus:outline-none focus:border-[#111111] transition-all shadow-xs"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-11 px-5 rounded-full text-xs font-semibold gap-2 border-[#E5E4DE] transition-all ${
                showFilters || hasFilters
                  ? "bg-[#111111] text-white"
                  : "bg-white text-[#111111] hover:bg-[#F5F4EF]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasFilters && (
                <span className="w-2 h-2 bg-[#F26522] rounded-full animate-pulse" />
              )}
            </Button>
          </div>

          {/* Subject Pills */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {popularSubjects.map((sub) => {
              const isSelected = selectedSubject === sub || (!selectedSubject && sub === "All Subjects");
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub === "All Subjects" ? "" : sub)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-[#111111] text-white shadow-xs"
                      : "bg-white border border-[#E5E4DE] text-[#111111]/70 hover:border-[#111111]/40"
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-stone-50/90 border border-stone-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Filter Student Requests
                </span>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-teal-700 font-semibold hover:underline"
                  >
                    Reset all filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Grade / Level */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                    Grade / Level
                  </label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    {gradeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Curriculum */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                    Curriculum / Board
                  </label>
                  <select
                    value={selectedCurriculum}
                    onChange={(e) => setSelectedCurriculum(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    {curriculumOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preferred Language */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                    Teaching Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    {languageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Learning Goals */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                    Primary Goal
                  </label>
                  <select
                    value={selectedGoal}
                    onChange={(e) => setSelectedGoal(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    {goalOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="verified">Verified Students First</option>
                    <option value="completion">Profile Completeness</option>
                    <option value="hours">Hours Needed (High to Low)</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Student Feed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-slate-500">
            Showing <span className="text-slate-900 font-bold">{studentList.length}</span> discoverable student requirements
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active learning opportunities</span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200/80 p-5 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-stone-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-stone-200 rounded w-1/2" />
                    <div className="h-3 bg-stone-100 rounded w-1/3" />
                  </div>
                </div>
                <div className="h-3 bg-stone-100 rounded w-full" />
                <div className="h-3 bg-stone-100 rounded w-4/5" />
                <div className="h-8 bg-stone-100 rounded" />
              </div>
            ))}
          </div>
        ) : studentList.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={hasFilters ? "No students match your selected filters" : "No discoverable students at this moment"}
            description={
              hasFilters
                ? "Try relaxing some filters or broadening your subject search to see more learners."
                : "Students will appear here as they register and opt into teacher discovery."
            }
            actionLabel={hasFilters ? "Clear Filters" : undefined}
            onAction={hasFilters ? clearFilters : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {studentList.map((student) => (
              <StudentCard
                key={student._id}
                student={student}
                onViewProfile={() => setActiveStudent(student)}
                onInvite={() => handleOpenInvite(student)}
                onChat={() => handleStartChat(student)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Student Profile Modal */}
      <AnimatePresence>
        {activeStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl border border-stone-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setActiveStudent(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Student Header */}
              <div className="flex items-start gap-4 pb-5 border-b border-stone-100">
                <ProfileAvatar
                  name={activeStudent.name}
                  image={activeStudent.avatarUrl || activeStudent.image}
                  userId={activeStudent.userId}
                  role="student"
                  size="xl"
                  isVerified={activeStudent.verificationStatus === "verified"}
                  shape="rounded"
                />
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 truncate">
                      {activeStudent.name}
                    </h2>
                    {activeStudent.verificationStatus === "verified" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified Student
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeStudent.classLevel} · {activeStudent.curriculum}
                  </p>
                  <p className="text-xs text-slate-400">
                    {activeStudent.institution || "School Academy"}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="py-4 space-y-5 text-xs text-slate-700">
                {/* Subjects Needed */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-teal-600" />
                    Subjects Needed
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeStudent.subjects.map((sub: string) => (
                      <span
                        key={sub}
                        className="px-2.5 py-1 bg-teal-50 text-teal-800 font-semibold rounded-lg border border-teal-200/60"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Learning Goals */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-600" />
                    Academic Goals & Requirements
                  </h4>
                  <ul className="space-y-1.5">
                    {activeStudent.learningGoals.map((goal: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                        <span className="leading-relaxed">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Preferences Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Preferred Schedule</span>
                    <span className="font-semibold text-slate-900">{activeStudent.preferredSchedule}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Learning Mode</span>
                    <span className="font-semibold text-slate-900">{activeStudent.preferredLearningMode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Languages</span>
                    <span className="font-semibold text-slate-900">
                      {activeStudent.preferredLanguages.join(", ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Weekly Commitment</span>
                    <span className="font-semibold text-slate-900">{activeStudent.weeklyHours} hours / week</span>
                  </div>
                </div>

                {/* Bio / Background */}
                {activeStudent.bio && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1.5">Student Notes / Introduction</h4>
                    <p className="p-3 bg-stone-50 rounded-xl text-slate-600 leading-relaxed border border-stone-100">
                      "{activeStudent.bio}"
                    </p>
                  </div>
                )}

                {/* Privacy Badge */}
                <div className="p-3 bg-stone-100/80 rounded-xl flex items-center gap-2 text-[11px] text-slate-500">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Private contact information is hidden. Connect securely via the platform message and lesson invitation tools.</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveStudent(null);
                    handleStartChat(activeStudent);
                  }}
                  className="border-stone-200 text-xs font-semibold gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-teal-600" />
                  Send Message
                </Button>
                <Button
                  onClick={() => {
                    const studentToInvite = activeStudent;
                    setActiveStudent(null);
                    handleOpenInvite(studentToInvite);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Invite to Lesson
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invite to Lesson Modal */}
      <AnimatePresence>
        {inviteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl border border-stone-200 w-full max-w-lg shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setInviteTarget(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
                  {inviteTarget.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Invite {inviteTarget.name} to a Lesson
                  </h3>
                  <p className="text-xs text-slate-500">
                    Propose a live interactive class tailored to their requirements
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Lesson Subject
                  </label>
                  <select
                    value={inviteSubject}
                    onChange={(e) => setInviteSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  >
                    {inviteTarget.subjects.map((sub: string) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                    <option value="General Tutoring / Diagnostic Session">
                      General Tutoring / Diagnostic Session
                    </option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Proposed Time / Schedule
                  </label>
                  <input
                    type="text"
                    value={inviteTime}
                    onChange={(e) => setInviteTime(e.target.value)}
                    placeholder="e.g. Wednesday 6:00 PM (EST) or Weekends"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Personalized Message & Lesson Plan
                  </label>
                  <textarea
                    rows={4}
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                    placeholder="Explain how your expertise matches their academic goals..."
                    required
                  />
                </div>

                <div className="p-3 bg-teal-50/70 border border-teal-200/60 rounded-xl flex items-start gap-2 text-teal-800 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                  <span>
                    Sending this invite will immediately notify the student and open a direct messaging channel for seamless coordination.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setInviteTarget(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSendingInvite}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSendingInvite ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function StudentCard({
  student,
  onViewProfile,
  onInvite,
  onChat,
}: {
  student: any;
  onViewProfile: () => void;
  onInvite: () => void;
  onChat: () => void;
}) {
  return (
    <div
      onClick={onViewProfile}
      className="bg-white rounded-3xl border border-[#E5E4DE] hover:border-[#111111]/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between overflow-hidden shadow-xs"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <ProfileAvatar
            name={student.name}
            image={student.avatarUrl || student.image}
            userId={student.userId}
            role="student"
            size="md"
            shape="rounded"
            isVerified={student.verificationStatus === "verified"}
            className="group-hover:scale-105 transition-transform"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#111111] truncate font-display">
                {student.name}
              </h3>
              {student.verificationStatus === "verified" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#111111] bg-[#F5F4EF] px-2 py-0.5 rounded-full border border-[#E5E4DE]">
                  <ShieldCheck className="w-3 h-3 text-[#F26522]" />
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-[#111111]/60 mt-0.5">
              {student.classLevel} · {student.curriculum}
            </p>
          </div>
        </div>

        {/* Subjects Needed */}
        <div className="mt-4">
          <span className="text-[11px] font-semibold text-[#111111]/50 uppercase tracking-wider block mb-2">
            Target Subjects
          </span>
          <div className="flex flex-wrap gap-1.5">
            {student.subjects.slice(0, 3).map((sub: string) => (
              <span
                key={sub}
                className="px-3 py-1 bg-[#F5F4EF] text-[#111111] text-xs font-semibold rounded-full border border-[#E5E4DE]"
              >
                {sub}
              </span>
            ))}
            {student.subjects.length > 3 && (
              <span className="px-2.5 py-1 text-[#111111]/50 bg-white text-xs font-medium rounded-full border border-[#E5E4DE]">
                +{student.subjects.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Learning Goal summary */}
        <div className="mt-4 text-xs text-[#111111]/80 leading-relaxed bg-[#F5F4EF] p-3 rounded-2xl border border-[#E5E4DE]">
          <p className="line-clamp-2">
            <span className="font-bold text-[#111111]">Goal: </span>
            {student.learningGoals[0] || "Master course syllabus and excel in examinations."}
          </p>
        </div>

        {/* Schedule & Style tags */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-[#111111]/60 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#F26522]" />
            {student.preferredSchedule}
          </span>
          <span className="text-[#111111]/30">·</span>
          <span className="inline-flex items-center gap-1">
            <Globe2 className="w-3 h-3 text-[#111111]/40" />
            {student.preferredLanguages.join(", ")}
          </span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="px-6 py-3.5 bg-white border-t border-[#E5E4DE] flex items-center justify-between gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChat();
          }}
          className="text-xs font-semibold text-[#111111] hover:text-[#F26522] flex items-center gap-1.5 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5 text-[#F26522]" />
          <span>Message</span>
        </button>

        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onInvite();
          }}
          className="rounded-full bg-[#111111] hover:bg-[#F26522] text-white text-xs font-semibold px-4 py-1.5 gap-1.5 shadow-xs transition-all"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Invite to Lesson</span>
        </Button>
      </div>
    </div>
  );
}
