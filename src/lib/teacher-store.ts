// Teacher Application & Profile Store with persistent local and cloud fallback
import { AuthUser, getActiveSession, updateActiveSessionRole } from "./auth-store";
import { AUTHORITATIVE_SEED_TEACHERS, AuthoritativeTeacher } from "./teacher-authoritative-data";

export interface EducationEntry {
  degree: string;
  institution: string;
  department?: string;
  passingYear?: number | string;
  result?: string;
  certificateUrl?: string;
}

export interface TeacherApplicationData {
  _id?: string;
  userId: string;
  name: string;
  email: string;
  userEmail?: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  country: string;
  timezone: string;
  hourlyRate: number;
  price30min: number;
  price60min: number;
  groupPrice: number;
  trialPrice: number;
  subjects: string[];
  classLevels: string[];
  expertise: string[];
  languages: string[];
  yearsExperience: number;
  currentPosition?: string;
  previousExperience?: string;
  education: EducationEntry[];
  onlineTeachingExperience?: string;
  preferredPlatforms: string[];
  onlineTools: string[];
  preferredClassDuration: string;
  classTypes: string[];
  nidNumber?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  nidFrontFileName?: string;
  nidBackFileName?: string;
  verificationStatus: "not_started" | "draft" | "under_review" | "needs_attention" | "verified" | "rejected" | "suspended";
  isVerified: boolean;
  isAvailable?: boolean;
  userAccountStatus?: "active" | "suspended" | "pending";
  adminFeedback?: string;
  rejectionReason?: string;
  submittedAt?: number;
  reviewedAt?: number;
  reviewedBy?: string;
  profileCompletionScore: number;
  profileCompletionPct?: number;
  rating?: number;
  reviewCount?: number;
  totalStudents?: number;
  totalHours?: number;
  auditLogs?: Array<{ action: string; performedBy: string; timestamp: number; reason?: string }>;
  profile?: any;
  user?: any;
}

const STORAGE_TEACHER_APPS_KEY = "vtp_teacher_applications_v1";
const TEACHER_STORE_EVENT = "vtp_teacher_store_change";

function notifyTeacherStoreChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TEACHER_STORE_EVENT));
  }
}

export function calculateTeacherCompletion(data: Partial<TeacherApplicationData>): number {
  let score = 0;
  if (data.name && data.name.trim().length > 1) score += 10;
  if (data.title && data.title.trim().length > 2) score += 10;
  if (data.bio && data.bio.trim().length >= 30) score += 10;
  if (data.country && data.country.trim().length > 1) score += 5;
  if (data.subjects && data.subjects.length > 0) score += 15;
  if (data.classLevels && data.classLevels.length > 0) score += 10;
  if (data.languages && data.languages.length > 0) score += 5;
  if (data.hourlyRate && data.hourlyRate > 0) score += 5;
  if (data.education && data.education.length > 0 && data.education[0].degree?.trim()) score += 10;
  if (data.yearsExperience !== undefined && data.yearsExperience >= 0) score += 5;
  if (data.nidNumber && data.nidNumber.trim().length >= 4) score += 5;
  if (data.nidFrontUrl && data.nidFrontUrl.trim().length > 5) score += 10;
  return Math.min(100, Math.round(score));
}

// Initial seed applications for discovery derived from authoritative data source
const DEFAULT_VERIFIED_TEACHERS: TeacherApplicationData[] = AUTHORITATIVE_SEED_TEACHERS.map((t) => ({
  _id: t._id,
  userId: t.userId,
  name: t.name,
  email: t.email || `${t.userId}@liveclass.edu`,
  title: t.title,
  bio: t.bio,
  avatarUrl: t.avatarUrl,
  country: t.country,
  timezone: t.timezone,
  hourlyRate: t.hourlyRate,
  price30min: t.price30min,
  price60min: t.price60min,
  groupPrice: t.groupPrice,
  trialPrice: t.trialPrice,
  subjects: t.subjects,
  classLevels: t.classLevels,
  expertise: t.expertise,
  languages: t.languages,
  yearsExperience: t.yearsExperience,
  education: t.education,
  preferredPlatforms: ["Virtual Tutor Pro Classroom", "Interactive Digital Whiteboard"],
  onlineTools: ["Interactive Digital Whiteboard", "Noise-Cancelling Studio Mic", "HD Webcam"],
  preferredClassDuration: "60 mins",
  classTypes: ["1-on-1 Private Lessons", "Small Group Cohorts", "Exam Review"],
  verificationStatus: "verified",
  isVerified: true,
  isAvailable: t.isAvailable,
  profileCompletionScore: 100,
  profileCompletionPct: 100,
  rating: t.rating,
  reviewCount: t.reviewCount,
  totalStudents: t.totalStudents,
  totalHours: t.totalHours,
}));

