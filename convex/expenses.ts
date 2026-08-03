import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireUser } from "./authHelpers";
import { processCashPayment, recordCaixaCash } from "./caixaHelpers";
import { monthKey, updateExpenseCountersHelper, recomputeExpenseCountersFromScratch } from "./expenseHelpers";

const STATUS = v.union(v.literal("Pending"), v.literal("Paid"), v.literal("Overdue"), v.literal("Cancelled"));

/** Derives display-only Overdue status without writing it (the cron sweep owns the write). */
function withDerivedStatus<T extends { status: string; dueDate: number }>(expense: T, now: number): T {
  if (expense.status === "Pending" && expense.dueDate < now) {
    return { ...expense, status: "Overdue" };
  }
  return expense;
}

export const createExpense = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    amount: v.number(),
    dueDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin" && user.role !== "manager") {
      throw new Error("Unauthorized. Only admins and managers can create expenses.");
    }
    if (args.amount <= 0) throw new Error("Amount must be greater than zero.");

    const now = Date.now();
    const expenseId = await ctx.db.insert("expenses", {
      title: args.title,
      category: args.category,
      amount: args.amount,
      dueDate: args.dueDate,
      notes: args.notes,
      status: "Pending",
      origin: "Manual",
      createdAt: now,
      updatedAt: now,
    });

    const created = await ctx.db.get(expenseId);
    if (created) await updateExpenseCountersHelper(ctx, null, created);

    await ctx.db.insert("auditLogs", {
      userId: user.username,
      timestamp: now,
      action: "CREATE_EXPENSE",
      afterValue: { title: args.title, amount: args.amount, category: args.category, dueDate: args.dueDate },
      referenceId: expenseId,
    });

    return expenseId;
  },
});

export const updateExpense = mutation({
  args: {
    id: v.id("expenses"),
    title: v.string(),
    category: v.string(),
    amount: v.number(),
    dueDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin" && user.role !== "manager") {
      throw new Error("Unauthorized. Only admins and managers can edit expenses.");
    }
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Expense not found.");
    if (existing.status === "Paid" || existing.status === "Cancelled") {
      throw new Error(`Cannot edit an expense that is already ${existing.status}.`);
    }
    if (args.amount <= 0) throw new Error("Amount must be greater than zero.");

    const { id, ...data } = args;
    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });

    const updated = await ctx.db.get(id);
    if (updated) await updateExpenseCountersHelper(ctx, existing, updated);

    await ctx.db.insert("auditLogs", {
      userId: user.username,
      timestamp: Date.now(),
      action: "UPDATE_EXPENSE",
      beforeValue: { title: existing.title, amount: existing.amount, category: existing.category, dueDate: existing.dueDate },
      afterValue: { title: args.title, amount: args.amount, category: args.category, dueDate: args.dueDate },
      referenceId: id,
    });
  },
});

