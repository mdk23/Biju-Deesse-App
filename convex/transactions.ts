import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { recomputeCustomerIntelligence } from "./intelligence";
import { normalizePaymentMethod } from "./utils";
import { reconcileBalances } from "./ledgerHelpers";
import { validateCaixaForCash, recordCaixaCash } from "./caixaHelpers";

export const list = query({
  handler: async (ctx) => {
    const transactions = await ctx.db.query("transactions").order("desc").take(100);
    
    return await Promise.all(transactions.map(async (tx) => {
      let customerName = tx.customerName;
      let customerTier = tx.customerTier;
      
      // Fallback rule for older transactions
      if (!customerName && tx.customerId) {
        const customer = await ctx.db.get(tx.customerId);
        customerName = customer ? `${customer.firstName} ${customer.lastName}` : "Walk-in";
        customerTier = customer?.financialTier || "Regular";
      }
      
      const itemsWithDetails = await Promise.all((tx.items || []).map(async (item) => {
        if (item.name) return item; // Has denormalized data
        
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          name: product?.name || "Unknown Product",
          photo: product?.imageUrl || "",
        };
      }));

      // Calculate total paid from breakdown
      const totalPaid = tx.paymentBreakdown.reduce((acc, p) => acc + p.amount, 0);
      const balance = Math.max(0, tx.total - totalPaid);
      
      return {
        ...tx,
        items: itemsWithDetails,
        customerName: customerName || "Walk-in",
        customerTier: customerTier || "Regular",
        paymentStatus: balance === 0 ? "Paid" : (totalPaid > 0 ? "Partial" : "Pending"),
        balance,
        // For convenience, provide the first method if only one exists
        paymentMethod: tx.paymentBreakdown.length === 1 ? tx.paymentBreakdown[0].method : "Split",
      };
    }));
  },
});

