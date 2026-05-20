import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
        customerTier: customer?.loyaltyTier || "Standard",
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
    settlementType: v.string(), // "Fully Paid", "Partially Paid", "Pending"
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
    let status = "Pending";
    
    if (totalPayments >= args.total) {
      status = "Completed";
    } else if (totalPayments > 0) {
      status = "Partially Paid";
    }

    // Backend Validation: Settlement vs Reality
    if (args.settlementType === "Fully Paid" && status !== "Completed") {
      throw new Error("Full settlement requires total payment coverage.");
    }
    if (args.settlementType === "Partially Paid" && status !== "Partially Paid") {
      throw new Error("Partial settlement requires payment > 0 and < total.");
    }
    if (args.settlementType === "Pending" && status !== "Pending") {
      throw new Error("Pending settlement requires zero payment.");
    }

    // Extra Validation: Walk-in must be Fully Paid
    if (!args.customerId && args.settlementType !== "Fully Paid") {
      throw new Error("Walk-in transactions must be fully settled at checkout.");
    }

    // 2. Create Transaction
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
      settlementType: args.settlementType,
      deliveryStatus: args.deliveryStatus,
      paymentBreakdown: args.paymentBreakdown,
      items: args.items,
      refundedAmount: 0,
      notes: args.notes,
    });

    // 2. Process Items (Inventory)
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
        createdAt: Date.now(),
      });
    }

    // 3. Process Client (if any)
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);
      if (customer) {
        await ctx.db.patch(args.customerId, {
          totalSpent: customer.totalSpent + args.total,
        });
      }
    }

    // 4. Record Payments
    let totalPaid = 0;
    for (const pay of args.paymentBreakdown) {
      await ctx.db.insert("payments", {
        transactionId,
        customerId: args.customerId,
        amount: pay.amount,
        paymentMethod: pay.method,
        paymentDate: Date.now(),
        status: "Completed",
      });
      totalPaid += pay.amount;
    }

    // Handle outstanding balance if payment < total
    if (args.customerId && totalPaid < args.total) {
      const customer = await ctx.db.get(args.customerId);
      if (customer) {
        await ctx.db.patch(args.customerId, {
          outstandingBalance: customer.outstandingBalance + (args.total - totalPaid),
        });
      }
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

    // 2. Rollback Customer Spending/Balance
    if (transaction.customerId) {
      const customer = await ctx.db.get(transaction.customerId);
      if (customer) {
        const totalPaid = transaction.paymentBreakdown.reduce((acc, p) => acc + p.amount, 0);
        const unpaidAmount = transaction.total - totalPaid;

        await ctx.db.patch(transaction.customerId, {
          totalSpent: Math.max(0, customer.totalSpent - transaction.total),
          outstandingBalance: Math.max(0, customer.outstandingBalance - unpaidAmount),
        });
      }
    }

    // 3. Delete Associated Payments
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_transaction", (q) => q.eq("transactionId", args.id))
      .collect();
    
    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    // 4. Delete Transaction
    await ctx.db.delete(args.id);
  },
});
