import React, { useMemo } from "react";
import { Search, Receipt } from "lucide-react";

const STATUS_TABS = ["All Status", "Pending", "Overdue", "Paid", "Cancelled"];

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "Paid":
      return "bg-secondary-container/20 text-secondary";
    case "Pending":
      return "bg-primary/10 text-primary";
    case "Overdue":
      return "bg-error-container/20 text-error";
    default:
      return "bg-surface-container-highest text-outline";
  }
};

interface ExpenseTableProps {
  expenses: any[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusTab: string;
  setStatusTab: (v: string) => void;
  onSelectExpense: (expense: any) => void;
  formatCurrency: (v: number) => string;
}

export const ExpenseTable = ({
  expenses,
  searchQuery,
  setSearchQuery,
  statusTab,
  setStatusTab,
  onSelectExpense,
  formatCurrency,
}: ExpenseTableProps) => {
  const filtered = useMemo(() => {
    let rows = expenses;
    if (statusTab !== "All Status") {
      rows = rows.filter((e) => e.status === statusTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      rows = rows.filter((e) => e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
    }
    return rows;
  }, [expenses, statusTab, searchQuery]);

  return (
    <section className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/50 bg-white/20">
      <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-primary/10 bg-white/40">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <h4 className="font-headline-md text-xl text-primary">Expenses</h4>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
            <input
              type="text"
              placeholder="Search title or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/50 border border-primary/10 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-4 py-1.5 rounded-full font-label-caps text-[10px] transition-all whitespace-nowrap ${
                statusTab === tab
                  ? "bg-primary text-on-primary shadow-md"
                  : "bg-white/60 text-primary border border-primary/20 hover:bg-primary/5"
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-primary/5 border-b border-primary/10 font-label-caps text-[11px] text-primary">
              <th className="px-8 py-5">TITLE</th>
              <th className="px-6 py-5">CATEGORY</th>
              <th className="px-6 py-5">DUE DATE</th>
              <th className="px-6 py-5">AMOUNT</th>
              <th className="px-6 py-5">STATUS</th>
              <th className="px-6 py-5">ORIGIN</th>
              <th className="px-8 py-5">METHOD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-outline">
                  <Receipt className="mx-auto mb-2 opacity-30" size={28} />
                  No expenses found for this filter.
                </td>
              </tr>
            ) : (
              filtered.map((expense) => (
                <tr
                  key={expense._id}
                  className="hover:bg-white/40 transition-colors cursor-pointer"
                  onClick={() => onSelectExpense(expense)}
                >
                  <td className="px-8 py-5 font-body-md text-sm font-bold text-on-surface">{expense.title}</td>
                  <td className="px-6 py-5 font-label-caps text-[10px] text-on-surface-variant">{expense.category}</td>
                  <td className="px-6 py-5 font-data-tabular text-xs text-outline">
                    {new Date(expense.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5 font-data-tabular text-sm font-bold text-primary">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusBadgeClass(expense.status)}`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-label-caps text-[10px] text-on-surface-variant">{expense.origin}</td>
                  <td className="px-8 py-5 font-label-caps text-[10px] text-on-surface-variant">
                    {expense.paymentMethod || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-8 py-5 bg-white/40 flex justify-end items-center border-t border-primary/5">
        <p className="font-label-caps text-[10px] text-outline">Showing {filtered.length} records</p>
      </div>
    </section>
  );
};
