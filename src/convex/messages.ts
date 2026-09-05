import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Get conversations for current user ────────────────
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const convos = await ctx.db.query("conversations").collect();
    return convos.filter((c) => c.participants.includes(userId as string));
  },
});

// ─── Get messages in a conversation ────────────────────
export const listMessages = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    // Verify the user is a participant in this conversation
    const conv = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("_id"), args.conversationId))
      .first();
    if (!conv || !conv.participants.includes(userId as string)) {
      return [];
    }
    return await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
      .collect();
  },
});

// ─── Send a message ────────────────────────────────────
export const send = mutation({
  args: {
    conversationId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Verify sender is a participant in the conversation
    const conv = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("_id"), args.conversationId))
      .first();
    if (!conv || !conv.participants.includes(userId as string)) {
      throw new Error("Not authorized to send in this conversation");
    }

    // Validate message text
    const trimmedText = args.text.trim();
    if (trimmedText.length === 0) throw new Error("Message cannot be empty");
    if (trimmedText.length > 5000) throw new Error("Message too long (max 5000 characters)");

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId as string,
      senderName: user.name || "User",
      text: trimmedText,
      timestamp: Date.now(),
      read: false,
    });

    // Update conversation - use the conv already fetched above
    if (conv && "lastMessage" in conv) {
      await ctx.db.patch(conv._id, {
        lastMessage: trimmedText,
        lastMessageAt: Date.now(),
        lastSenderId: userId as string,
      });
    }

    return { success: true };
  },
});

// ─── Create a new conversation ─────────────────────────
export const createConversation = mutation({
  args: {
    participantId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Prevent creating conversation with self
    if (args.participantId === (userId as string)) {
      throw new Error("Cannot create a conversation with yourself");
    }

    // Check if conversation already exists
    const allConvos = await ctx.db.query("conversations").collect();
    const existing = allConvos.find(
      (c) => c.participants.includes(userId as string) && c.participants.includes(args.participantId),
    );

    if (existing) return { conversationId: existing._id };

    const user = await ctx.db.get(userId);
    const participant = await ctx.db.get(args.participantId as any);
    const userName = user && "name" in user ? user.name || "User" : "User";
    const participantName = participant && "name" in participant ? participant.name || "User" : "User";
    const convId = await ctx.db.insert("conversations", {
      participants: [userId as string, args.participantId],
      participantNames: [userName, participantName],
      lastMessage: "",
      lastMessageAt: Date.now(),
      lastSenderId: userId as string,
    });

    return { conversationId: convId };
  },
});


