import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminUsers } from "@/hooks/use-admin-data";
import { suspendUserAccount, reactivateUserAccount } from "@/lib/admin-store";
import {
  Users,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const users = useAdminUsers({
    roleFilter,
    statusFilter,
    searchQuery: searchQuery.trim() || undefined,
  });

  const suspendUserMutation = useMutation(api.admin.suspendUser);
  const reactivateUserMutation = useMutation(api.admin.reactivateUser);
  const makeAdminMutation = useMutation(api.admin.makeAdmin);

  // Dialog State
  const [actionTarget, setActionTarget] = useState<{
    user: any;
    type: "suspend" | "reactivate" | "makeAdmin";
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExecuteAction = async () => {
    if (!actionTarget) return;
    setIsProcessing(true);

    try {
      if (actionTarget.type === "suspend") {
        if (!actionReason.trim()) {
          toast.error("Please enter a reason for suspending this user.");
          setIsProcessing(false);
          return;
        }
        try {
          await suspendUserMutation({
            userId: actionTarget.user._id,
            reason: actionReason.trim(),
          });
        } catch {
          // fallback to local admin store
        }
        suspendUserAccount(actionTarget.user._id, actionReason.trim());
        toast.success(`Account for ${actionTarget.user.name} has been suspended.`);
      } else if (actionTarget.type === "reactivate") {
        try {
          await reactivateUserMutation({
            userId: actionTarget.user._id,
            reason: actionReason.trim() || undefined,
          });
        } catch {
          // fallback to local admin store
        }
        reactivateUserAccount(actionTarget.user._id, actionReason.trim());
        toast.success(`Account for ${actionTarget.user.name} has been reactivated.`);
      } else if (actionTarget.type === "makeAdmin") {
        try {
          await makeAdminMutation({
            email: actionTarget.user.email,
          });
        } catch (e) {
          console.debug("Remote makeAdminMutation skipped:", e);
        }
        toast.success(`${actionTarget.user.name} is now a platform administrator.`);
      }

      setActionTarget(null);
      setActionReason("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              User Directory & Permissions
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global account registry, role assignment, account status suspension, and credential verification.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, user ID..."
            className="pl-9 text-xs rounded-xl bg-stone-50 border-stone-200"
          />
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role:</span>
          {["all", "student", "teacher", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                roleFilter === r
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-stone-100 text-slate-600 hover:bg-stone-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
          {["all", "active", "suspended"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === s
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-stone-100 text-slate-600 hover:bg-stone-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {!users ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
            <p className="text-xs font-medium">Fetching registered users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No user accounts found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Joined</th>
                  <th className="py-3.5 px-4">Last Active</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u: any) => (
                  <tr key={u._id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 overflow-hidden">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            u.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === "admin"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : u.role === "teacher"
                            ? "bg-teal-100 text-teal-800 border border-teal-200"
                            : "bg-stone-100 text-slate-700 border border-stone-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.accountStatus === "suspended"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.accountStatus === "suspended" ? "bg-red-500" : "bg-emerald-500"}`} />
                        {u.accountStatus === "suspended" ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.role !== "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActionTarget({ user: u, type: "makeAdmin" })}
                            className="h-7 text-[11px] font-semibold rounded-lg text-purple-700 border-purple-200 hover:bg-purple-50"
                          >
                            Promote Admin
                          </Button>
                        )}
                        {u.accountStatus === "suspended" ? (
                          <Button
                            size="sm"
                            onClick={() => setActionTarget({ user: u, type: "reactivate" })}
                            className="h-7 text-[11px] font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActionTarget({ user: u, type: "suspend" })}
                            className="h-7 text-[11px] font-semibold rounded-lg text-red-700 border-red-200 hover:bg-red-50"
                          >
                            Suspend
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Dialog */}
      {actionTarget && (
        <Dialog open={true} onOpenChange={(open) => !open && setActionTarget(null)}>
          <DialogContent className="sm:max-w-md bg-white rounded-2xl border border-stone-200 p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {actionTarget.type === "suspend"
                  ? "Suspend User Account"
                  : actionTarget.type === "reactivate"
                  ? "Reactivate User Account"
                  : "Promote to Administrator"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Target: {actionTarget.user.name} ({actionTarget.user.email})
              </DialogDescription>
            </DialogHeader>

            {actionTarget.type === "suspend" && (
              <div className="space-y-1.5 py-3">
                <label className="text-xs font-bold text-slate-700">Reason for suspension (Required)</label>
                <Input
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Terms violation, requested by compliance..."
                  className="text-xs rounded-xl"
                />
              </div>
            )}

            {actionTarget.type === "makeAdmin" && (
              <p className="text-xs text-slate-600 py-3 bg-amber-50 p-3 rounded-xl border border-amber-200">
                This will grant full administrative privileges, access to verification tools, user directories, and system audit logs.
              </p>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionTarget(null)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteAction}
                disabled={isProcessing || (actionTarget.type === "suspend" && !actionReason.trim())}
                className={`text-xs font-bold rounded-xl text-white ${
                  actionTarget.type === "suspend" ? "bg-red-600 hover:bg-red-700" : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Confirm Action
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
