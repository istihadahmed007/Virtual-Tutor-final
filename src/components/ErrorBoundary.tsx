import React, { Component, ErrorInfo, ReactNode } from "react";
import { errorTracker } from "@/lib/error-tracker";
import { getActiveSession } from "@/lib/auth-store";
import {
  AlertTriangle,
  RotateCcw,
  Home,
  LayoutDashboard,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  WifiOff,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error | null; resetError: () => void }) => ReactNode);
  name?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  isReported: boolean;
  isRetrying: boolean;
  showDetails: boolean;
  copiedId: boolean;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: null,
    isReported: false,
    isRetrying: false,
    showDetails: false,
    copiedId: false,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      isRetrying: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    const isChunkLoadError =
      error?.message?.toLowerCase().includes("dynamically imported module") ||
      error?.message?.toLowerCase().includes("failed to fetch dynamically imported module") ||
      error?.message?.toLowerCase().includes("loading chunk");

    // Seamless auto-recovery for dynamic module load errors (e.g. after deployment or dev server restart)
    if (isChunkLoadError && typeof window !== "undefined") {
      const lastChunkReload = sessionStorage.getItem("last_chunk_reload");
      const now = Date.now();
      if (!lastChunkReload || now - parseInt(lastChunkReload, 10) > 10000) {
        sessionStorage.setItem("last_chunk_reload", now.toString());
        window.location.reload();
        return;
      }
    }

    // Track rendering / chunk loading error in diagnostic trackers
    errorTracker
      .captureException(error, {
        category: "render",
        level: "fatal",
        componentStack: errorInfo.componentStack || undefined,
        meta: {
          boundaryName: this.props.name || "RootErrorBoundary",
          location: typeof window !== "undefined" ? window.location.href : "unknown",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        },
      })
      .then((errorId) => {
        if (errorId) {
          this.setState({ errorId, isReported: true });
        }
      })
      .catch((err) => {
        console.warn("[ErrorBoundary] Failed to log error exception:", err);
      });
  }

  /**
   * Resets the error boundary state and re-attempts component rendering.
   * If retry count exceeds 1 or is a chunk load error, safely performs a soft cache refresh.
   */
  public handleRetry = () => {
    this.setState((prev) => ({ isRetrying: true, retryCount: prev.retryCount + 1 }));

    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.warn("[ErrorBoundary] Custom onReset handler error:", e);
      }
    }

    setTimeout(() => {
      const isChunkLoadError =
        this.state.error?.message?.toLowerCase().includes("dynamically imported module") ||
        this.state.error?.message?.toLowerCase().includes("failed to fetch dynamically imported module") ||
        this.state.error?.message?.toLowerCase().includes("loading chunk");

      if (isChunkLoadError || this.state.retryCount >= 2) {
        // Module chunk mismatch or repeated failures: reload window cleanly
        window.location.reload();
      } else {
        // Attempt clean React tree recovery without full browser reload first
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isRetrying: false,
        });
      }
    }, 300);
  };

  /**
   * Navigates the user back to their relevant dashboard based on active auth role.
   */
  private handleGoToDashboard = () => {
    try {
      const activeSession = getActiveSession();
      if (activeSession?.role === "teacher") {
        window.location.href = "/teacher-dashboard";
      } else if (activeSession?.role === "admin") {
        window.location.href = "/admin/teacher-applications";
      } else if (activeSession) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/auth";
      }
    } catch {
      window.location.href = "/dashboard";
    }
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleCopyErrorId = () => {
    const idToCopy = this.state.errorId || `ERR-${Date.now().toString(36).toUpperCase()}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(idToCopy);
      this.setState({ copiedId: true });
      setTimeout(() => this.setState({ copiedId: false }), 2000);
    }
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.handleRetry,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const activeSession = getActiveSession();
      const isChunkLoadError =
        this.state.error?.message?.toLowerCase().includes("dynamically imported module") ||
        this.state.error?.message?.toLowerCase().includes("failed to fetch dynamically imported module") ||
        this.state.error?.message?.toLowerCase().includes("loading chunk");
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

      const dashboardLabel =
        activeSession?.role === "teacher"
          ? "Teacher Dashboard"
          : activeSession?.role === "admin"
          ? "Admin Console"
          : activeSession
          ? "My Dashboard"
          : "Sign In";

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] text-slate-900 p-4 sm:p-6 select-none font-sans">
          <div className="max-w-lg w-full bg-white border border-stone-200/90 shadow-xl shadow-stone-200/50 rounded-2xl p-6 sm:p-8 text-center transition-all animate-in fade-in duration-300">
            {/* Status Icon */}
            <div className="relative mx-auto mb-5 w-14 h-14 rounded-2xl bg-gradient-to-b from-rose-50 to-rose-100/70 border border-rose-200/80 flex items-center justify-center shadow-xs">
              {isOffline ? (
                <WifiOff className="w-7 h-7 text-rose-600" />
              ) : (
                <AlertTriangle className="w-7 h-7 text-rose-600" />
              )}
            </div>

            {/* Error Heading & Description */}
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {isOffline
                ? "Connection Interrupted"
                : isChunkLoadError
                ? "Page Update Available"
                : "Unable to Load Page"}
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              {isOffline
                ? "Your device appears to be offline. Please check your internet connection and try again."
                : isChunkLoadError
                ? "A new version of this page has been deployed. Retrying will refresh the latest application assets."
                : "We encountered an unexpected issue while loading this view. You can retry the operation or return to your dashboard."}
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button
                id="error-boundary-retry-btn"
                onClick={this.handleRetry}
                disabled={this.state.isRetrying}
                className="flex-1 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-sm font-semibold h-11 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw
                  className={`w-4 h-4 ${this.state.isRetrying ? "animate-spin" : ""}`}
                />
                {this.state.isRetrying ? "Retrying..." : "Retry Loading"}
              </Button>

              <Button
                id="error-boundary-dashboard-btn"
                onClick={this.handleGoToDashboard}
                variant="outline"
                className="flex-1 border-stone-200 hover:bg-stone-50 active:bg-stone-100 text-slate-800 text-sm font-medium h-11 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-slate-600" />
                {dashboardLabel}
              </Button>
            </div>

            {/* Secondary Home link */}
            <div className="mt-3 flex items-center justify-center">
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors py-1.5 px-3 rounded-lg hover:bg-stone-100 font-medium cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                Return to Homepage
              </button>
            </div>

            {/* Diagnostic Box / Expandable Details */}
            <div className="mt-6 pt-5 border-t border-stone-100 text-left">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  Technical Diagnostic Details
                </span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-2.5 p-3.5 bg-stone-50/80 border border-stone-200/80 rounded-xl space-y-2 text-xs font-mono">
                  {this.state.error && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                        Exception
                      </span>
                      <p className="text-rose-700 font-medium break-all whitespace-pre-wrap leading-relaxed">
                        {this.state.error.message || "Unknown error occurred during rendering."}
                      </p>
                    </div>
                  )}

                  {this.state.errorId ? (
                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          Incident Reference
                        </span>
                        <span className="text-[11px] text-slate-700 font-medium select-all">
                          {this.state.errorId}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={this.handleCopyErrorId}
                        className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-stone-200/60"
                      >
                        {this.state.copiedId ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy ID
                          </>
                        )}
                      </Button>
                    </div>
                  ) : null}

                  {this.state.isReported && (
                    <div className="pt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium font-sans">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Incident automatically reported to telemetry service</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