export const create = mutation({
  args: {
    customerId: v.optional(v.id("customers")),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        price: v.number(), // Price at time of sale
      })
    ),
    subtotal: v.number(),
    discount: v.number(),
    taxes: v.number(),
    total: v.number(),
    profit: v.number(),
    cashierName: v.string(),
    receiptNumber: v.optional(v.string()),
    amountReceived: v.number(),
    changeGiven: v.number(),
    changeHandling: v.optional(v.string()),
    deliveryStatus: v.string(), // "Pending", "Shipped", "Delivered"
    paymentBreakdown: v.array(
      v.object({
        method: v.string(),
        amount: v.number(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const todayStr = new Date(now).toISOString().split("T")[0];

    let sequenceNumber = 1;
    const existingStat = await ctx.db
      .query("dailyStats")
      .withIndex("by_date", (q) => q.eq("date", todayStr))
      .first();
    if (existingStat) {
      sequenceNumber = existingStat.transactionCount + 1;
    }

    const finalReceiptNumber = args.receiptNumber || `ORD-${String(sequenceNumber).padStart(3, "0")}`;

    // 0. Caixa validation for cash payments
    const cashPayment = args.paymentBreakdown.find(p => p.method.toLowerCase() === "cash");
    if (cashPayment && cashPayment.amount > 0) {
      await validateCaixaForCash(ctx.db);
    }

    // 1. Determine Status & Validate Settlement
    const totalPayments = args.paymentBreakdown.reduce((acc, p) => acc + p.amount, 0);
    
    // Validate split payments match amountReceived
    if (Math.abs(totalPayments - args.amountReceived) > 0.01) {
      throw new Error(`Split payments total (${totalPayments}) does not match amount received (${args.amountReceived}).`);
    }

    let status = "Pending";
    if (args.amountReceived >= args.total) {
      status = "Completed";
    } else if (args.amountReceived > 0) {
      status = "Partially Paid";
    }

    const change = args.amountReceived - args.total;
    const isOverpayment = change > 0;
    const isUnderpayment = change < 0;

    // Validate generic customer constraints
    if (!args.customerId && isUnderpayment) {
      throw new Error("Walk-in transactions must be fully settled at checkout. No credit/debit allowed.");
    }
    
    if (isOverpayment && !args.changeHandling) {
      throw new Error("Change handling method is required for overpayments.");
    }

    // 2. Fetch Customer and Update Balances
    let customer = null;
    let newCreditBalance = 0;
    let newDebitBalance = 0;
    let customerName = "Walk-in";
    let customerTier = "Regular";

    if (args.customerId) {
      customer = await ctx.db.get(args.customerId);
      if (!customer) throw new Error("Customer not found");
      
      customerName = `${customer.firstName} ${customer.lastName}`;
      customerTier = customer.financialTier || "Regular";
      newCreditBalance = customer.creditBalance || 0;
      newDebitBalance = customer.debitBalance || 0;

      const storeCreditUsed = args.paymentBreakdown
        .filter(p => p.method === "Store Credit")
        .reduce((sum, p) => sum + p.amount, 0);

      if (storeCreditUsed > 0) {
        if (newCreditBalance >= storeCreditUsed) {
          newCreditBalance -= storeCreditUsed;
        } else {
          throw new ConvexError("Insufficient store credit to cover payment amount.");
        }
      }

      if (isOverpayment && args.changeHandling === "Store Credit") {
        const reconciled = reconcileBalances(newCreditBalance, newDebitBalance, change);
        newCreditBalance = reconciled.creditBalance;
        newDebitBalance = reconciled.debitBalance;
      } else if (isUnderpayment) {
        const reconciled = reconcileBalances(newCreditBalance, newDebitBalance, change); // change is negative
        newCreditBalance = reconciled.creditBalance;
        newDebitBalance = reconciled.debitBalance;
      }

      await ctx.db.patch(args.customerId, {
        creditBalance: newCreditBalance,
        debitBalance: newDebitBalance,
      });
    }

    // Prepare denormalized items
    const denormalizedItems = await Promise.all(args.items.map(async (item) => {
      const product = await ctx.db.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      return {
        ...item,
        name: product.name,
        photo: product.imageUrl,
      };
    }));

    // 3. Create Transaction
    const transactionId = await ctx.db.insert("transactions", {
      customerId: args.customerId,
      receiptNumber: finalReceiptNumber,
      subtotal: args.subtotal,
      discount: args.discount,
      taxes: args.taxes,
      total: args.total,
      profit: args.profit,
      cashierName: args.cashierName,
      status,
      settlementType: status === "Completed" ? "Fully Paid" : status,
      deliveryStatus: args.deliveryStatus,
      paymentBreakdown: args.paymentBreakdown,
      items: denormalizedItems,
      refundedAmount: 0,
      amountReceived: args.amountReceived,
      changeGiven: isOverpayment ? change : 0,
      changeHandling: isOverpayment ? args.changeHandling : undefined,
      notes: args.notes,
      customerName,
      customerTier,
    });

    // 4. Ledger: SALE
    await ctx.db.insert("ledger", {
      customerId: args.customerId,
      type: "SALE",
      amount: args.total,
      balanceAfter: { credit: newCreditBalance, debit: newDebitBalance },
      referenceId: transactionId,
      description: `Sale ${finalReceiptNumber}`,
      createdAt: now,
    });

    // 5. Ledger & Payments: PAYMENT
    for (const pay of args.paymentBreakdown) {
      const paymentId = await ctx.db.insert("payments", {
        transactionId,
        customerId: args.customerId,
        amount: pay.amount,
        paymentMethod: pay.method,
        paymentDate: now,
        status: "Completed",
      });

      await ctx.db.insert("ledger", {
        customerId: args.customerId,
        type: "PAYMENT",
        amount: pay.amount,
        balanceAfter: { credit: newCreditBalance, debit: newDebitBalance },
        referenceId: paymentId,
        description: `Payment via ${pay.method} for ${finalReceiptNumber}`,
        createdAt: now,
      });
    }

    // 5.5. Caixa Movement
    if (cashPayment && cashPayment.amount > 0) {
      let netCash = cashPayment.amount;
      if (isOverpayment && args.changeHandling === "Cash") {
        netCash -= change; // Adjust if we gave cash change
      }

      await recordCaixaCash(
        ctx.db,
        netCash,
        "SALE",
        `Cash sale for ${finalReceiptNumber}`,
        args.cashierName,
        transactionId
      );
    }

    // 6. Ledger: Change Handling (REFUND or CREDIT) / Underpayment (DEBIT)
    if (isOverpayment) {
      const changeType = args.changeHandling === "Store Credit" ? "CREDIT" : "REFUND";
      await ctx.db.insert("ledger", {
        customerId: args.customerId,
        type: changeType,
        amount: change,
        balanceAfter: { credit: newCreditBalance, debit: newDebitBalance },
        referenceId: transactionId,
        description: `${changeType === "CREDIT" ? "Store Credit" : "Change Refund"} for ${finalReceiptNumber}`,
        createdAt: now,
      });
    } else if (isUnderpayment) {
      await ctx.db.insert("ledger", {
        customerId: args.customerId,
        type: "DEBIT",
        amount: Math.abs(change),
        balanceAfter: { credit: newCreditBalance, debit: newDebitBalance },
        referenceId: transactionId,
        description: `Outstanding balance for ${finalReceiptNumber}`,
        createdAt: now,
      });
    }

    // 7. Process Items (Inventory)
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      const previousStock = product.stock;
      const newStock = previousStock - item.quantity;

      // Update Stock
      await ctx.db.patch(item.productId, { stock: newStock });

      // Log Movement
      await ctx.db.insert("inventoryMovements", {
        productId: item.productId,
        movementType: "Sale",
        quantity: -item.quantity,
        previousStock,
        newStock,
        reason: `Sale ${finalReceiptNumber}`,
        createdAt: now,
      });
    }

    if (args.customerId) {
      await recomputeCustomerIntelligence(ctx.db, args.customerId);
    }

    // 8. Increment Analytics Counters
    const totalItems = args.items.reduce((sum, item) => sum + item.quantity, 0);

    let totalPendingAmount = 0;
    if (args.amountReceived < args.total) {
      totalPendingAmount = args.total - args.amountReceived;
    }

    const paymentsByMethod: Record<string, number> = {};
    for (const pay of args.paymentBreakdown) {
      const targetKey = normalizePaymentMethod(pay.method);
      paymentsByMethod[targetKey] = (paymentsByMethod[targetKey] || 0) + pay.amount;
    }

    const salesByCategory: Record<string, number> = {};
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        const cat = product.category || "Unknown";
        salesByCategory[cat] = (salesByCategory[cat] || 0) + item.quantity;
      }
    }

    const dailyStat = await ctx.db
      .query("dailyStats")
      .withIndex("by_date", (q) => q.eq("date", todayStr))
      .first();

    if (dailyStat) {
      const updatedPaymentsByMethod = { ...(dailyStat.paymentsByMethod || {}) };
      for (const [key, val] of Object.entries(paymentsByMethod)) {
        updatedPaymentsByMethod[key] = (updatedPaymentsByMethod[key] || 0) + val;
      }

      const updatedSalesByCategory = { ...(dailyStat.salesByCategory || {}) };
      for (const [key, val] of Object.entries(salesByCategory)) {
        updatedSalesByCategory[key] = (updatedSalesByCategory[key] || 0) + val;
      }

      await ctx.db.patch(dailyStat._id, {
        totalRevenue: dailyStat.totalRevenue + args.total,
        totalProfit: dailyStat.totalProfit + args.profit,
        transactionCount: dailyStat.transactionCount + 1,
        itemsSold: dailyStat.itemsSold + totalItems,
        totalPending: (dailyStat.totalPending || 0) + totalPendingAmount,
        paymentsByMethod: updatedPaymentsByMethod,
        salesByCategory: updatedSalesByCategory,
      });
    } else {
      await ctx.db.insert("dailyStats", {
        date: todayStr,
        totalRevenue: args.total,
        totalProfit: args.profit,
        transactionCount: 1,
        itemsSold: totalItems,
        totalPending: totalPendingAmount,
        paymentsByMethod,
        salesByCategory,
      });
    }

    const globalCounter = await ctx.db
      .query("globalCounters")
      .filter((q) => q.eq(q.field("id"), "main"))
      .first();

    if (globalCounter) {
      await ctx.db.patch(globalCounter._id, {
        totalRevenue: globalCounter.totalRevenue + args.total,
        totalProfit: globalCounter.totalProfit + args.profit,
        transactionCount: globalCounter.transactionCount + 1,
      });
    } else {
      await ctx.db.insert("globalCounters", {
        id: "main",
        totalRevenue: args.total,
        totalProfit: args.profit,
        transactionCount: 1,
        activeClients: 0,
      });
    }

    return transactionId;
  },
});

