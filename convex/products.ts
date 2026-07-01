import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { updateDailyMovementStats } from "./utils";

async function updateInventoryCountersHelper(ctx: any, args: {
  diffProducts?: number,
  diffUnits?: number,
  diffValue?: number,
  diffLowStock?: number,
  diffOutOfStock?: number,
}) {
  const counter = await ctx.db.query("inventoryCounters").withIndex("by_counter_id", (q: any) => q.eq("id", "main")).first();
  if (counter) {
    await ctx.db.patch(counter._id, {
      totalProducts: Math.max(0, counter.totalProducts + (args.diffProducts || 0)),
      totalUnitsInStock: Math.max(0, counter.totalUnitsInStock + (args.diffUnits || 0)),
      inventoryValue: Math.max(0, counter.inventoryValue + (args.diffValue || 0)),
      lowStockItems: Math.max(0, counter.lowStockItems + (args.diffLowStock || 0)),
      outOfStockItems: Math.max(0, counter.outOfStockItems + (args.diffOutOfStock || 0)),
    });
  } else {
    await ctx.db.insert("inventoryCounters", {
      id: "main",
      totalProducts: Math.max(0, args.diffProducts || 0),
      totalUnitsInStock: Math.max(0, args.diffUnits || 0),
      inventoryValue: Math.max(0, args.diffValue || 0),
      lowStockItems: Math.max(0, args.diffLowStock || 0),
      outOfStockItems: Math.max(0, args.diffOutOfStock || 0),
      deadStockItems: 0,
      reservedStock: 0,
    });
  }
}

// Get all products (live subscription ready)
export const list = query({
  args: { archived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const archivedStatus = args.archived ?? false;
    return await ctx.db
      .query("products")
      .withIndex("by_archived", (q) => q.eq("archived", archivedStatus))
      .take(500);
  },
});

