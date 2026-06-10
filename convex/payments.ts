import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { recomputeCustomerIntelligence } from "./intelligence";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("payments").order("desc").collect();
  },
});

export const getForTransaction = query({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .collect();
  },
});

export const getForCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();
  },
});

// Process a manual payment (e.g., debt recovery)
export const addPayment = mutation({
  args: {
    customerId: v.id("customers"),
    transactionId: v.id("transactions"),
    amount: v.number(),
    paymentMethod: v.string(),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const paymentId = await ctx.db.insert("payments", {
      transactionId: args.transactionId,
      customerId: args.customerId,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      reference: args.reference,
      paymentDate: Date.now(),
      status: "Completed",
      notes: args.notes,
    });

    await recomputeCustomerIntelligence(ctx.db, args.customerId);

    return paymentId;
  },
});
