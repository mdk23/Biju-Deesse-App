import React, { useState } from "react";
import { Users, DollarSign } from "lucide-react";
import {
  ResponsiveContainer,
  Tooltip,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  Cell,
  Line,
} from "recharts";

export const HEALTH_TIERS = ["New Client", "At Risk", "Growing Client", "Valuable Client", "Elite Client"] as const;

export const HEALTH_COLORS: Record<string, string> = {
  "New Client": "#3987e5",
  "At Risk": "#e66767",
  "Growing Client": "#9085e9",
  "Valuable Client": "#199e70",
  "Elite Client": "#B4832B",
};

export interface HealthSegmentData {
  name: string;
  count: number;
  totalSpent: number;
  avgSpent: number;
}

type MetricMode = "customers" | "revenue";

// SVG ids (and the url() fragment referencing them) can't contain spaces --
// tier names like "New Client" broke the gradient reference and silently
// fell back to a black fill. Slugify to a safe id instead.
const slug = (tier: string) => tier.toLowerCase().replace(/\s+/g, "-");

const HealthTooltip = ({ active, payload, label, formatCurrency }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl rounded-2xl p-4 min-w-[180px]">
      <p className="font-label-caps text-[9px] text-outline mb-2 tracking-widest">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-on-surface-variant">Clients</span>
          <span className="text-xs font-extrabold text-on-surface font-data-tabular">{d.count}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-on-surface-variant">Total Spend</span>
          <span className="text-xs font-extrabold text-primary font-data-tabular">{formatCurrency(d.totalSpent)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-outline-variant/20 pt-1.5 mt-1.5">
          <span className="text-xs text-on-surface-variant">Avg. per Client</span>
          <span className="text-xs font-extrabold text-secondary font-data-tabular">{formatCurrency(d.avgSpent)}</span>
        </div>
      </div>
    </div>
  );
};

interface CustomerHealthChartProps {
  data: HealthSegmentData[];
  formatCurrency: (v: number) => string;
}

export const CustomerHealthChart = ({ data, formatCurrency }: CustomerHealthChartProps) => {
  const [metricMode, setMetricMode] = useState<MetricMode>("customers");
  const yKey = metricMode === "customers" ? "count" : "totalSpent";

  const formatYAxis = (v: number) => {
    if (metricMode === "revenue") {
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    }
    return v.toString();
  };

  return (
    <div className="bg-white/30 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h3 className="font-headline-md text-xl text-primary">Customer Health Segments</h3>
          <p className="font-label-caps text-[9px] text-outline tracking-widest mt-0.5">
            BASED ON BUYING FREQUENCY, TOTAL SPEND &amp; CREDIT STANDING
          </p>
        </div>
        <button
          onClick={() => setMetricMode((m) => (m === "customers" ? "revenue" : "customers"))}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-[9px] font-label-caps text-primary hover:bg-primary/5 transition-all"
        >
          {metricMode === "customers" ? <Users size={12} /> : <DollarSign size={12} />}
          {metricMode === "customers" ? "CLIENTS" : "REVENUE"}
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {HEALTH_TIERS.map((tier) => (
          <span key={tier} className="flex items-center gap-1.5 text-[9px] font-bold text-on-surface-variant">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: HEALTH_COLORS[tier] }}></span>
            {tier}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <defs>
              {HEALTH_TIERS.map((tier) => (
                <linearGradient key={tier} id={`health-bar-grad-${slug(tier)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={HEALTH_COLORS[tier]} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={HEALTH_COLORS[tier]} stopOpacity={0.6} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(138,72,83,0.07)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              height={30}
            />
            <YAxis yAxisId="left" orientation="left" stroke="#8a485360" fontSize={10} tickFormatter={formatYAxis} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#c9a22760"
              fontSize={10}
              tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString())}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<HealthTooltip formatCurrency={formatCurrency} />} cursor={{ fill: "rgba(138,72,83,0.04)", radius: 6 }} />
            <Bar yAxisId="left" dataKey={yKey} maxBarSize={60} radius={[6, 6, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.name} fill={`url(#health-bar-grad-${slug(d.name)})`} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalSpent"
              stroke="#c9a227"
              strokeWidth={2.5}
              dot={{ fill: "#c9a227", strokeWidth: 2, r: 4, stroke: "#fff" }}
              activeDot={{ r: 6, fill: "#c9a227", stroke: "#fff", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Micro-stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-primary/8">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 p-2 rounded-xl bg-white/50 border border-white/70">
            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: HEALTH_COLORS[d.name] }}></div>
            <div>
              <p className="text-[9px] font-bold text-on-surface">{d.name}</p>
              <p className="text-[9px] font-bold text-primary font-data-tabular">{formatCurrency(d.totalSpent)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
