import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./authHelpers";

const SETTINGS_ID = "main";
export const DEFAULT_DAILY_DISCOUNT_LIMIT = 100;

/** THE single place the configured daily discount limit is read from -- falls back to the default until an admin sets one. */
export async function getDailyDiscountLimitInternal(ctx: { db: any }): Promise<number> {
  const settings = await ctx.db
    .query("appSettings")
    .withIndex("by_setting_id", (q: any) => q.eq("id", SETTINGS_ID))
    .first();
  return settings?.dailyDiscountLimit ?? DEFAULT_DAILY_DISCOUNT_LIMIT;
}

export const getDailyDiscountLimit = query({
  args: {},
  handler: async (ctx) => getDailyDiscountLimitInternal(ctx),
});

export const setDailyDiscountLimit = mutation({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx.db, ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can change the daily discount limit.");
    }
    if (args.limit < 0) {
      throw new Error("Daily discount limit cannot be negative.");
    }

    const settings = await ctx.db
      .query("appSettings")
      .withIndex("by_setting_id", (q: any) => q.eq("id", SETTINGS_ID))
      .first();

    if (settings) {
      await ctx.db.patch(settings._id, { dailyDiscountLimit: args.limit });
    } else {
      await ctx.db.insert("appSettings", { id: SETTINGS_ID, dailyDiscountLimit: args.limit });
    }
  },
});

/**
 * Store-wide discount usage for a given calendar day (YYYY-MM-DD), plus the
 * configured limit and remaining headroom. Shared by transactions.create's
 * server-side enforcement and the POS "remaining discount" display -- never
 * reimplement this math anywhere else.
 */
export async function getDiscountStatusInternal(ctx: { db: any }, dateStr: string) {
  const [limit, dailyStat] = await Promise.all([
    getDailyDiscountLimitInternal(ctx),
    ctx.db.query("dailyStats").withIndex("by_date", (q: any) => q.eq("date", dateStr)).first(),
  ]);
  const used = dailyStat?.discountGiven || 0;
  return { limit, used, remaining: Math.max(0, limit - used) };
}

export const getDiscountStatus = query({
  args: {},
  handler: async (ctx) => {
    const todayStr = new Date().toISOString().split("T")[0];
    return getDiscountStatusInternal(ctx, todayStr);
  },
});
