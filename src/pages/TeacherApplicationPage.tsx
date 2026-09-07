import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTeacherProfile } from "@/hooks/use-teacher-profile";
import { useNavigate } from "react-router";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Upload,
  Save,
  Send,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  Globe,
  DollarSign,
  BookOpen,
  Award,
  Monitor,
  Info,
  ArrowRight,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { EducationEntry } from "@/lib/teacher-store";

const COMMON_SUBJECTS = [
  "Mathematics",
  "AP Calculus BC",
  "Algebra I & II",
  "Physics Mechanics",
  "Chemistry",
  "Biology",
  "Computer Science & Python",
  "English Literature",
  "Spanish Language",
  "French Language",
  "IELTS / TOEFL Prep",
  "SAT / ACT Math",
  "Economics",
  "History",
];

const CLASS_LEVELS = [
  "Primary / Elementary (Grades 1-5)",
  "Middle School (Grades 6-8)",
  "High School (Grades 9-12)",
  "AP / IB Diploma Level",
  "College / Undergraduate",
  "Adult & Professional",
  "Standardized Exam Prep",
];

const ONLINE_PLATFORMS = [
  "Virtual Tutor Pro Classroom",
  "Zoom Video",
  "Google Meet",
  "Microsoft Teams",
  "Skype",
];

const ONLINE_TOOLS = [
  "Interactive Digital Whiteboard",
  "Screen Sharing & Annotation",
  "Graphics Tablet / Stylus Pen",
  "Dedicated HD Webcam",
  "Noise-Cancelling Studio Mic",
  "Dual Monitor Setup",
];

