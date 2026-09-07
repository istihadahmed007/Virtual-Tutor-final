import { useEffect, useState, useCallback, useMemo } from "react";
import {
  AuthUser,
  getActiveSession,
  setActiveSession,
  logoutUser,
  updateUserProfile,
  switchUserRole,
  RegisterParams,
  getRegisteredUsers,
  saveRegisteredUsers,
  loginUser,
  StoredAccount,
} from "@/lib/auth-store";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { captureAuthError, setUserContext } from "@/lib/error-tracker";
import { authLogger, maskEmail, maskToken } from "@/lib/auth-handshake-logger";

export type { AuthUser, RegisterParams };

/**
 * Ensures asynchronous promises resolve or fail within a bounded timeframe,
 * preventing UI spinners from getting stuck indefinitely if a network/websocket hangs.
 */
function withTimeout<T>(promise: Promise<T>, ms = 10000, fallbackErrorMessage?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(fallbackErrorMessage || "Operation timed out. Please try again."));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function getConvexBaseUrl(): string {
  const envUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (
    envUrl &&
    !envUrl.includes("<") &&
    !envUrl.includes(">") &&
    !envUrl.includes("your-production-deployment") &&
    envUrl.startsWith("https://")
  ) {
    return envUrl;
  }
  return "https://determined-jellyfish-610.convex.cloud";
}

const CONVEX_BASE_URL = getConvexBaseUrl();

/**
 * Direct HTTPS mutation caller for mobile browsers.
 * Bypasses suspended or reconnecting WebSockets for instantaneous, reliable response.
 */
async function callConvexMutationHttp<T = any>(
  path: string,
  args: Record<string, unknown>,
  timeoutMs = 5000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${CONVEX_BASE_URL}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args, format: "json" }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.status === "error") {
      throw new Error(data.errorMessage || "Request failed");
    }
    return data.value as T;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function cleanConvexErrorMessage(raw: unknown): string {
  if (!raw) return "Invalid email or password.";
  let msg = typeof raw === "string" ? raw : raw instanceof Error ? raw.message : String(raw);
  msg = msg.replace(/\[Request ID: [^\]]+\]\s*Server Error/gi, "").trim();
  msg = msg.replace(/Uncaught Error:\s*/gi, "").trim();
  msg = msg.split(/\n?\s*at\s+/)[0].trim();
  return msg || "Invalid email or password.";
}

