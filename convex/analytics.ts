import { query } from "./_generated/server";
import { v } from "convex/values";
import { normalizePaymentMethod } from "./utils";

export const getExecutiveBrief = query({
  args: { period: v.optional(v.string()) }, // "today", "yesterday", "this_week"
  handler: async (ctx, args) => {
    const globalCounter = await ctx.db
      .query("globalCounters")
      .withIndex("by_counter_id", (q) => q.eq("id", "main"))
      .first();
    const activeClients = globalCounter?.activeClients || 0;
    const estimatedValuation = globalCounter?.inventoryValuation || 0;

    const period = args.period || "today";
    const now = new Date();
    
    // Calculate dates
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayTimestamp = startOfToday.getTime();
    const todayStr = startOfToday.toISOString().split("T")[0];

    const startOfYesterday = new Date(now);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    const yesterdayTimestamp = startOfYesterday.getTime();
    const yesterdayStr = startOfYesterday.toISOString().split("T")[0];

    const startOfTwoDaysAgo = new Date(now);
    startOfTwoDaysAgo.setDate(startOfTwoDaysAgo.getDate() - 2);
    startOfTwoDaysAgo.setHours(0, 0, 0, 0);
    const twoDaysAgoTimestamp = startOfTwoDaysAgo.getTime();
    const twoDaysAgoStr = startOfTwoDaysAgo.toISOString().split("T")[0];

    const startOfThisWeek = new Date(now);
    const day = startOfThisWeek.getDay();
    const diff = startOfThisWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfThisWeek.setDate(diff);
    startOfThisWeek.setHours(0, 0, 0, 0);
    const thisWeekTimestamp = startOfThisWeek.getTime();
    const thisWeekStr = startOfThisWeek.toISOString().split("T")[0];

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const lastWeekTimestamp = startOfLastWeek.getTime();
    const lastWeekStr = startOfLastWeek.toISOString().split("T")[0];

    let oldestNeededStr = yesterdayStr;
    if (period === "yesterday") oldestNeededStr = twoDaysAgoStr;
    if (period === "this_week") oldestNeededStr = lastWeekStr;

    // Only fetch dailyStats from the oldest needed period
    const stats = await ctx.db
      .query("dailyStats")
      .withIndex("by_date", (q) => q.gte("date", oldestNeededStr))
      .collect();

    // Filter stats for current and previous period
    let periodStats: typeof stats = [];
    let prevStats: typeof stats = [];

    if (period === "today") {
      periodStats = stats.filter((s) => s.date >= todayStr);
      prevStats = stats.filter((s) => s.date >= yesterdayStr && s.date < todayStr);
    } else if (period === "yesterday") {
      periodStats = stats.filter((s) => s.date >= yesterdayStr && s.date < todayStr);
      prevStats = stats.filter((s) => s.date >= twoDaysAgoStr && s.date < yesterdayStr);
    } else if (period === "this_week") {
      periodStats = stats.filter((s) => s.date >= thisWeekStr);
      prevStats = stats.filter((s) => s.date >= lastWeekStr && s.date < thisWeekStr);
    } else {
      periodStats = stats;
      prevStats = [];
    }

    const totalRevenue = periodStats.reduce((acc, s) => acc + s.totalRevenue, 0);
    const totalProfit = periodStats.reduce((acc, s) => acc + s.totalProfit, 0);
    const totalPending = periodStats.reduce((acc, s) => acc + (s.totalPending || 0), 0);
    const totalTxCount = periodStats.reduce((acc, s) => acc + s.transactionCount, 0);
    const avgSales = totalTxCount > 0 ? (totalRevenue / totalTxCount) : 0;

    // Previous period stats for trend calculation
    const prevRevenue = prevStats.reduce((acc, s) => acc + s.totalRevenue, 0);
    const prevProfit = prevStats.reduce((acc, s) => acc + s.totalProfit, 0);
    const prevPending = prevStats.reduce((acc, s) => acc + (s.totalPending || 0), 0);
    const prevTxCount = prevStats.reduce((acc, s) => acc + s.transactionCount, 0);
    const prevAvgSales = prevTxCount > 0 ? (prevRevenue / prevTxCount) : 0;

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    };

    const trends = {
      revenue: calculateTrend(totalRevenue, prevRevenue),
      profit: calculateTrend(totalProfit, prevProfit),
      pending: calculateTrend(totalPending, prevPending),
      avgSales: calculateTrend(avgSales, prevAvgSales),
    };

    // Categories Distribution based on items sold
    const soldCategoryStats: Record<string, number> = {};
    let totalItemsSold = 0;
    for (const stat of periodStats) {
      if (stat.salesByCategory) {
        for (const [cat, qty] of Object.entries(stat.salesByCategory)) {
          soldCategoryStats[cat] = (soldCategoryStats[cat] || 0) + (qty as number);
        }
      }
      totalItemsSold += stat.itemsSold;
    }

    const categoryDistribution = Object.entries(soldCategoryStats).map(([name, qty]) => ({
      name,
      value: totalItemsSold > 0 ? Math.round((qty / totalItemsSold) * 100) : 0,
    }));

    // Payment Methods aggregation
    const paymentMethods = {
      "M-Pesa": { amount: 0, count: 0, percentage: 0 },
      "e-Mola": { amount: 0, count: 0, percentage: 0 },
      "BCI": { amount: 0, count: 0, percentage: 0 },
      "BIM Cash": { amount: 0, count: 0, percentage: 0 },
      "Card": { amount: 0, count: 0, percentage: 0 },
      "Cash": { amount: 0, count: 0, percentage: 0 },
    };

    let totalPaymentReceived = 0;

    for (const stat of periodStats) {
      if (stat.paymentsByMethod) {
        for (const [rawMethod, amount] of Object.entries(stat.paymentsByMethod)) {
          const method = normalizePaymentMethod(rawMethod);
          if (paymentMethods[method as keyof typeof paymentMethods]) {
            paymentMethods[method as keyof typeof paymentMethods].amount += (amount as number);
            paymentMethods[method as keyof typeof paymentMethods].count += 1;
            totalPaymentReceived += (amount as number);
          } else {
             paymentMethods["Cash"].amount += (amount as number);
             paymentMethods["Cash"].count += 1;
             totalPaymentReceived += (amount as number);
          }
        }
      }
    }

    // Compute percentages
    for (const key of Object.keys(paymentMethods) as Array<keyof typeof paymentMethods>) {
      paymentMethods[key].percentage = totalPaymentReceived > 0 
        ? Math.round((paymentMethods[key].amount / totalPaymentReceived) * 100)
        : 0;
    }

    return {
      totalRevenue,
      totalProfit,
      activeClients,
      estimatedValuation,
      categoryDistribution,
      totalPending,
      avgSales,
      paymentMethods,
      trends,
    };
  },
});

export const getRevenueByPeriod = query({
  args: { period: v.string() }, // "weekly", "monthly"
  handler: async (ctx, args) => {
    const daysToTake = args.period === "monthly" ? 30 : 7;
    const stats = await ctx.db
      .query("dailyStats")
      .order("desc")
      .take(daysToTake);

    // Convex returns stats in descending order. Reverse to chronological order (ascending).
    const chronologicalStats = [...stats].reverse();

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    return chronologicalStats.map((s) => {
      const dateObj = new Date(s.date + "T00:00:00");
      const dayName = weekdays[dateObj.getDay()];
      return {
        name: args.period === "monthly" ? s.date.slice(5) : dayName,
        revenue: s.totalRevenue,
        orders: s.transactionCount,
      };
    });
  },
});

export const getInventoryAging = query({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").take(500);
    // Dead stock: Stock > 0 and no sales movement in last 30 days
    // This requires cross-referencing movements, making it a bit more complex
    return products.filter(p => p.stock > p.reorderLevel * 2); // Simple proxy for now
  },
});
