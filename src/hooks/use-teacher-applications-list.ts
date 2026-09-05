import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import {
  TeacherApplicationData,
  getAllTeacherApplications,
  adminReviewTeacherApplication,
} from "@/lib/teacher-store";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useTeacherApplicationsList() {
  const { user } = useAuth();
  const convex = useConvex();

  const [applications, setApplications] = useState<TeacherApplicationData[]>(() =>
    getAllTeacherApplications()
  );
  const [isLoading, setIsLoading] = useState(false);

  const refreshList = useCallback(async () => {
    // 1. Get from local store
    const localApps = getAllTeacherApplications();
    setApplications(localApps);

    // 2. Try Convex if available
    try {
      if (convex && api.admin?.listApplications) {
        const remoteApps = await convex.query(api.admin.listApplications, {});
        if (remoteApps && Array.isArray(remoteApps)) {
          // Merge remote applications
          setApplications(remoteApps as any);
        }
      }
    } catch (err) {
      console.warn("[useTeacherApplicationsList] Fallback to local store:", err);
    }
  }, [convex]);

  useEffect(() => {
    refreshList();

    const handleStoreChange = () => {
      setApplications(getAllTeacherApplications());
    };

    window.addEventListener("vtp_teacher_store_change", handleStoreChange);
    window.addEventListener("storage", handleStoreChange);

    return () => {
      window.removeEventListener("vtp_teacher_store_change", handleStoreChange);
      window.removeEventListener("storage", handleStoreChange);
    };
  }, [refreshList]);

  // Review Application
  const reviewApplication = useCallback(
    async (
      teacherUserId: string,
      action: "approve" | "reject" | "changes" | "suspend" | "reactivate",
      feedback?: string
    ) => {
      setIsLoading(true);
      const adminName = user?.name || "Administrator";

      // Review locally first
      const updated = adminReviewTeacherApplication(teacherUserId, action, adminName, feedback);
      setApplications(getAllTeacherApplications());

      // Attempt Convex mutation if connected
      try {
        if (convex) {
          if (action === "approve" && api.admin?.approveTeacher) {
            await convex.mutation(api.admin.approveTeacher, { teacherId: teacherUserId, reason: feedback });
          } else if (action === "reject" && api.admin?.rejectTeacher) {
            await convex.mutation(api.admin.rejectTeacher, { teacherId: teacherUserId, reason: feedback || "Application did not meet standards" });
          } else if (action === "changes" && api.admin?.requestResubmission) {
            await convex.mutation(api.admin.requestResubmission, { teacherId: teacherUserId, reason: feedback || "Please update documents and resubmit" });
          } else if (action === "suspend" && api.admin?.suspendTeacher) {
            await convex.mutation(api.admin.suspendTeacher, { teacherId: teacherUserId, reason: feedback || "Account suspended" });
          } else if (action === "reactivate" && api.admin?.reactivateTeacher) {
            await convex.mutation(api.admin.reactivateTeacher, { teacherId: teacherUserId, reason: feedback });
          }
        }
      } catch (err) {
        console.warn("[useTeacherApplicationsList] Convex mutation notice:", err);
      } finally {
        setIsLoading(false);
      }

      return updated;
    },
    [user, convex]
  );

  return {
    applications,
    isLoading,
    refreshList,
    reviewApplication,
  };
}
