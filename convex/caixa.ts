import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper: Check if a timestamp is from a previous day
const isPreviousDay = (timestamp: number) => {
  const sessionDate = new Date(timestamp);
  const today = new Date();
  return (
    sessionDate.getDate() !== today.getDate() ||
    sessionDate.getMonth() !== today.getMonth() ||
    sessionDate.getFullYear() !== today.getFullYear()
  );
};

export const getActiveSession = query({
  args: {},
  handler: async (ctx) => {
    const session = await ctx.db
      .query("caixaSessions")
      .withIndex("by_status", (q) => q.eq("status", "OPEN"))
      .first();
    
    if (!session) return null;

    return {
      ...session,
      isExpired: isPreviousDay(session.openedAt),
    };
  },
});

export const getRecentSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("caixaSessions")
      .withIndex("by_openedAt")
      .order("desc")
      .take(5);
  },
});

export const getSessionMovements = query({
  args: { sessionId: v.id("caixaSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("caixaMovements")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(500);
  },
});

export const openSession = mutation({
  args: { openingAmount: v.number(), userId: v.string() },
  handler: async (ctx, args) => {
    const existingOpen = await ctx.db
      .query("caixaSessions")
      .withIndex("by_status", (q) => q.eq("status", "OPEN"))
      .first();

    if (existingOpen) {
      throw new Error(`Caixa already opened by ${existingOpen.openedBy}. Please use the existing session.`);
    }

    const sessionId = await ctx.db.insert("caixaSessions", {
      openedBy: args.userId,
      openedAt: Date.now(),
      openingAmount: args.openingAmount,
      status: "OPEN",
      expectedCash: args.openingAmount,
      totalCashSales: 0,
      totalCashIn: 0,
      totalCashOut: 0,
    });

    await ctx.db.insert("caixaMovements", {
      sessionId,
      type: "OPENING",
      amount: args.openingAmount,
      description: "Initial float",
      userId: args.userId,
      timestamp: Date.now(),
      runningBalance: args.openingAmount,
    });

    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      timestamp: Date.now(),
      action: "OPEN_CAIXA_SESSION",
      afterValue: { sessionId, openingAmount: args.openingAmount },
    });

    return sessionId;
  },
});

export const closeSession = mutation({
  args: {
    sessionId: v.id("caixaSessions"),
    countedCash: v.number(),
    closingNote: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "OPEN") {
      throw new Error("Invalid or already closed session.");
    }

    const variance = args.countedCash - session.expectedCash;

    if (Math.abs(variance) > 5 && !args.closingNote) {
      throw new Error("Cash variance detected. Please provide an explanation.");
    }

    await ctx.db.patch(args.sessionId, {
      status: "CLOSED",
      closedAt: Date.now(),
      countedCash: args.countedCash,
      variance,
      closingNote: args.closingNote,
    });

    // Add adjustment movement for the variance
    if (variance !== 0) {
      await ctx.db.insert("caixaMovements", {
        sessionId: args.sessionId,
        type: "ADJUSTMENT",
        amount: variance,
        description: `Closing variance: ${args.closingNote || 'No note'}`,
        userId: args.userId,
        timestamp: Date.now(),
        runningBalance: session.expectedCash + variance,
      });
    }

    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      timestamp: Date.now(),
      action: "CLOSE_CAIXA_SESSION",
      beforeValue: { expectedCash: session.expectedCash },
      afterValue: { countedCash: args.countedCash, variance },
      referenceId: args.sessionId,
    });

    return args.sessionId;
  },
});

export const addMovement = mutation({
  args: {
    sessionId: v.id("caixaSessions"),
    type: v.string(), // "SALE", "CASH_IN", "CASH_OUT", "SALE_REVERSAL"
    amount: v.number(),
    description: v.string(),
    userId: v.string(),
    referenceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "OPEN") {
      throw new Error("No open Caixa session found.");
    }

    if (isPreviousDay(session.openedAt)) {
      throw new Error("This Caixa session is from a previous day. You must close it and open a new session for today.");
    }

    if (args.type === "CASH_OUT" && args.amount > session.expectedCash) {
      throw new Error("Insufficient cash available in drawer.");
    }

    let runningBalance = session.expectedCash;
    const patch: any = {};

    if (args.type === "SALE" || args.type === "CASH_IN") {
      runningBalance += args.amount;
      patch.expectedCash = runningBalance;
      if (args.type === "SALE") patch.totalCashSales = session.totalCashSales + args.amount;
      if (args.type === "CASH_IN") patch.totalCashIn = session.totalCashIn + args.amount;
    } else if (args.type === "CASH_OUT" || args.type === "SALE_REVERSAL") {
      runningBalance -= args.amount;
      patch.expectedCash = runningBalance;
      if (args.type === "CASH_OUT") patch.totalCashOut = session.totalCashOut + args.amount;
      if (args.type === "SALE_REVERSAL") patch.totalCashSales = session.totalCashSales - args.amount; // Decrease sales
    }

    await ctx.db.patch(args.sessionId, patch);

    const movementId = await ctx.db.insert("caixaMovements", {
      sessionId: args.sessionId,
      type: args.type,
      amount: args.amount,
      description: args.description,
      userId: args.userId,
      timestamp: Date.now(),
      runningBalance,
      referenceId: args.referenceId,
    });

    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      timestamp: Date.now(),
      action: `CAIXA_${args.type}`,
      afterValue: { amount: args.amount, runningBalance },
      referenceId: movementId,
    });

    return movementId;
  },
});

export const getCaixaReports = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Collect sessions
    let sessionsQuery = ctx.db.query("caixaSessions");
    const sessions = await sessionsQuery.order("desc").take(500);

    // Filter by date if provided
    const filtered = sessions.filter(s => {
      const ts = s.openedAt;
      if (args.startDate && ts < args.startDate) return false;
      if (args.endDate && ts > args.endDate) return false;
      return true;
    });

    return filtered;
  }
});
