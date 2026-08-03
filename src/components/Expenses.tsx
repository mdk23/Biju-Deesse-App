"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Repeat, BarChart, DollarSign, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./AuthProvider";

import { ExpenseFilters } from "./expenses/ExpenseFilters";
import { ExpenseCharts } from "./expenses/ExpenseCharts";
import { ExpenseTable } from "./expenses/ExpenseTable";
import { ExpenseDetailDrawer } from "./expenses/ExpenseDetailDrawer";
import { ExpenseFormDrawer } from "./expenses/ExpenseFormDrawer";
import { PayExpenseModal } from "./expenses/PayExpenseModal";
import { ExpenseTemplateManager } from "./expenses/ExpenseTemplateManager";

const StatCard = ({ title, value, subValue, icon: Icon, color }: any) => (
  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:shadow-xl transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}>
        <Icon size={20} />
      </div>
    </div>
    <p className="font-label-caps text-[10px] text-outline mb-1">{title}</p>
    <h3 className="font-headline-md text-2xl text-primary mb-1">{value}</h3>
    <p className="font-body-md text-xs text-on-surface-variant opacity-70">{subValue}</p>
  </div>
);

export default function Expenses() {
  const { user } = useAuth();

  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [originFilter, setOriginFilter] = useState("All Origins");
  const [statusTab, setStatusTab] = useState("All Status");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [payingExpense, setPayingExpense] = useState<any | null>(null);
  const [isManagingTemplates, setIsManagingTemplates] = useState(false);

  const canManage = user?.role === "admin" || user?.role === "manager";

  const expenses = useQuery(api.expenses.list, {
    category: categoryFilter !== "All Categories" ? categoryFilter : undefined,
    origin: originFilter !== "All Origins" ? (originFilter as "Manual" | "Recurring") : undefined,
  }) || [];

  const dashboard = useQuery(api.expenses.getDashboard);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-MZ", { style: "currency", currency: "MZN" })
      .format(val)
      .replace("MZN", "Mt");

  const filteredExpenses = useMemo(() => {
    let rows = expenses;
    if (startDate) {
      const startTs = new Date(`${startDate}T00:00:00`).getTime();
      rows = rows.filter((e) => e.dueDate >= startTs);
    }
    if (endDate) {
      const endTs = new Date(`${endDate}T23:59:59`).getTime();
      rows = rows.filter((e) => e.dueDate <= endTs);
    }
    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) rows = rows.filter((e) => e.amount >= min);
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) rows = rows.filter((e) => e.amount <= max);
    }
    return rows;
  }, [expenses, startDate, endDate, minAmount, maxAmount]);

  const handleOpenEdit = (expense: any) => {
    setSelectedExpenseId(null);
    setEditingExpense(expense);
  };

  const handleOpenPay = (expense: any) => {
    setSelectedExpenseId(null);
    setPayingExpense(expense);
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <h1 className="font-headline-lg text-4xl text-primary mb-2">Expense Management</h1>
          <p className="font-body-md text-on-surface-variant max-w-xl">
            Track bills, recurring costs, and payments across the boutique.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Link
            href="/expenses/reports"
            className="flex-1 md:flex-none px-5 py-3 bg-white/40 backdrop-blur-md border border-primary/20 text-primary rounded-2xl font-label-caps text-[11px] hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <BarChart size={16} /> REPORTS
          </Link>
          {canManage && (
            <button
              onClick={() => setIsManagingTemplates(true)}
              className="flex-1 md:flex-none px-5 py-3 bg-white/40 backdrop-blur-md border border-primary/20 text-primary rounded-2xl font-label-caps text-[11px] hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Repeat size={16} /> TEMPLATES
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setIsAddingExpense(true)}
              className="flex-1 md:flex-none px-6 py-3 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} /> NEW EXPENSE
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <ExpenseFilters
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        originFilter={originFilter}
        setOriginFilter={setOriginFilter}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        minAmount={minAmount}
        setMinAmount={setMinAmount}
        maxAmount={maxAmount}
        setMaxAmount={setMaxAmount}
        isFiltersExpanded={isFiltersExpanded}
        setIsFiltersExpanded={setIsFiltersExpanded}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard
          title="TOTAL THIS MONTH"
          value={dashboard ? formatCurrency(dashboard.totalThisMonth) : "..."}
          subValue={`${dashboard?.statusBreakdown.paidCount ?? 0} paid, ${dashboard?.statusBreakdown.pendingCount ?? 0} pending`}
          icon={DollarSign}
          color="primary"
        />
        <StatCard
          title="PAID"
          value={dashboard ? formatCurrency(dashboard.paid) : "..."}
          subValue="Settled this month"
          icon={CheckCircle2}
          color="secondary"
        />
        <StatCard
          title="PENDING"
          value={dashboard ? formatCurrency(dashboard.pending) : "..."}
          subValue="Awaiting payment"
          icon={Clock}
          color="outline"
        />
        <StatCard
          title="OVERDUE"
          value={dashboard ? formatCurrency(dashboard.overdue) : "..."}
          subValue="Past due date"
          icon={AlertTriangle}
          color="error"
        />
      </div>

      {/* Charts */}
      {dashboard && (
        <ExpenseCharts
          byCategory={dashboard.byCategory}
          monthlyTrend={dashboard.monthlyTrend}
          statusBreakdown={dashboard.statusBreakdown}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Table */}
      <ExpenseTable
        expenses={filteredExpenses}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusTab={statusTab}
        setStatusTab={setStatusTab}
        onSelectExpense={(e) => setSelectedExpenseId(e._id)}
        formatCurrency={formatCurrency}
      />

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedExpenseId && (
          <ExpenseDetailDrawer
            expenseId={selectedExpenseId}
            userRole={user?.role}
            onClose={() => setSelectedExpenseId(null)}
            onEdit={handleOpenEdit}
            onPay={handleOpenPay}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>

      {/* Create/Edit Drawer */}
      <AnimatePresence>
        {(isAddingExpense || editingExpense) && (
          <ExpenseFormDrawer
            editingExpense={editingExpense}
            onClose={() => {
              setIsAddingExpense(false);
              setEditingExpense(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Pay Modal */}
      <AnimatePresence>
        {payingExpense && (
          <PayExpenseModal
            expense={payingExpense}
            onClose={() => setPayingExpense(null)}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>

      {/* Template Manager */}
      <AnimatePresence>
        {isManagingTemplates && (
          <ExpenseTemplateManager onClose={() => setIsManagingTemplates(false)} formatCurrency={formatCurrency} />
        )}
      </AnimatePresence>
    </div>
  );
}
