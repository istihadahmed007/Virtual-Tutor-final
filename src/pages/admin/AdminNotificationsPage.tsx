import { useAdminAuditLogs } from "@/hooks/use-admin-data";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function AdminNotificationsPage() {
  const auditLogs = useAdminAuditLogs(50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-teal-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Compliance Notifications & System Alerts
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Real-time notification stream for applicant submissions, verification approvals, changes requested, and security alerts.
        </p>
      </div>

      {/* Stream */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50 font-bold text-xs text-slate-800 flex items-center justify-between">
          <span>Application & Compliance Event Stream</span>
          <span className="text-[11px] font-normal text-slate-500">Live WebSockets Connected</span>
        </div>

        {!auditLogs ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
            <p className="text-xs font-medium">Loading notifications...</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No compliance alerts triggered yet.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {auditLogs.map((log: any) => {
              const isApproval = log.action === "approve_application" || log.action === "verify_teacher";
              const isRejection = log.action === "reject_application";
              const isChanges = log.action === "request_changes";
              const isSuspension = log.action.includes("suspend");

              return (
                <div key={log._id} className="p-4 hover:bg-stone-50/70 transition-colors flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                      isApproval
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : isRejection || isSuspension
                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                        : isChanges
                        ? "bg-blue-50 text-blue-600 border border-blue-200"
                        : "bg-teal-50 text-teal-600 border border-teal-200"
                    }`}
                  >
                    {isApproval ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isRejection ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 capitalize">
                        {log.action.replace(/_/g, " ")}: {log.targetName || log.targetId}
                      </p>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {log.reason && (
                      <p className="text-xs text-slate-600 bg-stone-50 p-2 rounded-lg border border-stone-200/80">
                        {log.reason}
                      </p>
                    )}

                    <p className="text-[11px] text-slate-400">
                      Operator: <span className="font-semibold text-slate-600">{log.adminName || log.adminId}</span> • Target ID: <code className="font-mono text-slate-500">{log.targetId}</code>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
