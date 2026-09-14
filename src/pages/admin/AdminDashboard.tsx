import { useState } from "react";
import { useNavigate } from "react-router";
import { useAdminStats, useAdminApplications, useAdminAuditLogs } from "@/hooks/use-admin-data";
import {
  Users,
  GraduationCap,
  BookOpen,
  FileCheck2,
  ShieldCheck,
  Video,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  History,
  Star,
  ExternalLink,
  Loader2,
  CalendarCheck,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ConfirmApplicationModal } from "@/components/admin/ConfirmApplicationModal";
import { ApplicationActionModal, AdminActionType } from "@/components/admin/ApplicationActionModal";
import { TeacherDetailDrawer } from "@/components/admin/TeacherDetailDrawer";
import { SectionLabel } from "@/components/redesign/SectionLabel";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSoleAdmin = user?.email?.toLowerCase().trim() === "istihadahmed1163@gmail.com";

  // Real database stats and records
  const stats = useAdminStats();
  const pendingApplications = useAdminApplications({ status: "under_review" });
  const recentLogs = useAdminAuditLogs(8);

  // Modal states
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [actionModalType, setActionModalType] = useState<AdminActionType | null>(null);
  const [inspectTeacherId, setInspectTeacherId] = useState<string | null>(null);

  const handleOpenConfirm = (app: any) => {
    setSelectedApplicant({
      userId: app.userId,
      name: app.name,
      email: app.userEmail,
      title: app.title,
      subjects: app.subjects,
      hourlyRate: app.hourlyRate,
      nidNumber: app.nidNumber,
      verificationStatus: app.verificationStatus,
      profileCompletionPct: app.profileCompletionPct,
    });
    setIsConfirmModalOpen(true);
  };

  const handleOpenAction = (app: any, type: AdminActionType) => {
    setSelectedApplicant({
      userId: app.userId,
      name: app.name,
      email: app.userEmail,
    });
    setActionModalType(type);
  };

  return (
    <div className="space-y-8 text-white">
      {/* Welcome Banner */}
      <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/15 mb-2">
            <span className="text-violet-400 font-mono">01</span>
            <span>ADMINISTRATIVE CONSOLE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display mt-1">
            Control Center & Oversight
          </h1>
          <p className="text-xs text-white/70 mt-1 max-w-2xl">
            Real-time verification queue, active user roster, academic operations, and compliance telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => navigate("/admin/applications")}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-full shadow-[0_4px_16px_rgba(109,93,251,0.35)] transition-all h-9 px-4 cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4 mr-1.5" />
            Review Applications ({stats?.underReviewApplications || 0})
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/audit-logs")}
            className="border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-full h-9 px-4 cursor-pointer"
          >
            <History className="w-4 h-4 mr-1.5 text-violet-400" /> Audit Stream
          </Button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Verification */}
        <div className="bg-white/[0.04] backdrop-blur-xl p-6 rounded-3xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.36)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-display">Pending Review</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold text-white font-display">
                {stats ? stats.underReviewApplications : <Loader2 className="w-4 h-4 animate-spin inline text-violet-400" />}
              </span>
              <span className="text-xs font-bold text-amber-400">Action Required</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Verified Teachers */}
        <div className="bg-white/[0.04] backdrop-blur-xl p-6 rounded-3xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.36)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-display">Verified Educators</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold text-white font-display">
                {stats ? stats.verifiedTeachers : <Loader2 className="w-4 h-4 animate-spin inline text-violet-400" />}
              </span>
              <span className="text-xs text-white/50 font-medium">of {stats?.totalTeachers || 0} registered</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white/[0.04] backdrop-blur-xl p-6 rounded-3xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.36)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-display">Active Students</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold text-white font-display">
                {stats ? stats.totalStudents : <Loader2 className="w-4 h-4 animate-spin inline text-violet-400" />}
              </span>
              <span className="text-xs text-white/50 font-medium">enrolled</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Total Lessons & Bookings */}
        <div className="bg-white/[0.04] backdrop-blur-xl p-6 rounded-3xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.36)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-display">Sessions Conducted</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold text-white font-display">
                {stats ? stats.totalLessons : <Loader2 className="w-4 h-4 animate-spin inline text-violet-400" />}
              </span>
              <span className="text-xs text-white/50 font-medium">{stats?.completedLessons || 0} completed</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Urgent Applications Queue (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-violet-400" />
              <h2 className="text-base font-bold text-white font-display">
                Urgent Teacher Verification Queue
              </h2>
            </div>
            <button
              onClick={() => navigate("/admin/applications")}
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              View All ({stats?.totalTeachers || 0}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!pendingApplications ? (
            <div className="bg-white/[0.04] backdrop-blur-xl p-12 rounded-3xl border border-white/12 text-center text-white/40">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-violet-400" />
              <p className="text-xs">Fetching application records...</p>
            </div>
          ) : pendingApplications.length === 0 ? (
            <div className="bg-white/[0.04] backdrop-blur-xl p-10 rounded-3xl border border-white/12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white font-display">Verification Queue is Clear</h3>
              <p className="text-xs text-white/50 max-w-sm mx-auto">
                No teacher applications are currently awaiting review. All submitted credentials have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApplications.slice(0, 5).map((app: any) => (
                <div
                  key={app.userId}
                  className="bg-white/[0.04] backdrop-blur-xl p-5 rounded-3xl border border-white/12 shadow-sm hover:border-violet-400/40 hover:bg-white/[0.06] transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center shrink-0 font-display shadow-sm">
                        {app.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white font-display">{app.name}</h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Under Review
                          </span>
                        </div>
                        <p className="text-xs text-white/60">{app.title || "Educator Applicant"} • {app.userEmail}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-white font-display">
                        ৳{((app.monthlyTuition && app.monthlyTuition > 0) ? app.monthlyTuition : ((app.hourlyRate || 35) >= 500 ? app.hourlyRate : (app.hourlyRate || 35) * 100)).toLocaleString()}/mo
                      </span>
                      <p className="text-[11px] text-white/40">
                        {app.nidSubmittedAt ? new Date(app.nidSubmittedAt).toLocaleDateString() : "Recent"}
                      </p>
                    </div>
                  </div>

                  {/* Subjects & Details */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {(app.subjects || []).map((sub: string, i: number) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-full bg-white/5 text-white/80 border border-white/10 text-[10px] font-medium">
                          {sub}
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectTeacherId(app.userId)}
                        className="h-8 text-xs font-semibold rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 cursor-pointer"
                      >
                        Inspect
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenConfirm(app)}
                        className="h-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-full shadow-[0_4px_16px_rgba(109,93,251,0.35)] transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Confirm Application
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Audit Log & System Telemetry (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-violet-400" />
              <h2 className="text-base font-bold text-white font-display">Recent Audit Events</h2>
            </div>
            <button
              onClick={() => navigate("/admin/audit-logs")}
              className="text-xs font-semibold text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              View Full →
            </button>
          </div>

          <div className="bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/12 p-5 divide-y divide-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.36)] text-white">
            {!recentLogs ? (
              <div className="py-8 text-center text-white/40">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-400" />
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-xs text-white/50 py-6 text-center">No recent audit entries.</p>
            ) : (
              recentLogs.map((log: any) => (
                <div key={log._id} className="py-3 first:pt-0 last:pb-0 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white capitalize font-display">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {log.reason && (
                    <p className="text-white/70 text-[11px] line-clamp-1 italic">
                      "{log.reason}"
                    </p>
                  )}
                  <p className="text-[10px] text-white/40">
                    By: {log.adminName || log.adminId}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmApplicationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedApplicant(null);
        }}
        applicant={selectedApplicant}
      />

      {/* Action Modal (Reject / Changes / Suspend) */}
      {actionModalType && (
        <ApplicationActionModal
          isOpen={true}
          onClose={() => {
            setActionModalType(null);
            setSelectedApplicant(null);
          }}
          applicant={selectedApplicant}
          actionType={actionModalType}
        />
      )}

      {/* Detail Drawer */}
      <TeacherDetailDrawer
        isOpen={Boolean(inspectTeacherId)}
        onClose={() => setInspectTeacherId(null)}
        teacherUserId={inspectTeacherId}
        onConfirmApplication={(app) => {
          setInspectTeacherId(null);
          handleOpenConfirm(app);
        }}
        onRejectApplication={(app) => {
          setInspectTeacherId(null);
          handleOpenAction(app, "reject");
        }}
        onRequestChanges={(app) => {
          setInspectTeacherId(null);
          handleOpenAction(app, "changes");
        }}
        onSuspend={(app) => {
          setInspectTeacherId(null);
          handleOpenAction(app, "suspend");
        }}
        onReactivate={(app) => {
          setInspectTeacherId(null);
          handleOpenAction(app, "reactivate");
        }}
      />
    </div>
  );
}
