import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import {
  TeacherApplicationData,
  getTeacherApplicationByUserId,
  saveTeacherDraft,
  submitTeacherApplication,
  calculateTeacherCompletion,
} from "@/lib/teacher-store";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";

function withTimeout<T>(promise: Promise<T>, ms = 2500, fallbackErrorMessage?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(fallbackErrorMessage || "Operation timed out."));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function useTeacherProfile() {
  const { user } = useAuth();
  const convex = useConvex();

  const [profile, setProfile] = useState<TeacherApplicationData | null>(() => {
    if (!user?._id) return null;
    return getTeacherApplicationByUserId(user._id);
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync profile when user changes or store updates
  const refreshProfile = useCallback(async () => {
    if (!user?._id) {
      setProfile(null);
      return;
    }

    // 1. Load from local store immediately
    const localData = getTeacherApplicationByUserId(user._id);
    if (localData) {
      setProfile(localData);
    }

    // 2. Try fetching from Convex if connected
    try {
      if (convex && api.teachers?.getMyProfile) {
        const convexData = await withTimeout(
          convex.query(api.teachers.getMyProfile, {
            userId: user._id,
          }),
          2000,
          "Convex query timed out"
        );
        if (convexData) {
          const merged: TeacherApplicationData = {
            userId: user._id,
            email: user.email || "",
            name: convexData.name || user.name || "Teacher",
            title: convexData.title || "",
            bio: convexData.bio || "",
            avatarUrl: convexData.avatarUrl || user.image || "",
            country: (convexData as any).country || "United States",
            timezone: (convexData as any).timezone || "America/New_York",
            hourlyRate: convexData.hourlyRate || 35,
            price30min: convexData.price30min || 20,
            price60min: convexData.price60min || 35,
            groupPrice: convexData.groupPrice || 25,
            trialPrice: convexData.trialPrice || 15,
            subjects: convexData.subjects || [],
            classLevels: convexData.classLevels || [],
            expertise: convexData.expertise || [],
            languages: convexData.languages || ["English"],
            yearsExperience: convexData.yearsExperience || 1,
            currentPosition: convexData.currentPosition || "",
            previousExperience: convexData.previousExperience || "",
            education: (convexData.education || []).map((e: any) => ({
              degree: e.degree,
              institution: e.institution,
              department: e.department,
              passingYear: e.passingYear ? Number(e.passingYear) : undefined,
              result: e.result,
              certificateUrl: e.certificateUrl,
            })),
            onlineTeachingExperience: convexData.onlineTeachingExperience || "",
            preferredPlatforms: convexData.preferredPlatforms || ["Virtual Tutor Pro Classroom"],
            onlineTools: convexData.onlineTools || ["Interactive Digital Whiteboard"],
            preferredClassDuration: convexData.preferredClassDuration || "60 mins",
            classTypes: convexData.classTypes || ["1-on-1 Private Lessons"],
            nidNumber: convexData.nidNumber || "",
            nidFrontUrl: convexData.nidFrontUrl || "",
            nidBackUrl: convexData.nidBackUrl || "",
            verificationStatus: (convexData.verificationStatus as any) || "not_started",
            isVerified: Boolean(convexData.isVerified),
            adminFeedback: (convexData as any).adminFeedback || (convexData as any).rejectionReason,
            rejectionReason: (convexData as any).rejectionReason,
            profileCompletionScore: (convexData as any).profileCompletionScore || calculateTeacherCompletion(convexData as any),
          };
          setProfile(merged);
          saveTeacherDraft(user._id, user.email, merged);
        }
      }
    } catch (err) {
      // Safe fallback - keep local profile
      console.warn("[useTeacherProfile] Convex query fallback to local store:", err);
    }
  }, [user, convex]);

  useEffect(() => {
    refreshProfile();

    const handleStoreChange = () => {
      if (user?._id) {
        setProfile(getTeacherApplicationByUserId(user._id));
      }
    };

    window.addEventListener("vtp_teacher_store_change", handleStoreChange);
    window.addEventListener("storage", handleStoreChange);

    return () => {
      window.removeEventListener("vtp_teacher_store_change", handleStoreChange);
      window.removeEventListener("storage", handleStoreChange);
    };
  }, [refreshProfile, user?._id]);

  // Save Draft
  const saveDraft = useCallback(
    async (updates: Partial<TeacherApplicationData>) => {
      if (!user?._id) throw new Error("You must be logged in to save an application.");
      setIsLoading(true);

      // Save locally first
      const saved = saveTeacherDraft(user._id, user.email || "", updates);
      setProfile(saved);

      // Try Convex mutation with timeout if available
      try {
        if (convex && api.teachers?.saveDraft) {
          await withTimeout(
            convex.mutation(api.teachers.saveDraft, {
              userId: user._id,
              name: updates.name,
              title: updates.title,
              bio: updates.bio,
              country: updates.country,
              hourlyRate: updates.hourlyRate,
              price30min: updates.price30min,
              price60min: updates.price60min,
              groupPrice: updates.groupPrice,
              trialPrice: updates.trialPrice,
              subjects: updates.subjects,
              classLevels: updates.classLevels,
              expertise: updates.expertise,
              languages: updates.languages,
              yearsExperience: updates.yearsExperience,
              currentPosition: updates.currentPosition,
              previousExperience: updates.previousExperience,
              education: updates.education?.map((e) => ({
                degree: e.degree,
                institution: e.institution,
                department: e.department,
                passingYear: e.passingYear ? String(e.passingYear) : undefined,
                result: e.result,
                certificateUrl: e.certificateUrl,
              })),
              onlineTeachingExperience: updates.onlineTeachingExperience,
              preferredPlatforms: updates.preferredPlatforms,
              onlineTools: updates.onlineTools,
              preferredClassDuration: updates.preferredClassDuration,
              classTypes: updates.classTypes,
              nidNumber: updates.nidNumber,
              nidFrontUrl: updates.nidFrontUrl,
              nidBackUrl: updates.nidBackUrl,
            }),
            2500,
            "Convex saveDraft timeout"
          );
        }
      } catch (err) {
        console.warn("[useTeacherProfile] Convex saveDraft notice:", err);
      } finally {
        setIsLoading(false);
      }

      return saved;
    },
    [user, convex]
  );

  // Submit Application
  const submitApplication = useCallback(
    async (data: Partial<TeacherApplicationData>) => {
      if (!user?._id) throw new Error("You must be logged in to submit an application.");
      setIsLoading(true);

      try {
        // Save draft first to sync latest fields
        await saveDraft(data);

        // Submit locally first to guarantee immediate persistence & feedback
        const submitted = submitTeacherApplication(user._id, user.email || "", data);
        setProfile(submitted);

        // Try Convex mutation / email action if available with timeout
        try {
          if (convex && (api.teachers as any)?.submitApplicationAndNotifyAction) {
            await withTimeout(
              convex.action((api.teachers as any).submitApplicationAndNotifyAction, {
                userId: user._id,
                nidNumber: data.nidNumber || "",
                nidFrontUrl: data.nidFrontUrl || "",
                nidBackUrl: data.nidBackUrl || "",
                profileSnapshot: {
                  name: data.name || user.name || "Applicant",
                  email: user.email || "",
                  title: data.title,
                  bio: data.bio,
                  country: data.country,
                  timezone: data.timezone,
                  hourlyRate: data.hourlyRate,
                  price30min: data.price30min,
                  price60min: data.price60min,
                  groupPrice: data.groupPrice,
                  trialPrice: data.trialPrice,
                  subjects: data.subjects,
                  classLevels: data.classLevels,
                  expertise: data.expertise,
                  languages: data.languages,
                  yearsExperience: data.yearsExperience,
                  currentPosition: data.currentPosition,
                  previousExperience: data.previousExperience,
                  education: data.education?.map((e) => ({
                    degree: e.degree || "",
                    institution: e.institution || "",
                    department: e.department,
                    passingYear: e.passingYear,
                    result: e.result,
                  })),
                  onlineTeachingExperience: data.onlineTeachingExperience,
                  preferredPlatforms: data.preferredPlatforms,
                  onlineTools: data.onlineTools,
                  classTypes: data.classTypes,
                  preferredClassDuration: data.preferredClassDuration,
                },
              }),
              4000,
              "Convex submitApplicationAndNotifyAction timeout"
            );
          } else if (convex && api.teachers?.submitApplication) {
            await withTimeout(
              convex.mutation(api.teachers.submitApplication, {
                userId: user._id,
                nidNumber: data.nidNumber || "",
                nidFrontUrl: data.nidFrontUrl || "",
                nidBackUrl: data.nidBackUrl || "",
              }),
              2500,
              "Convex submitApplication timeout"
            );
          }
        } catch (err) {
          console.warn("[useTeacherProfile] Convex submitApplication fallback to local store:", err);
        }

        return submitted;
      } finally {
        setIsLoading(false);
      }
    },
    [user, convex, saveDraft]
  );

  return {
    profile,
    isLoading,
    saveDraft,
    submitApplication,
    refreshProfile,
    calculateCompletion: (data?: Partial<TeacherApplicationData>) =>
      calculateTeacherCompletion(data || profile || {}),
  };
}
