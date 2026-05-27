'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  MoreVertical,
  Bell,
  Calendar,
  Star,
  Zap,
  ShieldCheck,
  ChevronRight,
  Plus,
  Package,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';

// --- Sub-components ---

const ExecutiveKPI = ({ title, value, trend, icon: Icon, color, subText }: any) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="glass-panel p-6 rounded-3xl border border-white/50 relative overflow-hidden group hover:shadow-2xl transition-all"
  >
    <div className="flex justify-between items-start mb-6">
      <div className={`p-3 rounded-2xl bg-${color}/10 text-${color} shadow-sm`}>
        <Icon size={24} />
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${trend > 0 ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-error-container text-on-error-container'}`}>
        {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(trend)}%
      </div>
    </div>
    <p className="font-label-caps text-[11px] text-outline mb-1 tracking-widest uppercase">{title}</p>
    <h3 className="font-headline-md text-3xl text-primary mb-2">{value}</h3>
    <p className="font-body-md text-xs text-on-surface-variant opacity-70">{subText}</p>

    <div className={`absolute bottom-0 left-0 h-1 w-full bg-${color}/20 group-hover:bg-${color}/40 transition-colors`}></div>
  </motion.div>
);

// --- Main Component ---

export default function Dashboard() {
  const brief = useQuery(api.analytics.getExecutiveBrief);
  const revenueHistory = useQuery(api.analytics.getRevenueByPeriod, { period: 'weekly' });
  const recentTransactions = useQuery(api.transactions.list);
  const lowStock = useQuery(api.products.getLowStock);

  // Formatting helpers
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MZ', { style: 'currency', currency: 'MZN' })
      .format(val)
      .replace('MZN', 'Mt');

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Morning Greeting Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="font-headline-lg text-4xl text-primary mb-2">Morning, Biju Deesse</h1>
          <p className="font-body-lg text-on-surface-variant opacity-80 max-w-xl">
            The <span className="text-primary font-bold">Summer Haute Couture</span> collection is performing 24% above projections. Here is your boutique's daily brief.
          </p>
        </motion.div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="hidden lg:flex flex-col items-end px-6 border-r border-outline-variant/30">
            <span className="font-label-caps text-[10px] text-outline tracking-tighter">ESTIMATED VALUATION</span>
            <span className="font-data-tabular text-xl font-bold text-primary tracking-tight">
              {brief ? formatCurrency(brief.estimatedValuation) : '---'}
            </span>
          </div>
          <button className="flex-1 md:flex-none p-4 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl text-primary hover:bg-white transition-all shadow-sm">
            <Bell size={20} />
          </button>
          <button
            onClick={() => toast.info("New Acquisition stream coming soon to operational intelligence")}
            className="flex-1 md:flex-none px-6 py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus size={18} /> NEW ACQUISITION
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <ExecutiveKPI
          title="TOTAL REVENUE"
          value={brief ? formatCurrency(brief.totalRevenue) : '...'}
          trend={12.5}
          icon={ShoppingBag}
          color="primary"
          subText="Gross revenue across all pieces"
        />
        <ExecutiveKPI
          title="TOTAL PROFIT"
          value={brief ? formatCurrency(brief.totalProfit) : '...'}
          trend={8.2}
          icon={TrendingUp}
          color="secondary"
          subText="Net earnings after costs"
        />
        <ExecutiveKPI
          title="ACTIVE CLIENTS"
          value={brief ? brief.activeClients.toString() : '...'}
          trend={5.4}
          icon={Users}
          color="tertiary"
          subText="Managed within Luxury CRM"
        />
        <ExecutiveKPI
          title="BOUTIQUE REACH"
          value="14.2%"
          trend={-2.1}
          icon={Zap}
          color="primary"
          subText="Local luxury market share"
        />
      </div>

      {/* Central Revenue Command & Category Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 glass-panel p-8 rounded-[2rem] border border-white/50 relative overflow-hidden">
          <div className="flex justify-between items-start mb-10 relative z-10">
            <div>
              <h3 className="font-headline-md text-2xl text-primary">Revenue Command Center</h3>
              <p className="font-label-caps text-[10px] text-outline tracking-widest">WEEKLY PERFORMANCE OVERVIEW</p>
            </div>
          </div>

          <div className="h-80 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueHistory || []}>
                <defs>
                  <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8a4853" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8a4853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e2de" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#857374' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#857374' }} dx={-10} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#8a4853" strokeWidth={4} fillOpacity={1} fill="url(#dashboardRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-[2rem] border border-white/50 flex flex-col items-center text-center">
          <h3 className="font-headline-md text-xl text-primary mb-2">Boutique Inventory</h3>
          <p className="font-label-caps text-[9px] text-outline tracking-widest mb-10">STOCK QUALITY DISTRIBUTION</p>

          <div className="flex-1 w-full flex flex-col justify-center items-center relative">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={brief?.categoryDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(brief?.categoryDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={['#8a4853', '#735c00', '#6e5371', '#857374'][index % 4]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full mt-6">
            {(brief?.categoryDistribution || []).slice(0, 4).map((stat: any) => (
              <div key={stat.name} className="flex flex-col items-center p-3 bg-white/40 rounded-2xl border border-white/60">
                <span className="font-data-tabular text-sm font-bold text-primary">{stat.value}%</span>
                <span className="font-label-caps text-[8px] text-outline truncate">{stat.name.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bento Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Recent Activity Table */}
        <div className="lg:col-span-2 glass-panel rounded-[2rem] border border-white/50 bg-white/20">
          <div className="p-8 border-b border-primary/10 flex justify-between items-center bg-white/40 rounded-t-[2rem]">
            <div>
              <h3 className="font-headline-md text-xl text-primary">Global Activity</h3>
              <p className="font-label-caps text-[9px] text-outline tracking-widest">REAL-TIME TRANSACTION STREAM</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-primary/5 font-label-caps text-[10px] text-primary/70">
                  <th className="px-8 py-4">RECEIPT</th>
                  <th className="px-6 py-4">CASHIER</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-8 py-4 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {(recentTransactions || []).slice(0, 5).map((tx) => (
                  <tr key={tx._id} className="hover:bg-white/40 transition-colors group cursor-pointer">
                    <td className="px-8 py-5 font-data-tabular text-xs font-bold text-primary">{tx.receiptNumber}</td>
                    <td className="px-6 py-5 font-body-md text-sm text-on-surface">{tx.cashierName}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${tx.status === 'Completed' ? 'bg-secondary-container/20 text-secondary' :
                          tx.status === 'Partially Paid' ? 'bg-primary/10 text-primary' :
                            'bg-error-container/20 text-error'
                        }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-data-tabular text-sm font-bold text-right text-primary">{formatCurrency(tx.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-white/40 text-center">
            <button className="font-label-caps text-[10px] text-primary flex items-center gap-2 mx-auto hover:opacity-70 transition-opacity">
              VIEW COMPREHENSIVE HISTORY <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Critical Alerts & Highlights */}
        <div className="space-y-8">
          <div className="glass-panel p-8 rounded-[2rem] border border-error/20 bg-error-container/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-error/10 text-error rounded-xl">
                <AlertCircle size={20} />
              </div>
              <h4 className="font-headline-md text-lg text-primary">Attention Required</h4>
            </div>
            <div className="space-y-4">
              {(lowStock || []).length > 0 ? (
                lowStock!.slice(0, 3).map((item) => (
                  <div key={item._id} className="p-4 bg-white/60 rounded-2xl border border-white shadow-sm flex items-start gap-4">
                    <Package className="text-error mt-1" size={18} />
                    <div>
                      <p className="font-label-caps text-[10px] text-on-surface font-bold uppercase">CRITICAL STOCK: {item.name}</p>
                      <p className="font-body-md text-xs text-error">Only {item.stock} units remaining in inventory.</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-white/60 rounded-2xl border border-white shadow-sm flex items-start gap-4 opacity-60">
                  <ShieldCheck className="text-secondary mt-1" size={18} />
                  <div>
                    <p className="font-label-caps text-[10px] text-on-surface font-bold">ALL SYSTEMS CLEAR</p>
                    <p className="font-body-md text-xs text-on-surface-variant">Inventory levels healthy across all ateliers.</p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-white/60 rounded-2xl border border-white shadow-sm flex items-start gap-4">
                <ShieldCheck className="text-secondary mt-1" size={18} />
                <div>
                  <p className="font-label-caps text-[10px] text-on-surface font-bold">INSURANCE RENEWAL</p>
                  <p className="font-body-md text-xs text-on-surface-variant">Vault insurance expires in 12 days.</p>
                </div>
              </div>
            </div>
            <button className="w-full mt-6 py-4 bg-white border border-error/20 text-error rounded-2xl font-label-caps text-[10px] hover:bg-error/5 transition-all">
              VIEW INVENTORY CONTROL
            </button>
          </div>


        </div>
      </div>
    </div>
  );
}

