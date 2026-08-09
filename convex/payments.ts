import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { recomputeCustomerIntelligence } from "./intelligence";
import { normalizePaymentMethod } from "./utils";
import { applyCustomerLedger, recomputeCustomerBalanceForCustomer } from "./ledgerHelpers";
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
    if (user.role !== "admin" && user.role !== "manager") {
      throw new Error("Unauthorized. Only admins and managers can record manual payments.");
    }
    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) throw new Error("Transaction not found.");
    if (transaction.customerId !== args.customerId) {
      throw new Error("This transaction does not belong to the selected customer.");
    }
    if (!transaction.debtAddedToAccount) {
      throw new Error(
        "This sale's balance was never added to the customer's account. Use Record Payment (sale) instead, or add it to the account first."
      );
    }

    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("Customer not found.");

    const isStoreCredit = args.paymentMethod === "Store Credit";

    const previousReceived = transaction.amountReceived || 0;
    // The transaction's own "total - amountReceived" gap can overstate what's
    // truly still owed: if the customer already had store credit at the
    // moment this sale was created, some of that gap was silently absorbed
    // by the credit then (the transaction record doesn't reflect that, since
    // amountReceived only tracks cash/tender collected at checkout). Cap by
    // whichever is smaller so this can never pay past the customer's actual
    // outstanding debt and manufacture unintended store credit out of thin air.
    const transactionRemaining = transaction.total - previousReceived;
    const remaining = Math.min(transactionRemaining, customer.debitBalance || 0);
    if (transactionRemaining <= 0) {
      throw new Error("This sale is already fully paid.");
    }
    if (remaining <= 0) {
      throw new Error("This customer has no outstanding debt to apply a payment against.");
    }
    if (isStoreCredit) {
      // Store Credit is a hard cap -- you can never apply more credit than
      // actually exists, there's no "overpaying" with it.
      const creditCap = Math.min(remaining, customer.creditBalance || 0);
      if (args.amount > creditCap + 0.01) {
        throw new Error(`Payment exceeds the available store credit (${creditCap} available).`);
      }
    }

    // Real tenders (cash, mobile money, etc.) can exceed the debt: the part
    // that settles it is applied, any excess is banked as store credit --
    // the same explicit overpayment-becomes-credit rule used at checkout.
    const applied = Math.min(args.amount, remaining);
    const overpay = isStoreCredit ? 0 : Math.max(0, args.amount - remaining);

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
      source: "manual",
      createdAt: now,
      updatedAt: now,
    });

    if (isStoreCredit) {
      // Explicitly transfer: consume credit AND recover debt by the same
      // amount, both tied to this one payment record.
      await applyCustomerLedger(ctx.db, args.customerId, {
        type: "USE_CREDIT",
        amount: args.amount,
        description: `Store credit applied to ${transaction.receiptNumber || args.transactionId}`,
        referenceId: paymentId,
        referenceType: "payment",
        sessionId: session._id,
      });
    }

    await applyCustomerLedger(ctx.db, args.customerId, {
      type: "PAYMENT",
      amount: applied,
      description: `Manual payment via ${args.paymentMethod} for ${transaction.receiptNumber || args.transactionId}`,
      referenceId: paymentId,
      referenceType: "payment",
      sessionId: session._id,
    });

    if (overpay > 0) {
      await applyCustomerLedger(ctx.db, args.customerId, {
        type: "CREDIT",
        amount: overpay,
        description: `Overpayment on manual payment for ${transaction.receiptNumber || args.transactionId} saved as store credit`,
        referenceId: paymentId,
        referenceType: "payment",
        sessionId: session._id,
      });
    }

    // Close out (or partially settle) the specific sale this payment is for.
    const newAmountReceived = previousReceived + args.amount;
    const newStatus = newAmountReceived >= transaction.total ? "Completed" : "Partially Paid";
    await ctx.db.patch(args.transactionId, {
      amountReceived: newAmountReceived,
      status: newStatus,
      settlementType: newStatus === "Completed" ? "Fully Paid" : newStatus,
      updatedAt: now,
    });

    if (args.paymentMethod.toLowerCase() === "cash") {
      await processCashPayment(ctx.db, {
        amount: args.amount,
        type: "CASH_IN",
        description: `Manual payment received for transaction ${transaction.receiptNumber || args.transactionId}`,
        userId: user.username,
        timestamp: now,
        referenceId: paymentId,
        referenceType: "payment",
      });
    }

    const todayStr = new Date(now).toISOString().split("T")[0];

    await updateFinancialStats(ctx, {
      dateStr: todayStr,
      pendingAmountDelta: -applied,
      paymentsByMethodDelta: { [args.paymentMethod]: args.amount },
      cashSalesDelta: args.paymentMethod.toLowerCase() === "cash" ? args.amount : 0,
      debtRecoveredDelta: isStoreCredit ? 0 : applied,
      creditRedeemedDelta: isStoreCredit ? args.amount : 0,
      creditIssuedDelta: overpay,
    });

    await recomputeCustomerIntelligence(ctx.db, args.customerId);

    return paymentId;
  },
});

