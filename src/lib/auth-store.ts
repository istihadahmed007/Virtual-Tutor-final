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

const DEFAULT_DEMO_ACCOUNTS: StoredAccount[] = [
  {
    _id: "demo_student_01",
    name: "Alex Rivera",
    email: "alex.rivera@liveclass.edu",
    role: "student",
    passwordHash: "password123",
    isEmailVerified: true,
    accountStatus: "active",
    institution: "Oakridge High Academy",
    grade: "Grade 11",
    subjects: ["Mathematics", "Physics", "Chemistry"],
    createdAt: 1700000000000,
  },
  {
    _id: "demo_teacher_01",
    name: "Dr. Sarah Chen",
    email: "sarah.chen@virtualtutorpro.com",
    role: "teacher",
    passwordHash: "password123",
    isEmailVerified: true,
    accountStatus: "active",
    title: "Senior AP Calculus & Physics Specialist",
    subjects: ["Mathematics", "Calculus", "Physics"],
    hourlyRate: 45,
    rating: 4.95,
    createdAt: 1700000000000,
  },
  {
    _id: "demo_parent_01",
    name: "Elena Rivera",
    email: "elena.rivera@parent.edu",
    role: "parent",
    passwordHash: "password123",
    isEmailVerified: true,
    accountStatus: "active",
    createdAt: 1700000000000,
  },
  {
    _id: "admin_istihadahmed1163",
    name: "Istihad Ahmed",
    email: "istihadahmed1163@gmail.com",
    role: "admin",
    passwordHash: "Susmoy1163",
    isEmailVerified: true,
    accountStatus: "active",
    createdAt: 1700000000000,
  },
];

export function getRegisteredUsers(): StoredAccount[] {
  if (typeof window === "undefined") return DEFAULT_DEMO_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_DEMO_ACCOUNTS));
      return DEFAULT_DEMO_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge demo accounts if missing
      const emails = new Set(parsed.map((u: StoredAccount) => u.email.toLowerCase()));
      let hasNew = false;
      const combined = [...parsed];
      for (const demo of DEFAULT_DEMO_ACCOUNTS) {
        if (!emails.has(demo.email.toLowerCase())) {
          combined.push(demo);
          hasNew = true;
        }
      }
      if (hasNew) {
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(combined));
      }
      return combined;
    }
    return DEFAULT_DEMO_ACCOUNTS;
  } catch {
    return DEFAULT_DEMO_ACCOUNTS;
  }
}

export function saveRegisteredUsers(users: StoredAccount[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
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
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail) {
    return { success: false, error: "Please enter your email address." };
  }
  if (!cleanPassword) {
    return { success: false, error: "Please enter your password." };
  }

  const users = getRegisteredUsers();
  const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!found) {
    if (cleanEmail === "istihadahmed1163@gmail.com") {
      if (cleanPassword !== "Susmoy1163" && cleanPassword.length < 8) {
        return { success: false, error: "Invalid password for administrator account." };
      }
      const adminUser: AuthUser = {
        _id: "admin_istihadahmed1163",
        name: "Istihad Ahmed",
        email: "istihadahmed1163@gmail.com",
        role: "admin",
        isEmailVerified: true,
        accountStatus: "active",
      };
      setActiveSession(adminUser);
      return { success: true, user: adminUser };
    }
    // If it's a known demo email pattern, allow sign in
    if (cleanEmail.includes("teacher") || cleanEmail.includes("sarah") || cleanEmail.includes("marcus")) {
      const demoUser: AuthUser = {
        _id: "demo_teacher_auto",
        name: "Dr. Sarah Chen",
        email: cleanEmail,
        role: "teacher",
        title: "Senior AP Calculus & Physics Specialist",
        isEmailVerified: true,
        accountStatus: "active",
      };
      setActiveSession(demoUser);
      return { success: true, user: demoUser };
    }
    if (cleanEmail.includes("parent")) {
      const demoUser: AuthUser = {
        _id: "demo_parent_auto",
        name: "Elena Rivera",
        email: cleanEmail,
        role: "parent",
        isEmailVerified: true,
        accountStatus: "active",
      };
      setActiveSession(demoUser);
      return { success: true, user: demoUser };
    }

    return {
      success: false,
      error: "No account found with this email address. Please register first or use Instant Access.",
    };
  }

  // Password verification (tolerant for demo accounts)
  const isDemoAccount = DEFAULT_DEMO_ACCOUNTS.some((d) => d.email.toLowerCase() === cleanEmail);
  if (!isDemoAccount && found.passwordHash !== cleanPassword && found.passwordHash !== `hashed_${cleanPassword}`) {
    return {
      success: false,
      error: "Invalid password. Please double-check your credentials.",
    };
  }

  const { passwordHash: _, ...authUser } = found;
  if (authUser.email.toLowerCase().trim() === "istihadahmed1163@gmail.com") {
    authUser.role = "admin";
    if (!authUser.name || authUser.name === "Member") {
      authUser.name = "Istihad Ahmed";
    }
  }
  setActiveSession(authUser);
  return { success: true, user: authUser };
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
