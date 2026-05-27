"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  PlusCircle,
  Trash2,
  Printer,
  MessageCircle,
  Bookmark,
  Banknote,
  Smartphone,
  CreditCard,
  Landmark,
  Layers,
  CalendarDays,
  CheckCircle2,
  User,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export default function POS() {
  const products = useQuery(api.products.list, { archived: false }) || [];
  const customers = useQuery(api.customers.list) || [];

  const createTransaction = useMutation(api.transactions.create);

  const [activeCategory, setActiveCategory] = useState("All Collections");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [cart, setCart] = useState<any[]>([]);

  const [isReserved, setIsReserved] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedCustomer = customers.find((c) => c._id === selectedCustomerId);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "All Collections") return products;
    return products.filter((p) =>
      p.category.toLowerCase().includes(activeCategory.toLowerCase()),
    );
  }, [products, activeCategory]);

  const handleAddToCart = (product: any) => {
    const existing = cart.find((i) => i.id === product._id);
    if (existing) {
      setCart(
        cart.map((i) =>
          i.id === product._id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          id: product._id,
          name: product.name,
          price: product.sellingPrice,
          sku: product.code || "N/A",
          quantity: 1,
          discount: 0,
          image: product.imageUrl || "",
          costPrice: product.costPrice || 0,
        },
      ]);
    }
  };

  const saleTotals = useMemo(() => {
    const subtotal = cart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
    const discount = cart.reduce(
      (acc, item) => acc + item.price * item.quantity * (item.discount / 100),
      0,
    );
    const total = subtotal - discount;
    const profit = cart.reduce((acc, item) => {
      const itemDiscount = item.price * item.quantity * (item.discount / 100);
      const cost = (item.costPrice || 0) * item.quantity;
      const revenue = item.price * item.quantity - itemDiscount;
      return acc + (revenue - cost);
    }, 0);

    return { subtotal, discount, total, profit };
  }, [cart]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-MZ", { style: "currency", currency: "MZN" })
      .format(val)
      .replace("MZN", "Mt");

  const handleCompleteTransaction = async () => {
    if (cart.length === 0) {
      setErrorMessage("Your cart is empty.");
      return;
    }

    // Verify stock availability
    for (const item of cart) {
      const originalProduct = products.find((p) => p._id === item.id);
      if (originalProduct && originalProduct.stock < item.quantity) {
        setErrorMessage(
          `Insufficient stock for ${item.name}. Available: ${originalProduct.stock}`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const receiptNumber = `INV-${Date.now().toString().slice(-8)}`;
      let settlementType = "Fully Paid";
      let amountPaid = saleTotals.total;

      if (isReserved) {
        settlementType = "Pending";
        amountPaid = 0;
      } else if (paymentMethod === "Layby") {
        settlementType = "Partially Paid";
        // Default layby deposit is 30%
        amountPaid = Math.round(saleTotals.total * 0.3);
      }

      // Enforce Walk-in rules: must be fully settled
      if (!selectedCustomerId && settlementType !== "Fully Paid") {
        settlementType = "Fully Paid";
        amountPaid = saleTotals.total;
      }

      const paymentBreakdown =
        amountPaid > 0
          ? [
            {
              method: paymentMethod,
              amount: amountPaid,
            },
          ]
          : [];

      await createTransaction({
        customerId: (selectedCustomerId as Id<"customers">) || undefined,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: saleTotals.subtotal,
        discount: saleTotals.discount,
        taxes: saleTotals.total * 0.17, // VAT
        total: saleTotals.total,
        profit: saleTotals.profit,
        cashierName: "Biju Cashier",
        receiptNumber,
        settlementType,
        deliveryStatus: isReserved ? "Pending" : "Delivered",
        paymentBreakdown,
        notes: isReserved ? "Reservation hold" : undefined,
      });

      setSuccessMessage(`Transaction ${receiptNumber} completed successfully!`);
      setCart([]);
      setIsReserved(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to complete transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
      {/* Left Section: Search & Products */}
      <section className="col-span-12 lg:col-span-8 flex flex-col gap-4 h-full">
        {/* Search & Filters */}
        <div className="bg-white/40 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/50 flex flex-col gap-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-outline"
                size={20}
              />
              <input
                className="w-full pl-12 pr-4 py-3 bg-transparent border-b border-primary/20 focus:border-primary focus:ring-0 font-label-caps text-label-caps outline-none transition-all placeholder:text-outline/50"
                placeholder="SEARCH BY NAME, SKU, OR BARCODE"
                type="text"
              />
            </div>
            <button className="p-3 bg-surface-container rounded-lg border border-outline-variant/30 hover:bg-surface-variant transition-colors">
              <Filter className="text-primary" size={20} />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {[
              "All Collections",
              "Rings",
              "Necklaces",
              "Bracelets",
              "Watches",
              "Earrings",
            ].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full font-label-caps text-[10px] whitespace-nowrap transition-all border ${activeCategory === cat
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-white/40 border-white/50 text-on-surface-variant hover:bg-white/60"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 overflow-y-auto pr-2 pb-6">
          {filteredProducts.map((p) => (
            <div
              key={p._id}
              className="bg-white/40 backdrop-blur-md rounded-xl overflow-hidden border border-white/50 flex flex-col group cursor-pointer transition-all hover:shadow-lg"
            >
              <div className="relative aspect-square bg-surface-container overflow-hidden">
                {p.imageUrl ? (
                  <img
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    alt={p.name}
                    src={p.imageUrl}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary/30">
                    <CheckCircle2 size={32} />
                  </div>
                )}
                <span
                  className={`absolute top-2 right-2 px-2 py-0.5 bg-white/80 backdrop-blur text-[9px] font-bold rounded-md ${p.stock > 0 ? "text-primary" : "text-error"}`}
                >
                  {p.stock > 0 ? `${p.stock} IN STOCK` : "OUT OF STOCK"}
                </span>
              </div>
              <div className="p-3 flex flex-col gap-1.5 flex-1">
                <div className="flex justify-between items-start gap-1">
                  <h3 className="font-headline-md text-sm text-on-surface leading-tight line-clamp-2">
                    {p.name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1 mt-auto">
                  <span className="text-[8px] bg-secondary-container/20 text-secondary px-1.5 py-0.5 rounded font-bold">
                    {p.category}
                  </span>
                  <span className="text-[8px] bg-surface-variant/40 text-on-surface-variant px-1.5 py-0.5 rounded font-bold uppercase truncate max-w-[80px]">
                    {p.code || "N/A"}
                  </span>
                </div>
                <div className="mt-2 flex justify-between items-center border-t border-primary/10 pt-2">
                  <p className="font-headline-md text-primary text-sm">
                    {formatCurrency(p.sellingPrice)}
                  </p>
                  <button
                    onClick={() => handleAddToCart(p)}
                    className="p-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-white transition-colors"
                  >
                    <PlusCircle size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Right Section: Cart & Payment */}
      <aside className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-6">
        {/* Customer Integration */}
        <div className="bg-white/40 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/50 shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-label-caps text-label-caps text-on-surface-variant">
              Customer Profile
            </h4>
            <div className="flex bg-surface-container p-1 rounded-lg">
              <select
                className="w-full bg-transparent text-xs font-bold focus:ring-0 outline-none p-1 text-primary"
                value={selectedCustomerId || ""}
                onChange={(e) => setSelectedCustomerId(e.target.value || null)}
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-xl">
              {selectedCustomer ? (
                selectedCustomer.firstName.charAt(0)
              ) : (
                <User size={24} />
              )}
            </div>
            <div className="flex-1">
              <p className="font-body-md font-bold text-on-surface">
                {selectedCustomer
                  ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                  : "Walk-in Client"}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                Tier: {selectedCustomer ? selectedCustomer.loyaltyTier : "N/A"}
              </p>
            </div>

          </div>
          <div className="mt-4 flex gap-2">
            <button
              className="flex-1 py-2 text-[10px] font-bold border border-outline-variant/30 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              disabled={!selectedCustomer}
            >
              PURCHASE HISTORY
            </button>
          </div>
        </div>

        {/* Transaction Cart */}
        <div
          className="bg-white/40 backdrop-blur-md rounded-xl shadow-sm border border-white/50 flex flex-col shrink-0"
          style={{ height: "500px" }}
        >
          <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
            <h4 className="font-label-caps text-label-caps text-on-surface-variant">
              Current Cart ({cart.length})
            </h4>
            <button
              onClick={() => setCart([])}
              className="text-error text-xs font-bold hover:underline"
            >
              Clear All
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-16 h-20 bg-surface-container rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <CheckCircle2 size={24} className="text-primary/30" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="font-body-md font-bold text-sm">
                      {item.name}
                    </p>
                    <p className="font-data-tabular text-sm font-bold">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="text-[10px] text-outline uppercase">
                    {item.sku}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          setCart(
                            cart.map((i) =>
                              i.id === item.id
                                ? {
                                  ...i,
                                  quantity: Math.max(1, i.quantity - 1),
                                }
                                : i,
                            ),
                          )
                        }
                        className="w-6 h-6 border border-outline-variant/50 rounded flex items-center justify-center text-on-surface-variant hover:bg-white"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() =>
                          setCart(
                            cart.map((i) =>
                              i.id === item.id
                                ? { ...i, quantity: i.quantity + 1 }
                                : i,
                            ),
                          )
                        }
                        className="w-6 h-6 border border-outline-variant/50 rounded flex items-center justify-center text-on-surface-variant hover:bg-white"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-primary font-bold">
                        Disc: {item.discount}%
                      </span>
                      <button
                        onClick={() =>
                          setCart(cart.filter((i) => i.id !== item.id))
                        }
                        className="text-outline hover:text-error transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-white/50 border-t border-outline-variant/20 space-y-3 mt-auto">
            <div className="flex justify-between items-center text-[12px] font-bold text-on-surface-variant/70">
              <span>Subtotal</span>
              <span className="font-data-tabular">
                {formatCurrency(saleTotals.subtotal)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[12px] font-bold text-on-surface-variant/70">
              <span>Discount</span>
              <span className="font-data-tabular text-primary">
                -{formatCurrency(saleTotals.discount)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[12px] font-bold text-on-surface-variant/70">
              <span>VAT (17%)</span>
              <span className="font-data-tabular">
                {formatCurrency(saleTotals.total * 0.17)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-outline-variant/30">
              <span className="font-label-caps text-primary text-base">
                TOTAL DUE
              </span>
              <span className="font-headline-md text-2xl text-primary">
                {formatCurrency(saleTotals.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment & Actions */}
        <div className="bg-white/40 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/50 flex flex-col gap-6 shrink-0">
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-xs font-bold text-center">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="p-3 bg-error/10 border border-error/20 text-error rounded-lg text-xs font-bold text-center">
              {errorMessage}
            </div>
          )}

          <div>
            <h4 className="font-label-caps text-label-caps text-on-surface-variant mb-4">
              Payment Method
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "CASH", value: "Cash", icon: Banknote },
                { label: "BCI", value: "BCI", icon: Landmark },
                { label: "BIM", value: "BIM", icon: Landmark },
                { label: "M-PESA", value: "M-Pesa", icon: Smartphone },
                { label: "E-MOLA", value: "e-Mola", icon: Smartphone },
                { label: "CONTA MOVEL", value: "Conta Movel", icon: Smartphone },
              ].map((method) => {
                const IconComponent = method.icon;
                const isActive = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${isActive
                      ? "border-2 border-primary bg-primary/5 text-primary"
                      : "border-outline-variant/30 bg-white/50 hover:bg-white text-on-surface-variant"
                      }`}
                  >
                    <IconComponent size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCompleteTransaction}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-4 bg-primary text-white font-bold text-label-caps tracking-widest rounded-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "PROCESSING..." : "COMPLETE TRANSACTION"}
            </button>




          </div>
        </div>
      </aside>
    </div>
  );
}