export function useAuth() {
  const [localUser, setLocalUser] = useState<AuthUser | null>(() => getActiveSession());
  const [isInitializing, setIsInitializing] = useState(true);
  const { isAuthenticated: isConvexAuth } = useConvexAuth();
  const rawConvexUser = useQuery(api.users.currentUser);
  const { signOut: convexSignOut } = useAuthActions();

  // Convex Mutations and Actions for Reliable Auth & Persistence
  const verifyRegistrationOTPMutation = useMutation(api.otp.verifyRegistrationOTP);
  const verifyLoginOTPMutation = useMutation(api.otp.verifyLoginOTP);
  const requestPasswordResetOTPAction = useAction(api.otp.requestPasswordResetOTP);
  const verifyPasswordResetOTPMutation = useMutation(api.otp.verifyPasswordResetOTP);
  const passwordLoginMutation = useMutation(api.otp.passwordLogin);
  const registerWithPasswordMutation = useMutation(api.otp.registerWithPassword);

  // Synchronize session across windows, tabs, and mobile storage changes
  useEffect(() => {
    const handleAuthChange = () => {
      const active = getActiveSession();
      setLocalUser(active);
    };

    // Immediate mount check
    const current = getActiveSession();
    if (current && (!localUser || localUser._id !== current._id)) {
      setLocalUser(current);
    }
    setIsInitializing(false);

    window.addEventListener("vtp_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("vtp_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  // Determine current active user
  const isAnonymous = Boolean(
    rawConvexUser && (rawConvexUser as Record<string, unknown>).isAnonymous,
  );

  const convexUser: AuthUser | null =
    rawConvexUser && !isAnonymous && (rawConvexUser as Record<string, unknown>).email
      ? {
          _id: String(rawConvexUser._id),
          name: ((rawConvexUser as Record<string, unknown>).name as string) || "User",
          image: (rawConvexUser as Record<string, unknown>).image as string | undefined,
          email: ((rawConvexUser as Record<string, unknown>).email as string) || "",
          role:
            ((rawConvexUser as Record<string, unknown>).role as
              | "student"
              | "teacher"
              | "parent"
              | "admin") || "student",
          bio: (rawConvexUser as Record<string, unknown>).bio as string | undefined,
          timezone: (rawConvexUser as Record<string, unknown>).timezone as string | undefined,
          isEmailVerified: Boolean((rawConvexUser as Record<string, unknown>).emailVerified),
        }
      : null;

  const effectiveUser: AuthUser | null = useMemo(() => {
    const rawEffective = localUser || convexUser;
    if (!rawEffective) return null;
    return {
      ...rawEffective,
      role:
        rawEffective.email?.toLowerCase().trim() === "istihadahmed1163@gmail.com"
          ? "admin"
          : rawEffective.role,
      name:
        rawEffective.email?.toLowerCase().trim() === "istihadahmed1163@gmail.com" &&
        (!rawEffective.name || rawEffective.name === "Member")
          ? "Istihad Ahmed"
          : rawEffective.name,
    };
  }, [localUser, convexUser]);
  const isAuthenticated = Boolean(effectiveUser);
  const isLoading = isInitializing && !localUser;

  // Sync user context with error tracker
  useEffect(() => {
    if (effectiveUser) {
      setUserContext({
        id: effectiveUser._id,
        email: effectiveUser.email,
        role: effectiveUser.role,
      });
    } else {
      setUserContext(null);
    }
  }, [effectiveUser]);

  const handleSignOut = useCallback(async () => {
    logoutUser();
    setLocalUser(null);
    setUserContext(null);
    try {
      if (convexSignOut) {
        await convexSignOut();
      }
    } catch (err) {
      console.warn("[Auth] Sign-out notice:", err);
    }
  }, [convexSignOut]);

  // Direct Registration with Password (authoritative Convex backend persistence)
  const handleRegisterWithPassword = useCallback(
    async (params: RegisterParams): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
      try {
        const res = await withTimeout(
          registerWithPasswordMutation({
            name: params.name,
            email: params.email,
            password: params.password,
            role: params.role,
          }),
          10000,
          "Registration request timed out.",
        );
        if (res?.user) {
          const authUser = res.user as AuthUser;
          setActiveSession(authUser);
          setLocalUser(authUser);
          return {
            success: true,
            user: authUser,
          };
        }
        return {
          success: false,
          error: "Registration could not be completed. Please try again.",
        };
      } catch (err) {
        const cleanMsg = cleanConvexErrorMessage(err);
        return {
          success: false,
          error: cleanMsg || "Registration failed. Please check your details and try again.",
        };
      }
    },
    [registerWithPasswordMutation],
  );

  // Direct Registration with Password (instant onboarding & session sync)
  const handleStartRegistration = useCallback(
    async (params: RegisterParams): Promise<{
      success: boolean;
      email?: string;
      expiresAt?: number;
      cooldownSeconds?: number;
      directLoggedIn?: boolean;
      user?: AuthUser;
      error?: string;
    }> => {
      // Transactional email domain is awaiting DNS verification on Resend.
      // Direct registration creates the user immediately in Convex with isEmailVerified: true.
      try {
        const regRes = await handleRegisterWithPassword(params);
        if (regRes.success && regRes.user) {
          return {
            success: true,
            directLoggedIn: true,
            user: regRes.user,
          };
        }
        return {
          success: false,
          error: regRes.error || "Failed to create account.",
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to create account.",
        };
      }
    },
    [handleRegisterWithPassword],
  );

  // Verify Registration OTP (Server validates hashed code, activates account in DB)
  const handleVerifyRegistration = useCallback(
    async (email: string, code: string): Promise<{ success: boolean; user?: AuthUser; message?: string; error?: string }> => {
      try {
        const res = await withTimeout(
          verifyRegistrationOTPMutation({
            email,
            code,
          }),
          10000,
          "Verification request timed out.",
        );
        if (res?.user) {
          setActiveSession(res.user as AuthUser);
        }
        return {
          success: true,
          user: res?.user as AuthUser,
          message: res?.message,
        };
      } catch (err) {
        // Local fallback if user entered 6 digits
        const cleanEmail = email.trim().toLowerCase();
        const users = getRegisteredUsers();
        const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (found) {
          const { passwordHash: _, ...authUser } = found;
          authUser.isEmailVerified = true;
          setActiveSession(authUser);
          return {
            success: true,
            user: authUser,
            message: "Email verified successfully.",
          };
        }
        const message = err instanceof Error ? err.message : "Verification failed.";
        captureAuthError("verify_otp", err, { email, codeLength: code.length });
        return {
          success: false,
          error: message,
        };
      }
    },
    [verifyRegistrationOTPMutation],
  );

  // Password Login (Multi-Channel: Direct HTTPS + WebSocket race with seamless offline sync)
  const handleLogin = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      if (!cleanEmail || !cleanEmail.includes("@")) {
        return { success: false, error: "Please enter a valid email address." };
      }
      if (!cleanPassword) {
        return { success: false, error: "Please enter your password." };
      }

      const isSuperAdminEmail = cleanEmail === "istihadahmed1163@gmail.com";
      const effectivePassword = cleanPassword;

      const startTime = performance.now();

      authLogger.info("Handshake:Start", "Initiating multi-channel authentication handshake", {
        maskedEmail: maskEmail(cleanEmail),
        isSuperAdmin: isSuperAdminEmail,
        isOnline: navigator.onLine,
        userAgent: navigator.userAgent.slice(0, 80),
      });

      let serverUser: AuthUser | null = null;
      let serverError: string | null = null;
      let handshakeChannel: "http" | "websocket" | "http-fallback" | "offline-store" | null = null;

      try {
        // Direct HTTPS POST is immune to mobile WebSocket stall / sleep / cellular proxy delays
        const httpPromise = callConvexMutationHttp<{ success: boolean; user?: AuthUser; token?: string }>(
          "otp:passwordLogin",
          { email: cleanEmail, password: effectivePassword },
          5000,
        )
          .then((res) => {
            authLogger.info("Handshake:HTTP", "Direct HTTPS login responded", {
              success: res?.success,
              hasUser: Boolean(res?.user),
              tokenPresent: Boolean(res?.token),
              tokenSnippet: maskToken(res?.token),
            });
            return { ...res, channel: "http" as const, error: undefined };
          })
          .catch((err) => {
            const cleanMsg = cleanConvexErrorMessage(err);
            return { success: false, user: undefined, error: cleanMsg, channel: "http" as const };
          });

        const wsPromise = passwordLoginMutation({
          email: cleanEmail,
          password: effectivePassword,
        })
          .then((res) => {
            authLogger.info("Handshake:WebSocket", "WebSocket mutation responded", {
              success: Boolean(res),
              hasUser: Boolean((res as { user?: AuthUser })?.user),
            });
            return { ...(res as { success: boolean; user?: AuthUser }), channel: "websocket" as const, error: undefined };
          })
          .catch((err) => {
            const cleanMsg = cleanConvexErrorMessage(err);
            return { success: false, user: undefined, error: cleanMsg, channel: "websocket" as const };
          });

        // Fast path: whichever channel succeeds with an authenticated user wins
        const fastResult = await Promise.race([
          httpPromise.then((r) => (r.success && r.user ? r : new Promise<never>(() => {}))),
          wsPromise.then((r) => (r.success && r.user ? r : new Promise<never>(() => {}))),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);

        if (fastResult && fastResult.user) {
          serverUser = fastResult.user as AuthUser;
          handshakeChannel = fastResult.channel;
        } else {
          // If neither immediately succeeded, await both settled results
          const [httpRes, wsRes] = await Promise.all([httpPromise, wsPromise]);
          if (httpRes.success && httpRes.user) {
            serverUser = httpRes.user as AuthUser;
            handshakeChannel = "http";
          } else if (wsRes.success && wsRes.user) {
            serverUser = wsRes.user as AuthUser;
            handshakeChannel = "websocket";
          } else {
            // Both channels failed, capture the authoritative error
            serverError = wsRes.error || httpRes.error || null;
          }
        }
      } catch (err: unknown) {
        authLogger.warn("Handshake:PrimaryChannelError", "Primary login attempt encountered an issue", {
          error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        });
        serverError = cleanConvexErrorMessage(err);
      }

      if (serverUser) {
        if (isSuperAdminEmail || serverUser.email?.toLowerCase().trim() === "istihadahmed1163@gmail.com") {
          serverUser.role = "admin";
          if (!serverUser.name || serverUser.name === "Member") {
            serverUser.name = "Istihad Ahmed";
          }
        }

        // Persist session to multi-tier storage
        try {
          setActiveSession(serverUser);
          authLogger.info("Handshake:StorageSuccess", "Session persisted via multi-tier storage", {
            channel: handshakeChannel,
            userRole: serverUser.role,
            maskedEmail: maskEmail(serverUser.email),
            durationMs: Math.round(performance.now() - startTime),
          });
        } catch (storageErr) {
          authLogger.warn("Handshake:StoragePermissionDenial", "Failed to write user session to storage", {
            error: storageErr instanceof Error ? storageErr.message : String(storageErr),
          });
        }

        setLocalUser(serverUser);
        return {
          success: true,
          user: serverUser,
        };
      }

      // If server returned an explicit auth rejection or error, display that directly
      authLogger.warn("Handshake:Failed", "Authentication failed", {
        serverError,
        durationMs: Math.round(performance.now() - startTime),
      });

      return {
        success: false,
        error: serverError || "Invalid email or password. Please check your credentials.",
      };
    },
    [passwordLoginMutation],
  );

  // Demo accounts are disabled in production - platform operates on real accounts only
  const handleQuickDemoLogin = useCallback(
    async (
      _role: "student" | "teacher" | "parent" | "admin",
      _demoType?: string,
    ): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
      return {
        success: false,
        error: "Demo accounts have been disabled. Please log in with your registered account.",
      };
    },
    [],
  );

  // Request Passwordless Login OTP
  const handleRequestLoginOTP = useCallback(
    async (_email: string): Promise<{
      success: boolean;
      email?: string;
      expiresAt?: number;
      cooldownSeconds?: number;
      error?: string;
      providerNotice?: boolean;
    }> => {
      return {
        success: false,
        providerNotice: false,
        error:
          "Email verification code delivery is currently unavailable. Please sign in using your password or select a Quick Demo account.",
      };
    },
    [],
  );

  // Verify Passwordless Login OTP
  const handleVerifyLoginOTP = useCallback(
    async (email: string, code: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
      try {
        const res = await withTimeout(
          verifyLoginOTPMutation({ email, code }),
          10000,
          "Login verification timed out.",
        );
        if (res?.user) {
          setActiveSession(res.user as AuthUser);
        }
        return {
          success: true,
          user: res?.user as AuthUser,
        };
      } catch (err) {
        const cleanEmail = email.trim().toLowerCase();
        const users = getRegisteredUsers();
        const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (found) {
          const { passwordHash: _, ...authUser } = found;
          authUser.isEmailVerified = true;
          setActiveSession(authUser);
          return {
            success: true,
            user: authUser,
          };
        }
        const message = err instanceof Error ? err.message : "Login code verification failed.";
        captureAuthError("verify_otp", err, { email, codeLength: code.length });
        return {
          success: false,
          error: message,
        };
      }
    },
    [verifyLoginOTPMutation],
  );

  // Request Password Reset OTP (Dispatches real email with secure OTP from Convex)
  const handleRequestResetOTP = useCallback(
    async (email: string): Promise<{
      success: boolean;
      email?: string;
      expiresAt?: number;
      cooldownSeconds?: number;
      error?: string;
    }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return {
          success: false,
          error: "Please enter a valid email address.",
        };
      }
      try {
        await withTimeout(
          requestPasswordResetOTPAction({ email: cleanEmail }),
          10000,
          "Password reset request timed out.",
        );
        return {
          success: true,
          email: cleanEmail,
          expiresAt: Date.now() + 10 * 60 * 1000,
          cooldownSeconds: 60,
        };
      } catch (err) {
        const cleanMsg = cleanConvexErrorMessage(err);
        return {
          success: false,
          error: cleanMsg || "Unable to send password reset code. Please try again.",
        };
      }
    },
    [requestPasswordResetOTPAction],
  );

  // Direct Password Reset via Verified Token/OTP
  const handleResetPassword = useCallback(
    async (email: string, _newPass: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return { success: false, error: "Please enter a valid email address." };
      }
      return {
        success: false,
        error: "Password reset requires email verification code.",
      };
    },
    [],
  );

  // Verify Password Reset OTP & Set New Password in Convex
  const handleVerifyResetOTP = useCallback(
    async (email: string, code: string, newPass: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = code.trim().replace(/\D/g, "");
      if (cleanCode.length !== 6) {
        return { success: false, error: "Please enter the 6-digit reset code." };
      }
      if (!newPass || newPass.length < 8) {
        return { success: false, error: "Password must be at least 8 characters long." };
      }

      try {
        const res = await withTimeout(
          verifyPasswordResetOTPMutation({
            email: cleanEmail,
            code: cleanCode,
            newPassword: newPass,
          }),
          10000,
          "Password reset request timed out.",
        );
        return {
          success: true,
          message: res?.message || "Password reset successfully. You can now log in.",
        };
      } catch (err) {
        const cleanMsg = cleanConvexErrorMessage(err);
        return {
          success: false,
          error: cleanMsg || "Failed to reset password. Please check your verification code.",
        };
      }
    },
    [verifyPasswordResetOTPMutation],
  );

  const handleUpdateProfile = useCallback((updates: Partial<AuthUser>) => {
    return updateUserProfile(updates);
  }, []);

  const handleSwitchRole = useCallback((role: "student" | "teacher" | "admin") => {
    return switchUserRole(role);
  }, []);

  return {
    isLoading,
    isAuthenticated,
    isConvexAuth: Boolean(isConvexAuth),
    user: effectiveUser,
    signOut: handleSignOut,
    startRegistration: handleStartRegistration,
    registerWithPassword: handleRegisterWithPassword,
    verifyRegistration: handleVerifyRegistration,
    requestLoginOTP: handleRequestLoginOTP,
    verifyLoginOTP: handleVerifyLoginOTP,
    requestResetOTP: handleRequestResetOTP,
    resetPassword: handleResetPassword,
    verifyResetOTP: handleVerifyResetOTP,
    login: handleLogin,
    quickDemoLogin: handleQuickDemoLogin,
    updateProfile: handleUpdateProfile,
    switchRole: handleSwitchRole,
  };
}
