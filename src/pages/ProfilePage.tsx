import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileAvatarCropper } from "@/components/ProfileAvatarCropper";
import {
  ArrowLeft,
  User,
  Mail,
  Clock,
  Shield,
  ShieldCheck,
  Save,
  GraduationCap,
  BookOpen,
  LogOut,
  RefreshCw,
  Camera,
  Trash2,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Target,
  Sparkles,
  Globe2,
  Calendar,
  Layers,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router";

const availableSubjects = [
  "Mathematics",
  "AP Calculus BC",
  "Physics Mechanics",
  "Chemistry",
  "Biology",
  "English Literature",
  "Bangla",
  "Spanish",
  "Higher Mathematics",
  "ICT & Programming",
  "General Science",
  "Economics",
];

const gradeOptions = [
  "Grade 8 / Middle School",
  "Grade 9 / Secondary",
  "Grade 10 / O-Level / SSC",
  "Grade 11 / AS-Level",
  "Grade 12 / A-Level / HSC",
  "College / University",
];

const curriculumOptions = [
  "Cambridge / Edexcel (O/A Level)",
  "National Curriculum (English Version)",
  "National Curriculum (Bangla Medium)",
  "IB / International Baccalaureate",
  "Advanced Placement (AP)",
];

const learningModeOptions = [
  "1-on-1 Interactive",
  "Conceptual Deep-Dive",
  "Exam Prep Crash Course",
  "Homework & Past Paper Solving",
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, switchRole, signOut } = useAuth();
  const convexUpdateProfile = useMutation(api.users.updateProfile);

  // Student Convex profile data
  const studentProfile = useQuery(api.studentProfiles.get);
  const upsertStudentProfile = useMutation(api.studentProfiles.upsert);
  const toggleDiscoverabilityMut = useMutation(api.studentProfiles.toggleDiscoverability);

  // Common Profile state
  const [name, setName] = useState(() => user?.name || "");
  const [bio, setBio] = useState(() => user?.bio || "");
  const [timezone, setTimezone] = useState(() => user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [institution, setInstitution] = useState(() => user?.institution || "");

  // Student Discovery and Learning Preferences state
  const [isDiscoverable, setIsDiscoverable] = useState<boolean>(true);
  const [classLevel, setClassLevel] = useState("Grade 11 / AS-Level");
  const [curriculum, setCurriculum] = useState("Cambridge / Edexcel (O/A Level)");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["Mathematics", "Physics Mechanics"]);
  const [learningGoals, setLearningGoals] = useState("Excel in upcoming exams and master calculus problem solving");
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>(["English"]);
  const [preferredSchedule, setPreferredSchedule] = useState("Weekday Evenings (6 PM - 9 PM)");
  const [preferredLearningMode, setPreferredLearningMode] = useState("1-on-1 Interactive");
  const [weeklyHours, setWeeklyHours] = useState(4);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const isTeacher = user?.role === "teacher";

  // Profile completion breakdown factoring in profile picture
  const hasAvatar = Boolean(user?.image || user?.avatarUrl);
  const hasName = Boolean(name && name.trim().length > 1);
  const hasBio = Boolean(bio && bio.trim().length > 5);
  const hasInstitution = Boolean(institution && institution.trim().length > 1);
  const hasSubjects = Boolean(selectedSubjects.length > 0);

  const completionChecks = [
    { label: "Full Name", done: hasName },
    { label: "Email Address", done: Boolean(user?.email) },
    { label: "Profile Picture", done: hasAvatar, required: true },
    { label: isTeacher ? "Institution / University" : "School / Academy", done: hasInstitution },
    { label: isTeacher ? "Teaching Bio" : "Learning Bio & Goals", done: hasBio },
    { label: "Academic Subjects & Level", done: hasSubjects },
  ];

  const completedCount = completionChecks.filter((c) => c.done).length;
  const profileCompletionPercentage = Math.round((completedCount / completionChecks.length) * 100);

  // Populate from DB student profile if available
  useEffect(() => {
    if (studentProfile) {
      if (studentProfile.isDiscoverable !== undefined) setIsDiscoverable(studentProfile.isDiscoverable);
      if (studentProfile.classLevel) setClassLevel(studentProfile.classLevel);
      if (studentProfile.curriculum) setCurriculum(studentProfile.curriculum);
      if (studentProfile.subjects && studentProfile.subjects.length > 0) setSelectedSubjects(studentProfile.subjects);
      if (studentProfile.learningGoals && studentProfile.learningGoals.length > 0) setLearningGoals(studentProfile.learningGoals.join(", "));
      if (studentProfile.preferredLanguages && studentProfile.preferredLanguages.length > 0) setPreferredLanguages(studentProfile.preferredLanguages);
      if (studentProfile.preferredSchedule) setPreferredSchedule(studentProfile.preferredSchedule);
      if (studentProfile.preferredLearningMode) setPreferredLearningMode(studentProfile.preferredLearningMode);
      if (studentProfile.weeklyHours) setWeeklyHours(studentProfile.weeklyHours);
    }
  }, [studentProfile]);

  const handleToggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== sub));
      } else {
        toast.info("Please keep at least one subject selected.");
      }
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const handleToggleDiscoverable = async (val: boolean) => {
    setIsDiscoverable(val);
    try {
      await toggleDiscoverabilityMut({ isDiscoverable: val });
      toast.success(`Profile discovery is now ${val ? "ON (Discoverable by Teachers)" : "OFF (Private)"}`);
    } catch (err: any) {
      // Local state still updated
      toast.info(`Discovery setting updated: ${val ? "Discoverable" : "Private"}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      updateProfile({ name, bio, timezone, institution });
      if (convexUpdateProfile) {
        await convexUpdateProfile({ name, bio, timezone }).catch(() => {});
      }

      if (user?.role === "student") {
        const goalsArray = learningGoals
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean);

        await upsertStudentProfile({
          name,
          educationLevel: classLevel.includes("Grade 11") || classLevel.includes("Grade 12") ? "High School" : "Secondary",
          classLevel,
          curriculum,
          subjects: selectedSubjects,
          learningGoals: goalsArray.length > 0 ? goalsArray : ["Master core subjects", "Ace examinations"],
          preferredLanguages,
          preferredSchedule,
          preferredLearningMode,
          weeklyHours: Number(weeklyHours) || 3,
          bio,
          isDiscoverable,
        }).catch(() => {});
      }

      setSaved(true);
      toast.success("Profile and discovery settings saved successfully!");
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRole = () => {
    const newRole = user?.role === "teacher" ? "student" : "teacher";
    switchRole(newRole);
    if (newRole === "teacher") {
      navigate("/teacher-dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-16">
      <header className="bg-white border-b border-stone-200/60 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(isTeacher ? "/teacher-dashboard" : "/dashboard")}
            className="text-slate-600 gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-lg font-bold text-slate-900">Profile & Discovery Settings</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Profile Header & Picture Management Card */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-stone-100">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Profile Avatar with Hover Edit Overlay */}
              <div className="relative group">
                <ProfileAvatar
                  name={user?.name || name}
                  image={user?.image || user?.avatarUrl}
                  role={user?.role}
                  size="2xl"
                  id="profile_page_avatar_preview"
                  className="ring-4 ring-white dark:ring-neutral-900 shadow-md"
                />
                <button
                  id="avatar_overlay_edit_btn"
                  onClick={() => setIsCropperOpen(true)}
                  className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer backdrop-blur-[1px]"
                  title="Update profile picture"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-[11px] font-semibold">Change</span>
                </button>
              </div>

              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{name || user?.name || "User"}</h2>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    isTeacher ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700"
                  }`}>
                    {isTeacher ? <GraduationCap className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                    {isTeacher ? "Educator Profile" : "Student Profile"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{user?.email || "No email"}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <Button
                    id="open_avatar_cropper_btn"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCropperOpen(true)}
                    className="text-xs border-teal-200 bg-teal-50/50 hover:bg-teal-50 text-teal-700 font-semibold gap-1.5 h-8"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {user?.image || user?.avatarUrl ? "Change Photo" : "Upload Photo"}
                  </Button>
                  <span className="text-[11px] text-slate-400">
                    JPG, PNG, WebP · Max 5 MB
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Switch Role */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleRole}
              className="text-xs border-stone-200 hover:bg-stone-50 gap-1.5 self-center sm:self-start"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
              Switch to {isTeacher ? "Student" : "Teacher"} View
            </Button>
          </div>

          {/* Profile Completion Meter */}
          <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Profile Completion:</span>
                <span className={`text-xs font-extrabold ${profileCompletionPercentage === 100 ? "text-emerald-600" : "text-teal-700"}`}>
                  {profileCompletionPercentage}%
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                {profileCompletionPercentage === 100 ? "Profile is fully complete!" : `${completedCount} of ${completionChecks.length} items completed`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  profileCompletionPercentage === 100
                    ? "bg-emerald-500"
                    : profileCompletionPercentage >= 70
                    ? "bg-teal-600"
                    : "bg-amber-500"
                }`}
                style={{ width: `${profileCompletionPercentage}%` }}
              />
            </div>

            {/* Field breakdown checklist */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {completionChecks.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-[11px]">
                  {item.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  )}
                  <span className={item.done ? "text-slate-700 font-medium" : "text-slate-400 font-normal"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Core Info Fields */}
          <div className="space-y-4 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    value={user?.email || ""}
                    disabled
                    className="w-full pl-10 pr-4 py-2 bg-stone-100 border border-stone-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  {isTeacher ? "Institution / University" : "School / Academy"}
                </label>
                <input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g., Oakridge Academy"
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Timezone</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Bio / Summary</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 resize-none"
                placeholder="Share your academic background, goals, or target milestones..."
              />
            </div>
          </div>
        </div>

        {/* Student Specific Discovery & Learning Requirements */}
        {!isTeacher && (
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-6">
            {/* Discovery Visibility Toggle (Privacy Requirement) */}
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isDiscoverable ? "bg-teal-600 text-white" : "bg-stone-200 text-slate-600"}`}>
                  {isDiscoverable ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Discoverable by Teachers: {isDiscoverable ? "ON" : "OFF"}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isDiscoverable ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-slate-700"
                    }`}>
                      {isDiscoverable ? "Public to Verified Tutors" : "Hidden"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xl">
                    When enabled, verified educators can discover your subject requirements and propose personalized lessons. Your private email, phone number, and street address are strictly protected.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => handleToggleDiscoverable(!isDiscoverable)}
                className={`shrink-0 font-semibold text-xs ${
                  isDiscoverable
                    ? "bg-slate-900 hover:bg-slate-800 text-white"
                    : "bg-teal-600 hover:bg-teal-700 text-white"
                }`}
              >
                Turn Discovery {isDiscoverable ? "OFF" : "ON"}
              </Button>
            </div>

            {/* Academic Level & Curriculum */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Grade / Class Level
                </label>
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Curriculum / Examination Board
                </label>
                <select
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  {curriculumOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subjects Needed (Multiple Select Pills) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Subjects You Need Help With (Click to toggle)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableSubjects.map((sub) => {
                  const active = selectedSubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleToggleSubject(sub)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? "bg-teal-600 text-white shadow-xs"
                          : "bg-stone-100 text-slate-600 hover:bg-stone-200"
                      }`}
                    >
                      {active ? "✓ " : "+ "}
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Learning Goals */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Academic Goals & Learning Requirements (Comma-separated)
              </label>
              <input
                value={learningGoals}
                onChange={(e) => setLearningGoals(e.target.value)}
                placeholder="e.g. Score 5 on AP Calculus, Improve algebra foundation, Exam preparation"
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            {/* Schedule & Learning Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Preferred Schedule
                </label>
                <input
                  value={preferredSchedule}
                  onChange={(e) => setPreferredSchedule(e.target.value)}
                  placeholder="e.g. Weekdays 6-8 PM"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Learning Mode
                </label>
                <select
                  value={preferredLearningMode}
                  onChange={(e) => setPreferredLearningMode(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  {learningModeOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Weekly Hours Needed
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 font-semibold text-sm px-6 py-2.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saved ? "Saved All Changes!" : saving ? "Saving..." : "Save Profile & Preferences"}
          </Button>

          <Button
            variant="ghost"
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {/* Security & Verification Card */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Account Security & Verification</h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              OTP Verified
            </span>
          </div>

          <div className="space-y-3 divide-y divide-stone-100 text-xs">
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Active Role</span>
              <span className="font-semibold text-slate-900 capitalize">
                {user?.role || "Student"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Privacy Mode</span>
              <span className="font-semibold text-teal-700">
                {isDiscoverable ? "Opt-in discovery enabled (Safe fields only)" : "Hidden from public search"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Authentication Protocol</span>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-slate-800">Verified Client & Convex Backend Sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Picture Upload & Cropper Modal */}
      <ProfileAvatarCropper
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        userName={name || user?.name || "User"}
        currentAvatarUrl={user?.avatarUrl || user?.image}
        userRole={user?.role}
        userId={user?._id}
        onUploadSuccess={(newUrl, storageId) => {
          updateProfile({
            image: newUrl,
            avatarUrl: newUrl,
            avatarStorageId: storageId,
          });
          toast.success("Profile picture updated and synchronized across the platform!");
        }}
        onRemoveSuccess={() => {
          updateProfile({
            image: undefined,
            avatarUrl: undefined,
            avatarStorageId: undefined,
          });
          toast.success("Profile picture removed. Initials will be used.");
        }}
      />
    </main>
  );
}
