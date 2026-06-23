import { DatabaseWriter } from "./_generated/server";
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

export async function applyCustomerLedger(
  db: DatabaseWriter,
  customerId: Id<"customers">,
  params: {
    type: "CREDIT" | "DEBIT" | "USE_CREDIT" | "PAYMENT" | "REFUND" | "SALE";
    amount: number;
    description: string;
    referenceId?: string;
  }
) {
  const customer = await db.get(customerId);
  if (!customer) throw new Error("Customer not found for ledger update.");

  let creditBalance = customer.creditBalance || 0;
  let debitBalance = customer.debitBalance || 0;
  const now = Date.now();

  if (params.type === "USE_CREDIT") {
    if (creditBalance >= params.amount) {
      creditBalance -= params.amount;
    } else {
      throw new Error("Insufficient store credit to cover payment amount.");
    }
  } else if (params.type === "SALE") {
    // SALE just logs the current balance
  } else {
    let netAmount = 0;
    if (params.type === "PAYMENT" || params.type === "CREDIT" || params.type === "REFUND") {
      netAmount = params.amount;
    } else if (params.type === "DEBIT") {
      netAmount = -params.amount;
    }
    const reconciled = reconcileBalances(creditBalance, debitBalance, netAmount);
    creditBalance = reconciled.creditBalance;
    debitBalance = reconciled.debitBalance;
  }

  // Update customer balances
  await db.patch(customerId, {
    creditBalance,
    debitBalance,
  });

  // Insert Ledger Record
  const ledgerId = await db.insert("ledger", {
    customerId,
    type: params.type,
    amount: params.amount,
    balanceAfter: { credit: creditBalance, debit: debitBalance },
    referenceId: params.referenceId,
    description: params.description,
    createdAt: now,
  });

  return { ledgerId, creditBalance, debitBalance };
}
