import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { recomputeCustomerIntelligence } from "./intelligence";
import { normalizePaymentMethod } from "./utils";
import { applyCustomerLedger } from "./ledgerHelpers";
import { processCashPayment, resolveCaixaSession } from "./caixaHelpers";
import { requireUser } from "./authHelpers";
import { updateFinancialStats } from "./analyticsHelpers";

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
    const user = await requireUser(ctx.db, ctx);
    const now = Date.now();

    const session = await resolveCaixaSession(ctx.db, now);

    const paymentId = await ctx.db.insert("payments", {
      transactionId: args.transactionId,
      customerId: args.customerId,
      sessionId: session._id,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      reference: args.reference,
      paymentDate: now,
      status: "Completed",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    await applyCustomerLedger(ctx.db, args.customerId, {
      type: "PAYMENT",
      amount: args.amount,
      description: `Manual payment via ${args.paymentMethod}`,
      referenceId: paymentId,
      referenceType: "payment",
      sessionId: session._id,
    });

    if (args.paymentMethod.toLowerCase() === "cash") {
      await processCashPayment(ctx.db, {
        amount: args.amount,
        type: "CASH_IN",
        description: `Manual payment received for transaction ${args.transactionId}`,
        userId: user.username,
        timestamp: now,
        referenceId: paymentId,
        referenceType: "payment",
      });
    }

    const todayStr = new Date(now).toISOString().split("T")[0];

    await updateFinancialStats(ctx, {
      dateStr: todayStr,
      pendingAmountDelta: -args.amount,
      paymentsByMethodDelta: { [args.paymentMethod]: args.amount },
      cashSalesDelta: args.paymentMethod.toLowerCase() === "cash" ? args.amount : 0,
      debtRecoveredDelta: args.paymentMethod.toLowerCase() !== "store credit" ? args.amount : 0,
    });

    await recomputeCustomerIntelligence(ctx.db, args.customerId);

    return paymentId;
  },
});