// Settle a sale directly (e.g. collecting more cash on a still-pending sale)
// without ever touching the customer's account credit/debit balance. Only
// valid for sales that were never explicitly added to the customer's
// account -- see transactions.addRemainingToCustomerAccount for that path.
export const recordSalePayment = mutation({
  args: {
    transactionId: v.id("transactions"),
    amount: v.number(),
    paymentMethod: v.string(),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin" && user.role !== "manager") {
      throw new Error("Unauthorized. Only admins and managers can record manual payments.");
    }
    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) throw new Error("Transaction not found.");
    if (transaction.debtAddedToAccount) {
      throw new Error(
        "This sale's balance was already added to the customer's account -- use Record Payment (account) instead."
      );
    }

    const isStoreCredit = args.paymentMethod === "Store Credit";
    if (isStoreCredit && !transaction.customerId) {
      throw new Error("Store credit requires a linked customer account.");
    }

    const existingPayments = await ctx.db
      .query("payments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.transactionId))
      .collect();
    const alreadyPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = transaction.total - alreadyPaid;
    if (remaining <= 0) {
      throw new Error("This sale is already fully paid.");
    }

    let customer: Doc<"customers"> | null = null;
    if (isStoreCredit) {
      customer = await ctx.db.get(transaction.customerId!);
      if (!customer) throw new Error("Customer not found.");
      const creditCap = Math.min(remaining, customer.creditBalance || 0);
      if (creditCap <= 0) {
        throw new Error("This customer has no available store credit.");
      }
      // Store Credit is a hard cap -- there's no "overpaying" with it.
      if (args.amount > creditCap + 0.01) {
        throw new Error(`Payment exceeds the available store credit (${creditCap} available).`);
      }
    }

    // Real tenders can exceed what the sale needs: the part that settles it
    // is applied, any excess is banked as store credit -- same explicit
    // overpayment-becomes-credit rule used at checkout.
    const applied = Math.min(args.amount, remaining);
    const overpay = isStoreCredit ? 0 : Math.max(0, args.amount - remaining);

    const now = Date.now();
    const session = await resolveCaixaSession(ctx.db, now);

    const paymentId = await ctx.db.insert("payments", {
      transactionId: args.transactionId,
      customerId: transaction.customerId,
      sessionId: session._id,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      reference: args.reference,
      paymentDate: now,
      status: "Completed",
      notes: args.notes,
      source: "manual",
      createdAt: now,
      updatedAt: now,
    });

    if (isStoreCredit) {
      // The only balance-affecting movement here: settling this sale with
      // store credit consumes exactly that credit. Never touches debit.
      await applyCustomerLedger(ctx.db, transaction.customerId!, {
        type: "USE_CREDIT",
        amount: args.amount,
        description: `Store credit applied to ${transaction.receiptNumber || args.transactionId}`,
        referenceId: paymentId,
        referenceType: "payment",
        sessionId: session._id,
      });
    }

    // Balance-neutral audit trail -- this money settles the sale, it never
    // moves the customer's account credit/debit balance (Store Credit's own
    // movement is logged separately above via USE_CREDIT).
    if (transaction.customerId) {
      await applyCustomerLedger(ctx.db, transaction.customerId, {
        type: "PAYMENT_LOG",
        amount: args.amount,
        description: `Payment via ${args.paymentMethod} for ${transaction.receiptNumber || args.transactionId}`,
        referenceId: paymentId,
        referenceType: "payment",
        sessionId: session._id,
      });

      if (overpay > 0) {
        await applyCustomerLedger(ctx.db, transaction.customerId, {
          type: "CREDIT",
          amount: overpay,
          description: `Overpayment on ${transaction.receiptNumber || args.transactionId} saved as store credit`,
          referenceId: paymentId,
          referenceType: "payment",
          sessionId: session._id,
        });
      }
    }

    const newAmountReceived = alreadyPaid + args.amount;
    const newStatus = newAmountReceived >= transaction.total ? "Completed" : "Partially Paid";
    await ctx.db.patch(args.transactionId, {
      amountReceived: newAmountReceived,
      status: newStatus,
      settlementType: newStatus === "Completed" ? "Fully Paid" : newStatus,
      updatedAt: now,
    });

    if (args.paymentMethod.toLowerCase() === "cash") {
      await processCashPayment(ctx.db, {
        amount: args.amount,
        type: "CASH_IN",
        description: `Payment received for transaction ${transaction.receiptNumber || args.transactionId}`,
        userId: user.username,
        timestamp: now,
        referenceId: paymentId,
        referenceType: "payment",
      });
    }

    const todayStr = new Date(now).toISOString().split("T")[0];

    await updateFinancialStats(ctx, {
      dateStr: todayStr,
      pendingAmountDelta: -applied,
      paymentsByMethodDelta: { [args.paymentMethod]: args.amount },
      cashSalesDelta: args.paymentMethod.toLowerCase() === "cash" ? args.amount : 0,
      creditRedeemedDelta: isStoreCredit ? args.amount : 0,
      creditIssuedDelta: overpay,
    });

    if (transaction.customerId) {
      await recomputeCustomerIntelligence(ctx.db, transaction.customerId);
    }

    return paymentId;
  },
});

