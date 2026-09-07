import { useState, useEffect, useMemo } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  getAllTeacherApplications,
  TeacherApplicationData,
} from "@/lib/teacher-store";
import {
  getAdminUsers,
  getAdminBookings,
  getAdminSessions,
  getAdminReviews,
  getAdminReports,
  getAdminAuditLogs,
  getSecurityAuditLogs,
  getAdminCommunityPosts,
  ADMIN_STORE_EVENT,
  AdminUserRecord,
  AdminBookingRecord,
  AdminSessionRecord,
  AdminReviewRecord,
  AdminReportRecord,
  AdminAuditLogRecord,
  SecurityAuditRecord,
  AdminCommunityPostRecord,
} from "@/lib/admin-store";

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  verifiedTeachers: number;
  underReviewApplications: number;
  needsAttentionApplications: number;
  rejectedApplications: number;
  suspendedUsers: number;
  suspendedTeachers: number;
  totalLessons: number;
  upcomingLessons: number;
  completedLessons: number;
  totalLiveSessions: number;
  totalBookings: number;
  totalReviews: number;
  totalCommunityPosts: number;
  totalReports: number;
  pendingReports: number;
  totalAuditLogs: number;
}

// Helper to compute stats from local and synced stores
function computeLocalStats(): AdminStats {
  const apps = getAllTeacherApplications();
  const users = getAdminUsers();
  const bookings = getAdminBookings();
  const sessions = getAdminSessions();
  const reviews = getAdminReviews();
  const reports = getAdminReports();
  const logs = getAdminAuditLogs();
  const posts = getAdminCommunityPosts();

  const students = users.filter((u) => u.role === "student");
  const teachers = apps;
  const verified = apps.filter((a) => a.verificationStatus === "verified" || a.isVerified);
  const underReview = apps.filter((a) => a.verificationStatus === "under_review");
  const needsAttention = apps.filter((a) => a.verificationStatus === "needs_attention");
  const rejected = apps.filter((a) => a.verificationStatus === "rejected");
  const suspendedUsers = users.filter((u) => u.accountStatus === "suspended");
  const suspendedTeachers = apps.filter((a) => a.userAccountStatus === "suspended" || a.verificationStatus === "suspended");
  const pendingReports = reports.filter((r) => r.status === "pending" || r.status === "investigating");

  return {
    totalUsers: users.length,
    totalStudents: students.length,
    totalTeachers: teachers.length,
    verifiedTeachers: verified.length,
    underReviewApplications: underReview.length,
    needsAttentionApplications: needsAttention.length,
    rejectedApplications: rejected.length,
    suspendedUsers: suspendedUsers.length,
    suspendedTeachers: suspendedTeachers.length,
    totalLessons: bookings.length + sessions.length,
    upcomingLessons: bookings.filter((b) => b.status === "confirmed").length,
    completedLessons: bookings.filter((b) => b.status === "completed").length,
    totalLiveSessions: sessions.length,
    totalBookings: bookings.length,
    totalReviews: reviews.length,
    totalCommunityPosts: posts.length,
    totalReports: reports.length,
    pendingReports: pendingReports.length,
    totalAuditLogs: logs.length,
  };
}

export function useAdminStats(): AdminStats {
  const convex = useConvex();
  const [stats, setStats] = useState<AdminStats>(computeLocalStats);

  useEffect(() => {
    const updateStats = () => setStats(computeLocalStats());
    window.addEventListener("vtp_teacher_store_change", updateStats);
    window.addEventListener(ADMIN_STORE_EVENT, updateStats);

    // Safely probe Convex backend query with correct schema
    let isMounted = true;
    convex
      .query(api.admin.getStats, {})
      .then((serverStats) => {
        if (isMounted && serverStats) {
          setStats((prev) => ({ ...prev, ...serverStats }));
        }
      })
      .catch((_err) => {
        // Unauthenticated or restricted on remote: fallback to authoritative local store cleanly
      });

    return () => {
      isMounted = false;
      window.removeEventListener("vtp_teacher_store_change", updateStats);
      window.removeEventListener(ADMIN_STORE_EVENT, updateStats);
    };
  }, [convex]);

  return stats;
}

