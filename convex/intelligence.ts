import { DatabaseReader, DatabaseWriter } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";

async function updateCustomerCountersHelper(db: DatabaseWriter, oldC: any, newC: any) {
  const counter = await db.query("customerCounters").withIndex("by_counter_id", (q) => q.eq("id", "main")).first();
  let diffs: any = {};
  
  if (oldC.financialTier !== newC.financialTier) {
    if (oldC.financialTier) diffs[`${oldC.financialTier.toLowerCase()}Customers`] = -1;
    if (newC.financialTier) diffs[`${newC.financialTier.toLowerCase()}Customers`] = 1;
  }
  
  if (oldC.loyaltyLevel !== newC.loyaltyLevel) {
    if (oldC.loyaltyLevel) diffs[`${oldC.loyaltyLevel.toLowerCase()}Customers`] = -1;
    if (newC.loyaltyLevel) diffs[`${newC.loyaltyLevel.toLowerCase()}Customers`] = 1;
  }
  
  if (oldC.creditStatus !== newC.creditStatus) {
    if (oldC.creditStatus === "Overdue") diffs.overdueCustomers = -1;
    if (newC.creditStatus === "Overdue") diffs.overdueCustomers = 1;
  }

  if (counter) {
    const patch: any = {};
    for (const [key, val] of Object.entries(diffs)) {
      patch[key] = Math.max(0, (counter as any)[key] + (val as number));
    }
    if (Object.keys(patch).length > 0) {
      await db.patch(counter._id, patch);
    }
  } else {
    const initial: any = {
      id: "main",
      totalCustomers: 1,
      activeCustomers: 1,
      inactiveCustomers: 0,
      regularCustomers: 0,
      premiumCustomers: 0,
      vipCustomers: 0,
      platinumCustomers: 0,
      bronzeCustomers: 0,
      silverCustomers: 0,
      goldCustomers: 0,
      diamondCustomers: 0,
      customersWithCredit: 0,
      customersWithDebt: 0,
      overdueCustomers: 0,
    };
    for (const [key, val] of Object.entries(diffs)) {
      initial[key] = Math.max(0, initial[key] + (val as number));
    }
    await db.insert("customerCounters", initial);
  }
}


