import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("customers").collect();
  },
});

export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("customers")),
    firstName: v.string(),
    lastName: v.string(),
    phone1: v.string(),
    phone2: v.optional(v.string()),
    phone3: v.optional(v.string()),
    email: v.optional(v.string()),
    loyaltyTier: v.string(),
    totalSpent: v.number(),
    outstandingBalance: v.number(),
    creditLimit: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    if (id) {
      await ctx.db.patch(id, data);
      return id;
    } else {
      return await ctx.db.insert("customers", data);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Update customer balance (e.g., after a partial payment or sale on credit)
export const updateBalance = mutation({
  args: {
    customerId: v.id("customers"),
    amountChange: v.number(), // Positive increases balance (debt), negative decreases it (payment)
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("Customer not found");

    const newBalance = customer.outstandingBalance + args.amountChange;
    await ctx.db.patch(args.customerId, { outstandingBalance: newBalance });
    return newBalance;
  },
});

// Analytics: Top spending customers
export const getTopSpenders = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_last_name") 
      .collect()
      .then((customers) => 
        customers
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, args.limit)
      );
  },
});
