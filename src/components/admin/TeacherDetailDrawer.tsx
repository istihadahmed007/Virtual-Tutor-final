import { useState, useEffect } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getAllTeacherApplications } from "@/lib/teacher-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  User,
  Mail,
  GraduationCap,
  BookOpen,
  DollarSign,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Ban,
  ExternalLink,
  History,
  AlertTriangle,
  Globe,
  Award,
  Lock,
  Loader2,
  X,
} from "lucide-react";

export interface TeacherDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  teacherUserId: string | null;
  onConfirmApplication: (applicant: any) => void;
  onRejectApplication: (applicant: any) => void;
  onRequestChanges: (applicant: any) => void;
  onSuspend: (applicant: any) => void;
  onReactivate: (applicant: any) => void;
}

export function TeacherDetailDrawer({
  isOpen,
  onClose,
  teacherUserId,
  onConfirmApplication,
  onRejectApplication,
  onRequestChanges,
  onSuspend,
  onReactivate,
}: TeacherDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "documents" | "history">("profile");

  const [detailData, setDetailData] = useState<any>(null);
  const convex = useConvex();

  useEffect(() => {
    if (!teacherUserId) return;
    const localApps = getAllTeacherApplications();
    const app = localApps.find((a) => a.userId === teacherUserId);
    if (app) {
      setDetailData({
        profile: {
          _id: app.userId,
          title: app.title,
          bio: app.bio,
          country: app.country,
          hourlyRate: app.hourlyRate,
          subjects: app.subjects,
          classLevels: app.classLevels,
          languages: app.languages,
          yearsExperience: app.yearsExperience,
          nidNumber: app.nidNumber,
          nidFrontUrl: app.nidFrontUrl,
          nidBackUrl: app.nidBackUrl,
          verificationStatus: app.verificationStatus,
          isVerified: app.isVerified,
          profileCompletionPct: app.profileCompletionScore || app.profileCompletionPct || 100,
        },
        user: {
          _id: app.userId,
          name: app.name,
          email: app.email,
          accountStatus: app.userAccountStatus || "active",
          avatarUrl: app.avatarUrl,
          _creationTime: app.submittedAt || Date.now() - 7 * 86400000,
        },
        auditLogs: app.auditLogs || [],
      });
    }

    let isMounted = true;
    convex
      .query(api.admin.getTeacherDetail, { teacherId: teacherUserId })
      .then((serverData) => {
        if (isMounted && serverData) {
          setDetailData(serverData);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [teacherUserId, convex]);

  if (!teacherUserId) return null;

  const profile = detailData?.profile;
  const user = detailData?.user;
  const auditLogs = detailData?.auditLogs || [];

  const isUnderReview = profile?.verificationStatus === "under_review";
  const isVerified = profile?.verificationStatus === "verified" || profile?.isVerified;
  const isNeedsAttention = profile?.verificationStatus === "needs_attention";
  const isRejected = profile?.verificationStatus === "rejected";
  const isSuspended = user?.accountStatus === "suspended";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-white border border-stone-200 shadow-2xl rounded-2xl p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 shrink-0 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold text-xl overflow-hidden shadow-inner">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                profile?.name?.charAt(0) || "T"
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold text-white">{profile?.name || "Loading..."}</h3>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
                {isUnderReview && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5" /> Under Review
                  </span>
                )}
                {isNeedsAttention && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <RotateCcw className="w-3.5 h-3.5" /> Changes Requested
                  </span>
                )}
                {isRejected && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <XCircle className="w-3.5 h-3.5" /> Rejected
                  </span>
                )}
                {isSuspended && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                    <Ban className="w-3.5 h-3.5" /> Suspended
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>{profile?.title || "Educator"}</span>
                {user?.email && <span>• {user.email}</span>}
                <span>• User ID: <code className="font-mono text-slate-300">{teacherUserId}</code></span>
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 shrink-0">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === "profile"
                ? "border-teal-600 text-teal-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Applicant Profile & Credentials
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === "documents"
                ? "border-teal-600 text-teal-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Identity Documents (NID/Govt ID)
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === "history"
                ? "border-teal-600 text-teal-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Audit History & Activity Log ({auditLogs.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!detailData ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-teal-600" />
              <p className="text-xs">Loading application records...</p>
            </div>
          ) : activeTab === "profile" ? (
            <div className="space-y-5">
              {/* Bio */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Biography & Overview
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {profile?.bio || "No biography provided."}
                </p>
              </div>

              {/* Key Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <p className="text-[11px] text-slate-500">Monthly Tuition</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    ৳{((profile?.monthlyTuition && profile.monthlyTuition > 0)
                      ? profile.monthlyTuition
                      : ((profile?.hourlyRate || 0) >= 500 ? profile?.hourlyRate : (profile?.hourlyRate || 35) * 100)
                    ).toLocaleString()}/mo
                  </p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <p className="text-[11px] text-slate-500">Experience</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{profile?.yearsExperience || 0} Years</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <p className="text-[11px] text-slate-500">Rating</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">★ {profile?.rating || 5.0} ({profile?.reviewCount || 0})</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <p className="text-[11px] text-slate-500">Completion</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{profile?.profileCompletionPct || 0}%</p>
                </div>
              </div>

              {/* Subjects & Languages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                    Teaching Subjects
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(profile?.subjects || []).map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-white border border-stone-200 text-slate-800 text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-teal-600" />
                    Languages of Instruction
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(profile?.languages || []).map((l, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-white border border-stone-200 text-slate-800 text-xs font-medium">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Education Background */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                  Education & Credentials
                </h4>
                <div className="space-y-2">
                  {(profile?.education || []).map((edu, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-stone-200 flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{edu.degree}</p>
                        <p className="text-xs text-slate-600">{edu.institution}</p>
                      </div>
                      {edu.passingYear && (
                        <span className="text-[11px] font-semibold text-slate-500 bg-stone-100 px-2 py-0.5 rounded">
                          Class of {edu.passingYear}
                        </span>
                      )}
                    </div>
                  ))}
                  {(!profile?.education || profile.education.length === 0) && (
                    <p className="text-xs text-slate-500 italic">No formal education entries recorded.</p>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === "documents" ? (
            <div className="space-y-5">
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Government Identification / National ID Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Document / ID Number:</span>
                    <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                      {profile?.nidNumber || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Submission Timestamp:</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {profile?.nidSubmittedAt
                        ? new Date(profile.nidSubmittedAt).toLocaleString()
                        : "Pending submission"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Scans */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                  <div className="p-3 border-b border-stone-200 bg-white font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>Front of Identification Card</span>
                    {profile?.nidFrontUrl && (
                      <a
                        href={profile.nidFrontUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-600 hover:text-teal-700 flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" /> View Full
                      </a>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-center min-h-[180px] bg-stone-100">
                    {profile?.nidFrontUrl ? (
                      <img
                        src={profile.nidFrontUrl}
                        alt="NID Front"
                        className="max-h-48 object-contain rounded border border-stone-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center text-slate-400 text-xs">
                        <FileText className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        No front document uploaded
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                  <div className="p-3 border-b border-stone-200 bg-white font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>Back of Identification Card</span>
                    {profile?.nidBackUrl && (
                      <a
                        href={profile.nidBackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-600 hover:text-teal-700 flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" /> View Full
                      </a>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-center min-h-[180px] bg-stone-100">
                    {profile?.nidBackUrl ? (
                      <img
                        src={profile.nidBackUrl}
                        alt="NID Back"
                        className="max-h-48 object-contain rounded border border-stone-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center text-slate-400 text-xs">
                        <FileText className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        No back document uploaded (Single-sided or Passport)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-teal-600" />
                Immutable Audit Trail
              </h4>
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-stone-50 rounded-xl border border-stone-200">
                  No previous audit actions recorded for this educator.
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 capitalize">
                          {log.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {log.reason && (
                        <p className="text-slate-700 bg-white p-2 rounded-lg border border-stone-200/80 mt-1">
                          "{log.reason}"
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Admin ID: <code className="font-mono">{log.adminId}</code>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs font-semibold rounded-xl"
          >
            Close Viewer
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            {isSuspended ? (
              <Button
                onClick={() => onReactivate({ userId: teacherUserId, name: profile?.name || "Teacher" })}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Reactivate Account
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => onSuspend({ userId: teacherUserId, name: profile?.name || "Teacher" })}
                  className="border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xl"
                >
                  <Ban className="w-3.5 h-3.5 mr-1.5" /> Suspend
                </Button>

                {!isVerified && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => onRequestChanges({ userId: teacherUserId, name: profile?.name || "Teacher" })}
                      className="border-amber-200 text-amber-800 hover:bg-amber-50 text-xs font-semibold rounded-xl"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Request Changes
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => onRejectApplication({ userId: teacherUserId, name: profile?.name || "Teacher" })}
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                    </Button>

                    <Button
                      onClick={() =>
                        onConfirmApplication({
                          userId: teacherUserId,
                          name: profile?.name || "Teacher",
                          email: user?.email,
                          title: profile?.title,
                          subjects: profile?.subjects,
                          hourlyRate: profile?.hourlyRate,
                          nidNumber: profile?.nidNumber,
                          verificationStatus: profile?.verificationStatus,
                        })
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Confirm Application
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
