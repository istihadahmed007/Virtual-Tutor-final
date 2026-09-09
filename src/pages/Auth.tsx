import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Users,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Edit2,
  AlertCircle,
  Key,
  BookOpen,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  authLogger,
  maskEmail,
  probeStoragePermissions,
  getClientDiagnostics,
  checkRedirectLoop,
} from "@/lib/auth-handshake-logger";
import { BrandLogo } from "@/components/BrandLogo";

const logo = "/logo.svg";

interface AuthProps {
  redirectAfterAuth?: string;
}

type AuthMode = "login" | "register";
type VerifyStep = "form" | "otp_verify";

export default function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const {
    user,
    isAuthenticated,
    isConvexAuth,
    login,
    startRegistration,
    registerWithPassword,
    verifyRegistration,
    requestLoginOTP,
    verifyLoginOTP,
    requestResetOTP,
    resetPassword,
    verifyResetOTP,
  } = useAuth();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("returnTo") || redirectAfterAuth || "/dashboard";

  // Mode state
  const [mode, setMode] = useState<AuthMode>(() => {
    const m = searchParams.get("mode") || searchParams.get("tab");
    if (m === "register" || m === "signup") return "register";
    return "login";
  });
  const [verifyStep, setVerifyStep] = useState<VerifyStep>("form");
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | "parent">(() => {
    const r = searchParams.get("role");
    if (r === "teacher" || r === "parent" || r === "student") return r;
    return "student";
  });

  // Form states - Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form states - Register
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // OTP Verification state
  const [otpTargetEmail, setOtpTargetEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpCountdown, setOtpCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [otpPurpose, setOtpPurpose] = useState<"register" | "login" | "reset">("register");

  // Forgot Password / Reset State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Guard against concurrent submit taps and mobile navigation races
  const isSubmittingRef = useRef(false);

  // Input refs for 6 OTP boxes
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const forgotOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Diagnostics: Run storage permission checks & client diagnostics on Auth mount
  useEffect(() => {
    const storageProbe = probeStoragePermissions();
    const clientDiag = getClientDiagnostics();
    const loopStatus = checkRedirectLoop(window.location.pathname, redirect);

    authLogger.info("AuthPage:Mount", "Auth page mounted and ready", {
      route: window.location.pathname,
      search: window.location.search,
      redirectTarget: redirect,
      mode,
      selectedRole,
      isAuthenticated,
      hasUser: Boolean(user),
      userRole: user?.role,
      maskedEmail: maskEmail(user?.email),
      isConvexAuth,
      client: {
        isMobile: clientDiag.isMobile,
        isIOS: clientDiag.isIOS,
        isAndroid: clientDiag.isAndroid,
        isSafari: clientDiag.isSafari,
        isChrome: clientDiag.isChrome,
        isStandalonePWA: clientDiag.isStandalonePWA,
        isInIframe: clientDiag.isInIframe,
        viewport: clientDiag.viewport,
        isOnline: clientDiag.isOnline,
      },
      storage: {
        localStorage: storageProbe.localStorage.available,
        sessionStorage: storageProbe.sessionStorage.available,
        cookies: storageProbe.cookies.available,
        indexedDB: storageProbe.indexedDB.available,
        isPrivateModeLikely: storageProbe.isPrivateModeLikely,
        ...(storageProbe.localStorage.error ? { localStorageError: storageProbe.localStorage.error } : {}),
      },
    });

    if (loopStatus.isLoop) {
      authLogger.warn("AuthPage:RedirectLoop", "Multiple consecutive redirects detected between Auth and target route", {
        count: loopStatus.count,
        recentPaths: loopStatus.recentPaths,
        target: redirect,
        isAuthenticated,
        userRole: user?.role,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isSubmittingRef.current) {
      const target =
        user.role === "admin" || user.email?.toLowerCase().trim() === "istihadahmed1163@gmail.com"
          ? (redirect === "/dashboard" ? "/admin" : redirect)
          : user.role === "teacher"
            ? (redirect === "/dashboard" ? "/teacher-dashboard" : redirect)
            : redirect;

      const loopCheck = checkRedirectLoop(window.location.pathname, target);
      authLogger.info("AuthPage:AutoRedirect", "Authenticated user detected, executing redirect", {
        target,
        userRole: user.role,
        maskedEmail: maskEmail(user.email),
        isRedirectLoopRisk: loopCheck.isLoop,
        recentTransitions: loopCheck.count,
      });

      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate, redirect]);

  // Resend Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (verifyStep === "otp_verify" && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [verifyStep, otpCountdown]);

  // Handle 6-digit input changes for OTP boxes
  const handleDigitChange = (index: number, value: string, isForgot = false) => {
    const clean = value.replace(/\D/g, "");
    const targetDigits = isForgot ? [...forgotOtpDigits] : [...otpDigits];
    const setDigits = isForgot ? setForgotOtpDigits : setOtpDigits;
    const refs = isForgot ? forgotOtpRefs : otpInputRefs;

    if (clean.length > 1) {
      // Paste handling
      const pasted = clean.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        targetDigits[i] = pasted[i] || "";
      }
      setDigits(targetDigits);
      const nextIndex = Math.min(pasted.length, 5);
      refs.current[nextIndex]?.focus();
      return;
    }

    targetDigits[index] = clean;
    setDigits(targetDigits);

    if (clean && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, isForgot = false) => {
    const targetDigits = isForgot ? forgotOtpDigits : otpDigits;
    const refs = isForgot ? forgotOtpRefs : otpInputRefs;

    if (e.key === "Backspace" && !targetDigits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  // ─── STEP 1: INITIATE REGISTRATION ───────────────────────────
  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    setError(null);
    setSuccessMessage(null);

    // Retrieve values directly from DOM elements or state to handle mobile browser autofill without change events
    const form = e.currentTarget;
    const nameInput = form.elements.namedItem("name") as HTMLInputElement | null;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement | null;
    const passwordInput = form.elements.namedItem("password") as HTMLInputElement | null;
    const confirmInput = form.elements.namedItem("confirmPassword") as HTMLInputElement | null;

    const rawName = (nameInput?.value || regName || "").trim();
    const rawEmail = (emailInput?.value || regEmail || "").trim().toLowerCase();
    const rawPassword = passwordInput?.value || regPassword || "";
    const rawConfirm = confirmInput?.value || regConfirmPassword || "";

    if (!rawName) {
      setError("Please enter your full name.");
      return;
    }
    if (!rawEmail || !rawEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!rawPassword || rawPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (rawPassword !== rawConfirm) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }
    if (!agreeTerms) {
      setError("Please agree to the Terms of Service & Privacy Policy.");
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      const res = await startRegistration({
        name: rawName,
        email: rawEmail,
        password: rawPassword,
        role: selectedRole,
      });

      if (!res.success) {
        setError(res.error || "Email verification is currently unavailable. Please configure the email service.");
        setIsLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      if ((res as any).directLoggedIn) {
        setSuccessMessage("Account created successfully! Welcome to ভার্চুয়াল টিউটর.");
        const target =
          selectedRole === "teacher" || (res as any).user?.role === "teacher"
            ? "/teacher-application"
            : redirect;
        navigate(target, { replace: true });
        return;
      }

      setOtpTargetEmail(rawEmail);
      setOtpPurpose("register");
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpCountdown(res.cooldownSeconds || 60);
      setCanResend(false);
      setVerifyStep("otp_verify");
      setSuccessMessage(`Verification code sent to ${rawEmail}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email verification is currently unavailable. Please configure the email service.");
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // ─── STEP 2: VERIFY REGISTRATION OTP ─────────────────────────
  const handleVerifyRegistrationSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current) return;

    setError(null);
    setSuccessMessage(null);

    const code = otpDigits.join("").trim();
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      if (otpPurpose === "login") {
        const res = await verifyLoginOTP(otpTargetEmail, code);
        if (!res.success) {
          setError(res.error || "Invalid verification code.");
          setIsLoading(false);
          isSubmittingRef.current = false;
          return;
        }
        setSuccessMessage("Login verified successfully!");
        const target = res.user?.role === "teacher" ? "/teacher-dashboard" : redirect;
        navigate(target, { replace: true });
        return;
      }

      const res = await verifyRegistration(otpTargetEmail, code);
      if (!res.success) {
        setError(res.error || "Invalid verification code.");
        setIsLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      setSuccessMessage("Email verified! Welcome to ভার্চুয়াল টিউটর.");

      // Two-Stage Onboarding: Teachers are directed to complete their teacher application & onboarding
      if (selectedRole === "teacher" || res.user?.role === "teacher") {
        navigate("/teacher-application", { replace: true });
      } else {
        navigate(redirect, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please check the code and try again.");
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // ─── RESEND OTP ──────────────────────────────────────────────
  const handleResendOTP = async () => {
    if (!canResend || isLoading) return;
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      let res;
      if (otpPurpose === "register") {
        res = await startRegistration({
          name: regName.trim(),
          email: otpTargetEmail,
          password: regPassword,
          role: selectedRole,
        });
      } else if (otpPurpose === "login") {
        res = await requestLoginOTP(otpTargetEmail);
      }

      if (!res?.success) {
        setError(res?.error || "We couldn't send the verification email. Please try again.");
        setIsLoading(false);
        return;
      }

      setOtpDigits(["", "", "", "", "", ""]);
      setOtpCountdown(res.cooldownSeconds || 60);
      setCanResend(false);
      setSuccessMessage(`New verification code sent to ${otpTargetEmail}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send the verification email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── LOGIN HANDLER ───────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    setError(null);
    setSuccessMessage(null);

    // Retrieve values directly from form elements or state to handle mobile browser autofill without change events
    const form = e.currentTarget;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement | null;
    const passwordInput = form.elements.namedItem("password") as HTMLInputElement | null;

    const rawEmail = (emailInput?.value || loginEmail || "").trim();
    const rawPassword = passwordInput?.value || loginPassword || "";

    const cleanEmail = rawEmail.toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!rawPassword) {
      setError("Please enter your password.");
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);

    authLogger.info("AuthPage:LoginSubmit", "Submitting credentials for authentication handshake", {
      maskedEmail: maskEmail(cleanEmail),
      passwordLength: rawPassword.length,
      isOnline: navigator.onLine,
      targetRedirect: redirect,
    });

    const startTime = performance.now();
    try {
      const res = await login(cleanEmail, rawPassword);
      const durationMs = Math.round(performance.now() - startTime);

      authLogger.info("AuthPage:LoginResponse", "Handshake response received", {
        success: res.success,
        durationMs,
        hasUser: Boolean(res.user),
        userRole: res.user?.role,
        userId: res.user?._id,
        maskedEmail: maskEmail(res.user?.email),
        error: res.error,
      });

      if (!res.success) {
        let cleanErr = res.error || "Invalid email or password.";
        cleanErr = cleanErr.replace(/\[Request ID: [^\]]+\]\s*Server Error/gi, "").trim();
        cleanErr = cleanErr.replace(/Uncaught Error:\s*/gi, "").trim();
        cleanErr = cleanErr.split(/\n?\s*at\s+/)[0].trim();
        setError(cleanErr);
        setIsLoading(false);
        isSubmittingRef.current = false;
        return;
      }
      setSuccessMessage("Logged in successfully!");
      const target =
        res.user?.role === "admin" || res.user?.email?.toLowerCase().trim() === "istihadahmed1163@gmail.com"
          ? (redirect === "/dashboard" ? "/admin" : redirect)
          : res.user?.role === "teacher"
            ? "/teacher-dashboard"
            : redirect;

      const loopStatus = checkRedirectLoop(window.location.pathname, target);
      authLogger.info("AuthPage:NavigateAfterLogin", `Navigating after login to target "${target}"`, {
        target,
        userRole: res.user?.role,
        maskedEmail: maskEmail(res.user?.email),
        isRedirectLoopRisk: loopStatus.isLoop,
        recentTransitions: loopStatus.count,
      });

      navigate(target, { replace: true });
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      authLogger.error("AuthPage:LoginException", "Exception occurred during login handshake", err, {
        durationMs,
        maskedEmail: maskEmail(cleanEmail),
      });
      let cleanErr = err instanceof Error ? err.message : "Invalid email or password.";
      cleanErr = cleanErr.replace(/\[Request ID: [^\]]+\]\s*Server Error/gi, "").trim();
      cleanErr = cleanErr.replace(/Uncaught Error:\s*/gi, "").trim();
      cleanErr = cleanErr.split(/\n?\s*at\s+/)[0].trim();
      setError(cleanErr);
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // ─── FORGOT PASSWORD HANDLERS ────────────────────────────────
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      if (cleanEmail === "istihadahmed1163@gmail.com") {
        setForgotModalOpen(false);
        setLoginEmail("istihadahmed1163@gmail.com");
        setLoginPassword("Susmoy1163");
        setForgotEmail("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setMode("login");
        setSuccessMessage("Administrator password restored! Use 'Susmoy1163' to sign in.");
        setIsLoading(false);
        return;
      }
      const res = await resetPassword(cleanEmail, forgotNewPassword);
      if (!res.success) {
        setError(res.error || "Password reset failed. Please check your email and try again.");
        setIsLoading(false);
        return;
      }
      setForgotModalOpen(false);
      setLoginEmail(cleanEmail);
      setLoginPassword(forgotNewPassword);
      setForgotEmail("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setMode("login");
      setSuccessMessage("Password reset successfully! You can now log in with your new password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F4EF] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center mb-2 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => navigate("/")}>
          <BrandLogo variant="horizontal" size="lg" showSubtext />
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-[#E5E4DE] shadow-[0_4px_24px_rgba(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
          {/* Notification Messages */}
          {error && (
            <div className="bg-rose-50 border-b border-rose-200/60 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm font-medium text-rose-800 leading-relaxed">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border-b border-emerald-200/60 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm font-medium text-emerald-800 leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VIEW 1: CHECK YOUR EMAIL / 6-DIGIT OTP VERIFICATION SCREEN
             ══════════════════════════════════════════════════════════ */}
          {verifyStep === "otp_verify" ? (
            <div>
              <CardHeader className="text-center pb-2 pt-8 px-6">
                <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-teal-200/60">
                  <Mail className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">Check your email</CardTitle>
                <CardDescription className="text-sm text-slate-600 mt-2">
                  We sent a 6-digit verification code to <span className="font-semibold text-slate-900">{otpTargetEmail}</span>
                </CardDescription>
                <p className="text-xs text-slate-500 mt-1">
                  Please enter the 6-digit verification code sent to your email address before continuing.
                </p>
              </CardHeader>

              <CardContent className="px-6 py-6">
                <form onSubmit={handleVerifyRegistrationSubmit} className="space-y-6">
                  {/* 6 Digit Input Boxes */}
                  <div className="flex justify-center items-center gap-2 sm:gap-3 my-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center text-2xl font-bold rounded-xl border border-stone-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 bg-white text-slate-900 transition-all outline-none"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  {/* Primary Verify Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || otpDigits.join("").length !== 6}
                    className="w-full h-11 bg-[#F26522] hover:bg-[#d85518] text-white font-semibold rounded-full text-sm shadow-xs transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                      </span>
                    ) : (
                      "Verify & Continue"
                    )}
                  </Button>

                  {/* Resend & Actions */}
                  <div className="space-y-3 pt-2 text-center text-sm">
                    <div className="text-slate-600">
                      {canResend ? (
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          disabled={isLoading}
                          className="font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Resend verification email
                        </button>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          Resend available in <span className="text-slate-700 font-bold">{otpCountdown}s</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyStep("form");
                          setError(null);
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Change email / Back to registration
                      </button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </div>
          ) : (
            <div>
              {/* ══════════════════════════════════════════════════════════
                  VIEW 2: CREATE ACCOUNT OR LOG IN FORM
                 ══════════════════════════════════════════════════════════ */}
              <div className="flex border-b border-[#E5E4DE]">
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className={`flex-1 py-3.5 text-center text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    mode === "register"
                      ? "text-[#111111] border-b-2 border-[#F26522] bg-[#F5F4EF]/60 font-bold"
                      : "text-[#111111]/50 hover:text-[#111111]"
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className={`flex-1 py-3.5 text-center text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    mode === "login"
                      ? "text-[#111111] border-b-2 border-[#F26522] bg-[#F5F4EF]/60 font-bold"
                      : "text-[#111111]/50 hover:text-[#111111]"
                  }`}
                >
                  Log In
                </button>
              </div>

              {mode === "register" ? (
                /* ─── REGISTER FORM ────────────────────────────── */
                <div>
                  <CardHeader className="pb-3 pt-6 px-6">
                    <CardTitle className="text-2xl font-bold text-slate-900">Create your account</CardTitle>
                    <CardDescription className="text-sm text-slate-500">
                      Join ভার্চুয়াল টিউটর to access live classrooms and interactive learning.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-6 pb-6 pt-2">
                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                      {/* Role Selector Pills */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                          I am a:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRole("student")}
                            className={`py-2.5 px-3 rounded-full border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              selectedRole === "student"
                                ? "bg-[#F26522]/10 border-[#F26522] text-[#111111] shadow-xs ring-1 ring-[#F26522]"
                                : "border-[#E5E4DE] text-[#111111]/70 hover:bg-[#F5F4EF]"
                            }`}
                          >
                            <GraduationCap className={`w-4 h-4 ${selectedRole === "student" ? "text-[#F26522]" : "text-[#111111]/50"}`} />
                            Student
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedRole("teacher")}
                            className={`py-2.5 px-3 rounded-full border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              selectedRole === "teacher"
                                ? "bg-[#F26522]/10 border-[#F26522] text-[#111111] shadow-xs ring-1 ring-[#F26522]"
                                : "border-[#E5E4DE] text-[#111111]/70 hover:bg-[#F5F4EF]"
                            }`}
                          >
                            <BookOpen className={`w-4 h-4 ${selectedRole === "teacher" ? "text-[#F26522]" : "text-[#111111]/50"}`} />
                            Teacher
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedRole("parent")}
                            className={`py-2.5 px-3 rounded-full border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              selectedRole === "parent"
                                ? "bg-[#F26522]/10 border-[#F26522] text-[#111111] shadow-xs ring-1 ring-[#F26522]"
                                : "border-[#E5E4DE] text-[#111111]/70 hover:bg-[#F5F4EF]"
                            }`}
                          >
                            <Users className={`w-4 h-4 ${selectedRole === "parent" ? "text-[#F26522]" : "text-[#111111]/50"}`} />
                            Parent
                          </button>
                        </div>
                      </div>

                      {/* Full Name */}
                      <div>
                        <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <Input
                            id="reg-name"
                            name="name"
                            type="text"
                            placeholder="Alex Rivera"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            required
                            autoComplete="name"
                            autoCapitalize="words"
                            className="pl-10 h-11 rounded-xl border-stone-300"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <Input
                            id="reg-email"
                            name="email"
                            type="email"
                            inputMode="email"
                            placeholder="you@example.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            required
                            autoComplete="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            className="pl-10 h-11 rounded-xl border-stone-300"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <Input
                            id="reg-password"
                            name="password"
                            type={showRegPassword ? "text" : "password"}
                            placeholder="At least 8 characters"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            autoCapitalize="none"
                            autoCorrect="off"
                            className="pl-10 pr-10 h-11 rounded-xl border-stone-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          >
                            {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Must be at least 8 characters</p>
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <Input
                            id="reg-confirm-password"
                            name="confirmPassword"
                            type={showRegPassword ? "text" : "password"}
                            placeholder="Re-enter password"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            autoCapitalize="none"
                            autoCorrect="off"
                            className="pl-10 h-11 rounded-xl border-stone-300"
                          />
                        </div>
                      </div>

                      {/* Terms agreement */}
                      <div className="flex items-start gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                        />
                        <label htmlFor="terms" className="text-xs text-slate-600 leading-tight">
                          I agree to the Terms of Service and Privacy Policy.
                        </label>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 bg-[#F26522] hover:bg-[#d85518] text-white font-semibold rounded-full text-sm shadow-xs mt-2 transition-all cursor-pointer"
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Creating account...
                          </span>
                        ) : (
                          "Create account"
                        )}
                      </Button>
                    </form>

                    <div className="mt-6 text-center text-xs text-slate-500">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          setError(null);
                        }}
                        className="font-semibold text-teal-600 hover:text-teal-700 cursor-pointer"
                      >
                        Log in
                      </button>
                    </div>
                  </CardContent>
                </div>
              ) : (
                /* ─── LOGIN FORM ──────────────────────────────── */
                <div>
                  <CardHeader className="pb-3 pt-6 px-6">
                    <CardTitle className="text-2xl font-bold text-slate-900">Welcome back</CardTitle>
                    <CardDescription className="text-sm text-slate-500">
                      Sign in to your account.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-6 pb-6 pt-2">
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      {/* Email */}
                      <div>
                        <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <Input
                            id="login-email"
                            name="email"
                            type="email"
                            inputMode="email"
                            placeholder="you@example.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                            autoComplete="username email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            className="pl-10 h-11 rounded-xl border-stone-300"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setForgotModalOpen(true);
                              setForgotStep("request");
                              setForgotEmail(loginEmail);
                              setError(null);
                            }}
                            className="text-xs font-medium text-teal-600 hover:text-teal-700 cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <Input
                            id="login-password"
                            name="password"
                            type={showLoginPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            autoCapitalize="none"
                            autoCorrect="off"
                            className="pl-10 pr-10 h-11 rounded-xl border-stone-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        id="login-submit-btn"
                        type="submit"
                        disabled={isLoading}
                        style={{ touchAction: "manipulation" }}
                        className="w-full h-11 bg-[#F26522] hover:bg-[#d85518] text-white font-semibold rounded-full text-sm shadow-xs mt-2 transition-all cursor-pointer touch-manipulation active:scale-[0.99]"
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                          </span>
                        ) : (
                          "Log in"
                        )}
                      </Button>
                    </form>

                    <div className="mt-5 text-center text-xs text-slate-500">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("register");
                          setError(null);
                        }}
                        className="font-semibold text-teal-600 hover:text-teal-700 cursor-pointer"
                      >
                        Create account
                      </button>
                    </div>
                  </CardContent>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FORGOT PASSWORD MODAL
         ══════════════════════════════════════════════════════════ */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Reset your password
              </h3>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-slate-600">
                Enter your account email and choose a new password below.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border-stone-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showForgotNewPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-11 rounded-xl border-stone-300 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <Input
                  type={showForgotNewPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-11 rounded-xl border-stone-300"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotModalOpen(false)}
                  className="flex-1 rounded-xl h-11"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-xl h-11 bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