export function getAllTeacherApplications(): TeacherApplicationData[] {
  if (typeof window === "undefined") return DEFAULT_VERIFIED_TEACHERS;
  try {
    const raw = localStorage.getItem(STORAGE_TEACHER_APPS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_TEACHER_APPS_KEY, JSON.stringify(DEFAULT_VERIFIED_TEACHERS));
      return DEFAULT_VERIFIED_TEACHERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge with default seed teachers so ratings, reviews, and subjects stay enriched
      const merged = [...parsed];
      for (const def of DEFAULT_VERIFIED_TEACHERS) {
        const idx = merged.findIndex((m) => m.userId === def.userId);
        if (idx >= 0) {
          merged[idx] = {
            ...def,
            ...merged[idx],
            rating: def.rating, // Authoritative rating
            reviewCount: def.reviewCount, // Authoritative reviews
            totalStudents: def.totalStudents,
            totalHours: def.totalHours,
            isVerified: true,
            verificationStatus: "verified",
          };
        } else {
          merged.push(def);
        }
      }
      return merged;
    }
    return DEFAULT_VERIFIED_TEACHERS;
  } catch {
    return DEFAULT_VERIFIED_TEACHERS;
  }
}

export function saveAllTeacherApplications(apps: TeacherApplicationData[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_TEACHER_APPS_KEY, JSON.stringify(apps));
    notifyTeacherStoreChange();
  } catch (err) {
    console.error("Failed to save teacher applications:", err);
  }
}

export function getTeacherApplicationByUserId(userId: string): TeacherApplicationData | null {
  const apps = getAllTeacherApplications();
  return apps.find((a) => a.userId === userId) || null;
}

export function saveTeacherDraft(
  userId: string,
  userEmail: string,
  updates: Partial<TeacherApplicationData>
): TeacherApplicationData {
  const apps = getAllTeacherApplications();
  const existingIndex = apps.findIndex((a) => a.userId === userId);

  let record: TeacherApplicationData;

  if (existingIndex >= 0) {
    const prev = apps[existingIndex];
    record = {
      ...prev,
      ...updates,
      userId,
      email: userEmail || prev.email,
      verificationStatus: prev.verificationStatus === "verified" ? "verified" : (prev.verificationStatus === "under_review" ? "under_review" : "draft"),
      isVerified: prev.isVerified,
      profileCompletionScore: calculateTeacherCompletion({ ...prev, ...updates }),
    };
    apps[existingIndex] = record;
  } else {
    record = {
      userId,
      name: updates.name || "Teacher Applicant",
      email: userEmail,
      title: updates.title || "",
      bio: updates.bio || "",
      avatarUrl: updates.avatarUrl || "",
      country: updates.country || "United States",
      timezone: updates.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
      hourlyRate: updates.hourlyRate || 35,
      price30min: updates.price30min || 20,
      price60min: updates.price60min || 35,
      groupPrice: updates.groupPrice || 25,
      trialPrice: updates.trialPrice || 15,
      subjects: updates.subjects || [],
      classLevels: updates.classLevels || [],
      expertise: updates.expertise || [],
      languages: updates.languages || ["English"],
      yearsExperience: updates.yearsExperience || 1,
      currentPosition: updates.currentPosition || "",
      previousExperience: updates.previousExperience || "",
      education: updates.education || [],
      onlineTeachingExperience: updates.onlineTeachingExperience || "",
      preferredPlatforms: updates.preferredPlatforms || ["Virtual Tutor Pro Classroom"],
      onlineTools: updates.onlineTools || ["Interactive Digital Whiteboard"],
      preferredClassDuration: updates.preferredClassDuration || "60 mins",
      classTypes: updates.classTypes || ["1-on-1 Private Lessons"],
      nidNumber: updates.nidNumber || "",
      nidFrontUrl: updates.nidFrontUrl || "",
      nidBackUrl: updates.nidBackUrl || "",
      nidFrontFileName: updates.nidFrontFileName || "",
      nidBackFileName: updates.nidBackFileName || "",
      verificationStatus: "draft",
      isVerified: false,
      profileCompletionScore: calculateTeacherCompletion(updates),
      ...updates,
    };
    apps.push(record);
  }

  saveAllTeacherApplications(apps);
  return record;
}

