import { query } from "./_generated/server";
import { v } from "convex/values";

export const getExecutiveBrief = query({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const customers = await ctx.db.query("customers").collect();
    const transactions = await ctx.db.query("transactions").collect();

    const totalRevenue = transactions.reduce((acc, tx) => acc + tx.total, 0);
    const totalProfit = transactions.reduce((acc, tx) => acc + tx.profit, 0);
    const activeClients = customers.length;
    
    // Valuation: Sum of cost price * stock
    const estimatedValuation = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);

    // Categories Distribution
    const categoryStats = products.reduce((acc: Record<string, number>, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});

    const totalProducts = products.length;
    const categoryDistribution = Object.entries(categoryStats).map(([name, count]) => ({
      name,
      value: Math.round((count / totalProducts) * 100),
    }));

    return {
      totalRevenue,
      totalProfit,
      activeClients,
      estimatedValuation,
      categoryDistribution,
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
