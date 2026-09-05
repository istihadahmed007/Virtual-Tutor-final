// Persistent administrative store for Virtual Tutor Pro Admin Console
import { getAllTeacherApplications, TeacherApplicationData, saveAllTeacherApplications } from "./teacher-store";

export interface AdminUserRecord {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student" | "parent";
  accountStatus: "active" | "suspended";
  isVerified: boolean;
  avatarUrl?: string;
  _creationTime: number;
  lastLoginAt?: number;
}

export interface AdminBookingRecord {
  _id: string;
  teacherId: string;
  studentId: string;
  teacherName: string;
  teacherEmail: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  classType: string;
  scheduledAt: number;
  durationMinutes: number;
  hourlyRate: number;
  totalAmount: number;
  paymentStatus: "paid" | "pending" | "refunded";
  status: "confirmed" | "completed" | "cancelled" | "pending";
  _creationTime: number;
}

export interface AdminSessionRecord {
  _id: string;
  title: string;
  teacherName: string;
  subject: string;
  scheduledAt: number;
  durationMinutes: number;
  enrolledStudentsCount: number;
  maxStudents: number;
  status: "scheduled" | "live" | "completed" | "cancelled";
  meetingLink?: string;
}

export interface AdminReviewRecord {
  _id: string;
  teacherId: string;
  teacherName: string;
  studentName: string;
  rating: number;
  comment: string;
  subject: string;
  createdAt: number;
}

export interface AdminReportRecord {
  _id: string;
  reporterName: string;
  targetType: "teacher" | "student" | "message" | "post";
  targetName: string;
  reason: string;
  details: string;
  status: "pending" | "investigating" | "resolved" | "dismissed";
  timestamp: number;
}

export interface AdminAuditLogRecord {
  _id: string;
  action: string;
  performedBy: string;
  timestamp: number;
  details?: string;
  reason?: string;
}

export interface AdminCommunityPostRecord {
  _id: string;
  authorName: string;
  authorRole: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  replyCount: number;
  createdAt: number;
}

const STORAGE_USERS_KEY = "vtp_admin_users_v1";
const STORAGE_BOOKINGS_KEY = "vtp_admin_bookings_v1";
const STORAGE_SESSIONS_KEY = "vtp_admin_sessions_v1";
const STORAGE_REVIEWS_KEY = "vtp_admin_reviews_v1";
const STORAGE_REPORTS_KEY = "vtp_admin_reports_v1";
const STORAGE_LOGS_KEY = "vtp_admin_logs_v1";
const STORAGE_POSTS_KEY = "vtp_admin_posts_v1";

export const ADMIN_STORE_EVENT = "vtp_admin_store_change";

function notifyAdminStoreChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_STORE_EVENT));
  }
}

// ─── INITIAL SEED DATA ─────────────────────────────────────────

const INITIAL_USERS: AdminUserRecord[] = [
  {
    _id: "user_sole_admin",
    name: "Istihad Ahmed",
    email: "istihadahmed1163@gmail.com",
    role: "admin",
    accountStatus: "active",
    isVerified: true,
    _creationTime: Date.now() - 30 * 86400000,
    lastLoginAt: Date.now() - 5 * 60000,
  },
  {
    _id: "teacher_prof_sarah",
    name: "Dr. Sarah Jenkins",
    email: "sarah.jenkins@liveclass.edu",
    role: "teacher",
    accountStatus: "active",
    isVerified: true,
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    _creationTime: Date.now() - 25 * 86400000,
    lastLoginAt: Date.now() - 2 * 3600000,
  },
  {
    _id: "teacher_prof_marcus",
    name: "Marcus Vance",
    email: "marcus.vance@techlearn.io",
    role: "teacher",
    accountStatus: "active",
    isVerified: true,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    _creationTime: Date.now() - 20 * 86400000,
    lastLoginAt: Date.now() - 4 * 3600000,
  },
  {
    _id: "teacher_prof_elena",
    name: "Elena Rostova",
    email: "elena.rostova@languagepro.org",
    role: "teacher",
    accountStatus: "active",
    isVerified: true,
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
    _creationTime: Date.now() - 15 * 86400000,
    lastLoginAt: Date.now() - 12 * 3600000,
  },
  {
    _id: "student_alex_rivers",
    name: "Alex Rivers",
    email: "alex.rivers@student.edu",
    role: "student",
    accountStatus: "active",
    isVerified: true,
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
    _creationTime: Date.now() - 18 * 86400000,
    lastLoginAt: Date.now() - 1 * 3600000,
  },
  {
    _id: "student_priya_sharma",
    name: "Priya Sharma",
    email: "priya.sharma@learn.org",
    role: "student",
    accountStatus: "active",
    isVerified: true,
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    _creationTime: Date.now() - 12 * 86400000,
    lastLoginAt: Date.now() - 3 * 3600000,
  },
  {
    _id: "student_liam_smith",
    name: "Liam Smith",
    email: "liam.smith@academy.com",
    role: "student",
    accountStatus: "active",
    isVerified: true,
    _creationTime: Date.now() - 10 * 86400000,
    lastLoginAt: Date.now() - 24 * 3600000,
  },
];

