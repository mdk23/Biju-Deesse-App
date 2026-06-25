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
        passwordHash: "123", // Using plaintext for MVP per plan
        role: "admin",
        name: "MDK Admin",
      });
      return "User mdk created successfully";
    }
    return "User mdk already exists";
  },
});

export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) {
      return { success: false, message: "Invalid username or password" };
    }

    if (user.passwordHash !== args.password) {
      return { success: false, message: "Invalid username or password" };
    }

    return {
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    };
  },
});

export const createUser = mutation({
  args: {
    creatorId: v.id("users"),
    newUsername: v.string(),
    newPassword: v.string(),
    newRole: v.string(),
    newName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const creator = await ctx.db.get(args.creatorId);
    if (!creator) throw new Error("Creator not found");

    if (creator.role === "POS") {
      throw new Error("POS users cannot create new accounts");
    }

    if (creator.role === "manager" && args.newRole !== "POS") {
      throw new Error("Managers can only create POS accounts");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.newUsername))
      .first();

    if (existing) {
      throw new Error("Username already exists");
    }

    const newUserId = await ctx.db.insert("users", {
      username: args.newUsername,
      passwordHash: args.newPassword,
      role: args.newRole,
      name: args.newName,
    });

    return newUserId;
  },
});

export const resetPassword = mutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      passwordHash: args.newPassword,
    });

    return { success: true };
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
    }));
  },
});
