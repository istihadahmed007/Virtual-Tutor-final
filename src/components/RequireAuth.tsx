import { useAuth } from "@/hooks/use-auth";
import { getActiveSession } from "@/lib/auth-store";
import { authLogger, maskEmail } from "@/lib/auth-handshake-logger";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  // Resilient multi-tier check: if isAuthenticated is not yet populated or state is synchronizing,
  // consult multi-tier session storage directly to prevent premature mobile redirects
  const activeSession = getActiveSession();
  const hasActiveSession = isAuthenticated || Boolean(activeSession);

  if (!hasActiveSession) {
    const returnTo = `${location.pathname}${location.search}`;
    authLogger.warn("RequireAuth:RedirectToLogin", `Unauthenticated access to "${location.pathname}", bouncing to login`, {
      path: location.pathname,
      hasUserInHook: Boolean(user),
      hasActiveSessionInStorage: Boolean(activeSession),
      returnTo,
    });
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  return children;
}
