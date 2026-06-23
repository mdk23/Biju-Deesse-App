import { DatabaseWriter, DatabaseReader } from "./_generated/server";
import { ConvexError } from "convex/values";

export async function getActiveCaixaSession(db: DatabaseReader | DatabaseWriter) {
  const session = await db
    .query("caixaSessions")
    .withIndex("by_status", (q) => q.eq("status", "OPEN"))
    .first();
  return session;
}

export async function validateCaixaForCash(db: DatabaseReader | DatabaseWriter) {
  const session = await getActiveCaixaSession(db);
  if (!session) {
    throw new ConvexError("Cannot process cash transaction. No Caixa session open. Please open a session first.");
  }
  const sessionDate = new Date(session.openedAt);
  const today = new Date();
  if (
    sessionDate.getDate() !== today.getDate() ||
    sessionDate.getMonth() !== today.getMonth() ||
    sessionDate.getFullYear() !== today.getFullYear()
  ) {
    throw new ConvexError("Caixa Session from a previous day is still open. Please close it and open a new session for today.");
  }
  return session;
}

export async function recordCaixaCash(
  db: DatabaseWriter,
  amount: number,
  type: "SALE" | "CASH_IN" | "SALE_REVERSAL",
  description: string,
  userId: string,
  referenceId?: string
) {
  if (amount <= 0) return;

  const session = await getActiveCaixaSession(db);
  if (!session) return; // If no session, we skip strictly (or we could throw, but validation usually happens earlier)

  const isReversal = type === "SALE_REVERSAL";
  const netCash = isReversal ? -amount : amount;
  const runningBalance = session.expectedCash + netCash;

  const patchData: any = { expectedCash: runningBalance };
  if (type === "SALE") {
    patchData.totalCashSales = session.totalCashSales + amount;
  } else if (type === "SALE_REVERSAL") {
    patchData.totalCashSales = session.totalCashSales - amount;
  } else if (type === "CASH_IN") {
    patchData.totalCashIn = session.totalCashIn + amount;
  }

  await db.patch(session._id, patchData);

  const movementId = await db.insert("caixaMovements", {
    sessionId: session._id,
    type,
    amount,
    description,
    userId,
    timestamp: Date.now(),
    runningBalance,
    referenceId,
  });

  await db.insert("auditLogs", {
    userId,
    timestamp: Date.now(),
    action: `CAIXA_${type}`,
    afterValue: { amount, runningBalance },
    referenceId: movementId,
  });

  return movementId;
}
