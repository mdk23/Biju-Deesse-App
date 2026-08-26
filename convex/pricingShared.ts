export interface PricingTier {
  quantityThreshold: number;
  unitPrice: number;
}

/**
 * THE single implementation of quantity-tier price resolution. Never
 * reimplement this logic anywhere else (POS, checkout, reports, etc.) --
 * every caller either invokes this directly (client, with already-hydrated
 * tiers) or via getProductPriceInternal in ./pricing.ts (server, DB-backed).
 *
 * This file has zero Convex server imports so it is safe to import from
 * client components -- importing anything from ./pricing.ts client-side
 * trips Convex's assertNotBrowser guard because that module calls query().
 */
export function computeUnitPrice(basePrice: number, tiers: PricingTier[], quantity: number): number {
  let best: PricingTier | null = null;
  for (const tier of tiers) {
    if (tier.quantityThreshold <= quantity && (!best || tier.quantityThreshold > best.quantityThreshold)) {
      best = tier;
    }
  }
  return best ? best.unitPrice : basePrice;
}
