export function normalizePaymentMethod(method: string): string {
  if (method === "M-Pesa") return "M-Pesa";
  if (method === "e-Mola") return "e-Mola";
  if (method === "BCI") return "BCI";
  if (method === "BIM Cash" || method === "BIM") return "BIM Cash";
  if (method === "Card") return "Card";
  return "Cash";
}

export async function updateDailyMovementStats(ctx: any, type: string, quantity: number) {
  const dateStr = new Date().toISOString().split("T")[0];
  const dailyStat = await ctx.db.query("dailyStats").withIndex("by_date", (q: any) => q.eq("date", dateStr)).first();
  
  let diffs: any = {};
  if (type === "Damage") diffs.damagedItems = Math.abs(quantity);
  else if (type === "Return") diffs.returnedItems = Math.abs(quantity);
  else if (type === "Adjustment") diffs.adjustedItems = Math.abs(quantity);
  else if (type === "Manual Correction") diffs.manualCorrections = Math.abs(quantity);

  if (Object.keys(diffs).length === 0) return;

  if (dailyStat) {
    const patch: any = {};
    for (const [key, val] of Object.entries(diffs)) {
      patch[key] = (dailyStat[key] || 0) + (val as number);
    }
    await ctx.db.patch(dailyStat._id, patch);
  } else {
    await ctx.db.insert("dailyStats", {
      date: dateStr,
      totalRevenue: 0,
      totalProfit: 0,
      transactionCount: 0,
      itemsSold: 0,
      ...diffs
    });
  }
}
