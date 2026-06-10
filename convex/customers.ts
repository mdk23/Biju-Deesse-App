import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { recomputeCustomerIntelligence } from "./intelligence";

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
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    let customerId;
    if (id) {
      await ctx.db.patch(id, data);
      customerId = id;
    } else {
      customerId = await ctx.db.insert("customers", {
        ...data,
        customerType: "Registered",
        financialTier: "Regular",
        loyaltyLevel: "Bronze",
        creditStatus: "Good Standing",
        customerScore: 0,
        customerHealth: "At Risk",
        totalSpent: 0,
        orderCount: 0,
      });
    }

    await recomputeCustomerIntelligence(ctx.db, customerId);
    return customerId;
  },
});

export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
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
