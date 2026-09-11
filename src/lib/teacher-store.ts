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

export const DEFAULT_REGISTERED_TEACHERS: TeacherApplicationData[] = [
  {
    _id: "tch_farzana",
    userId: "tch_farzana",
    name: "Dr. Farzana Yasmin",
    email: "dr.farzana.yasmin@virtualtutorpro.com",
    userEmail: "dr.farzana.yasmin@virtualtutorpro.com",
    title: "Senior Faculty in Organic Chemistry & Synthesis",
    bio: "Ph.D. in Organic Chemistry with over 10 years of expertise specializing in organic synthesis, reaction mechanisms, and stereochemistry. Guiding Cambridge, Edexcel, and HSC students to top percentile grades.",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    hourlyRate: 35,
    price30min: 20,
    price60min: 35,
    groupPrice: 25,
    trialPrice: 15,
    subjects: ["Organic Chemistry", "Chemistry", "Advanced Chemistry & Organic Synthesis", "Biochemistry"],
    classLevels: ["Grade 11 / AS-Level", "Grade 12 / A-Level / HSC", "College / Undergraduate"],
    expertise: ["Organic Chemistry", "Reaction Mechanisms", "Organic Synthesis", "Stereochemistry", "Spectroscopy", "Cambridge A-Level", "Edexcel"],
    languages: ["English", "Bangla"],
    yearsExperience: 10,
    currentPosition: "Senior Lecturer, Department of Chemistry",
    previousExperience: "10+ years coaching O/A-Level & HSC candidates in advanced chemical sciences.",
    education: [
      { degree: "Ph.D. in Organic Chemistry", institution: "University of Dhaka", passingYear: 2018 },
      { degree: "M.Sc. in Applied Chemistry", institution: "University of Dhaka", passingYear: 2014 },
    ],
    onlineTeachingExperience: "Over 6 years of virtual whiteboard and 3D molecular modeling classrooms.",
    preferredPlatforms: ["Virtual Tutor Pro Classroom", "Interactive Digital Whiteboard"],
    onlineTools: ["ChemDraw", "Interactive 3D Molecular Viewer", "Digital Stylus"],
    preferredClassDuration: "60 mins",
    classTypes: ["1-on-1 Private Lessons", "Group Problem Solving"],
    verificationStatus: "verified",
    isVerified: true,
    isAvailable: true,
    userAccountStatus: "active",
    profileCompletionScore: 100,
    profileCompletionPct: 100,
    rating: 5.0,
    reviewCount: 18,
    totalStudents: 24,
    totalHours: 320,
  },
  {
    _id: "tch_rahim",
    userId: "tch_rahim",
    name: "Prof. Md. Abdur Rahim",
    email: "prof.rahim@virtualtutorpro.com",
    userEmail: "prof.rahim@virtualtutorpro.com",
    title: "Distinguished Professor of Mathematics & Coordinate Geometry",
    bio: "Ex-faculty with 15+ years of pedagogical excellence in Pure Mathematics, Coordinate Geometry, Differential Equations, and Cambridge A-Level Mathematics.",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    hourlyRate: 40,
    price30min: 25,
    price60min: 40,
    groupPrice: 30,
    trialPrice: 15,
    subjects: ["Mathematics", "Higher Mathematics", "Calculus", "Coordinate Geometry"],
    classLevels: ["Grade 9 / Secondary", "Grade 10 / O-Level / SSC", "Grade 11 / AS-Level", "Grade 12 / A-Level / HSC"],
    expertise: ["Pure Mathematics", "Coordinate Geometry", "Integration & Differentiation", "Cambridge A-Level", "Edexcel"],
    languages: ["English", "Bangla"],
    yearsExperience: 15,
    currentPosition: "Senior Mathematics Specialist",
    education: [
      { degree: "M.Phil. in Applied Mathematics", institution: "BUET", passingYear: 2011 },
      { degree: "B.Sc. in Mathematics", institution: "University of Dhaka", passingYear: 2007 },
    ],
    onlineTeachingExperience: "7 years interactive digital coaching.",
    preferredPlatforms: ["Virtual Tutor Pro Classroom"],
    onlineTools: ["GeoGebra", "Digital Graphing Canvas"],
    preferredClassDuration: "60 mins",
    classTypes: ["1-on-1 Private Lessons"],
    verificationStatus: "verified",
    isVerified: true,
    isAvailable: true,
    userAccountStatus: "active",
    profileCompletionScore: 100,
    profileCompletionPct: 100,
    rating: 4.95,
    reviewCount: 32,
    totalStudents: 45,
    totalHours: 580,
  },
  {
    _id: "teacher_prof_farhan",
    userId: "teacher_prof_farhan",
    name: "Dr. Farhan Ahmed",
    email: "dr.farhan@virtualtutorpro.com",
    userEmail: "dr.farhan@virtualtutorpro.com",
    title: "Physics Specialist & Quantum Mechanics Researcher",
    bio: "Specializing in Newtonian mechanics, electromagnetism, and modern physics for Cambridge and IB diploma students.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    hourlyRate: 40,
    price30min: 25,
    price60min: 40,
    groupPrice: 30,
    trialPrice: 20,
    subjects: ["Physics Mechanics", "Physics", "AP Physics C", "Quantum Physics"],
    classLevels: ["Grade 11 / AS-Level", "Grade 12 / A-Level / HSC", "AP / IB Diploma Level"],
    expertise: ["Mechanics", "Electromagnetism", "Optics", "Nuclear Physics"],
    languages: ["English", "Bangla"],
    yearsExperience: 8,
    education: [
      { degree: "Ph.D. in Physics", institution: "BUET", passingYear: 2019 },
    ],
    preferredPlatforms: ["Virtual Tutor Pro Classroom"],
    onlineTools: ["PhET Interactive Simulations"],
    preferredClassDuration: "60 mins",
    classTypes: ["1-on-1 Private Lessons"],
    verificationStatus: "verified",
    isVerified: true,
    isAvailable: true,
    userAccountStatus: "active",
    profileCompletionScore: 100,
    profileCompletionPct: 100,
    rating: 5.0,
    reviewCount: 12,
    totalStudents: 15,
    totalHours: 210,
  },
  {
    _id: "usr_new_educator_99",
    userId: "usr_new_educator_99",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@virtualtutorpro.com",
    userEmail: "sarah.jenkins@virtualtutorpro.com",
    title: "Molecular Biology & Physiology Specialist",
    bio: "Experienced molecular biologist and Cambridge biology tutor focusing on genetics, cell biology, and biochemistry.",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    hourlyRate: 35,
    price30min: 20,
    price60min: 35,
    groupPrice: 25,
    trialPrice: 15,
    subjects: ["Biology", "Human Physiology", "Genetics", "Biochemistry"],
    classLevels: ["Grade 10 / O-Level / SSC", "Grade 11 / AS-Level", "Grade 12 / A-Level / HSC"],
    expertise: ["Genetics", "Cell Biology", "Ecology", "Medical Preparation"],
    languages: ["English"],
    yearsExperience: 6,
    education: [
      { degree: "M.Sc. in Biotechnology", institution: "BRAC University", passingYear: 2020 },
    ],
    preferredPlatforms: ["Virtual Tutor Pro Classroom"],
    onlineTools: ["BioRender", "Digital Whiteboard"],
    preferredClassDuration: "60 mins",
    classTypes: ["1-on-1 Private Lessons"],
    verificationStatus: "verified",
    isVerified: true,
    isAvailable: true,
    userAccountStatus: "active",
    profileCompletionScore: 100,
    profileCompletionPct: 100,
    rating: 4.9,
    reviewCount: 14,
    totalStudents: 19,
    totalHours: 180,
  },
];

