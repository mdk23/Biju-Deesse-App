import { describe, expect, test } from "vitest";
import { applyLedgerEntry, reconcileBalances } from "./ledgerHelpers";

describe("reconcileBalances", () => {
  test("positive netAmount with no existing debt adds to credit", () => {
    expect(reconcileBalances(0, 0, 100)).toEqual({ creditBalance: 100, debitBalance: 0 });
  });

  test("positive netAmount nets through existing debt first, remainder to credit", () => {
    expect(reconcileBalances(0, 60, 100)).toEqual({ creditBalance: 40, debitBalance: 0 });
  });

  test("positive netAmount smaller than existing debt only reduces debt", () => {
    expect(reconcileBalances(0, 100, 60)).toEqual({ creditBalance: 0, debitBalance: 40 });
  });

  test("negative netAmount with no existing credit adds to debt", () => {
    expect(reconcileBalances(0, 0, -100)).toEqual({ creditBalance: 0, debitBalance: 100 });
  });

  test("negative netAmount nets through existing credit first, remainder to debt", () => {
    expect(reconcileBalances(60, 0, -100)).toEqual({ creditBalance: 0, debitBalance: 40 });
  });

  test("negative netAmount smaller than existing credit only reduces credit", () => {
    expect(reconcileBalances(100, 0, -60)).toEqual({ creditBalance: 40, debitBalance: 0 });
  });

  test("zero netAmount is a no-op", () => {
    expect(reconcileBalances(50, 20, 0)).toEqual({ creditBalance: 50, debitBalance: 20 });
  });
});

describe("applyLedgerEntry", () => {
  const zero = { creditBalance: 0, debitBalance: 0 };

  test("SALE is balance-neutral", () => {
    expect(applyLedgerEntry({ creditBalance: 10, debitBalance: 5 }, { type: "SALE", amount: 999 }))
      .toEqual({ creditBalance: 10, debitBalance: 5 });
  });

  test("REFUND is balance-neutral", () => {
    expect(applyLedgerEntry({ creditBalance: 10, debitBalance: 5 }, { type: "REFUND", amount: 999 }))
      .toEqual({ creditBalance: 10, debitBalance: 5 });
  });

  test("PAYMENT_LOG is balance-neutral", () => {
    expect(applyLedgerEntry({ creditBalance: 10, debitBalance: 5 }, { type: "PAYMENT_LOG", amount: 999 }))
      .toEqual({ creditBalance: 10, debitBalance: 5 });
  });

  test("USE_CREDIT subtracts from credit, floored at 0", () => {
    expect(applyLedgerEntry({ creditBalance: 100, debitBalance: 0 }, { type: "USE_CREDIT", amount: 40 }))
      .toEqual({ creditBalance: 60, debitBalance: 0 });
  });

  test("USE_CREDIT never goes negative even if amount exceeds balance", () => {
    expect(applyLedgerEntry({ creditBalance: 30, debitBalance: 0 }, { type: "USE_CREDIT", amount: 100 }))
      .toEqual({ creditBalance: 0, debitBalance: 0 });
  });

  test("USE_CREDIT never touches an existing debit balance", () => {
    expect(applyLedgerEntry({ creditBalance: 100, debitBalance: 50 }, { type: "USE_CREDIT", amount: 40 }))
      .toEqual({ creditBalance: 60, debitBalance: 50 });
  });

  test("CREDIT on zero balance adds pure credit", () => {
    expect(applyLedgerEntry(zero, { type: "CREDIT", amount: 100 })).toEqual({ creditBalance: 100, debitBalance: 0 });
  });

  test("PAYMENT (real debt-recovery) nets through existing debt", () => {
    expect(applyLedgerEntry({ creditBalance: 0, debitBalance: 60 }, { type: "PAYMENT", amount: 100 }))
      .toEqual({ creditBalance: 40, debitBalance: 0 });
  });

  test("DEBIT nets through existing credit first (confirmed product decision)", () => {
    expect(applyLedgerEntry({ creditBalance: 500, debitBalance: 0 }, { type: "DEBIT", amount: 200 }))
      .toEqual({ creditBalance: 300, debitBalance: 0 });
  });

  test("DEBIT on zero balance adds pure debt", () => {
    expect(applyLedgerEntry(zero, { type: "DEBIT", amount: 200 })).toEqual({ creditBalance: 0, debitBalance: 200 });
  });

  test("sequential fold matches a single reconciled call (associativity sanity check)", () => {
    let balance = zero;
    balance = applyLedgerEntry(balance, { type: "SALE", amount: 800 });
    balance = applyLedgerEntry(balance, { type: "PAYMENT_LOG", amount: 800 });
    expect(balance).toEqual({ creditBalance: 0, debitBalance: 0 });
  });
});
