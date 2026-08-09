import { describe, expect, test } from "vitest";
import { applyLedgerEntry } from "./ledgerHelpers";

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

  test("CREDIT never nets against existing debt (symmetric explicit-only rule)", () => {
    expect(applyLedgerEntry({ creditBalance: 0, debitBalance: 300 }, { type: "CREDIT", amount: 100 }))
      .toEqual({ creditBalance: 100, debitBalance: 300 });
  });

  test("DEBIT on zero balance adds pure debt", () => {
    expect(applyLedgerEntry(zero, { type: "DEBIT", amount: 200 })).toEqual({ creditBalance: 0, debitBalance: 200 });
  });

  test("DEBIT never consumes existing credit (explicit-only rule)", () => {
    expect(applyLedgerEntry({ creditBalance: 500, debitBalance: 0 }, { type: "DEBIT", amount: 200 }))
      .toEqual({ creditBalance: 500, debitBalance: 200 });
  });

  test("PAYMENT (real account-debt recovery) subtracts from debit only, floored at 0", () => {
    expect(applyLedgerEntry({ creditBalance: 0, debitBalance: 60 }, { type: "PAYMENT", amount: 100 }))
      .toEqual({ creditBalance: 0, debitBalance: 0 });
  });

  test("PAYMENT never spills into credit even if it exceeds debit", () => {
    expect(applyLedgerEntry({ creditBalance: 10, debitBalance: 40 }, { type: "PAYMENT", amount: 100 }))
      .toEqual({ creditBalance: 10, debitBalance: 0 });
  });

  test("sequential fold: SALE then exact PAYMENT_LOG leaves balance untouched", () => {
    let balance = zero;
    balance = applyLedgerEntry(balance, { type: "SALE", amount: 800 });
    balance = applyLedgerEntry(balance, { type: "PAYMENT_LOG", amount: 800 });
    expect(balance).toEqual({ creditBalance: 0, debitBalance: 0 });
  });
});
