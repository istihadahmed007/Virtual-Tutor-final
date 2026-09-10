import { authLogger, maskEmail } from "./auth-handshake-logger";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "parent" | "admin";
  image?: string;
  avatarStorageId?: string;
  avatarUrl?: string;
  title?: string;
  institution?: string;
  grade?: string;
  subjects?: string[];
  bio?: string;
  timezone?: string;
  phone?: string;
  hourlyRate?: number;
  yearsExperience?: number;
  rating?: number;
  accountStatus?: "active" | "suspended" | "pending_verification" | "pending";
  isEmailVerified?: boolean;
  createdAt?: number;
}

export interface StoredAccount extends AuthUser {
  passwordHash: string;
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  role: "student" | "teacher" | "parent";
  institution?: string;
  grade?: string;
  title?: string;
  subjects?: string[];
  bio?: string;
  phone?: string;
}

const STORAGE_USERS_KEY = "virtual_tutor_users_v2";
const STORAGE_SESSION_KEY = "virtual_tutor_active_session_v2";
const COOKIE_SESSION_KEY = "vtp_session_v2";
const AUTH_EVENT_NAME = "vtp_auth_change";

// In-memory session cache for instantaneous cross-component and mobile-safe synchronous access
let memorySessionCache: AuthUser | null = null;

/**
 * Reads the authentication session cookie with Lax SameSite and Secure attributes.
 * Works seamlessly across mobile Safari, mobile Chrome, and desktop browsers.
 */
function getSessionCookie(): AuthUser | null {
  if (typeof document === "undefined") return null;
  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.trim().split("=");
      if (name === COOKIE_SESSION_KEY || name === "vtp_session") {
        const rawValue = rest.join("=");
        if (rawValue) {
          const decoded = decodeURIComponent(rawValue);
          const parsed = JSON.parse(decoded) as AuthUser;
          if (parsed && typeof parsed === "object" && parsed._id && parsed.email) {
            return parsed;
          }
        }
      }
    }
  } catch (err) {
    // Gracefully handle parsing or security restrictions
    console.debug("[Auth:Cookie] Read notice:", err);
  }
  return null;
}

/**
 * Writes or removes the session cookie with production-grade attributes:
 * Path=/, Max-Age=1 year (31,536,000s), SameSite=Lax, and Secure on HTTPS.
 */
function setSessionCookie(user: AuthUser | null) {
  if (typeof document === "undefined") return;
  try {
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const secureFlag = isHttps ? "; Secure" : "";

    if (user) {
      const serialized = encodeURIComponent(JSON.stringify(user));
      // Set primary 1-year persistent cookie with SameSite=Lax
      document.cookie = `${COOKIE_SESSION_KEY}=${serialized}; path=/; max-age=31536000; SameSite=Lax${secureFlag}`;
      // Also write legacy cookie for backwards compatibility
      document.cookie = `vtp_session=${serialized}; path=/; max-age=31536000; SameSite=Lax${secureFlag}`;
    } else {
      // Clear both cookies
      document.cookie = `${COOKIE_SESSION_KEY}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`;
      document.cookie = `vtp_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`;
    }
  } catch (err) {
    console.debug("[Auth:Cookie] Write notice:", err);
  }
}

function notifyAuthChange() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event(AUTH_EVENT_NAME));
    } catch {
      // Ignore event dispatch failure in restricted webviews
    }
  }
}

const LEGACY_DEMO_EMAILS = new Set<string>();

const DEFAULT_ACCOUNTS: StoredAccount[] = [];