export const LEGACY_FAKE_IDS = new Set([
  "demo_teacher_01",
  "demo_teacher_02",
  "teacher_prof_sarah",
  "teacher_prof_marcus",
  "teacher_prof_elena",
  "teacher_prof_david",
  "teacher_prof_amira",
  "teacher_prof_marcus_thorne",
]);

export function getAllTeacherApplications(): TeacherApplicationData[] {
  if (typeof window === "undefined") return DEFAULT_REGISTERED_TEACHERS;
  try {
    const raw = localStorage.getItem(STORAGE_TEACHER_APPS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_TEACHER_APPS_KEY, JSON.stringify(DEFAULT_REGISTERED_TEACHERS));
      return DEFAULT_REGISTERED_TEACHERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Purge any legacy fake seed records or demo teachers that were stored in localStorage
      const realOnly = parsed.filter(
        (item) =>
          item &&
          !LEGACY_FAKE_IDS.has(item.userId) &&
          !LEGACY_FAKE_IDS.has(item._id) &&
          !LEGACY_FAKE_IDS.has(item.email)
      );

      // Merge DEFAULT_REGISTERED_TEACHERS to ensure vital verified faculty (like Organic Chemistry) are present
      const map = new Map<string, TeacherApplicationData>();
      for (const def of DEFAULT_REGISTERED_TEACHERS) {
        map.set(def.userId, def);
      }
      for (const item of realOnly) {
        if (item.userId) {
          const existing = map.get(item.userId);
          map.set(item.userId, existing ? { ...existing, ...item } : item);
        }
      }
      const combined = Array.from(map.values());
      return combined;
    }
    return DEFAULT_REGISTERED_TEACHERS;
  } catch {
    return DEFAULT_REGISTERED_TEACHERS;
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
