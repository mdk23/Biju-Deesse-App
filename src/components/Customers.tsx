'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Bell,
  Download,
  Filter,
  MoreVertical,
  UserPlus,
  TrendingUp,
  Users,
  CreditCard,
  DollarSign,
  ChevronRight,
  X,
  Phone,
  ShoppingBag,
  Star,
  ChevronDown,
  ChevronUp,
  Mail,
  Smartphone,
  Camera,
  Check,
  BarChart3,
  Layers,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  AlertTriangle,
  Crown,
  Gem,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────
// Colour palettes
// ─────────────────────────────────────────────────────────

const FINANCIAL_COLORS: Record<string, { bar: string; light: string; glow: string }> = {
  Regular: { bar: '#c4a4a9', light: '#f9f0f1', glow: 'rgba(196,164,169,0.3)' },
  Premium: { bar: '#b87333', light: '#fdf3ea', glow: 'rgba(184,115,51,0.3)' },
  VIP:     { bar: '#8a4853', light: '#fdf2f4', glow: 'rgba(138,72,83,0.4)' },
  Platinum:{ bar: '#6a0f49', light: '#f9ecf5', glow: 'rgba(106,15,73,0.4)' },
};

const LOYALTY_COLORS: Record<string, { bar: string; light: string; glow: string }> = {
  Bronze:  { bar: '#a97142', light: '#fdf4ec', glow: 'rgba(169,113,66,0.3)' },
  Silver:  { bar: '#7d8ea1', light: '#f1f4f7', glow: 'rgba(125,142,161,0.3)' },
  Gold:    { bar: '#c9a227', light: '#fdf8e6', glow: 'rgba(201,162,39,0.35)' },
  Diamond: { bar: '#5b4fcf', light: '#f0eeff', glow: 'rgba(91,79,207,0.35)' },
};

// ─────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────

const KPICard = ({ title, value, subValue, trend, icon: Icon, color }: any) => (
  <motion.div
    whileHover={{ y: -4, transition: { duration: 0.18 } }}
    className="glass-panel p-6 rounded-2xl border border-white/50 hover:shadow-2xl hover:shadow-primary/5 transition-all relative overflow-hidden"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}><Icon size={20} /></div>
      {trend !== undefined && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-error-container text-on-error-container'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="font-label-caps text-[10px] text-outline mb-1">{title}</p>
    <h3 className="font-headline-md text-2xl text-primary mb-1">{value}</h3>
    <p className="font-body-md text-xs text-on-surface-variant opacity-70">{subValue}</p>
  </motion.div>
);

// ─────────────────────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────────────────────

const formatMt = (v: number) =>
  new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' })
    .format(v).replace('MZN', 'Mt');