export function getRegisteredUsers(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRegisteredUsers(users: StoredAccount[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    notifyAuthChange();
  } catch (err) {
    console.error("Failed to save users database:", err);
  }
}

export function getActiveSession(): AuthUser | null {
  if (typeof window === "undefined") return null;

  // 1. Fast path: in-memory cache
  if (memorySessionCache && memorySessionCache._id && memorySessionCache.email) {
    return memorySessionCache;
  }

  let user: AuthUser | null = null;
  let source: "localStorage" | "cookie" | "sessionStorage" | null = null;

  // 2. Try localStorage
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed && parsed._id && parsed.email) {
        user = parsed;
        source = "localStorage";
      }
    }
  } catch (err) {
    // QuotaExceededError or SecurityError on iOS Safari Private Mode
    authLogger.warn("AuthStore:LocalStorageReadError", "localStorage read failed or restricted", {
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
  }

  // 3. Fallback to Cookie (universal across mobile Safari, mobile Chrome, and webviews)
  if (!user) {
    const cookieUser = getSessionCookie();
    if (cookieUser && cookieUser._id && cookieUser.email) {
      user = cookieUser;
      source = "cookie";
    }
  }

  // 4. Fallback to sessionStorage
  if (!user) {
    try {
      const rawSession = sessionStorage.getItem(STORAGE_SESSION_KEY);
      if (rawSession) {
        const parsed = JSON.parse(rawSession) as AuthUser;
        if (parsed && parsed._id && parsed.email) {
          user = parsed;
          source = "sessionStorage";
        }
      }
    } catch {
      // Ignore
    }
  }

  // 5. Self-Healing Synchronization across tiers
  if (user) {
    if (LEGACY_DEMO_EMAILS.has(user.email?.toLowerCase()) || user._id?.startsWith("demo_")) {
      setActiveSession(null);
      return null;
    }
    memorySessionCache = user;

    // If loaded from cookie, restore to localStorage if possible
    if (source !== "localStorage") {
      try {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
      } catch {
        // Safe to ignore in private browsing
      }
    }

    // If loaded from localStorage, ensure cookie is kept fresh
    if (source !== "cookie") {
      setSessionCookie(user);
    }

    // Keep sessionStorage aligned
    try {
      sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
      sessionStorage.setItem("selected_role", user.role);
    } catch {
      // Safe to ignore
    }

    return user;
  }

  memorySessionCache = null;
  return null;
}

export function setActiveSession(user: AuthUser | null) {
  if (typeof window === "undefined") return;

  // Update in-memory reference immediately
  memorySessionCache = user;

  if (user) {
    // Write to multi-tier persistent storage
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
    } catch (err) {
      authLogger.warn("AuthStore:LocalStorageWriteError", "localStorage write failed or restricted", {
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        userRole: user.role,
        maskedEmail: maskEmail(user.email),
      });
    }

    try {
      sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
      sessionStorage.setItem("selected_role", user.role);
    } catch (err) {
      authLogger.warn("AuthStore:SessionStorageWriteError", "sessionStorage write failed or restricted", {
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }

    // Write persistent SameSite=Lax Secure cookie
    setSessionCookie(user);
  } else {
    // Clear all storage layers
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } catch {
      // Safe to ignore
    }

    try {
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      sessionStorage.removeItem("selected_role");
    } catch {
      // Safe to ignore
    }

    setSessionCookie(null);
  }

  notifyAuthChange();
}

// ─── AUTH OPERATIONS ─────────────────────────────────────────

export function loginUser(email: string, password: string): { success: boolean; user?: AuthUser; error?: string } {
  const users = getRegisteredUsers();
  const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!found) {
    return {
      success: false,
      error: "Invalid email or password.",
    };
  }
  if (found.passwordHash && found.passwordHash !== password) {
    return {
      success: false,
      error: "Invalid password provided.",
    };
  }
  const authUser: AuthUser = {
    _id: found._id,
    name: found.name,
    email: found.email,
    role: found.role,
    image: found.image,
    avatarUrl: found.avatarUrl,
    isEmailVerified: found.isEmailVerified,
  };
  setActiveSession(authUser);
  return {
    success: true,
    user: authUser,
  };
}

export function logoutUser() {
  setActiveSession(null);
}

export const clearActiveSession = logoutUser;

export function updateUserProfile(updates: Partial<AuthUser>): AuthUser | null {
  const current = getActiveSession();
  if (!current) return null;

  const updated: AuthUser = { ...current, ...updates };
  setActiveSession(updated);

  const users = getRegisteredUsers();
  const index = users.findIndex((u) => u._id === current._id || u.email.toLowerCase() === current.email.toLowerCase());
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    saveRegisteredUsers(users);
  }

  return updated;
}

export function switchUserRole(newRole: "student" | "teacher" | "admin"): AuthUser | null {
  const current = getActiveSession();
  if (!current) return null;
  // Security guard: Only existing teachers or admins can assume the teacher role
  if (newRole === "teacher" && current.role !== "teacher" && current.role !== "admin") {
    console.warn("[Auth] Cannot assign teacher role without administrator verification approval.");
    return current;
  }
  return updateUserProfile({ role: newRole });
}

export function updateActiveSessionRole(newRole: "student" | "teacher" | "admin" | "parent"): AuthUser | null {
  return updateUserProfile({ role: newRole });
}
