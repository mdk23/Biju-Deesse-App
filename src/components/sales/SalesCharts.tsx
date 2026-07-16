import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Treemap,
} from "recharts";

const COLORS = [
  "#8a4853",
  "#735c00",
  "#6e5371",
  "#d7c1c3",
  "#4a3b32",
  "#c2a38d",
  "#d4af37",
  "#6b4c41",
  "#9e7b6d",
  "#8c7b75",
  "#43323c",
  "#5c6b73",
  "#bda09a",
  "#d1cdcb",
  "#a88d75",
  "#554d48",
  "#8a9591",
  "#f3e5d8",
];

interface SalesChartsProps {
  dynamicRevenueHistory: any[];
  dynamicCategoryDistribution: any[];
  dynamicPayoutDistribution: any[];
  topSellingItems: any[];
  formatCurrency: (v: number) => string;
}

export const SalesCharts = ({
  dynamicRevenueHistory,
  dynamicCategoryDistribution,
  dynamicPayoutDistribution,
  topSellingItems,
  formatCurrency,
}: SalesChartsProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border border-white/50 h-96 bg-white/5 animate-pulse" />
        <div className="glass-panel p-8 rounded-3xl border border-white/50 h-96 bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <>
      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border border-white/50">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="font-headline-md text-xl text-primary">Revenue Trends</h3>
              <p className="font-label-caps text-[9px] text-outline tracking-widest">
                DYNAMIC FISCAL PERFORMANCE
              </p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicRevenueHistory}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8a4853" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8a4853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e2de" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#857374" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#857374" }}
                  dx={-10}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8a4853"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-white/50 flex flex-col">
          <h3 className="font-headline-md text-xl text-primary mb-2">Category Performance</h3>
          <p className="font-label-caps text-[9px] text-outline tracking-widest mb-10">SALES DISTRIBUTION</p>
          <div className="flex-1 flex flex-col justify-center items-center relative">
            {dynamicCategoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={dynamicCategoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {dynamicCategoryDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-outline/50 flex flex-col items-center justify-center h-full">
                <span className="material-symbols-outlined text-4xl mb-2">pie_chart</span>
                <p className="text-sm font-label-caps">No data</p>
              </div>
            )}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {dynamicCategoryDistribution.map((entry: any, i: number) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                ></div>
                <span className="font-label-caps text-[10px] text-on-surface-variant">
                  {entry.name} ({entry.value}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="glass-panel p-8 rounded-3xl border border-white/50 flex flex-col">
          <h3 className="font-headline-md text-xl text-primary mb-2">Payout Methods</h3>
          <p className="font-label-caps text-[9px] text-outline tracking-widest mb-10">TENDER DISTRIBUTION</p>
          <div className="flex-1 flex flex-col justify-center items-center relative">
            {dynamicPayoutDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <Treemap data={dynamicPayoutDistribution} dataKey="amount" stroke="#fff" isAnimationActive={false}>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
                </Treemap>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-outline/50 flex flex-col items-center justify-center h-full">
                <span className="material-symbols-outlined text-4xl mb-2">account_balance_wallet</span>
                <p className="text-sm font-label-caps">No data</p>
              </div>
            )}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {dynamicPayoutDistribution.map((entry: any, i: number) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                ></div>
                <span className="font-label-caps text-[10px] text-on-surface-variant">
                  {entry.name} ({entry.value}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-white/50 flex flex-col">
          <h3 className="font-headline-md text-xl text-primary mb-2">Top 5 Selling Items</h3>
          <p className="font-label-caps text-[9px] text-outline tracking-widest mb-10">MOST POPULAR PIECES</p>
          <div className="flex-1 h-[240px]">
            {topSellingItems.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSellingItems} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e2de" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#857374" }}
                    width={120}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(138, 72, 83, 0.05)" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="count" fill="#8a4853" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-outline/50 flex flex-col items-center justify-center h-full">
                <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
                <p className="text-sm font-label-caps">No data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
