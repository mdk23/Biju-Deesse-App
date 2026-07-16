import { normalizePaymentMethod } from "./utils";

export async function updateFinancialStats(ctx: any, args: {
  dateStr: string; // YYYY-MM-DD format as stored in database
  revenueDelta?: number;
  profitDelta?: number;
  itemsSoldDelta?: number;
  transactionDelta?: number;
  pendingAmountDelta?: number;
  paymentsByMethodDelta?: Record<string, number>;
  salesByCategoryDelta?: Record<string, number>;
  completedOrdersDelta?: number;
  pendingOrdersDelta?: number;
  partiallyPaidOrdersDelta?: number;
  inventoryCostSoldDelta?: number;
  inventoryRetailSoldDelta?: number;
  debtRecoveredDelta?: number;
  refundDelta?: number;
  cashSalesDelta?: number;
  newCustomersDelta?: number;
  returningCustomersDelta?: number;
  creditIssuedDelta?: number;
  creditRedeemedDelta?: number;
  debtCreatedDelta?: number;
}) {
  const {
    dateStr,
    revenueDelta = 0,
    profitDelta = 0,
    itemsSoldDelta = 0,
    transactionDelta = 0,
    pendingAmountDelta = 0,
    paymentsByMethodDelta = {},
    salesByCategoryDelta = {},
    completedOrdersDelta = 0,
    pendingOrdersDelta = 0,
    partiallyPaidOrdersDelta = 0,
    inventoryCostSoldDelta = 0,
    inventoryRetailSoldDelta = 0,
    debtRecoveredDelta = 0,
    refundDelta = 0,
    cashSalesDelta = 0,
    newCustomersDelta = 0,
    returningCustomersDelta = 0,
    creditIssuedDelta = 0,
    creditRedeemedDelta = 0,
    debtCreatedDelta = 0,
  } = args;

  // 1. Update dailyStats
  const dailyStat = await ctx.db
    .query("dailyStats")
    .withIndex("by_date", (q: any) => q.eq("date", dateStr))
    .first();

  if (dailyStat) {
    const updatedPaymentsByMethod = { ...(dailyStat.paymentsByMethod || {}) };
    for (const [method, amount] of Object.entries(paymentsByMethodDelta)) {
      const normMethod = normalizePaymentMethod(method);
      updatedPaymentsByMethod[normMethod] = (updatedPaymentsByMethod[normMethod] || 0) + amount;
    }

    const updatedSalesByCategory = { ...(dailyStat.salesByCategory || {}) };
    for (const [category, qty] of Object.entries(salesByCategoryDelta)) {
      updatedSalesByCategory[category] = (updatedSalesByCategory[category] || 0) + qty;
    }

    await ctx.db.patch(dailyStat._id, {
      totalRevenue: Math.max(0, (dailyStat.totalRevenue || 0) + revenueDelta),
      totalProfit: Math.max(0, (dailyStat.totalProfit || 0) + profitDelta),
      transactionCount: Math.max(0, (dailyStat.transactionCount || 0) + transactionDelta),
      itemsSold: Math.max(0, (dailyStat.itemsSold || 0) + itemsSoldDelta),
      totalPending: Math.max(0, (dailyStat.totalPending || 0) + pendingAmountDelta),
      paymentsByMethod: updatedPaymentsByMethod,
      salesByCategory: updatedSalesByCategory,
      totalOrders: Math.max(0, (dailyStat.totalOrders || 0) + transactionDelta),
      completedOrders: Math.max(0, (dailyStat.completedOrders || 0) + completedOrdersDelta),
      pendingOrders: Math.max(0, (dailyStat.pendingOrders || 0) + pendingOrdersDelta),
      fullyPaidOrders: Math.max(0, (dailyStat.fullyPaidOrders || 0) + completedOrdersDelta),
      partiallyPaidOrders: Math.max(0, (dailyStat.partiallyPaidOrders || 0) + partiallyPaidOrdersDelta),
      refundAmount: Math.max(0, (dailyStat.refundAmount || 0) + refundDelta),
      cashSales: Math.max(0, (dailyStat.cashSales || 0) + cashSalesDelta),
      inventoryCostSold: Math.max(0, (dailyStat.inventoryCostSold || 0) + inventoryCostSoldDelta),
      inventoryRetailSold: Math.max(0, (dailyStat.inventoryRetailSold || 0) + inventoryRetailSoldDelta),
      newCustomers: Math.max(0, (dailyStat.newCustomers || 0) + newCustomersDelta),
      returningCustomers: Math.max(0, (dailyStat.returningCustomers || 0) + returningCustomersDelta),
      creditIssuedToday: Math.max(0, (dailyStat.creditIssuedToday || 0) + creditIssuedDelta),
      creditRedeemedToday: Math.max(0, (dailyStat.creditRedeemedToday || 0) + creditRedeemedDelta),
      debtCreatedToday: Math.max(0, (dailyStat.debtCreatedToday || 0) + debtCreatedDelta),
      debtRecoveredToday: Math.max(0, (dailyStat.debtRecoveredToday || 0) + debtRecoveredDelta),
    });
  } else {
    const paymentsByMethod: Record<string, number> = {};
    for (const [method, amount] of Object.entries(paymentsByMethodDelta)) {
      const normMethod = normalizePaymentMethod(method);
      paymentsByMethod[normMethod] = amount;
    }

    await ctx.db.insert("dailyStats", {
      date: dateStr,
      totalRevenue: Math.max(0, revenueDelta),
      totalProfit: Math.max(0, profitDelta),
      transactionCount: Math.max(0, transactionDelta),
      itemsSold: Math.max(0, itemsSoldDelta),
      totalPending: Math.max(0, pendingAmountDelta),
      paymentsByMethod,
      salesByCategory: salesByCategoryDelta,
      totalOrders: Math.max(0, transactionDelta),
      completedOrders: Math.max(0, completedOrdersDelta),
      pendingOrders: Math.max(0, pendingOrdersDelta),
      fullyPaidOrders: Math.max(0, completedOrdersDelta),
      partiallyPaidOrders: Math.max(0, partiallyPaidOrdersDelta),
      refundAmount: Math.max(0, refundDelta),
      cashSales: Math.max(0, cashSalesDelta),
      inventoryCostSold: Math.max(0, inventoryCostSoldDelta),
      inventoryRetailSold: Math.max(0, inventoryRetailSoldDelta),
      newCustomers: Math.max(0, newCustomersDelta),
      returningCustomers: Math.max(0, returningCustomersDelta),
      creditIssuedToday: Math.max(0, creditIssuedDelta),
      creditRedeemedToday: Math.max(0, creditRedeemedDelta),
      debtCreatedToday: Math.max(0, debtCreatedDelta),
      debtRecoveredToday: Math.max(0, debtRecoveredDelta),
    });
  }

  // 2. Update globalCounters
  const globalCounter = await ctx.db
    .query("globalCounters")
    .withIndex("by_counter_id", (q: any) => q.eq("id", "main"))
    .first();

  if (globalCounter) {
    await ctx.db.patch(globalCounter._id, {
      totalRevenue: Math.max(0, (globalCounter.totalRevenue || 0) + revenueDelta),
      totalProfit: Math.max(0, (globalCounter.totalProfit || 0) + profitDelta),
      transactionCount: Math.max(0, (globalCounter.transactionCount || 0) + transactionDelta),
      totalOrders: Math.max(0, (globalCounter.totalOrders || 0) + transactionDelta),
      completedOrders: Math.max(0, (globalCounter.completedOrders || 0) + completedOrdersDelta),
      pendingOrders: Math.max(0, (globalCounter.pendingOrders || 0) + pendingOrdersDelta),
      totalRefundAmount: Math.max(0, (globalCounter.totalRefundAmount || 0) + refundDelta),
      totalCreditIssued: Math.max(0, (globalCounter.totalCreditIssued || 0) + creditIssuedDelta),
      totalCreditRedeemed: Math.max(0, (globalCounter.totalCreditRedeemed || 0) + creditRedeemedDelta),
      totalDebtCreated: Math.max(0, (globalCounter.totalDebtCreated || 0) + debtCreatedDelta),
      totalDebtRecovered: Math.max(0, (globalCounter.totalDebtRecovered || 0) + debtRecoveredDelta),
    });
  }
}
