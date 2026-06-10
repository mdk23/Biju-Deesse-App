import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { recomputeCustomerIntelligence } from "./intelligence";

export const list = query({
  handler: async (ctx) => {
    const transactions = await ctx.db.query("transactions").order("desc").collect();
    
    return await Promise.all(transactions.map(async (tx) => {
      const customer = tx.customerId ? await ctx.db.get(tx.customerId) : null;
      
      const itemsWithDetails = await Promise.all((tx.items || []).map(async (item) => {
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
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : "Walk-in",
        customerTier: customer?.financialTier || "Regular",
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
    receiptNumber: v.string(),
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

    if (args.customerId) {
      customer = await ctx.db.get(args.customerId);
      if (!customer) throw new Error("Customer not found");
      
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
        if (newDebitBalance > 0) {
          if (change >= newDebitBalance) {
            newCreditBalance += (change - newDebitBalance);
            newDebitBalance = 0;
          } else {
            newDebitBalance -= change;
          }
        } else {
          newCreditBalance += change;
        }
      } else if (isUnderpayment) {
        const debt = Math.abs(change);
        if (newCreditBalance > 0) {
          if (debt >= newCreditBalance) {
            newDebitBalance += (debt - newCreditBalance);
            newCreditBalance = 0;
          } else {
            newCreditBalance -= debt;
          }
        } else {
          newDebitBalance += debt;
        }
      }

      await ctx.db.patch(args.customerId, {
        creditBalance: newCreditBalance,
        debitBalance: newDebitBalance,
      });
    }

    // 3. Create Transaction
    const transactionId = await ctx.db.insert("transactions", {
      customerId: args.customerId,
      receiptNumber: args.receiptNumber,
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
      items: args.items,
      refundedAmount: 0,
      amountReceived: args.amountReceived,
      changeGiven: isOverpayment ? change : 0,
      changeHandling: isOverpayment ? args.changeHandling : undefined,
      notes: args.notes,
    });

    const now = Date.now();

    // 4. Ledger: SALE
    await ctx.db.insert("ledger", {
      customerId: args.customerId,
      type: "SALE",
      amount: args.total,
      balanceAfter: { credit: newCreditBalance, debit: newDebitBalance },
      referenceId: transactionId,
      description: `Sale ${args.receiptNumber}`,
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
        description: `Payment via ${pay.method} for ${args.receiptNumber}`,
        createdAt: now,
      });
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
        description: `${changeType === "CREDIT" ? "Store Credit" : "Change Refund"} for ${args.receiptNumber}`,
        createdAt: now,
      });
    } else if (isUnderpayment) {
      await ctx.db.insert("ledger", {
        customerId: args.customerId,
        type: "DEBIT",
        amount: Math.abs(change),
        balanceAfter: { credit: newCreditBalance, debit: newDebitBalance },
        referenceId: transactionId,
        description: `Outstanding balance for ${args.receiptNumber}`,
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
        reason: `Sale ${args.receiptNumber}`,
        createdAt: now,
      });
    }

    if (args.customerId) {
      await recomputeCustomerIntelligence(ctx.db, args.customerId);
    }

    return transactionId;
  },
});

// Analytics: Revenue & Profit
export const getAnalytics = query({
  handler: async (ctx) => {
    const transactions = await ctx.db.query("transactions").collect();
    const totalRevenue = transactions.reduce((acc, tx) => acc + tx.total, 0);
    const totalProfit = transactions.reduce((acc, tx) => acc + tx.profit, 0);
    
    return {
      totalRevenue,
      totalProfit,
      transactionCount: transactions.length,
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

        if (applyAsDebt > 0) {
          if (creditBalance > 0) {
            if (applyAsDebt >= creditBalance) {
              debitBalance += (applyAsDebt - creditBalance);
              creditBalance = 0;
            } else {
              creditBalance -= applyAsDebt;
            }
          } else {
            debitBalance += applyAsDebt;
          }
        }

        if (applyAsCredit > 0) {
          if (debitBalance > 0) {
            if (applyAsCredit >= debitBalance) {
              creditBalance += (applyAsCredit - debitBalance);
              debitBalance = 0;
            } else {
              debitBalance -= applyAsCredit;
            }
          } else {
            creditBalance += applyAsCredit;
          }
        }

        await ctx.db.patch(transaction.customerId, {
          creditBalance: Math.max(0, creditBalance),
          debitBalance: Math.max(0, debitBalance)
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

    if (transaction.customerId) {
      await recomputeCustomerIntelligence(ctx.db, transaction.customerId);
    }
  },
});
