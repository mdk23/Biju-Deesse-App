import { DatabaseWriter } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/** Buckets an expense's due date into a "YYYY-MM" key (UTC-based). */
export function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

type CounterFields = {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  cancelledCount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  expensesByCategory: Record<string, number>;
  recurringCount: number;
  manualCount: number;
};

const emptyCounter = (): CounterFields => ({
  totalCount: 0,
  paidCount: 0,
  pendingCount: 0,
  overdueCount: 0,
  cancelledCount: 0,
  paidAmount: 0,
  pendingAmount: 0,
  overdueAmount: 0,
  expensesByCategory: {},
  recurringCount: 0,
  manualCount: 0,
});

/**
 * Applies a single expense's before/after state to the "main" bucket and the
 * due-date month bucket(s) it belongs to, via signed deltas. Pass `before:
 * null` for a create, `after: null` for a hard delete, or both for an update
 * (status change, payment, cancellation, edit).
 */
export async function updateExpenseCountersHelper(
  ctx: { db: DatabaseWriter },
  before: Doc<"expenses"> | null,
  after: Doc<"expenses"> | null
) {
  const bucketIds = new Set<string>(["main"]);
  if (before) bucketIds.add(monthKey(before.dueDate));
  if (after) bucketIds.add(monthKey(after.dueDate));

  for (const bucketId of bucketIds) {
    const counter = await ctx.db
      .query("expenseCounters")
      .withIndex("by_counter_id", (q) => q.eq("id", bucketId))
      .first();

    const fields: CounterFields = counter
      ? {
          totalCount: counter.totalCount,
          paidCount: counter.paidCount,
          pendingCount: counter.pendingCount,
          overdueCount: counter.overdueCount,
          cancelledCount: counter.cancelledCount,
          paidAmount: counter.paidAmount,
          pendingAmount: counter.pendingAmount,
          overdueAmount: counter.overdueAmount,
          expensesByCategory: { ...counter.expensesByCategory },
          recurringCount: counter.recurringCount,
          manualCount: counter.manualCount,
        }
      : emptyCounter();

    if (before && (bucketId === "main" || monthKey(before.dueDate) === bucketId)) {
      fields.totalCount -= 1;
      if (before.origin === "Recurring") fields.recurringCount -= 1;
      else fields.manualCount -= 1;
      fields.expensesByCategory[before.category] = (fields.expensesByCategory[before.category] || 0) - before.amount;
      if (before.status === "Pending") { fields.pendingCount -= 1; fields.pendingAmount -= before.amount; }
      else if (before.status === "Paid") { fields.paidCount -= 1; fields.paidAmount -= before.amount; }
      else if (before.status === "Overdue") { fields.overdueCount -= 1; fields.overdueAmount -= before.amount; }
      else if (before.status === "Cancelled") { fields.cancelledCount -= 1; }
    }

    if (after && (bucketId === "main" || monthKey(after.dueDate) === bucketId)) {
      fields.totalCount += 1;
      if (after.origin === "Recurring") fields.recurringCount += 1;
      else fields.manualCount += 1;
      fields.expensesByCategory[after.category] = (fields.expensesByCategory[after.category] || 0) + after.amount;
      if (after.status === "Pending") { fields.pendingCount += 1; fields.pendingAmount += after.amount; }
      else if (after.status === "Paid") { fields.paidCount += 1; fields.paidAmount += after.amount; }
      else if (after.status === "Overdue") { fields.overdueCount += 1; fields.overdueAmount += after.amount; }
      else if (after.status === "Cancelled") { fields.cancelledCount += 1; }
    }

    const patch = {
      totalCount: Math.max(0, fields.totalCount),
      paidCount: Math.max(0, fields.paidCount),
      pendingCount: Math.max(0, fields.pendingCount),
      overdueCount: Math.max(0, fields.overdueCount),
      cancelledCount: Math.max(0, fields.cancelledCount),
      paidAmount: Math.max(0, fields.paidAmount),
      pendingAmount: Math.max(0, fields.pendingAmount),
      overdueAmount: Math.max(0, fields.overdueAmount),
      expensesByCategory: fields.expensesByCategory,
      recurringCount: Math.max(0, fields.recurringCount),
      manualCount: Math.max(0, fields.manualCount),
    };

    if (counter) {
      await ctx.db.patch(counter._id, patch);
    } else {
      await ctx.db.insert("expenseCounters", { id: bucketId, ...patch });
    }
  }
}

/** Full rebuild of every expenseCounters bucket from the expenses table (drift correction). */
export async function recomputeExpenseCountersFromScratch(ctx: { db: DatabaseWriter }) {
  const allExpenses = await ctx.db.query("expenses").collect();

  const buckets: Record<string, CounterFields> = { main: emptyCounter() };

  for (const e of allExpenses) {
    const key = monthKey(e.dueDate);
    if (!buckets[key]) buckets[key] = emptyCounter();

    for (const bucket of [buckets.main, buckets[key]]) {
      bucket.totalCount += 1;
      if (e.origin === "Recurring") bucket.recurringCount += 1;
      else bucket.manualCount += 1;
      bucket.expensesByCategory[e.category] = (bucket.expensesByCategory[e.category] || 0) + e.amount;
      if (e.status === "Pending") { bucket.pendingCount += 1; bucket.pendingAmount += e.amount; }
      else if (e.status === "Paid") { bucket.paidCount += 1; bucket.paidAmount += e.amount; }
      else if (e.status === "Overdue") { bucket.overdueCount += 1; bucket.overdueAmount += e.amount; }
      else if (e.status === "Cancelled") { bucket.cancelledCount += 1; }
    }
  }

  const existingCounters = await ctx.db.query("expenseCounters").collect();
  const existingById = new Map(existingCounters.map((c) => [c.id, c]));

  for (const [id, data] of Object.entries(buckets)) {
    const existing = existingById.get(id);
    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("expenseCounters", { id, ...data });
    }
  }

  // Any bucket that no longer has expenses in it (e.g. all deleted) still exists
  // with stale non-zero data unless it was touched above; zero it out.
  for (const existing of existingCounters) {
    if (!buckets[existing.id]) {
      await ctx.db.patch(existing._id, emptyCounter());
    }
  }
}
