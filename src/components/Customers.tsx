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
  Smartphone,
  Camera,
  Check
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

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';

// --- Types & Interfaces ---

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
  email?: string;
  loyaltyTier: string;
  totalSpent: number;
  outstandingBalance: number;
  creditLimit: number;
  notes?: string;
}

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
        <AreaChart data={[{ value: 10 }, { value: 20 }, { value: 15 }, { value: 30 }, { value: 25 }, { value: 40 }]}>
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
  const customers = useQuery(api.customers.list) || [];
  const upsertCustomer = useMutation(api.customers.upsert);
  const deleteCustomer = useMutation(api.customers.remove);

  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone1: '',
    phone2: '',
    phone3: '',
    email: '',
    loyaltyTier: 'regular',
    creditLimit: 0,
    notes: ''
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
        c.phone1.includes(searchQuery);
      const matchesStatus = statusFilter === 'All Status' || c.loyaltyTier.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  const brief = useQuery(api.analytics.getExecutiveBrief);
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-MZ', { style: 'currency', currency: 'MZN' })
      .format(val)
      .replace('MZN', 'Mt');

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone1: '',
      phone2: '',
      phone3: '',
      email: '',
      loyaltyTier: 'regular',
      creditLimit: 0,
      notes: ''
    });
    setIsAddingCustomer(true);
  };

  const handleOpenEdit = (customer: any) => {
    setEditingId(customer._id);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone1: customer.phone1,
      phone2: customer.phone2 || '',
      phone3: customer.phone3 || '',
      email: customer.email || '',
      loyaltyTier: customer.loyaltyTier.toLowerCase(),
      creditLimit: customer.creditLimit || 0,
      notes: customer.notes || ''
    });
    setIsAddingCustomer(true);
    setSelectedCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertCustomer({
        id: (editingId ?? undefined) as any,
        ...formData,
        totalSpent: editingId ? (customers.find(c => c._id === editingId)?.totalSpent || 0) : 0,
        outstandingBalance: editingId ? (customers.find(c => c._id === editingId)?.outstandingBalance || 0) : 0,
      });
      setIsAddingCustomer(false);
      setEditingId(null);
      toast.success(editingId ? "Client profile updated successfully" : "New client enrolled successfully");
    } catch (error) {
      toast.error("Failed to save customer profile");
      console.error("Failed to save customer:", error);
    }
  };

  const handleDelete = async (id: string) => {
    toast.warning("Are you sure you want to delete this customer?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteCustomer({ id: id as any });
            setSelectedCustomer(null);
            toast.success("Customer record purged from boutique database");
          } catch (error) {
            toast.error("Failed to delete customer");
            console.error("Failed to delete customer:", error);
          }
        },
      },
    });
  };

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
          value={brief ? brief.activeClients.toString() : '...'}
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
          value={brief ? formatCurrency(brief.totalRevenue * 0.15) : '...'} // Placeholder for actual debt logic
          subValue="Credits pending payment"
          trend={-5.4}
          icon={CreditCard}
          color="error"
        />
        <KPICard
          title="AVG CUSTOMER SPEND"
          value={brief && brief.activeClients > 0 ? formatCurrency(brief.totalRevenue / brief.activeClients) : '...'}
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
                <option>Platinum</option>
                <option>Gold</option>
                <option>Standard</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur-md">
              <tr className="border-b border-primary/5 font-label-caps text-[11px] text-outline">
                <th className="px-8 py-5">CLIENT</th>
                <th className="px-6 py-5">CONTACTS</th>
                <th className="px-6 py-5">PURCHASES</th>
                <th className="px-6 py-5">OUTSTANDING</th>
                <th className="px-6 py-5">STATUS</th>
                <th className="px-8 py-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredCustomers.map((customer: any) => (
                <tr
                  key={customer._id}
                  className="hover:bg-white/40 transition-colors group cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-md text-primary font-bold">
                        {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-body-md text-sm font-bold text-on-surface">{customer.firstName} {customer.lastName}</p>
                        <p className="font-data-tabular text-[10px] text-outline">CLIENT</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 font-data-tabular text-xs text-on-surface">
                        <Smartphone size={12} className="text-outline" /> {customer.phone1}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2 font-data-tabular text-[10px] text-outline">
                          <Mail size={12} className="text-outline" /> {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 font-data-tabular text-sm font-bold text-primary">
                    {formatCurrency(customer.totalSpent)}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`font-data-tabular text-sm ${customer.outstandingBalance > 0 ? 'text-error font-bold' : 'text-outline opacity-50'}`}>
                      {customer.outstandingBalance > 0 ? formatCurrency(customer.outstandingBalance) : 'No balance'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${customer.loyaltyTier.toLowerCase() === 'platinum' ? 'bg-primary text-on-primary' :
                      customer.loyaltyTier.toLowerCase() === 'gold' ? 'bg-secondary-container text-on-secondary-container' :
                        'bg-tertiary-container/30 text-on-tertiary-container'
                      }`}>
                      {customer.loyaltyTier}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 hover:bg-primary/10 rounded-full text-outline hover:text-primary transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
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
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-2xl mb-4 text-primary font-bold text-3xl">
                    {selectedCustomer.firstName.charAt(0)}{selectedCustomer.lastName.charAt(0)}
                  </div>
                  <h2 className="font-headline-md text-3xl text-primary">{selectedCustomer.firstName} {selectedCustomer.lastName}</h2>
                  <p className="font-label-caps text-xs text-outline mb-4">{selectedCustomer._id} • {selectedCustomer.loyaltyTier.toUpperCase()} MEMBER</p>

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
                      <p className="font-label-caps text-[9px] text-outline mb-1 flex items-center gap-1"><Smartphone size={10} /> ALTERNATIVE</p>
                      <p className="font-data-tabular text-sm font-bold text-on-surface">{selectedCustomer.phone2 || '—'}</p>
                    </div>
                    <div>
                      <p className="font-label-caps text-[9px] text-outline mb-1 flex items-center gap-1"><Smartphone size={10} /> SECONDARY</p>
                      <p className="font-data-tabular text-sm font-bold text-on-surface">{selectedCustomer.phone3 || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-label-caps text-[9px] text-outline mb-1 flex items-center gap-1"><MapPin size={10} /> RESIDENTIAL ADDRESS</p>
                      <p className="font-body-md text-sm text-on-surface">{selectedCustomer.address}</p>
                    </div>
                    <div>
                      <p className="font-label-caps text-[9px] text-outline mb-1 flex items-center gap-1"><Calendar size={10} /> CUSTOMER SINCE</p>
                      <p className="font-body-md text-sm font-bold text-on-surface">MEMBER</p>
                    </div>
                    <div>
                      <p className="font-label-caps text-[9px] text-outline mb-1 flex items-center gap-1"><Mail size={10} /> EMAIL ADDRESS</p>
                      <p className="font-body-md text-sm font-bold text-primary truncate">{selectedCustomer.email || 'No email'}</p>
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
                      <p className="font-headline-md text-xl text-primary">{formatCurrency(selectedCustomer.totalSpent)}</p>
                    </div>
                    <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
                      <p className="font-label-caps text-[9px] text-secondary mb-1">OUTSTANDING BALANCE</p>
                      <p className="font-headline-md text-xl text-secondary">{formatCurrency(selectedCustomer.outstandingBalance)}</p>
                    </div>
                  </div>
                </section>

                {/* Notes */}
                <section>
                  <h4 className="font-label-caps text-[11px] text-outline mb-4">CLIENT NOTES</h4>
                  <div className="bg-secondary-fixed/10 p-5 rounded-3xl border border-secondary-fixed-dim/30">
                    <p className="font-body-md text-sm italic text-on-surface-variant leading-relaxed">
                      "{selectedCustomer.notes || 'No notes available'}"
                    </p>
                  </div>
                </section>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-8 border-t border-outline-variant/30 bg-white/20 sticky bottom-0">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleOpenEdit(selectedCustomer)}
                    className="py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-xs shadow-xl shadow-primary/20 hover:opacity-90 transition-all"
                  >
                    EDIT PROFILE
                  </button>
                  <button
                    onClick={() => handleDelete(selectedCustomer._id)}
                    className="py-4 bg-white border border-error/30 text-error rounded-2xl font-label-caps text-xs hover:bg-error/5 transition-all"
                  >
                    DELETE CUSTOMER
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Client Drawer */}
      <AnimatePresence>
        {isAddingCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingCustomer(false)}
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
                  onClick={() => setIsAddingCustomer(false)}
                  className="absolute top-6 right-6 p-2 bg-white/40 backdrop-blur-md rounded-full text-primary hover:bg-white transition-all shadow-sm"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mt-4">
                  <div className="w-20 h-20 bg-white/40 backdrop-blur-md rounded-3xl border-2 border-white flex items-center justify-center text-primary shadow-xl mb-4 group cursor-pointer hover:bg-white transition-all">
                    <Camera size={32} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <h2 className="font-headline-md text-3xl text-primary uppercase tracking-tight">
                    {editingId ? 'Update Client Profile' : 'New Client Registration'}
                  </h2>
                  <p className="font-label-caps text-[10px] text-outline mt-2 tracking-[0.2em]">BOUTIQUE MEMBER ENROLLMENT</p>
                </div>
              </div>

              {/* Form Content */}
              <form className="flex-1 p-8 space-y-8" onSubmit={handleSubmit}>
                {/* Personal Section */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    <h4 className="font-label-caps text-[11px] text-primary tracking-widest">PERSONAL IDENTITY</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">FIRST NAME</label>
                      <input
                        type="text"
                        placeholder="e.g. Eleanor"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">LAST NAME</label>
                      <input
                        type="text"
                        placeholder="e.g. Vance"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                        required
                      />
                    </div>
                  </div>
                </section>

                {/* Contact Section */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-secondary rounded-full"></div>
                    <h4 className="font-label-caps text-[11px] text-secondary tracking-widest">CONTACT & REACH</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">PRIMARY PHONE</label>
                      <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
                        <input
                          type="tel"
                          placeholder="+258 (Primary)"
                          value={formData.phone1}
                          onChange={(e) => setFormData({ ...formData, phone1: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-label-caps text-[9px] text-outline ml-1">Secondary Phone</label>
                        <div className="relative">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
                          <input
                            type="tel"
                            placeholder="+258 (Secondary)"
                            value={formData.phone2}
                            onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-label-caps text-[9px] text-outline ml-1">Alternative Phone</label>
                        <div className="relative">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
                          <input
                            type="tel"
                            placeholder="+258 (Alternative)"
                            value={formData.phone3}
                            onChange={(e) => setFormData({ ...formData, phone3: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">EMAIL ADDRESS</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
                        <input
                          type="email"
                          placeholder="client@luxury.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Classification Section */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-tertiary rounded-full"></div>
                    <h4 className="font-label-caps text-[11px] text-tertiary tracking-widest">CLIENT CLASSIFICATION</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">MEMBERSHIP TIER</label>
                      <select
                        value={formData.loyaltyTier}
                        onChange={(e) => setFormData({ ...formData, loyaltyTier: e.target.value.toLowerCase() })}
                        className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl text-xs font-bold text-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm appearance-none"
                      >
                        <option value="regular">REGULAR</option>
                        <option value="premium">PREMIUM</option>
                        <option value="vip">VIP</option>
                        <option value="platinum">PLATINUM</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">INITIAL CREDIT LIMIT</label>
                      <input
                        type="number"
                        placeholder="0.00 Mt"
                        value={formData.creditLimit}
                        onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl font-data-tabular text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </section>

                {/* Boutique Notes */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-outline rounded-full"></div>
                    <h4 className="font-label-caps text-[11px] text-outline tracking-widest">BOUTIQUE NOTES</h4>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Style preferences, preferred metals, special dates..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-2xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm resize-none italic"
                  />
                </section>
              </form>

              {/* Drawer Footer Actions */}
              <div className="p-8 border-t border-outline-variant/30 bg-white/20 sticky bottom-0">
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsAddingCustomer(false)}
                    className="flex-1 py-4 bg-white border border-outline-variant/30 text-outline rounded-2xl font-label-caps text-[11px] hover:bg-surface-variant transition-all uppercase tracking-widest"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    className="flex-[2] py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
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

