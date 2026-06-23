import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all products (live subscription ready)
export const list = query({
  args: { archived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const archivedStatus = args.archived ?? false;
    return await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("archived"), archivedStatus))
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

    if (id) {
      const existing = await ctx.db.get(id);
      if (existing) {
        valueDiff = (data.costPrice * data.stock) - (existing.costPrice * existing.stock);
      }
      await ctx.db.patch(id, data);
    } else {
      valueDiff = data.costPrice * data.stock;
      idToReturn = await ctx.db.insert("products", data);
    }

    if (valueDiff !== 0) {
      const globalCounter = await ctx.db
        .query("globalCounters")
        .filter((q) => q.eq(q.field("id"), "main"))
        .first();
      if (globalCounter) {
        await ctx.db.patch(globalCounter._id, {
          inventoryValuation: (globalCounter.inventoryValuation || 0) + valueDiff,
        });
      }
    }

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
        .filter((q) => q.eq(q.field("id"), "main"))
        .first();
      if (globalCounter) {
        await ctx.db.patch(globalCounter._id, {
          inventoryValuation: (globalCounter.inventoryValuation || 0) + valueDiff,
        });
      }
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
        .filter((q) => q.eq(q.field("id"), "main"))
        .first();
      if (globalCounter) {
        await ctx.db.patch(globalCounter._id, {
          inventoryValuation: (globalCounter.inventoryValuation || 0) + valueDiff,
        });
      }
    }

    return newStock;
  },
});

// Smart Logic: Get low stock alerts
export const getLowStock = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .filter((q) => 
        q.and(
          q.eq(q.field("archived"), false),
          q.lte(q.field("stock"), q.field("reorderLevel"))
        )
      )
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