export function useAdminApplications(options?: {
  status?: string;
  searchQuery?: string;
}): TeacherApplicationData[] | undefined {
  const convex = useConvex();
  const [apps, setApps] = useState<TeacherApplicationData[]>(getAllTeacherApplications);

  useEffect(() => {
    const update = () => setApps(getAllTeacherApplications());
    window.addEventListener("vtp_teacher_store_change", update);
    window.addEventListener(ADMIN_STORE_EVENT, update);

    let isMounted = true;
    convex
      .query(api.admin.listApplications, {
        status: options?.status && options.status !== "all" ? options.status : undefined,
        searchQuery: options?.searchQuery?.trim() || undefined,
      })
      .then((serverData) => {
        if (isMounted && Array.isArray(serverData) && serverData.length > 0) {
          setApps(serverData as any);
        }
      })
      .catch((_err) => {
        // Fallback to store
      });

    return () => {
      isMounted = false;
      window.removeEventListener("vtp_teacher_store_change", update);
      window.removeEventListener(ADMIN_STORE_EVENT, update);
    };
  }, [convex, options?.status, options?.searchQuery]);

  return useMemo(() => {
    let list = apps.map((a) => ({
      ...a,
      userEmail: a.userEmail || a.email,
      userName: a.name,
      userAccountStatus: a.userAccountStatus || "active",
      userRole: "teacher" as const,
      isEmailVerified: true,
      profileCompletionPct: a.profileCompletionScore || a.profileCompletionPct || 100,
    }));

    if (options?.status && options.status !== "all") {
      const target = options.status.toLowerCase();
      if (target === "suspended") {
        list = list.filter((r) => r.userAccountStatus === "suspended" || r.verificationStatus === "suspended");
      } else if (target === "approved" || target === "verified") {
        list = list.filter((r) => r.verificationStatus === "verified" || r.isVerified);
      } else if (target === "needs_attention" || target === "needs_resubmission") {
        list = list.filter((r) => r.verificationStatus === "needs_attention");
      } else if (target === "under_review" || target === "submitted") {
        list = list.filter((r) => r.verificationStatus === "under_review");
      } else {
        list = list.filter((r) => r.verificationStatus === target);
      }
    }

    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.title?.toLowerCase().includes(q) ||
          r.subjects?.some((s) => s.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [apps, options?.status, options?.searchQuery]);
}

export function useAdminAuditLogs(limit: number = 50): AdminAuditLogRecord[] | undefined {
  const convex = useConvex();
  const [logs, setLogs] = useState<AdminAuditLogRecord[]>(getAdminAuditLogs);

  useEffect(() => {
    const update = () => setLogs(getAdminAuditLogs());
    window.addEventListener(ADMIN_STORE_EVENT, update);
    window.addEventListener("vtp_teacher_store_change", update);

    let isMounted = true;
    convex
      .query(api.admin.listAuditLogs, { limit })
      .then((serverLogs) => {
        if (isMounted && Array.isArray(serverLogs) && serverLogs.length > 0) {
          setLogs(serverLogs as any);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      window.removeEventListener(ADMIN_STORE_EVENT, update);
      window.removeEventListener("vtp_teacher_store_change", update);
    };
  }, [convex, limit]);

  return useMemo(() => logs.slice(0, limit), [logs, limit]);
}

export function useSecurityAuditLogs(limit: number = 100): SecurityAuditRecord[] {
  const [logs, setLogs] = useState<SecurityAuditRecord[]>(getSecurityAuditLogs);

  useEffect(() => {
    const update = () => setLogs(getSecurityAuditLogs());
    window.addEventListener(ADMIN_STORE_EVENT, update);

    return () => {
      window.removeEventListener(ADMIN_STORE_EVENT, update);
    };
  }, []);

  return useMemo(() => logs.slice(0, limit), [logs, limit]);
}

export function useAdminUsers(options?: {
  searchQuery?: string;
  roleFilter?: string;
  statusFilter?: string;
}): AdminUserRecord[] | undefined {
  const convex = useConvex();
  const [users, setUsers] = useState<AdminUserRecord[]>(getAdminUsers);

  useEffect(() => {
    const update = () => setUsers(getAdminUsers());
    window.addEventListener(ADMIN_STORE_EVENT, update);

    let isMounted = true;
    convex
      .query(api.admin.listUsers, {
        role: options?.roleFilter !== "all" ? options?.roleFilter : undefined,
        status: options?.statusFilter !== "all" ? options?.statusFilter : undefined,
        searchQuery: options?.searchQuery?.trim() || undefined,
      })
      .then((res) => {
        if (isMounted && Array.isArray(res) && res.length > 0) {
          setUsers(res as any);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      window.removeEventListener(ADMIN_STORE_EVENT, update);
    };
  }, [convex, options?.roleFilter, options?.statusFilter, options?.searchQuery]);

  return useMemo(() => {
    let list = [...users];
    if (options?.roleFilter && options.roleFilter !== "all") {
      list = list.filter((u) => u.role === options.roleFilter);
    }
    if (options?.statusFilter && options.statusFilter !== "all") {
      list = list.filter((u) => u.accountStatus === options.statusFilter);
    }
    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      list = list.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    return list;
  }, [users, options?.roleFilter, options?.statusFilter, options?.searchQuery]);
}

export function useAdminTeachers(options?: {
  verificationStatus?: string;
  searchQuery?: string;
}): any[] | undefined {
  const apps = useAdminApplications({
    status: options?.verificationStatus,
    searchQuery: options?.searchQuery,
  });
  return apps;
}

export function useAdminStudents(options?: {
  searchQuery?: string;
}): any[] | undefined {
  const users = useAdminUsers({ roleFilter: "student", searchQuery: options?.searchQuery });
  return useMemo(() => {
    if (!users) return undefined;
    return users.map((u) => ({
      _id: u._id,
      userId: u._id,
      name: u.name,
      email: u.email,
      gradeLevel: "Undergraduate / Grade 12",
      institution: "State University / High School",
      targetExam: "AP / University Finals",
      subjects: ["Mathematics", "Computer Science", "English"],
      learningGoals: ["Master core calculus and data structures for upcoming examinations"],
      accountStatus: u.accountStatus,
      _creationTime: u._creationTime,
      lastActiveAt: u.lastLoginAt,
    }));
  }, [users]);
}

export function useAdminBookings(options?: {
  status?: string;
  searchQuery?: string;
}): AdminBookingRecord[] | undefined {
  const convex = useConvex();
  const [bookings, setBookings] = useState<AdminBookingRecord[]>(getAdminBookings);

  useEffect(() => {
    const update = () => setBookings(getAdminBookings());
    window.addEventListener(ADMIN_STORE_EVENT, update);

    let isMounted = true;
    convex
      .query(api.admin.listBookings, {
        status: options?.status !== "all" ? options?.status : undefined,
        searchQuery: options?.searchQuery?.trim() || undefined,
      })
      .then((res) => {
        if (isMounted && Array.isArray(res) && res.length > 0) {
          setBookings(res as any);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      window.removeEventListener(ADMIN_STORE_EVENT, update);
    };
  }, [convex, options?.status, options?.searchQuery]);

  return useMemo(() => {
    let list = [...bookings];
    if (options?.status && options.status !== "all") {
      list = list.filter((b) => b.status === options.status);
    }
    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.teacherName?.toLowerCase().includes(q) ||
          b.studentName?.toLowerCase().includes(q) ||
          b.subject?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [bookings, options?.status, options?.searchQuery]);
}

export function useAdminSessions(options?: {
  status?: string;
}): AdminSessionRecord[] | undefined {
  const convex = useConvex();
  const [sessions, setSessions] = useState<AdminSessionRecord[]>(getAdminSessions);

  useEffect(() => {
    const update = () => setSessions(getAdminSessions());
    window.addEventListener(ADMIN_STORE_EVENT, update);

    let isMounted = true;
    convex
      .query(api.admin.listSessions, {
        status: options?.status !== "all" ? options?.status : undefined,
      })
      .then((res) => {
        if (isMounted && Array.isArray(res) && res.length > 0) {
          setSessions(res as any);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      window.removeEventListener(ADMIN_STORE_EVENT, update);
    };
  }, [convex, options?.status]);

  return useMemo(() => {
    if (options?.status && options.status !== "all") {
      return sessions.filter((s) => s.status === options.status);
    }
    return sessions;
  }, [sessions, options?.status]);
}

export function useAdminReviews(): AdminReviewRecord[] | undefined {
  const convex = useConvex();
  const [reviews, setReviews] = useState<AdminReviewRecord[]>(getAdminReviews);

  useEffect(() => {
    const update = () => setReviews(getAdminReviews());
    window.addEventListener(ADMIN_STORE_EVENT, update);

    let isMounted = true;
    convex
      .query(api.admin.listReviews, {})
      .then((res) => {
        if (isMounted && Array.isArray(res) && res.length > 0) {
          setReviews(res as any);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      window.removeEventListener(ADMIN_STORE_EVENT, update);
    };
  }, [convex]);

  return reviews;
}

export function useAdminReports(options?: {
  status?: string;
}): AdminReportRecord[] | undefined {
  const convex = useConvex();
  const [reports, setReports] = useState<AdminReportRecord[]>(getAdminReports);

  useEffect(() => {
    const update = () => setReports(getAdminReports());
    window.addEventListener(ADMIN_STORE_EVENT, update);

    let isMounted = true;
    convex
      .query(api.admin.listReports, {
        status: options?.status !== "all" ? options?.status : undefined,
      })
      .then((res) => {
        if (isMounted && Array.isArray(res) && res.length > 0) {
          setReports(res as any);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      window.removeEventListener(ADMIN_STORE_EVENT, update);
    };
  }, [convex, options?.status]);

  return useMemo(() => {
    if (options?.status && options.status !== "all") {
      return reports.filter((r) => r.status === options.status);
    }
    return reports;
  }, [reports, options?.status]);
}

export function useAdminCommunity(): AdminCommunityPostRecord[] | undefined {
  const convex = useConvex();
  const [posts, setPosts] = useState<AdminCommunityPostRecord[]>(getAdminCommunityPosts);

  useEffect(() => {
    const update = () => setPosts(getAdminCommunityPosts());
    window.addEventListener(ADMIN_STORE_EVENT, update);

    let isMounted = true;
    convex
      .query(api.admin.listCommunityPosts, {})
      .then((res) => {
        if (isMounted && Array.isArray(res) && res.length > 0) {
          setPosts(res as any);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      window.removeEventListener(ADMIN_STORE_EVENT, update);
    };
  }, [convex]);

  return posts;
}
