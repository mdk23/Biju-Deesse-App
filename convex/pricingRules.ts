import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUser } from "./authHelpers";

function requireManager(user: { role: string }, action: string) {
  if (user.role !== "admin" && user.role !== "manager") {
    throw new Error(`Unauthorized. Only admins and managers can ${action}.`);
  }
}

function validateTiers(tiers: { quantityThreshold: number; unitPrice: number }[]) {
  if (tiers.length === 0) {
    throw new Error("A pricing rule needs at least one tier.");
  }
  const seen = new Set<number>();
  for (const t of tiers) {
    if (!Number.isInteger(t.quantityThreshold) || t.quantityThreshold < 1) {
      throw new Error("Quantity threshold must be a whole number of 1 or more.");
    }
    if (t.unitPrice < 0) {
      throw new Error("Unit price cannot be negative.");
    }
    if (seen.has(t.quantityThreshold)) {
      throw new Error(`Duplicate threshold: ${t.quantityThreshold}+ is used more than once.`);
    }
    seen.add(t.quantityThreshold);
  }
}

// Authoritative conflict guard: a product may only be governed by one ACTIVE
// rule at a time. thisRuleId is excluded from the check (a rule's own
// existing links to these same products are not a conflict with itself).
async function assertNoConflicts(ctx: any, productIds: Id<"products">[], thisRuleId: Id<"pricingRules"> | null) {
  for (const productId of productIds) {
    const link = await ctx.db
      .query("pricingRuleProducts")
      .withIndex("by_product", (q: any) => q.eq("productId", productId))
      .first();
    if (link && link.pricingRuleId !== thisRuleId) {
      const otherRule = await ctx.db.get(link.pricingRuleId);
      if (otherRule && otherRule.active) {
        const product = await ctx.db.get(productId);
        throw new Error(
          `"${product?.name || productId}" is already governed by the active rule "${otherRule.name}". ` +
          `Remove it from that rule first, or deactivate that rule.`
        );
      }
    }
  }
}

// List rules plus enough context for the product picker: how many products
// each rule applies to, and which productIds are currently claimed by which
// ACTIVE rule (so the picker can gray those out for every rule but that one).
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rules = await ctx.db.query("pricingRules").order("desc").take(500);
    const links = await ctx.db.query("pricingRuleProducts").take(5000);

    const countByRule = new Map<string, number>();
    for (const link of links) {
      countByRule.set(link.pricingRuleId, (countByRule.get(link.pricingRuleId) || 0) + 1);
    }

    const ruleById = new Map(rules.map((r: any) => [r._id, r]));
    const claimedProductNames: Record<string, string> = {};
    for (const link of links) {
      const rule = ruleById.get(link.pricingRuleId);
      if (rule && rule.active) {
        claimedProductNames[link.productId] = rule.name;
      }
    }

    return {
      rules: rules.map((r: any) => ({ ...r, productCount: countByRule.get(r._id) || 0 })),
      claimedProductNames,
    };
  },
});

// Which productIds belong to a specific rule -- used to pre-check the picker
// when opening the edit form.
export const getProductIdsForRule = query({
  args: { pricingRuleId: v.id("pricingRules") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("pricingRuleProducts")
      .withIndex("by_rule", (q: any) => q.eq("pricingRuleId", args.pricingRuleId))
      .collect();
    return links.map((l: any) => l.productId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    tiers: v.array(v.object({ quantityThreshold: v.number(), unitPrice: v.number() })),
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    requireManager(user, "create pricing rules");

    if (!args.name.trim()) throw new Error("Rule name is required.");
    validateTiers(args.tiers);
    await assertNoConflicts(ctx, args.productIds, null);

    const now = Date.now();
    const ruleId = await ctx.db.insert("pricingRules", {
      name: args.name.trim(),
      tiers: [...args.tiers].sort((a, b) => a.quantityThreshold - b.quantityThreshold),
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    for (const productId of args.productIds) {
      await ctx.db.insert("pricingRuleProducts", { pricingRuleId: ruleId, productId });
    }
    return ruleId;
  },
});

export const update = mutation({
  args: {
    id: v.id("pricingRules"),
    name: v.string(),
    tiers: v.array(v.object({ quantityThreshold: v.number(), unitPrice: v.number() })),
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    requireManager(user, "edit pricing rules");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Pricing rule not found.");
    if (!args.name.trim()) throw new Error("Rule name is required.");
    validateTiers(args.tiers);
    await assertNoConflicts(ctx, args.productIds, args.id);

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      tiers: [...args.tiers].sort((a, b) => a.quantityThreshold - b.quantityThreshold),
      updatedAt: Date.now(),
    });

    // Reconcile join rows by diffing old vs. new productIds, rather than
    // delete-all-then-reinsert.
    const existingLinks = await ctx.db
      .query("pricingRuleProducts")
      .withIndex("by_rule", (q: any) => q.eq("pricingRuleId", args.id))
      .collect();
    const existingIds = new Set(existingLinks.map((l: any) => l.productId));
    const nextIds = new Set(args.productIds);

    for (const link of existingLinks) {
      if (!nextIds.has(link.productId)) await ctx.db.delete(link._id);
    }
    for (const productId of args.productIds) {
      if (!existingIds.has(productId)) {
        await ctx.db.insert("pricingRuleProducts", { pricingRuleId: args.id, productId });
      }
    }
  },
});

export const setActive = mutation({
  args: { id: v.id("pricingRules"), active: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    requireManager(user, "enable or disable pricing rules");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Pricing rule not found.");

    if (args.active) {
      // Re-activating: re-check conflicts against this rule's own current products.
      const links = await ctx.db
        .query("pricingRuleProducts")
        .withIndex("by_rule", (q: any) => q.eq("pricingRuleId", args.id))
        .collect();
      await assertNoConflicts(ctx, links.map((l: any) => l.productId), args.id);
    }
    await ctx.db.patch(args.id, { active: args.active, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("pricingRules") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin") {
      throw new Error("Unauthorized. Only admins can delete pricing rules.");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Pricing rule not found.");

    const links = await ctx.db
      .query("pricingRuleProducts")
      .withIndex("by_rule", (q: any) => q.eq("pricingRuleId", args.id))
      .collect();
    for (const link of links) await ctx.db.delete(link._id);
    await ctx.db.delete(args.id);
  },
});
