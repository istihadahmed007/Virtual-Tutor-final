import { useState } from "react";
import { useAdminApplications } from "@/hooks/use-admin-data";
import {
  ShieldCheck,
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmApplicationModal } from "@/components/admin/ConfirmApplicationModal";
import { ApplicationActionModal, AdminActionType } from "@/components/admin/ApplicationActionModal";
import { TeacherDetailDrawer } from "@/components/admin/TeacherDetailDrawer";

export default function AdminVerificationPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const applications = useAdminApplications({
    status: "under_review",
    searchQuery: searchQuery.trim() || undefined,
  });

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
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Identity & Document Verification Queue
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visual inspection queue for government identification, National IDs, passports, and certifications.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by NID number, name, email..."
            className="pl-9 text-xs rounded-xl bg-stone-50 border-stone-200"
          />
        </div>
      </div>

      {!applications ? (
        <div className="bg-white p-16 rounded-2xl border border-stone-200 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          <p className="text-xs font-medium">Loading verification queue...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Verification Queue is Clear</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All submitted government identification documents have been reviewed and resolved.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {applications.map((app: any) => (
            <div
              key={app.userId}
              className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-5 border-b border-stone-100 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{app.name}</h3>
                  <p className="text-xs text-slate-500">{app.title || "Educator"} • {app.userEmail}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  Needs Review
                </span>
              </div>

              {/* Document Scans & Data */}
              <div className="p-5 space-y-4">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Document Number</span>
                    <strong className="font-mono text-slate-900">{app.nidNumber || "Not recorded"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Submission Date</span>
                    <span className="text-slate-700">
                      {app.nidSubmittedAt ? new Date(app.nidSubmittedAt).toLocaleDateString() : "Recent"}
                    </span>
                  </div>
                </div>

                {/* ID Images side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50 flex flex-col">
                    <div className="px-2.5 py-1.5 bg-stone-100 border-b border-stone-200 text-[11px] font-bold text-slate-700 flex justify-between items-center">
                      <span>Front ID</span>
                      {app.nidFrontUrl && (
                        <a
                          href={app.nidFrontUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-600 hover:text-teal-700"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="p-2 flex-1 flex items-center justify-center min-h-[120px]">
                      {app.nidFrontUrl ? (
                        <img
                          src={app.nidFrontUrl}
                          alt="ID Front"
                          className="max-h-28 object-contain rounded"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No image</span>
                      )}
                    </div>
                  </div>

                  <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50 flex flex-col">
                    <div className="px-2.5 py-1.5 bg-stone-100 border-b border-stone-200 text-[11px] font-bold text-slate-700 flex justify-between items-center">
                      <span>Back ID</span>
                      {app.nidBackUrl && (
                        <a
                          href={app.nidBackUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-600 hover:text-teal-700"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="p-2 flex-1 flex items-center justify-center min-h-[120px]">
                      {app.nidBackUrl ? (
                        <img
                          src={app.nidBackUrl}
                          alt="ID Back"
                          className="max-h-28 object-contain rounded"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Not required / single-sided</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectTeacherId(app.userId)}
                  className="text-xs font-semibold rounded-xl"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Inspect Full
                </Button>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAction(app, "changes")}
                    className="border-amber-200 text-amber-800 hover:bg-amber-50 text-xs font-semibold rounded-xl"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Re-request ID
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAction(app, "reject")}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleOpenConfirm(app)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Confirm
                  </Button>
                </div>
              </div>
            </div>
          ))}
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
