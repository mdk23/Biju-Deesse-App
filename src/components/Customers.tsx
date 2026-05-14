'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Bell, 
  Download, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Send, 
  FileText, 
  AlertCircle,
  TrendingUp,
  Users,
  CreditCard,
  DollarSign,
  ChevronRight,
  X,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  Star,
  ChevronDown,
  ArrowUpDown,
  Mail,
  Smartphone
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Interfaces ---

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  phone1: string;
  phone2: string;
  address: string;
  email: string;
  totalPurchases: number;
  orderCount: number;
  avgOrderValue: number;
  outstandingBalance: number;
  lastPurchaseDate: string;
  customerSince: string;
  status: 'VIP' | 'Premium' | 'Regular' | 'At Risk';
  notes: string;
  favoriteProducts: string[];
  mostPurchasedCategory: string;
}

// --- Mock Data ---

const SPARKLINE_DATA = [
  { value: 10 }, { value: 25 }, { value: 15 }, { value: 30 }, { value: 20 }, { value: 45 }, { value: 40 }
];

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'CST-2941',
    firstName: 'Isabel',
    lastName: 'dos Santos',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
    phone1: '+258 84 123 4567',
    phone2: '+258 21 456 789',
    address: 'Av. Julius Nyerere, Maputo',
    email: 'isabel.s@luxmail.com',
    totalPurchases: 14800000,
    orderCount: 42,
    avgOrderValue: 352380,
    outstandingBalance: 0,
    lastPurchaseDate: '2023-10-12',
    customerSince: '2021-05-20',
    status: 'VIP',
    notes: 'Prefers 18K Rose Gold. Top tier client, always invite to private launches.',
    favoriteProducts: ['Solitaire Eternity Ring', 'Celestial Aura Earrings'],
    mostPurchasedCategory: 'Rings'
  },
  {
    id: 'CST-2942',
    firstName: 'Fernando',
    lastName: 'Moma',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100',
    phone1: '+258 82 987 6543',
    phone2: '',
    address: 'Matola A, Rua das Acácias',
    email: 'f.moma@corporatenet.mz',
    totalPurchases: 9200000,
    orderCount: 18,
    avgOrderValue: 511111,
    outstandingBalance: 400000,
    lastPurchaseDate: '2023-10-11',
    customerSince: '2022-03-15',
    status: 'Premium',
    notes: 'Collector of vintage watches. High-value transactions.',
    favoriteProducts: ['Vintage Chronograph', 'Leather Watch Case'],
    mostPurchasedCategory: 'Watches'
  },
  {
    id: 'CST-2943',
    firstName: 'Teresa',
    lastName: 'Amaro',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100',
    phone1: '+258 84 333 9999',
    phone2: '+258 87 222 1111',
    address: 'Sommerschield II, Maputo',
    email: 't.amaro@fashionmz.com',
    totalPurchases: 7100000,
    orderCount: 25,
    avgOrderValue: 284000,
    outstandingBalance: 185000,
    lastPurchaseDate: '2023-10-10',
    customerSince: '2022-06-12',
    status: 'Regular',
    notes: 'Loves Arctic Frost collection. Frequently buys gifts.',
    favoriteProducts: ['Arctic Frost Necklace', 'Silver Pendants'],
    mostPurchasedCategory: 'Necklaces'
  },
  {
    id: 'CST-2944',
    firstName: 'Marcus',
    lastName: 'Thorne',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100',
    phone1: '+258 85 000 1122',
    phone2: '',
    address: 'Polana Caniço, Maputo',
    email: 'marcus.thorne@globalbiz.com',
    totalPurchases: 1240000,
    orderCount: 5,
    avgOrderValue: 248000,
    outstandingBalance: 0,
    lastPurchaseDate: '2023-09-25',
    customerSince: '2023-01-10',
    status: 'At Risk',
    notes: 'Last purchase was 3 months ago. Needs re-engagement.',
    favoriteProducts: ['Gold Cufflinks', 'Signet Ring'],
    mostPurchasedCategory: 'Accessories'
  }
];

// --- Sub-components ---