export async function recomputeCustomerIntelligence(db: DatabaseWriter | DatabaseReader, customerId: Id<"customers">) {
  const customer = await db.get(customerId);
  if (!customer) return null;

  // 1. Fetch transactions for this customer
  const transactions = await db
    .query("transactions")
    .withIndex("by_customer", (q) => q.eq("customerId", customerId))
    .collect();

  const totalSpent = transactions.reduce((acc, tx) => acc + tx.total, 0);
  const orderCount = transactions.length;

  let lastPurchaseDate = customer.lastPurchaseDate;
  if (transactions.length > 0) {
    const sorted = [...transactions].sort((a, b) => b._creationTime - a._creationTime);
    lastPurchaseDate = sorted[0]._creationTime;
  }

  // 2. Fetch all payments for this customer to determine unpaid amounts / overdue invoices
  let creditStatus = "Good Standing";
  let hasOverdue = false;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;

  // Fetch all payments for this customer in a single query to avoid N+1 query pattern
  const allPayments = await db
    .query("payments")
    .withIndex("by_customer", (q) => q.eq("customerId", customerId))
    .collect();

  // Group payments by transactionId in-memory
  const paymentsByTxId = new Map<string, number>();
  for (const p of allPayments) {
    paymentsByTxId.set(p.transactionId, (paymentsByTxId.get(p.transactionId) || 0) + p.amount);
  }

  let totalLifetimePayments = 0;
  let oldestUnpaidDate = now;

  for (const tx of transactions) {
    const paid = paymentsByTxId.get(tx._id) || 0;
    totalLifetimePayments += paid;
    
    // If the individual transaction was underpaid, track its date for overdue logic
    if (paid < tx.total && tx._creationTime < oldestUnpaidDate) {
      oldestUnpaidDate = tx._creationTime;
    }
  }

  const currentDebt = customer.debitBalance || 0;
  
  if (currentDebt > 0 && oldestUnpaidDate < thirtyDaysAgo) {
    hasOverdue = true;
  }

  // Generic Customer Lockdown
  const isGeneric = customer.firstName.toLowerCase() === "walk-in" || 
                    customer.lastName.toLowerCase() === "walk-in" ||
                    customer.firstName.toLowerCase() === "generic" ||
                    customer.lastName.toLowerCase() === "generic";

  if (isGeneric) {
    creditStatus = "Good Standing";
  } else if (hasOverdue) {
    creditStatus = "Overdue";
  } else if (currentDebt > 0) {
    creditStatus = "Outstanding";
  } else {
    creditStatus = "Good Standing";
  }

  // 3. Compute Financial Tier
  let financialTier = "Regular";
  if (totalSpent > 500000) {
    financialTier = "Platinum";
  } else if (totalSpent > 100000) {
    financialTier = "VIP";
  } else if (totalSpent > 25000) {
    financialTier = "Premium";
  }

  // 4. Compute Loyalty Level
  let loyaltyLevel = "Bronze";
  if (orderCount > 75) {
    loyaltyLevel = "Diamond";
  } else if (orderCount > 50) {
    loyaltyLevel = "Gold";
  } else if (orderCount > 25) {
    loyaltyLevel = "Silver";
  }

  // Apply decay rule: If no purchase in 90 days -> downgrade loyalty by 1 level
  const ninetyDaysAgo = now - 90 * 24 * 3600 * 1000;
  const isInactive = lastPurchaseDate && lastPurchaseDate < ninetyDaysAgo;

  if (isInactive) {
    if (loyaltyLevel === "Diamond") {
      loyaltyLevel = "Gold";
    } else if (loyaltyLevel === "Gold") {
      loyaltyLevel = "Silver";
    } else if (loyaltyLevel === "Silver") {
      loyaltyLevel = "Bronze";
    }
  }

  // 5. Compute Customer Score (0–100)
  // Financial Score (50%)
  const financialScore = Math.min(100, (totalSpent / 500000) * 100);

  // Loyalty Score (30%)
  let loyaltyScore = 25;
  if (loyaltyLevel === "Diamond") loyaltyScore = 100;
  else if (loyaltyLevel === "Gold") loyaltyScore = 75;
  else if (loyaltyLevel === "Silver") loyaltyScore = 50;

  // Apply score penalty if 90-day decay is active
  if (isInactive) {
    loyaltyScore = Math.max(0, loyaltyScore - 20);
  }

  // Payment Score (20%)
  let paymentScore = 100;
  if (isGeneric) {
    paymentScore = 100;
  } else if (creditStatus === "Overdue") {
    paymentScore = 20;
  } else if (creditStatus === "Outstanding") {
    // Score penalty based on debt size (assuming a nominal 100k threshold)
    paymentScore = Math.max(40, Math.min(90, 100 - (currentDebt / 100000) * 50));
  }

  // Composite Score
  let customerScore = 0;
  if (orderCount > 0) {
    const scoreRaw = (financialScore * 0.5) + (loyaltyScore * 0.3) + (paymentScore * 0.2);
    customerScore = Math.round(Math.max(0, Math.min(100, scoreRaw)));
  }

  // 6. Compute Customer Health
  let customerHealth = "At Risk";
  if (orderCount === 0) {
    customerHealth = "New Client";
  } else if (customerScore >= 90) {
    customerHealth = "Elite Client";
  } else if (customerScore >= 75) {
    customerHealth = "Valuable Client";
  } else if (customerScore >= 50) {
    customerHealth = "Growing Client";
  }

  // Write changes back to the database
  if ("patch" in db) {
    await (db as DatabaseWriter).patch(customerId, {
      totalSpent,
      orderCount,
      lastPurchaseDate,
      financialTier,
      loyaltyLevel,
      creditStatus,
      customerScore,
      customerHealth,
      customerType: "Registered"
    });

    await updateCustomerCountersHelper(db as DatabaseWriter, customer, {
      financialTier,
      loyaltyLevel,
      creditStatus,
    });
  }

  return {
    totalSpent,
    orderCount,
    lastPurchaseDate,
    financialTier,
    loyaltyLevel,
    creditStatus,
    customerScore,
    customerHealth
  };
}

export const recomputeAllCustomers = mutation({
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").collect();
    for (const customer of customers) {
      await recomputeCustomerIntelligence(ctx.db, customer._id);
    }
    return `Recomputed intelligence for ${customers.length} customers`;
  },
});

export const forceRecompute = mutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    return await recomputeCustomerIntelligence(ctx.db, args.customerId);
  }
});

export const runLoyaltyDecaySweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").collect();
    let updatedCount = 0;
    for (const customer of customers) {
      const result = await recomputeCustomerIntelligence(ctx.db, customer._id);
      if (result) {
        updatedCount++;
      }
    }
    console.log(`Swept ${customers.length} customers, updated intelligence metrics for ${updatedCount} profiles.`);
    return updatedCount;
  }
});
