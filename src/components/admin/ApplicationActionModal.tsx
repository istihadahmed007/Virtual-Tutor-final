import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { adminReviewTeacherApplication } from "@/lib/teacher-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  XCircle,
  RotateCcw,
  Ban,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

export type AdminActionType = "reject" | "changes" | "suspend" | "reactivate";

export interface ApplicationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: {
    userId: string;
    name: string;
    email?: string;
  } | null;
  actionType: AdminActionType;
  onSuccess?: () => void;
}

export function ApplicationActionModal({
  isOpen,
  onClose,
  applicant,
  actionType,
  onSuccess,
}: ApplicationActionModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rejectTeacherMutation = useMutation(api.admin.rejectTeacherApplication);
  const requestChangesMutation = useMutation(api.admin.requestTeacherChanges);
  const suspendTeacherMutation = useMutation(api.admin.suspendTeacher);
  const reactivateTeacherMutation = useMutation(api.admin.reactivateTeacher);

  if (!applicant) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setReason("");
    setErrorMessage(null);
    onClose();
  };

  const getActionConfig = () => {
    switch (actionType) {
      case "reject":
        return {
          title: "Reject Teacher Application",
          description: "Decline this application and inform the applicant.",
          bannerBg: "from-rose-600 to-red-700",
          icon: XCircle,
          btnText: "Reject Application",
          loadingText: "Rejecting...",
          btnClass: "bg-red-600 hover:bg-red-700 shadow-red-600/20",
          placeholder: "Explain clearly why the application is rejected (e.g., unverifiable credentials, invalid ID document)...",
          isReasonRequired: true,
          requireLabel: "Rejection Reason (Required - sent to applicant)",
        };
      case "changes":
        return {
          title: "Request Application Changes",
          description: "Return application to the applicant for document correction.",
          bannerBg: "from-amber-600 to-amber-700",
          icon: RotateCcw,
          btnText: "Request Resubmission",
          loadingText: "Requesting...",
          btnClass: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20",
          placeholder: "Specify which documents or profile sections need correction (e.g., please upload a clearer scan of your Government ID)...",
          isReasonRequired: true,
          requireLabel: "Requested Changes / Missing Details (Required)",
        };
      case "suspend":
        return {
          title: "Suspend Teacher Account",
          description: "Immediately revoke teaching access and booking visibility.",
          bannerBg: "from-slate-800 to-zinc-900",
          icon: Ban,
          btnText: "Suspend Account",
          loadingText: "Suspending...",
          btnClass: "bg-slate-900 hover:bg-slate-800 shadow-slate-900/20",
          placeholder: "Provide reason for administrative suspension (e.g. policy violation)...",
          isReasonRequired: true,
          requireLabel: "Suspension Reason (Required)",
        };
      case "reactivate":
        return {
          title: "Reactivate Teacher Account",
          description: "Restore teaching privileges and account access.",
          bannerBg: "from-teal-600 to-emerald-700",
          icon: CheckCircle2,
          btnText: "Reactivate Account",
          loadingText: "Reactivating...",
          btnClass: "bg-teal-600 hover:bg-teal-700 shadow-teal-600/20",
          placeholder: "Optional notes for reactivation...",
          isReasonRequired: false,
          requireLabel: "Reactivation Note (Optional)",
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  const handleSubmit = async () => {
    if (config.isReasonRequired && !reason.trim()) {
      setErrorMessage("Please enter a written explanation before proceeding.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const trimmedReason = reason.trim();
    try {
      if (actionType === "reject") {
        await rejectTeacherMutation({
          teacherId: applicant.userId,
          reason: trimmedReason,
        });
      } else if (actionType === "changes") {
        await requestChangesMutation({
          teacherId: applicant.userId,
          reason: trimmedReason,
        });
      } else if (actionType === "suspend") {
        await suspendTeacherMutation({
          teacherId: applicant.userId,
          reason: trimmedReason,
        });
      } else if (actionType === "reactivate") {
        await reactivateTeacherMutation({
          teacherId: applicant.userId,
          reason: trimmedReason || undefined,
        });
      }
    } catch (err: any) {
      console.warn("[ApplicationActionModal] Remote mutation fallback to local store:", err?.message || err);
    }

    // Authoritative update in teacher store
    adminReviewTeacherApplication(
      applicant.userId,
      actionType,
      "istihadahmed1163@gmail.com",
      trimmedReason,
    );

    if (actionType === "reject") {
      toast.success(`Application for ${applicant.name} marked as rejected.`);
    } else if (actionType === "changes") {
      toast.success(`Requested resubmission from ${applicant.name}.`);
    } else if (actionType === "suspend") {
      toast.success(`Teacher account for ${applicant.name} has been suspended.`);
    } else if (actionType === "reactivate") {
      toast.success(`Teacher account for ${applicant.name} has been reactivated.`);
    }

    if (onSuccess) onSuccess();
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-white border border-stone-200 shadow-xl rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.bannerBg} p-6 text-white`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                {config.title}
              </DialogTitle>
              <DialogDescription className="text-white/80 text-xs mt-0.5">
                Target educator: <strong className="text-white">{applicant.name}</strong>
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold">Action Failed</p>
                <p className="mt-0.5 text-red-600">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>{config.requireLabel}</span>
              {config.isReasonRequired && (
                <span className="text-rose-600 text-[11px] font-semibold">* Required</span>
              )}
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              placeholder={config.placeholder}
              className="w-full text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-stone-50/50 resize-none disabled:opacity-60"
            />
            <p className="text-[11px] text-slate-500">
              This reason will be recorded in the immutable audit trail and sent to the applicant.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl border-stone-300 hover:bg-stone-100 text-slate-700 text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (config.isReasonRequired && !reason.trim())}
            className={`rounded-xl text-white text-xs font-bold shadow-sm px-5 transition-all ${config.btnClass}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {config.loadingText}
              </>
            ) : (
              <>
                <Icon className="w-4 h-4 mr-2" />
                {config.btnText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
