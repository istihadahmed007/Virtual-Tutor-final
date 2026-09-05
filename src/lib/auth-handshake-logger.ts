import { errorTracker } from "./error-tracker";

/**
 * Diagnostic utility for non-sensitive authentication tracing.
 * Masks personal and credential data while exposing crucial timing,
 * channel selection, storage permissions, token formats, and redirect loop diagnostics.
 */

export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== "string") return "[NONE]";
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 1) return "***" + trimmed.slice(atIndex);
  const user = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  const visible = user.slice(0, 2);
  return `${visible}***${domain}`;
}

export function maskToken(token?: unknown): {
  present: boolean;
  length: number;
  isJwtFormat: boolean;
  segments?: number;
} {
  if (!token || typeof token !== "string") {
    return { present: false, length: 0, isJwtFormat: false };
  }
  const parts = token.trim().split(".");
  const isJwtFormat = parts.length === 3 && parts.every((p) => p.length > 0);
  return {
    present: true,
    length: token.length,
    isJwtFormat,
    segments: parts.length,
  };
}

export interface StorageProbeResult {
  localStorage: { available: boolean; error?: string };
  sessionStorage: { available: boolean; error?: string };
  cookies: { available: boolean; error?: string };
  indexedDB: { available: boolean; error?: string };
  storageQuotaEstimated?: { quotaMb?: number; usageMb?: number };
  isPrivateModeLikely: boolean;
}

/**
 * Probes browser storage access to identify storage permission denials,
 * private browsing mode restrictions, or iframe sandbox blocks.
 */
