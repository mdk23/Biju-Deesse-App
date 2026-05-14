'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Bell, 
  Download, 
  Filter, 
  MoreVertical, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  CreditCard, 
  Clock, 
  ChevronRight, 
  X, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Printer,
  Mail,
  Receipt,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
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
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Interfaces ---

interface SaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  photo: string;
}

interface Transaction {
  id: string;
  customerName: string;
  customerTier: 'VIP' | 'Premium' | 'Regular';
  date: string;
  time: string;
  items: SaleItem[];
  totalAmount: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Pending' | 'Refunded';
  paymentMethod: 'Card' | 'M-Pesa' | 'Cash' | 'Bank Transfer';
  invoiceUrl: string;
}

// --- Mock Data ---

const REVENUE_DATA = [
  { name: 'Jan', value: 1200000 },
  { name: 'Feb', value: 1500000 },
  { name: 'Mar', value: 1100000 },
  { name: 'Apr', value: 1800000 },
  { name: 'May', value: 2400000 },
  { name: 'Jun', value: 2100000 },
  { name: 'Jul', value: 2800000 },
];

const CATEGORY_DATA = [
  { name: 'Rings', value: 40 },
  { name: 'Watches', value: 30 },
  { name: 'Necklaces', value: 20 },
  { name: 'Earrings', value: 10 },
];

