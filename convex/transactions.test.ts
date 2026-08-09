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

test("underpayment without opt-in leaves pre-existing store credit untouched and creates no debt", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);
  await t.run(async (ctx) => ctx.db.patch(customerId, { creditBalance: 500 }));

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
    })
  );

  const customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(500);
  expect(customer!.debitBalance).toBe(0);

  const transaction = await t.run(async (ctx) => ctx.db.get(sale.transactionId));
  expect(transaction!.status).toBe("Partially Paid");
  expect(transaction!.debtAddedToAccount).toBeFalsy();
});

test("underpayment with explicit opt-in adds the gap as debt, still leaving pre-existing credit untouched", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);
  await t.run(async (ctx) => ctx.db.patch(customerId, { creditBalance: 500 }));

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
      addRemainingToAccount: true,
    })
  );

  const customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(500);
  expect(customer!.debitBalance).toBe(200);

  const transaction = await t.run(async (ctx) => ctx.db.get(sale.transactionId));
  expect(transaction!.debtAddedToAccount).toBe(true);
});

test("overpayment saved as credit never pays down pre-existing unrelated debt", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);
  await t.run(async (ctx) => ctx.db.patch(customerId, { debitBalance: 150 }));

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
  expect(customer!.debitBalance).toBe(150);
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

  // First sale: underpaid, explicitly opted in to create 200 debt.
  const first = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
      addRemainingToAccount: true,
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

  // Underpaid sale, opted in to create 200 debt, and writes a PAYMENT_LOG
  // audit row for the 300 tendered -- this must NOT be counted as a debt
  // recovery.
  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
      addRemainingToAccount: true,
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

test("recordSalePayment settles a non-opted-in pending sale without touching customer balance", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
    })
  );

  await asAdmin.mutation(api.payments.recordSalePayment, {
    transactionId: sale.transactionId,
    amount: 200,
    paymentMethod: "e-Mola",
  });

  const customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(0);
  expect(customer!.debitBalance).toBe(0);

  const transaction = await t.run(async (ctx) => ctx.db.get(sale.transactionId));
  expect(transaction!.status).toBe("Completed");
  expect(transaction!.amountReceived).toBe(500);

  // addPayment (account-debt recovery) must reject a sale never added to the account.
  await expect(
    asAdmin.mutation(api.payments.addPayment, {
      customerId,
      transactionId: sale.transactionId,
      amount: 1,
      paymentMethod: "e-Mola",
    })
  ).rejects.toThrow();
});

test("addRemainingToCustomerAccount converts a pending sale's gap into debt post-hoc, then addPayment can settle it", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
    })
  );

  let customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.debitBalance).toBe(0);

  await asAdmin.mutation(api.transactions.addRemainingToCustomerAccount, { transactionId: sale.transactionId });

  customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.debitBalance).toBe(200);

  // recordSalePayment must now reject this sale (it belongs to the account).
  await expect(
    asAdmin.mutation(api.payments.recordSalePayment, {
      transactionId: sale.transactionId,
      amount: 1,
      paymentMethod: "e-Mola",
    })
  ).rejects.toThrow();

  // addPayment now works.
  await asAdmin.mutation(api.payments.addPayment, {
    customerId,
    transactionId: sale.transactionId,
    amount: 200,
    paymentMethod: "e-Mola",
  });

  customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.debitBalance).toBe(0);
});

test("hydrateTransactions derives outstanding balance from live payments, not the stale paymentBreakdown snapshot", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
    })
  );

  let listed = await asAdmin.query(api.transactions.list, {});
  let hydrated = listed.find((tx: any) => tx._id === sale.transactionId);
  expect(hydrated.balance).toBe(200);

  await asAdmin.mutation(api.payments.recordSalePayment, {
    transactionId: sale.transactionId,
    amount: 200,
    paymentMethod: "e-Mola",
  });

  listed = await asAdmin.query(api.transactions.list, {});
  hydrated = listed.find((tx: any) => tx._id === sale.transactionId);
  // paymentBreakdown still only shows the original 300 -- balance must come
  // from the live payments sum (300 + 200), not that frozen snapshot.
  expect(hydrated.balance).toBe(0);
});

