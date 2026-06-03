import { query } from "./_generated/server";
import { v } from "convex/values";

export const getExecutiveBrief = query({
  args: { period: v.optional(v.string()) }, // "today", "yesterday", "this_week"
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect();
    const customers = await ctx.db.query("customers").collect();
    const transactions = await ctx.db.query("transactions").collect();

    // Determine timestamp range based on the selected period
    const period = args.period || "today";
    const now = new Date();
    
    // Start of today:
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayTimestamp = startOfToday.getTime();

    // Start of yesterday:
    const startOfYesterday = new Date(now);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    const yesterdayTimestamp = startOfYesterday.getTime();

    // Start of two days ago:
    const startOfTwoDaysAgo = new Date(now);
    startOfTwoDaysAgo.setDate(startOfTwoDaysAgo.getDate() - 2);
    startOfTwoDaysAgo.setHours(0, 0, 0, 0);
    const twoDaysAgoTimestamp = startOfTwoDaysAgo.getTime();

    // Start of this week (assume Monday is the start of the week):
    const startOfThisWeek = new Date(now);
    const day = startOfThisWeek.getDay();
    const diff = startOfThisWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfThisWeek.setDate(diff);
    startOfThisWeek.setHours(0, 0, 0, 0);
    const thisWeekTimestamp = startOfThisWeek.getTime();

    // Start of last week:
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const lastWeekTimestamp = startOfLastWeek.getTime();

    // Filter transactions for current and previous period
    let periodTransactions: typeof transactions = [];
    let prevTransactions: typeof transactions = [];

    if (period === "today") {
      periodTransactions = transactions.filter((tx) => tx._creationTime >= todayTimestamp);
      prevTransactions = transactions.filter((tx) => tx._creationTime >= yesterdayTimestamp && tx._creationTime < todayTimestamp);
    } else if (period === "yesterday") {
      periodTransactions = transactions.filter((tx) => tx._creationTime >= yesterdayTimestamp && tx._creationTime < todayTimestamp);
      prevTransactions = transactions.filter((tx) => tx._creationTime >= twoDaysAgoTimestamp && tx._creationTime < yesterdayTimestamp);
    } else if (period === "this_week") {
      periodTransactions = transactions.filter((tx) => tx._creationTime >= thisWeekTimestamp);
      prevTransactions = transactions.filter((tx) => tx._creationTime >= lastWeekTimestamp && tx._creationTime < thisWeekTimestamp);
    } else {
      periodTransactions = transactions;
      prevTransactions = [];
    }

    const totalRevenue = periodTransactions.reduce((acc, tx) => acc + tx.total, 0);
    const totalProfit = periodTransactions.reduce((acc, tx) => acc + tx.profit, 0);
    const activeClients = customers.length;
    
    // Calculate total pending for transactions in this period
    const totalPending = periodTransactions.reduce((acc, tx) => {
      const totalPaid = tx.paymentBreakdown.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
      return acc + Math.max(0, tx.total - totalPaid);
    }, 0);

    const avgSales = periodTransactions.length > 0 ? (totalRevenue / periodTransactions.length) : 0;

    // Previous period stats for trend calculation
    const prevRevenue = prevTransactions.reduce((acc, tx) => acc + tx.total, 0);
    const prevProfit = prevTransactions.reduce((acc, tx) => acc + tx.profit, 0);
    const prevPending = prevTransactions.reduce((acc, tx) => {
      const totalPaid = tx.paymentBreakdown.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
      return acc + Math.max(0, tx.total - totalPaid);
    }, 0);
    const prevAvgSales = prevTransactions.length > 0 ? (prevRevenue / prevTransactions.length) : 0;

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Math.round(((current - previous) / previous) * 1000) / 10;
    };

    const trends = {
      revenue: calculateTrend(totalRevenue, prevRevenue),
      profit: calculateTrend(totalProfit, prevProfit),
      pending: calculateTrend(totalPending, prevPending),
      avgSales: calculateTrend(avgSales, prevAvgSales),
    };
    
    // Valuation: Sum of cost price * stock
    const estimatedValuation = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);

    // Product category map
    const productCategoryMap = new Map(products.map(p => [p._id, p.category]));

    // Categories Distribution based on items sold
    const soldCategoryStats: Record<string, number> = {};
    let totalItemsSold = 0;
    for (const tx of periodTransactions) {
      for (const item of tx.items || []) {
        const category = productCategoryMap.get(item.productId) || "Unknown";
        soldCategoryStats[category] = (soldCategoryStats[category] || 0) + item.quantity;
        totalItemsSold += item.quantity;
      }
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

    for (const tx of periodTransactions) {
      for (const payment of tx.paymentBreakdown || []) {
        const method = payment.method;
        let targetKey: keyof typeof paymentMethods = "Cash";

        if (method === "M-Pesa") targetKey = "M-Pesa";
        else if (method === "e-Mola") targetKey = "e-Mola";
        else if (method === "BCI") targetKey = "BCI";
        else if (method === "BIM Cash" || method === "BIM") targetKey = "BIM Cash";
        else if (method === "Card") targetKey = "Card";
        else targetKey = "Cash";

        paymentMethods[targetKey].amount += payment.amount;
        paymentMethods[targetKey].count += 1;
        totalPaymentReceived += payment.amount;
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
    const transactions = await ctx.db.query("transactions").collect();
    
    // Mocking a week of aggregate data for now since we don't have enough history
    // In a real app, we'd group transactions by _creationTime
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      name: day,
      revenue: Math.floor(Math.random() * 500000) + 300000,
      orders: Math.floor(Math.random() * 20) + 5,
    }));
  },
});

export const getInventoryAging = query({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    // Dead stock: Stock > 0 and no sales movement in last 30 days
    // This requires cross-referencing movements, making it a bit more complex
    return products.filter(p => p.stock > p.reorderLevel * 2); // Simple proxy for now
  },
});
