import { action } from "./_generated/server";
import { v } from "convex/values";

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_MIN_SCORE = 0.5;

interface RecaptchaVerifyResponse {
  success: boolean;
  score: number;
  action: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export const verify = action({
  args: {
    token: v.string(),
    expectedAction: v.string(),
  },
  handler: async (_ctx, args) => {
    // If no secret key is configured, skip verification (dev/staging safety)
    if (!RECAPTCHA_SECRET_KEY) {
      console.warn("[recaptcha] RECAPTCHA_SECRET_KEY not set — skipping verification");
      return { success: true, score: 1.0, skipped: true };
    }

    if (!args.token) {
      throw new Error("Missing verification token.");
    }

    try {
      const response = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: RECAPTCHA_SECRET_KEY,
            response: args.token,
          }).toString(),
        },
      );

      if (!response.ok) {
        throw new Error("Could not reach verification service.");
      }

      const data: RecaptchaVerifyResponse = await response.json();

      if (!data.success) {
        throw new Error("Verification failed.");
      }

      if (data.score < RECAPTCHA_MIN_SCORE) {
        throw new Error("Verification failed. Please try again.");
      }

      if (data.action !== args.expectedAction) {
        throw new Error("Verification failed. Please try again.");
      }

      return { success: true, score: data.score };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Verification failed")
      ) {
        throw error;
      }
      throw new Error(
        "We couldn't verify your request right now. Please try again.",
      );
    }
  },
});