test("recordSalePayment with Store Credit settles a non-opted-in pending sale by consuming credit only", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);
  await t.run(async (ctx) => ctx.db.patch(customerId, { creditBalance: 500 }));

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
    })
  );

  await asAdmin.mutation(api.payments.recordSalePayment, {
    transactionId: sale.transactionId,
    amount: 200,
    paymentMethod: "Store Credit",
  });

  const customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(300);
  expect(customer!.debitBalance).toBe(0);

  const transaction = await t.run(async (ctx) => ctx.db.get(sale.transactionId));
  expect(transaction!.status).toBe("Completed");
});

test("addPayment with Store Credit reduces both credit and debt on an account-added sale", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);
  await t.run(async (ctx) => ctx.db.patch(customerId, { creditBalance: 500 }));

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
      addRemainingToAccount: true,
    })
  );

  let customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(500);
  expect(customer!.debitBalance).toBe(200);

  await asAdmin.mutation(api.payments.addPayment, {
    customerId,
    transactionId: sale.transactionId,
    amount: 200,
    paymentMethod: "Store Credit",
  });

  customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(300);
  expect(customer!.debitBalance).toBe(0);
});

test("hydrateTransactions labels a fully-pending sale as Pending, not Split, until a payment is recorded", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 0,
      total: 500,
      paymentBreakdown: [],
    })
  );

  let listed = await asAdmin.query(api.transactions.list, {});
  let hydrated = listed.find((tx: any) => tx._id === sale.transactionId);
  expect(hydrated.paymentMethod).toBe("Pending");

  await asAdmin.mutation(api.payments.recordSalePayment, {
    transactionId: sale.transactionId,
    amount: 500,
    paymentMethod: "e-Mola",
  });

  listed = await asAdmin.query(api.transactions.list, {});
  hydrated = listed.find((tx: any) => tx._id === sale.transactionId);
  expect(hydrated.paymentMethod).toBe("e-Mola");
});

test("recordSalePayment overpayment settles the sale and banks the excess as store credit", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  // Sale total 150, paid 50 up front -> 100 still outstanding.
  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 50,
      total: 150,
      paymentBreakdown: [{ method: "e-Mola", amount: 50 }],
    })
  );

  // Cashier collects 200 -- 100 settles the sale, 100 excess becomes credit.
  await asAdmin.mutation(api.payments.recordSalePayment, {
    transactionId: sale.transactionId,
    amount: 200,
    paymentMethod: "e-Mola",
  });

  const customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(100);
  expect(customer!.debitBalance).toBe(0);

  const transaction = await t.run(async (ctx) => ctx.db.get(sale.transactionId));
  expect(transaction!.status).toBe("Completed");
});

test("addPayment overpayment clears the account debt and banks the excess as store credit", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 50,
      total: 150,
      paymentBreakdown: [{ method: "e-Mola", amount: 50 }],
      addRemainingToAccount: true,
    })
  );

  let customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.debitBalance).toBe(100);

  await asAdmin.mutation(api.payments.addPayment, {
    customerId,
    transactionId: sale.transactionId,
    amount: 200,
    paymentMethod: "e-Mola",
  });

  customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.debitBalance).toBe(0);
  expect(customer!.creditBalance).toBe(100);
});

test("Store Credit as a payment method is still a hard cap -- no overpaying with credit", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);
  await t.run(async (ctx) => ctx.db.patch(customerId, { creditBalance: 50 }));

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 0,
      total: 150,
      paymentBreakdown: [],
    })
  );

  await expect(
    asAdmin.mutation(api.payments.recordSalePayment, {
      transactionId: sale.transactionId,
      amount: 100,
      paymentMethod: "Store Credit",
    })
  ).rejects.toThrow();

  const customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(50);
});