export function submitTeacherApplication(
  userId: string,
  userEmail: string,
  data: Partial<TeacherApplicationData>
): TeacherApplicationData {
  const score = calculateTeacherCompletion(data);
  if (score < 40) {
    throw new Error(`Your application completion is ${score}%. Please fill in mandatory identity, education, and subject details (minimum 40% completion).`);
  }

  const apps = getAllTeacherApplications();
  const existingIndex = apps.findIndex((a) => a.userId === userId);

  const submissionRecord: TeacherApplicationData = {
    ...(existingIndex >= 0 ? apps[existingIndex] : {}),
    ...data,
    userId,
    email: userEmail,
    name: data.name || "Teacher Applicant",
    title: data.title || "",
    bio: data.bio || "",
    country: data.country || "United States",
    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    hourlyRate: data.hourlyRate || 35,
    price30min: data.price30min || 20,
    price60min: data.price60min || 35,
    groupPrice: data.groupPrice || 25,
    trialPrice: data.trialPrice || 15,
    subjects: data.subjects || [],
    classLevels: data.classLevels || [],
    expertise: data.expertise || [],
    languages: data.languages || ["English"],
    yearsExperience: data.yearsExperience ?? 1,
    education: data.education || [],
    preferredPlatforms: data.preferredPlatforms || ["Virtual Tutor Pro Classroom"],
    onlineTools: data.onlineTools || ["Interactive Digital Whiteboard"],
    preferredClassDuration: data.preferredClassDuration || "60 mins",
    classTypes: data.classTypes || ["1-on-1 Private Lessons"],
    nidNumber: data.nidNumber || "",
    nidFrontUrl: data.nidFrontUrl || "",
    nidBackUrl: data.nidBackUrl || "",
    verificationStatus: "under_review",
    isVerified: false,
    submittedAt: Date.now(),
    profileCompletionScore: score,
  };

  if (existingIndex >= 0) {
    apps[existingIndex] = submissionRecord;
  } else {
    apps.push(submissionRecord);
  }

  saveAllTeacherApplications(apps);
  return submissionRecord;
}

// Admin Operations
export function adminReviewTeacherApplication(
  teacherUserId: string,
  action: "approve" | "reject" | "changes" | "suspend" | "reactivate",
  adminName: string,
  feedback?: string
): TeacherApplicationData {
  const apps = getAllTeacherApplications();
  const index = apps.findIndex((a) => a.userId === teacherUserId);
  if (index === -1) {
    throw new Error("Teacher application not found.");
  }

  const app = apps[index];
  let newStatus: TeacherApplicationData["verificationStatus"] = app.verificationStatus;
  let isVerified = app.isVerified;

  switch (action) {
    case "approve":
      newStatus = "verified";
      isVerified = true;
      break;
    case "reject":
      newStatus = "rejected";
      isVerified = false;
      break;
    case "changes":
      newStatus = "needs_attention";
      isVerified = false;
      break;
    case "suspend":
      newStatus = "suspended";
      isVerified = false;
      break;
    case "reactivate":
      newStatus = "verified";
      isVerified = true;
      break;
  }

  const updated: TeacherApplicationData = {
    ...app,
    verificationStatus: newStatus,
    isVerified,
    adminFeedback: feedback || app.adminFeedback,
    reviewedAt: Date.now(),
    reviewedBy: adminName,
  };

  apps[index] = updated;
  saveAllTeacherApplications(apps);

  // If approved, update active user session if this user is logged in
  const session = getActiveSession();
  if (session && session._id === teacherUserId && action === "approve") {
    updateActiveSessionRole("teacher");
  }

  return updated;
}
