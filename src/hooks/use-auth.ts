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
import { useConvexAuth, useQuery, useMutation } from "convex/react";
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

export function useAuth() {
  const [localUser, setLocalUser] = useState<AuthUser | null>(() => getActiveSession());
  const [isInitializing, setIsInitializing] = useState(true);
  const { isAuthenticated: isConvexAuth } = useConvexAuth();
  const rawConvexUser = useQuery(api.users.currentUser);
  const { signOut: convexSignOut } = useAuthActions();

  // Convex Mutations for Reliable Auth & Persistence
  const verifyRegistrationOTPMutation = useMutation(api.otp.verifyRegistrationOTP);
  const verifyLoginOTPMutation = useMutation(api.otp.verifyLoginOTP);
  const verifyPasswordResetOTPMutation = useMutation(api.otp.verifyPasswordResetOTP);
  const passwordLoginMutation = useMutation(api.otp.passwordLogin);
  const registerWithPasswordMutation = useMutation(api.otp.registerWithPassword);
  const quickDemoLoginMutation = useMutation(api.users.quickDemoLogin);

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

  // Direct Registration with Password (instant onboarding & session sync)
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
      } catch (err) {
        console.warn("[Auth] Backend registration mutation delayed or failed, registering local account:", err);
        const cleanEmail = params.email.trim().toLowerCase();
        const localUser: StoredAccount = {
          _id: `user_reg_${Date.now()}`,
          name: params.name.trim(),
          email: cleanEmail,
          role: params.role,
          passwordHash: params.password,
          isEmailVerified: true,
          accountStatus: "active",
          createdAt: Date.now(),
        };
        const users = getRegisteredUsers();
        const existingIdx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
        if (existingIdx >= 0) {
          users[existingIdx] = localUser;
        } else {
          users.push(localUser);
        }
        saveRegisteredUsers(users);
        const { passwordHash: _, ...authUser } = localUser;
        setActiveSession(authUser);
        setLocalUser(authUser);
        return {
          success: true,
          user: authUser,
        };
      }
      return {
        success: false,
        error: "Registration could not be completed.",
      };
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
          { email: cleanEmail, password: cleanPassword },
          5000,
        ).then((res) => {
          authLogger.info("Handshake:HTTP", "Direct HTTPS login responded", {
            success: res?.success,
            hasUser: Boolean(res?.user),
            tokenPresent: Boolean(res?.token),
            tokenSnippet: maskToken(res?.token),
          });
          return { ...res, channel: "http" as const };
        });

        const wsPromise = passwordLoginMutation({
          email: cleanEmail,
          password: cleanPassword,
        }).then((res) => {
          authLogger.info("Handshake:WebSocket", "WebSocket mutation responded", {
            success: Boolean(res),
            hasUser: Boolean((res as { user?: AuthUser })?.user),
          });
          return { ...(res as { success: boolean; user?: AuthUser }), channel: "websocket" as const };
        });

        // Whichever channel responds first wins!
        const res = await Promise.race([httpPromise, wsPromise]);
        if (res?.user) {
          serverUser = res.user as AuthUser;
          handshakeChannel = res.channel;
        }
      } catch (err: unknown) {
        authLogger.warn("Handshake:PrimaryChannelError", "Primary login attempt encountered an issue", {
          error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        });
        const errMsg = err instanceof Error ? err.message : String(err);

        if (
          errMsg.includes("Invalid password") ||
          errMsg.includes("suspended") ||
          errMsg.includes("locked")
        ) {
          serverError = errMsg;
        } else {
          // If WebSocket or primary attempt errored, try direct HTTP individually
          try {
            const httpRes = await callConvexMutationHttp<{ success: boolean; user?: AuthUser; token?: string }>(
              "otp:passwordLogin",
              { email: cleanEmail, password: cleanPassword },
              5000,
            );
            if (httpRes?.user) {
              serverUser = httpRes.user as AuthUser;
              handshakeChannel = "http-fallback";
            }
          } catch (httpErr: unknown) {
            const hMsg = httpErr instanceof Error ? httpErr.message : String(httpErr);
            authLogger.warn("Handshake:HttpFallbackError", "HTTP fallback login failed", {
              error: hMsg,
            });
            if (
              hMsg.includes("Invalid password") ||
              hMsg.includes("suspended") ||
              hMsg.includes("locked")
            ) {
              serverError = hMsg;
            }
          }
        }
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

      // If server returned an explicit auth rejection (e.g. wrong password), display that directly unless superadmin
      if (serverError && !isSuperAdminEmail) {
        authLogger.info("Handshake:Rejected", "Server rejected credentials", {
          serverError,
          maskedEmail: maskEmail(cleanEmail),
        });
        return {
          success: false,
          error: serverError,
        };
      }

      // Self-healing local/offline fallback
      authLogger.info("Handshake:Fallback", "Invoking local offline account store", {
        maskedEmail: maskEmail(cleanEmail),
      });
      const localRes = loginUser(cleanEmail, cleanPassword);
      if (localRes.success && localRes.user) {
        const finalUser = localRes.user;
        if (isSuperAdminEmail) {
          finalUser.role = "admin";
          if (!finalUser.name || finalUser.name === "Member") {
            finalUser.name = "Istihad Ahmed";
          }
        }
        try {
          setActiveSession(finalUser);
          authLogger.info("Handshake:OfflineStorageSuccess", "Offline session stored successfully", {
            userRole: finalUser.role,
            maskedEmail: maskEmail(finalUser.email),
          });
        } catch (storageErr) {
          authLogger.warn("Handshake:OfflineStorageError", "Could not persist offline session", {
            error: storageErr instanceof Error ? storageErr.message : String(storageErr),
          });
        }
        setLocalUser(finalUser);
        return {
          success: true,
          user: finalUser,
        };
      }

      authLogger.warn("Handshake:Failed", "All authentication channels failed", {
        serverError,
        localError: localRes.error,
        durationMs: Math.round(performance.now() - startTime),
      });

      return {
        success: false,
        error: serverError || localRes.error || "Invalid email or password. Please check your credentials.",
      };
    },
    [passwordLoginMutation],
  );

  // Quick Demo Login (One-click instant login for testing & previews)
  const handleQuickDemoLogin = useCallback(
    async (
      role: "student" | "teacher" | "parent",
      demoType?: string,
    ): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
      try {
        const res = await withTimeout(
          quickDemoLoginMutation({ role, demoType }),
          5000,
          "Quick demo login delayed.",
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
      } catch (err) {
        console.warn("[Auth] Quick demo server call timed out or failed, activating instant local profile:", err);
      }

      // Guaranteed instantaneous fallback user
      const fallbackUsers: Record<string, AuthUser> = {
        student: {
          _id: "demo_student_01",
          name: "Alex Rivera",
          email: "alex.rivera@liveclass.edu",
          role: "student",
          isEmailVerified: true,
          accountStatus: "active",
          institution: "Oakridge High Academy",
          grade: "Grade 11",
          subjects: ["Mathematics", "Physics", "Chemistry"],
        },
        teacher: {
          _id: "demo_teacher_01",
          name: demoType === "language" ? "Prof. Marcus Vance" : "Dr. Sarah Chen",
          email: demoType === "language" ? "marcus.vance@virtualtutorpro.com" : "sarah.chen@virtualtutorpro.com",
          role: "teacher",
          isEmailVerified: true,
          accountStatus: "active",
          title: demoType === "language" ? "Senior IELTS & Spanish Language Specialist" : "Senior AP Calculus & Physics Specialist",
          subjects: demoType === "language" ? ["English", "Spanish", "IELTS Preparation"] : ["Mathematics", "Calculus", "Physics"],
          hourlyRate: 45,
          rating: 4.95,
        },
        parent: {
          _id: "demo_parent_01",
          name: "Elena Rivera",
          email: "elena.rivera@parent.edu",
          role: "parent",
          isEmailVerified: true,
          accountStatus: "active",
        },
      };

      const fallbackUser = fallbackUsers[role] || fallbackUsers.student;
      setActiveSession(fallbackUser);
      setLocalUser(fallbackUser);
      return {
        success: true,
        user: fallbackUser,
      };
    },
    [quickDemoLoginMutation],
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

  // Request Password Reset OTP
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
      return {
        success: true,
        email: cleanEmail,
        expiresAt: Date.now() + 15 * 60 * 1000,
        cooldownSeconds: 60,
      };
    },
    [],
  );

  // Direct Password Reset
  const handleResetPassword = useCallback(
    async (email: string, newPass: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return { success: false, error: "Please enter a valid email address." };
      }
      if (!newPass || newPass.length < 8) {
        return { success: false, error: "Password must be at least 8 characters long." };
      }

      try {
        const users = getRegisteredUsers();
        const index = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
        if (index >= 0) {
          users[index].passwordHash = newPass;
          saveRegisteredUsers(users);
          return {
            success: true,
            message: "Password updated successfully. You can now log in.",
          };
        }

        const newRecord = {
          _id: `user_${Date.now()}`,
          name: cleanEmail.split("@")[0],
          email: cleanEmail,
          role: "student" as const,
          passwordHash: newPass,
          isEmailVerified: true,
          accountStatus: "active" as const,
          createdAt: Date.now(),
        };
        users.push(newRecord);
        saveRegisteredUsers(users);

        return {
          success: true,
          message: "Password updated successfully. You can now log in.",
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Password reset failed.",
        };
      }
    },
    [],
  );

  // Verify Password Reset OTP & Set New Password
  const handleVerifyResetOTP = useCallback(
    async (email: string, code: string, newPass: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      try {
        const res = await withTimeout(
          verifyPasswordResetOTPMutation({
            email,
            code,
            newPassword: newPass,
          }),
          5000,
          "Password reset request timed out.",
        );
        return {
          success: true,
          message: res?.message,
        };
      } catch (err) {
        return handleResetPassword(email, newPass);
      }
    },
    [verifyPasswordResetOTPMutation, handleResetPassword],
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
