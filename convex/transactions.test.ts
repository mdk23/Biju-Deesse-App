/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const CLERK_ID = "test|admin";

async function seedBase(t: ReturnType<typeof convexTest>) {
  const { customerId, productId } = await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      clerkId: CLERK_ID,
      username: "admin",
      role: "admin",
    });
    await ctx.db.insert("caixaSessions", {
      openedBy: "admin",
      openedAt: Date.now(),
      status: "OPEN",
      openingAmount: 0,
      expectedCash: 0,
      totalCashSales: 0,
      totalCashIn: 0,
      totalCashOut: 0,
    });
    const customerId = await ctx.db.insert("customers", {
      firstName: "Lia",
      lastName: "Tsambo",
      phone1: "800000000",
      totalSpent: 0,
      creditBalance: 0,
      debitBalance: 0,
      orderCount: 0,
    });
    const productId = await ctx.db.insert("products", {
      code: "SKU-1",
      name: "Brinco Inox",
      category: "Earrings",
      costPrice: 100,
      sellingPrice: 250,
      stock: 100,
      reorderLevel: 5,
      archived: false,
    });
    return { customerId, productId };
  });
  return { customerId, productId };
}

function baseSaleArgs(customerId: any, productId: any, overrides: Partial<any> = {}) {
  return {
    customerId,
    items: [{ productId, quantity: 2, price: 250 }],
    subtotal: 500,
    discount: 0,
    taxes: 0,
    total: 500,
    profit: 300,
    amountReceived: 500,
    changeGiven: 0,
    deliveryStatus: "Delivered",
    paymentBreakdown: [{ method: "e-Mola", amount: 500 }],
    ...overrides,
  };
}

test("exact payment does not grant store credit (confirmed bug)", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  await asAdmin.mutation(api.transactions.create, baseSaleArgs(customerId, productId));

  const customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(0);
  expect(customer!.debitBalance).toBe(0);
});

test("overpayment as Store Credit grants exactly the change amount, once", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 600,
      changeGiven: 100,
      changeHandling: "Store Credit",
      paymentBreakdown: [{ method: "e-Mola", amount: 600 }],
    })
  );

  const customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(100);
  expect(customer!.debitBalance).toBe(0);
});

test("overpayment refunded as Cash leaves balance untouched", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 600,
      changeGiven: 100,
      changeHandling: "Cash",
      paymentBreakdown: [{ method: "Cash", amount: 600 }],
    })
  );

  const customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(0);
  expect(customer!.debitBalance).toBe(0);
});

test("underpayment on a customer who already has unrelated store credit nets through credit, once", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);
  await t.run(async (ctx) => ctx.db.patch(customerId, { creditBalance: 500 }));

  await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
    })
  );

  const customer = await t.run(async (ctx) => ctx.db.get(customerId));
  // 500 pre-existing credit nets 200 new debt -> 300 credit, 0 debt
  expect(customer!.creditBalance).toBe(300);
  expect(customer!.debitBalance).toBe(0);
});

test("Store Credit checkout (full) does not crash and correctly zeroes out credit used", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);
  await t.run(async (ctx) => ctx.db.patch(customerId, { creditBalance: 500 }));

  await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      total: 500,
      amountReceived: 500,
      paymentBreakdown: [{ method: "Store Credit", amount: 500 }],
    })
  );

  const customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(0);
  expect(customer!.debitBalance).toBe(0);
});

test("deleting a non-final transaction reverts balance to match a fresh full replay", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  // First sale: underpaid, creates 200 debt.
  const first = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
    })
  );

  // Second sale: paid fully via Store Credit is not possible (no credit yet), so
  // instead overpay-as-Store-Credit to build credit, then a third sale nets it.
  await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 800,
      total: 500,
      changeGiven: 300,
      changeHandling: "Store Credit",
      paymentBreakdown: [{ method: "e-Mola", amount: 800 }],
    })
  );

  // Delete the first (non-final) transaction.
  await asAdmin.mutation(api.transactions.remove, { id: first.transactionId });

  const customerAfterDelete = await t.run(async (ctx) => ctx.db.get(customerId));

  // Compute the expected value via an independent fresh replay of whatever
  // ledger rows remain, using the SAME reducer the fix is built on.
  const { recomputeCustomerBalanceForCustomer } = await import("./ledgerHelpers");
  const replayed = await t.run(async (ctx) => recomputeCustomerBalanceForCustomer(ctx.db, customerId));

  expect(customerAfterDelete!.creditBalance).toBe(replayed.creditBalance);
  expect(customerAfterDelete!.debitBalance).toBe(replayed.debitBalance);
});

test("addPayment reduces debt correctly, and caixa debt-recovery figures only count real PAYMENT, never PAYMENT_LOG", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  // Underpaid sale creates 200 debt, and writes a PAYMENT_LOG audit row for
  // the 300 tendered -- this must NOT be counted as a debt recovery.
  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
    })
  );

  let customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.debitBalance).toBe(200);

  // Real manual debt-recovery payment.
  await asAdmin.mutation(api.payments.addPayment, {
    customerId,
    transactionId: sale.transactionId,
    amount: 200,
    paymentMethod: "e-Mola",
  });

  customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.debitBalance).toBe(0);
  expect(customer!.creditBalance).toBe(0);

  const sessionId = await t.run(async (ctx) => (await ctx.db.query("caixaSessions").first())!._id);
  const report = await asAdmin.query(api.caixa.getSessionReportDetails, { sessionId });
  // Only the real 200 PAYMENT counts as a debt recovery; the 300 PAYMENT_LOG
  // checkout-audit row for the original sale must not be included.
  expect(report!.summary.totalDebtRecoveries).toBe(200);
});

test("repair tool reports no drift after a sequence of live mutations (single source of truth)", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
    })
  );
  const overpaid = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 800,
      total: 500,
      changeGiven: 300,
      changeHandling: "Store Credit",
      paymentBreakdown: [{ method: "e-Mola", amount: 800 }],
    })
  );
  await asAdmin.mutation(api.transactions.remove, { id: overpaid.transactionId });

  const { recomputeCustomerBalanceForCustomer } = await import("./ledgerHelpers");
  const before = await t.run(async (ctx) => {
    const c = await ctx.db.get(customerId);
    return { creditBalance: c!.creditBalance || 0, debitBalance: c!.debitBalance || 0 };
  });
  const replayed = await t.run(async (ctx) => recomputeCustomerBalanceForCustomer(ctx.db, customerId));

  expect(replayed).toEqual(before);
});
