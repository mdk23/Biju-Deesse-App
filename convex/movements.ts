import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("inventoryMovements").order("desc").collect();
  },
});

export const getForProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventoryMovements")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .collect();
  },
});

// Analytics: Detect anomalies (e.g., large manual corrections or rapid stock drop)
export const getAnomalies = query({
  handler: async (ctx) => {
    const movements = await ctx.db.query("inventoryMovements").collect();
    // Simple logic: Movements of Type "Damage" or Manual Correction > 10 units
    return movements.filter(m => 
      (m.movementType === "Damage" || m.movementType === "Manual Correction") && Math.abs(m.quantity) > 5
    );
  },
});
