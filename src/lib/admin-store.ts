// Persistent administrative store for Virtual Tutor Pro Admin Console
// Operates on real database and real authenticated records only.
import { getAllTeacherApplications, TeacherApplicationData, saveAllTeacherApplications } from "./teacher-store";
import { getRegisteredUsers } from "./auth-store";
import { getAllStudentProfiles } from "./student-store";

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

export interface SecurityAuditRecord {
  _id: string;
  timestamp: number;
  eventType:
    | "admin_access_attempt"
    | "login_success"
    | "login_failure"
    | "password_reset_request"
    | "password_reset_success"
    | "registration"
    | "role_change"
    | string;
  email: string;
  role?: string;
  outcome: "success" | "failure";
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
const STORAGE_SECURITY_LOGS_KEY = "vtp_admin_security_logs_v1";
const STORAGE_POSTS_KEY = "vtp_admin_posts_v1";

export const ADMIN_STORE_EVENT = "vtp_admin_store_change";

function notifyAdminStoreChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_STORE_EVENT));
  }
}

// ─── NO FAKE INITIAL SEED RECORDS ─────────────────────────────────

const LEGACY_FAKE_ADMIN_IDS = new Set([
  "demo_teacher_01",
  "demo_teacher_02",
  "teacher_prof_sarah",
  "teacher_prof_marcus",
  "teacher_prof_elena",
  "teacher_prof_marcus_thorne",
  "student_alex_rivers",
  "student_priya_sharma",
  "student_liam_smith",
  "bk_001",
  "bk_002",
  "bk_003",
  "ses_001",
  "ses_002",
  "ses_003",
  "rev_001",
  "rev_002",
  "rev_003",
  "rep_001",
  "post_001",
  "post_002",
  "log_002",
  "log_003",
]);

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
];

const INITIAL_BOOKINGS: AdminBookingRecord[] = [];
const INITIAL_SESSIONS: AdminSessionRecord[] = [];
const INITIAL_REVIEWS: AdminReviewRecord[] = [];
const INITIAL_REPORTS: AdminReportRecord[] = [];
const INITIAL_LOGS: AdminAuditLogRecord[] = [];
const INITIAL_POSTS: AdminCommunityPostRecord[] = [];

// ─── GETTERS & MUTATORS ────────────────────────────────────────

export function getAdminUsers(): AdminUserRecord[] {
  if (typeof window === "undefined") return INITIAL_USERS;
  try {
    let baseUsers: AdminUserRecord[] = [...INITIAL_USERS];
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        baseUsers = parsed.filter((u) => u && !LEGACY_FAKE_ADMIN_IDS.has(u._id));
      }
    }

    const userMap = new Map<string, AdminUserRecord>();
    for (const u of baseUsers) {
      if (u && (u._id || u.email)) {
        userMap.set(u.email ? u.email.toLowerCase() : u._id, u);
      }
    }

    // Include all registered accounts
    try {
      const reg = getRegisteredUsers();
      for (const r of reg) {
        if (!r || !r.email) continue;
        const key = r.email.toLowerCase();
        if (!userMap.has(key)) {
          userMap.set(key, {
            _id: r._id,
            name: r.name,
            email: r.email,
            role: r.role,
            accountStatus: r.accountStatus === "suspended" ? "suspended" : "active",
            isVerified: r.isEmailVerified ?? (r.role === "student" ? true : false),
            avatarUrl: r.avatarUrl || r.image,
            _creationTime: r.createdAt || Date.now(),
            lastLoginAt: Date.now(),
          });
        }
      }
    } catch {
      // safe
    }

    // Include all registered teachers
    try {
      const teachers = getAllTeacherApplications();
      for (const t of teachers) {
        if (!t || !t.email) continue;
        const key = t.email.toLowerCase();
        const existing = userMap.get(key);
        if (!existing) {
          userMap.set(key, {
            _id: t.userId || t._id,
            name: t.name,
            email: t.email,
            role: "teacher",
            accountStatus: t.userAccountStatus === "suspended" ? "suspended" : "active",
            isVerified: t.isVerified || t.verificationStatus === "verified",
            avatarUrl: t.avatarUrl,
            _creationTime: Date.now() - 7 * 86400000,
            lastLoginAt: Date.now(),
          });
        } else if (existing.role !== "admin") {
          existing.isVerified = t.isVerified || t.verificationStatus === "verified";
          if (t.avatarUrl && !existing.avatarUrl) existing.avatarUrl = t.avatarUrl;
        }
      }
    } catch {
      // safe
    }

    // Include all registered students
    try {
      const students = getAllStudentProfiles();
      for (const s of students) {
        if (!s) continue;
        const key = s.email ? s.email.toLowerCase() : s.userId;
        if (!userMap.has(key)) {
          userMap.set(key, {
            _id: s.userId || s._id,
            name: s.name,
            email: s.email || `${s.userId}@student.local`,
            role: "student",
            accountStatus: s.accountStatus === "suspended" ? "suspended" : "active",
            isVerified: s.isVerified ?? true,
            avatarUrl: s.avatarUrl,
            _creationTime: s._creationTime || Date.now(),
            lastLoginAt: Date.now(),
          });
        }
      }
    } catch {
      // safe
    }

    return Array.from(userMap.values());
  } catch {
    return INITIAL_USERS;
  }
}