// Delete a single payment record, e.g. to correct a mistake. Manually
// recorded payments (addPayment/recordSalePayment) are always safe to
// delete individually -- their ledger effects are always tied to that one
// payment. A checkout-time tender is only safe to delete on its own if that
// checkout never produced a balance-affecting ledger entry tied to the
// whole transaction (store credit used, overpayment saved as
// credit/refund, or underpayment added to the account) -- those are
// computed from the transaction's total tender, not any one payment line,
// so deleting just one line could no longer match what was recorded.
export const deletePayment = mutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin" && user.role !== "manager") {
      throw new Error("Unauthorized. Only admins and managers can delete payments.");
    }

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found.");

    const transaction = await ctx.db.get(payment.transactionId);
    if (!transaction) throw new Error("Transaction not found.");

    if (payment.source === "checkout" && transaction.customerId) {
      const transactionLedgerEntries = await ctx.db
        .query("ledger")
        .withIndex("by_reference", (q) => q.eq("referenceType", "transaction").eq("referenceId", transaction._id))
        .collect();
      const hasComplexBalanceEffect = transactionLedgerEntries.some(
        (e) => e.type === "CREDIT" || e.type === "DEBIT" || e.type === "USE_CREDIT"
      );
      if (hasComplexBalanceEffect) {
        throw new Error(
          "This payment can't be deleted individually -- it was part of a checkout that also affected the customer's store credit or account debt."
        );
      }
    }

    const now = Date.now();

    // Reverse any caixa cash movement this payment created. Manual payments
    // tie their own CASH_IN movement to the payment; checkout-time cash is
    // recorded once for the whole transaction (`create` only ever logs one
    // SALE movement, for whichever paymentBreakdown line was cash).
    if (payment.paymentMethod.toLowerCase() === "cash") {
      const referenceType = payment.source === "checkout" ? "transaction" : "payment";
      const referenceId = payment.source === "checkout" ? transaction._id : args.paymentId;
      const movements = await ctx.db
        .query("caixaMovements")
        .withIndex("by_reference", (q) => q.eq("referenceType", referenceType).eq("referenceId", referenceId))
        .collect();
      for (const m of movements) {
        if ((m.type === "CASH_IN" || m.type === "SALE") && m.amount > 0) {
          await processCashPayment(ctx.db, {
            amount: m.amount,
            type: m.type === "SALE" ? "SALE_REVERSAL" : "CASH_OUT",
            description: `Reversal of deleted payment for ${transaction.receiptNumber || payment.transactionId}`,
            userId: user.username,
            timestamp: now,
            referenceId: transaction._id,
            referenceType: "transaction",
          });
        }
      }
    }

    // Delete the ledger entries this payment created, tallying their
    // amounts on the way -- the ledger is the authoritative record of what
    // this payment actually did, so the reversal is derived from it rather
    // than recomputed from scratch.
    let debtRecoveredReversal = 0;
    let creditRedeemedReversal = 0;
    let creditIssuedReversal = 0;
    if (transaction.customerId) {
      const customerLedgers = await ctx.db
        .query("ledger")
        .withIndex("by_customer", (q) => q.eq("customerId", transaction.customerId))
        .collect();
      for (const entry of customerLedgers) {
        if (entry.referenceId !== args.paymentId) continue;
        if (entry.type === "PAYMENT") debtRecoveredReversal += entry.amount;
        if (entry.type === "USE_CREDIT") creditRedeemedReversal += entry.amount;
        if (entry.type === "CREDIT") creditIssuedReversal += entry.amount;
        await ctx.db.delete(entry._id);
      }
    }

    await ctx.db.delete(args.paymentId);

    // Recompute the transaction's own settlement fields from whatever
    // payments remain -- the same live-derivation rule used everywhere else
    // (hydrateTransactions, addPayment, recordSalePayment).
    const remainingPayments = await ctx.db
      .query("payments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", payment.transactionId))
      .collect();
    const newAmountReceived = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
    const newStatus =
      newAmountReceived >= transaction.total ? "Completed" : newAmountReceived > 0 ? "Partially Paid" : "Pending";
    await ctx.db.patch(payment.transactionId, {
      amountReceived: newAmountReceived,
      status: newStatus,
      settlementType: newStatus === "Completed" ? "Fully Paid" : newStatus,
      updatedAt: now,
    });

    if (transaction.customerId) {
      // Full replay, not a delta -- same reasoning as transactions.remove:
      // USE_CREDIT/PAYMENT floor at 0, a non-linear clamp that a
      // hand-computed delta can't soundly invert.
      await recomputeCustomerBalanceForCustomer(ctx.db, transaction.customerId);
      await recomputeCustomerIntelligence(ctx.db, transaction.customerId);
    }

    // The portion of this payment that actually settled the sale/debt --
    // whatever wasn't banked as store credit.
    const applied = payment.amount - creditIssuedReversal;
    const dateStr = new Date(payment.paymentDate).toISOString().split("T")[0];
    await updateFinancialStats(ctx, {
      dateStr,
      pendingAmountDelta: applied,
      paymentsByMethodDelta: { [payment.paymentMethod]: -payment.amount },
      cashSalesDelta: payment.paymentMethod.toLowerCase() === "cash" ? -payment.amount : 0,
      debtRecoveredDelta: -debtRecoveredReversal,
      creditRedeemedDelta: -creditRedeemedReversal,
      creditIssuedDelta: -creditIssuedReversal,
    });

    await ctx.db.insert("auditLogs", {
      userId: user.username,
      timestamp: now,
      action: "DELETE_PAYMENT",
      beforeValue: {
        transactionId: payment.transactionId,
        amount: payment.amount,
        method: payment.paymentMethod,
      },
      referenceId: args.paymentId,
    });

    return { transactionId: payment.transactionId };
  },
});

// One-time idempotent backfill: classifies existing payment rows (created
// before the `source` field existed) as "checkout" or "manual". Checkout-time
// rows share the exact same `createdAt` as their transaction (both inserted
// in the same `create` call using one `now` value); anything later is manual.
// Ambiguous rows (missing createdAt) default to "checkout" -- the
// conservative, non-deletable choice -- rather than guessing.
export const backfillPaymentSource = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("payments").collect();
    let checkoutCount = 0;
    let manualCount = 0;
    for (const row of rows) {
      if (row.source) continue;
      const transaction = await ctx.db.get(row.transactionId);
      const isCheckout =
        !transaction || row.createdAt === undefined || transaction.createdAt === undefined
          ? true // ambiguous -- default to the conservative, non-deletable choice
          : transaction.createdAt === row.createdAt;
      await ctx.db.patch(row._id, { source: isCheckout ? "checkout" : "manual" });
      if (isCheckout) checkoutCount++;
      else manualCount++;
    }
    return { checkoutCount, manualCount };
  },
});
