import { useState } from "react";
import { useAdminAuditLogs } from "@/hooks/use-admin-data";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  History,
  ShieldCheck,
  ShieldAlert,
  Filter,
  Loader2,
  Lock,
  KeyRound,
  UserCheck,
  AlertTriangle,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminAuditLogsPage() {
  const [activeTab, setActiveTab] = useState<"security" | "operations">("security");
  const limit = 100;
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");

  const adminAuditLogs = useAdminAuditLogs(limit);
  const securityLogs = useQuery(api.admin.getSecurityAuditLogs, {
    limit,
    eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
  });

  const filteredSecurityLogs = (securityLogs || []).filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.email.toLowerCase().includes(q) ||
      (log.reason && log.reason.toLowerCase().includes(q)) ||
      log.eventType.toLowerCase().includes(q)
    );
  });

  const filteredAdminLogs = (adminAuditLogs || []).filter((log: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.targetName && log.targetName.toLowerCase().includes(q)) ||
      (log.adminName && log.adminName.toLowerCase().includes(q)) ||
      (log.reason && log.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Audit & Compliance Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete cryptographic audit trail of authentication handshakes, administrative access attempts, and operational governance events.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200">
          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "security"
                ? "bg-white text-teal-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Security & Auth Trail
            {securityLogs && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-teal-50 text-[10px] text-teal-700 font-bold border border-teal-200">
                {securityLogs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("operations")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "operations"
                ? "bg-white text-teal-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Operations
            {adminAuditLogs && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-stone-100 text-[10px] text-slate-600 font-bold">
                {adminAuditLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={activeTab === "security" ? "Search email, event, or reason..." : "Search action or target..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs border-stone-200"
          />
        </div>

        {activeTab === "security" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Type:
            </span>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Events</option>
              <option value="login_success">Login Success</option>
              <option value="login_failure">Login Failure</option>
              <option value="admin_access_attempt">Admin Access Attempt</option>
              <option value="password_reset_request">Password Reset Request</option>
              <option value="password_reset_success">Password Reset Success</option>
              <option value="registration">Registration</option>
              <option value="role_change">Role Change</option>
            </select>
          </div>
        )}
      </div>

      {/* Content View */}
      {activeTab === "security" ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          {securityLogs === undefined ? (
            <div className="p-16 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
              <p className="text-xs font-medium">Querying immutable security audit logs...</p>
            </div>
          ) : filteredSecurityLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No security events recorded matching your filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Event Type</th>
                    <th className="py-3.5 px-4">User / Email</th>
                    <th className="py-3.5 px-4">Outcome</th>
                    <th className="py-3.5 px-4">Details / Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredSecurityLogs.map((log) => {
                    const isSuccess = log.outcome === "success";
                    return (
                      <tr key={log._id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-900 capitalize">
                            {log.eventType === "admin_access_attempt" && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                            {log.eventType === "login_success" && <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                            {log.eventType === "login_failure" && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                            {log.eventType.includes("password") && <KeyRound className="w-3.5 h-3.5 text-teal-600" />}
                            {log.eventType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{log.email}</p>
                          {log.role && (
                            <span className="text-[10px] text-slate-500 capitalize">Role: {log.role}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isSuccess
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {log.outcome}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {log.reason ? (
                            <span className="bg-stone-100 px-2 py-1 rounded text-[11px] text-slate-700">
                              {log.reason}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No notes</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          {!adminAuditLogs ? (
            <div className="p-16 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
              <p className="text-xs font-medium">Loading operations audit trail...</p>
            </div>
          ) : filteredAdminLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No operational audit records created yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Target User</th>
                    <th className="py-3.5 px-4">Admin Operator</th>
                    <th className="py-3.5 px-4">Justification / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredAdminLogs.map((log: any) => (
                    <tr key={log._id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 capitalize">
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{log.targetName || "Target"}</p>
                        <code className="text-[10px] text-slate-400">{log.targetId}</code>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{log.adminName || "Admin"}</p>
                        <code className="text-[10px] text-slate-400">{log.adminId}</code>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {log.reason ? (
                          <span className="bg-stone-100 px-2 py-1 rounded text-[11px] text-slate-700">
                            {log.reason}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No notes</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
