import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { computeUnitPrice, PricingTier } from "./pricingShared";

export { computeUnitPrice };
export type { PricingTier };

/**
 * Fetches a product's active pricing rule (if any) via the indexed join --
 * never scans all pricingRules -- and resolves the price for the given
 * quantity via computeUnitPrice.
 */
export async function getProductPriceInternal(
  ctx: { db: any },
  productId: Id<"products">,
  quantity: number
): Promise<number> {
  const product = await ctx.db.get(productId);
  if (!product) throw new Error("Product not found");

  const tiers = await getActiveTiersForProduct(ctx, productId);
  return computeUnitPrice(product.sellingPrice, tiers, quantity);
}

/** Shared by getProductPriceInternal and the products.list hydration step. */
export async function getActiveTiersForProduct(
  ctx: { db: any },
  productId: Id<"products">
): Promise<PricingTier[]> {
  const link = await ctx.db
    .query("pricingRuleProducts")
    .withIndex("by_product", (q: any) => q.eq("productId", productId))
    .first();
  if (!link) return [];
  const rule = await ctx.db.get(link.pricingRuleId);
  if (!rule || !rule.active) return [];
  return rule.tiers;
}

export const getProductPrice = query({
  args: { productId: v.id("products"), quantity: v.number() },
  handler: async (ctx, args) => getProductPriceInternal(ctx, args.productId, args.quantity),
});
