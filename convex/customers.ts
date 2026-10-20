import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { recomputeCustomerIntelligence } from "./intelligence";
import { requireUser } from "./authHelpers";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("customers").order("desc").take(100);
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
      await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Increment global counter
      const globalCounter = await ctx.db
        .query("globalCounters")
        .withIndex("by_counter_id", (q) => q.eq("id", "main"))
        .first();
      if (globalCounter) {
        await ctx.db.patch(globalCounter._id, {
          activeClients: (globalCounter.activeClients || 0) + 1,
        });
      }
    }

    await recomputeCustomerIntelligence(ctx.db, customerId);
    return customerId;
  },
});

export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);

    // Decrement global counter
    const globalCounter = await ctx.db
      .query("globalCounters")
      .withIndex("by_counter_id", (q) => q.eq("id", "main"))
      .first();
    if (globalCounter) {
      await ctx.db.patch(globalCounter._id, {
        activeClients: Math.max(0, (globalCounter.activeClients || 0) - 1),
      });
    }
  },
});



// Analytics: Top spending customers
export const getTopSpenders = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_totalSpent")
      .order("desc")
      .take(args.limit);
  },
});

// Get every customer with their related sales for a full data export
export const listAllForExport = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx.db, ctx);

    const customers = await ctx.db.query("customers").collect();
    return await Promise.all(
      customers.map(async (customer) => {
        const sales = await ctx.db
          .query("transactions")
          .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
          .collect();
        return { ...customer, sales };
      })
    );
  },
});
