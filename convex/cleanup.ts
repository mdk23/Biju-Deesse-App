import { mutation } from "./_generated/server";

export const cleanupLegacyFields = mutation({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").collect();
    let count = 0;
    for (const customer of customers) {
      const { balance, outstandingBalance, creditLimit, ...rest } = customer as any;
      await ctx.db.replace(customer._id, rest);
      count++;
    }
    
    const transactions = await ctx.db.query("transactions").collect();
    let txCount = 0;
    for (const tx of transactions) {
      const { outstandingBalance, ...rest } = tx as any;
      await ctx.db.replace(tx._id, rest);
      txCount++;
    }
    
    return `Cleaned up ${count} customers and ${txCount} transactions.`;
  },
});