test("deleting a transaction reverses caixa cash from post-checkout payments, not just the checkout snapshot", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  // Created fully pending (no checkout paymentBreakdown), so the old
  // paymentBreakdown-based reversal would have found nothing to reverse.
  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 0,
      total: 500,
      paymentBreakdown: [],
    })
  );

  // Three separate cash payments recorded after checkout, like a cashier
  // collecting cash on a pending sale in installments.
  await asAdmin.mutation(api.payments.recordSalePayment, {
    transactionId: sale.transactionId,
    amount: 50,
    paymentMethod: "Cash",
  });
  await asAdmin.mutation(api.payments.recordSalePayment, {
    transactionId: sale.transactionId,
    amount: 100,
    paymentMethod: "Cash",
  });
  await asAdmin.mutation(api.payments.recordSalePayment, {
    transactionId: sale.transactionId,
    amount: 200,
    paymentMethod: "Cash",
  });

  const sessionBeforeDelete = await t.run(async (ctx) => ctx.db.query("caixaSessions").first());
  expect(sessionBeforeDelete!.expectedCash).toBe(350);

  await asAdmin.mutation(api.transactions.remove, { id: sale.transactionId });

  const sessionAfterDelete = await t.run(async (ctx) => ctx.db.query("caixaSessions").first());
  expect(sessionAfterDelete!.expectedCash).toBe(0);
});

test("deletePayment reverses a manually recorded cash payment: transaction status, caixa cash, and financial stats", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 50,
      total: 150,
      paymentBreakdown: [{ method: "e-Mola", amount: 50 }],
    })
  );

  const paymentId = await asAdmin.mutation(api.payments.recordSalePayment, {
    transactionId: sale.transactionId,
    amount: 100,
    paymentMethod: "Cash",
  });

  let transaction = await t.run(async (ctx) => ctx.db.get(sale.transactionId));
  expect(transaction!.status).toBe("Completed");
  const sessionAfterPayment = await t.run(async (ctx) => ctx.db.query("caixaSessions").first());
  expect(sessionAfterPayment!.expectedCash).toBe(100);

  await asAdmin.mutation(api.payments.deletePayment, { paymentId });

  transaction = await t.run(async (ctx) => ctx.db.get(sale.transactionId));
  expect(transaction!.amountReceived).toBe(50);
  expect(transaction!.status).toBe("Partially Paid");

  const sessionAfterDelete = await t.run(async (ctx) => ctx.db.query("caixaSessions").first());
  expect(sessionAfterDelete!.expectedCash).toBe(0);

  const remainingPayments = await t.run(async (ctx) =>
    ctx.db.query("payments").withIndex("by_transaction", (q) => q.eq("transactionId", sale.transactionId)).collect()
  );
  expect(remainingPayments.length).toBe(1);
});

test("deletePayment allows a plain checkout-origin payment (no store credit/overpayment/debt involved)", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  // Partial checkout tender entered at sale creation, like the BIM 100 in
  // the reported example -- Partially Paid, no store credit, no opt-in.
  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 100,
      total: 150,
      paymentBreakdown: [{ method: "BIM", amount: 100 }],
    })
  );

  const checkoutPayment = await t.run(async (ctx) =>
    ctx.db.query("payments").withIndex("by_transaction", (q) => q.eq("transactionId", sale.transactionId)).first()
  );
  expect(checkoutPayment!.source).toBe("checkout");

  await asAdmin.mutation(api.payments.deletePayment, { paymentId: checkoutPayment!._id });

  const transaction = await t.run(async (ctx) => ctx.db.get(sale.transactionId));
  expect(transaction!.amountReceived).toBe(0);
  expect(transaction!.status).toBe("Pending");
});

test("deletePayment rejects a checkout-origin payment when the checkout also affected store credit or account debt", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  // Underpaid and explicitly added to the account -> a transaction-level
  // DEBIT ledger entry exists, not attributable to any single payment line.
  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 100,
      total: 150,
      paymentBreakdown: [{ method: "BIM", amount: 100 }],
      addRemainingToAccount: true,
    })
  );

  const checkoutPayment = await t.run(async (ctx) =>
    ctx.db.query("payments").withIndex("by_transaction", (q) => q.eq("transactionId", sale.transactionId)).first()
  );

  await expect(
    asAdmin.mutation(api.payments.deletePayment, { paymentId: checkoutPayment!._id })
  ).rejects.toThrow();
});

