import { Email } from "@convex-dev/auth/providers/Email";
import axios from "axios";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export const emailOtp = Email({
  maxAge: 60 * 10, // 10 minutes
  // Generate cryptographically secure verification code
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier, token }) {
    const email =
      typeof identifier === "string" ? identifier.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      throw new Error(
        "Unable to send verification code. Please enter a valid email address.",
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailApiKey = process.env.EMAIL_API_KEY || process.env.FREEBUFF_EMAIL_API_KEY;
    const emailEndpoint = process.env.EMAIL_ENDPOINT_URL || (emailApiKey ? "https://auth.freebuff.app/send_otp" : null);

    // 1. Try Resend API
    if (resendApiKey) {
      try {
        const fromEmail = process.env.EMAIL_FROM || "Virtual Tutor Pro <onboarding@resend.dev>";
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: "Verify your Virtual Tutor Pro account",
            html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
              <h2>Virtual Tutor Pro Verification</h2>
              <p>Your 6-digit verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px 0; color: #0f172a;">${token}</div>
              <p style="color: #64748b; font-size: 13px;">This code expires in 10 minutes. Never share this code with anyone.</p>
            </div>`,
            text: `Your Virtual Tutor Pro verification code is: ${token}. It expires in 10 minutes.`,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("[Convex Auth Email Delivery Error]", errText);
          throw new Error("We couldn't send the verification email. Please try again.");
        }
        return;
      } catch (err) {
        if (err instanceof Error && err.message.includes("We couldn't send")) throw err;
        throw new Error("We couldn't send the verification email. Please try again.");
      }
    }

    // 2. Try Generic Webhook / API
    if (emailApiKey && emailEndpoint) {
      try {
        const appName = process.env.APP_NAME || "Virtual Tutor Pro";
        await axios.post(
          emailEndpoint,
          {
            to: email,
            otp: token,
            appName,
          },
          {
            headers: {
              "x-api-key": emailApiKey,
            },
            timeout: 8000,
          },
        );
        return;
      } catch (err) {
        console.error("[Convex Auth Webhook Delivery Error]", err);
        throw new Error("We couldn't send the verification email. Please try again.");
      }
    }

    // If no real email provider is configured, fail with explicit configuration requirement
    throw new Error(
      "Email verification is currently unavailable. Please configure the email service.",
    );
  },
});