const SegmentTooltip = ({ active, payload, label, chartMode }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl rounded-2xl p-4 min-w-[200px]">
      <p className="font-label-caps text-[9px] text-outline mb-2 tracking-widest">{label} SEGMENT</p>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-on-surface-variant">Customers</span>
          <span className="text-xs font-extrabold text-on-surface font-data-tabular">{d.count}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-on-surface-variant">Total Spend</span>
          <span className="text-xs font-extrabold text-primary font-data-tabular">{formatMt(d.totalSpent)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-outline-variant/20 pt-1.5 mt-1.5">
          <span className="text-xs text-on-surface-variant">Avg. per Client</span>
          <span className="text-xs font-extrabold text-secondary font-data-tabular">{formatMt(d.avgSpent)}</span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Insights Panel
// ─────────────────────────────────────────────────────────

const InsightsPanel = ({ insights }: { insights: { icon: React.ReactNode; text: string; color: string }[] }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
    {insights.map((ins, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.08 }}
        className={`flex items-start gap-3 p-3 rounded-xl border ${ins.color} bg-white/60`}
      >
        <div className="mt-0.5 flex-shrink-0">{ins.icon}</div>
        <p className="text-xs font-medium text-on-surface leading-relaxed">{ins.text}</p>
      </motion.div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────
// Advanced Combined Chart
// ─────────────────────────────────────────────────────────

type ViewMode = 'financial' | 'loyalty' | 'combined';
type MetricMode = 'customers' | 'revenue';

interface SegmentData {
  name: string;
  count: number;
  totalSpent: number;
  avgSpent: number;
  color: string;
}

const AdvancedSegmentChart = ({
  financialData,
  loyaltyData,
  formatCurrency,
}: {
  financialData: SegmentData[];
  loyaltyData: SegmentData[];
  formatCurrency: (v: number) => string;
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  const [metricMode, setMetricMode] = useState<MetricMode>('customers');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Build combined dataset with prefixed keys so both groups render side by side
  const combinedData = useMemo(() => {
    const fin = financialData.map(d => ({ ...d, group: 'Financial', label: d.name }));
    const loy = loyaltyData.map(d => ({ ...d, group: 'Loyalty',   label: d.name }));
    return [...fin, ...loy];
  }, [financialData, loyaltyData]);

  const displayData = useMemo(() => {
    if (viewMode === 'financial') return financialData.map(d => ({ ...d, label: d.name, group: 'Financial' }));
    if (viewMode === 'loyalty')   return loyaltyData.map(d => ({ ...d, label: d.name, group: 'Loyalty' }));
    return combinedData;
  }, [viewMode, financialData, loyaltyData, combinedData]);

  const yKey = metricMode === 'customers' ? 'count' : 'totalSpent';
  const yLabel = metricMode === 'customers' ? 'Customers' : 'Total Spend (Mt)';

  const maxRevenue = Math.max(...displayData.map(d => d.totalSpent), 1);

  const getBarColor = (entry: any) => {
    if (entry.group === 'Financial') return FINANCIAL_COLORS[entry.label]?.bar || '#8a4853';
    return LOYALTY_COLORS[entry.label]?.bar || '#5b4fcf';
  };

  const CustomBar = (props: any) => {
    const { x, y, width, height, index } = props;
    const d = displayData[index];
    const color = getBarColor(d);
    return (
      <g>
        <defs>
          <linearGradient id={`bar-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.95} />
            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <rect
          x={x} y={y} width={width} height={height}
          rx={6} ry={6}
          fill={`url(#bar-grad-${index})`}
        />
      </g>
    );
  };

  // Divider index between financial & loyalty groups (only in combined view)
  const dividerX = viewMode === 'combined' ? financialData.length - 0.5 : -1;

  const CustomXTick = (props: any) => {
    const { x, y, payload, index } = props;
    const d = displayData[index];
    const isFinancial = d?.group === 'Financial';
    const color = isFinancial
      ? (FINANCIAL_COLORS[payload.value]?.bar || '#8a4853')
      : (LOYALTY_COLORS[payload.value]?.bar || '#5b4fcf');
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={14} textAnchor="middle" fill={color} fontSize={10} fontWeight="700">
          {payload.value}
        </text>
        {viewMode === 'combined' && (
          <text x={0} y={0} dy={26} textAnchor="middle" fill="#9e9e9e" fontSize={8}>
            {isFinancial ? 'FIN' : 'LOY'}
          </text>
        )}
      </g>
    );
  };

  const formatYAxis = (v: number) => {
    if (metricMode === 'revenue') {
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
      return v.toString();
    }
    return v.toString();
  };

  return (
    <div className="bg-white/30 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-xl">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="font-headline-md text-xl text-primary">Customer Segment Analytics</h3>
          <p className="font-label-caps text-[9px] text-outline tracking-widest mt-0.5">
            COMBINED FINANCIAL & LOYALTY INTELLIGENCE · LIVE DATA
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-white/60 border border-white/80 rounded-xl p-1 gap-0.5">
            {(['financial', 'loyalty', 'combined'] as ViewMode[]).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-lg font-label-caps text-[9px] tracking-widest transition-all ${
                  viewMode === m
                    ? 'bg-primary text-white shadow-md'
                    : 'text-outline hover:text-primary hover:bg-white/60'
                }`}
              >
                {m === 'financial' ? 'FIN' : m === 'loyalty' ? 'LOY' : 'BOTH'}
              </button>
            ))}
          </div>

          {/* Metric Toggle */}
          <button
            onClick={() => setMetricMode(m => m === 'customers' ? 'revenue' : 'customers')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-[9px] font-label-caps text-primary hover:bg-primary/5 transition-all"
          >
            {metricMode === 'customers' ? <Users size={12} /> : <DollarSign size={12} />}
            {metricMode === 'customers' ? 'CLIENTS' : 'REVENUE'}
          </button>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 border border-white/80 rounded-xl">
            <Calendar size={11} className="text-outline flex-shrink-0" />
            <input
              type="date" value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-[9px] text-on-surface outline-none w-20 font-data-tabular"
              placeholder="From"
            />
            <span className="text-outline text-[9px]">–</span>
            <input
              type="date" value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-[9px] text-on-surface outline-none w-20 font-data-tabular"
              placeholder="To"
            />
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-outline hover:text-error transition-colors">
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {viewMode !== 'loyalty' && Object.entries(FINANCIAL_COLORS).map(([name, c]) => (
          <span key={name} className="flex items-center gap-1.5 text-[9px] font-bold text-on-surface-variant">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.bar }}></span>
            {name}
          </span>
        ))}
        {viewMode !== 'financial' && Object.entries(LOYALTY_COLORS).map(([name, c]) => (
          <span key={name} className="flex items-center gap-1.5 text-[9px] font-bold text-on-surface-variant">
            <span className="w-3 h-3 rounded-sm border border-dashed border-white/60" style={{ backgroundColor: c.bar }}></span>
            {name}
          </span>
        ))}
        {viewMode === 'combined' && (
          <>
            <span className="ml-2 text-[9px] text-outline border-l border-outline/20 pl-2">FIN = Financial Tier</span>
            <span className="text-[9px] text-outline">LOY = Loyalty Level</span>
          </>
        )}
      </div>

      {/* Main Chart */}
      <div className="h-72 relative">
        {viewMode === 'combined' && (
          <div
            className="absolute top-0 bottom-0 border-r border-dashed border-primary/20 pointer-events-none z-10"
            style={{ left: `calc(${(financialData.length / (financialData.length + loyaltyData.length)) * 100}% - 1px)` }}
          >
            <span className="absolute -top-1 left-2 text-[8px] font-bold text-primary/40 tracking-widest">FIN │ LOY</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="spendLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c9a227" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#c9a227" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(138,72,83,0.07)" vertical={false} />

            <XAxis
              dataKey="label"
              tick={<CustomXTick />}
              axisLine={false}
              tickLine={false}
              height={36}
            />

            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#8a485360"
              fontSize={10}
              tickFormatter={formatYAxis}
              axisLine={false}
              tickLine={false}
            />

            {/* Right Y axis – always spend, for trend line */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#c9a22760"
              fontSize={10}
              tickFormatter={v => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                return v.toString();
              }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<SegmentTooltip chartMode={metricMode} />} cursor={{ fill: 'rgba(138,72,83,0.04)', radius: 6 }} />

            {/* Custom-colored bars using shape prop */}
            <Bar
              yAxisId="left"
              dataKey={yKey}
              shape={<CustomBar />}
              maxBarSize={52}
              radius={[6, 6, 0, 0]}
            />

            {/* Gold spend trend line (always visible) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalSpent"
              stroke="#c9a227"
              strokeWidth={2.5}
              dot={{ fill: '#c9a227', strokeWidth: 2, r: 4, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#c9a227', stroke: '#fff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Axis labels */}
      <div className="flex justify-between mt-2 px-2">
        {viewMode !== 'loyalty' && (
          <p className="text-[8px] font-bold text-primary/50 tracking-widest uppercase">
            ← Financial Tiers
          </p>
        )}
        {viewMode !== 'financial' && (
          <p className="text-[8px] font-bold text-purple-400/70 tracking-widest uppercase ml-auto">
            Loyalty Levels →
          </p>
        )}
      </div>

      {/* Micro-stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-primary/8">
        {displayData.slice(0, 4).map((d, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/50 border border-white/70">
            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: getBarColor(d) }}></div>
            <div>
              <p className="text-[9px] font-bold text-on-surface">{d.label}</p>
              <p className="text-[9px] text-outline">{d.count} clients</p>
              <p className="text-[9px] font-bold text-primary font-data-tabular">{formatMt(d.totalSpent)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────

export default function Customers() {
  const customers = (useQuery(api.customers.list) || []) as Customer[];
  const upsertCustomer = useMutation(api.customers.upsert);
  const deleteCustomer = useMutation(api.customers.remove);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');


  const [financialFilter, setFinancialFilter] = useState('All Tiers');
  const [loyaltyFilter, setLoyaltyFilter] = useState('All Levels');
  const [creditFilter, setCreditFilter] = useState('All Credits');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone1: '',
    phone2: '',
    phone3: '',
    email: '',
    notes: '',
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MZ', { style: 'currency', currency: 'MZN' })
      .format(val)
      .replace('MZN', 'Mt');

  // ── Filtered list ──────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchSearch = name.includes(searchQuery.toLowerCase()) ||
        c.phone1.includes(searchQuery) ||
        (c.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchFin = financialFilter === 'All Tiers' || (c.financialTier || 'Regular').toLowerCase() === financialFilter.toLowerCase();
      const matchLoy = loyaltyFilter === 'All Levels' || (c.loyaltyLevel || 'Bronze').toLowerCase() === loyaltyFilter.toLowerCase();
      const matchCrd = creditFilter === 'All Credits' || (c.creditStatus || 'Good Standing').toLowerCase() === creditFilter.toLowerCase();
      return matchSearch && matchFin && matchLoy && matchCrd;
    });
  }, [customers, searchQuery, financialFilter, loyaltyFilter, creditFilter]);

  // ── KPIs ───────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = customers.length;
    if (!total) return { totalCustomers: 0, platinumVipCount: 0, platinumVipPercent: 0, averageScore: 0, totalDebt: 0, averageLTV: 0 };
    const platinumVipCount = customers.filter(c => ['Platinum', 'VIP'].includes(c.financialTier || 'Regular')).length;
    return {
      totalCustomers: total,
      platinumVipCount,
      platinumVipPercent: Math.round((platinumVipCount / total) * 100),
      averageScore: Math.round(customers.reduce((s, c) => s + (c.customerScore || 0), 0) / total),
      totalDebt: customers.reduce((s, c) => s + (c.debitBalance || 0), 0),
      averageLTV: Math.round(customers.reduce((s, c) => s + (c.totalSpent || 0), 0) / total),
    };
  }, [customers]);

  // ── Segment aggregations ───────────────────────────────
  const segmentData = useMemo(() => {
    const mkSegment = (tier: string, colorMap: Record<string, any>, field: 'financialTier' | 'loyaltyLevel') => {
      const group = customers.filter(c => (c[field] || Object.keys(colorMap)[0]) === tier);
      const count = group.length;
      const totalSpent = group.reduce((s, c) => s + c.totalSpent, 0);
      return {
        name: tier,
        label: tier,
        count,
        totalSpent,
        avgSpent: count > 0 ? Math.round(totalSpent / count) : 0,
        color: colorMap[tier]?.bar || '#8a4853',
        group: field === 'financialTier' ? 'Financial' : 'Loyalty',
      };
    };

    const financialData = ['Regular', 'Premium', 'VIP', 'Platinum'].map(t => mkSegment(t, FINANCIAL_COLORS, 'financialTier'));
    const loyaltyData   = ['Bronze', 'Silver', 'Gold', 'Diamond'].map(t => mkSegment(t, LOYALTY_COLORS, 'loyaltyLevel'));

    return { financialData, loyaltyData };
  }, [customers]);

  // ── At-risk + top spenders ─────────────────────────────
  const analytics = useMemo(() => {
    const atRiskClients = customers
      .filter(c => (c.customerHealth || 'Growing Client') === 'At Risk' || (c.creditStatus || 'Good Standing') === 'Overdue')
      .slice(0, 5);
    const topSpenders = [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 1);
    return { atRiskClients, topSpenders };
  }, [customers]);

  // ── Auto insights ──────────────────────────────────────
  const insights = useMemo(() => {
    const total = customers.length;
    const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0) || 1;

    const vipRev = customers.filter(c => ['VIP', 'Platinum'].includes(c.financialTier || '')).reduce((s, c) => s + c.totalSpent, 0);
    const vipPct = Math.round((vipRev / totalRevenue) * 100);

    const diamondAvgOrders = customers.filter(c => c.loyaltyLevel === 'Diamond').reduce((s, c) => s + c.orderCount, 0) /
      (customers.filter(c => c.loyaltyLevel === 'Diamond').length || 1);
    const regularAvgOrders = customers.filter(c => (c.loyaltyLevel || 'Bronze') === 'Bronze').reduce((s, c) => s + c.orderCount, 0) /
      (customers.filter(c => (c.loyaltyLevel || 'Bronze') === 'Bronze').length || 1);
    const freqMultiplier = regularAvgOrders > 0 ? Math.round(diamondAvgOrders / regularAvgOrders) : 3;

    const platinumAvg = customers.filter(c => c.financialTier === 'Platinum').reduce((s, c) => s + c.totalSpent, 0) /
      (customers.filter(c => c.financialTier === 'Platinum').length || 1);
    const regularAvg = customers.filter(c => (c.financialTier || 'Regular') === 'Regular').reduce((s, c) => s + c.totalSpent, 0) /
      (customers.filter(c => (c.financialTier || 'Regular') === 'Regular').length || 1);

    const regularCount = customers.filter(c => (c.financialTier || 'Regular') === 'Regular').length;
    const regularPct = total > 0 ? Math.round((regularCount / total) * 100) : 0;

    return [
      {
        icon: <Crown size={14} className="text-purple-600" />,
        text: `VIP & Platinum clients generate ${vipPct}% of total boutique revenue`,
        color: 'border-purple-200/60 bg-purple-50/40',
      },
      {
        icon: <Gem size={14} className="text-cyan-600" />,
        text: `Diamond loyalty customers purchase ${freqMultiplier}× more frequently than Bronze members`,
        color: 'border-cyan-200/60 bg-cyan-50/40',
      },
      {
        icon: <Star size={14} className="text-amber-500" />,
        text: `Platinum clients average ${formatCurrency(platinumAvg)} LTV — the highest of all segments`,
        color: 'border-amber-200/60 bg-amber-50/40',
      },
      {
        icon: <TrendingUp size={14} className="text-rose-500" />,
        text: `Regular clients represent ${regularPct}% of all customers but contribute the lowest revenue`,
        color: 'border-rose-200/60 bg-rose-50/40',
      },
    ];
  }, [customers]);

  // ── Handlers ───────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ firstName: '', lastName: '', phone1: '', phone2: '', phone3: '', email: '', notes: '' });
    setIsAddingCustomer(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingId(customer._id);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone1: customer.phone1,
      phone2: customer.phone2 || '',
      phone3: customer.phone3 || '',
      email: customer.email || '',
      notes: customer.notes || '',
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
      toast.success(editingId ? 'Client profile updated successfully' : 'New client enrolled successfully');
    } catch {
      toast.error('Failed to save customer profile');
    }
  };

  const handleDelete = async (id: string) => {
    toast.warning('Are you sure you want to delete this customer?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await deleteCustomer({ id: id as any });
            setSelectedCustomer(null);
            toast.success('Customer record purged from boutique database');
          } catch {
            toast.error('Failed to delete customer');
          }
        },
      },
    });
  };

  const circumference = 2 * Math.PI * 50;

  // ── JSX ────────────────────────────────────────────────
  return (
    <div className="max-w-[1600px] mx-auto">

      {/* ── Header ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="relative group flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search clients, phones, emails…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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
        <KPICard title="TOTAL CLIENTS" value={kpis.totalCustomers.toString()} subValue="Active boutique database" trend={12.5} icon={Users} color="primary" />
        <KPICard title="PLATINUM / VIP" value={kpis.platinumVipCount.toString()} subValue={`${kpis.platinumVipPercent}% of customer base`} trend={8.2} icon={Star} color="secondary" />
        <KPICard title="AVG INTEL SCORE" value={`${kpis.averageScore}/100`} subValue="Customer health indicator" trend={2.1} icon={TrendingUp} color="tertiary" />
        <KPICard title="OUTSTANDING DEBT" value={formatCurrency(kpis.totalDebt)} subValue="Credits pending payment" trend={-5.4} icon={CreditCard} color="error" />
        <KPICard title="AVG CLIENT LTV" value={formatCurrency(kpis.averageLTV)} subValue="Lifetime spend average" trend={15.8} icon={DollarSign} color="primary" />
      </div>

      {/* ── Filters & Table ───────────────────────────── */}
      <section className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/50 bg-white/20">
        <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-primary/10 bg-white/40">
          <div className="flex items-center gap-4">
            <h4 className="font-headline-md text-xl text-primary">Customer Directory</h4>
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold">{filteredCustomers.length} CLIENTS</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Financial Tier */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={12} />
              <select value={financialFilter} onChange={e => setFinancialFilter(e.target.value)}
                className="pl-8 pr-8 py-2 bg-white/50 border border-outline-variant/30 rounded-xl text-[10px] font-label-caps focus:ring-2 focus:ring-primary/10 outline-none transition-all appearance-none cursor-pointer text-primary">
                <option>All Tiers</option>
                <option>Regular</option><option>Premium</option><option>VIP</option><option>Platinum</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" size={12} />
            </div>
            {/* Loyalty Level */}
            <div className="relative">
              <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={12} />
              <select value={loyaltyFilter} onChange={e => setLoyaltyFilter(e.target.value)}
                className="pl-8 pr-8 py-2 bg-white/50 border border-outline-variant/30 rounded-xl text-[10px] font-label-caps focus:ring-2 focus:ring-primary/10 outline-none transition-all appearance-none cursor-pointer text-primary">
                <option>All Levels</option>
                <option>Bronze</option><option>Silver</option><option>Gold</option><option>Diamond</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" size={12} />
            </div>
            {/* Credit Status */}
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={12} />
              <select value={creditFilter} onChange={e => setCreditFilter(e.target.value)}
                className="pl-8 pr-8 py-2 bg-white/50 border border-outline-variant/30 rounded-xl text-[10px] font-label-caps focus:ring-2 focus:ring-primary/10 outline-none transition-all appearance-none cursor-pointer text-primary">
                <option>All Credits</option>
                <option>Good Standing</option><option>Outstanding</option><option>Overdue</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" size={12} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur-md">
              <tr className="border-b border-primary/5 font-label-caps text-[11px] text-outline">
                <th className="px-8 py-5">CLIENT & HEALTH</th>
                <th className="px-6 py-5">CONTACTS</th>
                <th className="px-6 py-5">LIFETIME VALUE</th>
                <th className="px-6 py-5">BALANCE</th>
                <th className="px-6 py-5">CLASSIFICATION</th>
                <th className="px-8 py-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredCustomers.map(customer => {
                const health = customer.customerHealth || 'Growing Client';
                const scoreVal = customer.customerScore || 0;
                const borderHue =
                  scoreVal >= 90 ? 'border-purple-500' :
                  scoreVal >= 75 ? 'border-emerald-500' :
                  scoreVal >= 50 ? 'border-blue-500' : 'border-rose-500';
                const tier = customer.financialTier || 'Regular';
                const lvl  = customer.loyaltyLevel  || 'Bronze';
                return (
                  <tr key={customer._id} className="hover:bg-white/40 transition-colors cursor-pointer" onClick={() => setSelectedCustomer(customer)}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 ${borderHue} shadow-md text-primary font-bold`}>
                          {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-body-md text-sm font-bold text-on-surface">{customer.firstName} {customer.lastName}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${
                            health === 'Elite Client'    ? 'text-purple-600' :
                            health === 'Valuable Client' ? 'text-emerald-600' :
                            health === 'Growing Client'  ? 'text-blue-600' : 'text-rose-600'
                          }`}>{health} ({scoreVal} pts)</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 font-data-tabular text-xs text-on-surface"><Smartphone size={12} className="text-outline" />{customer.phone1}</div>
                        {customer.email && <div className="flex items-center gap-2 font-data-tabular text-[10px] text-outline"><Mail size={12} className="text-outline" />{customer.email}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-data-tabular text-sm font-bold text-primary">{formatCurrency(customer.totalSpent)}</span>
                        <span className="text-[9px] font-label-caps text-outline tracking-wider">{customer.orderCount} Orders</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5">
                        {(customer.debitBalance || 0) > 0 ? (
                          <>
                            <span className="font-data-tabular text-sm text-error font-bold">
                              Owes {formatCurrency(customer.debitBalance || 0)}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-error">
                              DEBIT
                            </span>
                          </>
                        ) : (customer.creditBalance || 0) > 0 ? (
                          <>
                            <span className="font-data-tabular text-sm text-emerald-600 font-bold">
                              {formatCurrency(customer.creditBalance || 0)}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                              STORE CREDIT
                            </span>
                          </>
                        ) : (
                          <span className="font-data-tabular text-sm text-outline opacity-50">
                            No balance
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider w-fit ${
                          tier.toLowerCase() === 'platinum' ? 'bg-purple-900/10 text-purple-700 border border-purple-800/20' :
                          tier.toLowerCase() === 'vip'      ? 'bg-amber-900/10 text-amber-700 border border-amber-800/20' :
                          tier.toLowerCase() === 'premium'  ? 'bg-rose-950/10 text-rose-700 border border-rose-900/20' :
                          'bg-slate-800/10 text-slate-700 border border-slate-700/20'
                        }`}>{tier}</span>
                        <span className="flex items-center gap-1 text-[9px] font-bold text-outline uppercase tracking-wider">
                          <Star size={10} className={
                            lvl.toLowerCase() === 'diamond' ? 'text-cyan-500 fill-cyan-400' :
                            lvl.toLowerCase() === 'gold'    ? 'text-amber-500 fill-amber-400' :
                            lvl.toLowerCase() === 'silver'  ? 'text-slate-400 fill-slate-400' :
                            'text-amber-700 fill-amber-700'
                          } />
                          {lvl}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button className="p-2 hover:bg-primary/10 rounded-full text-outline hover:text-primary transition-colors"><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-5 bg-white/40 flex justify-between items-center border-t border-primary/5">
          <div className="flex items-center gap-4">
            <span className="font-label-caps text-[10px] text-outline">Show rows:</span>
            <select className="bg-transparent font-data-tabular text-xs focus:outline-none"><option>10</option><option>25</option><option>50</option></select>
          </div>
          <div className="flex items-center gap-6">
            <p className="font-label-caps text-[10px] text-outline">Page 1 of 1</p>
            <div className="flex gap-2">
              <button className="p-2 border border-outline-variant/30 rounded-lg hover:bg-white transition-all"><ChevronRight size={16} className="rotate-180" /></button>
              <button className="p-2 border border-outline-variant/30 rounded-lg hover:bg-white transition-all"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Customer Profile Drawer ───────────────────── */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="absolute inset-0 bg-black/20 backdrop-blur-md" />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl h-full bg-surface-container shadow-2xl overflow-y-auto border-l border-white/40 flex flex-col"
            >
              <div className="p-8 pb-12 bg-atelier-gradient relative">
                <button onClick={() => setSelectedCustomer(null)}
                  className="absolute top-6 right-6 p-2 bg-white/40 backdrop-blur-md rounded-full text-primary hover:bg-white transition-all shadow-sm">
                  <X size={20} />
                </button>
                <div className="flex flex-col items-center text-center mt-4">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-2xl mb-4 text-primary font-bold text-3xl">
                    {selectedCustomer.firstName.charAt(0)}{selectedCustomer.lastName.charAt(0)}
                  </div>
                  <h2 className="font-headline-md text-3xl text-primary">{selectedCustomer.firstName} {selectedCustomer.lastName}</h2>
                  <p className="font-label-caps text-xs text-outline mb-4">
                    {selectedCustomer._id} • {(selectedCustomer.financialTier || 'Regular').toUpperCase()} MEMBER
                  </p>
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-2 bg-primary text-on-primary rounded-xl font-label-caps text-[10px] shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                      <ShoppingBag size={14} /> NEW ORDER
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-8 space-y-10">
                {/* Score ring */}
                <section className="flex flex-col items-center justify-center p-6 bg-white/40 rounded-3xl border border-white/60 shadow-inner relative overflow-hidden">
                  <div className="relative flex items-center justify-center w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="50" className="stroke-surface-container-highest" strokeWidth="8" fill="transparent" />
                      <circle cx="64" cy="64" r="50" className="stroke-primary transition-all duration-1000 ease-out" strokeWidth="8" fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - ((selectedCustomer.customerScore || 0) / 100) * circumference}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="font-headline-md text-3xl text-primary font-extrabold">{selectedCustomer.customerScore || 0}</span>
                      <span className="text-[8px] font-label-caps text-outline tracking-wider">SCORE</span>
                    </div>
                  </div>
                  <div className="text-center mt-4">
                    <h5 className="font-headline-sm text-lg text-primary font-bold">{selectedCustomer.customerHealth || 'Growing Client'}</h5>
                    <p className="text-[10px] text-outline max-w-[270px] mt-1 leading-normal">
                      Automated index: LTV (50%) + purchase frequency (30%) + repayment reliability (20%).
                    </p>
                  </div>
                </section>

                {/* Contact info */}
                <section>
                  <div className="flex items-center gap-2 mb-4"><Users size={18} className="text-primary" /><h4 className="font-label-caps text-[11px] text-primary tracking-widest">BASIC INFORMATION</h4></div>
                  <div className="grid grid-cols-2 gap-4 bg-white/40 p-5 rounded-3xl border border-white/60">
                    <div><p className="font-label-caps text-[9px] text-outline mb-1">PRIMARY PHONE</p><p className="font-data-tabular text-sm font-bold">{selectedCustomer.phone1}</p></div>
                    <div><p className="font-label-caps text-[9px] text-outline mb-1">EMAIL</p><p className="font-data-tabular text-sm font-bold text-primary truncate">{selectedCustomer.email || '—'}</p></div>
                    <div className="col-span-2"><p className="font-label-caps text-[9px] text-outline mb-1">CLASSIFICATION</p>
                      <p className="text-sm font-bold">{selectedCustomer.financialTier || 'Regular'} Tier · {selectedCustomer.loyaltyLevel || 'Bronze'} Level</p></div>
                  </div>
                </section>

                {/* Purchase analytics */}
                <section>
                  <div className="flex items-center gap-2 mb-4"><ShoppingBag size={18} className="text-primary" /><h4 className="font-label-caps text-[11px] text-primary tracking-widest">PURCHASE & CREDIT ANALYTICS</h4></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10"><p className="font-label-caps text-[9px] text-primary mb-1">LIFETIME VALUE</p><p className="font-headline-md text-xl text-primary font-bold">{formatCurrency(selectedCustomer.totalSpent)}</p></div>
                    <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/10"><p className="font-label-caps text-[9px] text-secondary mb-1">TOTAL ORDERS</p><p className="font-headline-md text-xl text-secondary font-bold">{selectedCustomer.orderCount} orders</p></div>
                    <div className="bg-tertiary/5 p-4 rounded-2xl border border-tertiary/10"><p className="font-label-caps text-[9px] text-tertiary mb-1">AVG ORDER VALUE</p><p className="font-headline-md text-xl text-tertiary font-bold">{formatCurrency(selectedCustomer.orderCount > 0 ? selectedCustomer.totalSpent / selectedCustomer.orderCount : 0)}</p></div>
                    <div className="bg-outline/5 p-4 rounded-2xl border border-outline/10"><p className="font-label-caps text-[9px] text-outline mb-1">LAST PURCHASE</p><p className="text-lg font-bold mt-1">{selectedCustomer.lastPurchaseDate ? new Date(selectedCustomer.lastPurchaseDate).toLocaleDateString() : 'No Purchases'}</p></div>
                    <div className={`col-span-2 p-4 rounded-2xl border flex justify-between items-center ${
                      (selectedCustomer.debitBalance || 0) > 0 ? 'bg-error/5 border-error/10' : 
                      (selectedCustomer.creditBalance || 0) > 0 ? 'bg-primary/5 border-primary/10' : 
                      'bg-emerald-50 border-emerald-100'
                    }`}>
                      <div>
                        <p className={`font-label-caps text-[9px] mb-1 ${
                          (selectedCustomer.debitBalance || 0) > 0 ? 'text-error' : 
                          (selectedCustomer.creditBalance || 0) > 0 ? 'text-primary' : 
                          'text-emerald-700'
                        }`}>CREDIT STATUS</p>
                        <p className={`font-headline-md text-xl font-bold ${
                          (selectedCustomer.debitBalance || 0) > 0 ? 'text-error' : 
                          (selectedCustomer.creditBalance || 0) > 0 ? 'text-primary' : 
                          'text-emerald-700'
                        }`}>
                          {
                            (selectedCustomer.debitBalance || 0) > 0 ? formatCurrency(selectedCustomer.debitBalance!) : 
                            (selectedCustomer.creditBalance || 0) > 0 ? formatCurrency(selectedCustomer.creditBalance!) : 
                            formatCurrency(0)
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          (selectedCustomer.debitBalance || 0) > 0 ? 'bg-rose-100 text-rose-700' : 
                          (selectedCustomer.creditBalance || 0) > 0 ? 'bg-indigo-100 text-indigo-700' : 
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {
                            (selectedCustomer.debitBalance || 0) > 0 ? 'OUTSTANDING DEBT' : 
                            (selectedCustomer.creditBalance || 0) > 0 ? 'STORE CREDIT' : 
                            'GOOD STANDING'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Notes */}
                <section>
                  <h4 className="font-label-caps text-[11px] text-outline mb-4">CLIENT NOTES</h4>
                  <div className="bg-secondary-fixed/10 p-5 rounded-3xl border border-secondary-fixed-dim/30">
                    <p className="font-body-md text-sm italic text-on-surface-variant leading-relaxed">
                      "{selectedCustomer.notes || 'No boutique preferences recorded.'}"
                    </p>
                  </div>
                </section>
              </div>

              <div className="p-8 border-t border-outline-variant/30 bg-white/20 sticky bottom-0">
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handleOpenEdit(selectedCustomer)}
                    className="py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-xs shadow-xl shadow-primary/20 hover:opacity-90 transition-all">
                    EDIT PROFILE
                  </button>
                  <button onClick={() => handleDelete(selectedCustomer._id)}
                    className="py-4 bg-white border border-error/30 text-error rounded-2xl font-label-caps text-xs hover:bg-error/5 transition-all">
                    DELETE CUSTOMER
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add / Edit Drawer ────────────────────────── */}
      <AnimatePresence>
        {isAddingCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddingCustomer(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-md" />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl h-full bg-surface-container shadow-2xl overflow-y-auto border-l border-white/40 flex flex-col"
            >
              <div className="p-8 pb-12 bg-atelier-gradient relative">
                <button onClick={() => setIsAddingCustomer(false)}
                  className="absolute top-6 right-6 p-2 bg-white/40 backdrop-blur-md rounded-full text-primary hover:bg-white transition-all shadow-sm"><X size={20} /></button>
                <div className="flex flex-col items-center text-center mt-4">
                  <div className="w-20 h-20 bg-white/40 backdrop-blur-md rounded-3xl border-2 border-white flex items-center justify-center text-primary shadow-xl mb-4">
                    <Camera size={32} />
                  </div>
                  <h2 className="font-headline-md text-3xl text-primary uppercase tracking-tight">
                    {editingId ? 'Update Client Profile' : 'New Client Registration'}
                  </h2>
                  <p className="font-label-caps text-[10px] text-outline mt-2 tracking-[0.2em]">BOUTIQUE MEMBER ENROLLMENT</p>
                </div>
              </div>

              <form className="flex-1 p-8 space-y-8" onSubmit={handleSubmit}>
                {/* Personal */}
                <section>
                  <div className="flex items-center gap-2 mb-6"><div className="w-1 h-4 bg-primary rounded-full" /><h4 className="font-label-caps text-[11px] text-primary tracking-widest">PERSONAL IDENTITY</h4></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">FIRST NAME</label>
                      <input type="text" placeholder="e.g. Eleanor" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">LAST NAME</label>
                      <input type="text" placeholder="e.g. Vance" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" required />
                    </div>
                  </div>
                </section>

                {/* Contact */}
                <section>
                  <div className="flex items-center gap-2 mb-6"><div className="w-1 h-4 bg-secondary rounded-full" /><h4 className="font-label-caps text-[11px] text-secondary tracking-widest">CONTACT & REACH</h4></div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">PRIMARY PHONE</label>
                      <div className="relative"><Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
                        <input type="tel" placeholder="+258 (Primary)" value={formData.phone1} onChange={e => setFormData({ ...formData, phone1: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-label-caps text-[9px] text-outline ml-1">SECONDARY PHONE</label>
                        <div className="relative"><Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
                          <input type="tel" placeholder="+258" value={formData.phone2} onChange={e => setFormData({ ...formData, phone2: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-label-caps text-[9px] text-outline ml-1">ALTERNATIVE PHONE</label>
                        <div className="relative"><Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
                          <input type="tel" placeholder="+258" value={formData.phone3} onChange={e => setFormData({ ...formData, phone3: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">EMAIL ADDRESS</label>
                      <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
                        <input type="email" placeholder="client@luxury.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Notes */}
                <section>
                  <div className="flex items-center gap-2 mb-6"><div className="w-1 h-4 bg-outline rounded-full" /><h4 className="font-label-caps text-[11px] text-outline tracking-widest">BOUTIQUE NOTES</h4></div>
                  <textarea rows={4} placeholder="Style preferences, preferred metals, special dates…" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-2xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm resize-none italic" />
                </section>
              </form>

              <div className="p-8 border-t border-outline-variant/30 bg-white/20 sticky bottom-0">
                <div className="flex gap-4">
                  <button onClick={() => setIsAddingCustomer(false)}
                    className="flex-1 py-4 bg-white border border-outline-variant/30 text-outline rounded-2xl font-label-caps text-[11px] hover:bg-surface-variant transition-all uppercase tracking-widest">
                    Discard
                  </button>
                  <button type="submit" onClick={handleSubmit}
                    className="flex-[2] py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                    <Check size={16} /> {editingId ? 'Update Client' : 'Create Client Profile'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