const KPICard = ({ title, value, subValue, trend, icon: Icon, color, data }: any) => (
  <motion.div 
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="glass-panel p-6 rounded-2xl relative overflow-hidden group border border-white/50 hover:shadow-2xl hover:shadow-primary/5 transition-all"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}>
        <Icon size={20} />
      </div>
      {trend && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center ${trend > 0 ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-error-container text-on-error-container'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    
    <p className="font-label-caps text-[10px] text-outline mb-1">{title}</p>
    <h3 className="font-headline-md text-2xl text-primary mb-1">{value}</h3>
    <p className="font-body-md text-xs text-on-surface-variant opacity-70 mb-4">{subValue}</p>

    <div className="h-12 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data || SPARKLINE_DATA}>
          <defs>
            <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color === 'primary' ? '#8a4853' : color === 'secondary' ? '#735c00' : '#6e5371'} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color === 'primary' ? '#8a4853' : color === 'secondary' ? '#735c00' : '#6e5371'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color === 'primary' ? '#8a4853' : color === 'secondary' ? '#735c00' : '#6e5371'} 
            fill={`url(#grad-${color})`} 
            strokeWidth={2} 
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

// --- Main Component ---

export default function Customers() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sortBy, setSortBy] = useState('name');

  const filteredCustomers = useMemo(() => {
    return MOCK_CUSTOMERS.filter(c => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || 
                           c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           c.phone1.includes(searchQuery);
      const matchesStatus = statusFilter === 'All Status' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Top Navbar Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="relative group flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search clients, phones, IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
            />
          </div>
          <button className="p-3 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl text-primary hover:bg-primary/5 transition-all shadow-sm relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="hidden sm:flex items-center gap-2 bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/60 shadow-sm">
            <button className="px-4 py-2 font-label-caps text-[10px] text-primary hover:bg-primary/5 rounded-xl transition-all">LAST 30 DAYS</button>
            <Calendar size={14} className="text-outline mr-2" />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap">
            <UserPlus size={16} /> ADD CLIENT
          </button>
          <button className="p-3 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl text-primary hover:bg-primary/5 transition-all shadow-sm">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="flex flex-wrap gap-3 mb-10">
        {[
          { label: 'SEND PROMOTION', icon: Send },
          { label: 'EXPORT CUSTOMERS', icon: FileText },
          { label: 'VIEW DEBTORS', icon: AlertCircle },
          { label: 'LOYALTY PROGRAM', icon: Star },
        ].map((action, i) => (
          <button key={i} className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md border border-outline-variant/30 text-on-surface-variant rounded-xl font-label-caps text-[10px] hover:bg-primary/5 hover:text-primary transition-all group">
            <action.icon size={14} className="group-hover:scale-110 transition-transform" />
            {action.label}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
        <KPICard 
          title="TOTAL CUSTOMERS" 
          value="1,284" 
          subValue="Active boutique database"
          trend={12.5}
          icon={Users}
          color="primary"
        />
        <KPICard 
          title="NEW THIS MONTH" 
          value="48" 
          subValue="Growth of 4.2%"
          trend={8.2}
          icon={UserPlus}
          color="secondary"
        />
        <KPICard 
          title="RETURNING" 
          value="72.4%" 
          subValue="Customer loyalty index"
          trend={2.1}
          icon={TrendingUp}
          color="tertiary"
        />
        <KPICard 
          title="OUTSTANDING" 
          value="585.000 Mt" 
          subValue="Credits pending payment"
          trend={-5.4}
          icon={CreditCard}
          color="error"
        />
        <KPICard 
          title="AVG CUSTOMER SPEND" 
          value="312.400 Mt" 
          subValue="Lifetime value average"
          trend={15.8}
          icon={DollarSign}
          color="primary"
        />
      </div>

      {/* Filters & Table Section */}
      <section className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/50 bg-white/20">
        <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-primary/10 bg-white/40">
          <div className="flex items-center gap-4">
            <h4 className="font-headline-md text-xl text-primary">Customer Directory</h4>
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
              {filteredCustomers.length} CLIENTS
            </span>
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
                <option>VIP</option>
                <option>Premium</option>
                <option>Regular</option>
                <option>At Risk</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" size={14} />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/30 rounded-xl font-label-caps text-[11px] hover:bg-surface-variant transition-all">
              <ArrowUpDown size={14} /> SORT BY
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur-md">
              <tr className="border-b border-primary/5 font-label-caps text-[11px] text-outline">
                <th className="px-8 py-5">CLIENT</th>
                <th className="px-6 py-5">CONTACTS</th>
                <th className="px-6 py-5">ADDRESS</th>
                <th className="px-6 py-5">PURCHASES</th>
                <th className="px-6 py-5">ORDERS</th>
                <th className="px-6 py-5">OUTSTANDING</th>
                <th className="px-6 py-5">STATUS</th>
                <th className="px-8 py-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredCustomers.map((customer) => (
                <motion.tr 
                  layoutId={customer.id}
                  key={customer.id} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-white/40 transition-colors group cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md group-hover:scale-110 transition-transform">
                        <img src={customer.avatar} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-body-md text-sm font-bold text-on-surface">{customer.firstName} {customer.lastName}</p>
                        <p className="font-data-tabular text-[10px] text-outline">{customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 font-data-tabular text-xs text-on-surface">
                        <Smartphone size={12} className="text-outline" /> {customer.phone1}
                      </div>
                      <div className="flex items-center gap-2 font-data-tabular text-[10px] text-outline">
                        <Mail size={12} className="text-outline" /> {customer.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-body-md text-xs text-on-surface-variant max-w-[150px] truncate">
                      {customer.address}
                    </p>
                  </td>
                  <td className="px-6 py-5 font-data-tabular text-sm font-bold text-primary">
                    {(customer.totalPurchases).toLocaleString()} Mt
                  </td>
                  <td className="px-6 py-5 font-data-tabular text-sm">
                    {customer.orderCount}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`font-data-tabular text-sm ${customer.outstandingBalance > 0 ? 'text-error font-bold' : 'text-outline opacity-50'}`}>
                      {customer.outstandingBalance > 0 ? `${(customer.outstandingBalance).toLocaleString()} Mt` : 'No balance'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      customer.status === 'VIP' ? 'bg-primary text-on-primary' :
                      customer.status === 'Premium' ? 'bg-secondary-container text-on-secondary-container' :
                      customer.status === 'Regular' ? 'bg-tertiary-container/30 text-on-tertiary-container' :
                      'bg-error-container text-on-error-container'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 hover:bg-primary/10 rounded-full text-outline hover:text-primary transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-8 py-5 bg-white/40 flex justify-between items-center border-t border-primary/5">
          <div className="flex items-center gap-4">
            <span className="font-label-caps text-[10px] text-outline">Show rows:</span>
            <select className="bg-transparent font-data-tabular text-xs focus:outline-none">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
          </div>
          <div className="flex items-center gap-6">
            <p className="font-label-caps text-[10px] text-outline">Page 1 of 12</p>
            <div className="flex gap-2">
              <button className="p-2 border border-outline-variant/30 rounded-lg hover:bg-white transition-all disabled:opacity-30"><ChevronRight size={16} className="rotate-180" /></button>
              <button className="p-2 border border-outline-variant/30 rounded-lg hover:bg-white transition-all"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Profile Drawer */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="absolute inset-0 bg-black/20 backdrop-blur-md"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl h-full bg-surface-container shadow-2xl overflow-y-auto border-l border-white/40 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-8 pb-12 bg-atelier-gradient relative">
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="absolute top-6 right-6 p-2 bg-white/40 backdrop-blur-md rounded-full text-primary hover:bg-white transition-all shadow-sm"
                >
                  <X size={20} />
                </button>
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-2xl mb-4 relative group">
                    <img src={selectedCustomer.avatar} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <Plus className="text-white" size={24} />
                    </div>
                  </div>
                  <h2 className="font-headline-md text-3xl text-primary">{selectedCustomer.firstName} {selectedCustomer.lastName}</h2>
                  <p className="font-label-caps text-xs text-outline mb-4">{selectedCustomer.id} • PLATINUM MEMBER</p>
                  
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-2 bg-primary text-on-primary rounded-xl font-label-caps text-[10px] shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                      <ShoppingBag size={14} /> NEW ORDER
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2 bg-white border border-outline-variant/30 text-primary rounded-xl font-label-caps text-[10px] hover:bg-surface-variant transition-all">
                      <Send size={14} /> MESSAGE
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 p-8 space-y-10">
                {/* Basic Information */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <Users size={18} className="text-primary" />
                    <h4 className="font-label-caps text-[11px] text-primary tracking-widest">BASIC INFORMATION</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-6 bg-white/40 p-6 rounded-3xl border border-white/60">
                    <div>
                      <p className="font-label-caps text-[9px] text-outline mb-1 flex items-center gap-1"><Phone size={10} /> PRIMARY PHONE</p>
                      <p className="font-data-tabular text-sm font-bold text-on-surface">{selectedCustomer.phone1}</p>
                    </div>
                    <div>
                      <p className="font-label-caps text-[9px] text-outline mb-1 flex items-center gap-1"><Smartphone size={10} /> SECONDARY PHONE</p>
                      <p className="font-data-tabular text-sm font-bold text-on-surface">{selectedCustomer.phone2 || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-label-caps text-[9px] text-outline mb-1 flex items-center gap-1"><MapPin size={10} /> RESIDENTIAL ADDRESS</p>
                      <p className="font-body-md text-sm text-on-surface">{selectedCustomer.address}</p>
                    </div>
                    <div>
                      <p className="font-label-caps text-[9px] text-outline mb-1 flex items-center gap-1"><Calendar size={10} /> CUSTOMER SINCE</p>
                      <p className="font-body-md text-sm font-bold text-on-surface">{selectedCustomer.customerSince}</p>
                    </div>
                    <div>
                      <p className="font-label-caps text-[9px] text-outline mb-1 flex items-center gap-1"><Mail size={10} /> EMAIL ADDRESS</p>
                      <p className="font-body-md text-sm font-bold text-primary truncate">{selectedCustomer.email}</p>
                    </div>
                  </div>
                </section>

                {/* Purchase Information */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <ShoppingBag size={18} className="text-primary" />
                    <h4 className="font-label-caps text-[11px] text-primary tracking-widest">PURCHASE ANALYTICS</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                      <p className="font-label-caps text-[9px] text-primary mb-1">TOTAL PURCHASES</p>
                      <p className="font-headline-md text-xl text-primary">{(selectedCustomer.totalPurchases).toLocaleString()} Mt</p>
                    </div>
                    <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
                      <p className="font-label-caps text-[9px] text-secondary mb-1">TOTAL ORDERS</p>
                      <p className="font-headline-md text-xl text-secondary">{selectedCustomer.orderCount}</p>
                    </div>
                    <div className="bg-tertiary/5 p-4 rounded-2xl border border-tertiary/10">
                      <p className="font-label-caps text-[9px] text-tertiary mb-1">AVG ORDER VALUE</p>
                      <p className="font-headline-md text-xl text-tertiary">{(selectedCustomer.avgOrderValue).toLocaleString()} Mt</p>
                    </div>
                    <div className="bg-surface-container-highest p-4 rounded-2xl border border-outline-variant/30">
                      <p className="font-label-caps text-[9px] text-outline mb-1">FAVORITE CATEGORY</p>
                      <p className="font-headline-md text-xl text-on-surface">{selectedCustomer.mostPurchasedCategory}</p>
                    </div>
                  </div>
                </section>

                {/* Favorite Products */}
                <section>
                  <h4 className="font-label-caps text-[11px] text-outline mb-4">FAVORITE PIECES</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.favoriteProducts.map((product, i) => (
                      <span key={i} className="px-4 py-2 bg-white/60 border border-white rounded-full text-xs font-medium text-primary shadow-sm">
                        {product}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Notes */}
                <section>
                  <h4 className="font-label-caps text-[11px] text-outline mb-4">CLIENT NOTES</h4>
                  <div className="bg-secondary-fixed/10 p-5 rounded-3xl border border-secondary-fixed-dim/30">
                    <p className="font-body-md text-sm italic text-on-surface-variant leading-relaxed">
                      "{selectedCustomer.notes}"
                    </p>
                  </div>
                </section>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-8 border-t border-outline-variant/30 bg-white/20 sticky bottom-0">
                <div className="grid grid-cols-2 gap-4">
                  <button className="py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-xs shadow-xl shadow-primary/20 hover:opacity-90 transition-all">
                    EDIT PROFILE
                  </button>
                  <button className="py-4 bg-white border border-error/30 text-error rounded-2xl font-label-caps text-xs hover:bg-error/5 transition-all">
                    DELETE CUSTOMER
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

