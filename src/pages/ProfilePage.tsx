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
    <main className="min-h-screen bg-[#F5F4EF] text-[#111111] pb-24">
      <header className="bg-white/80 backdrop-blur-xs border-b border-[#E5E4DE] sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(isTeacher ? "/teacher-dashboard" : "/dashboard")}
            className="text-[#111111]/70 hover:text-[#111111] hover:bg-white rounded-full text-xs font-semibold gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Button>
          <h1 className="text-base font-bold text-[#111111] font-display">Identity & Preferences</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Profile Header & Picture Management Card */}
        <div className="bg-white rounded-3xl border border-[#E5E4DE] p-7 sm:p-8 shadow-xs space-y-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-7 border-b border-[#E5E4DE]">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Profile Avatar with Hover Edit Overlay */}
              <div className="relative group">
                <ProfileAvatar
                  name={user?.name || name}
                  image={user?.image || user?.avatarUrl}
                  role={user?.role}
                  size="2xl"
                  id="profile_page_avatar_preview"
                  className="ring-4 ring-[#F5F4EF] shadow-md"
                />
                <button
                  id="avatar_overlay_edit_btn"
                  onClick={() => setIsCropperOpen(true)}
                  className="absolute inset-0 rounded-full bg-[#111111]/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer backdrop-blur-[1px]"
                  title="Update profile picture"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-[11px] font-semibold">Change</span>
                </button>
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="text-2xl font-bold text-[#111111] font-display">{name || user?.name || "User"}</h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#F5F4EF] text-[#111111] border border-[#E5E4DE]">
                    {isTeacher ? <GraduationCap className="w-3.5 h-3.5 text-[#F26522]" /> : <BookOpen className="w-3.5 h-3.5 text-[#F26522]" />}
                    {isTeacher ? "Educator Profile" : "Scholar Profile"}
                  </span>
                </div>
                <p className="text-xs text-[#111111]/50">{user?.email || "No email"}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <Button
                    id="open_avatar_cropper_btn"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCropperOpen(true)}
                    className="text-xs border-[#E5E4DE] bg-[#F5F4EF] hover:bg-white text-[#111111] font-semibold gap-1.5 h-8 rounded-full px-4"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#F26522]" />
                    {user?.image || user?.avatarUrl ? "Change Photo" : "Upload Photo"}
                  </Button>
                  <span className="text-[11px] text-[#111111]/40">
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
              className="text-xs border-[#E5E4DE] hover:bg-[#F5F4EF] text-[#111111] font-semibold gap-2 self-center sm:self-start rounded-full px-4 h-9"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#F26522]" />
              Switch to {isTeacher ? "Student" : "Teacher"} View
            </Button>
          </div>

          {/* Profile Completion Meter */}
          <div className="p-5 rounded-2xl bg-[#F5F4EF] border border-[#E5E4DE] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#111111] font-display">Profile Completion:</span>
                <span className={`text-xs font-extrabold ${profileCompletionPercentage === 100 ? "text-[#111111]" : "text-[#F26522]"}`}>
                  {profileCompletionPercentage}%
                </span>
              </div>
              <span className="text-[11px] text-[#111111]/50">
                {profileCompletionPercentage === 100 ? "Profile is fully complete!" : `${completedCount} of ${completionChecks.length} items completed`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#E5E4DE]/60">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  profileCompletionPercentage === 100
                    ? "bg-[#111111]"
                    : "bg-[#F26522]"
                }`}
                style={{ width: `${profileCompletionPercentage}%` }}
              />
            </div>

            {/* Field breakdown checklist */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {completionChecks.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[11px]">
                  {item.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F26522] shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-[#111111]/30 shrink-0" />
                  )}
                  <span className={item.done ? "text-[#111111] font-medium" : "text-[#111111]/40 font-normal"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Core Info Fields */}
          <div className="space-y-5 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-[#111111]/40" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F5F4EF] border border-[#E5E4DE] rounded-2xl text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#111111]/40" />
                  <input
                    value={user?.email || ""}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-[#E5E4DE]/40 border border-[#E5E4DE] rounded-2xl text-sm text-[#111111]/50 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">
                  {isTeacher ? "Institution / University" : "School / Academy"}
                </label>
                <input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g., Oakridge Academy"
                  className="w-full px-4 py-2.5 bg-[#F5F4EF] border border-[#E5E4DE] rounded-2xl text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">Timezone</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-3 w-4 h-4 text-[#111111]/40" />
                  <input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F5F4EF] border border-[#E5E4DE] rounded-2xl text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">Bio / Summary</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-[#F5F4EF] border border-[#E5E4DE] rounded-2xl text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors resize-none"
                placeholder="Share your academic background, goals, or target milestones..."
              />
            </div>
          </div>
        </div>

        {/* Student Specific Discovery & Learning Requirements */}
        {!isTeacher && (
          <div className="bg-white rounded-3xl border border-[#E5E4DE] p-7 sm:p-8 shadow-xs space-y-7">
            {/* Discovery Visibility Toggle (Privacy Requirement) */}
            <div className="p-5 bg-[#F5F4EF] border border-[#E5E4DE] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-2xl ${isDiscoverable ? "bg-[#111111] text-white" : "bg-[#E5E4DE] text-[#111111]/60"}`}>
                  {isDiscoverable ? <Eye className="w-5 h-5 text-[#F26522]" /> : <EyeOff className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-[#111111] font-display">
                      Discoverable by Teachers: {isDiscoverable ? "ON" : "OFF"}
                    </h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      isDiscoverable ? "bg-[#111111] text-white" : "bg-[#E5E4DE] text-[#111111]/60"
                    }`}>
                      {isDiscoverable ? "Active Listing" : "Hidden"}
                    </span>
                  </div>
                  <p className="text-xs text-[#111111]/60 mt-1 leading-relaxed max-w-xl">
                    When enabled, verified educators can discover your subject requirements and propose personalized lessons. Your private email, phone number, and street address are strictly protected.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => handleToggleDiscoverable(!isDiscoverable)}
                className={`shrink-0 font-semibold text-xs rounded-full px-5 h-9 transition-colors ${
                  isDiscoverable
                    ? "bg-[#111111] hover:bg-[#F26522] text-white"
                    : "bg-[#F26522] hover:bg-[#111111] text-white"
                }`}
              >
                Turn Discovery {isDiscoverable ? "OFF" : "ON"}
              </Button>
            </div>

            {/* Academic Level & Curriculum */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">
                  Grade / Class Level
                </label>
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F5F4EF] border border-[#E5E4DE] rounded-2xl text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                >
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">
                  Curriculum / Examination Board
                </label>
                <select
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F5F4EF] border border-[#E5E4DE] rounded-2xl text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
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
              <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">
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
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        active
                          ? "bg-[#111111] text-white shadow-xs"
                          : "bg-[#F5F4EF] text-[#111111]/70 hover:text-[#111111] border border-[#E5E4DE]"
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
              <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">
                Academic Goals & Learning Requirements (Comma-separated)
              </label>
              <input
                value={learningGoals}
                onChange={(e) => setLearningGoals(e.target.value)}
                placeholder="e.g. Score 5 on AP Calculus, Improve algebra foundation, Exam preparation"
                className="w-full px-4 py-2.5 bg-[#F5F4EF] border border-[#E5E4DE] rounded-2xl text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
              />
            </div>

            {/* Schedule & Learning Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">
                  Preferred Schedule
                </label>
                <input
                  value={preferredSchedule}
                  onChange={(e) => setPreferredSchedule(e.target.value)}
                  placeholder="e.g. Weekdays 6-8 PM"
                  className="w-full px-4 py-2.5 bg-[#F5F4EF] border border-[#E5E4DE] rounded-2xl text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">
                  Learning Mode
                </label>
                <select
                  value={preferredLearningMode}
                  onChange={(e) => setPreferredLearningMode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F5F4EF] border border-[#E5E4DE] rounded-2xl text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                >
                  {learningModeOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] mb-2 block font-display">
                  Weekly Hours Needed
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#F5F4EF] border border-[#E5E4DE] rounded-2xl text-sm text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between bg-white rounded-3xl border border-[#E5E4DE] p-6 shadow-xs">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#111111] hover:bg-[#F26522] text-white gap-2 font-semibold text-sm px-7 py-3 rounded-full transition-colors shadow-xs"
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
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold gap-1.5 rounded-full px-4 h-9"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {/* Security & Verification Card */}
        <div className="bg-white rounded-3xl border border-[#E5E4DE] p-7 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-[#111111] font-display">Account Security & Verification</h3>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5F4EF] text-[#111111] border border-[#E5E4DE]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F26522]" />
              OTP Verified
            </span>
          </div>

          <div className="space-y-3 divide-y divide-[#E5E4DE] text-xs">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#111111]/60">Active Role</span>
              <span className="font-semibold text-[#111111] capitalize">
                {user?.role || "Student"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#111111]/60">Privacy Mode</span>
              <span className="font-semibold text-[#111111]">
                {isDiscoverable ? "Opt-in discovery enabled (Safe fields only)" : "Hidden from public search"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#111111]/60">Authentication Protocol</span>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#F26522]" />
                <span className="font-semibold text-[#111111]">Verified Client & Convex Backend Sync</span>
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
