import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { recomputeCustomerIntelligence } from "./intelligence";
import { normalizePaymentMethod } from "./utils";
import { applyCustomerLedger } from "./ledgerHelpers";
import { validateCaixaForCash, recordCaixaCash } from "./caixaHelpers";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("payments").order("desc").take(100);
  },
});

export const getForTransaction = query({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .take(100);
  },
});

export const getForCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .take(100);
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
    if (args.paymentMethod.toLowerCase() === "cash") {
      await validateCaixaForCash(ctx.db);
    }

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

    await applyCustomerLedger(ctx.db, args.customerId, {
      type: "PAYMENT",
      amount: args.amount,
      description: `Manual payment via ${args.paymentMethod}`,
      referenceId: paymentId,
    });

    if (args.paymentMethod.toLowerCase() === "cash") {
      await recordCaixaCash(
        ctx.db,
        args.amount,
        "CASH_IN",
        `Manual payment received for transaction ${args.transactionId}`,
        "System", // Ideally this would be the actual user, but we don't have it in args currently
        paymentId
      );
    }

    const now = Date.now();
    const todayStr = new Date(now).toISOString().split("T")[0];

    const dailyStat = await ctx.db
      .query("dailyStats")
      .withIndex("by_date", (q) => q.eq("date", todayStr))
      .first();

    const targetKey = normalizePaymentMethod(args.paymentMethod);

    if (dailyStat) {
      const updatedPaymentsByMethod = { ...(dailyStat.paymentsByMethod || {}) };
      updatedPaymentsByMethod[targetKey] = (updatedPaymentsByMethod[targetKey] || 0) + args.amount;

      await ctx.db.patch(dailyStat._id, {
        totalPending: Math.max(0, (dailyStat.totalPending || 0) - args.amount),
        paymentsByMethod: updatedPaymentsByMethod,
      });
    } else {
      await ctx.db.insert("dailyStats", {
        date: todayStr,
        totalRevenue: 0,
        totalProfit: 0,
        transactionCount: 0,
        itemsSold: 0,
        totalPending: -args.amount,
        paymentsByMethod: { [targetKey]: args.amount },
        salesByCategory: {},
      });
    }

    await recomputeCustomerIntelligence(ctx.db, args.customerId);

    return paymentId;
  },
});
