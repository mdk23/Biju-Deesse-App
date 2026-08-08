import { describe, expect, test } from "vitest";
import { computeCustomerHealth } from "./intelligence";

const NOW = Date.UTC(2026, 0, 1);
const DAY = 24 * 3600 * 1000;
const recent = NOW - 10 * DAY;
const stale = NOW - 91 * DAY;

const base = { now: NOW, creditStatus: "Good Standing" };

describe("computeCustomerHealth", () => {
  test("New Client: zero orders, regardless of anything else", () => {
    expect(computeCustomerHealth({ ...base, orderCount: 0, totalSpent: 999999, lastPurchaseDate: recent, creditStatus: "Overdue" }))
      .toBe("New Client");
  });

  test("Overdue always wins, even a huge spender with lots of orders", () => {
    expect(computeCustomerHealth({ orderCount: 100, totalSpent: 2000000, lastPurchaseDate: recent, creditStatus: "Overdue", now: NOW }))
      .toBe("At Risk");
  });

  test("inactive 90+ days falls to At Risk even with huge lifetime spend", () => {
    expect(computeCustomerHealth({ orderCount: 100, totalSpent: 2000000, lastPurchaseDate: stale, creditStatus: "Good Standing", now: NOW }))
      .toBe("At Risk");
  });

  test("no purchase date at all counts as inactive", () => {
    expect(computeCustomerHealth({ orderCount: 10, totalSpent: 200000, lastPurchaseDate: undefined, creditStatus: "Good Standing", now: NOW }))
      .toBe("At Risk");
  });

  test("Elite: active, orders>=20 AND spend>=500k, not Outstanding", () => {
    expect(computeCustomerHealth({ orderCount: 20, totalSpent: 500000, lastPurchaseDate: recent, creditStatus: "Good Standing", now: NOW }))
      .toBe("Elite Client");
  });

  test("Elite requires BOTH thresholds -- high orders alone is only Valuable", () => {
    expect(computeCustomerHealth({ orderCount: 25, totalSpent: 10000, lastPurchaseDate: recent, creditStatus: "Good Standing", now: NOW }))
      .toBe("Valuable Client");
  });

  test("Valuable: either threshold alone qualifies (spend only)", () => {
    expect(computeCustomerHealth({ orderCount: 1, totalSpent: 600000, lastPurchaseDate: recent, creditStatus: "Good Standing", now: NOW }))
      .toBe("Valuable Client");
  });

  test("Outstanding blocks Elite/Valuable -- demotes a big spender all the way to Growing", () => {
    expect(computeCustomerHealth({ orderCount: 30, totalSpent: 800000, lastPurchaseDate: recent, creditStatus: "Outstanding", now: NOW }))
      .toBe("Growing Client");
  });

  test("Growing Client: no debt check -- Outstanding does not block Growing", () => {
    expect(computeCustomerHealth({ orderCount: 5, totalSpent: 1000, lastPurchaseDate: recent, creditStatus: "Outstanding", now: NOW }))
      .toBe("Growing Client");
  });

  test("Growing: either threshold alone qualifies (orders only)", () => {
    expect(computeCustomerHealth({ orderCount: 5, totalSpent: 100, lastPurchaseDate: recent, creditStatus: "Good Standing", now: NOW }))
      .toBe("Growing Client");
  });

  test("At Risk fallback: active but too thin on both orders and spend", () => {
    expect(computeCustomerHealth({ orderCount: 2, totalSpent: 5000, lastPurchaseDate: recent, creditStatus: "Good Standing", now: NOW }))
      .toBe("At Risk");
  });
});
