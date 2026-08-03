import { v } from "convex/values";
import { mutation, query, internalMutation, DatabaseWriter } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireUser } from "./authHelpers";
import { updateExpenseCountersHelper } from "./expenseHelpers";

/** Computes the due date (UTC midnight) of the recurrence period containing `now`. */
export function computeRecurrencePeriod(template: Doc<"expenseTemplates">, now: number): number {
  const nowDate = new Date(now);
  const y = nowDate.getUTCFullYear();
  const m = nowDate.getUTCMonth();
  const d = nowDate.getUTCDate();

  if (template.frequency === "Daily") {
    return Date.UTC(y, m, d, 0, 0, 0, 0);
  }

  if (template.frequency === "Weekly") {
    const targetDow = template.dayOfWeek ?? 0;
    const currentDow = nowDate.getUTCDay();
    const daysSinceTarget = currentDow >= targetDow ? currentDow - targetDow : currentDow - targetDow + 7;
    return Date.UTC(y, m, d - daysSinceTarget, 0, 0, 0, 0);
  }

  // Monthly
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dueDay = Math.min(Math.max(template.dueDay ?? 1, 1), daysInMonth);
  return Date.UTC(y, m, dueDay, 0, 0, 0, 0);
}

/** Idempotently creates the expense for a template's current period, if it doesn't exist yet. */
export async function generateForTemplateIfMissing(
  ctx: { db: DatabaseWriter },
  template: Doc<"expenseTemplates">,
  now: number
) {
  if (!template.active) return null;
  if (now < template.startDate) return null;
  if (template.endDate !== undefined && now > template.endDate) return null;

  const dueDate = computeRecurrencePeriod(template, now);
  if (dueDate < template.startDate) return null;
  if (template.endDate !== undefined && dueDate > template.endDate) return null;

  const existing = await ctx.db
    .query("expenses")
    .withIndex("by_templateId_and_dueDate", (q) => q.eq("templateId", template._id).eq("dueDate", dueDate))
    .first();
  if (existing) return null; // already generated for this period

  const timestamp = Date.now();
  const expenseId = await ctx.db.insert("expenses", {
    templateId: template._id,
    title: template.name,
    category: template.category,
    amount: template.amount,
    dueDate,
    status: "Pending",
    origin: "Recurring",
    notes: template.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const created = await ctx.db.get(expenseId);
  if (created) {
    await updateExpenseCountersHelper(ctx, null, created);
  }

  await ctx.db.insert("auditLogs", {
    userId: "system",
    timestamp,
    action: "GENERATE_RECURRING_EXPENSE",
    afterValue: { title: template.name, amount: template.amount, category: template.category, dueDate },
    referenceId: expenseId,
  });

  return expenseId;
}

async function runGenerationSweep(ctx: { db: DatabaseWriter }) {
  const now = Date.now();
  const templates = await ctx.db
    .query("expenseTemplates")
    .withIndex("by_active", (q) => q.eq("active", true))
    .take(500);

  let generated = 0;
  for (const template of templates) {
    const id = await generateForTemplateIfMissing(ctx, template, now);
    if (id) generated += 1;
  }

  return { templatesChecked: templates.length, generated };
}

export const generateRecurringExpensesSweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await runGenerationSweep(ctx);
  },
});

// Lets an admin/manager force today's generation immediately from the UI,
// instead of waiting for the nightly cron. Uses the same idempotent logic,
// so it's always safe to click even if the cron already ran today.
export const runRecurringGenerationNow = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin" && user.role !== "manager") {
      throw new Error("Unauthorized. Only admins and managers can trigger recurring generation.");
    }
    return await runGenerationSweep(ctx);
  },
});

export const list = query({
  args: { active: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.active !== undefined) {
      return await ctx.db
        .query("expenseTemplates")
        .withIndex("by_active", (q) => q.eq("active", args.active as boolean))
        .take(500);
    }
    return await ctx.db.query("expenseTemplates").take(500);
  },
});

export const createRecurringTemplate = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    amount: v.number(),
    frequency: v.union(v.literal("Daily"), v.literal("Weekly"), v.literal("Monthly")),
    dueDay: v.optional(v.number()),
    dayOfWeek: v.optional(v.number()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin" && user.role !== "manager") {
      throw new Error("Unauthorized. Only admins and managers can create recurring expense templates.");
    }
    if (args.amount <= 0) throw new Error("Amount must be greater than zero.");
    if (args.frequency === "Monthly" && (args.dueDay === undefined || args.dueDay < 1 || args.dueDay > 31)) {
      throw new Error("dueDay (1-31) is required for Monthly templates.");
    }
    if (args.frequency === "Weekly" && (args.dayOfWeek === undefined || args.dayOfWeek < 0 || args.dayOfWeek > 6)) {
      throw new Error("dayOfWeek (0-6) is required for Weekly templates.");
    }
    if (args.endDate !== undefined && args.endDate < args.startDate) {
      throw new Error("endDate cannot be before startDate.");
    }

    const now = Date.now();
    return await ctx.db.insert("expenseTemplates", {
      ...args,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTemplate = mutation({
  args: {
    id: v.id("expenseTemplates"),
    name: v.string(),
    category: v.string(),
    amount: v.number(),
    frequency: v.union(v.literal("Daily"), v.literal("Weekly"), v.literal("Monthly")),
    dueDay: v.optional(v.number()),
    dayOfWeek: v.optional(v.number()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin" && user.role !== "manager") {
      throw new Error("Unauthorized. Only admins and managers can edit recurring expense templates.");
    }
    const { id, ...data } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Template not found.");
    if (data.amount <= 0) throw new Error("Amount must be greater than zero.");
    if (data.frequency === "Monthly" && (data.dueDay === undefined || data.dueDay < 1 || data.dueDay > 31)) {
      throw new Error("dueDay (1-31) is required for Monthly templates.");
    }
    if (data.frequency === "Weekly" && (data.dayOfWeek === undefined || data.dayOfWeek < 0 || data.dayOfWeek > 6)) {
      throw new Error("dayOfWeek (0-6) is required for Weekly templates.");
    }
    if (data.endDate !== undefined && data.endDate < data.startDate) {
      throw new Error("endDate cannot be before startDate.");
    }

    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
  },
});

export const setTemplateActive = mutation({
  args: { id: v.id("expenseTemplates"), active: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin" && user.role !== "manager") {
      throw new Error("Unauthorized. Only admins and managers can enable or disable recurring expense templates.");
    }
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Template not found.");
    await ctx.db.patch(args.id, { active: args.active, updatedAt: Date.now() });
  },
});

export const deleteTemplate = mutation({
  args: { id: v.id("expenseTemplates") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin") {
      throw new Error("Unauthorized. Only admins can delete recurring expense templates.");
    }
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Template not found.");
    await ctx.db.delete(args.id);
  },
});
