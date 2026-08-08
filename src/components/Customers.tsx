"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Bell,
  Download,
  UserPlus,
  TrendingUp,
  Users,
  CreditCard,
  DollarSign,
  Star,
  Crown,
  AlertTriangle,
  Info,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

import { KPICard } from "./ui/KPICard";
import { InsightsPanel } from "./customers/InsightsPanel";
import { CustomerHealthChart, HEALTH_TIERS, HealthSegmentData } from "./customers/CustomerHealthChart";
import { ClientHealthGuideModal } from "./customers/ClientHealthGuideModal";
import { CustomerTable } from "./customers/CustomerTable";
import { CustomerProfileDrawer } from "./customers/CustomerProfileDrawer";
import { CustomerFormDrawer } from "./customers/CustomerFormDrawer";

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
  email?: string;
  customerType?: string;
  financialTier?: string;
  loyaltyLevel?: string;
  creditStatus?: string;
  customerScore?: number;
  customerHealth?: string;
  totalSpent: number;
  creditBalance?: number;
  debitBalance?: number;
  orderCount: number;
  lastPurchaseDate?: number;
  notes?: string;
}

export default function Customers() {
  const customers = (useQuery(api.customers.list) || []) as Customer[];
  const upsertCustomer = useMutation(api.customers.upsert);
  const deleteCustomer = useMutation(api.customers.remove);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isHealthGuideOpen, setIsHealthGuideOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [financialFilter, setFinancialFilter] = useState("All Tiers");
  const [loyaltyFilter, setLoyaltyFilter] = useState("All Levels");
  const [creditFilter, setCreditFilter] = useState("All Credits");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone1: "",
    phone2: "",
    phone3: "",
    email: "",
    notes: "",
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-MZ", { style: "currency", currency: "MZN" })
      .format(val)
      .replace("MZN", "Mt");

  // ── Filtered list ──────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchSearch =
        name.includes(searchQuery.toLowerCase()) ||
        c.phone1.includes(searchQuery) ||
        (c.email || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchFin =
        financialFilter === "All Tiers" ||
        (c.financialTier || "Regular").toLowerCase() === financialFilter.toLowerCase();
      const matchLoy =
        loyaltyFilter === "All Levels" ||
        (c.loyaltyLevel || "Bronze").toLowerCase() === loyaltyFilter.toLowerCase();
      const matchCrd =
        creditFilter === "All Credits" ||
        (c.creditStatus || "Good Standing").toLowerCase() === creditFilter.toLowerCase();
      return matchSearch && matchFin && matchLoy && matchCrd;
    });
  }, [customers, searchQuery, financialFilter, loyaltyFilter, creditFilter]);

  // ── KPIs ───────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = customers.length;
    if (!total)
      return {
        totalCustomers: 0,
        platinumVipCount: 0,
        platinumVipPercent: 0,
        averageScore: 0,
        totalDebt: 0,
        averageLTV: 0,
      };
    const platinumVipCount = customers.filter((c) =>
      ["Platinum", "VIP"].includes(c.financialTier || "Regular")
    ).length;
    return {
      totalCustomers: total,
      platinumVipCount,
      platinumVipPercent: Math.round((platinumVipCount / total) * 100),
      averageScore: Math.round(customers.reduce((s, c) => s + (c.customerScore || 0), 0) / total),
      totalDebt: customers.reduce((s, c) => s + (c.debitBalance || 0), 0),
      averageLTV: Math.round(customers.reduce((s, c) => s + (c.totalSpent || 0), 0) / total),
    };
  }, [customers]);

  // ── Health segment aggregations ─────────────────────────
  const healthSegmentData: HealthSegmentData[] = useMemo(() => {
    return HEALTH_TIERS.map((tier) => {
      const group = customers.filter((c) => (c.customerHealth || "New Client") === tier);
      const count = group.length;
      const totalSpent = group.reduce((s, c) => s + c.totalSpent, 0);
      return {
        name: tier,
        count,
        totalSpent,
        avgSpent: count > 0 ? Math.round(totalSpent / count) : 0,
      };
    });
  }, [customers]);

  // ── Auto insights (health & credit-standing driven) ────
  const insights = useMemo(() => {
    const total = customers.length;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    const plural = (n: number) => (n === 1 ? "" : "s");

    const newGroup = customers.filter((c) => (c.customerHealth || "New Client") === "New Client");
    const atRiskGroup = customers.filter((c) => c.customerHealth === "At Risk");
    const growingGroup = customers.filter((c) => c.customerHealth === "Growing Client");
    const valuableGroup = customers.filter((c) => c.customerHealth === "Valuable Client");
    const eliteGroup = customers.filter((c) => c.customerHealth === "Elite Client");

    const overdueCount = atRiskGroup.filter((c) => c.creditStatus === "Overdue").length;
    const inactiveOnlyCount = atRiskGroup.length - overdueCount;

    const growingAvgOrders = growingGroup.reduce((s, c) => s + c.orderCount, 0) / (growingGroup.length || 1);
    const growingAvgSpent = growingGroup.reduce((s, c) => s + c.totalSpent, 0) / (growingGroup.length || 1);

    const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0) || 1;
    const valuableRev = valuableGroup.reduce((s, c) => s + c.totalSpent, 0);
    const valuableRevPct = Math.round((valuableRev / totalRevenue) * 100);

    const eliteAvgOrders = eliteGroup.reduce((s, c) => s + c.orderCount, 0) / (eliteGroup.length || 1);
    const eliteAvgLTV = eliteGroup.reduce((s, c) => s + c.totalSpent, 0) / (eliteGroup.length || 1);
    const freqMultiplier =
      growingAvgOrders > 0
        ? Math.round((eliteAvgOrders / growingAvgOrders) * 10) / 10
        : eliteGroup.length > 0
          ? 3
          : 0;

    const creditGroup = customers.filter((c) => (c.creditBalance || 0) > 0);
    const totalStoreCredit = creditGroup.reduce((s, c) => s + (c.creditBalance || 0), 0);

    return [
      {
        icon: <Users size={14} className="text-slate-600" />,
        text:
          newGroup.length > 0
            ? `${newGroup.length} client${plural(newGroup.length)} (${pct(newGroup.length)}%) are New Clients with no purchase history yet — prioritize onboarding to their first sale`
            : `No New Clients right now — every client has at least one purchase on record`,
        color: "border-slate-200/60 bg-slate-50/40",
      },
      {
        icon: <AlertTriangle size={14} className="text-rose-500" />,
        text:
          atRiskGroup.length > 0
            ? `${atRiskGroup.length} client${plural(atRiskGroup.length)} (${pct(atRiskGroup.length)}%) are At Risk — ${overdueCount} from overdue debt, ${inactiveOnlyCount} from 90+ days of inactivity`
            : `No clients are At Risk — no overdue debt or prolonged inactivity detected`,
        color: "border-rose-200/60 bg-rose-50/40",
      },
      {
        icon: <TrendingUp size={14} className="text-blue-600" />,
        text:
          growingGroup.length > 0
            ? `${growingGroup.length} Growing clients average ${growingAvgOrders.toFixed(1)} orders and ${formatCurrency(growingAvgSpent)} spent — nurture them toward Valuable status`
            : `No Growing clients yet — clients building purchase frequency or spend will appear here`,
        color: "border-blue-200/60 bg-blue-50/40",
      },
      {
        icon: <DollarSign size={14} className="text-emerald-600" />,
        text:
          valuableGroup.length > 0
            ? `${valuableGroup.length} Valuable clients contribute ${valuableRevPct}% of total revenue through strong purchase frequency or spend`
            : `No Valuable clients yet — strong, debt-free buyers will appear here`,
        color: "border-emerald-200/60 bg-emerald-50/40",
      },
      {
        icon: <Crown size={14} className="text-purple-600" />,
        text:
          eliteGroup.length > 0
            ? `${eliteGroup.length} Elite clients average ${formatCurrency(eliteAvgLTV)} LTV and purchase ${freqMultiplier}× more often than Growing clients`
            : `No Elite clients yet — frequent, high-spending, debt-free buyers will appear here`,
        color: "border-purple-200/60 bg-purple-50/40",
      },
      {
        icon: <CreditCard size={14} className="text-indigo-600" />,
        text:
          creditGroup.length > 0
            ? `${creditGroup.length} client${plural(creditGroup.length)} hold ${formatCurrency(totalStoreCredit)} in store credit — a redeemable liability against future purchases`
            : `No store credit currently issued to clients`,
        color: "border-indigo-200/60 bg-indigo-50/40",
      },
    ];
  }, [customers, formatCurrency]);

  // ── Handlers ───────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ firstName: "", lastName: "", phone1: "", phone2: "", phone3: "", email: "", notes: "" });
    setIsAddingCustomer(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingId(customer._id);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone1: customer.phone1,
      phone2: customer.phone2 || "",
      phone3: customer.phone3 || "",
      email: customer.email || "",
      notes: customer.notes || "",
    });
    setIsAddingCustomer(true);
    setSelectedCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertCustomer({
        id: (editingId ?? undefined) as any,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone1: formData.phone1,
        phone2: formData.phone2 || undefined,
        phone3: formData.phone3 || undefined,
        email: formData.email || undefined,
        notes: formData.notes || undefined,
      });
      setIsAddingCustomer(false);
      setEditingId(null);
      toast.success(editingId ? "Client profile updated successfully" : "New client enrolled successfully");
    } catch {
      toast.error("Failed to save customer profile");
    }
  };

  const handleDelete = async (id: string) => {
    toast.warning("Are you sure you want to delete this customer?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteCustomer({ id: id as any });
            setSelectedCustomer(null);
            toast.success("Customer record purged from boutique database");
          } catch {
            toast.error("Failed to delete customer");
          }
        },
      },
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="relative group flex-1 md:w-80">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search clients, phones, emails…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
            />
          </div>
          <button className="p-3 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl text-primary hover:bg-primary/5 transition-all shadow-sm relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white" />
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <UserPlus size={16} /> ADD CLIENT
          </button>
          <button className="p-3 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl text-primary hover:bg-primary/5 transition-all shadow-sm">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* ── KPI Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
        <KPICard
          title="TOTAL CLIENTS"
          value={kpis.totalCustomers.toString()}
          subValue="Active boutique database"
          trend={12.5}
          icon={Users}
          color="primary"
        />
        <KPICard
          title="PLATINUM / VIP"
          value={kpis.platinumVipCount.toString()}
          subValue={`${kpis.platinumVipPercent}% of customer base`}
          trend={8.2}
          icon={Star}
          color="secondary"
        />
        <KPICard
          title="AVG INTEL SCORE"
          value={`${kpis.averageScore}/100`}
          subValue="Customer health indicator"
          trend={2.1}
          icon={TrendingUp}
          color="tertiary"
        />
        <KPICard
          title="OUTSTANDING DEBT"
          value={formatCurrency(kpis.totalDebt)}
          subValue="Credits pending payment"
          trend={-5.4}
          icon={CreditCard}
          color="error"
        />
        <KPICard
          title="AVG CLIENT LTV"
          value={formatCurrency(kpis.averageLTV)}
          subValue="Lifetime spend average"
          trend={15.8}
          icon={DollarSign}
          color="primary"
        />
      </div>

      {/* ── Analytics & Charts ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2">
          <CustomerHealthChart data={healthSegmentData} formatCurrency={formatCurrency} />
        </div>
        <div className="flex flex-col justify-between">
          <div className="bg-white/30 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-xl h-full flex flex-col justify-between">
            <div>
              <h3 className="font-headline-md text-xl text-primary mb-2 flex items-center gap-1.5">
                Automated Insights
                <button
                  onClick={() => setIsHealthGuideOpen(true)}
                  className="text-outline hover:text-primary transition-colors"
                  title="What do these client health tiers mean?"
                >
                  <Info size={16} />
                </button>
              </h3>
              <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                Boutique intelligence insights generated from real-time sales and customer loyalty profiles.
              </p>
              <InsightsPanel insights={insights} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Table ───────────────────────────── */}
      <CustomerTable
        filteredCustomers={filteredCustomers}
        financialFilter={financialFilter}
        setFinancialFilter={setFinancialFilter}
        loyaltyFilter={loyaltyFilter}
        setLoyaltyFilter={setLoyaltyFilter}
        creditFilter={creditFilter}
        setCreditFilter={setCreditFilter}
        formatCurrency={formatCurrency}
        onSelectCustomer={setSelectedCustomer}
      />

      {/* ── Customer Profile Drawer ───────────────────── */}
      <AnimatePresence>
        {selectedCustomer && (
          <CustomerProfileDrawer
            selectedCustomer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>

      {/* ── Add / Edit Drawer ────────────────────────── */}
      <AnimatePresence>
        {isAddingCustomer && (
          <CustomerFormDrawer
            editingId={editingId}
            formData={formData}
            setFormData={setFormData}
            onClose={() => setIsAddingCustomer(false)}
            onSubmit={handleSubmit}
          />
        )}
      </AnimatePresence>

      {/* ── Client Health Guide Modal ─────────────────── */}
      <AnimatePresence>
        {isHealthGuideOpen && <ClientHealthGuideModal onClose={() => setIsHealthGuideOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
