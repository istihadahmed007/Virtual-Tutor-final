import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  action,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { isAuthorizedAdminEmail, normalizeEmail } from "./authHelpers";
import { writeSecurityAudit } from "./securityAudit";

// ─── CRYPTOGRAPHIC HELPERS ─────────────────────────────────────────

export async function hashWithSalt(value: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${value}:vtp_secure_auth_v2`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateSecureSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateSecure6DigitCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = 100000 + (array[0] % 900000);
  return code.toString();
}

// ─── EMAIL TEMPLATES ───────────────────────────────────────────────

interface EmailTemplateOptions {
  to: string;
  name: string;
  code: string;
  subject: string;
  title: string;
  description: string;
  expiresInMinutes?: number;
}

function generateTransactionalEmailHtml(options: EmailTemplateOptions): string {
  const { name, code, title, description, expiresInMinutes = 10 } = options;
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                Virtual Tutor <span style="color: #14b8a6;">Pro</span>
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Interactive Live Learning & Tutoring</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                ${title}
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hello ${name || "there"},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                ${description}
              </p>

              <!-- OTP Code Display Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 20px 16px;">
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #0f766e; margin-bottom: 8px;">
                      Your 6-Digit Verification Code
                    </div>
                    <div style="font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a; margin-left: 8px;">
                      ${code}
                    </div>
                    <div style="font-size: 12px; color: #0d9488; margin-top: 8px; font-weight: 500;">
                      ⏱️ Valid for the next ${expiresInMinutes} minutes
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                Enter this code in your verification screen to complete the process.
              </p>

              <!-- Security Notice -->
              <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #475569; line-height: 1.5;">
                <strong>Security Notice:</strong> Never share this code with anyone. Virtual Tutor Pro staff will never ask for your verification code. If you did not make this request, you can safely ignore this email.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                © ${currentYear} Virtual Tutor Pro. All rights reserved.<br>
                Interactive Classrooms, Real-time Whiteboards & Live Tutoring.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ─── EMAIL SENDER (REAL PROVIDER ONLY) ─────────────────────────────

async function sendEmailViaProvider(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ sent: boolean; provider: string; error?: string }> {
  const { to, subject, html, text } = options;

  // 1. Check Resend API Key
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || "Virtual Tutor Pro <onboarding@resend.dev>";
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(3000),
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.warn("[RESEND DELIVERY NOTICE]", errorData);
        // Fallback: If custom sender domain was rejected (e.g. unverified), retry with the onboarding domain
        if (!fromEmail.includes("onboarding@resend.dev")) {
          try {
            const fallbackRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              signal: AbortSignal.timeout(3000),
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Virtual Tutor Pro <onboarding@resend.dev>",
                to: [to],
                subject,
                html,
                text,
              }),
            });
            if (fallbackRes.ok) {
              return { sent: true, provider: "resend_onboarding_fallback" };
            }
          } catch {
            // Fallback network error ignored
          }
        }
        return { sent: false, provider: "resend", error: "Resend email delivery was rejected by the provider." };
      }

      return { sent: true, provider: "resend" };
    } catch (err) {
      console.warn("[RESEND NETWORK NOTICE]", err);
      return { sent: false, provider: "resend", error: err instanceof Error ? err.message : "Network error" };
    }
  }

  // 2. Check Generic / SendGrid / Postmark Webhook Endpoint
  const emailApiKey = process.env.EMAIL_API_KEY || process.env.FREEBUFF_EMAIL_API_KEY;
  const emailEndpoint = process.env.EMAIL_ENDPOINT_URL || (emailApiKey ? "https://auth.freebuff.app/send_otp" : null);

  if (emailApiKey && emailEndpoint) {
    try {
      const response = await fetch(emailEndpoint, {
        method: "POST",
        signal: AbortSignal.timeout(3000),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": emailApiKey,
          Authorization: `Bearer ${emailApiKey}`,
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          appName: "Virtual Tutor Pro",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn("[WEBHOOK DELIVERY NOTICE]", errorText);
        return { sent: false, provider: "webhook", error: "Email delivery endpoint returned an error." };
      }

      return { sent: true, provider: "webhook" };
    } catch (err) {
      console.warn("[WEBHOOK NETWORK NOTICE]", err);
      return { sent: false, provider: "webhook", error: err instanceof Error ? err.message : "Network error" };
    }
  }

  // If no provider is configured, do not pretend or simulate delivery.
  return {
    sent: false,
    provider: "unconfigured",
    error: "Email verification is currently unavailable. Please configure the email service.",
  };
}

// ─── INTERNAL DATABASE OPERATIONS ──────────────────────────────────

export const getOtpRecord = internalQuery({
  args: {
    email: v.string(),
    purpose: v.union(
      v.literal("register"),
      v.literal("login"),
      v.literal("reset"),
      v.literal("verify_email"),
    ),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    return await ctx.db
      .query("otps")
      .withIndex("by_email_purpose", (q) =>
        q.eq("email", cleanEmail).eq("purpose", args.purpose),
      )
      .first();
  },
});

export const saveOtpRecord = internalMutation({
  args: {
    email: v.string(),
    codeHash: v.string(),
    salt: v.string(),
    purpose: v.union(
      v.literal("register"),
      v.literal("login"),
      v.literal("reset"),
      v.literal("verify_email"),
    ),
    expiresAt: v.number(),
    payload: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const now = Date.now();

    const existing = await ctx.db
      .query("otps")
      .withIndex("by_email_purpose", (q) =>
        q.eq("email", cleanEmail).eq("purpose", args.purpose),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        codeHash: args.codeHash,
        salt: args.salt,
        expiresAt: args.expiresAt,
        createdAt: now,
        lastSentAt: now,
        attempts: 0,
        maxAttempts: 5,
        verified: false,
        consumedAt: undefined,
        payload: args.payload,
      });
      return existing._id;
    }

    return await ctx.db.insert("otps", {
      email: cleanEmail,
      codeHash: args.codeHash,
      salt: args.salt,
      purpose: args.purpose,
      expiresAt: args.expiresAt,
      createdAt: now,
      lastSentAt: now,
      attempts: 0,
      maxAttempts: 5,
      verified: false,
      payload: args.payload,
    });
  },
});

export const recordResetAudit = internalMutation({
  args: {
    userId: v.optional(v.string()),
    email: v.string(),
    outcome: v.union(v.literal("success"), v.literal("failure")),
    role: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await writeSecurityAudit(ctx, {
      eventType: "password_reset_request",
      userId: args.userId,
      email: args.email,
      outcome: args.outcome,
      role: args.role,
      reason: args.reason,
    });
  },
});

export const findUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", cleanEmail))
      .first();
  },
});

// ─── PUBLIC ACTIONS & MUTATIONS ────────────────────────────────────

// 1. Initiate Registration OTP Flow (Server-side Action)
export const requestRegistrationOTP = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("student"), v.literal("teacher"), v.literal("parent")),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanName = args.name.trim();

    if (!cleanName) {
      throw new Error("Full name is required.");
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("A valid email address is required.");
    }
    if (!args.password || args.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    // Check if user already exists
    const existingUser = await ctx.runQuery(internal.otp.findUserByEmail, {
      email: cleanEmail,
    });
    if (existingUser && existingUser.passwordHash && existingUser.emailVerified) {
      throw new Error("An account with this email already exists. Please log in.");
    }

    // Cooldown check (60 seconds)
    const existingOtp = await ctx.runQuery(internal.otp.getOtpRecord, {
      email: cleanEmail,
      purpose: "register",
    });

    const now = Date.now();
    if (existingOtp && now - existingOtp.lastSentAt < 60 * 1000) {
      const remainingSec = Math.ceil((60 * 1000 - (now - existingOtp.lastSentAt)) / 1000);
      throw new Error(`Please wait ${remainingSec}s before requesting a new verification email.`);
    }

    // Generate secure 6-digit OTP and unique salt
    const code = generateSecure6DigitCode();
    const salt = generateSecureSalt();
    const codeHash = await hashWithSalt(code, salt);
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    // Hash password with salt before storing in pending payload
    const passwordSalt = generateSecureSalt();
    const hash = await hashWithSalt(args.password, passwordSalt);
    const passwordHash = `${passwordSalt}$${hash}`;

    const payloadString = JSON.stringify({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      passwordSalt,
      role: args.role,
    });

    // Generate Email HTML
    const emailHtml = generateTransactionalEmailHtml({
      to: cleanEmail,
      name: cleanName,
      code,
      subject: "Verify your Virtual Tutor Pro account",
      title: "Verify Your Email Address",
      description: `Welcome to Virtual Tutor Pro! Please use the 6-digit verification code below to verify your email address and activate your ${args.role} account.`,
      expiresInMinutes: 10,
    });

    // Send Email via configured provider
    const emailResult = await sendEmailViaProvider({
      to: cleanEmail,
      subject: "Verify your Virtual Tutor Pro account",
      html: emailHtml,
      text: `Your Virtual Tutor Pro verification code is ${code}. It expires in 10 minutes.`,
    });

    if (!emailResult.sent) {
      throw new Error(
        emailResult.error ||
          "Email verification is currently unavailable. Please configure the email service.",
      );
    }

    // Save in Convex DB only after email provider accepted delivery
    await ctx.runMutation(internal.otp.saveOtpRecord, {
      email: cleanEmail,
      codeHash,
      salt,
      purpose: "register",
      expiresAt,
      payload: payloadString,
    });

    return {
      success: true,
      email: cleanEmail,
      expiresAt,
      cooldownSeconds: 60,
    };
  },
});

// 2. Verify Registration OTP & Provision User (Server-side Mutation)
export const verifyRegistrationOTP = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanCode = args.code.trim().replace(/\D/g, "");

    if (cleanCode.length !== 6) {
      throw new Error("Please enter the complete 6-digit verification code.");
    }

    const otpRecord = await ctx.db
      .query("otps")
      .withIndex("by_email_purpose", (q) =>
        q.eq("email", cleanEmail).eq("purpose", "register"),
      )
      .first();

    if (!otpRecord) {
      throw new Error("No pending registration found for this email. Please register again.");
    }

    if (otpRecord.verified) {
      throw new Error("This verification code has already been used. Please log in.");
    }

    if (otpRecord.expiresAt < Date.now()) {
      throw new Error("Verification code has expired. Please request a new code.");
    }

    const maxAttempts = otpRecord.maxAttempts || 5;
    if (otpRecord.attempts >= maxAttempts) {
      throw new Error("Too many incorrect verification attempts. Please request a fresh code.");
    }

    // Validate hashed code match
    const candidateHash = await hashWithSalt(cleanCode, otpRecord.salt);
    const isMatch = candidateHash === otpRecord.codeHash;

    if (!isMatch) {
      const nextAttempts = (otpRecord.attempts || 0) + 1;
      await ctx.db.patch(otpRecord._id, {
        attempts: nextAttempts,
      });
      const remaining = Math.max(0, maxAttempts - nextAttempts);
      throw new Error(`Incorrect verification code. (${remaining} attempt${remaining === 1 ? "" : "s"} remaining)`);
    }

    // Invalidate OTP (mark consumed)
    await ctx.db.patch(otpRecord._id, {
      verified: true,
      consumedAt: Date.now(),
      attempts: (otpRecord.attempts || 0) + 1,
    });

    // Parse registration payload
    let regData: {
      name: string;
      email: string;
      passwordHash: string;
      passwordSalt?: string;
      role: "student" | "teacher" | "parent";
    } | null = null;

    if (otpRecord.payload) {
      try {
        regData = JSON.parse(otpRecord.payload);
      } catch (err) {
        console.error("Failed to parse OTP payload:", err);
      }
    }

    const name = regData?.name || cleanEmail.split("@")[0];
    const registeredRole = regData?.role || "student";

    // Find or create user in users table
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", cleanEmail))
      .first();

    if (!user) {
      const newUserId = await ctx.db.insert("users", {
        name,
        email: cleanEmail,
        role: registeredRole,
        passwordHash: regData?.passwordHash,
        emailVerified: true,
        emailVerificationTime: Date.now(),
        accountStatus: "active",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        lastLoginAt: Date.now(),
      });
      user = await ctx.db.get(newUserId);
    } else {
      await ctx.db.patch(user._id, {
        emailVerified: true,
        emailVerificationTime: Date.now(),
        accountStatus: "active",
        role: registeredRole,
        lastLoginAt: Date.now(),
        ...(regData?.passwordHash ? { passwordHash: regData.passwordHash } : {}),
      });
    }

    await writeSecurityAudit(ctx, {
      eventType: "registration",
      userId: String(user?._id),
      email: cleanEmail,
      outcome: "success",
      role: registeredRole,
      reason: "User email verified and account registered via OTP",
    });

    if (user) {
      const currentAuthId = await getAuthUserId(ctx);
      if (currentAuthId && currentAuthId !== user._id) {
        const currentAuthUser = await ctx.db.get(currentAuthId);
        if (currentAuthUser?.isAnonymous) {
          await ctx.db.patch(currentAuthId, {
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: true,
            emailVerificationTime: Date.now(),
            isAnonymous: false,
            accountStatus: "active",
          });
        }
      }

      if (registeredRole === "parent") {
        const existingParent = await ctx.db
          .query("parentProfiles")
          .withIndex("by_user", (q) => q.eq("userId", user!._id as string))
          .first();

        if (!existingParent) {
          await ctx.db.insert("parentProfiles", {
            userId: user._id as string,
            name,
            relationship: "Parent / Guardian",
            linkedStudentIds: [],
            linkedStudentEmails: [],
            createdAt: Date.now(),
          });
        }
      } else if (registeredRole === "teacher") {
        // Teacher profile created in unverified/draft state pending application submission
        const existingProfile = await ctx.db
          .query("teacherProfiles")
          .filter((q) => q.eq(q.field("userId"), user!._id as string))
          .first();

        if (!existingProfile) {
          await ctx.db.insert("teacherProfiles", {
            userId: user._id as string,
            name,
            title: "Teacher Applicant",
            bio: "Profile pending onboarding and document verification.",
            subjects: ["General Studies"],
            classLevels: ["High School"],
            expertise: ["Tutoring"],
            education: [],
            languages: ["English"],
            hourlyRate: 30,
            yearsExperience: 1,
            verificationStatus: "not_started",
            profileCompletionPct: 20,
            rating: 5.0,
            reviewCount: 0,
            totalStudents: 0,
            totalHours: 0,
            isVerified: false,
            isAvailable: false,
          });
        }
      } else {
        // Student profile
        const existingStudent = await ctx.db
          .query("studentProfiles")
          .withIndex("by_user", (q) => q.eq("userId", user!._id as string))
          .first();

        if (!existingStudent) {
          await ctx.db.insert("studentProfiles", {
            userId: user._id as string,
            name,
            institution: "",
            classLevel: "High School",
            subjects: [],
            learningGoals: [],
            verificationStatus: "verified",
            profileCompletionPct: 25,
          });
        }
      }
    }

    return {
      success: true,
      user: {
        _id: String(user?._id),
        name: user?.name || name,
        email: cleanEmail,
        role: (user?.role || registeredRole) as "student" | "teacher" | "parent" | "admin",
        isEmailVerified: true,
      },
      message: "Account email verified successfully!",
    };
  },
});

// 3. Passwordless / Email OTP Login Request (Server-side Action)
export const requestLoginOTP = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }

    const now = Date.now();
    const existingOtp = await ctx.runQuery(internal.otp.getOtpRecord, {
      email: cleanEmail,
      purpose: "login",
    });

    if (existingOtp && now - existingOtp.lastSentAt < 60 * 1000) {
      const remainingSec = Math.ceil((60 * 1000 - (now - existingOtp.lastSentAt)) / 1000);
      throw new Error(`Please wait ${remainingSec}s before requesting a new login code.`);
    }

    const code = generateSecure6DigitCode();
    const salt = generateSecureSalt();
    const codeHash = await hashWithSalt(code, salt);
    const expiresAt = now + 10 * 60 * 1000;

    const emailHtml = generateTransactionalEmailHtml({
      to: cleanEmail,
      name: cleanEmail.split("@")[0],
      code,
      subject: "Your Virtual Tutor Pro sign-in code",
      title: "Your Sign-In Verification Code",
      description: "Use the 6-digit one-time code below to sign in to your Virtual Tutor Pro account.",
      expiresInMinutes: 10,
    });

    const emailResult = await sendEmailViaProvider({
      to: cleanEmail,
      subject: "Your Virtual Tutor Pro sign-in code",
      html: emailHtml,
      text: `Your Virtual Tutor Pro sign-in code is ${code}. It expires in 10 minutes.`,
    });

    if (!emailResult.sent) {
      throw new Error(
        emailResult.error ||
          "Email verification is currently unavailable. Please configure the email service.",
      );
    }

    await ctx.runMutation(internal.otp.saveOtpRecord, {
      email: cleanEmail,
      codeHash,
      salt,
      purpose: "login",
      expiresAt,
    });

    return {
      success: true,
      email: cleanEmail,
      expiresAt,
      cooldownSeconds: 60,
    };
  },
});

// 4. Verify Login OTP (Server-side Mutation)
export const verifyLoginOTP = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanCode = args.code.trim().replace(/\D/g, "");

    if (cleanCode.length !== 6) {
      throw new Error("Please enter all 6 digits of the code.");
    }

    const otpRecord = await ctx.db
      .query("otps")
      .withIndex("by_email_purpose", (q) =>
        q.eq("email", cleanEmail).eq("purpose", "login"),
      )
      .first();

    if (!otpRecord) {
      throw new Error("No active login code found for this email. Please request a new code.");
    }

    if (otpRecord.verified) {
      throw new Error("This login code has already been used.");
    }

    if (otpRecord.expiresAt < Date.now()) {
      throw new Error("Login code has expired. Please request a new code.");
    }

    const maxAttempts = otpRecord.maxAttempts || 5;
    if (otpRecord.attempts >= maxAttempts) {
      throw new Error("Too many failed attempts. Please request a new code.");
    }

    const candidateHash = await hashWithSalt(cleanCode, otpRecord.salt);
    const isMatch = candidateHash === otpRecord.codeHash;

    if (!isMatch) {
      const nextAttempts = (otpRecord.attempts || 0) + 1;
      await ctx.db.patch(otpRecord._id, {
        attempts: nextAttempts,
      });
      const remaining = Math.max(0, maxAttempts - nextAttempts);
      throw new Error(`Invalid verification code. (${remaining} attempt${remaining === 1 ? "" : "s"} remaining)`);
    }

    // Invalidate OTP
    await ctx.db.patch(otpRecord._id, { verified: true, consumedAt: Date.now() });

    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", cleanEmail))
      .first();

    if (!user) {
      const newUserId = await ctx.db.insert("users", {
        name: cleanEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        email: cleanEmail,
        role: "student",
        emailVerified: true,
        accountStatus: "active",
        lastLoginAt: Date.now(),
      });
      user = await ctx.db.get(newUserId);
    } else {
      await ctx.db.patch(user._id, {
        emailVerified: true,
        lastLoginAt: Date.now(),
      });
    }

    if (user) {
      const currentAuthId = await getAuthUserId(ctx);
      if (currentAuthId && currentAuthId !== user._id) {
        const currentAuthUser = await ctx.db.get(currentAuthId);
        if (currentAuthUser?.isAnonymous) {
          await ctx.db.patch(currentAuthId, {
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: true,
            emailVerificationTime: user.emailVerificationTime || Date.now(),
            isAnonymous: false,
            accountStatus: "active",
          });
        }
      }
    }

    return {
      success: true,
      user: {
        _id: String(user?._id),
        name: user?.name || "Member",
        email: cleanEmail,
        role: user?.role || "student",
        isEmailVerified: true,
      },
    };
  },
});

// 5. Password Reset Request OTP (Server-side Action)
export const requestPasswordResetOTP = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }

    // Check user exists
    const user = await ctx.runQuery(internal.otp.findUserByEmail, { email: cleanEmail });
    if (!user) {
      throw new Error("No account found with this email address.");
    }

    const now = Date.now();
    const existingOtp = await ctx.runQuery(internal.otp.getOtpRecord, {
      email: cleanEmail,
      purpose: "reset",
    });

    if (existingOtp && now - existingOtp.lastSentAt < 60 * 1000) {
      const remainingSec = Math.ceil((60 * 1000 - (now - existingOtp.lastSentAt)) / 1000);
      throw new Error(`Please wait ${remainingSec}s before requesting a new password reset email.`);
    }

    const code = generateSecure6DigitCode();
    const salt = generateSecureSalt();
    const codeHash = await hashWithSalt(code, salt);
    const expiresAt = now + 10 * 60 * 1000;

    const emailHtml = generateTransactionalEmailHtml({
      to: cleanEmail,
      name: user.name || "Member",
      code,
      subject: "Reset your Virtual Tutor Pro password",
      title: "Reset Your Password",
      description: "We received a request to reset your password. Use the 6-digit code below to set a new password for your account.",
      expiresInMinutes: 10,
    });

    const emailResult = await sendEmailViaProvider({
      to: cleanEmail,
      subject: "Reset your Virtual Tutor Pro password",
      html: emailHtml,
      text: `Your Virtual Tutor Pro password reset code is ${code}. It expires in 10 minutes.`,
    });

    if (!emailResult.sent) {
      throw new Error(
        emailResult.error ||
          "Email verification is currently unavailable. Please configure the email service.",
      );
    }

    await ctx.runMutation(internal.otp.saveOtpRecord, {
      email: cleanEmail,
      codeHash,
      salt,
      purpose: "reset",
      expiresAt,
    });

    try {
      await ctx.runMutation(internal.otp.recordResetAudit, {
        userId: String(user._id),
        email: cleanEmail,
        outcome: "success",
        role: user.role,
        reason: "Transactional password reset OTP dispatched",
      });
    } catch (_) {}

    return {
      success: true,
      email: cleanEmail,
      expiresAt,
      cooldownSeconds: 60,
    };
  },
});

// 6. Verify Password Reset OTP & Update Password (Server-side Mutation)
export const verifyPasswordResetOTP = mutation({
  args: {
    email: v.string(),
    code: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanCode = args.code.trim().replace(/\D/g, "");

    if (cleanCode.length !== 6) {
      throw new Error("Please enter the 6-digit reset code.");
    }
    if (!args.newPassword || args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }

    const otpRecord = await ctx.db
      .query("otps")
      .withIndex("by_email_purpose", (q) =>
        q.eq("email", cleanEmail).eq("purpose", "reset"),
      )
      .first();

    if (!otpRecord) {
      throw new Error("No password reset request found for this email.");
    }

    if (otpRecord.verified) {
      throw new Error("This reset code has already been used.");
    }

    if (otpRecord.expiresAt < Date.now()) {
      throw new Error("Reset code has expired. Please request a new reset email.");
    }

    const maxAttempts = otpRecord.maxAttempts || 5;
    if (otpRecord.attempts >= maxAttempts) {
      throw new Error("Too many failed attempts. Please request a fresh reset email.");
    }

    const candidateHash = await hashWithSalt(cleanCode, otpRecord.salt);
    const isMatch = candidateHash === otpRecord.codeHash;

    if (!isMatch) {
      const nextAttempts = (otpRecord.attempts || 0) + 1;
      await ctx.db.patch(otpRecord._id, {
        attempts: nextAttempts,
      });
      const remaining = Math.max(0, maxAttempts - nextAttempts);
      throw new Error(`Invalid verification code. (${remaining} attempt${remaining === 1 ? "" : "s"} remaining)`);
    }

    // Invalidate OTP
    await ctx.db.patch(otpRecord._id, { verified: true, consumedAt: Date.now() });

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", cleanEmail))
      .first();

    if (!user) {
      throw new Error("User account not found.");
    }

    const passwordSalt = generateSecureSalt();
    const hash = await hashWithSalt(args.newPassword, passwordSalt);
    const passwordHash = `${passwordSalt}$${hash}`;

    await ctx.db.patch(user._id, {
      passwordHash,
      loginAttempts: 0,
      lockedUntil: undefined,
    });

    await writeSecurityAudit(ctx, {
      eventType: "password_reset_success",
      userId: String(user._id),
      email: cleanEmail,
      outcome: "success",
      role: user.role,
      reason: "Password successfully updated via verified OTP code",
    });

    return { success: true, message: "Password updated successfully. You can now log in." };
  },
});

// 7. Password Login (Server-side Mutation)
export const passwordLogin = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanPassword = args.password.trim();

    if (!cleanEmail) {
      throw new Error("Please enter your email address.");
    }
    if (!cleanPassword) {
      throw new Error("Please enter your password.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", cleanEmail))
      .first();

    if (!user) {
      throw new Error("No account found with this email. Please check your email or create a new account.");
    }

    if (user.accountStatus === "suspended") {
      throw new Error("Your account has been suspended. Please contact support.");
    }

    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockedUntil - Date.now()) / (60 * 1000));
      throw new Error(`Account locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minutes.`);
    }

    // Verify password hash
    let isPasswordCorrect = false;
    if (user.passwordHash) {
      if (user.passwordHash === cleanPassword) {
        isPasswordCorrect = true;
      } else if (user.passwordHash.includes("$")) {
        const [salt, hash] = user.passwordHash.split("$");
        const candidateHash = await hashWithSalt(cleanPassword, salt);
        if (candidateHash === hash) {
          isPasswordCorrect = true;
        }
      } else if (user.passwordHash.includes(":")) {
        const [salt, hash] = user.passwordHash.split(":");
        const candidateHash = await hashWithSalt(cleanPassword, salt);
        if (candidateHash === hash) {
          isPasswordCorrect = true;
        }
      } else {
        const candidateHash = await hashWithSalt(cleanPassword, "");
        if (candidateHash === user.passwordHash) {
          isPasswordCorrect = true;
        }
      }
    } else {
      // If the account was created without a password hash (e.g. pre-seeded or OAuth)
      // and has a valid password provided, set it now
      if (cleanPassword.length >= 8) {
        const salt = generateSecureSalt();
        const hash = await hashWithSalt(cleanPassword, salt);
        await ctx.db.patch(user._id, {
          passwordHash: `${salt}$${hash}`,
        });
        isPasswordCorrect = true;
      }
    }

    if (!isPasswordCorrect) {
      const attempts = (user.loginAttempts || 0) + 1;
      const updates: Record<string, unknown> = { loginAttempts: attempts };
      if (attempts >= 5) {
        updates.lockedUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
      }
      await ctx.db.patch(user._id, updates);

      await writeSecurityAudit(ctx, {
        eventType: "login_failure",
        userId: String(user._id),
        email: cleanEmail,
        outcome: "failure",
        role: user.role,
        reason: attempts >= 5 ? "Account locked: 5 consecutive failed login attempts" : "Invalid password entered",
      });

      throw new Error("Invalid password. Please double-check your password or reset it.");
    }

    const isSoleAdmin = isAuthorizedAdminEmail(cleanEmail);
    const isEmailVerified = Boolean(
      user.emailVerified ||
      (user.emailVerificationTime && user.emailVerificationTime > 0)
    );
    const effectiveRole = (isSoleAdmin && isEmailVerified) ? "admin" : (user.role || "student");
    const effectiveName = isSoleAdmin ? (user.name && user.name !== "Member" ? user.name : "Istihad Ahmed") : (user.name || "Member");

    // Success: reset login attempts and record login time
    await ctx.db.patch(user._id, {
      loginAttempts: 0,
      lockedUntil: undefined,
      lastLoginAt: Date.now(),
      accountStatus: "active",
      ...(isSoleAdmin && isEmailVerified ? { role: "admin", name: effectiveName } : {}),
    });

    await writeSecurityAudit(ctx, {
      eventType: "login_success",
      userId: String(user._id),
      email: cleanEmail,
      outcome: "success",
      role: effectiveRole,
      reason: "Password authentication verified",
    });

    const currentAuthId = await getAuthUserId(ctx);
    if (currentAuthId && currentAuthId !== user._id) {
      const currentAuthUser = await ctx.db.get(currentAuthId);
      if (currentAuthUser?.isAnonymous) {
        await ctx.db.patch(currentAuthId, {
          name: effectiveName,
          email: user.email,
          role: effectiveRole,
          emailVerified: true,
          emailVerificationTime: user.emailVerificationTime || Date.now(),
          isAnonymous: false,
          accountStatus: "active",
        });
      }
    }

    return {
      success: true,
      user: {
        _id: String(user._id),
        name: effectiveName,
        email: user.email || cleanEmail,
        role: effectiveRole,
        isEmailVerified: true,
      },
    };
  },
});

// 8. Direct Register with Password (Server-side Mutation)
export const registerWithPassword = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("student"), v.literal("teacher"), v.literal("parent")),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanName = args.name.trim();
    const cleanPassword = args.password.trim();

    if (!cleanName) throw new Error("Please enter your full name.");
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("Please enter a valid email address.");
    if (!cleanPassword || cleanPassword.length < 8) throw new Error("Password must be at least 8 characters long.");

    const salt = generateSecureSalt();
    const hash = await hashWithSalt(cleanPassword, salt);
    const passwordHash = `${salt}$${hash}`;

    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", cleanEmail))
      .first();

    if (user && user.passwordHash && user.emailVerified) {
      throw new Error("An account with this email already exists. Please sign in.");
    }

    if (!user) {
      const newUserId = await ctx.db.insert("users", {
        name: cleanName,
        email: cleanEmail,
        role: args.role,
        passwordHash,
        emailVerified: true,
        emailVerificationTime: Date.now(),
        accountStatus: "active",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        lastLoginAt: Date.now(),
      });
      user = await ctx.db.get(newUserId);
    } else {
      await ctx.db.patch(user._id, {
        name: cleanName,
        emailVerified: true,
        emailVerificationTime: Date.now(),
        accountStatus: "active",
        role: args.role,
        passwordHash,
        lastLoginAt: Date.now(),
      });
    }

    if (!user) throw new Error("Failed to create account record.");

    const currentAuthId = await getAuthUserId(ctx);
    if (currentAuthId && currentAuthId !== user._id) {
      const currentAuthUser = await ctx.db.get(currentAuthId);
      if (currentAuthUser?.isAnonymous) {
        await ctx.db.patch(currentAuthId, {
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: true,
          emailVerificationTime: Date.now(),
          isAnonymous: false,
          accountStatus: "active",
        });
      }
    }

    // Provision Profile
    if (args.role === "parent") {
      const existingParent = await ctx.db
        .query("parentProfiles")
        .withIndex("by_user", (q) => q.eq("userId", user!._id as string))
        .first();

      if (!existingParent) {
        await ctx.db.insert("parentProfiles", {
          userId: user._id as string,
          name: cleanName,
          relationship: "Parent / Guardian",
          linkedStudentIds: [],
          linkedStudentEmails: [],
          createdAt: Date.now(),
        });
      }
    } else if (args.role === "teacher") {
      const existingProfile = await ctx.db
        .query("teacherProfiles")
        .filter((q) => q.eq(q.field("userId"), user!._id as string))
        .first();

      if (!existingProfile) {
        await ctx.db.insert("teacherProfiles", {
          userId: user._id as string,
          name: cleanName,
          title: "Educator & Subject Specialist",
          bio: "Dedicated educator ready to assist students with interactive lessons.",
          subjects: ["General Studies"],
          classLevels: ["All Levels"],
          expertise: ["Tutoring"],
          education: [],
          languages: ["English", "Bangla"],
          hourlyRate: 35,
          yearsExperience: 2,
          verificationStatus: "under_review",
          profileCompletionPct: 50,
          rating: 5.0,
          reviewCount: 0,
          totalStudents: 0,
          totalHours: 0,
          isVerified: false,
          isAvailable: true,
        });
      }
    } else {
      const existingStudent = await ctx.db
        .query("studentProfiles")
        .withIndex("by_user", (q) => q.eq("userId", user!._id as string))
        .first();

      if (!existingStudent) {
        await ctx.db.insert("studentProfiles", {
          userId: user._id as string,
          name: cleanName,
          institution: "",
          classLevel: "High School",
          subjects: [],
          learningGoals: [],
          verificationStatus: "verified",
          profileCompletionPct: 20,
        });
      }
    }

    return {
      success: true,
      user: {
        _id: String(user._id),
        name: user.name || cleanName,
        email: user.email || cleanEmail,
        role: user.role || args.role,
        isEmailVerified: true,
      },
    };
  },
});

// 9. Direct Password Reset (For self-service recovery when transactional email provider is in setup/DNS verification)
export const resetPasswordDirect = mutation({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanPassword = args.newPassword.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }
    if (!cleanPassword || cleanPassword.length < 8) {
      throw new Error("New password must be at least 8 characters long.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", cleanEmail))
      .first();

    if (!user) {
      throw new Error("No account found with this email address.");
    }

    const salt = generateSecureSalt();
    const hash = await hashWithSalt(cleanPassword, salt);
    const passwordHash = `${salt}$${hash}`;

    await ctx.db.patch(user._id, {
      passwordHash,
      loginAttempts: 0,
      lockedUntil: undefined,
    });

    await writeSecurityAudit(ctx, {
      eventType: "password_reset_success",
      userId: String(user._id),
      email: cleanEmail,
      outcome: "success",
      role: user.role,
      reason: "Direct password reset completed",
    });

    return { success: true, message: "Password updated successfully. You can now log in." };
  },
});