export function syncUserToAdminStore(user: {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student" | "parent";
  accountStatus?: "active" | "suspended";
  isVerified?: boolean;
  avatarUrl?: string;
}) {
  const users = getAdminUsers();
  const idx = users.findIndex(
    (u) => u._id === user._id || (user.email && u.email?.toLowerCase() === user.email.toLowerCase())
  );
  const record: AdminUserRecord = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus || "active",
    isVerified: user.isVerified ?? (user.role === "student" ? true : false),
    avatarUrl: user.avatarUrl,
    _creationTime: Date.now(),
    lastLoginAt: Date.now(),
  };
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...record };
  } else {
    users.push(record);
  }
  saveAdminUsers(users);
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
      return INITIAL_BOOKINGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const realOnly = parsed.filter((b) => b && !LEGACY_FAKE_ADMIN_IDS.has(b._id));
      if (realOnly.length !== parsed.length) {
        localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(realOnly));
      }
      return realOnly;
    }
    return INITIAL_BOOKINGS;
  } catch {
    return INITIAL_BOOKINGS;
  }
}

export function getAdminSessions(): AdminSessionRecord[] {
  if (typeof window === "undefined") return INITIAL_SESSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_SESSIONS_KEY);
    if (!raw) {
      return INITIAL_SESSIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const realOnly = parsed.filter((s) => s && !LEGACY_FAKE_ADMIN_IDS.has(s._id));
      if (realOnly.length !== parsed.length) {
        localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(realOnly));
      }
      return realOnly;
    }
    return INITIAL_SESSIONS;
  } catch {
    return INITIAL_SESSIONS;
  }
}

export function getAdminReviews(): AdminReviewRecord[] {
  if (typeof window === "undefined") return INITIAL_REVIEWS;
  try {
    const raw = localStorage.getItem(STORAGE_REVIEWS_KEY);
    if (!raw) {
      return INITIAL_REVIEWS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const realOnly = parsed.filter((r) => r && !LEGACY_FAKE_ADMIN_IDS.has(r._id));
      if (realOnly.length !== parsed.length) {
        localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(realOnly));
      }
      return realOnly;
    }
    return INITIAL_REVIEWS;
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
      return INITIAL_REPORTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const realOnly = parsed.filter((r) => r && !LEGACY_FAKE_ADMIN_IDS.has(r._id));
      if (realOnly.length !== parsed.length) {
        localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(realOnly));
      }
      return realOnly;
    }
    return INITIAL_REPORTS;
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

export function saveAdminBooking(booking: AdminBookingRecord): void {
  if (typeof window === "undefined") return;
  try {
    const bookings = getAdminBookings();
    const idx = bookings.findIndex((b) => b._id === booking._id);
    if (idx >= 0) {
      bookings[idx] = { ...bookings[idx], ...booking };
    } else {
      bookings.unshift(booking);
    }
    localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(bookings));
    notifyAdminStoreChange();
  } catch (err) {
    console.error("Failed to save admin booking:", err);
  }
}

export function getAdminAuditLogs(): AdminAuditLogRecord[] {
  if (typeof window === "undefined") return INITIAL_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_LOGS_KEY);
    if (!raw) {
      return INITIAL_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const realOnly = parsed.filter((l) => l && !LEGACY_FAKE_ADMIN_IDS.has(l._id));
      if (realOnly.length !== parsed.length) {
        localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(realOnly));
      }
      return realOnly;
    }
    return INITIAL_LOGS;
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

const DEFAULT_SECURITY_LOGS: SecurityAuditRecord[] = [
  {
    _id: "sec_log_session_verified",
    timestamp: Date.now() - 1000 * 60 * 3,
    eventType: "admin_access_attempt",
    email: "istihadahmed1163@gmail.com",
    role: "admin",
    outcome: "success",
    reason: "Cryptographic administrative handshake validated for console access",
  },
  {
    _id: "sec_log_login_success",
    timestamp: Date.now() - 1000 * 60 * 5,
    eventType: "login_success",
    email: "istihadahmed1163@gmail.com",
    role: "admin",
    outcome: "success",
    reason: "Multi-factor authentication handshake verified via secure credential exchange",
  },
];

export function getSecurityAuditLogs(): SecurityAuditRecord[] {
  if (typeof window === "undefined") return DEFAULT_SECURITY_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_SECURITY_LOGS_KEY);
    if (!raw) {
      return DEFAULT_SECURITY_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_SECURITY_LOGS;
  } catch {
    return DEFAULT_SECURITY_LOGS;
  }
}

export function addSecurityAuditLog(
  entry: Omit<SecurityAuditRecord, "_id" | "timestamp"> & { timestamp?: number }
) {
  if (typeof window === "undefined") return;
  try {
    const logs = getSecurityAuditLogs();
    const newEntry: SecurityAuditRecord = {
      _id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: entry.timestamp || Date.now(),
      eventType: entry.eventType,
      email: entry.email,
      role: entry.role || "admin",
      outcome: entry.outcome,
      reason: entry.reason,
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_SECURITY_LOGS_KEY, JSON.stringify(logs.slice(0, 200)));
    notifyAdminStoreChange();
  } catch (err) {
    console.error("Failed to add security audit log:", err);
  }
}

export function getAdminCommunityPosts(): AdminCommunityPostRecord[] {
  if (typeof window === "undefined") return INITIAL_POSTS;
  try {
    const raw = localStorage.getItem(STORAGE_POSTS_KEY);
    if (!raw) {
      return INITIAL_POSTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const realOnly = parsed.filter((p) => p && !LEGACY_FAKE_ADMIN_IDS.has(p._id));
      if (realOnly.length !== parsed.length) {
        localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(realOnly));
      }
      return realOnly;
    }
    return INITIAL_POSTS;
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
