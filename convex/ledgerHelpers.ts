import { mutation, DatabaseWriter } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export function reconcileBalances(currentCredit: number, currentDebit: number, netAmount: number) {
  let creditBalance = currentCredit;
  let debitBalance = currentDebit;

  if (netAmount > 0) {
    // Applying credit
    if (debitBalance > 0) {
      if (netAmount >= debitBalance) {
        creditBalance += (netAmount - debitBalance);
        debitBalance = 0;
      } else {
        debitBalance -= netAmount;
      }
    } else {
      creditBalance += netAmount;
    }
  } else if (netAmount < 0) {
    // Applying debt
    const debt = Math.abs(netAmount);
    if (creditBalance > 0) {
      if (debt >= creditBalance) {
        debitBalance += (debt - creditBalance);
        creditBalance = 0;
      } else {
        creditBalance -= debt;
      }
    } else {
      debitBalance += debt;
    }
  }

  return { creditBalance, debitBalance };
}

export type LedgerEntryType =
  | "CREDIT" | "DEBIT" | "USE_CREDIT" | "PAYMENT" | "PAYMENT_LOG" | "REFUND" | "SALE";

/**
 * The single source of truth for how a ledger entry affects a customer's
 * cached balance. Used incrementally (fold one new entry onto the current
 * cached balance) by `applyCustomerLedger`/`create`, and via full replay
 * (fold a customer's entire ledger history from zero) by
 * `recomputeCustomerBalanceForCustomer`. Both modes call this exact
 * function, so there is structurally only one place that encodes the rules.
 */
export function applyLedgerEntry(
  balance: { creditBalance: number; debitBalance: number },
  entry: { type: LedgerEntryType; amount: number }
): { creditBalance: number; debitBalance: number } {
  if (entry.type === "USE_CREDIT") {
    return {
      creditBalance: Math.max(0, balance.creditBalance - entry.amount),
      debitBalance: balance.debitBalance,
    };
  }
  if (entry.type === "SALE" || entry.type === "REFUND" || entry.type === "PAYMENT_LOG") {
    return balance; // audit-log-only, never mutates balance
  }
  // PAYMENT (real debt-recovery), CREDIT (overpayment -> store credit), and
  // DEBIT (underpayment) all net through reconcileBalances, so new debt
  // nets through any existing store credit first.
  const amount = entry.type === "DEBIT" ? -entry.amount : entry.amount;
  return reconcileBalances(balance.creditBalance, balance.debitBalance, amount);
}

export async function applyCustomerLedger(
  db: DatabaseWriter,
  customerId: Id<"customers">,
  params: {
    type: LedgerEntryType;
    amount: number;
    description: string;
    referenceId?: string;
    referenceType?: string;
    sessionId?: Id<"caixaSessions">;
  }
) {
  const customer = await db.get(customerId);
  if (!customer) throw new Error("Customer not found for ledger update.");

  let creditBalance = customer.creditBalance || 0;
  const debitBalance = customer.debitBalance || 0;
  const now = Date.now();

  if (params.type === "USE_CREDIT" && creditBalance < params.amount) {
    throw new Error("Insufficient store credit to cover payment amount.");
  }

  const result = applyLedgerEntry({ creditBalance, debitBalance }, params);
  creditBalance = result.creditBalance;
  const finalDebitBalance = result.debitBalance;

  // Update customer balances
  await db.patch(customerId, {
    creditBalance,
    debitBalance: finalDebitBalance,
  });

  // Insert Ledger Record
  const ledgerId = await db.insert("ledger", {
    customerId,
    sessionId: params.sessionId,
    type: params.type,
    amount: params.amount,
    balanceAfter: { credit: creditBalance, debit: finalDebitBalance },
    referenceId: params.referenceId,
    referenceType: params.referenceType,
    description: params.description,
    createdAt: now,
  });

  return { ledgerId, creditBalance, debitBalance: finalDebitBalance };
}

/**
 * Full replay of a customer's entire ledger history, from zero, using the
 * same reducer as the incremental path. This is the only sound way to
 * reverse a deletion (or repair drift): unlike a delta, folding the
 * ledger's remaining history is always correct regardless of how
 * credit/debt has nonlinearly netted against each other over time.
 */
export async function recomputeCustomerBalanceForCustomer(db: DatabaseWriter, customerId: Id<"customers">) {
  const entries = await db
    .query("ledger")
    .withIndex("by_customer", (q) => q.eq("customerId", customerId))
    .collect();

  let balance = { creditBalance: 0, debitBalance: 0 };
  for (const entry of entries) {
    balance = applyLedgerEntry(balance, { type: entry.type as LedgerEntryType, amount: entry.amount });
  }

  await db.patch(customerId, { creditBalance: balance.creditBalance, debitBalance: balance.debitBalance });
  return balance;
}

/**
 * One-time idempotent migration: the checkout-audit "PAYMENT" ledger rows
 * written by `transactions.create` were previously indistinguishable from
 * real manual debt-recovery payments (`payments.addPayment`), and both were
 * being folded into the customer's balance identically. Reclassifies the
 * checkout-audit rows to the balance-neutral "PAYMENT_LOG" type, which also
 * corrects any customer whose cached balance was inflated by them (once
 * combined with `repairAllCustomerBalances` below). Only patches the `type`
 * field on existing rows -- never deletes anything.
 */
export const backfillPaymentLogType = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("ledger")
      .withIndex("by_type", (q) => q.eq("type", "PAYMENT"))
      .collect();
    let count = 0;
    for (const row of rows) {
      if (row.description.startsWith("Payment via")) {
        await ctx.db.patch(row._id, { type: "PAYMENT_LOG" });
        count++;
      }
    }
    return `Reclassified ${count} ledger rows from PAYMENT to PAYMENT_LOG.`;
  },
});

/**
 * Repair tool: recomputes every customer's cached creditBalance/debitBalance
 * from their own ledger history (the source of truth). Only patches the two
 * balance fields on existing customer documents -- never deletes any
 * customer, transaction, payment, or ledger document. Safe to re-run.
 */
export const repairAllCustomerBalances = mutation({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").collect();
    const changed: { customerId: Id<"customers">; before: { creditBalance: number; debitBalance: number }; after: { creditBalance: number; debitBalance: number } }[] = [];
    for (const c of customers) {
      const before = { creditBalance: c.creditBalance || 0, debitBalance: c.debitBalance || 0 };
      const after = await recomputeCustomerBalanceForCustomer(ctx.db, c._id);
      if (after.creditBalance !== before.creditBalance || after.debitBalance !== before.debitBalance) {
        changed.push({ customerId: c._id, before, after });
      }
    }
    return changed;
  },
});
