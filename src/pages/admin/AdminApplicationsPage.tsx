import { useState } from "react";
import { useAdminApplications } from "@/hooks/use-admin-data";
import {
  FileCheck2,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  Ban,
  ShieldCheck,
  Eye,
  DollarSign,
  BookOpen,
  Mail,
  FileText,
  Loader2,
  Filter,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmApplicationModal } from "@/components/admin/ConfirmApplicationModal";
import { ApplicationActionModal, AdminActionType } from "@/components/admin/ApplicationActionModal";
import { TeacherDetailDrawer } from "@/components/admin/TeacherDetailDrawer";
import { SectionLabel } from "@/components/redesign/SectionLabel";

type FilterStatus = "all" | "under_review" | "needs_attention" | "verified" | "rejected" | "suspended";

export default function AdminApplicationsPage() {
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Real-time Applications
  const applications = useAdminApplications({
    status: selectedStatus,
    searchQuery: searchQuery.trim() || undefined,
  });

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E4DE] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <SectionLabel text="TEACHER ACCREDITATION" />
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight font-display mt-1">
            Teacher Applications & Verification
          </h1>
          <p className="text-xs text-[#111111]/60 mt-1 max-w-2xl">
            Review submitted educator credentials, verify government ID documentation, and authorize platform teaching privileges.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#111111]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, title, email, subject..."
            className="pl-9 text-xs rounded-full bg-[#F5F4EF] border-[#E5E4DE] focus:border-[#111111] text-[#111111] h-10"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all", label: "All Applications" },
          { id: "under_review", label: "Under Review (Pending)" },
          { id: "verified", label: "Verified & Approved" },
          { id: "needs_attention", label: "Changes Requested" },
          { id: "rejected", label: "Rejected" },
          { id: "suspended", label: "Suspended" },
        ].map((tab) => {
          const active = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id as FilterStatus)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                active
                  ? "bg-[#111111] text-white border-[#111111] shadow-xs"
                  : "bg-white text-[#111111]/70 border-[#E5E4DE] hover:bg-[#F5F4EF] hover:text-[#111111]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Applications List */}
      {!applications ? (
        <div className="bg-white p-16 rounded-3xl border border-[#E5E4DE] text-center text-[#111111]/40">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#F26522]" />
          <p className="text-xs font-medium">Loading applicant roster...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-[#E5E4DE] text-center space-y-2">
          <FileCheck2 className="w-10 h-10 text-[#111111]/30 mx-auto" />
          <h3 className="text-sm font-bold text-[#111111] font-display">No Applications Found</h3>
          <p className="text-xs text-[#111111]/50 max-w-sm mx-auto">
            No applicant records match the current filter selection or search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {applications.map((app: any) => {
            const isUnderReview = app.verificationStatus === "under_review";
            const isVerified = app.verificationStatus === "verified" || app.isVerified;
            const isNeedsAttention = app.verificationStatus === "needs_attention";
            const isRejected = app.verificationStatus === "rejected";
            const isSuspended = app.userAccountStatus === "suspended";

            return (
              <div
                key={app.userId}
                className="bg-white rounded-3xl border border-[#E5E4DE] p-6 shadow-xs hover:border-[#111111] transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5F4EF] border border-[#E5E4DE] text-[#111111] font-bold text-base flex items-center justify-center shrink-0 font-display">
                      {app.name.charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-bold text-[#111111] font-display">{app.name}</h3>
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#F5F4EF] text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                          </span>
                        )}
                        {isUnderReview && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#F5F4EF] text-[#F26522] border border-[#F26522]/30">
                            <Clock className="w-3.5 h-3.5" /> Under Review
                          </span>
                        )}
                        {isNeedsAttention && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#F5F4EF] text-blue-800 border border-blue-300">
                            <RotateCcw className="w-3.5 h-3.5" /> Changes Requested
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#F5F4EF] text-rose-800 border border-rose-300">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                        {isSuspended && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#F5F4EF] text-red-800 border border-red-300">
                            <Ban className="w-3.5 h-3.5" /> Account Suspended
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#111111]/60 font-medium">
                        {app.title || "Educator Applicant"} • <span className="text-[#111111]">{app.userEmail}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right numbers */}
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <div className="bg-[#F5F4EF] px-3.5 py-2 rounded-2xl border border-[#E5E4DE]">
                      <span className="text-[10px] text-[#111111]/40 block font-medium">Monthly Tuition</span>
                      <strong className="text-[#111111] font-display">৳{((app.hourlyRate || 0) >= 500 ? app.hourlyRate : (app.hourlyRate || 35) * 100).toLocaleString()}/mo</strong>
                    </div>
                    <div className="bg-[#F5F4EF] px-3.5 py-2 rounded-2xl border border-[#E5E4DE]">
                      <span className="text-[10px] text-[#111111]/40 block font-medium">Completion</span>
                      <strong className="text-[#111111] font-display">{app.profileCompletionPct || 0}%</strong>
                    </div>
                  </div>
                </div>

                {/* Sub details: Subjects, NID badge, Rejection Reason */}
                <div className="pt-3.5 border-t border-[#E5E4DE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {app.nidNumber && (
                      <span className="px-2.5 py-1 rounded-full bg-[#F5F4EF] text-[#111111] border border-[#E5E4DE] text-[11px] font-mono font-medium flex items-center gap-1">
                        <FileText className="w-3 h-3 text-[#111111]/40" /> ID: {app.nidNumber}
                      </span>
                    )}
                    {(app.subjects || []).map((s: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-[#F5F4EF] text-[#111111] border border-[#E5E4DE] text-[11px] font-medium">
                        {s}
                      </span>
                    ))}
                    {app.rejectionReason && (
                      <span className="text-[11px] text-rose-700 italic bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        Note: {app.rejectionReason}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectTeacherId(app.userId)}
                      className="text-xs font-semibold rounded-full border-[#E5E4DE] text-[#111111] hover:bg-[#F5F4EF]"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View Dossier
                    </Button>

                    {isSuspended ? (
                      <Button
                        size="sm"
                        onClick={() => handleOpenAction(app, "reactivate")}
                        className="bg-[#111111] hover:bg-[#F26522] text-white text-xs font-semibold rounded-full"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reactivate
                      </Button>
                    ) : (
                      <>
                        {!isVerified && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAction(app, "changes")}
                              className="border-[#E5E4DE] text-[#111111] hover:bg-[#F5F4EF] text-xs font-semibold rounded-full"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Request Changes
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAction(app, "reject")}
                              className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-full"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => handleOpenConfirm(app)}
                              className="bg-[#111111] hover:bg-[#F26522] text-white text-xs font-semibold rounded-full shadow-xs transition-colors"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Confirm Application
                            </Button>
                          </>
                        )}

                        {isVerified && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAction(app, "suspend")}
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-full"
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" /> Suspend
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <ConfirmApplicationModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedApplicant(null);
        }}
        applicant={selectedApplicant}
      />

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
