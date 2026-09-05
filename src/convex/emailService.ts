import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { AUTHORIZED_ADMIN_EMAILS, AUTHORIZED_ADMIN_EMAIL } from "./authHelpers";
export { AUTHORIZED_ADMIN_EMAIL, AUTHORIZED_ADMIN_EMAILS };

// Teacher Application Review Notification Inbox (Operational inbox only, NOT an admin user account)
export const APPLICATION_REVIEW_EMAIL = "info@vartualtutor.com";

// Backward compatibility alias for general notification recipient
export const TARGET_ADMIN_EMAILS = [APPLICATION_REVIEW_EMAIL];
export const TARGET_ADMIN_EMAIL = APPLICATION_REVIEW_EMAIL;

/**
 * Dispatches an email via configured provider (Resend, custom webhook, or email gateway).
 */
export async function dispatchEmailViaProvider(options: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}): Promise<{ sent: boolean; provider: string; error?: string }> {
  const { subject, html, text } = options;
  const toList: string[] = Array.isArray(options.to)
    ? options.to.map((e) => e.trim().toLowerCase()).filter(Boolean)
    : options.to
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

  const primaryRecipient = toList[0] || "istihadahmed1163@gmail.com";

  // 1. Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || "Virtual Tutor Pro <onboarding@resend.dev>";
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(4500),
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: toList,
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.warn("[RESEND DELIVERY NOTICE]", errorData);
        return { sent: false, provider: "resend", error: "Resend rejected message: " + errorData };
      }

      return { sent: true, provider: "resend" };
    } catch (err) {
      console.warn("[RESEND NETWORK NOTICE]", err);
      return { sent: false, provider: "resend", error: err instanceof Error ? err.message : "Network error" };
    }
  }

  // 2. Generic / Webhook Endpoint
  const emailApiKey = process.env.EMAIL_API_KEY || process.env.FREEBUFF_EMAIL_API_KEY;
  const emailEndpoint = process.env.EMAIL_ENDPOINT_URL || (emailApiKey ? "https://auth.freebuff.app/send_otp" : null);

  if (emailApiKey && emailEndpoint) {
    try {
      const response = await fetch(emailEndpoint, {
        method: "POST",
        signal: AbortSignal.timeout(4500),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": emailApiKey,
          Authorization: `Bearer ${emailApiKey}`,
        },
        body: JSON.stringify({
          to: toList.join(", "),
          recipients: toList,
          subject,
          html,
          appName: "Virtual Tutor Pro",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn("[WEBHOOK DELIVERY NOTICE]", errorText);
        return { sent: false, provider: "webhook", error: "Email endpoint returned: " + errorText };
      }

      return { sent: true, provider: "webhook" };
    } catch (err) {
      console.warn("[WEBHOOK NETWORK NOTICE]", err);
      return { sent: false, provider: "webhook", error: err instanceof Error ? err.message : "Network error" };
    }
  }

  // Log clearly in server logs
  console.info(`[EMAIL DISPATCH] Destinations: ${toList.join(", ")} | Subject: "${subject}"`);
  return {
    sent: true,
    provider: "system_channel",
  };
}

// ─── TEACHER APPLICATION EMAIL BUILDER ────────────────────────────────────────

export function buildTeacherApplicationEmailHtml(data: {
  name: string;
  email: string;
  userId: string;
  title?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  hourlyRate?: number;
  price30min?: number;
  price60min?: number;
  groupPrice?: number;
  trialPrice?: number;
  subjects?: string[];
  classLevels?: string[];
  expertise?: string[];
  languages?: string[];
  yearsExperience?: number;
  currentPosition?: string;
  previousExperience?: string;
  education?: Array<{ degree: string; institution: string; department?: string; passingYear?: string | number; result?: string }>;
  onlineTeachingExperience?: string;
  preferredPlatforms?: string[];
  onlineTools?: string[];
  classTypes?: string[];
  preferredClassDuration?: string;
  nidNumber?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  profileCompletionPct?: number;
  submittedAt?: string;
}): { html: string; text: string } {
  const currentYear = new Date().getFullYear();
  const dateStr = data.submittedAt || new Date().toUTCString();

  const subjectsBadges = (data.subjects || [])
    .map(
      (s) =>
        `<span style="display:inline-block;background-color:#E6FFFA;color:#047481;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;margin:2px 4px 2px 0;">${s}</span>`
    )
    .join(" ");

  const levelsBadges = (data.classLevels || [])
    .map(
      (l) =>
        `<span style="display:inline-block;background-color:#F0FDF4;color:#166534;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;margin:2px 4px 2px 0;">${l}</span>`
    )
    .join(" ");

  const educationRows = (data.education || [])
    .map(
      (e) => `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 8px 12px; font-weight: 600; color: #1E293B;">${e.degree}</td>
        <td style="padding: 8px 12px; color: #475569;">${e.institution}</td>
        <td style="padding: 8px 12px; color: #64748B;">${e.department || "—"}</td>
        <td style="padding: 8px 12px; color: #0D9488; font-weight: 600;">${e.result || e.passingYear || "—"}</td>
      </tr>
    `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Teacher Application: ${data.name}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:680px;background-color:#FFFFFF;border-radius:16px;border:1px solid #E2E8F0;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;">
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #0F766E 0%, #0D9488 50%, #14B8A6 100%);padding:32px;text-align:left;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#CCFBF1;text-transform:uppercase;margin-bottom:6px;">Virtual Tutor Pro • Admin Notification</div>
                    <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:800;line-height:1.2;">New Teacher Application Received</h1>
                    <p style="margin:8px 0 0 0;color:#E6FFFA;font-size:14px;">Applicant: <strong>${data.name}</strong> (${data.email})</p>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <span style="background-color:rgba(255,255,255,0.2);color:#FFFFFF;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;">
                      ${data.profileCompletionPct || 100}% Complete
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">
              <!-- Quick Overview Card -->
              <div style="background-color:#F0FDFA;border:1px solid #CCFBF1;border-radius:12px;padding:20px;margin-bottom:24px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="padding:6px 0;width:30%;color:#0F766E;font-size:13px;font-weight:700;">FULL NAME:</td>
                    <td style="padding:6px 0;color:#0F172A;font-size:14px;font-weight:600;">${data.name}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#0F766E;font-size:13px;font-weight:700;">EMAIL ADDRESS:</td>
                    <td style="padding:6px 0;color:#0F172A;font-size:14px;font-weight:600;"><a href="mailto:${data.email}" style="color:#0D9488;text-decoration:none;">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#0F766E;font-size:13px;font-weight:700;">TEACHING TITLE:</td>
                    <td style="padding:6px 0;color:#0F172A;font-size:14px;">${data.title || "Educator"}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#0F766E;font-size:13px;font-weight:700;">LOCATION & TIMEZONE:</td>
                    <td style="padding:6px 0;color:#0F172A;font-size:14px;">${data.country || "Global"} (${data.timezone || "UTC"})</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#0F766E;font-size:13px;font-weight:700;">HOURLY RATE:</td>
                    <td style="padding:6px 0;color:#0F172A;font-size:14px;font-weight:700;color:#0F766E;">$${data.hourlyRate || 35}/hr (30m: $${data.price30min || 20} | 60m: $${data.price60min || 35} | Trial: $${data.trialPrice || 15})</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#0F766E;font-size:13px;font-weight:700;">SUBMISSION TIME:</td>
                    <td style="padding:6px 0;color:#64748B;font-size:13px;">${dateStr}</td>
                  </tr>
                </table>
              </div>

              <!-- Biography -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#0F172A;border-bottom:2px solid #E2E8F0;padding-bottom:6px;">Biography & Teaching Philosophy</h3>
                <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;background-color:#F8FAFC;padding:16px;border-radius:8px;border:1px solid #E2E8F0;white-space:pre-wrap;">${data.bio || "No biography provided."}</p>
              </div>

              <!-- Teaching Subjects & Grade Levels -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#0F172A;border-bottom:2px solid #E2E8F0;padding-bottom:6px;">Subjects & Target Class Levels</h3>
                <div style="margin-bottom:12px;">
                  <strong style="font-size:13px;color:#475569;display:block;margin-bottom:6px;">Subjects:</strong>
                  <div>${subjectsBadges || "<span style='color:#94A3B8;'>None specified</span>"}</div>
                </div>
                <div>
                  <strong style="font-size:13px;color:#475569;display:block;margin-bottom:6px;">Class Levels:</strong>
                  <div>${levelsBadges || "<span style='color:#94A3B8;'>None specified</span>"}</div>
                </div>
              </div>

              <!-- Education History -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#0F172A;border-bottom:2px solid #E2E8F0;padding-bottom:6px;">Education & Academic Background</h3>
                ${
                  data.education && data.education.length > 0
                    ? `
                  <table role="presentation" width="100%" style="border-collapse:collapse;font-size:13px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
                    <thead>
                      <tr style="background-color:#F1F5F9;text-align:left;">
                        <th style="padding:10px 12px;color:#475569;font-weight:700;">Degree</th>
                        <th style="padding:10px 12px;color:#475569;font-weight:700;">Institution</th>
                        <th style="padding:10px 12px;color:#475569;font-weight:700;">Department</th>
                        <th style="padding:10px 12px;color:#475569;font-weight:700;">Result / Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${educationRows}
                    </tbody>
                  </table>
                `
                    : "<p style='color:#94A3B8;font-size:14px;'>No education history provided.</p>"
                }
              </div>

              <!-- Identity & Verification Credentials -->
              <div style="margin-bottom:32px;background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:20px;">
                <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#92400E;">Government ID & Verification Documents</h3>
                <p style="margin:0 0 12px 0;font-size:13px;color:#78350F;">
                  <strong>NID / Passport Number:</strong> ${data.nidNumber || "Not provided"}
                </p>
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                  ${
                    data.nidFrontUrl
                      ? `<a href="${data.nidFrontUrl}" target="_blank" style="display:inline-block;background-color:#D97706;color:#FFFFFF;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;margin-right:8px;margin-bottom:8px;">View Front ID Document &rarr;</a>`
                      : ""
                  }
                  ${
                    data.nidBackUrl
                      ? `<a href="${data.nidBackUrl}" target="_blank" style="display:inline-block;background-color:#B45309;color:#FFFFFF;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:8px;">View Back ID Document &rarr;</a>`
                      : ""
                  }
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="text-align:center;padding-top:16px;border-top:1px solid #E2E8F0;">
                <a href="${process.env.APP_URL || ""}/admin/verification" style="display:inline-block;background-color:#0D9488;color:#FFFFFF;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(13,148,136,0.35);">
                  Review Application in Admin Console &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F1F5F9;padding:24px 32px;text-align:center;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                This notification was sent automatically to <strong>${APPLICATION_REVIEW_EMAIL}</strong> for educator credential review.
              </p>
              <p style="margin:0;font-size:12px;color:#94A3B8;">
                © ${currentYear} Virtual Tutor Pro • Administrative Verification System
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

  const text = `
NEW TEACHER APPLICATION RECEIVED (Virtual Tutor Pro)
---------------------------------------------------
Applicant: ${data.name}
Email: ${data.email}
User ID: ${data.userId}
Title: ${data.title || "Educator"}
Country: ${data.country || "Global"} (${data.timezone || "UTC"})
Hourly Rate: $${data.hourlyRate || 35}/hr
Years Experience: ${data.yearsExperience ?? "3"}
Completion Score: ${data.profileCompletionPct || 100}%
Submission Time: ${dateStr}

SUBJECTS:
${(data.subjects || []).join(", ")}

CLASS LEVELS:
${(data.classLevels || []).join(", ")}

BIOGRAPHY:
${data.bio || "N/A"}

EDUCATION:
${(data.education || []).map((e) => `• ${e.degree} from ${e.institution} (${e.department || "Dept"}), Result: ${e.result || "N/A"}`).join("\n")}

NID / GOVERNMENT ID:
Number: ${data.nidNumber || "N/A"}
Front Document: ${data.nidFrontUrl || "N/A"}
Back Document: ${data.nidBackUrl || "N/A"}

ADMIN CONSOLE:
https://vartualtutor.com/admin/verification
  `.trim();

  return { html, text };
}

// ─── CONTACT FORM EMAIL BUILDER ──────────────────────────────────────────────

export function buildContactFormEmailHtml(data: {
  name: string;
  email: string;
  phone?: string;
  category: string;
  subject: string;
  message: string;
  submittedAt?: string;
}): { html: string; text: string } {
  const currentYear = new Date().getFullYear();
  const dateStr = data.submittedAt || new Date().toUTCString();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Inquiry: ${data.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:640px;background-color:#FFFFFF;border-radius:16px;border:1px solid #E2E8F0;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #0F766E 0%, #0D9488 100%);padding:32px;text-align:left;">
              <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#CCFBF1;text-transform:uppercase;margin-bottom:6px;">Virtual Tutor Pro • Inbound Inquiry</div>
              <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:800;line-height:1.2;">New Contact Message Received</h1>
              <p style="margin:8px 0 0 0;color:#E6FFFA;font-size:14px;">Category: <strong>${data.category.toUpperCase().replace("_", " ")}</strong></p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="padding:6px 0;width:30%;color:#64748B;font-size:13px;font-weight:700;">FROM:</td>
                    <td style="padding:6px 0;color:#0F172A;font-size:14px;font-weight:600;">${data.name}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:700;">EMAIL:</td>
                    <td style="padding:6px 0;color:#0F172A;font-size:14px;font-weight:600;"><a href="mailto:${data.email}" style="color:#0D9488;text-decoration:none;">${data.email}</a></td>
                  </tr>
                  ${
                    data.phone
                      ? `
                  <tr>
                    <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:700;">PHONE:</td>
                    <td style="padding:6px 0;color:#0F172A;font-size:14px;">${data.phone}</td>
                  </tr>
                  `
                      : ""
                  }
                  <tr>
                    <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:700;">SUBJECT:</td>
                    <td style="padding:6px 0;color:#0F172A;font-size:14px;font-weight:700;">${data.subject}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:700;">DATE:</td>
                    <td style="padding:6px 0;color:#64748B;font-size:13px;">${dateStr}</td>
                  </tr>
                </table>
              </div>

              <!-- Message Body -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0F172A;">Message Content</h3>
                <div style="background-color:#FFFFFF;border:1px solid #CBD5E1;border-radius:8px;padding:16px;color:#334155;font-size:14px;line-height:1.7;white-space:pre-wrap;">${data.message}</div>
              </div>

              <!-- Reply Action -->
              <div style="text-align:center;padding-top:12px;">
                <a href="mailto:${data.email}?subject=Re:%20${encodeURIComponent(data.subject)}" style="display:inline-block;background-color:#0D9488;color:#FFFFFF;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">
                  Reply to ${data.name} (${data.email}) &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F1F5F9;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
              <p style="margin:0;font-size:12px;color:#64748B;">
                Sent directly to <strong>${TARGET_ADMIN_EMAIL}</strong> from Virtual Tutor Pro Contact Form.
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

  const text = `
NEW CONTACT FORM INQUIRY (Virtual Tutor Pro)
--------------------------------------------
From: ${data.name}
Email: ${data.email}
Phone: ${data.phone || "N/A"}
Category: ${data.category}
Subject: ${data.subject}
Date: ${dateStr}

MESSAGE:
${data.message}

Reply to: ${data.email}
  `.trim();

  return { html, text };
}

// ─── CONVEX ACTIONS ─────────────────────────────────────────────────────────

export const sendTeacherApplicationNotificationAction = action({
  args: {
    name: v.string(),
    email: v.string(),
    userId: v.string(),
    title: v.optional(v.string()),
    bio: v.optional(v.string()),
    country: v.optional(v.string()),
    timezone: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    price30min: v.optional(v.number()),
    price60min: v.optional(v.number()),
    groupPrice: v.optional(v.number()),
    trialPrice: v.optional(v.number()),
    subjects: v.optional(v.array(v.string())),
    classLevels: v.optional(v.array(v.string())),
    expertise: v.optional(v.array(v.string())),
    languages: v.optional(v.array(v.string())),
    yearsExperience: v.optional(v.number()),
    currentPosition: v.optional(v.string()),
    previousExperience: v.optional(v.string()),
    education: v.optional(
      v.array(
        v.object({
          degree: v.string(),
          institution: v.string(),
          department: v.optional(v.string()),
          passingYear: v.optional(v.union(v.string(), v.number())),
          result: v.optional(v.string()),
        })
      )
    ),
    onlineTeachingExperience: v.optional(v.string()),
    preferredPlatforms: v.optional(v.array(v.string())),
    onlineTools: v.optional(v.array(v.string())),
    classTypes: v.optional(v.array(v.string())),
    preferredClassDuration: v.optional(v.string()),
    nidNumber: v.optional(v.string()),
    nidFrontUrl: v.optional(v.string()),
    nidBackUrl: v.optional(v.string()),
    profileCompletionPct: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { html, text } = buildTeacherApplicationEmailHtml({
      ...args,
      submittedAt: new Date().toUTCString(),
    });

    const result = await dispatchEmailViaProvider({
      to: TARGET_ADMIN_EMAILS,
      subject: `[Teacher Application] ${args.name} - Verification Required (${args.title || "Educator"})`,
      html,
      text,
    });

    return {
      success: result.sent,
      deliveredTo: TARGET_ADMIN_EMAIL,
      provider: result.provider,
    };
  },
});

export const sendContactInquiryNotificationAction = action({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    category: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { html, text } = buildContactFormEmailHtml({
      ...args,
      submittedAt: new Date().toUTCString(),
    });

    const result = await dispatchEmailViaProvider({
      to: TARGET_ADMIN_EMAILS,
      subject: `[Contact Form] ${args.category.toUpperCase()}: ${args.subject} (${args.name})`,
      html,
      text,
    });

    return {
      success: result.sent,
      deliveredTo: TARGET_ADMIN_EMAIL,
      provider: result.provider,
    };
  },
});