// Analytics: Revenue & Profit
export const getAnalytics = query({
  handler: async (ctx) => {
    const globalCounter = await ctx.db.query("globalCounters").filter((q) => q.eq(q.field("id"), "main")).first();
    return {
      totalRevenue: globalCounter?.totalRevenue || 0,
      totalProfit: globalCounter?.totalProfit || 0,
      transactionCount: globalCounter?.transactionCount || 0,
    };
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.id);
    if (!transaction) throw new Error("Transaction not found");

    // 1. Restore Inventory Stock
    for (const item of transaction.items) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        const previousStock = product.stock;
        const newStock = previousStock + item.quantity;
        
        await ctx.db.patch(item.productId, { stock: newStock });

        // Log restoration movement
        await ctx.db.insert("inventoryMovements", {
          productId: item.productId,
          movementType: "Return", // Or "Adjustment"
          quantity: item.quantity,
          previousStock,
          newStock,
          reason: `Transaction ${transaction.receiptNumber} Deleted`,
          createdAt: Date.now(),
        });
      }
    }

    // 3. Delete Associated Payments and their Ledger Entries
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.id))
      .collect();
    
    const paymentIds = payments.map(p => p._id);
    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    // 4. Revert Customer Balances & Delete Ledger Entries
    if (transaction.customerId) {
      const customer = await ctx.db.get(transaction.customerId);
      if (customer) {
        let creditBalance = customer.creditBalance || 0;
        let debitBalance = customer.debitBalance || 0;

        const amountReceived = transaction.amountReceived || 0;
        const change = amountReceived - transaction.total;
        
        let applyAsDebt = 0;
        let applyAsCredit = 0;

        if (change > 0 && transaction.changeHandling === "Store Credit") {
          applyAsDebt += change;
        } else if (change < 0) {
          applyAsCredit += Math.abs(change);
        }

        const storeCreditUsed = payments
          .filter((p) => p.paymentMethod === "Store Credit")
          .reduce((sum, p) => sum + p.amount, 0);

        applyAsCredit += storeCreditUsed;

        const reconciledDebt = reconcileBalances(creditBalance, debitBalance, -applyAsDebt);
        const finalReconciled = reconcileBalances(reconciledDebt.creditBalance, reconciledDebt.debitBalance, applyAsCredit);

        await ctx.db.patch(transaction.customerId, {
          creditBalance: Math.max(0, finalReconciled.creditBalance),
          debitBalance: Math.max(0, finalReconciled.debitBalance)
        });
      }

      // Delete Ledger Entries tied to this transaction or its payments
      const customerLedgers = await ctx.db
        .query("ledger")
        .withIndex("by_customer", (q) => q.eq("customerId", transaction.customerId))
        .collect();

      for (const entry of customerLedgers) {
        if (entry.referenceId === args.id || (entry.referenceId && paymentIds.includes(entry.referenceId as any))) {
          await ctx.db.delete(entry._id);
        }
      }
    }

    // 5. Delete Transaction
    await ctx.db.delete(args.id);

    // 6. Caixa SALE_REVERSAL
    const cashPayment = transaction.paymentBreakdown.find((p: any) => p.method.toLowerCase() === "cash");
    if (cashPayment && cashPayment.amount > 0) {
      let netCash = cashPayment.amount;
      const amountReceived = transaction.amountReceived || 0;
      const change = amountReceived - transaction.total;
      const isOverpayment = change > 0;
      if (isOverpayment && transaction.changeHandling === "Cash") {
        netCash -= change;
      }

      await recordCaixaCash(
        ctx.db,
        netCash,
        "SALE_REVERSAL",
        `Reversal of cash sale for ${transaction.receiptNumber}`,
        transaction.cashierName || "System Admin",
        transaction._id
      );
    }

    if (transaction.customerId) {
      await recomputeCustomerIntelligence(ctx.db, transaction.customerId);
    }

    // 7. Decrement Analytics Counters
    const txDateStr = new Date(transaction._creationTime).toISOString().split("T")[0];
    const totalItems = transaction.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    const dailyStat = await ctx.db
      .query("dailyStats")
      .withIndex("by_date", (q) => q.eq("date", txDateStr))
      .first();

    let totalPendingAmount = 0;
    if ((transaction.amountReceived || 0) < transaction.total) {
      totalPendingAmount = transaction.total - (transaction.amountReceived || 0);
    }

    const paymentsByMethod: Record<string, number> = {};
    for (const pay of (transaction.paymentBreakdown || [])) {
      const targetKey = normalizePaymentMethod(pay.method);
      paymentsByMethod[targetKey] = (paymentsByMethod[targetKey] || 0) + pay.amount;
    }

    const salesByCategory: Record<string, number> = {};
    for (const item of transaction.items) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        const cat = product.category || "Unknown";
        salesByCategory[cat] = (salesByCategory[cat] || 0) + item.quantity;
      }
    }

    if (dailyStat) {
      const updatedPaymentsByMethod = { ...(dailyStat.paymentsByMethod || {}) };
      for (const [key, val] of Object.entries(paymentsByMethod)) {
        updatedPaymentsByMethod[key] = Math.max(0, (updatedPaymentsByMethod[key] || 0) - val);
      }

      const updatedSalesByCategory = { ...(dailyStat.salesByCategory || {}) };
      for (const [key, val] of Object.entries(salesByCategory)) {
        updatedSalesByCategory[key] = Math.max(0, (updatedSalesByCategory[key] || 0) - val);
      }

      await ctx.db.patch(dailyStat._id, {
        totalRevenue: Math.max(0, dailyStat.totalRevenue - transaction.total),
        totalProfit: Math.max(0, dailyStat.totalProfit - transaction.profit),
        transactionCount: Math.max(0, dailyStat.transactionCount - 1),
        itemsSold: Math.max(0, dailyStat.itemsSold - totalItems),
        totalPending: Math.max(0, (dailyStat.totalPending || 0) - totalPendingAmount),
        paymentsByMethod: updatedPaymentsByMethod,
        salesByCategory: updatedSalesByCategory,
      });
    }

    const globalCounter = await ctx.db
      .query("globalCounters")
      .filter((q) => q.eq(q.field("id"), "main"))
      .first();

    if (globalCounter) {
      await ctx.db.patch(globalCounter._id, {
        totalRevenue: Math.max(0, globalCounter.totalRevenue - transaction.total),
        totalProfit: Math.max(0, globalCounter.totalProfit - transaction.profit),
        transactionCount: Math.max(0, globalCounter.transactionCount - 1),
      });
    }
  },
});

