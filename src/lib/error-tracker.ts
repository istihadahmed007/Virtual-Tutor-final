import { ConvexReactClient } from "convex/react";
import { api } from "../convex/_generated/api";

export type ErrorLevel = "error" | "warn" | "info" | "fatal";
export type ErrorCategory =
  | "auth"
  | "network"
  | "render"
  | "unhandled_exception"
  | "unhandled_rejection"
  | "form"
  | "api"
  | "general";

export interface ErrorContext {
  action?: string;
  category?: ErrorCategory;
  level?: ErrorLevel;
  route?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  meta?: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];
  componentStack?: string;
}

export interface Breadcrumb {
  type: "navigation" | "action" | "auth" | "http" | "error";
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

interface UserContext {
  id?: string;
  email?: string;
  role?: string;
}

class ErrorTracker {
  private convexClient: ConvexReactClient | null = null;
  private isInitialized = false;
  private userContext: UserContext = {};
  private breadcrumbs: Breadcrumb[] = [];
  private readonly maxBreadcrumbs = 15;
  private recentErrorHashes = new Map<string, number>();
  private errorCountInCurrentMinute = 0;
  private lastMinuteReset = Date.now();
  private sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

  /**
   * Initialize the error tracker with the Convex client and attach global event listeners.
   */
  public init(convexClient: ConvexReactClient) {
    if (this.isInitialized) return;
    this.convexClient = convexClient;
    this.isInitialized = true;

    // Retrieve cached user context from localStorage if available
    try {
      const cached = localStorage.getItem("virtual_tutor_auth_user");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?._id || parsed?.id) {
          this.userContext = {
            id: parsed._id || parsed.id,
            email: parsed.email,
            role: parsed.role,
          };
        }
      }
    } catch {
      // Ignore JSON parse errors
    }

    // Attach global unhandled window error listener
    window.addEventListener("error", (event: ErrorEvent) => {
      // Ignore benign resize observer, websocket preview errors, JWT_PRIVATE_KEY, or email provider rejection notices
      if (
        event.message?.includes("ResizeObserver") ||
        event.message?.includes("failed to connect to websocket") ||
        event.message?.includes("JWT_PRIVATE_KEY") ||
        event.message?.includes("Resend email delivery") ||
        event.message?.includes("rejected by the provider") ||
        event.message?.includes("vartualtutor.com")
      ) {
        event.preventDefault();
        return;
      }

      this.captureException(event.error || new Error(event.message), {
        category: "unhandled_exception",
        level: "fatal",
        meta: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Attach global unhandled promise rejection listener
    window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
      let error: Error;
      if (event.reason instanceof Error) {
        error = event.reason;
      } else if (typeof event.reason === "string") {
        error = new Error(event.reason);
      } else {
        error = new Error(
          `Unhandled Promise Rejection: ${JSON.stringify(event.reason || "Unknown reason")}`,
        );
      }

      // Ignore benign vite / websocket rejections, JWT_PRIVATE_KEY, or email provider rejection notices
      if (
        error.message?.includes("websocket") ||
        error.message?.includes("HMR") ||
        error.message?.includes("JWT_PRIVATE_KEY") ||
        error.message?.includes("Resend email delivery") ||
        error.message?.includes("rejected by the provider") ||
        error.message?.includes("vartualtutor.com")
      ) {
        event.preventDefault();
        return;
      }

      this.captureException(error, {
        category: "unhandled_rejection",
        level: "error",
      });
    });

    // Add initial breadcrumb
    this.addBreadcrumb({
      type: "navigation",
      message: `App initialized at ${window.location.pathname}`,
    });

    console.info("[ErrorTracker] Global error monitoring active.");
  }

  /**
   * Set or update current active user context for error attribution.
   */
  public setUserContext(user: UserContext | null) {
    if (!user) {
      this.userContext = {};
    } else {
      this.userContext = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }
  }

  /**
   * Add a breadcrumb to the tracking trail.
   */
  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, "timestamp">) {
    const entry: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
    };
    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Capture a generic error / exception and log to Convex and optional Sentry.
   */
  public async captureException(
    error: unknown,
    context?: ErrorContext,
  ): Promise<string | null> {
    const errObj = error instanceof Error ? error : new Error(String(error || "Unknown Error"));
    const message = errObj.message || "Unknown error";
    const stack = errObj.stack;
    const category = context?.category || "general";
    const level = context?.level || "error";
    const currentRoute = context?.route || window.location.pathname;

    // Rate Limiting & Deduplication
    const now = Date.now();
    if (now - this.lastMinuteReset > 60000) {
      this.errorCountInCurrentMinute = 0;
      this.lastMinuteReset = now;
    }
    if (this.errorCountInCurrentMinute >= 20) {
      // Avoid flooding
      return null;
    }
    this.errorCountInCurrentMinute++;

    // Deduplicate identical errors occurring within 10 seconds
    const errorSignature = `${message}::${category}::${currentRoute}`;
    const lastSeen = this.recentErrorHashes.get(errorSignature);
    if (lastSeen && now - lastSeen < 10000) {
      return null;
    }
    this.recentErrorHashes.set(errorSignature, now);

    // Clean up old deduplication cache
    if (this.recentErrorHashes.size > 100) {
      this.recentErrorHashes.clear();
    }

    // Build rich context payload
    const fullContext = {
      action: context?.action,
      url: window.location.href,
      route: currentRoute,
      userAgent: navigator.userAgent,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      meta: context?.meta || {},
      breadcrumbs: [...this.breadcrumbs],
    };

    // Log to browser console with clean formatting
    const isBenignProviderNotice =
      message.includes("Resend email delivery") ||
      message.includes("rejected by the provider") ||
      message.includes("vartualtutor.com");

    if ((level === "fatal" || level === "error") && !isBenignProviderNotice) {
      console.error(`[ErrorTracker:${category}]`, message, {
        error: errObj,
        context: fullContext,
      });
    } else {
      console.warn(`[ErrorTracker:${category}]`, message, fullContext);
    }

    // Forward to Sentry if DSN is configured
    if (this.sentryDsn) {
      this.sendToSentry(errObj, level, category, fullContext);
    }

    // Forward to Convex database table
    if (this.convexClient) {
      try {
        const res = await this.convexClient.mutation(api.errorLogs.logFrontendError, {
          message,
          stack,
          componentStack: context?.componentStack,
          level,
          category,
          route: currentRoute,
          url: window.location.href,
          userId: context?.userId || this.userContext.id,
          userEmail: context?.userEmail || this.userContext.email,
          userRole: context?.userRole || this.userContext.role,
          userAgent: navigator.userAgent,
          context: JSON.stringify(fullContext),
        });
        return res?.errorId ? String(res.errorId) : null;
      } catch (logErr) {
        console.warn("[ErrorTracker] Failed to persist error log to Convex:", logErr);
      }
    }

    return null;
  }

