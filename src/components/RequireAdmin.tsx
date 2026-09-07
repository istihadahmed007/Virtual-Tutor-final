import { useAuth } from "@/hooks/use-auth";
import { getActiveSession, clearActiveSession } from "@/lib/auth-store";
import { authLogger, maskEmail } from "@/lib/auth-handshake-logger";
import { ShieldAlert, ArrowLeft, Loader2, CheckCircle2, Lock, LogIn } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { addSecurityAuditLog } from "@/lib/admin-store";

const SOLE_ADMIN_EMAIL = "istihadahmed1163@gmail.com";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeSession = getActiveSession();
  const effectiveUser = user || activeSession;
  const hasSession = isAuthenticated || Boolean(activeSession);

  const normalizedEmail = effectiveUser?.email ? effectiveUser.email.toLowerCase().trim() : "";
  const isAuthorizedEmail = normalizedEmail === SOLE_ADMIN_EMAIL;

  // Server-side admin verification query: strictly validated on backend against AUTHORIZED_ADMIN_EMAIL
  const adminCheck = useQuery(
    api.admin.checkIsAdmin,
    effectiveUser?.email ? {} : "skip",
  );

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="size-6 animate-spin text-teal-600" />
      </main>
    );
  }

  // 1. Authenticated check
  if (!hasSession) {
    const returnTo = `${location.pathname}${location.search}`;
    authLogger.warn("RequireAdmin:NoSession", `Unauthenticated attempt to access admin route "${location.pathname}"`, {
      path: location.pathname,
      returnTo,
    });
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  // 2. Suspended account check
  if (effectiveUser?.accountStatus === "suspended") {
    authLogger.warn("RequireAdmin:Suspended", "Suspended user tried accessing admin route", {
      userId: effectiveUser._id,
      maskedEmail: maskEmail(effectiveUser.email),
    });
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Account Suspended</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your account has been suspended by platform administration. Please contact support if you believe this is an error.
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white"
          >
            Return to Sign In
          </Button>
        </div>
      </div>
    );
  }

  // 3. Email allowlist check: normalized email MUST equal istihadahmed1163@gmail.com
  if (!isAuthorizedEmail) {
    authLogger.warn("RequireAdmin:Forbidden", `User lacks admin privilege for route "${location.pathname}"`, {
      path: location.pathname,
      userRole: effectiveUser?.role,
      maskedEmail: maskEmail(effectiveUser?.email),
    });
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-3 border border-amber-200">
            403 Forbidden
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Administrator Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-4">
            This administrative console is strictly restricted to the designated platform administrator (<span className="font-semibold text-slate-900">{SOLE_ADMIN_EMAIL}</span>).
          </p>
          <div className="bg-stone-50 rounded-xl p-3 mb-6 text-xs text-stone-600 text-left border border-stone-200">
            <div>Signed in as: <span className="font-medium text-stone-900">{effectiveUser?.email || "Unknown"}</span></div>
            <div>Role: <span className="font-medium capitalize text-stone-900">{effectiveUser?.role || "Student"}</span></div>
          </div>
          <div className="space-y-3">
            <Button
              onClick={() => {
                if (effectiveUser?.role === "teacher") {
                  navigate("/teacher-dashboard");
                } else {
                  navigate("/dashboard");
                }
              }}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Your Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearActiveSession();
                signOut?.();
                navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`);
              }}
              className="w-full border-stone-200"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Switch Account (Login as Admin)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Email verification check
  const isEmailVerified = Boolean(
    effectiveUser?.isEmailVerified ||
    (effectiveUser as any)?.emailVerified ||
    (effectiveUser as any)?.emailVerificationTime
  );

  if (!isEmailVerified) {
    authLogger.warn("RequireAdmin:Unverified", `Admin email is unverified on route "${location.pathname}"`, {
      path: location.pathname,
      email: normalizedEmail,
    });
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200 p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-3 border border-amber-200">
            Email Verification Required
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Administrator Verification Needed</h2>
          <p className="text-sm text-slate-600 mb-6">
            You are signed in as <span className="font-semibold text-slate-900">{SOLE_ADMIN_EMAIL}</span>. To protect the platform, administrator privileges remain locked until your email address is verified.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate(`/auth?mode=verify&email=${encodeURIComponent(SOLE_ADMIN_EMAIL)}`)}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Verify Email Address
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="w-full border-stone-200"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Server-side backend authorization status
  if (adminCheck !== undefined && !adminCheck.isAdmin) {
    if (adminCheck.reason === "suspended") {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 text-center shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Account Suspended</h2>
            <p className="text-sm text-slate-600 mb-6">
              Your administrator account is suspended. Please contact platform support.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            >
              Return to Sign In
            </Button>
          </div>
        </div>
      );
    }

    if (adminCheck.reason === "unauthorized_email") {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 text-center shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Server Authorization Denied</h2>
            <p className="text-sm text-slate-600 mb-6">
              The backend session does not match the platform administrator account ({SOLE_ADMIN_EMAIL}). Please log in with the administrator credentials.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => {
                  clearActiveSession();
                  signOut?.();
                  navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`);
                }}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Log In as Administrator
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full border-stone-200"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (adminCheck.reason === "unverified_email") {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200 p-8 text-center shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Email Verification Required</h2>
            <p className="text-sm text-slate-600 mb-6">
              Your administrator email has not completed server-side verification.
            </p>
            <Button
              onClick={() => navigate(`/auth?mode=verify&email=${encodeURIComponent(SOLE_ADMIN_EMAIL)}`)}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              Verify Email Address
            </Button>
          </div>
        </div>
      );
    }
  }

  // Audit trail: Log valid administrative route access
  useEffect(() => {
    if (hasSession && isAuthorizedEmail && isEmailVerified) {
      addSecurityAuditLog({
        eventType: "admin_access_attempt",
        email: SOLE_ADMIN_EMAIL,
        role: "admin",
        outcome: "success",
        reason: `Cryptographic administrative access authorized for "${location.pathname}"`,
      });
    }
  }, [hasSession, isAuthorizedEmail, isEmailVerified, location.pathname]);

  return <>{children}</>;
}