export const payExpense = mutation({
  args: {
    id: v.id("expenses"),
    paymentMethod: v.string(),
    paymentDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin" && user.role !== "manager") {
      throw new Error("Unauthorized. Only admins and managers can pay expenses.");
    }
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Expense not found.");
    if (existing.status === "Paid" || existing.status === "Cancelled") {
      throw new Error(`Cannot pay an expense that is already ${existing.status}.`);
    }

    const paymentDate = args.paymentDate ?? Date.now();

    if (args.paymentMethod === "Cash") {
      // Throws if there's no open Caixa session or insufficient drawer funds.
      await processCashPayment(ctx.db, {
        amount: existing.amount,
        type: "CASH_OUT",
        description: `Expense payment: ${existing.title}`,
        userId: user.username,
        timestamp: paymentDate,
        referenceId: existing._id,
        referenceType: "expense",
      });
    }

    await ctx.db.patch(args.id, {
      status: "Paid",
      paymentMethod: args.paymentMethod,
      paymentDate,
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(args.id);
    if (updated) await updateExpenseCountersHelper(ctx, existing, updated);

    await ctx.db.insert("auditLogs", {
      userId: user.username,
      timestamp: Date.now(),
      action: "PAY_EXPENSE",
      beforeValue: { status: existing.status },
      afterValue: { status: "Paid", paymentMethod: args.paymentMethod, paymentDate },
      referenceId: args.id,
    });
  },
});

export const cancelExpense = mutation({
  args: { id: v.id("expenses"), reason: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Expense not found.");
    if (existing.status === "Cancelled") throw new Error("Expense is already cancelled.");
    if (!args.reason || args.reason.trim() === "") {
      throw new Error("A reason is required to cancel an expense.");
    }

    const isReversal = existing.status === "Paid";
    if (isReversal) {
      if (user.role !== "admin") {
        throw new Error("Unauthorized. Only admins can reverse a paid expense.");
      }
      if (existing.paymentMethod === "Cash") {
        // Return the cash to the drawer.
        await recordCaixaCash(
          ctx.db,
          existing.amount,
          "CASH_IN",
          `Reversal of expense payment: ${existing.title}`,
          user.username,
          Date.now(),
          existing._id,
          "expense_reversal"
        );
      }
    } else {
      if (user.role !== "admin" && user.role !== "manager") {
        throw new Error("Unauthorized. Only admins and managers can cancel expenses.");
      }
    }

    const annotatedNotes = existing.notes ? `${existing.notes} | Cancelled: ${args.reason}` : `Cancelled: ${args.reason}`;
    await ctx.db.patch(args.id, { status: "Cancelled", notes: annotatedNotes, updatedAt: Date.now() });

    const updated = await ctx.db.get(args.id);
    if (updated) await updateExpenseCountersHelper(ctx, existing, updated);

    await ctx.db.insert("auditLogs", {
      userId: user.username,
      timestamp: Date.now(),
      action: isReversal ? "REVERSE_EXPENSE" : "CANCEL_EXPENSE",
      beforeValue: { status: existing.status },
      afterValue: { status: "Cancelled", reason: args.reason },
      referenceId: args.id,
    });
  },
});

export const deleteExpense = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin") {
      throw new Error("Unauthorized. Only admins can delete expenses.");
    }
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Expense not found.");
    if (existing.status === "Paid") {
      throw new Error("Cannot delete a paid expense. Cancel (reverse) it instead.");
    }

    await updateExpenseCountersHelper(ctx, existing, null);
    await ctx.db.delete(args.id);

    await ctx.db.insert("auditLogs", {
      userId: user.username,
      timestamp: Date.now(),
      action: "DELETE_EXPENSE",
      beforeValue: { title: existing.title, amount: existing.amount, status: existing.status },
      referenceId: args.id,
    });
  },
});

export const list = query({
  args: {
    status: v.optional(STATUS),
    category: v.optional(v.string()),
    origin: v.optional(v.union(v.literal("Manual"), v.literal("Recurring"))),
    templateId: v.optional(v.id("expenseTemplates")),
  },
  handler: async (ctx, args) => {
    let results;
    if (args.templateId !== undefined) {
      const templateId = args.templateId;
      results = await ctx.db
        .query("expenses")
        .withIndex("by_templateId_and_dueDate", (q) => q.eq("templateId", templateId))
        .order("desc")
        .take(500);
    } else if (args.status !== undefined) {
      const status = args.status;
      results = await ctx.db
        .query("expenses")
        .withIndex("by_status_and_dueDate", (q) => q.eq("status", status))
        .order("desc")
        .take(500);
    } else if (args.category !== undefined) {
      const category = args.category;
      results = await ctx.db
        .query("expenses")
        .withIndex("by_category", (q) => q.eq("category", category))
        .order("desc")
        .take(500);
    } else if (args.origin !== undefined) {
      const origin = args.origin;
      results = await ctx.db
        .query("expenses")
        .withIndex("by_origin", (q) => q.eq("origin", origin))
        .order("desc")
        .take(500);
    } else {
      results = await ctx.db.query("expenses").withIndex("by_dueDate").order("desc").take(500);
    }

    let filtered = results;
    if (args.status !== undefined) filtered = filtered.filter((e) => e.status === args.status);
    if (args.category !== undefined) filtered = filtered.filter((e) => e.category === args.category);
    if (args.origin !== undefined) filtered = filtered.filter((e) => e.origin === args.origin);
    if (args.templateId !== undefined) filtered = filtered.filter((e) => e.templateId === args.templateId);

    const now = Date.now();
    return filtered.map((e) => withDerivedStatus(e, now));
  },
});

export const get = query({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.id);
    if (!expense) return null;
    const template = expense.templateId ? await ctx.db.get(expense.templateId) : null;
    return { expense: withDerivedStatus(expense, Date.now()), template };
  },
});

export const getAuditTrail = query({
  args: { referenceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_referenceId", (q) => q.eq("referenceId", args.referenceId))
      .order("desc")
      .take(200);
  },
});