// Get a single product by ID
export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create or Update Product
export const upsert = mutation({
  args: {
    id: v.optional(v.id("products")),
    code: v.string(),
    name: v.string(),
    category: v.string(),
    costPrice: v.number(),
    sellingPrice: v.number(),
    stock: v.number(),
    reorderLevel: v.number(),
    archived: v.boolean(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    let valueDiff = 0;
    let idToReturn = id;

    let diffProducts = 0;
    let diffUnits = 0;
    let diffLowStock = 0;
    let diffOutOfStock = 0;

    if (id) {
      const existing = await ctx.db.get(id);
      if (existing) {
        valueDiff = (data.costPrice * data.stock) - (existing.costPrice * existing.stock);
        diffUnits = data.stock - existing.stock;
        
        const wasLow = existing.stock <= existing.reorderLevel && existing.stock > 0;
        const isLow = data.stock <= data.reorderLevel && data.stock > 0;
        if (!wasLow && isLow) diffLowStock = 1;
        if (wasLow && !isLow) diffLowStock = -1;

        const wasOut = existing.stock <= 0;
        const isOut = data.stock <= 0;
        if (!wasOut && isOut) diffOutOfStock = 1;
        if (wasOut && !isOut) diffOutOfStock = -1;
      }
      await ctx.db.patch(id, data);
    } else {
      valueDiff = data.costPrice * data.stock;
      diffProducts = 1;
      diffUnits = data.stock;
      if (data.stock <= data.reorderLevel && data.stock > 0) diffLowStock = 1;
      if (data.stock <= 0) diffOutOfStock = 1;
      idToReturn = await ctx.db.insert("products", data);
    }

    if (valueDiff !== 0) {
      const globalCounter = await ctx.db
        .query("globalCounters")
        .withIndex("by_counter_id", (q) => q.eq("id", "main"))
        .first();
      if (globalCounter) {
        await ctx.db.patch(globalCounter._id, {
          inventoryValuation: (globalCounter.inventoryValuation || 0) + valueDiff,
        });
      }
    }

    await updateInventoryCountersHelper(ctx, {
      diffProducts,
      diffUnits,
      diffValue: valueDiff,
      diffLowStock,
      diffOutOfStock,
    });

    return idToReturn;
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (product) {
      const valueDiff = -(product.costPrice * product.stock);
      
      const globalCounter = await ctx.db
        .query("globalCounters")
        .withIndex("by_counter_id", (q) => q.eq("id", "main"))
        .first();
      if (globalCounter) {
        await ctx.db.patch(globalCounter._id, {
          inventoryValuation: (globalCounter.inventoryValuation || 0) + valueDiff,
        });
      }

      await updateInventoryCountersHelper(ctx, {
        diffProducts: -1,
        diffUnits: -product.stock,
        diffValue: valueDiff,
        diffLowStock: (product.stock <= product.reorderLevel && product.stock > 0) ? -1 : 0,
        diffOutOfStock: product.stock <= 0 ? -1 : 0,
      });
    }
    await ctx.db.delete(args.id);
  },
});

// Adjust inventory stock with logging
export const adjustStock = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(), // + or -
    reason: v.string(),
    type: v.string(), // "Adjustment", "Damage", "Manual Correction"
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const previousStock = product.stock;
    const newStock = previousStock + args.quantity;

    // Update product stock
    await ctx.db.patch(args.productId, { stock: newStock });

    // Log movement
    await ctx.db.insert("inventoryMovements", {
      productId: args.productId,
      movementType: args.type,
      quantity: args.quantity,
      previousStock,
      newStock,
      reason: args.reason,
      createdAt: Date.now(),
    });

    const valueDiff = args.quantity * product.costPrice;
    if (valueDiff !== 0) {
      const globalCounter = await ctx.db
        .query("globalCounters")
        .withIndex("by_counter_id", (q) => q.eq("id", "main"))
        .first();
      if (globalCounter) {
        await ctx.db.patch(globalCounter._id, {
          inventoryValuation: (globalCounter.inventoryValuation || 0) + valueDiff,
        });
      }
    }

    let diffLowStock = 0;
    let diffOutOfStock = 0;

    const wasLow = previousStock <= product.reorderLevel && previousStock > 0;
    const isLow = newStock <= product.reorderLevel && newStock > 0;
    if (!wasLow && isLow) diffLowStock = 1;
    if (wasLow && !isLow) diffLowStock = -1;

    const wasOut = previousStock <= 0;
    const isOut = newStock <= 0;
    if (!wasOut && isOut) diffOutOfStock = 1;
    if (wasOut && !isOut) diffOutOfStock = -1;

    await updateInventoryCountersHelper(ctx, {
      diffUnits: args.quantity,
      diffValue: valueDiff,
      diffLowStock,
      diffOutOfStock,
    });

    await updateDailyMovementStats(ctx, args.type, args.quantity);

    return newStock;
  },
});

// Smart Logic: Get low stock alerts
export const getLowStock = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .filter((q) => q.lte(q.field("stock"), q.field("reorderLevel")))
      .take(500);
  },
});

export const getInventoryAnalytics = query({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").filter(q => q.eq(q.field("archived"), false)).take(1000);
    const movements = await ctx.db.query("inventoryMovements").order("desc").take(1000);
    
    const now = Date.now();
    const sixMonthsAgo = now - (180 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const productMovements: Record<string, { lastSeen: number, velocity: number }> = {};

    products.forEach(p => {
      totalStockValue += p.costPrice * p.stock;
      if (p.stock <= 0) outOfStockCount++;
      else if (p.stock <= p.reorderLevel) lowStockCount++;
      
      productMovements[p._id] = { lastSeen: 0, velocity: 0 };
    });

    movements.forEach(m => {
      const pid = m.productId;
      if (productMovements[pid]) {
        if (m.createdAt > productMovements[pid].lastSeen) {
          productMovements[pid].lastSeen = m.createdAt;
        }
        if (m.movementType === "Sale" && m.createdAt > thirtyDaysAgo) {
          productMovements[pid].velocity += Math.abs(m.quantity);
        }
      }
    });

    const deadStockCount = products.filter(p => {
      const last = productMovements[p._id]?.lastSeen || 0;
      return last < sixMonthsAgo;
    }).length;

    const fastMovingProducts = products
      .map(p => ({
        name: p.name,
        velocity: productMovements[p._id]?.velocity || 0
      }))
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 5);

    return {
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      deadStockCount,
      fastMovingProducts,
      // Trend placeholders (to be expanded with historical snapshots if required)
      valuationTrend: 12.5,
      lowStockTrend: -2.1
    };
  },
});
