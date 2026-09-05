import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTeacherApplicationsList } from "@/hooks/use-teacher-applications-list";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GraduationCap,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  ShieldCheck,
  Eye,
  Check,
  RotateCcw,
  Ban,
  ExternalLink,
  BookOpen,
  DollarSign,
  History,
  Lock,
  Loader2,
  UserCheck,
  UserX,
  X,
  Bug,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { ErrorLogsViewerModal } from "@/components/ErrorLogsViewerModal";
import { AdminContactInquiriesModal } from "@/components/AdminContactInquiriesModal";

type FilterStatus = "all" | "under_review" | "needs_attention" | "verified" | "rejected" | "suspended";

export default function AdminTeacherApplications() {
  const { user: currentAdmin } = useAuth();
  const { applications, reviewApplication } = useTeacherApplicationsList();

  // Diagnostics & Inquiries Modal States
  const [isErrorLogsOpen, setIsErrorLogsOpen] = useState(false);
  const [isInquiriesOpen, setIsInquiriesOpen] = useState(false);

  // Filter & Search states
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal State
  const [activeTeacherUserId, setActiveTeacherUserId] = useState<string | null>(null);
  const [selectedAppForAction, setSelectedAppForAction] = useState<{
    teacherId: string;
    name: string;
    action: "approve" | "reject" | "changes" | "suspend" | "reactivate";
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Selected teacher detail from local/remote applications
  const teacherDetail = applications.find(
    (app) => app.userId === activeTeacherUserId || (app as any)._id === activeTeacherUserId
  );

  // Dynamic calculated stats
  const calculatedStats = {
    totalTeachers: applications.length,
    underReviewApplications: applications.filter((a) => a.verificationStatus === "under_review").length,
    needsAttentionApplications: applications.filter((a) => a.verificationStatus === "needs_attention").length,
    verifiedTeachers: applications.filter((a) => a.verificationStatus === "verified" || a.isVerified).length,
    suspendedTeachers: applications.filter((a) => (a as any).userAccountStatus === "suspended").length,
  };

  // Filter applications
  const filteredApps = (applications || []).filter((app: any) => {
    // Status filter
    if (selectedStatus === "suspended") {
      if (app.userAccountStatus !== "suspended") return false;
    } else if (selectedStatus !== "all") {
      if (app.verificationStatus !== selectedStatus) return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = app.name?.toLowerCase().includes(q) || false;
      const matchTitle = app.title?.toLowerCase().includes(q) || false;
      const matchEmail = (app.userEmail || app.email)?.toLowerCase().includes(q) || false;
      const matchSubject = app.subjects?.some((s: string) => s.toLowerCase().includes(q)) || false;
      const matchCountry = app.country?.toLowerCase().includes(q) || false;
      const matchNid = app.nidNumber?.toLowerCase().includes(q) || false;
      return matchName || matchTitle || matchEmail || matchSubject || matchCountry || matchNid;
    }

    return true;
  });

  // Action handlers
  const handleExecuteAction = async () => {
    if (!selectedAppForAction) return;
    setIsProcessingAction(true);

    try {
      if (selectedAppForAction.action === "approve") {
        await reviewApplication(selectedAppForAction.teacherId, "approve", actionReason.trim() || undefined);
        toast.success(`Approved ${selectedAppForAction.name} as a verified teacher!`);
      } else if (selectedAppForAction.action === "reject") {
        if (!actionReason.trim()) {
          toast.error("Please provide a reason for rejecting the application.");
          setIsProcessingAction(false);
          return;
        }
        await reviewApplication(selectedAppForAction.teacherId, "reject", actionReason.trim());
        toast.success(`Application for ${selectedAppForAction.name} marked as rejected.`);
      } else if (selectedAppForAction.action === "changes") {
        if (!actionReason.trim()) {
          toast.error("Please specify what corrections are requested.");
          setIsProcessingAction(false);
          return;
        }
        await reviewApplication(selectedAppForAction.teacherId, "changes", actionReason.trim());
        toast.success(`Requested corrections from ${selectedAppForAction.name}.`);
      } else if (selectedAppForAction.action === "suspend") {
        if (!actionReason.trim()) {
          toast.error("Please specify the suspension reason.");
          setIsProcessingAction(false);
          return;
        }
        await reviewApplication(selectedAppForAction.teacherId, "suspend", actionReason.trim());
        toast.success(`Account for ${selectedAppForAction.name} has been suspended.`);
      } else if (selectedAppForAction.action === "reactivate") {
        await reviewApplication(selectedAppForAction.teacherId, "reactivate", actionReason.trim() || undefined);
        toast.success(`Account for ${selectedAppForAction.name} has been reactivated.`);
      }

      setSelectedAppForAction(null);
      setActionReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to execute administrative action.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-xs shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Teacher Verification Console
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Review applicant credentials, verify identity documents, and manage educator authorizations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInquiriesOpen(true)}
              className="h-9 text-xs border-stone-200 hover:border-stone-300 bg-white text-teal-700 font-semibold rounded-xl gap-1.5 shadow-2xs"
            >
              <Mail className="w-3.5 h-3.5 text-teal-600" />
              <span>Contact Inquiries</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsErrorLogsOpen(true)}
              className="h-9 text-xs border-stone-200 hover:border-stone-300 bg-white text-slate-700 rounded-xl gap-1.5 shadow-2xs"
            >
              <Bug className="w-3.5 h-3.5 text-rose-600" />
              <span>Error & Auth Diagnostics</span>
            </Button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin: {currentAdmin?.name || "Administrator"}
            </span>
          </div>
        </div>

        {/* Top Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <button
            onClick={() => setSelectedStatus("all")}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedStatus === "all"
                ? "bg-white border-slate-900 shadow-sm ring-1 ring-slate-900"
                : "bg-white border-stone-200 hover:border-stone-300"
            }`}
          >
            <p className="text-xs text-slate-500 font-medium">All Applications</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">
              {calculatedStats.totalTeachers}
            </p>
          </button>

          <button
            onClick={() => setSelectedStatus("under_review")}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedStatus === "under_review"
                ? "bg-amber-50/50 border-amber-500 shadow-sm ring-1 ring-amber-500"
                : "bg-white border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-700 font-medium">Under Review</p>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xl font-extrabold text-amber-900 mt-1">
              {calculatedStats.underReviewApplications}
            </p>
          </button>

          <button
            onClick={() => setSelectedStatus("needs_attention")}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedStatus === "needs_attention"
                ? "bg-orange-50/50 border-orange-500 shadow-sm ring-1 ring-orange-500"
                : "bg-white border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-orange-700 font-medium">Action Required</p>
              <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <p className="text-xl font-extrabold text-orange-900 mt-1">
              {calculatedStats.needsAttentionApplications}
            </p>
          </button>

          <button
            onClick={() => setSelectedStatus("verified")}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedStatus === "verified"
                ? "bg-teal-50/50 border-teal-500 shadow-sm ring-1 ring-teal-500"
                : "bg-white border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-teal-700 font-medium">Verified Active</p>
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <p className="text-xl font-extrabold text-teal-900 mt-1">
              {calculatedStats.verifiedTeachers}
            </p>
          </button>

          <button
            onClick={() => setSelectedStatus("suspended")}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedStatus === "suspended"
                ? "bg-red-50/50 border-red-500 shadow-sm ring-1 ring-red-500"
                : "bg-white border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-red-700 font-medium">Suspended</p>
              <Ban className="w-3.5 h-3.5 text-red-600" />
            </div>
            <p className="text-xl font-extrabold text-red-900 mt-1">
              {calculatedStats.suspendedTeachers}
            </p>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, email, subject, NID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs bg-stone-50/50 border-stone-200 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(["all", "under_review", "needs_attention", "verified", "rejected", "suspended"] as FilterStatus[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedStatus === status
                      ? "bg-slate-900 text-white"
                      : "bg-stone-100 text-slate-600 hover:bg-stone-200"
                  }`}
                >
                  {status === "all"
                    ? "All"
                    : status === "under_review"
                    ? "Under Review"
                    : status === "needs_attention"
                    ? "Needs Attention"
                    : status === "verified"
                    ? "Verified"
                    : status === "rejected"
                    ? "Rejected"
                    : "Suspended"}
                </button>
              )
            )}
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-3">
          {!applications ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading applications...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Applications Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No teacher applications match your current status filter or search keywords.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredApps.map((app: any) => {
                const isSuspended = app.userAccountStatus === "suspended";

                return (
                  <Card
                    key={app.userId || app._id}
                    className={`border transition-all bg-white rounded-2xl hover:shadow-md ${
                      app.verificationStatus === "under_review"
                        ? "border-amber-300 ring-1 ring-amber-200/50"
                        : "border-stone-200"
                    }`}
                  >
                    <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Applicant Overview */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                          {app.name?.charAt(0) || "T"}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {app.name}
                            </h3>

                            {/* Status Badge */}
                            {isSuspended ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                <Ban className="w-3 h-3" /> Account Suspended
                              </span>
                            ) : app.verificationStatus === "under_review" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-600" /> Under Review
                              </span>
                            ) : app.verificationStatus === "needs_attention" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                <AlertTriangle className="w-3 h-3 text-orange-600" /> Action Required
                              </span>
                            ) : app.verificationStatus === "verified" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                                <CheckCircle2 className="w-3 h-3 text-teal-600" /> Verified
                              </span>
                            ) : app.verificationStatus === "rejected" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                <XCircle className="w-3 h-3 text-red-600" /> Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-slate-600 border border-stone-200">
                                Draft
                              </span>
                            )}

                            {/* Completion Score */}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-slate-700">
                              {app.profileCompletionPct || app.profileCompletionScore || 0}% Complete
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 font-medium">
                            {app.title || "Specialist Tutor"} · <span className="text-slate-400">{app.country || "Global"}</span>
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                            <span>Email: <strong className="text-slate-700">{app.userEmail || app.email || "N/A"}</strong></span>
                            <span>·</span>
                            <span>Rate: <strong className="text-slate-700">${app.hourlyRate || 35}/hr</strong></span>
                            <span>·</span>
                            <span>NID: <strong className="font-mono text-slate-700">{app.nidNumber || "Pending"}</strong></span>
                            <span>·</span>
                            <span>
                              Doc: {app.nidFrontUrl ? (
                                <strong className="text-teal-700">Front Uploaded</strong>
                              ) : (
                                <strong className="text-amber-700">Missing</strong>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Review and Decisions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTeacherUserId(app.userId || app._id)}
                          className="h-8 text-xs border-stone-200 text-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          Review Application
                        </Button>

                        {/* If under review or needs attention */}
                        {(app.verificationStatus === "under_review" ||
                          app.verificationStatus === "needs_attention") && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                setSelectedAppForAction({
                                  teacherId: app.userId,
                                  name: app.name,
                                  action: "approve",
                                })
                              }
                              className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSelectedAppForAction({
                                  teacherId: app.userId,
                                  name: app.name,
                                  action: "changes",
                                })
                              }
                              className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Request Changes
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSelectedAppForAction({
                                  teacherId: app.userId,
                                  name: app.name,
                                  action: "reject",
                                })
                              }
                              className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50"
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        {/* If verified */}
                        {app.verificationStatus === "verified" && !isSuspended && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelectedAppForAction({
                                teacherId: app.userId,
                                name: app.name,
                                action: "suspend",
                              })
                            }
                            className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50"
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" />
                            Suspend Teacher
                          </Button>
                        )}

                        {/* If suspended */}
                        {isSuspended && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setSelectedAppForAction({
                                teacherId: app.userId,
                                name: app.name,
                                action: "reactivate",
                              })
                            }
                            className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                            Reactivate Teacher
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── ACTION CONFIRMATION MODAL ────────────────────────────────────── */}
        {selectedAppForAction && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedAppForAction.action === "approve" && (
                    <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  {selectedAppForAction.action === "reject" && (
                    <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                      <XCircle className="w-5 h-5" />
                    </div>
                  )}
                  {selectedAppForAction.action === "changes" && (
                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                  )}
                  {selectedAppForAction.action === "suspend" && (
                    <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                      <Ban className="w-5 h-5" />
                    </div>
                  )}
                  {selectedAppForAction.action === "reactivate" && (
                    <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedAppForAction.action === "approve" && "Approve Teacher Application"}
                      {selectedAppForAction.action === "reject" && "Reject Teacher Application"}
                      {selectedAppForAction.action === "changes" && "Request Corrections"}
                      {selectedAppForAction.action === "suspend" && "Suspend Educator Account"}
                      {selectedAppForAction.action === "reactivate" && "Reactivate Educator Account"}
                    </h3>
                    <p className="text-xs text-slate-500">{selectedAppForAction.name}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedAppForAction(null);
                    setActionReason("");
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                {selectedAppForAction.action === "approve" && (
                  <p>
                    Approving will immediately grant the <strong>Teacher</strong> role, publish their profile to student discovery, and enable calendar scheduling.
                  </p>
                )}
                {selectedAppForAction.action === "reject" && (
                  <p>
                    Rejecting will decline their application and record your rationale in the applicant's audit log.
                  </p>
                )}
                {selectedAppForAction.action === "changes" && (
                  <p>
                    The applicant's status will switch to <strong>Needs Attention</strong>, unlocking their application form for edits with your specific instructions.
                  </p>
                )}
                {selectedAppForAction.action === "suspend" && (
                  <p>
                    Suspension prevents the educator from accepting bookings and hides them from discovery while preserving full historical records.
                  </p>
                )}
                {selectedAppForAction.action === "reactivate" && (
                  <p>
                    Reactivation restores the educator's active status and public discovery.
                  </p>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {selectedAppForAction.action === "approve"
                      ? "Optional Admin Notes"
                      : "Reason / Feedback Notes (Required)"}
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder={
                      selectedAppForAction.action === "approve"
                        ? "e.g., Verified degree with registrar; government ID valid."
                        : selectedAppForAction.action === "changes"
                        ? "e.g., Please upload a higher-resolution scan of your degree certificate."
                        : selectedAppForAction.action === "reject"
                        ? "e.g., Unable to verify teaching credentials or background match."
                        : "State the reason for this action..."
                    }
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAppForAction(null);
                    setActionReason("");
                  }}
                  disabled={isProcessingAction}
                  className="text-xs border-stone-200"
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={handleExecuteAction}
                  disabled={isProcessingAction}
                  className={`text-xs text-white ${
                    selectedAppForAction.action === "approve" || selectedAppForAction.action === "reactivate"
                      ? "bg-teal-600 hover:bg-teal-700"
                      : selectedAppForAction.action === "changes"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isProcessingAction ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : null}
                  Confirm {selectedAppForAction.action === "approve" ? "Approval" : selectedAppForAction.action}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── FULL APPLICATION DETAIL REVIEW MODAL ────────────────────────── */}
        {activeTeacherUserId && (() => {
          const rawDetail: any = teacherDetail || {};
          const profile = rawDetail.profile || rawDetail;
          const user = rawDetail.user || rawDetail;
          const auditLogs = rawDetail.auditLogs || rawDetail.logs || [];

          return (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95">
                {/* Modal Header */}
                <div className="p-6 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                      {profile?.name?.charAt(0) || "T"}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {profile?.name || "Teacher Application"}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {user?.email || profile?.userEmail || profile?.email} · {profile?.title || "Specialist"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTeacherUserId(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-stone-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Scrollable Body */}
                <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-700">
                  {!profile?.name && !profile?.userId ? (
                    <div className="p-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Loading full applicant dossier...</p>
                    </div>
                  ) : (
                    <>
                      {/* 1. Core Profile & Biography */}
                      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-teal-600" /> Biography & Introduction
                        </h3>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {profile?.bio || "No biography provided."}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-stone-200/60 text-[11px] text-slate-500">
                          <div>Country: <strong className="text-slate-800">{profile?.country || "N/A"}</strong></div>
                          <div>Hourly Rate: <strong className="text-slate-800">${profile?.hourlyRate || 35}/hr</strong></div>
                          <div>Experience: <strong className="text-slate-800">{profile?.yearsExperience || 0} Years</strong></div>
                        </div>
                      </div>

                      {/* 2. Subjects & Cohorts */}
                      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-teal-600" /> Teaching Subjects & Cohorts
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {profile?.subjects?.map((s: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold text-[11px]">
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="pt-2">
                          <p className="text-[11px] text-slate-500 mb-1">Target Levels:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {profile?.classLevels?.map((lvl: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-stone-200/80 text-slate-800 text-[11px]">
                                {lvl}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 3. Academic Degrees */}
                      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-teal-600" /> Academic Credentials & Degrees
                        </h3>
                        {(!profile?.education || profile.education.length === 0) ? (
                          <p className="text-slate-400 italic">No degrees listed</p>
                        ) : (
                          <div className="space-y-2">
                            {profile.education.map((edu: any, idx: number) => (
                              <div key={idx} className="p-2.5 bg-white rounded-lg border border-stone-200 text-slate-700">
                                <p className="font-bold text-slate-900">{edu.degree} · {edu.institution}</p>
                                <p className="text-[11px] text-slate-500">
                                  {edu.department && `Dept: ${edu.department} | `}
                                  {edu.passingYear && `Year: ${edu.passingYear} | `}
                                  {edu.result && `Honors: ${edu.result}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 4. Identity Verification Documents */}
                      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Government Identity Document Review
                        </h3>
                        <p className="text-slate-600">
                          Government ID / NID: <strong className="font-mono text-slate-900">{profile?.nidNumber || "None submitted"}</strong>
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Front Document */}
                          <div className="p-3 bg-white rounded-xl border border-stone-200 text-center space-y-2">
                            <p className="font-semibold text-slate-700">Front ID Scan</p>
                            {profile?.nidFrontUrl ? (
                              <div className="space-y-2">
                                <div className="h-36 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={profile.nidFrontUrl}
                                    alt="Front ID"
                                    className="max-h-full max-w-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                  <FileText className="w-8 h-8 text-slate-400" />
                                </div>
                                <a
                                  href={profile.nidFrontUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:underline font-semibold"
                                >
                                  <ExternalLink className="w-3 h-3" /> View Original Scan
                                </a>
                              </div>
                            ) : (
                              <p className="text-red-500 italic py-6">No front ID uploaded</p>
                            )}
                          </div>

                          {/* Back Document */}
                          <div className="p-3 bg-white rounded-xl border border-stone-200 text-center space-y-2">
                            <p className="font-semibold text-slate-700">Back ID Scan</p>
                            {profile?.nidBackUrl ? (
                              <div className="space-y-2">
                                <div className="h-36 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={profile.nidBackUrl}
                                    alt="Back ID"
                                    className="max-h-full max-w-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                  <FileText className="w-8 h-8 text-slate-400" />
                                </div>
                                <a
                                  href={profile.nidBackUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:underline font-semibold"
                                >
                                  <ExternalLink className="w-3 h-3" /> View Original Scan
                                </a>
                              </div>
                            ) : (
                              <p className="text-slate-400 italic py-6">No back ID uploaded</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 5. Verification Audit Timeline */}
                      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-teal-600" /> Verification Audit Log History
                        </h3>
                        {(!auditLogs || auditLogs.length === 0) ? (
                          <p className="text-slate-400 italic">No previous verification logs</p>
                        ) : (
                          <div className="space-y-1.5">
                            {auditLogs.map((log: any, idx: number) => (
                              <div key={log._id || idx} className="p-2.5 bg-white rounded-lg border border-stone-200 flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                                    {log.action?.replace("_", " ") || "LOG"}
                                  </span>
                                  {log.reason && (
                                    <p className="text-[11px] text-slate-600 mt-0.5 italic">"{log.reason}"</p>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {new Date(log.timestamp || log._creationTime || Date.now()).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 border-t border-stone-200 bg-stone-50/50 flex flex-wrap items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTeacherUserId(null)}
                    className="text-xs border-stone-200"
                  >
                    Close Dossier
                  </Button>

                  {profile?.name && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedAppForAction({
                            teacherId: profile.userId || activeTeacherUserId,
                            name: profile.name || "Teacher",
                            action: "approve",
                          });
                          setActiveTeacherUserId(null);
                        }}
                        className="text-xs bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAppForAction({
                            teacherId: profile.userId || activeTeacherUserId,
                            name: profile.name || "Teacher",
                            action: "changes",
                          });
                          setActiveTeacherUserId(null);
                        }}
                        className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Request Changes
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAppForAction({
                            teacherId: profile.userId || activeTeacherUserId,
                            name: profile.name || "Teacher",
                            action: "reject",
                          });
                          setActiveTeacherUserId(null);
                        }}
                        className="text-xs border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Diagnostics & Error Tracking Console Modal */}
      <ErrorLogsViewerModal
        isOpen={isErrorLogsOpen}
        onClose={() => setIsErrorLogsOpen(false)}
      />

      {/* Admin Contact Inquiries Modal */}
      <AdminContactInquiriesModal
        open={isInquiriesOpen}
        onOpenChange={setIsInquiriesOpen}
      />
    </div>
  );
}