const INITIAL_BOOKINGS: AdminBookingRecord[] = [
  {
    _id: "bk_001",
    teacherId: "teacher_prof_sarah",
    studentId: "student_alex_rivers",
    teacherName: "Dr. Sarah Jenkins",
    teacherEmail: "sarah.jenkins@liveclass.edu",
    studentName: "Alex Rivers",
    studentEmail: "alex.rivers@student.edu",
    subject: "AP Calculus BC",
    classType: "1-on-1 Private Lesson",
    scheduledAt: Date.now() + 4 * 3600000,
    durationMinutes: 60,
    hourlyRate: 55,
    totalAmount: 55,
    paymentStatus: "paid",
    status: "confirmed",
    _creationTime: Date.now() - 2 * 86400000,
  },
  {
    _id: "bk_002",
    teacherId: "teacher_prof_marcus",
    studentId: "student_priya_sharma",
    teacherName: "Marcus Vance",
    teacherEmail: "marcus.vance@techlearn.io",
    studentName: "Priya Sharma",
    studentEmail: "priya.sharma@learn.org",
    subject: "Python & Algorithms",
    classType: "1-on-1 Private Lesson",
    scheduledAt: Date.now() + 24 * 3600000,
    durationMinutes: 60,
    hourlyRate: 65,
    totalAmount: 65,
    paymentStatus: "paid",
    status: "confirmed",
    _creationTime: Date.now() - 1 * 86400000,
  },
  {
    _id: "bk_003",
    teacherId: "teacher_prof_elena",
    studentId: "student_liam_smith",
    teacherName: "Elena Rostova",
    teacherEmail: "elena.rostova@languagepro.org",
    studentName: "Liam Smith",
    studentEmail: "liam.smith@academy.com",
    subject: "IELTS Speaking & Writing",
    classType: "Small Group Cohort",
    scheduledAt: Date.now() - 48 * 3600000,
    durationMinutes: 45,
    hourlyRate: 45,
    totalAmount: 35,
    paymentStatus: "paid",
    status: "completed",
    _creationTime: Date.now() - 5 * 86400000,
  },
];

const INITIAL_SESSIONS: AdminSessionRecord[] = [
  {
    _id: "ses_001",
    title: "Mastering Integration Techniques & Differential Equations",
    teacherName: "Dr. Sarah Jenkins",
    subject: "Mathematics",
    scheduledAt: Date.now() + 4 * 3600000,
    durationMinutes: 60,
    enrolledStudentsCount: 1,
    maxStudents: 1,
    status: "scheduled",
    meetingLink: "https://meet.jit.si/vtp-classroom-sarah-calc",
  },
  {
    _id: "ses_002",
    title: "Python Data Structures & Algorithm Optimization",
    teacherName: "Marcus Vance",
    subject: "Computer Science",
    scheduledAt: Date.now() + 24 * 3600000,
    durationMinutes: 60,
    enrolledStudentsCount: 4,
    maxStudents: 6,
    status: "scheduled",
    meetingLink: "https://meet.jit.si/vtp-classroom-marcus-python",
  },
  {
    _id: "ses_003",
    title: "IELTS Band 8+ Speaking Fluency Workshop",
    teacherName: "Elena Rostova",
    subject: "English & IELTS",
    scheduledAt: Date.now() - 2 * 3600000,
    durationMinutes: 45,
    enrolledStudentsCount: 5,
    maxStudents: 5,
    status: "completed",
  },
];

