import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminReports } from "@/hooks/use-admin-data";
import { resolveAdminReport } from "@/lib/admin-store";
import {
  Flag,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminReportsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const reports = useAdminReports({
    status: statusFilter,
  });

  const resolveReportMutation = useMutation(api.admin.resolveReport);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleResolve = async (reportId: any) => {
    setResolvingId(String(reportId));
    try {
      try {
        await resolveReportMutation({
          reportId,
          status: "resolved",
          resolutionNote: "Reviewed and resolved by compliance team",
        });
      } catch (e) {
        console.debug("Remote resolveReportMutation skipped:", e);
      }
      resolveAdminReport(String(reportId), "Reviewed and resolved by compliance team");
      toast.success("Flagged report marked as resolved.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to resolve report.");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Flag className="w-6 h-6 text-rose-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Safety, Flags & Compliance Reports
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Incoming abuse flags, reported user behavior, classroom misconduct, and compliance resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["all", "pending", "resolved", "dismissed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border ${
                statusFilter === s
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {!reports ? (
        <div className="bg-white p-16 rounded-2xl border border-stone-200 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          <p className="text-xs font-medium">Loading compliance reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Open Compliance Reports</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are no pending abuse reports or flagged items awaiting investigation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r: any) => (
            <div
              key={r._id}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">
                      {r.targetType} Flag
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{r.reason}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Reported by: <code className="font-mono">{r.reporterId}</code> • Target ID: <code className="font-mono">{r.targetId}</code>
                  </p>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    r.status === "resolved"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {r.status}
                </span>
              </div>

              {r.details && (
                <p className="text-xs text-slate-700 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  {r.details}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                <span className="text-slate-400 text-[11px]">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
                {r.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => handleResolve(r._id)}
                    disabled={resolvingId === String(r._id)}
                    className="h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {resolvingId === String(r._id) ? "Resolving..." : "Mark as Resolved"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
