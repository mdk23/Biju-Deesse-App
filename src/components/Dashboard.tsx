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

// --- Mock Data ---

const PERFORMANCE_DATA = [
  { name: 'Mon', revenue: 420000, orders: 12 },
  { name: 'Tue', revenue: 380000, orders: 8 },
  { name: 'Wed', revenue: 510000, orders: 15 },
  { name: 'Thu', revenue: 440000, orders: 10 },
  { name: 'Fri', revenue: 620000, orders: 22 },
  { name: 'Sat', revenue: 850000, orders: 34 },
  { name: 'Sun', revenue: 710000, orders: 28 },
];

const CATEGORY_STATS = [
  { name: 'High-End', value: 72, color: '#8a4853' },
  { name: 'Bespoke', value: 18, color: '#735c00' },
  { name: 'Limited', value: 10, color: '#6e5371' },
];

const RECENT_TRANSACTIONS = [
  { id: '#AT-92841', client: 'Eleanor Vance', collection: 'Celestial Aura', status: 'Shipped', amount: '12.4M Mt', date: 'Just now' },
  { id: '#AT-92842', client: 'Julian Rossi', collection: 'Timeless Gold', status: 'Pending', amount: '4.9M Mt', date: '2 mins ago' },
  { id: '#AT-92843', client: 'Sarah Jenkins', collection: 'Arctic Frost', status: 'Shipped', amount: '24.1M Mt', date: '15 mins ago' },
  { id: '#AT-92844', client: 'Marcus Thorne', collection: 'Bespoke Diamond', status: 'Processing', amount: '8.2M Mt', date: '1 hour ago' },
];

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
            <span className="font-data-tabular text-xl font-bold text-primary tracking-tight">4.281.900 Mt</span>
          </div>
          <button className="flex-1 md:flex-none p-4 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl text-primary hover:bg-white transition-all shadow-sm">
            <Bell size={20} />
          </button>
          <button className="flex-1 md:flex-none px-6 py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
            <Plus size={18} /> NEW ACQUISITION
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <ExecutiveKPI 
          title="TOTAL SALES" 
          value="1.284.000 Mt" 
          trend={12.5} 
          icon={ShoppingBag} 
          color="primary"
          subText="Units moved this quarter: 142"
        />
        <ExecutiveKPI 
          title="QUARTERLY REVENUE" 
          value="32.8M Mt" 
          trend={8.2} 
          icon={TrendingUp} 
          color="secondary"
          subText="Avg transaction: 1.870.000 Mt"
        />
        <ExecutiveKPI 
          title="ACTIVE CLIENTS" 
          value="842" 
          trend={5.4} 
          icon={Users} 
          color="tertiary"
          subText="Retained 72% of VIP tier"
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
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white/40 border border-white/60 rounded-xl font-label-caps text-[10px] text-primary">DOWNLOAD REPORT</button>
              <select className="bg-white/40 border border-white/60 rounded-xl font-label-caps text-[10px] text-primary px-3 outline-none">
                <option>WEEKLY</option>
                <option>MONTHLY</option>
              </select>
            </div>
          </div>
          
          <div className="h-80 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PERFORMANCE_DATA}>
                <defs>
                  <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8a4853" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8a4853" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e2de" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#857374'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#857374'}} dx={-10} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#8a4853" strokeWidth={4} fillOpacity={1} fill="url(#dashboardRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Subtle Background Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        </div>

        <div className="glass-panel p-8 rounded-[2rem] border border-white/50 flex flex-col items-center text-center">
          <h3 className="font-headline-md text-xl text-primary mb-2">Boutique Inventory</h3>
          <p className="font-label-caps text-[9px] text-outline tracking-widest mb-10">STOCK QUALITY DISTRIBUTION</p>
          
          <div className="flex-1 w-full flex flex-col justify-center items-center relative">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={CATEGORY_STATS}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {CATEGORY_STATS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="font-headline-lg text-4xl text-primary">72%</span>
              <span className="font-label-caps text-[10px] text-outline">ULTRA-LUXE</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 w-full mt-6">
            {CATEGORY_STATS.map((stat) => (
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
        <div className="lg:col-span-2 glass-panel rounded-[2rem] overflow-hidden border border-white/50 bg-white/20">
          <div className="p-8 border-b border-primary/10 flex justify-between items-center bg-white/40">
            <div>
              <h3 className="font-headline-md text-xl text-primary">Global Activity</h3>
              <p className="font-label-caps text-[9px] text-outline tracking-widest">REAL-TIME TRANSACTION STREAM</p>
            </div>
            <button className="p-3 bg-white/40 rounded-xl text-primary hover:bg-white transition-all shadow-sm">
              <Calendar size={18} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-primary/5 font-label-caps text-[10px] text-primary/70">
                  <th className="px-8 py-4">ORDER ID</th>
                  <th className="px-6 py-4">CLIENT</th>
                  <th className="px-6 py-4">COLLECTION</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-8 py-4 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {RECENT_TRANSACTIONS.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/40 transition-colors group cursor-pointer">
                    <td className="px-8 py-5 font-data-tabular text-xs font-bold text-primary">{tx.id}</td>
                    <td className="px-6 py-5 font-body-md text-sm text-on-surface">{tx.client}</td>
                    <td className="px-6 py-5 font-label-caps text-[10px] text-on-surface-variant opacity-70">{tx.collection}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        tx.status === 'Shipped' ? 'bg-secondary-container/20 text-secondary' : 'bg-primary/10 text-primary'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-data-tabular text-sm font-bold text-right text-primary">{tx.amount}</td>
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
              <div className="p-4 bg-white/60 rounded-2xl border border-white shadow-sm flex items-start gap-4">
                <Package className="text-outline mt-1" size={18} />
                <div>
                  <p className="font-label-caps text-[10px] text-on-surface font-bold">CRITICAL STOCK: SOLITAIRE ETERNITY</p>
                  <p className="font-body-md text-xs text-error">Only 2 units remaining in Main Atelier.</p>
                </div>
              </div>
              <div className="p-4 bg-white/60 rounded-2xl border border-white shadow-sm flex items-start gap-4">
                <ShieldCheck className="text-outline mt-1" size={18} />
                <div>
                  <p className="font-label-caps text-[10px] text-on-surface font-bold">INSURANCE RENEWAL</p>
                  <p className="font-body-md text-xs text-on-surface-variant">Vault insurance expires in 12 days.</p>
                </div>
              </div>
            </div>
            <button className="w-full mt-6 py-4 bg-white border border-error/20 text-error rounded-2xl font-label-caps text-[10px] hover:bg-error/5 transition-all">
              RESOLVE ALL ALERTS
            </button>
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border border-secondary/20 bg-secondary-container/5 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Star className="text-secondary" size={20} />
                <h4 className="font-headline-md text-lg text-primary">Elite Highlight</h4>
              </div>
              <p className="font-body-md text-sm text-on-surface-variant mb-6">
                Client <span className="font-bold text-primary">Isabel dos Santos</span> has reached Platinum status. Prepare invitation for the Autumn Gala.
              </p>
              <button className="flex items-center gap-2 text-primary font-label-caps text-[10px] font-bold group">
                SEND INVITATION <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

