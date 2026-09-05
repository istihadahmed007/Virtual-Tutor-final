import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("aiConversations")
      .withIndex("by_user", (q) => q.eq("userId", userId as string))
      .order("desc")
      .collect();
  },
});

export const getConversation = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const conv = await ctx.db.get(args.conversationId as any);
    if (!conv) return null;
    if (!('userId' in conv) || conv.userId !== (userId as string)) {
      throw new Error("Not authorized");
    }
    return conv;
  },
});

export const listMessages = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    // Verify the user owns this conversation
    const conv = await ctx.db.get(args.conversationId as any);
    if (!conv || !('userId' in conv)) return [];
    if (conv.userId !== (userId as string)) {
      throw new Error("Not authorized");
    }
    return await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();
  },
});

export const createConversation = mutation({
  args: {
    title: v.string(),
    subject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("aiConversations", {
      userId: userId as string,
      title: args.title,
      subject: args.subject,
      lastMessageAt: Date.now(),
    });
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Add user message
    await ctx.db.insert("aiMessages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      timestamp: Date.now(),
    });

    // Verify ownership
    const existingConv = await ctx.db.get(args.conversationId as any);
    if (!existingConv || !('userId' in existingConv)) throw new Error("Conversation not found");
    if (existingConv.userId !== (userId as string)) {
      throw new Error("Not authorized");
    }

    // Update conversation timestamp
    await ctx.db.patch(args.conversationId as any, {
      lastMessageAt: Date.now(),
    });

    // Generate a contextual AI response
    const userMsg = args.content.toLowerCase();
    let response = "";

    if (userMsg.includes("explain") || userMsg.includes("what is") || userMsg.includes("what are")) {
      response = `Great question! Let me help explain that concept.\n\n**Key Concept:** The topic you're asking about involves understanding the fundamental principles and how they apply in practice.\n\n**Important Points:**\n1. Start with the basics and build understanding step by step\n2. Practice with examples to solidify your understanding\n3. Connect this to what you already know\n\nWould you like me to go deeper into any specific aspect? I can also create practice questions to help you test your understanding.`;
    } else if (userMsg.includes("practice") || userMsg.includes("quiz") || userMsg.includes("test")) {
      response = `Here are some practice questions to test your understanding:\n\n**Question 1:** Can you describe the core principles of this topic in your own words?\n\n**Question 2:** How would you apply this concept in a real-world scenario?\n\n**Question 3:** What are the common mistakes students make with this topic?\n\nTry answering these, and I'll give you feedback on your responses. Remember, making mistakes is part of learning!`;
    } else if (userMsg.includes("summarize") || userMsg.includes("summary")) {
      response = `Here's a concise summary of the key points:\n\n**Core Ideas:**\n• The fundamental concepts and their relationships\n• How this connects to broader themes in the subject\n• Practical applications and real-world relevance\n\n**Key Takeaways:**\n1. Focus on understanding the 'why' not just the 'what'\n2. Practice applying concepts in different contexts\n3. Review and revise regularly to build lasting understanding\n\nWould you like me to elaborate on any of these points?`;
    } else if (userMsg.includes("help") || userMsg.includes("stuck") || userMsg.includes("don't understand")) {
      response = `I understand this can be challenging. Let's break it down together.\n\n**Approach:**\n1. Let's identify exactly which part is confusing\n2. We'll look at it from a different angle\n3. I'll provide examples to make it clearer\n\n**Tip:** Sometimes it helps to explain the concept back to yourself in simple terms. What part specifically would you like me to focus on?\n\nRemember: Every expert was once a beginner. You're making progress!`;
    } else {
      response = `That's an interesting topic! Let me share some insights.\n\n**Key Points to Consider:**\n1. Understanding the underlying principles is crucial\n2. Connect this to real-world applications\n3. Practice is essential for mastery\n\n**Recommended Next Steps:**\n• Review the related concepts in your course materials\n• Try some practice problems\n• Discuss with your tutor in your next session\n\nIs there a specific aspect you'd like to dive deeper into? I'm here to help!`;
    }

    // Add AI response
    await ctx.db.insert("aiMessages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: response,
      timestamp: Date.now(),
    });

    return response;
  },
});