  /**
   * Specialized Auth error tracker for debugging login, OTP, registration, and session issues.
   */
  public captureAuthError(
    action:
      | "login_password"
      | "login_otp"
      | "register_password"
      | "register_otp"
      | "verify_otp"
      | "password_reset"
      | "session_sync"
      | "recaptcha"
      | "role_switch",
    error: unknown,
    meta?: Record<string, unknown>,
  ) {
    this.addBreadcrumb({
      type: "auth",
      message: `Auth operation notice: ${action}`,
      data: meta,
    });

    return this.captureException(error, {
      category: "auth",
      action,
      level: "warn",
      meta: {
        ...meta,
        action,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Capture a manual log message with severity.
   */
  public captureMessage(
    message: string,
    level: ErrorLevel = "info",
    context?: ErrorContext,
  ) {
    return this.captureException(new Error(message), {
      ...context,
      level,
      category: context?.category || "general",
    });
  }

  /**
   * Optional Sentry Ingestion Dispatcher via HTTP envelope without heavyweight SDK requirement.
   */
  private sendToSentry(
    error: Error,
    level: ErrorLevel,
    category: string,
    context: Record<string, unknown>,
  ) {
    try {
      if (!this.sentryDsn) return;
      const dsnMatch = this.sentryDsn.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
      if (!dsnMatch) return;
      const [, publicKey, host, projectId] = dsnMatch;
      const envelopeUrl = `https://${host}/api/${projectId}/envelope/?sentry_key=${publicKey}&sentry_version=7`;

      const eventId = Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18);
      const header = JSON.stringify({
        event_id: eventId,
        sent_at: new Date().toISOString(),
        dsn: this.sentryDsn,
      });

      const itemHeader = JSON.stringify({
        type: "event",
        content_type: "application/json",
      });

      const payload = JSON.stringify({
        event_id: eventId,
        timestamp: Date.now() / 1000,
        platform: "javascript",
        level: level === "fatal" ? "fatal" : level === "warn" ? "warning" : level,
        tags: {
          category,
          route: window.location.pathname,
        },
        user: {
          id: this.userContext.id,
          email: this.userContext.email,
          role: this.userContext.role,
        },
        exception: {
          values: [
            {
              type: error.name || "Error",
              value: error.message,
              stacktrace: error.stack
                ? {
                    frames: [{ filename: window.location.href, function: "runtime" }],
                  }
                : undefined,
            },
          ],
        },
        extra: context,
      });

      const body = `${header}\n${itemHeader}\n${payload}`;
      fetch(envelopeUrl, {
        method: "POST",
        body,
        mode: "no-cors",
      }).catch(() => {
        // Silently ignore Sentry transport failures
      });
    } catch {
      // Silently catch Sentry serialization errors
    }
  }
}

// Global Singleton Instance
export const errorTracker = new ErrorTracker();

// Helper exports
export const captureException = (error: unknown, context?: ErrorContext) =>
  errorTracker.captureException(error, context);

export const captureAuthError = (
  action:
    | "login_password"
    | "login_otp"
    | "register_password"
    | "register_otp"
    | "verify_otp"
    | "password_reset"
    | "session_sync"
    | "recaptcha"
    | "role_switch",
  error: unknown,
  meta?: Record<string, unknown>,
) => errorTracker.captureAuthError(action, error, meta);

export const captureMessage = (
  message: string,
  level?: ErrorLevel,
  context?: ErrorContext,
) => errorTracker.captureMessage(message, level, context);

export const addBreadcrumb = (breadcrumb: Omit<Breadcrumb, "timestamp">) =>
  errorTracker.addBreadcrumb(breadcrumb);

export const setUserContext = (user: UserContext | null) =>
  errorTracker.setUserContext(user);
