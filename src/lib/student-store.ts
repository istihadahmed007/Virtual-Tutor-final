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

// Initial registered students to guarantee the student directory is vibrant and active
const SEED_STUDENTS: StudentProfileData[] = [
  {
    _id: "usr_student_alex",
    userId: "n576jb9j1bztps4phbs6jn2v8n8dpwdt",
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    classLevel: "Grade 11 / AS-Level",
    curriculum: "Cambridge",
    institution: "Scholastica International",
    subjects: ["Mathematics", "AP Calculus BC", "Physics Mechanics"],
    preferredSchedule: "Weekdays 5:00 PM - 8:00 PM",
    learningGoal: "Master differential equations and prepare for Cambridge AS-Level board exams.",
    avatarUrl: "",
    isVerified: true,
    verificationStatus: "verified",
    languages: ["English", "Bangla"],
    completedLessonsCount: 8,
    isDiscoverable: true,
    accountStatus: "active",
    _creationTime: Date.now() - 15 * 86400000,
  },
  {
    _id: "usr_student_sophia",
    userId: "usr_student_sophia_id",
    name: "Sophia Chen",
    email: "sophia.chen@example.com",
    classLevel: "Grade 12 / A-Level / HSC",
    curriculum: "IB",
    institution: "International Hope School",
    subjects: ["Chemistry", "Biology", "English Literature"],
    preferredSchedule: "Mon, Wed, Fri after 6:00 PM",
    learningGoal: "Deep dive into Organic Chemistry mechanisms and IB Higher Level Biology.",
    avatarUrl: "",
    isVerified: true,
    verificationStatus: "verified",
    languages: ["English"],
    completedLessonsCount: 14,
    isDiscoverable: true,
    accountStatus: "active",
    _creationTime: Date.now() - 10 * 86400000,
  },
  {
    _id: "usr_student_rahim",
    userId: "usr_student_rahim_id",
    name: "Rahim Chowdhury",
    email: "rahim.c@example.com",
    classLevel: "Grade 10 / O-Level / SSC",
    curriculum: "English Version",
    institution: "Dhaka Residential Model College",
    subjects: ["Higher Mathematics", "Physics Mechanics", "ICT & Programming"],
    preferredSchedule: "Weekends 10:00 AM - 2:00 PM",
    learningGoal: "Strengthen fundamentals in Coordinate Geometry and Newtonian mechanics.",
    avatarUrl: "",
    isVerified: true,
    verificationStatus: "verified",
    languages: ["Bangla", "English"],
    completedLessonsCount: 6,
    isDiscoverable: true,
    accountStatus: "active",
    _creationTime: Date.now() - 7 * 86400000,
  },
  {
    _id: "usr_student_maya",
    userId: "usr_student_maya_id",
    name: "Maya Patel",
    email: "maya.patel@example.com",
    classLevel: "College / Higher Secondary",
    curriculum: "Cambridge",
    institution: "Mastermind School",
    subjects: ["AP Calculus BC", "ICT & Programming", "Spanish"],
    preferredSchedule: "Tue, Thu 7:00 PM - 9:00 PM",
    learningGoal: "University admission test preparation and programming in Python.",
    avatarUrl: "",
    isVerified: true,
    verificationStatus: "verified",
    languages: ["English", "Spanish"],
    completedLessonsCount: 11,
    isDiscoverable: true,
    accountStatus: "active",
    _creationTime: Date.now() - 4 * 86400000,
  },
  {
    _id: "usr_student_daniel",
    userId: "usr_student_daniel_id",
    name: "Daniel Martinez",
    email: "daniel.m@example.com",
    classLevel: "Grade 9 / Secondary",
    curriculum: "Bangla Medium",
    institution: "St. Joseph Higher Secondary School",
    subjects: ["Mathematics", "Chemistry", "English Literature"],
    preferredSchedule: "Evenings 6:00 PM - 8:30 PM",
    learningGoal: "Build solid foundations for secondary board exams and scientific reasoning.",
    avatarUrl: "",
    isVerified: true,
    verificationStatus: "verified",
    languages: ["English", "Bangla"],
    completedLessonsCount: 4,
    isDiscoverable: true,
    accountStatus: "active",
    _creationTime: Date.now() - 2 * 86400000,
  },
];

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
  if (typeof window === "undefined") return SEED_STUDENTS.map(normalizeStudentProfile);
  try {
    const raw = localStorage.getItem(STORAGE_STUDENTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(SEED_STUDENTS));
      return SEED_STUDENTS.map(normalizeStudentProfile);
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure seed students are also available if not already in store
      const map = new Map<string, StudentProfileData>();
      for (const s of SEED_STUDENTS) {
        map.set(s.userId, normalizeStudentProfile(s));
      }
      for (const p of parsed) {
        if (p && (p.userId || p._id)) {
          map.set(p.userId || p._id, normalizeStudentProfile(p));
        }
      }
      return Array.from(map.values());
    }
    return SEED_STUDENTS.map(normalizeStudentProfile);
  } catch {
    return SEED_STUDENTS.map(normalizeStudentProfile);
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