export default function TeacherApplicationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile: myProfile, saveDraft, submitApplication } = useTeacherProfile();

  // Form State
  const [name, setName] = useState(myProfile?.name || user?.name || "");
  const [title, setTitle] = useState(myProfile?.title || "");
  const [bio, setBio] = useState(myProfile?.bio || "");
  const [country, setCountry] = useState(myProfile?.country || "United States");
  const [timezone, setTimezone] = useState(
    myProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  );
  const initialMonthlyTuition = myProfile?.hourlyRate
    ? (myProfile.hourlyRate >= 500 ? myProfile.hourlyRate : myProfile.hourlyRate * 100)
    : 4000;
  const [hourlyRate, setHourlyRate] = useState<number>(initialMonthlyTuition);
  const [price30Min, setPrice30Min] = useState<number>(Math.round(initialMonthlyTuition * 0.55));
  const [price60Min, setPrice60Min] = useState<number>(initialMonthlyTuition);
  const [priceSmallGroup, setPriceSmallGroup] = useState<number>(Math.round(initialMonthlyTuition * 0.7));
  const [priceTrial, setPriceTrial] = useState<number>(Math.round(initialMonthlyTuition * 0.25));

  const [subjects, setSubjects] = useState<string[]>(myProfile?.subjects || []);
  const [customSubjectInput, setCustomSubjectInput] = useState("");
  const [classLevels, setClassLevels] = useState<string[]>(myProfile?.classLevels || []);
  const [expertise, setExpertise] = useState<string[]>(myProfile?.expertise || []);
  const [languages, setLanguages] = useState<string[]>(myProfile?.languages || ["English"]);
  const [customLanguageInput, setCustomLanguageInput] = useState("");

  const [yearsExperience, setYearsExperience] = useState<number>(myProfile?.yearsExperience ?? 3);
  const [currentPosition, setCurrentPosition] = useState(myProfile?.currentPosition || "");
  const [previousTeachingHistory, setPreviousTeachingHistory] = useState(myProfile?.previousExperience || "");

  const [educationHistory, setEducationHistory] = useState<EducationEntry[]>(
    myProfile?.education && myProfile.education.length > 0
      ? myProfile.education
      : [
          {
            degree: "Bachelor of Science",
            institution: "State University",
            department: "Mathematics",
            passingYear: 2020,
            result: "GPA 3.8 / 4.0",
          },
        ]
  );

  const [onlineTeachingExperience, setOnlineTeachingExperience] = useState(myProfile?.onlineTeachingExperience || "");
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>(
    myProfile?.preferredPlatforms || ["Virtual Tutor Pro Classroom", "Zoom Video"]
  );
  const [onlineTools, setOnlineTools] = useState<string[]>(
    myProfile?.onlineTools || [
      "Interactive Digital Whiteboard",
      "Screen Sharing & Annotation",
      "Noise-Cancelling Studio Mic",
    ]
  );
  const [preferredLessonDuration, setPreferredLessonDuration] = useState(myProfile?.preferredClassDuration || "60 mins");
  const [classTypes, setClassTypes] = useState<string[]>(myProfile?.classTypes || ["1-on-1 Private Lessons", "Exam Review"]);

  // Identity verification
  const [nidNumber, setNidNumber] = useState(myProfile?.nidNumber || "");
  const [frontDocUrl, setFrontDocUrl] = useState(myProfile?.nidFrontUrl || "");
  const [backDocUrl, setBackDocUrl] = useState(myProfile?.nidBackUrl || "");
  const [frontFileName, setFrontFileName] = useState(myProfile?.nidFrontFileName || (myProfile?.nidFrontUrl ? "Identity_Front_Document.pdf" : ""));
  const [backFileName, setBackFileName] = useState(myProfile?.nidBackFileName || (myProfile?.nidBackUrl ? "Identity_Back_Document.pdf" : ""));

  // Submission / Loading state
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState<"front" | "back" | null>(null);
  const convex = useConvex();

  // Sync state when profile is loaded asynchronously
  useEffect(() => {
    if (!myProfile) return;
    if (myProfile.name) setName((prev) => prev || myProfile.name);
    if (myProfile.title) setTitle((prev) => prev || myProfile.title);
    if (myProfile.bio) setBio((prev) => prev || myProfile.bio);
    if (myProfile.country) setCountry((prev) => (prev === "United States" ? myProfile.country : prev));
    if (myProfile.hourlyRate) {
      const tuition = myProfile.hourlyRate >= 500 ? myProfile.hourlyRate : myProfile.hourlyRate * 100;
      setHourlyRate((prev) => (prev === 4000 ? tuition : prev));
      setPrice60Min((prev) => (prev === 4000 ? tuition : prev));
    }
    if (myProfile.groupPrice) setPriceSmallGroup((prev) => (prev === 2800 ? myProfile.groupPrice : prev));

    if (myProfile.subjects && myProfile.subjects.length > 0) {
      setSubjects((prev) => (prev.length === 0 ? myProfile.subjects : prev));
    }
    if (myProfile.classLevels && myProfile.classLevels.length > 0) {
      setClassLevels((prev) => (prev.length === 0 ? myProfile.classLevels : prev));
    }
    if (myProfile.expertise && myProfile.expertise.length > 0) {
      setExpertise((prev) => (prev.length === 0 ? myProfile.expertise : prev));
    }
    if (myProfile.education && myProfile.education.length > 0) {
      setEducationHistory((prev) => (prev.length === 1 && prev[0].institution === "State University" ? myProfile.education! : prev));
    }
    if (myProfile.nidNumber) setNidNumber((prev) => prev || (myProfile.nidNumber || ""));
    if (myProfile.nidFrontUrl) {
      setFrontDocUrl((prev) => prev || (myProfile.nidFrontUrl || ""));
      setFrontFileName((prev) => prev || myProfile.nidFrontFileName || "Identity_Front_Document.pdf");
    }
    if (myProfile.nidBackUrl) {
      setBackDocUrl((prev) => prev || (myProfile.nidBackUrl || ""));
      setBackFileName((prev) => prev || myProfile.nidBackFileName || "Identity_Back_Document.pdf");
    }
  }, [myProfile?.userId, myProfile?.verificationStatus]);

  // Client-side Profile Completion Calculator (identical to server-side standard)
  const calculateCompletion = () => {
    let score = 0;
    if (name?.trim()) score += 10;
    if (title?.trim()) score += 10;
    if (bio?.trim() && bio.trim().length >= 30) score += 10;
    if (country?.trim()) score += 5;
    if (subjects && subjects.length > 0) score += 15;
    if (classLevels && classLevels.length > 0) score += 10;
    if (languages && languages.length > 0) score += 5;
    if (hourlyRate && hourlyRate > 0) score += 5;
    if (educationHistory && educationHistory.length > 0 && educationHistory[0].degree?.trim()) score += 10;
    if (yearsExperience && yearsExperience > 0) score += 5;
    if (nidNumber?.trim()) score += 5;
    if (frontDocUrl?.trim()) score += 10;
    return Math.min(100, score);
  };

  const completionPercent = calculateCompletion();
  const verificationStatus = myProfile?.verificationStatus || "not_started";
  const isLocked = verificationStatus === "under_review" || verificationStatus === "verified";

  // Handlers for dynamic tags
  const toggleSubject = (s: string) => {
    if (isLocked) return;
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const addCustomSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed]);
      setCustomSubjectInput("");
    }
  };

  const toggleClassLevel = (level: string) => {
    if (isLocked) return;
    setClassLevels((prev) =>
      prev.includes(level) ? prev.filter((item) => item !== level) : [...prev, level]
    );
  };

  const togglePlatform = (p: string) => {
    if (isLocked) return;
    setPreferredPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const toggleTool = (t: string) => {
    if (isLocked) return;
    setOnlineTools((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
  };

  const addEducationRow = () => {
    if (isLocked) return;
    setEducationHistory([
      ...educationHistory,
      { degree: "", institution: "", department: "", passingYear: new Date().getFullYear(), result: "" },
    ]);
  };

  const removeEducationRow = (index: number) => {
    if (isLocked) return;
    setEducationHistory(educationHistory.filter((_, i) => i !== index));
  };

  const updateEducationRow = (index: number, field: keyof EducationEntry, val: unknown) => {
    if (isLocked) return;
    const updated = [...educationHistory];
    updated[index] = { ...updated[index], [field]: val };
    setEducationHistory(updated);
  };

  // Production document uploader using real Convex Storage with secure fallback
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "back"
  ) => {
    if (isLocked) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit. Please upload a smaller document.");
      return;
    }

    setIsUploadingDoc(type);
    try {
      if (convex && (api.teachers as any)?.generateDocumentUploadUrl) {
        // 1. Generate authorized upload URL in Convex storage
        const uploadUrl = await convex.mutation((api.teachers as any).generateDocumentUploadUrl, {});

        // 2. Direct binary POST
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!res.ok) {
          throw new Error(`Upload returned status ${res.status}`);
        }

        const { storageId } = await res.json();

        // 3. Resolve permanent storage URL
        let resolvedUrl = "";
        if ((api.teachers as any)?.getDocumentUrl) {
          resolvedUrl = await convex.mutation((api.teachers as any).getDocumentUrl, { storageId });
        }

        const finalUrl = resolvedUrl || storageId;
        if (type === "front") {
          setFrontDocUrl(finalUrl);
          setFrontFileName(file.name);
          toast.success(`Front ID "${file.name}" uploaded to secure storage.`);
        } else {
          setBackDocUrl(finalUrl);
          setBackFileName(file.name);
          toast.success(`Back ID "${file.name}" uploaded to secure storage.`);
        }
      } else {
        throw new Error("Convex storage endpoint unavailable");
      }
    } catch (err) {
      // Local fallback to base64 Data URL (never mock domains)
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (type === "front") {
          setFrontDocUrl(result);
          setFrontFileName(file.name);
          toast.success(`Front ID "${file.name}" attached.`);
        } else {
          setBackDocUrl(result);
          setBackFileName(file.name);
          toast.success(`Back ID "${file.name}" attached.`);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingDoc(null);
    }
  };

  // ─── SAVE DRAFT ─────────────────────────────────────────
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      await saveDraft({
        name,
        title,
        bio,
        country,
        timezone,
        hourlyRate: Number(hourlyRate) > 0 ? Number(hourlyRate) : 0,
        price30min: price30Min ? Number(price30Min) : undefined,
        price60min: price60Min ? Number(price60Min) : undefined,
        groupPrice: priceSmallGroup ? Number(priceSmallGroup) : undefined,
        trialPrice: priceTrial ? Number(priceTrial) : undefined,
        subjects,
        classLevels,
        expertise,
        languages,
        yearsExperience: Number(yearsExperience) || 0,
        currentPosition,
        previousExperience: previousTeachingHistory,
        education: educationHistory,
        onlineTeachingExperience,
        preferredPlatforms,
        onlineTools,
        preferredClassDuration: preferredLessonDuration,
        classTypes,
        nidNumber,
        nidFrontUrl: frontDocUrl,
        nidBackUrl: backDocUrl,
        nidFrontFileName: frontFileName,
        nidBackFileName: backFileName,
      });
      toast.success("Draft saved successfully. Profile completion updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ─── SUBMIT APPLICATION ──────────────────────────────────
  const handleSubmitApplication = async () => {
    if (completionPercent < 40) {
      toast.error(
        `Profile completion is currently ${completionPercent}%. A minimum of 40% is required to submit.`
      );
      return;
    }

    if (!nidNumber || !nidNumber.trim()) {
      toast.error("Please provide your Government ID / NID Number for verification.");
      return;
    }

    if (!frontDocUrl || !frontDocUrl.trim()) {
      toast.error("Please upload the front photo/scan of your Government ID document.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitApplication({
        name,
        title,
        bio,
        country,
        timezone,
        hourlyRate: Number(hourlyRate) > 0 ? Number(hourlyRate) : 0,
        price30min: price30Min ? Number(price30Min) : undefined,
        price60min: price60Min ? Number(price60Min) : undefined,
        groupPrice: priceSmallGroup ? Number(priceSmallGroup) : undefined,
        trialPrice: priceTrial ? Number(priceTrial) : undefined,
        subjects,
        classLevels,
        expertise,
        languages,
        yearsExperience: Number(yearsExperience) || 0,
        currentPosition,
        previousExperience: previousTeachingHistory,
        education: educationHistory,
        onlineTeachingExperience,
        preferredPlatforms,
        onlineTools,
        preferredClassDuration: preferredLessonDuration,
        classTypes,
        nidNumber,
        nidFrontUrl: frontDocUrl,
        nidBackUrl: backDocUrl,
        nidFrontFileName: frontFileName,
        nidBackFileName: backFileName,
      });
      toast.success("Application submitted! An administrator will review your credentials.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header & Status Card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 shadow-xs">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Teacher Registration & Verification
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete your verified educator profile and submit identity documents for administrator review
                </p>
              </div>
            </div>

            {/* Status Pill */}
            <div className="flex items-center gap-2">
              {verificationStatus === "not_started" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-slate-700 border border-stone-200">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Draft Application
                </span>
              )}
              {verificationStatus === "under_review" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Under Review
                </span>
              )}
              {verificationStatus === "needs_attention" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> Action Required
                </span>
              )}
              {verificationStatus === "rejected" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
                  <XCircle className="w-3.5 h-3.5 text-red-600" /> Rejected
                </span>
              )}
              {verificationStatus === "verified" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Verified Educator
                </span>
              )}
            </div>
          </div>

          {/* Profile Completion Progress Bar */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Profile Completion:
              </span>
              <span className={completionPercent >= 50 ? "text-teal-700" : "text-amber-700"}>
                {completionPercent}% {completionPercent >= 50 ? "(Minimum 50% Requirement Met)" : "(Minimum 50% Needed to Submit)"}
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  completionPercent >= 75
                    ? "bg-teal-600"
                    : completionPercent >= 50
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                }`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          {/* Notifications / Status Banners */}
          {verificationStatus === "under_review" && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Application Currently Under Review</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  Your credentials and identity documents have been submitted and are currently queued for administrator evaluation.
                  Fields are locked in read-only mode during review. You will be notified immediately upon decision.
                </p>
              </div>
            </div>
          )}

          {verificationStatus === "needs_attention" && (
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Administrator Feedback & Corrections Requested</p>
                <p className="mt-0.5 text-orange-800 leading-relaxed">
                  The reviewing administrator requested adjustments before approving your account.
                </p>
                {(myProfile?.adminFeedback || (myProfile as any)?.rejectionReason) && (
                  <div className="mt-2 p-2.5 bg-white/80 rounded-lg border border-orange-200 font-mono text-[11px] text-orange-950">
                    "{myProfile?.adminFeedback || (myProfile as any)?.rejectionReason}"
                  </div>
                )}
                <p className="mt-2 text-orange-800 font-medium">
                  Please update the requested fields below and click "Submit Application" to resubmit.
                </p>
              </div>
            </div>
          )}

          {verificationStatus === "rejected" && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Application Not Approved</p>
                {(myProfile?.adminFeedback || (myProfile as any)?.rejectionReason) && (
                  <p className="mt-1 text-red-800 italic">
                    "{myProfile?.adminFeedback || (myProfile as any)?.rejectionReason}"
                  </p>
                )}
                <p className="mt-2 text-red-800">
                  You can update your credentials or provide supplementary documentation to submit a new application.
                </p>
              </div>
            </div>
          )}

          {verificationStatus === "verified" && (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-teal-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">You are an Approved Verified Teacher</p>
                  <p className="text-teal-800 text-[11px]">
                    Your credentials have been authenticated. Your profile is visible in public teacher discovery.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/teacher-dashboard")}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9"
              >
                Go to Teacher Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>

        {/* Section 1: Basic Information */}
        <Card className="border border-stone-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3 border-b border-stone-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              1. Basic Information
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Personal and display details visible to students on your public tutor profile
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Full Legal Name <span className="text-red-500">*</span>
                </label>
                <Input
                  disabled={isLocked}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Dr. Sarah Jenkins"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Professional Title <span className="text-red-500">*</span>
                </label>
                <Input
                  disabled={isLocked}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Senior AP Calculus & Physics Specialist"
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Country of Residence</label>
                <Input
                  disabled={isLocked}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g., United States"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Timezone</label>
                <Input
                  disabled={isLocked}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g., America/New_York (EST)"
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">
                  Detailed Bio & Teaching Philosophy <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {bio.length} characters (min 30 recommended)
                </span>
              </div>
              <textarea
                disabled={isLocked}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Describe your teaching approach, background, student successes, and how you conduct interactive live sessions..."
                className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-stone-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Subject & Curriculum Expertise */}
        <Card className="border border-stone-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3 border-b border-stone-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              2. Subjects & Target Class Levels
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Select the academic disciplines and student cohorts you are qualified to instruct
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            {/* Subjects multiselect */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Teaching Subjects <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SUBJECTS.map((s) => {
                  const isSelected = subjects.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={isLocked}
                      onClick={() => toggleSubject(s)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                        isSelected
                          ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                          : "bg-stone-50 text-slate-700 border-stone-200 hover:border-teal-400"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                      {s}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Subject */}
              {!isLocked && (
                <div className="flex gap-2 pt-2 max-w-sm">
                  <Input
                    placeholder="Add other subject..."
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSubject())}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addCustomSubject}
                    className="h-8 text-xs shrink-0"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
              )}
            </div>

            {/* Class Levels */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="text-xs font-semibold text-slate-700 block">
                Target Student Class Levels <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CLASS_LEVELS.map((lvl) => {
                  const isSelected = classLevels.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      disabled={isLocked}
                      onClick={() => toggleClassLevel(lvl)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-teal-50/80 border-teal-500 text-teal-950 font-semibold"
                          : "bg-stone-50/40 border-stone-200 text-slate-700 hover:border-stone-300"
                      }`}
                    >
                      <span>{lvl}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-stone-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Monthly Tuition Plan & Languages */}
        <Card className="border border-stone-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3 border-b border-stone-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-teal-700 font-bold text-lg leading-none">৳</span>
              3. Monthly Tuition Plan & Languages
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Students are charged on a monthly tuition plan only (in Bangladeshi Taka / Tk).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Monthly Tuition Fee (৳ Tk / month) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Monthly Charge Only
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-teal-800 font-bold">৳</span>
                  <Input
                    type="number"
                    disabled={isLocked}
                    min={500}
                    max={50000}
                    step={100}
                    value={hourlyRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setHourlyRate(val);
                      setPrice60Min(val);
                    }}
                    placeholder="e.g. 4000"
                    className="h-9 pl-7 text-xs font-semibold font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Standard 1-on-1 monthly tuition charged to student for regular weekly live lessons.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700">
                  Small Group Monthly Fee (৳ Tk / student)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-teal-800 font-bold">৳</span>
                  <Input
                    type="number"
                    disabled={isLocked}
                    min={500}
                    max={30000}
                    step={100}
                    value={priceSmallGroup}
                    onChange={(e) => setPriceSmallGroup(Number(e.target.value))}
                    placeholder="e.g. 2500"
                    className="h-9 pl-7 text-xs font-semibold font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Discounted monthly tuition rate per student for small group cohort batches.
                </p>
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" /> Languages of Instruction
              </label>
              <div className="flex flex-wrap gap-1.5">
                {languages.map((lang, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-slate-800 text-xs font-medium"
                  >
                    {lang}
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => setLanguages(languages.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500 ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {!isLocked && (
                <div className="flex gap-2 max-w-xs pt-1">
                  <Input
                    placeholder="e.g., Spanish, French..."
                    value={customLanguageInput}
                    onChange={(e) => setCustomLanguageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customLanguageInput.trim()) {
                          setLanguages([...languages, customLanguageInput.trim()]);
                          setCustomLanguageInput("");
                        }
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (customLanguageInput.trim()) {
                        setLanguages([...languages, customLanguageInput.trim()]);
                        setCustomLanguageInput("");
                      }
                    }}
                    className="h-8 text-xs shrink-0"
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Academic Credentials & Education History */}
        <Card className="border border-stone-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3 border-b border-stone-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-teal-600" />
                4. Academic Credentials & Teaching History
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Verified university degrees, certificates, and years of educational background
              </CardDescription>
            </div>
            {!isLocked && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addEducationRow}
                className="text-xs border-stone-200 h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-teal-600" /> Add Degree
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Total Teaching Experience (Years) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  disabled={isLocked}
                  min={0}
                  max={50}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Current Position / Affiliation</label>
                <Input
                  disabled={isLocked}
                  value={currentPosition}
                  onChange={(e) => setCurrentPosition(e.target.value)}
                  placeholder="e.g., Mathematics Instructor / Independent Educator"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Dynamic Degrees List */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Higher Education Degrees & Certifications <span className="text-red-500">*</span>
              </label>

              {educationHistory.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Credential #{idx + 1}</span>
                    {!isLocked && educationHistory.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEducationRow(idx)}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      disabled={isLocked}
                      placeholder="Degree (e.g., M.S. in Applied Mathematics)"
                      value={edu.degree}
                      onChange={(e) => updateEducationRow(idx, "degree", e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                    <Input
                      disabled={isLocked}
                      placeholder="Institution (e.g., University of Cambridge)"
                      value={edu.institution}
                      onChange={(e) => updateEducationRow(idx, "institution", e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      disabled={isLocked}
                      placeholder="Department / Major"
                      value={edu.department || ""}
                      onChange={(e) => updateEducationRow(idx, "department", e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                    <Input
                      disabled={isLocked}
                      type="number"
                      placeholder="Year"
                      value={edu.passingYear || ""}
                      onChange={(e) => updateEducationRow(idx, "passingYear", Number(e.target.value))}
                      className="h-8 text-xs bg-white"
                    />
                    <Input
                      disabled={isLocked}
                      placeholder="Result / Honors"
                      value={edu.result || ""}
                      onChange={(e) => updateEducationRow(idx, "result", e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Online Teaching Environment & Tools */}
        <Card className="border border-stone-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3 border-b border-stone-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-teal-600" />
              5. Online Teaching Setup & Equipment
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Confirm your audio-visual hardware and virtual classroom capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Hardware & Interactive Equipment Available
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ONLINE_TOOLS.map((tool) => {
                  const isChecked = onlineTools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      disabled={isLocked}
                      onClick={() => toggleTool(tool)}
                      className={`p-2 rounded-lg border text-left text-xs flex items-center justify-between transition-all ${
                        isChecked
                          ? "bg-teal-50 border-teal-400 text-teal-900 font-semibold"
                          : "bg-white border-stone-200 text-slate-700 hover:border-stone-300"
                      }`}
                    >
                      <span>{tool}</span>
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${isChecked ? "text-teal-600" : "text-stone-300"}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="text-xs font-semibold text-slate-700 block">
                Supported Video Platforms
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ONLINE_PLATFORMS.map((plat) => {
                  const isChecked = preferredPlatforms.includes(plat);
                  return (
                    <button
                      key={plat}
                      type="button"
                      disabled={isLocked}
                      onClick={() => togglePlatform(plat)}
                      className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                        isChecked
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-stone-50 text-slate-700 border-stone-200"
                      }`}
                    >
                      {plat}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Identity Verification & Government Documents */}
        <Card className="border border-stone-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3 border-b border-stone-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              6. Identity Document Verification (NID / Passport)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Mandatory government verification documents required to unlock live classroom hosting
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            {/* Government ID Number */}
            <div className="space-y-1.5 max-w-md">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                Government ID / Passport / NID Number <span className="text-red-500">*</span>
              </label>
              <Input
                disabled={isLocked}
                placeholder="e.g., 8492019482910"
                value={nidNumber}
                onChange={(e) => setNidNumber(e.target.value)}
                className="h-10 text-xs font-mono font-semibold"
              />
            </div>

            {/* Document Uploads Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Front Document */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>Front ID Photo / Scan <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400">PDF, JPG, PNG &lt; 10MB</span>
                </label>

                {frontDocUrl ? (
                  <div className="p-3 bg-white rounded-lg border border-teal-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-teal-900 font-medium truncate">
                      <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="truncate">{frontFileName || "Front_ID_Document.pdf"}</span>
                    </div>
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          setFrontDocUrl("");
                          setFrontFileName("");
                        }}
                        className="text-slate-400 hover:text-red-500 text-xs ml-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ) : isUploadingDoc === "front" ? (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-teal-300 rounded-xl bg-teal-50/40 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600 mb-1" />
                    <span className="text-xs font-semibold text-teal-800">Uploading Front ID...</span>
                    <span className="text-[10px] text-teal-600 mt-0.5">Encrypting and uploading to secure storage</span>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 hover:border-teal-400 rounded-xl cursor-pointer bg-white transition-colors text-center">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">Upload Front Side</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Click or drag & drop</span>
                    <input
                      type="file"
                      disabled={isLocked}
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "front")}
                    />
                  </label>
                )}
              </div>

              {/* Back Document */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>Back ID Photo / Scan (Optional)</span>
                  <span className="text-[10px] text-slate-400">PDF, JPG, PNG &lt; 10MB</span>
                </label>

                {backDocUrl ? (
                  <div className="p-3 bg-white rounded-lg border border-teal-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-teal-900 font-medium truncate">
                      <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="truncate">{backFileName || "Back_ID_Document.pdf"}</span>
                    </div>
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          setBackDocUrl("");
                          setBackFileName("");
                        }}
                        className="text-slate-400 hover:text-red-500 text-xs ml-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ) : isUploadingDoc === "back" ? (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-teal-300 rounded-xl bg-teal-50/40 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600 mb-1" />
                    <span className="text-xs font-semibold text-teal-800">Uploading Back ID...</span>
                    <span className="text-[10px] text-teal-600 mt-0.5">Encrypting and uploading to secure storage</span>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 hover:border-teal-400 rounded-xl cursor-pointer bg-white transition-colors text-center">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">Upload Back Side</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Click or drag & drop</span>
                    <input
                      type="file"
                      disabled={isLocked}
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "back")}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Privacy note */}
            <div className="p-3 bg-slate-50 rounded-xl border border-stone-200/80 flex items-start gap-2.5 text-[11px] text-slate-600">
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Data Privacy Guarantee:</strong> Government identity documents are strictly encrypted and used exclusively by Virtual Tutor Pro compliance officers to verify credentials and ensure trust & safety. Documents are never exposed to students or third parties.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Action Controls Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-teal-600" />
            <span>
              {isLocked
                ? "Application is currently locked for review."
                : "You can save draft progress anytime or submit when ready."}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {!isLocked && (
              <Button
                type="button"
                variant="outline"
                disabled={isSavingDraft || isSubmitting}
                onClick={handleSaveDraft}
                className="flex-1 sm:flex-none border-stone-200 text-slate-700 h-10 text-xs font-semibold"
              >
                {isSavingDraft ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                Save Draft
              </Button>
            )}

            {!isLocked && (
              <Button
                type="button"
                disabled={isSubmitting || isSavingDraft}
                onClick={handleSubmitApplication}
                className="flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-white h-10 text-xs font-semibold shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {verificationStatus === "needs_attention"
                      ? "Resubmit Application"
                      : "Submit for Verification"}
                  </>
                )}
              </Button>
            )}

            {verificationStatus === "verified" && (
              <Button
                onClick={() => navigate("/teacher-dashboard")}
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white h-10 text-xs font-semibold"
              >
                Go to Teacher Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