const INITIAL_REVIEWS: AdminReviewRecord[] = [
  {
    _id: "rev_001",
    teacherId: "teacher_prof_sarah",
    teacherName: "Dr. Sarah Jenkins",
    studentName: "Alex Rivers",
    rating: 5,
    comment: "Dr. Jenkins explained trigonometric substitution so clearly that I finally aced my university midterms! Best math tutor ever.",
    subject: "Mathematics",
    createdAt: Date.now() - 3 * 86400000,
  },
  {
    _id: "rev_002",
    teacherId: "teacher_prof_marcus",
    teacherName: "Marcus Vance",
    studentName: "Priya Sharma",
    rating: 5,
    comment: "Marcus gives deep industry perspective and helped me refactor my Python project cleanly. Truly exceptional coding mentor.",
    subject: "Computer Science",
    createdAt: Date.now() - 4 * 86400000,
  },
  {
    _id: "rev_003",
    teacherId: "teacher_prof_elena",
    teacherName: "Elena Rostova",
    studentName: "Liam Smith",
    rating: 5,
    comment: "Thanks to Elena's targeted feedback, I raised my IELTS Speaking band from 6.5 to 8.0 in just four weeks!",
    subject: "English & IELTS",
    createdAt: Date.now() - 6 * 86400000,
  },
];

const INITIAL_REPORTS: AdminReportRecord[] = [
  {
    _id: "rep_001",
    reporterName: "System Automation",
    targetType: "teacher",
    targetName: "Pending Applicant Verification",
    reason: "Document Verification Queue",
    details: "New applicant documents require administrative review and NID confirmation.",
    status: "pending",
    timestamp: Date.now() - 5 * 3600000,
  },
];

const INITIAL_LOGS: AdminAuditLogRecord[] = [
  {
    _id: "log_001",
    action: "System Initialized",
    performedBy: "istihadahmed1163@gmail.com",
    timestamp: Date.now() - 30 * 86400000,
    details: "Super Admin privileges provisioned and authenticated.",
  },
  {
    _id: "log_002",
    action: "Educator Credential Verified",
    performedBy: "istihadahmed1163@gmail.com",
    timestamp: Date.now() - 20 * 86400000,
    details: "Approved Dr. Sarah Jenkins credentials and government ID.",
  },
  {
    _id: "log_003",
    action: "Educator Credential Verified",
    performedBy: "istihadahmed1163@gmail.com",
    timestamp: Date.now() - 15 * 86400000,
    details: "Approved Marcus Vance credentials and government ID.",
  },
];

const INITIAL_POSTS: AdminCommunityPostRecord[] = [
  {
    _id: "post_001",
    authorName: "Dr. Sarah Jenkins",
    authorRole: "Verified Teacher",
    title: "Tips for preparing for AP Calculus BC Exam 2026",
    content: "Make sure you master parametric and polar curves early. Don't leave Taylor series convergence tests until the last week!",
    category: "Mathematics",
    likes: 42,
    replyCount: 14,
    createdAt: Date.now() - 2 * 86400000,
  },
  {
    _id: "post_002",
    authorName: "Marcus Vance",
    authorRole: "Verified Teacher",
    title: "Best practices when designing Python REST APIs",
    content: "Always validate request schemas strictly and use type hints. Clean code pays massive dividends in maintenance.",
    category: "Coding & Tech",
    likes: 38,
    replyCount: 9,
    createdAt: Date.now() - 3 * 86400000,
  },
];

// ─── GETTERS & MUTATORS ────────────────────────────────────────

export function getAdminUsers(): AdminUserRecord[] {
  if (typeof window === "undefined") return INITIAL_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveAdminUsers(users: AdminUserRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    notifyAdminStoreChange();
  } catch (err) {
    console.error("Failed to save admin users:", err);
  }
}

export function suspendUserAccount(userId: string, reason: string): boolean {
  const users = getAdminUsers();
  const u = users.find((item) => item._id === userId);
  if (u) {
    u.accountStatus = "suspended";
    saveAdminUsers(users);
    addAdminAuditLog("User Suspended", `Suspended ${u.name} (${u.email}): ${reason}`);
    return true;
  }
  return false;
}

