// Student Store for Virtual Tutor Pro
// Persists student profiles and discoverable student learning requirements

export interface StudentProfileData {
  _id: string;
  userId: string;
  name: string;
  email?: string;
  classLevel: string;
  curriculum: string;
  institution: string;
  subjects: string[];
  preferredSchedule: string;
  learningGoal: string;
  learningGoals?: string[];
  preferredLanguages?: string[];
  avatarUrl?: string;
  isVerified: boolean;
  verificationStatus: "verified" | "pending" | "not_started";
  languages: string[];
  completedLessonsCount: number;
  isDiscoverable: boolean;
  accountStatus: "active" | "suspended";
  _creationTime: number;
}

const STORAGE_STUDENTS_KEY = "vtp_student_profiles_v2";
export const STUDENT_STORE_EVENT = "vtp_student_store_change";

export function notifyStudentStoreChange() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event(STUDENT_STORE_EVENT));
    } catch {
      // safe
    }
  }
}

// Legacy mock student IDs and patterns to actively eliminate
export const LEGACY_FAKE_STUDENT_IDS = new Set([
  "usr_student_alex",
  "usr_student_sophia",
  "usr_student_rahim",
  "usr_student_maya",
  "usr_student_daniel",
  "n576jb9j1bztps4phbs6jn2v8n8dpwdt",
  "usr_student_sophia_id",
  "usr_student_rahim_id",
  "usr_student_maya_id",
  "usr_student_daniel_id",
]);

// ZERO FAKE DATA: Strictly empty seed list. Real students appear when registered/created.
const SEED_STUDENTS: StudentProfileData[] = [];

function isFakeStudent(p: any): boolean {
  if (!p) return true;
  const id = p.userId || p._id || "";
  const email = (p.email || "").toLowerCase();
  if (LEGACY_FAKE_STUDENT_IDS.has(id)) return true;
  if (email.endsWith("@example.com")) return true;
  if (id.startsWith("usr_student_") && !id.startsWith("student_")) return true;
  return false;
}

function normalizeStudentProfile(p: any): StudentProfileData {
  const goal = p.learningGoal || "Master course syllabus and excel in examinations.";
  const goals = Array.isArray(p.learningGoals) && p.learningGoals.length > 0
    ? p.learningGoals
    : [goal];
  const langs = Array.isArray(p.preferredLanguages) && p.preferredLanguages.length > 0
    ? p.preferredLanguages
    : Array.isArray(p.languages) && p.languages.length > 0
    ? p.languages
    : ["English", "Bangla"];

  return {
    ...p,
    subjects: Array.isArray(p.subjects) ? p.subjects : ["Mathematics", "Science"],
    learningGoal: goal,
    learningGoals: goals,
    languages: langs,
    preferredLanguages: langs,
    preferredSchedule: p.preferredSchedule || "Flexible Schedule",
    verificationStatus: p.verificationStatus || "verified",
  };
}

export function getAllStudentProfiles(): StudentProfileData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_STUDENTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const realStudents = parsed
        .filter((p) => p && !isFakeStudent(p))
        .map(normalizeStudentProfile);

      // If any fake students were pruned, re-sync localStorage immediately
      if (realStudents.length !== parsed.length) {
        localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(realStudents));
      }
      return realStudents;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveAllStudentProfiles(students: StudentProfileData[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(students));
    notifyStudentStoreChange();
  } catch (err) {
    console.error("Failed to save student profiles:", err);
  }
}

export function saveStudentProfile(profile: Partial<StudentProfileData> & { userId: string; name: string }): StudentProfileData {
  const all = getAllStudentProfiles();
  const existingIdx = all.findIndex((s) => s.userId === profile.userId || s._id === profile.userId);

  let updated: StudentProfileData;
  if (existingIdx >= 0) {
    updated = {
      ...all[existingIdx],
      ...profile,
      userId: profile.userId,
      name: profile.name || all[existingIdx].name,
    };
    all[existingIdx] = updated;
  } else {
    updated = {
      _id: profile._id || `student_${Date.now()}`,
      userId: profile.userId,
      name: profile.name,
      email: profile.email || "",
      classLevel: profile.classLevel || "Grade 10 / O-Level / SSC",
      curriculum: profile.curriculum || "Cambridge",
      institution: profile.institution || "Scholastic Academy",
      subjects: profile.subjects && profile.subjects.length > 0 ? profile.subjects : ["Mathematics", "Science"],
      preferredSchedule: profile.preferredSchedule || "Flexible Evenings",
      learningGoal: profile.learningGoal || "Concept clarity & examination readiness",
      avatarUrl: profile.avatarUrl || "",
      isVerified: true,
      verificationStatus: "verified",
      languages: profile.languages || ["English", "Bangla"],
      completedLessonsCount: profile.completedLessonsCount || 0,
      isDiscoverable: profile.isDiscoverable ?? true,
      accountStatus: profile.accountStatus || "active",
      _creationTime: Date.now(),
    };
    all.unshift(updated);
  }

  saveAllStudentProfiles(all);
  return updated;
}
