import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { requireAdmin } from "./authHelpers";
import {
  TARGET_ADMIN_EMAILS,
  TARGET_ADMIN_EMAIL,
  dispatchEmailViaProvider,
  buildContactFormEmailHtml,
} from "./emailService";

// ─── Submit Contact Form (Direct Mutation + Storage) ─────────────────────────
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    category: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanName = args.name.trim();
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanSubject = args.subject.trim();
    const cleanMessage = args.message.trim();

    if (!cleanName || cleanName.length < 2) {
      throw new Error("Please provide your full name.");
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("Please provide a valid email address.");
    }

    if (!cleanSubject || cleanSubject.length < 3) {
      throw new Error("Please provide a subject for your message.");
    }

    if (!cleanMessage || cleanMessage.length < 10) {
      throw new Error("Please provide a detailed message (minimum 10 characters).");
    }

    const inquiryId = await ctx.db.insert("contactInquiries", {
      name: cleanName,
      email: cleanEmail,
      phone: args.phone ? args.phone.trim() : undefined,
      category: args.category || "general",
      subject: cleanSubject,
      message: cleanMessage,
      status: "new",
      emailDeliveryStatus: "queued",
      createdAt: Date.now(),
    });

    // Create an administrative notification
    await ctx.db.insert("notifications", {
      userId: "admin",
      title: `New Contact Inquiry: ${cleanSubject}`,
      message: `Message received from ${cleanName} (${cleanEmail}) under ${args.category}.`,
      type: "system",
      read: false,
      createdAt: Date.now(),
      actionUrl: "/admin/notifications",
    });

    return {
      success: true,
      inquiryId,
      message: `Your inquiry has been submitted and forwarded to our support team at ${TARGET_ADMIN_EMAIL}.`,
    };
  },
});

// ─── Submit Contact Form Action (Storage + Instant Email Dispatch) ───────────
export const submitWithEmailDispatch = action({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    category: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. First record via mutation
    let inquiryId = "";
    try {
      const res = await ctx.runMutation((api as any).contact.submit, args);
      inquiryId = String(res.inquiryId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to record inquiry.");
    }

    // 2. Format & dispatch email to administrators (istihadahmed1163@gmail.com, info@vartualtutor.com)
    const { html, text } = buildContactFormEmailHtml({
      name: args.name,
      email: args.email,
      phone: args.phone,
      category: args.category,
      subject: args.subject,
      message: args.message,
      submittedAt: new Date().toUTCString(),
    });

    const emailResult = await dispatchEmailViaProvider({
      to: TARGET_ADMIN_EMAILS,
      subject: `[Contact Form] ${args.category.toUpperCase()}: ${args.subject} (${args.name})`,
      html,
      text,
    });

    return {
      success: true,
      inquiryId,
      deliveredTo: TARGET_ADMIN_EMAIL,
      emailProvider: emailResult.provider,
      message: `Your message has been sent successfully to ${TARGET_ADMIN_EMAIL}. We will respond to your email promptly.`,
    };
  },
});

// ─── Admin Queries & Mutations ────────────────────────────────────────────────

export const listInquiries = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("read"),
        v.literal("in_progress"),
        v.literal("resolved"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const inquiries = await ctx.db.query("contactInquiries").collect();

    let filtered = inquiries;
    if (args.status) {
      filtered = filtered.filter((i) => i.status === args.status);
    }

    // Sort descending by creation date
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const updateInquiryStatus = mutation({
  args: {
    inquiryId: v.id("contactInquiries"),
    status: v.union(
      v.literal("new"),
      v.literal("read"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("archived")
    ),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const inquiry = await ctx.db.get(args.inquiryId);
    if (!inquiry) {
      throw new Error("Inquiry not found.");
    }

    await ctx.db.patch(args.inquiryId, {
      status: args.status,
      adminNotes: args.adminNotes !== undefined ? args.adminNotes : inquiry.adminNotes,
      resolvedAt: args.status === "resolved" ? Date.now() : inquiry.resolvedAt,
    });

    return { success: true };
  },
});
