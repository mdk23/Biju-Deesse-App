import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", "mdk"))
      .first();

    if (!existing) {
      await ctx.db.insert("users", {
        username: "mdk",
        role: "admin",
        name: "MDK Admin",
      });
      return "User mdk created successfully";
    }
    return "User mdk already exists";
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return null;

    return {
      _id: user._id,
      username: user.username,
      role: user.role,
      name: user.name,
      clerkId: user.clerkId,
      blocked: user.blocked,
    };
  },
});

export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    return user;
  },
});

export const updateClerkId = mutation({
  args: {
    userId: v.id("users"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { clerkId: args.clerkId });
  },
});

export const storeClerkUser = mutation({
  args: {
    creatorId: v.id("users"),
    clerkId: v.string(),
    username: v.string(),
    role: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const creator = await ctx.db.get(args.creatorId);
    if (!creator) throw new Error("Creator not found");

    if (creator.role === "POS") {
      throw new Error("POS users cannot create new accounts");
    }

    if (creator.role === "manager" && args.role !== "POS") {
      throw new Error("Managers can only create POS accounts");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existing) {
      throw new Error("Username already exists in Convex");
    }

    const newUserId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      username: args.username,
      role: args.role,
      name: args.name,
    });

    return newUserId;
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((user) => ({
      _id: user._id,
      username: user.username,
      role: user.role,
      name: user.name,
      clerkId: user.clerkId,
      blocked: user.blocked,
    }));
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users"), performedById: v.id("users") },
  handler: async (ctx, args) => {
    const performer = await ctx.db.get(args.performedById);
    if (!performer) throw new Error("Performer not found");

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("Target user not found");

    if (performer.role === "manager" && target.role !== "POS") {
      throw new Error("Managers can only delete POS users");
    }
    if (performer.role !== "admin" && performer.role !== "manager") {
      throw new Error("Unauthorized to delete users");
    }
    if (target.role === "admin") {
      throw new Error("Admins cannot be deleted");
    }

    await ctx.db.delete(args.userId);
  },
});

export const toggleBlockUser = mutation({
  args: { userId: v.id("users"), blocked: v.boolean(), performedById: v.id("users") },
  handler: async (ctx, args) => {
    const performer = await ctx.db.get(args.performedById);
    if (!performer) throw new Error("Performer not found");

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("Target user not found");

    if (performer.role === "manager" && target.role !== "POS") {
      throw new Error("Managers can only block/unblock POS users");
    }
    if (performer.role !== "admin" && performer.role !== "manager") {
      throw new Error("Unauthorized to block users");
    }
    if (target.role === "admin") {
      throw new Error("Admins cannot be blocked");
    }

    await ctx.db.patch(args.userId, { blocked: args.blocked });
  },
});

export const resetPassword = mutation({
  args: { userId: v.id("users"), newPassword: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { passwordHash: args.newPassword });
  },
});
