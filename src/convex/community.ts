import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── List posts ────────────────────────────────────────
export const list = query({
  args: { subject: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let posts = await ctx.db
      .query("communityPosts")
      .order("desc")
      .collect();

    if (args.subject) {
      posts = posts.filter((p) => p.subject === args.subject);
    }

    return posts;
  },
});

// ─── Get post with replies ─────────────────────────────
export const get = query({
  args: { postId: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("communityPosts")
      .filter((q) => q.eq(q.field("_id"), args.postId))
      .first();
    if (!post) return null;

    const replies = await ctx.db
      .query("communityReplies")
      .filter((q) => q.eq(q.field("postId"), args.postId))
      .collect();

    return { post, replies };
  },
});

// ─── Create a post ─────────────────────────────────────
export const createPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    subject: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    await ctx.db.insert("communityPosts", {
      authorId: userId as string,
      authorName: user.name || "User",
      authorRole: profile ? "teacher" : "student",
      title: args.title,
      content: args.content,
      subject: args.subject,
      tags: args.tags,
      likesCount: 0,
      repliesCount: 0,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ─── Reply to a post ──────────────────────────────────
export const reply = mutation({
  args: {
    postId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const profile = await ctx.db
      .query("teacherProfiles")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    await ctx.db.insert("communityReplies", {
      postId: args.postId,
      authorId: userId as string,
      authorName: user.name || "User",
      authorRole: profile ? "teacher" : "student",
      content: args.content,
      likesCount: 0,
      createdAt: Date.now(),
    });

    // Increment reply count
    const post = await ctx.db
      .query("communityPosts")
      .filter((q) => q.eq(q.field("_id"), args.postId))
      .first();
    if (post) {
      await ctx.db.patch(post._id, { repliesCount: post.repliesCount + 1 });
    }

    return { success: true };
  },
});
