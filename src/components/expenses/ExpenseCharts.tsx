import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = ["#8a4853", "#735c00", "#6e5371", "#d7c1c3", "#857374", "#b76e79"];
const STATUS_COLORS: Record<string, string> = {
  Paid: "#2f7d4f",
  Pending: "#8a4853",
  Overdue: "#c0392b",
  Cancelled: "#857374",
};

interface ExpenseChartsProps {
  byCategory: Record<string, number>;
  monthlyTrend: { month: string; paid: number; pending: number; overdue: number; total: number }[];
  statusBreakdown: { paidCount: number; pendingCount: number; overdueCount: number; cancelledCount: number };
  formatCurrency: (v: number) => string;
}

export const ExpenseCharts = ({ byCategory, monthlyTrend, statusBreakdown, formatCurrency }: ExpenseChartsProps) => {
  const categoryData = Object.entries(byCategory)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const statusData = [
    { name: "Paid", value: statusBreakdown.paidCount },
    { name: "Pending", value: statusBreakdown.pendingCount },
    { name: "Overdue", value: statusBreakdown.overdueCount },
    { name: "Cancelled", value: statusBreakdown.cancelledCount },
  ].filter((s) => s.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
      {/* Category Distribution */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col">
        <div className="mb-6">
          <h3 className="font-headline-md text-lg text-primary">By Category</h3>
          <p className="font-label-caps text-[9px] text-outline">CURRENT MONTH SPEND</p>
        </div>
        {categoryData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-outline text-xs py-12">No expenses yet</div>
        ) : (
          <>
            <div className="h-48 w-full min-h-[192px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="font-label-caps text-[10px] text-on-surface-variant truncate">{entry.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col">
        <div className="mb-6">
          <h3 className="font-headline-md text-lg text-primary">6-Month Trend</h3>
          <p className="font-label-caps text-[9px] text-outline">PAID VS PENDING VS OVERDUE</p>
        </div>
        <div className="h-48 w-full min-h-[192px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="paid" stackId="a" fill={STATUS_COLORS.Paid} radius={[0, 0, 0, 0]} />
              <Bar dataKey="pending" stackId="a" fill={STATUS_COLORS.Pending} radius={[0, 0, 0, 0]} />
              <Bar dataKey="overdue" stackId="a" fill={STATUS_COLORS.Overdue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex gap-4 justify-center">
          {["Paid", "Pending", "Overdue"].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }}></div>
              <span className="font-label-caps text-[10px] text-on-surface-variant">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col">
        <div className="mb-6">
          <h3 className="font-headline-md text-lg text-primary">Status Breakdown</h3>
          <p className="font-label-caps text-[9px] text-outline">CURRENT MONTH COUNT</p>
        </div>
        {statusData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-outline text-xs py-12">No expenses yet</div>
        ) : (
          <>
            <div className="h-48 w-full min-h-[192px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {statusData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] }}></div>
                  <span className="font-label-caps text-[10px] text-on-surface-variant">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
