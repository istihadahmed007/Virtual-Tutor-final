import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bug,
  CheckCircle2,
  Search,
  Trash2,
  RefreshCw,
  Lock,
  Globe,
  Monitor,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { captureAuthError, captureException } from "@/lib/error-tracker";
import { Id } from "@/convex/_generated/dataModel";

interface ErrorLogsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ErrorRecord {
  _id: Id<"frontendErrors">;
  message: string;
  stack?: string;
  componentStack?: string;
  level: "error" | "warn" | "info" | "fatal";
  category?: string;
  route?: string;
  url?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  userAgent?: string;
  context?: string;
  timestamp: number;
  resolved?: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export function ErrorLogsViewerModal({ isOpen, onClose }: ErrorLogsViewerModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<"error" | "warn" | "info" | "fatal" | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const rawLogs = useQuery(api.errorLogs.getErrorLogs, {
    category: selectedCategory === "all" ? undefined : selectedCategory,
    level: selectedLevel,
    search: searchQuery.trim() || undefined,
    limit: 60,
  });
  const errorLogs = rawLogs as ErrorRecord[] | undefined;

  const stats = useQuery(api.errorLogs.getErrorStats);
  const resolveErrorMutation = useMutation(api.errorLogs.resolveErrorLog);
  const clearErrorsMutation = useMutation(api.errorLogs.clearErrorLogs);

  const handleResolve = async (errorId: Id<"frontendErrors">, resolved: boolean) => {
    try {
      await resolveErrorMutation({ errorId, resolved });
      toast.success(resolved ? "Error marked as resolved" : "Error marked as unresolved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update error status");
    }
  };

  const handleClearResolved = async () => {
    try {
      const res = await clearErrorsMutation({ onlyResolved: true });
      toast.success(`Cleared ${res.deletedCount} resolved logs`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear logs");
    }
  };

  const handleTestAuthError = async () => {
    try {
      await captureAuthError("login_password", new Error("Diagnostic Test: Simulated invalid credentials verification failure"), {
        email: "diagnostic-test@example.com",
        attempt: 1,
        testMode: true,
      });
      toast.success("Logged test auth error to Convex error tracker!");
    } catch {
      toast.error("Failed to generate test error");
    }
  };

  const handleTestRenderError = async () => {
    try {
      await captureException(new Error("Diagnostic Test: UI Component failed state reconciliation"), {
        category: "render",
        level: "fatal",
        meta: { testMode: true, component: "TestComponent" },
      });
      toast.success("Logged test render error!");
    } catch {
      toast.error("Failed to generate test error");
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "fatal":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900 text-white uppercase tracking-wider">
            FATAL
          </span>
        );
      case "error":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            ERROR
          </span>
        );
      case "warn":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            WARN
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
            INFO
          </span>
        );
    }
  };

  const getCategoryBadge = (category?: string) => {
    const cat = category || "general";
    if (cat === "auth") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Lock className="w-3 h-3" />
          Auth
        </span>
      );
    }
    if (cat === "render") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Layers className="w-3 h-3" />
          Render
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700">
        <Bug className="w-3 h-3" />
        {cat}
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white rounded-2xl border border-stone-200 shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-stone-200 bg-stone-50/70 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
                <Bug className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  Error & Auth Diagnostics Console
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Real-time frontend error tracking, client crash reports, and auth exception logging
                </DialogDescription>
              </div>
            </div>

            {/* Quick Test Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAuthError}
                className="h-8 text-xs border-stone-200 hover:bg-stone-100"
              >
                <Lock className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Test Auth Error
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestRenderError}
                className="h-8 text-xs border-stone-200 hover:bg-stone-100"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                Test Fatal Error
              </Button>
            </div>
          </div>

          {/* Quick Metrics */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Logs</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{stats.total}</p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <p className="text-[10px] text-indigo-600 uppercase font-semibold">Auth Errors</p>
                <p className="text-base font-bold text-indigo-700 mt-0.5">{stats.authErrors}</p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <p className="text-[10px] text-rose-600 uppercase font-semibold">Fatal Crashes</p>
                <p className="text-base font-bold text-rose-700 mt-0.5">{stats.fatalErrors}</p>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <p className="text-[10px] text-amber-600 uppercase font-semibold">Unresolved</p>
                <p className="text-base font-bold text-amber-700 mt-0.5">{stats.unresolved}</p>
              </div>
            </div>
          )}
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 border-b border-stone-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search error messages, routes, or emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs bg-stone-50 border-stone-200 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 text-xs border border-stone-200 rounded-lg px-2.5 bg-white text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Categories</option>
              <option value="auth">Auth Errors</option>
              <option value="render">Render / UI</option>
              <option value="unhandled_exception">Unhandled Exceptions</option>
              <option value="unhandled_rejection">Promise Rejections</option>
              <option value="network">Network</option>
              <option value="general">General</option>
            </select>

            {/* Level Filter */}
            <select
              value={selectedLevel || ""}
              onChange={(e) => setSelectedLevel((e.target.value || undefined) as "error" | "warn" | "info" | "fatal" | undefined)}
              className="h-9 text-xs border border-stone-200 rounded-lg px-2.5 bg-white text-slate-700 focus:outline-hidden"
            >
              <option value="">All Levels</option>
              <option value="fatal">Fatal</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
            </select>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearResolved}
              className="h-9 text-xs text-slate-500 hover:text-rose-600"
              title="Clear all resolved errors"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear Resolved
            </Button>
          </div>
        </div>

        {/* Logs List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
          {!errorLogs ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading error logs...</span>
            </div>
          ) : errorLogs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-stone-200 p-6">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No error logs recorded</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No exceptions match the current filters. All client and authentication operations are running cleanly.
              </p>
            </div>
          ) : (
            errorLogs.map((log) => {
              const isExpanded = expandedLogId === log._id;
              const dateStr = new Date(log.timestamp).toLocaleString();
              let parsedContext: unknown = null;
              if (log.context) {
                try {
                  parsedContext = JSON.parse(log.context);
                } catch {
                  parsedContext = log.context;
                }
              }

              return (
                <div
                  key={log._id}
                  className={`bg-white rounded-xl border transition-all ${
                    log.resolved
                      ? "border-stone-200 opacity-75"
                      : log.level === "fatal"
                        ? "border-rose-300 shadow-xs"
                        : "border-stone-200 hover:border-stone-300 shadow-2xs"
                  }`}
                >
                  {/* Log Item Header */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                    className="p-3.5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
                      {getLevelBadge(log.level)}
                      {getCategoryBadge(log.category)}
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {log.message}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {dateStr}
                      </span>
                      <Button
                        size="sm"
                        variant={log.resolved ? "ghost" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(log._id, !log.resolved);
                        }}
                        className={`h-7 text-[11px] px-2.5 rounded-md ${
                          log.resolved
                            ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            : "border-stone-200 text-slate-700 hover:bg-stone-100"
                        }`}
                      >
                        {log.resolved ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Resolved
                          </>
                        ) : (
                          "Mark Resolved"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-stone-100 bg-stone-50/40 text-xs space-y-3">
                      {/* Meta Pills */}
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {log.route && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-stone-200 rounded font-mono text-slate-700">
                            <Globe className="w-3 h-3 text-slate-400" />
                            Route: {log.route}
                          </span>
                        )}
                        {log.userEmail && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-stone-200 rounded text-slate-700">
                            User: {log.userEmail} ({log.userRole || "guest"})
                          </span>
                        )}
                        {log.userAgent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-stone-200 rounded text-slate-500 truncate max-w-md">
                            <Monitor className="w-3 h-3 text-slate-400 shrink-0" />
                            {log.userAgent}
                          </span>
                        )}
                      </div>

                      {/* Stack Trace */}
                      {log.stack && (
                        <div>
                          <p className="text-[11px] font-semibold text-slate-700 mb-1">
                            Stack Trace:
                          </p>
                          <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[10.5px] overflow-x-auto max-h-48 leading-relaxed">
                            {log.stack}
                          </pre>
                        </div>
                      )}

                      {/* Component Stack */}
                      {log.componentStack && (
                        <div>
                          <p className="text-[11px] font-semibold text-slate-700 mb-1">
                            React Component Stack:
                          </p>
                          <pre className="p-2.5 bg-slate-800 text-slate-300 rounded-lg font-mono text-[10.5px] overflow-x-auto max-h-36 leading-relaxed">
                            {log.componentStack}
                          </pre>
                        </div>
                      )}

                      {/* Context / Breadcrumbs */}
                      {Boolean(parsedContext) && (
                        <div>
                          <p className="text-[11px] font-semibold text-slate-700 mb-1">
                            Execution Context & Breadcrumbs:
                          </p>
                          <pre className="p-2.5 bg-white border border-stone-200 rounded-lg font-mono text-[10.5px] text-slate-800 overflow-x-auto max-h-44 leading-relaxed">
                            {typeof parsedContext === "object" && parsedContext !== null
                              ? JSON.stringify(parsedContext, null, 2)
                              : String(parsedContext)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Auto-synced with Convex database table <code className="text-teal-700 font-mono">frontendErrors</code>
          </div>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-slate-900 text-white text-xs h-9 px-4 rounded-lg"
          >
            Close Console
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
