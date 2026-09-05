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
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Administrative Control Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Real-time verification queue, active user roster, academic operations, and compliance telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => navigate("/admin/applications")}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            <FileCheck2 className="w-4 h-4 mr-1.5" />
            Review Applications ({stats?.underReviewApplications || 0})
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/audit-logs")}
            className="border-stone-300 text-slate-700 hover:bg-stone-100 text-xs font-semibold rounded-xl"
          >
            <History className="w-4 h-4 mr-1.5" /> Audit Stream
          </Button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Verification */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Review</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {stats ? stats.underReviewApplications : <Loader2 className="w-4 h-4 animate-spin inline" />}
              </span>
              <span className="text-xs font-bold text-amber-600">Action Required</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Verified Teachers */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Educators</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {stats ? stats.verifiedTeachers : <Loader2 className="w-4 h-4 animate-spin inline" />}
              </span>
              <span className="text-xs text-slate-500 font-medium">of {stats?.totalTeachers || 0} registered</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Students</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {stats ? stats.totalStudents : <Loader2 className="w-4 h-4 animate-spin inline" />}
              </span>
              <span className="text-xs text-slate-500 font-medium">enrolled</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Total Lessons & Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sessions Conducted</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {stats ? stats.totalLessons : <Loader2 className="w-4 h-4 animate-spin inline" />}
              </span>
              <span className="text-xs text-slate-500 font-medium">{stats?.completedLessons || 0} completed</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Video className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Urgent Applications Queue (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">
                Urgent Teacher Verification Queue
              </h2>
            </div>
            <button
              onClick={() => navigate("/admin/applications")}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              View All ({stats?.totalTeachers || 0}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!pendingApplications ? (
            <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
              <p className="text-xs">Fetching application records...</p>
            </div>
          ) : pendingApplications.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Verification Queue is Clear</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No teacher applications are currently awaiting review. All submitted credentials have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApplications.slice(0, 5).map((app: any) => (
                <div
                  key={app.userId}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-teal-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 font-bold text-sm flex items-center justify-center border border-teal-200 shrink-0">
                        {app.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{app.name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Under Review
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{app.title || "Educator Applicant"} • {app.userEmail}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-900">${app.hourlyRate}/hr</span>
                      <p className="text-[11px] text-slate-400">
                        {app.nidSubmittedAt ? new Date(app.nidSubmittedAt).toLocaleDateString() : "Recent"}
                      </p>
                    </div>
                  </div>

                  {/* Subjects & Details */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {(app.subjects || []).map((sub: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-stone-100 text-slate-700 text-[11px] font-medium">
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
                        className="h-8 text-xs font-semibold rounded-lg border-stone-200"
                      >
                        Inspect
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenConfirm(app)}
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs shadow-emerald-600/20"
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
              <History className="w-5 h-5 text-slate-700" />
              <h2 className="text-base font-bold text-slate-900">Recent Audit Events</h2>
            </div>
            <button
              onClick={() => navigate("/admin/audit-logs")}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              View Full
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4 divide-y divide-stone-100 shadow-xs">
            {!recentLogs ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-teal-600" />
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No recent audit entries.</p>
            ) : (
              recentLogs.map((log: any) => (
                <div key={log._id} className="py-3 first:pt-0 last:pb-0 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 capitalize">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {log.reason && (
                    <p className="text-slate-600 text-[11px] line-clamp-1 italic">
                      "{log.reason}"
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
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