const MOCK_SALES: Transaction[] = [
  {
    id: 'INV-88291',
    customerName: 'Isabel dos Santos',
    customerTier: 'VIP',
    date: '2023-10-12',
    time: '14:22',
    items: [
      { id: 'ITM-001', name: 'Solitaire Eternity Ring', price: 12400, quantity: 1, photo: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=100' },
      { id: 'ITM-005', name: 'Diamond Drop Earrings', price: 7200, quantity: 2, photo: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=100' }
    ],
    totalAmount: 1240000,
    balance: 0,
    status: 'Paid',
    paymentMethod: 'Card',
    invoiceUrl: '#'
  },
  {
    id: 'INV-88292',
    customerName: 'Fernando Moma',
    customerTier: 'Premium',
    date: '2023-10-11',
    time: '10:45',
    items: [
      { id: 'ITM-004', name: 'Vintage Chronograph', price: 18500, quantity: 1, photo: 'https://images.unsplash.com/photo-1524592091214-8c97afad3d3a?auto=format&fit=crop&q=80&w=100' }
    ],
    totalAmount: 1200000,
    balance: 400000,
    status: 'Partial',
    paymentMethod: 'M-Pesa',
    invoiceUrl: '#'
  },
  {
    id: 'INV-88293',
    customerName: 'Teresa Amaro',
    customerTier: 'Regular',
    date: '2023-10-10',
    time: '16:30',
    items: [
      { id: 'ITM-003', name: 'Arctic Frost Necklace', price: 24100, quantity: 1, photo: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=100' }
    ],
    totalAmount: 185000,
    balance: 185000,
    status: 'Pending',
    paymentMethod: 'Cash',
    invoiceUrl: '#'
  }
];

// --- Sub-components ---

const KPIStats = ({ title, value, trend, icon: Icon, color, sparklineData }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-panel p-6 rounded-2xl border border-white/50 relative overflow-hidden group hover:shadow-2xl transition-all"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}>
        <Icon size={20} />
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-error-container text-on-error-container'}`}>
        {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
        {Math.abs(trend)}%
      </div>
    </div>
    <p className="font-label-caps text-[10px] text-outline mb-1">{title}</p>
    <h3 className="font-headline-md text-2xl text-primary">{value}</h3>
    
    <div className="mt-4 h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sparklineData}>
          <Area type="monotone" dataKey="value" stroke={color === 'primary' ? '#8a4853' : color === 'secondary' ? '#735c00' : '#6e5371'} fill="transparent" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

// --- Main Component ---

export default function Sales() {
  const [selectedSale, setSelectedSale] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const filteredSales = useMemo(() => {
    return MOCK_SALES.filter(s => {
      const matchesSearch = s.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All Status' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const COLORS = ['#8a4853', '#735c00', '#6e5371', '#d7c1c3'];

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header & Actions */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="font-headline-lg text-4xl text-primary mb-2">Sales Analytics</h1>
          <p className="font-body-md text-on-surface-variant max-w-xl">
            Real-time revenue tracking, transaction management, and boutique performance metrics.
          </p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-6 py-3 bg-white/40 backdrop-blur-md border border-primary/20 text-primary rounded-2xl font-label-caps text-[11px] hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center gap-2">
            <Download size={16} /> EXPORT REPORT
          </button>
          <button className="flex-1 md:flex-none px-6 py-3 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <Plus size={16} /> NEW SALE
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        <KPIStats 
          title="REVENUE TODAY" 
          value="1.240.000 Mt" 
          trend={12.5} 
          icon={DollarSign} 
          color="primary" 
          sparklineData={[{value: 10}, {value: 30}, {value: 20}, {value: 40}, {value: 35}, {value: 50}]}
        />
        <KPIStats 
          title="MONTHLY SALES" 
          value="32.8M Mt" 
          trend={8.2} 
          icon={TrendingUp} 
          color="secondary" 
          sparklineData={[{value: 20}, {value: 15}, {value: 35}, {value: 25}, {value: 45}, {value: 40}]}
        />
        <KPIStats 
          title="NET PROFIT" 
          value="415.000 Mt" 
          trend={2.1} 
          icon={CreditCard} 
          color="tertiary" 
          sparklineData={[{value: 30}, {value: 40}, {value: 35}, {value: 50}, {value: 45}, {value: 55}]}
        />
        <KPIStats 
          title="AVG ORDER VALUE" 
          value="85.400 Mt" 
          trend={-1.4} 
          icon={ShoppingBag} 
          color="primary" 
          sparklineData={[{value: 40}, {value: 35}, {value: 30}, {value: 25}, {value: 20}, {value: 15}]}
        />
        <KPIStats 
          title="CONVERSION" 
          value="14.2%" 
          trend={5.8} 
          icon={BarChart3} 
          color="secondary" 
          sparklineData={[{value: 10}, {value: 20}, {value: 15}, {value: 25}, {value: 30}, {value: 40}]}
        />
      </div>

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border border-white/50">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="font-headline-md text-xl text-primary">Revenue Trends</h3>
              <p className="font-label-caps text-[9px] text-outline tracking-widest">MONTHLY FISCAL PERFORMANCE</p>
            </div>
            <div className="flex items-center gap-2 bg-white/40 p-1 rounded-xl border border-white/60">
              <button className="px-3 py-1.5 bg-primary text-on-primary rounded-lg font-label-caps text-[9px]">YEARLY</button>
              <button className="px-3 py-1.5 font-label-caps text-[9px] text-primary">QUARTERLY</button>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1" >
                    <stop offset="5%" stopColor="#8a4853" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8a4853" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e2de" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#857374'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#857374'}} dx={-10} tickFormatter={(val) => `${val/1000000}M`} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Area type="monotone" dataKey="value" stroke="#8a4853" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-white/50 flex flex-col">
          <h3 className="font-headline-md text-xl text-primary mb-2">Category Performance</h3>
          <p className="font-label-caps text-[9px] text-outline tracking-widest mb-10">SALES DISTRIBUTION</p>
          <div className="flex-1 flex flex-col justify-center items-center relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {CATEGORY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="font-headline-md text-3xl text-primary">40%</span>
              <span className="font-label-caps text-[9px] text-outline">DIAMONDS</span>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {CATEGORY_DATA.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[i]}}></div>
                <span className="font-label-caps text-[10px] text-on-surface-variant">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <section className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/50 bg-white/20">
        <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-primary/10 bg-white/40">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <h4 className="font-headline-md text-xl text-primary">Transactions</h4>
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
              <input 
                type="text" 
                placeholder="Search Invoice # or Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-primary/10 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={14} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-outline-variant/30 rounded-xl text-[11px] font-label-caps focus:ring-2 focus:ring-primary/10 outline-none transition-all appearance-none"
              >
                <option>All Status</option>
                <option>Paid</option>
                <option>Partial</option>
                <option>Pending</option>
                <option>Refunded</option>
              </select>
            </div>
            <button className="p-2 border border-outline-variant/30 rounded-xl hover:bg-white transition-all text-outline">
              <Calendar size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-primary/5 border-b border-primary/10 font-label-caps text-[11px] text-primary">
                <th className="px-8 py-5">INVOICE NO.</th>
                <th className="px-6 py-5">CUSTOMER</th>
                <th className="px-6 py-5">ITEMS</th>
                <th className="px-6 py-5">TOTAL AMOUNT</th>
                <th className="px-6 py-5">BALANCE</th>
                <th className="px-6 py-5">STATUS</th>
                <th className="px-6 py-5">METHOD</th>
                <th className="px-8 py-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredSales.map((sale) => (
                <tr 
                  key={sale.id} 
                  className="hover:bg-white/40 transition-colors group cursor-pointer"
                  onClick={() => setSelectedSale(sale)}
                >
                  <td className="px-8 py-5 font-data-tabular text-sm font-bold text-primary">
                    {sale.id}
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-body-md text-sm font-bold text-on-surface">{sale.customerName}</p>
                      <p className="font-label-caps text-[9px] text-outline tracking-widest">{sale.customerTier}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex -space-x-3">
                      {sale.items.map((item, i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-sm bg-surface-container">
                          <img src={item.photo} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {sale.items.length > 2 && (
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-surface-variant flex items-center justify-center text-[10px] font-bold text-outline shadow-sm">
                          +{sale.items.length - 2}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 font-data-tabular text-sm font-bold">
                    {(sale.totalAmount).toLocaleString()} Mt
                  </td>
                  <td className="px-6 py-5">
                    <span className={`font-data-tabular text-sm ${sale.balance > 0 ? 'text-error' : 'text-outline opacity-40'}`}>
                      {sale.balance > 0 ? `${(sale.balance).toLocaleString()} Mt` : '0 Mt'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      sale.status === 'Paid' ? 'bg-secondary-container/20 text-secondary' :
                      sale.status === 'Partial' ? 'bg-primary/10 text-primary' :
                      sale.status === 'Refunded' ? 'bg-outline/20 text-outline' :
                      'bg-error-container/20 text-error'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 font-label-caps text-[10px] text-on-surface-variant">
                      <CreditCard size={12} className="text-outline" /> {sale.paymentMethod}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 hover:bg-primary/10 rounded-full text-outline transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Transaction Detail Drawer */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSale(null)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl h-full bg-surface-container shadow-2xl flex flex-col border-l border-white/40"
            >
              {/* Drawer Header */}
              <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start bg-white/40 backdrop-blur-md">
                <div>
                  <h2 className="font-headline-md text-2xl text-primary">{selectedSale.id}</h2>
                  <p className="font-label-caps text-[10px] text-outline tracking-widest mt-1">
                    TRANSACTION COMPLETED ON {selectedSale.date} AT {selectedSale.time}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                      selectedSale.status === 'Paid' ? 'bg-secondary-container/20 text-secondary' : 'bg-primary/10 text-primary'
                    }`}>
                      {selectedSale.status.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-surface-container-highest text-outline text-[9px] font-bold">
                      {selectedSale.paymentMethod.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="p-2 hover:bg-primary/5 rounded-full text-outline transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                {/* Customer Section */}
                <section>
                  <h4 className="font-label-caps text-[11px] text-outline mb-4">CUSTOMER INSIGHT</h4>
                  <div className="bg-atelier-gradient p-6 rounded-3xl border border-primary/10 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-primary font-bold text-xl">
                      {selectedSale.customerName[0]}
                    </div>
                    <div>
                      <p className="font-headline-md text-lg text-primary">{selectedSale.customerName}</p>
                      <p className="font-label-caps text-[10px] text-primary/70">{selectedSale.customerTier} CLIENT • PREVIOUS PURCHASES: 12</p>
                    </div>
                  </div>
                </section>

                {/* Line Items */}
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-label-caps text-[11px] text-outline">LINE ITEMS</h4>
                    <span className="font-label-caps text-[11px] text-primary">{selectedSale.items.length} ITEMS</span>
                  </div>
                  <div className="space-y-4">
                    {selectedSale.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-white/40 rounded-2xl border border-white/60">
                        <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md">
                          <img src={item.photo} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="font-body-md text-sm font-bold text-on-surface">{item.name}</p>
                          <p className="font-data-tabular text-xs text-outline">{(item.price).toLocaleString()} Mt × {item.quantity}</p>
                        </div>
                        <p className="font-data-tabular text-sm font-bold text-primary">
                          {(item.price * item.quantity).toLocaleString()} Mt
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Financial Breakdown */}
                <section>
                  <h4 className="font-label-caps text-[11px] text-outline mb-4">PAYMENT BREAKDOWN</h4>
                  <div className="bg-surface-container-highest p-6 rounded-3xl space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant font-body-md">Subtotal</span>
                      <span className="font-data-tabular font-bold">{(selectedSale.totalAmount).toLocaleString()} Mt</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant font-body-md">Luxury Tax (10%)</span>
                      <span className="font-data-tabular">0 Mt (Incl.)</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-outline-variant/30 pt-3">
                      <span className="text-on-surface font-bold font-headline-md">Total</span>
                      <span className="font-data-tabular font-bold text-xl text-primary">{(selectedSale.totalAmount).toLocaleString()} Mt</span>
                    </div>
                    {selectedSale.balance > 0 && (
                      <div className="flex justify-between text-sm bg-error/5 p-3 rounded-xl mt-4">
                        <span className="text-error font-bold flex items-center gap-1"><AlertCircle size={14} /> Outstanding Balance</span>
                        <span className="font-data-tabular font-bold text-error">{(selectedSale.balance).toLocaleString()} Mt</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Logistics */}
                <section className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/40 border border-white/60 rounded-2xl">
                    <p className="font-label-caps text-[9px] text-outline mb-1">FULFILLMENT</p>
                    <div className="flex items-center gap-2 text-secondary font-bold text-xs">
                      <CheckCircle2 size={14} /> ATELIER PICKUP
                    </div>
                  </div>
                  <div className="p-4 bg-white/40 border border-white/60 rounded-2xl">
                    <p className="font-label-caps text-[9px] text-outline mb-1">CERTIFICATE</p>
                    <div className="flex items-center gap-2 text-primary font-bold text-xs">
                      <FileText size={14} /> GIA ISSUED
                    </div>
                  </div>
                </section>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-8 border-t border-outline-variant/30 bg-white/40 backdrop-blur-md sticky bottom-0">
                <div className="grid grid-cols-3 gap-3">
                  <button className="flex flex-col items-center gap-2 p-3 bg-white border border-outline-variant/30 rounded-2xl text-primary hover:bg-primary/5 transition-all">
                    <Printer size={18} />
                    <span className="font-label-caps text-[8px]">PRINT</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-3 bg-white border border-outline-variant/30 rounded-2xl text-primary hover:bg-primary/5 transition-all">
                    <Mail size={18} />
                    <span className="font-label-caps text-[8px]">EMAIL</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-3 bg-white border border-outline-variant/30 rounded-2xl text-error hover:bg-error/5 transition-all">
                    <RotateCcw size={18} />
                    <span className="font-label-caps text-[8px]">REFUND</span>
                  </button>
                </div>
                <button className="w-full mt-4 py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-xs shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  <Receipt size={18} /> SEND DIGITAL RECEIPT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