export function reactivateUserAccount(userId: string, reason?: string): boolean {
  const users = getAdminUsers();
  const u = users.find((item) => item._id === userId);
  if (u) {
    u.accountStatus = "active";
    saveAdminUsers(users);
    addAdminAuditLog("User Reactivated", `Reactivated ${u.name} (${u.email})${reason ? `: ${reason}` : ""}`);
    return true;
  }
  return false;
}

export function getAdminBookings(): AdminBookingRecord[] {
  if (typeof window === "undefined") return INITIAL_BOOKINGS;
  try {
    const raw = localStorage.getItem(STORAGE_BOOKINGS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(INITIAL_BOOKINGS));
      return INITIAL_BOOKINGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BOOKINGS;
  } catch {
    return INITIAL_BOOKINGS;
  }
}

export function getAdminSessions(): AdminSessionRecord[] {
  if (typeof window === "undefined") return INITIAL_SESSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_SESSIONS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(INITIAL_SESSIONS));
      return INITIAL_SESSIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SESSIONS;
  } catch {
    return INITIAL_SESSIONS;
  }
}

export function getAdminReviews(): AdminReviewRecord[] {
  if (typeof window === "undefined") return INITIAL_REVIEWS;
  try {
    const raw = localStorage.getItem(STORAGE_REVIEWS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(INITIAL_REVIEWS));
      return INITIAL_REVIEWS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_REVIEWS;
  } catch {
    return INITIAL_REVIEWS;
  }
}

export function deleteAdminReview(reviewId: string, reason?: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const reviews = getAdminReviews().filter((r) => r._id !== reviewId);
    localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(reviews));
    addAdminAuditLog("Review Deleted", `Deleted review ${reviewId}: ${reason || "Removed by administrator"}`);
    notifyAdminStoreChange();
    return true;
  } catch {
    return false;
  }
}

export function getAdminReports(): AdminReportRecord[] {
  if (typeof window === "undefined") return INITIAL_REPORTS;
  try {
    const raw = localStorage.getItem(STORAGE_REPORTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(INITIAL_REPORTS));
      return INITIAL_REPORTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_REPORTS;
  } catch {
    return INITIAL_REPORTS;
  }
}

export function resolveAdminReport(reportId: string, resolutionNote?: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const reports = getAdminReports();
    const rep = reports.find((r) => r._id === reportId);
    if (rep) {
      rep.status = "resolved";
      localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(reports));
      addAdminAuditLog("Report Resolved", `Resolved report ${reportId}: ${resolutionNote || "Resolved by administrator"}`);
      notifyAdminStoreChange();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getAdminAuditLogs(): AdminAuditLogRecord[] {
  if (typeof window === "undefined") return INITIAL_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_LOGS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_LOGS;
  } catch {
    return INITIAL_LOGS;
  }
}

export function addAdminAuditLog(action: string, details: string, reason?: string) {
  if (typeof window === "undefined") return;
  try {
    const logs = getAdminAuditLogs();
    const newEntry: AdminAuditLogRecord = {
      _id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      action,
      performedBy: "istihadahmed1163@gmail.com",
      timestamp: Date.now(),
      details,
      reason,
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs.slice(0, 200)));
    notifyAdminStoreChange();
  } catch (err) {
    console.error("Failed to add audit log:", err);
  }
}

export function getAdminCommunityPosts(): AdminCommunityPostRecord[] {
  if (typeof window === "undefined") return INITIAL_POSTS;
  try {
    const raw = localStorage.getItem(STORAGE_POSTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(INITIAL_POSTS));
      return INITIAL_POSTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_POSTS;
  } catch {
    return INITIAL_POSTS;
  }
}

export function deleteAdminCommunityPost(postId: string, reason?: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const posts = getAdminCommunityPosts().filter((p) => p._id !== postId);
    localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(posts));
    addAdminAuditLog("Community Post Deleted", `Deleted post ${postId}: ${reason || "Violated guidelines"}`);
    notifyAdminStoreChange();
    return true;
  } catch {
    return false;
  }
}