test("deletePayment on a checkout-origin cash payment reverses the transaction's SALE caixa movement", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 100,
      total: 150,
      paymentBreakdown: [{ method: "Cash", amount: 100 }],
    })
  );

  const sessionAfterCheckout = await t.run(async (ctx) => ctx.db.query("caixaSessions").first());
  expect(sessionAfterCheckout!.expectedCash).toBe(100);

  const checkoutPayment = await t.run(async (ctx) =>
    ctx.db.query("payments").withIndex("by_transaction", (q) => q.eq("transactionId", sale.transactionId)).first()
  );

  await asAdmin.mutation(api.payments.deletePayment, { paymentId: checkoutPayment!._id });

  const sessionAfterDelete = await t.run(async (ctx) => ctx.db.query("caixaSessions").first());
  expect(sessionAfterDelete!.expectedCash).toBe(0);
});

test("deletePayment on a Store-Credit addPayment reverses both credit and debt via full replay", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);
  // Seed pre-existing credit via a real ledger-backed CREDIT entry (not a
  // raw field patch) so the later full replay inside deletePayment has an
  // actual record to reconstruct it from -- exactly like production data,
  // where a balance never moves except through applyCustomerLedger.
  const { applyCustomerLedger } = await import("./ledgerHelpers");
  await t.run(async (ctx) =>
    applyCustomerLedger(ctx.db, customerId, {
      type: "CREDIT",
      amount: 500,
      description: "Seed credit for test",
      referenceId: "seed",
      referenceType: "seed",
    })
  );

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 300,
      total: 500,
      paymentBreakdown: [{ method: "e-Mola", amount: 300 }],
      addRemainingToAccount: true,
    })
  );

  const paymentId = await asAdmin.mutation(api.payments.addPayment, {
    customerId,
    transactionId: sale.transactionId,
    amount: 200,
    paymentMethod: "Store Credit",
  });

  let customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(300);
  expect(customer!.debitBalance).toBe(0);

  await asAdmin.mutation(api.payments.deletePayment, { paymentId });

  customer = await t.run(async (ctx) => ctx.db.get(customerId));
  expect(customer!.creditBalance).toBe(500);
  expect(customer!.debitBalance).toBe(200);
});

test("backfillPaymentSource classifies legacy rows by comparing createdAt to their transaction's", async () => {
  const t = convexTest(schema, modules);
  const asAdmin = t.withIdentity({ subject: CLERK_ID });
  const { customerId, productId } = await seedBase(t);

  const sale = await asAdmin.mutation(
    api.transactions.create,
    baseSaleArgs(customerId, productId, {
      amountReceived: 50,
      total: 150,
      paymentBreakdown: [{ method: "e-Mola", amount: 50 }],
    })
  );
  const manualPaymentId = await asAdmin.mutation(api.payments.recordSalePayment, {
    transactionId: sale.transactionId,
    amount: 100,
    paymentMethod: "Cash",
  });

  // Simulate legacy data recorded before the `source` field existed.
  await t.run(async (ctx) => {
    const all = await ctx.db.query("payments").withIndex("by_transaction", (q) => q.eq("transactionId", sale.transactionId)).collect();
    for (const p of all) {
      await ctx.db.patch(p._id, { source: undefined });
    }
  });

  await asAdmin.mutation(api.payments.backfillPaymentSource, {});

  const checkoutPayment = await t.run(async (ctx) => {
    const all = await ctx.db.query("payments").withIndex("by_transaction", (q) => q.eq("transactionId", sale.transactionId)).collect();
    return all.find((p) => p._id !== manualPaymentId);
  });
  const manualPayment = await t.run(async (ctx) => ctx.db.get(manualPaymentId));

  expect(checkoutPayment!.source).toBe("checkout");
  expect(manualPayment!.source).toBe("manual");
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
      addRemainingToAccount: true,
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