export const getDashboard = query({
  handler: async (ctx) => {
    const now = Date.now();
    const currentMonthKey = monthKey(now);

    const currentBucket = await ctx.db
      .query("expenseCounters")
      .withIndex("by_counter_id", (q) => q.eq("id", currentMonthKey))
      .first();

    const paid = currentBucket?.paidAmount || 0;
    const pending = currentBucket?.pendingAmount || 0;
    const overdue = currentBucket?.overdueAmount || 0;

    const monthlyTrend: { month: string; paid: number; pending: number; overdue: number; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCMonth(d.getUTCMonth() - i);
      const key = monthKey(d.getTime());
      const bucket = await ctx.db
        .query("expenseCounters")
        .withIndex("by_counter_id", (q) => q.eq("id", key))
        .first();
      const bPaid = bucket?.paidAmount || 0;
      const bPending = bucket?.pendingAmount || 0;
      const bOverdue = bucket?.overdueAmount || 0;
      monthlyTrend.push({ month: key, paid: bPaid, pending: bPending, overdue: bOverdue, total: bPaid + bPending + bOverdue });
    }

    return {
      totalThisMonth: paid + pending + overdue,
      paid,
      pending,
      overdue,
      byCategory: currentBucket?.expensesByCategory || {},
      statusBreakdown: {
        paidCount: currentBucket?.paidCount || 0,
        pendingCount: currentBucket?.pendingCount || 0,
        overdueCount: currentBucket?.overdueCount || 0,
        cancelledCount: currentBucket?.cancelledCount || 0,
      },
      monthlyTrend,
    };
  },
});

export const getMonthlyReport = query({
  args: { month: v.string() },
  handler: async (ctx, args) => {
    const bucket = await ctx.db
      .query("expenseCounters")
      .withIndex("by_counter_id", (q) => q.eq("id", args.month))
      .first();

    const [yearStr, monthStr] = args.month.split("-");
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const rangeStart = Date.UTC(year, monthIdx, 1, 0, 0, 0, 0);
    const rangeEnd = Date.UTC(year, monthIdx + 1, 1, 0, 0, 0, 0);

    const rows = await ctx.db
      .query("expenses")
      .withIndex("by_dueDate", (q) => q.gte("dueDate", rangeStart).lt("dueDate", rangeEnd))
      .order("asc")
      .take(1000);

    const now = Date.now();
    const displayRows = rows.map((e) => withDerivedStatus(e, now));

    const cashFlow = rows
      .filter((e) => e.status === "Paid" && e.paymentDate !== undefined)
      .sort((a, b) => (a.paymentDate || 0) - (b.paymentDate || 0))
      .map((e) => ({
        paymentDate: e.paymentDate,
        title: e.title,
        category: e.category,
        amount: e.amount,
        paymentMethod: e.paymentMethod,
      }));

    const paidAmount = bucket?.paidAmount || 0;
    const pendingAmount = bucket?.pendingAmount || 0;
    const overdueAmount = bucket?.overdueAmount || 0;

    return {
      summary: {
        totalCount: bucket?.totalCount || 0,
        paidAmount,
        pendingAmount,
        overdueAmount,
        totalAmount: paidAmount + pendingAmount + overdueAmount,
      },
      byCategory: bucket?.expensesByCategory || {},
      paidVsPending: {
        paidCount: bucket?.paidCount || 0,
        pendingCount: bucket?.pendingCount || 0,
        overdueCount: bucket?.overdueCount || 0,
        cancelledCount: bucket?.cancelledCount || 0,
      },
      recurringVsManual: {
        recurringCount: bucket?.recurringCount || 0,
        manualCount: bucket?.manualCount || 0,
      },
      cashFlow,
      rows: displayRows,
    };
  },
});

export const sweepOverdueExpenses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stale = await ctx.db
      .query("expenses")
      .withIndex("by_status_and_dueDate", (q) => q.eq("status", "Pending").lt("dueDate", now))
      .take(500);

    let flipped = 0;
    for (const expense of stale) {
      await ctx.db.patch(expense._id, { status: "Overdue", updatedAt: now });
      const updated = await ctx.db.get(expense._id);
      if (updated) await updateExpenseCountersHelper(ctx, expense, updated);
      flipped += 1;
    }

    return { flipped };
  },
});

// Admin utility to correct any drift in expenseCounters (e.g. after a direct DB import).
export const recomputeExpenseCounters = internalMutation({
  args: {},
  handler: async (ctx) => {
    await recomputeExpenseCountersFromScratch(ctx);
  },
});