export function probeStoragePermissions(): StorageProbeResult {
  const result: StorageProbeResult = {
    localStorage: { available: false },
    sessionStorage: { available: false },
    cookies: { available: false },
    indexedDB: { available: false },
    isPrivateModeLikely: false,
  };

  if (typeof window === "undefined") {
    return result;
  }

  // 1. Probe localStorage
  try {
    const testKey = "__vtp_auth_probe_ls";
    window.localStorage.setItem(testKey, "probe");
    const val = window.localStorage.getItem(testKey);
    window.localStorage.removeItem(testKey);
    result.localStorage.available = val === "probe";
  } catch (err) {
    result.localStorage.available = false;
    result.localStorage.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    result.isPrivateModeLikely = true;
  }

  // 2. Probe sessionStorage
  try {
    const testKey = "__vtp_auth_probe_ss";
    window.sessionStorage.setItem(testKey, "probe");
    const val = window.sessionStorage.getItem(testKey);
    window.sessionStorage.removeItem(testKey);
    result.sessionStorage.available = val === "probe";
  } catch (err) {
    result.sessionStorage.available = false;
    result.sessionStorage.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  // 3. Probe document.cookie
  try {
    if (typeof document !== "undefined") {
      const testCookie = "__vtp_cookie_probe=1; path=/; SameSite=Lax";
      document.cookie = testCookie;
      result.cookies.available = document.cookie.includes("__vtp_cookie_probe=1");
      // Clean up test cookie
      document.cookie = "__vtp_cookie_probe=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  } catch (err) {
    result.cookies.available = false;
    result.cookies.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  // 4. Probe indexedDB
  try {
    if (typeof window !== "undefined" && "indexedDB" in window && window.indexedDB !== null) {
      result.indexedDB.available = true;
    }
  } catch (err) {
    result.indexedDB.available = false;
    result.indexedDB.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  return result;
}

export interface ClientDiagnostics {
  userAgent: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isStandalonePWA: boolean;
  isInIframe: boolean;
  viewport: { width: number; height: number; dpr: number };
  isOnline: boolean;
  effectiveType?: string;
}

/**
 * Returns non-sensitive client environment details for diagnosing mobile browser issues.
 */
export function getClientDiagnostics(): ClientDiagnostics {
  if (typeof window === "undefined") {
    return {
      userAgent: "SSR",
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
      isStandalonePWA: false,
      isInIframe: false,
      viewport: { width: 0, height: 0, dpr: 1 },
      isOnline: true,
    };
  }

  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua);
  const isStandalonePWA =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigator as unknown as { standalone?: boolean })?.standalone === true;
  const isInIframe = window.self !== window.top;

  const conn = (navigator as unknown as { connection?: { effectiveType?: string } })?.connection;

  return {
    userAgent: ua.slice(0, 150),
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isStandalonePWA,
    isInIframe,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
    },
    isOnline: navigator.onLine !== false,
    effectiveType: conn?.effectiveType,
  };
}

/**
 * Redirect loop detection to identify rapid ping-pong between /auth and protected routes on mobile
 */
const REDIRECT_HISTORY_KEY = "__vtp_redirect_history";

export function checkRedirectLoop(
  currentPath: string,
  targetPath: string,
  timeWindowMs = 6000,
  thresholdCount = 3,
): { isLoop: boolean; count: number; recentPaths: string[] } {
  if (typeof window === "undefined") {
    return { isLoop: false, count: 0, recentPaths: [] };
  }

  try {
    const raw = sessionStorage.getItem(REDIRECT_HISTORY_KEY);
    const now = Date.now();
    let entries: { path: string; target: string; time: number }[] = raw ? JSON.parse(raw) : [];

    // Retain only entries within the time window
    entries = entries.filter((e) => now - e.time < timeWindowMs);
    entries.push({ path: currentPath, target: targetPath, time: now });

    sessionStorage.setItem(REDIRECT_HISTORY_KEY, JSON.stringify(entries));

    const occurrences = entries.filter(
      (e) => (e.path === currentPath && e.target === targetPath) || (e.path === targetPath && e.target === currentPath),
    );

    const isLoop = occurrences.length >= thresholdCount;
    return {
      isLoop,
      count: occurrences.length,
      recentPaths: entries.map((e) => `${e.path}->${e.target}`),
    };
  } catch {
    return { isLoop: false, count: 0, recentPaths: [] };
  }
}

/**
 * Structured, non-sensitive logger
 */
export const authLogger = {
  info(stage: string, message: string, data?: Record<string, unknown>) {
    const timestamp = new Date().toISOString().slice(11, 23);
    console.info(
      `%c[AuthHandshake:${stage} ${timestamp}]%c ${message}`,
      "color: #0284c7; font-weight: bold",
      "color: inherit",
      data ? data : "",
    );
    try {
      errorTracker.addBreadcrumb({
        type: "auth",
        message: `[${stage}] ${message}`,
        data: data ? { ...data } : undefined,
      });
    } catch {
      // Ignore breadcrumb error
    }
  },

  warn(stage: string, message: string, data?: Record<string, unknown>) {
    const timestamp = new Date().toISOString().slice(11, 23);
    console.warn(
      `%c[AuthHandshake:${stage} ${timestamp}]%c ⚠️ ${message}`,
      "color: #ea580c; font-weight: bold",
      "color: inherit",
      data ? data : "",
    );
    try {
      errorTracker.addBreadcrumb({
        type: "auth",
        message: `[WARN:${stage}] ${message}`,
        data: data ? { ...data } : undefined,
      });
    } catch {
      // Ignore breadcrumb error
    }
  },

  error(stage: string, message: string, err?: unknown, data?: Record<string, unknown>) {
    const timestamp = new Date().toISOString().slice(11, 23);
    const errMessage = err instanceof Error ? `${err.name}: ${err.message}` : String(err || "");
    console.error(
      `%c[AuthHandshake:${stage} ${timestamp}]%c ❌ ${message}`,
      "color: #dc2626; font-weight: bold",
      "color: inherit",
      { error: errMessage, ...(data || {}) },
    );
    try {
      errorTracker.addBreadcrumb({
        type: "error",
        message: `[ERROR:${stage}] ${message}: ${errMessage}`,
        data: data ? { ...data } : undefined,
      });
    } catch {
      // Ignore breadcrumb error
    }
  },
};

/**
 * Creates a diagnostic storage adapter for ConvexAuthProvider that traces
 * every storage operation, inspects token formats non-sensitively, and catches
 * permission denials.
 */
export function createLoggedConvexAuthStorage() {
  // In-memory backing store as reliable fallback for restricted mobile browsers
  const memoryFallback = new Map<string, string>();

  return {
    getItem: (key: string): string | null => {
      let value: string | null = null;
      let source = "none";
      let errorDesc: string | undefined;

      // 1. Try real localStorage
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          value = window.localStorage.getItem(key);
          if (value !== null) {
            source = "localStorage";
          }
        }
      } catch (err) {
        errorDesc = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      }

      // 2. Fallback to memory
      if (value === null && memoryFallback.has(key)) {
        value = memoryFallback.get(key) || null;
        source = "memoryFallback";
      }

      const tokenAnalysis = maskToken(value);
      authLogger.info("ConvexAuthStorage", `getItem("${key}")`, {
        key,
        found: value !== null,
        source,
        tokenAnalysis,
        ...(errorDesc ? { storagePermissionError: errorDesc } : {}),
      });

      return value;
    },

    setItem: (key: string, value: string): void => {
      const tokenAnalysis = maskToken(value);
      let storageSaved = false;
      let errorDesc: string | undefined;

      // Always save to memory
      memoryFallback.set(key, value);

      // Attempt write to real localStorage
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
          storageSaved = true;
        }
      } catch (err) {
        errorDesc = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      }

      if (errorDesc) {
        authLogger.warn("ConvexAuthStorage", `setItem("${key}") permission denial / failure`, {
          key,
          storageSaved,
          tokenAnalysis,
          storagePermissionError: errorDesc,
        });
      } else {
        authLogger.info("ConvexAuthStorage", `setItem("${key}") success`, {
          key,
          storageSaved,
          tokenAnalysis,
        });
      }
    },

    removeItem: (key: string): void => {
      memoryFallback.delete(key);
      let storageRemoved = false;
      let errorDesc: string | undefined;

      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
          storageRemoved = true;
        }
      } catch (err) {
        errorDesc = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      }

      authLogger.info("ConvexAuthStorage", `removeItem("${key}")`, {
        key,
        storageRemoved,
        ...(errorDesc ? { storagePermissionError: errorDesc } : {}),
      });
    },
  };
}
