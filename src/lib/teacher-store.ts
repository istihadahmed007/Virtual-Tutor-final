// Teacher Application & Profile Store with persistent local and cloud fallback
import { AuthUser, getActiveSession, updateActiveSessionRole } from "./auth-store";

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
export const TEACHER_STORE_EVENT = "vtp_teacher_store_change";

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

// Real database & application store only. Strictly zero hardcoded, simulated, or fake demo teachers.
export const DEFAULT_REGISTERED_TEACHERS: TeacherApplicationData[] = [];

export const LEGACY_FAKE_IDS = new Set([
  "demo_teacher_01",
  "demo_teacher_02",
  "teacher_prof_sarah",
  "teacher_prof_marcus",
  "teacher_prof_elena",
  "teacher_prof_david",
  "teacher_prof_amira",
  "teacher_prof_marcus_thorne",
  "tch_farzana",
  "tch_rahim",
  "teacher_prof_farhan",
  "tch_sarah",
  "usr_new_educator_99",
  "dr.farzana.yasmin@virtualtutorpro.com",
  "prof.rahim@virtualtutorpro.com",
  "dr.farhan@virtualtutorpro.com",
  "sarah.jenkins@virtualtutorpro.com",
  "sarah.jenkins@liveclass.edu",
  "elena.rostova@liveclass.edu",
]);

export function getAllTeacherApplications(): TeacherApplicationData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_TEACHER_APPS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Purge any legacy fake seed records or demo teachers that were stored in localStorage
      const realOnly = parsed.filter(
        (item) =>
          item &&
          item.userId &&
          !LEGACY_FAKE_IDS.has(item.userId) &&
          !LEGACY_FAKE_IDS.has(item._id) &&
          !LEGACY_FAKE_IDS.has(item.email) &&
          !LEGACY_FAKE_IDS.has(item.userEmail)
      );

      // Sanitize the persistent localStorage if any fake records were detected
      if (realOnly.length !== parsed.length) {
        localStorage.setItem(STORAGE_TEACHER_APPS_KEY, JSON.stringify(realOnly));
      }

      return realOnly;
    }
    return [];
  } catch {
    return [];
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
      verificationStatus: updates.verificationStatus || prev.verificationStatus || "under_review",
      isVerified: updates.isVerified !== undefined ? updates.isVerified : prev.isVerified,
      isAvailable: updates.isAvailable !== undefined ? updates.isAvailable : (prev.isAvailable !== false),
      profileCompletionScore: calculateTeacherCompletion({ ...prev, ...updates }),
    };
    apps[existingIndex] = record;
  } else {
    record = {
      userId,
      name: updates.name || "Educator",
      email: userEmail,
      title: updates.title || "Educator & Subject Specialist",
      bio: updates.bio || "Dedicated educator ready to assist students with interactive lessons.",
      avatarUrl: updates.avatarUrl || "",
      country: updates.country || "Bangladesh",
      timezone: updates.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka",
      hourlyRate: updates.hourlyRate || 35,
      price30min: updates.price30min || 20,
      price60min: updates.price60min || 35,
      groupPrice: updates.groupPrice || 25,
      trialPrice: updates.trialPrice || 15,
      subjects: updates.subjects && updates.subjects.length > 0 ? updates.subjects : ["General Studies"],
      classLevels: updates.classLevels && updates.classLevels.length > 0 ? updates.classLevels : ["All Levels"],
      expertise: updates.expertise && updates.expertise.length > 0 ? updates.expertise : ["Tutoring"],
      languages: updates.languages && updates.languages.length > 0 ? updates.languages : ["English", "Bangla"],
      yearsExperience: updates.yearsExperience || 2,
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
      verificationStatus: updates.verificationStatus || "under_review",
      isVerified: updates.isVerified ?? false,
      isAvailable: updates.isAvailable ?? true,
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
