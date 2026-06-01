import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    code: v.string(), // SKU or Product ID
    name: v.string(),
    category: v.string(),
    costPrice: v.number(),
    sellingPrice: v.number(),
    stock: v.number(),
    reservedUntil: v.optional(v.number()), // Timestamp
    reorderLevel: v.number(),
    archived: v.boolean(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  }).index("by_code", ["code"])
    .index("by_category", ["category"]),

  customers: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    phone1: v.string(),
    phone2: v.optional(v.string()),
    phone3: v.optional(v.string()),
    email: v.optional(v.string()),
    loyaltyTier: v.string(), // e.g., "Standard", "VIP", "Platinum"
    totalSpent: v.number(),
    outstandingBalance: v.number(),
    creditLimit: v.number(),
    notes: v.optional(v.string()),
  }).index("by_last_name", ["lastName"])
    .index("by_phone", ["phone1"]),

  transactions: defineTable({
    customerId: v.optional(v.id("customers")),
    receiptNumber: v.string(),
    subtotal: v.number(),
    discount: v.number(),
    taxes: v.number(),
    total: v.number(),
    profit: v.number(),
    cashierName: v.string(),
    status: v.string(), // "Completed", "Partially Paid", "Pending"
    settlementType: v.string(), // "Fully Paid", "Partially Paid", "Pending"
    deliveryStatus: v.string(), // "Pending", "Shipped", "Delivered"
    paymentBreakdown: v.array(
      v.object({
        method: v.string(), // "M-Pesa", "e-Mola", "BCI", "BIM Cash", "Card"
        amount: v.number(),
      })
    ),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        price: v.number(), // Price at time of sale
      })
    ),
    refundedAmount: v.number(),
    amountReceived: v.optional(v.number()),
    changeGiven: v.optional(v.number()),
    changeMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_receipt", ["receiptNumber"])
    .index("by_customer", ["customerId"]),

  payments: defineTable({
    transactionId: v.id("transactions"),
    customerId: v.optional(v.id("customers")),
    amount: v.number(),
    paymentMethod: v.string(),
    reference: v.optional(v.string()), // Transaction reference from provider
    paymentDate: v.number(), // Timestamp
    status: v.string(), // "Completed", "Pending", "Failed"
    notes: v.optional(v.string()),
  }).index("by_transaction", ["transactionId"])
    .index("by_customer", ["customerId"]),

  inventoryMovements: defineTable({
    productId: v.id("products"),
    movementType: v.string(), // "Sale", "Adjustment", "Damage", "Return", "Manual Correction"
    quantity: v.number(), // Positive for stock in, negative for stock out
    previousStock: v.number(),
    newStock: v.number(),
    reason: v.string(),
    createdAt: v.number(), // Timestamp
  }).index("by_product", ["productId"])
    .index("by_type", ["movementType"]),
});
