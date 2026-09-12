import { useState } from "react";
import { useAdminTeachers } from "@/hooks/use-admin-data";
import {
  GraduationCap,
  Search,
  Star,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeacherDetailDrawer } from "@/components/admin/TeacherDetailDrawer";
import { ConfirmApplicationModal } from "@/components/admin/ConfirmApplicationModal";
import { ApplicationActionModal, AdminActionType } from "@/components/admin/ApplicationActionModal";

export default function AdminTeachersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const teachers = useAdminTeachers({
    verificationStatus: statusFilter !== "all" ? statusFilter : undefined,
    searchQuery: searchQuery.trim() || undefined,
  });

  const [inspectTeacherId, setInspectTeacherId] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [actionModalType, setActionModalType] = useState<AdminActionType | null>(null);

  const handleOpenConfirm = (t: any) => {
    setSelectedApplicant({
      userId: t.userId,
      name: t.name,
      email: t.userEmail,
      title: t.title,
      subjects: t.subjects,
      hourlyRate: t.hourlyRate,
      nidNumber: t.nidNumber,
      verificationStatus: t.verificationStatus,
      profileCompletionPct: t.profileCompletionPct,
    });
    setIsConfirmModalOpen(true);
  };

  const handleOpenAction = (t: any, type: AdminActionType) => {
    setSelectedApplicant({
      userId: t.userId,
      name: t.name,
      email: t.userEmail,
    });
    setActionModalType(type);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Educator & Teacher Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse all verified and pending educators, inspect academic performance, hourly rates, and manage teacher profiles.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search educator name, subject, title..."
            className="pl-9 text-xs rounded-xl bg-stone-50 border-stone-200"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["all", "verified", "under_review", "needs_attention", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border ${
              statusFilter === s
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white text-slate-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Teachers Grid */}
      {!teachers ? (
        <div className="bg-white p-16 rounded-2xl border border-stone-200 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          <p className="text-xs font-medium">Loading educator roster...</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-slate-500 text-xs">
          No educators found matching criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teachers.map((t: any) => {
            const isVerified = t.verificationStatus === "verified" || t.isVerified;
            const isSuspended = t.userAccountStatus === "suspended";

            return (
              <div
                key={t.userId}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center font-bold text-slate-700 shrink-0">
                        {t.avatarUrl ? (
                          <img src={t.avatarUrl} alt={t.name} className="w-full h-full object-cover" />
                        ) : (
                          t.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{t.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-1">{t.title || "Educator"}</p>
                      </div>
                    </div>

                    {isVerified ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        Verified
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        {t.verificationStatus}
                      </span>
                    )}
                  </div>

                  {/* Bio snippet */}
                  <p className="text-xs text-slate-600 line-clamp-2 mt-3 leading-relaxed">
                    {t.bio || "No bio entered."}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {(t.subjects || []).slice(0, 3).map((sub: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-stone-100 text-slate-700 text-[10px] font-medium">
                        {sub}
                      </span>
                    ))}
                    {(t.subjects || []).length > 3 && (
                      <span className="text-[10px] text-slate-400 self-center">
                        +{t.subjects.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics & Actions */}
                <div className="pt-3 border-t border-stone-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-bold text-slate-900">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {t.rating || 5.0} ({t.reviewCount || 0})
                    </span>
                    <span>
                      ৳{((t.monthlyTuition && t.monthlyTuition > 0) ? t.monthlyTuition : ((t.hourlyRate || 0) >= 500 ? t.hourlyRate : (t.hourlyRate || 35) * 100)).toLocaleString()}/mo
                    </span>
                    <span>{t.totalStudents || 0} Students</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectTeacherId(t.userId)}
                      className="flex-1 text-xs font-semibold rounded-xl border-stone-200"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Dossier
                    </Button>
                    {!isVerified ? (
                      <Button
                        size="sm"
                        onClick={() => handleOpenConfirm(t)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                      >
                        Confirm
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAction(t, isSuspended ? "reactivate" : "suspend")}
                        className={`text-xs font-semibold rounded-xl ${
                          isSuspended ? "text-teal-700 border-teal-200" : "text-red-700 border-red-200"
                        }`}
                      >
                        {isSuspended ? "Reactivate" : "Suspend"}
                      </Button>
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
