'use client';

import { useRouter } from 'next/navigation';

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
  ChevronDown,
  ChevronUp,
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
  FileText,
  Trash2
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
  Bar,
  Treemap
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

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';

// No static MOCK_SALES here anymore

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

const COLORS = [
  '#8a4853', '#735c00', '#6e5371', '#d7c1c3', '#4a3b32', 
  '#c2a38d', '#d4af37', '#6b4c41', '#9e7b6d', '#8c7b75', 
  '#43323c', '#5c6b73', '#bda09a', '#d1cdcb', '#a88d75', 
  '#554d48', '#8a9591', '#f3e5d8'
];

export default function Sales() {
  const router = useRouter();
  const transactions = useQuery(api.transactions.list) || [];
  const brief = useQuery(api.analytics.getExecutiveBrief, {});
  const revenueHistory = useQuery(api.analytics.getRevenueByPeriod, { period: 'weekly' });
  const customers = useQuery(api.customers.list) || [];
  const products = useQuery(api.products.list, { archived: false }) || [];
  
  const createTransaction = useMutation(api.transactions.create);
  const removeTransaction = useMutation(api.transactions.remove);

  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [isAddingSale, setIsAddingSale] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All Methods');
  const [tierFilter, setTierFilter] = useState('All Tiers');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastReceipt, setLastReceipt] = useState('');

  // New Sale Form State
  const [saleForm, setSaleForm] = useState({
    customerId: undefined as string | undefined,
    items: [] as { productId: string, quantity: number, price: number, name: string }[],
    paymentBreakdown: [{ method: 'BCI', amount: 0 }],
    discount: 0,
    notes: '',
  });

  const saleTotals = useMemo(() => {
    const subtotal = saleForm.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = subtotal - saleForm.discount;
    return { subtotal, total };
  }, [saleForm.items, saleForm.discount]);

  const dateRangeLimits = useMemo(() => {
    const getStartOfDayStr = (dateStr: string) => {
      const d = new Date(dateStr + "T00:00:00");
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    const getEndOfDayStr = (dateStr: string) => {
      const d = new Date(dateStr + "T23:59:59.999");
      return isNaN(d.getTime()) ? Infinity : d.getTime();
    };

    const start = startDate ? getStartOfDayStr(startDate) : 0;
    const end = endDate ? getEndOfDayStr(endDate) : Infinity;

    return { start, end };
  }, [startDate, endDate]);

  const filteredSales = useMemo(() => {
    return transactions.filter(s => {
      // 1. Search Query (Invoice / Cashier / Customer Name)
      const customerName = s.customerName || "Walk-in";
      const matchesSearch = s.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (s.cashierName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                           customerName.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Status Filter
      const matchesStatus = statusFilter === 'All Status' || s.status === statusFilter;

      // 3. Date Filter
      const txTime = s._creationTime;
      const matchesDate = txTime >= dateRangeLimits.start && txTime <= dateRangeLimits.end;

      // 4. Payment Method Filter
      const matchesPayment = paymentFilter === 'All Methods' || 
                            s.paymentMethod === paymentFilter || 
                            s.paymentBreakdown.some((p: any) => p.method === paymentFilter);

      // 5. Customer Tier Filter
      const computedTier = (s.customerTier || '').toLowerCase();
      const isWalkIn = !s.customerId || s.customerName === "Walk-in" || !s.customerName;
      
      let matchesTier = true;
      if (tierFilter !== 'All Tiers') {
        if (tierFilter === 'Walk-in') {
          matchesTier = isWalkIn;
        } else if (tierFilter === 'VIP / Platinum') {
          matchesTier = !isWalkIn && (computedTier === 'vip' || computedTier === 'platinum');
        } else if (tierFilter === 'Gold / Premium') {
          matchesTier = !isWalkIn && (computedTier === 'gold' || computedTier === 'premium');
        } else if (tierFilter === 'Standard / Regular') {
          matchesTier = !isWalkIn && (computedTier === 'standard' || computedTier === 'regular');
        }
      }

      // 6. Min/Max Amount Filter
      const amount = s.total;
      const min = minAmount ? parseFloat(minAmount) : -Infinity;
      const max = maxAmount ? parseFloat(maxAmount) : Infinity;
      const matchesAmount = amount >= min && amount <= max;

      return matchesSearch && matchesStatus && matchesDate && matchesPayment && matchesTier && matchesAmount;
    });
  }, [transactions, searchQuery, statusFilter, dateRangeLimits, paymentFilter, tierFilter, minAmount, maxAmount]);

  const dynamicKPIs = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalProfit = filteredSales.reduce((acc, s) => acc + s.profit, 0);
    
    const clientIds = new Set();
    let walkInCount = 0;
    filteredSales.forEach(s => {
      if (s.customerId) {
        clientIds.add(s.customerId);
      } else {
        walkInCount++;
      }
    });
    const activeClients = clientIds.size + (walkInCount > 0 ? 1 : 0);
    const avgTransaction = filteredSales.length > 0 ? (totalRevenue / filteredSales.length) : 0;
    
    // Valuation is overall product inventory value
    const estimatedValuation = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
    const totalPending = filteredSales.reduce((acc, s) => {
      const amountReceived = s.amountReceived || 0;
      const pending = s.total - amountReceived;
      return acc + (pending > 0 ? pending : 0);
    }, 0);

    return {
      totalRevenue,
      totalProfit,
      activeClients,
      avgTransaction,
      estimatedValuation,
      totalPending,
    };
  }, [filteredSales, products]);

  const previousPeriodLimits = useMemo(() => {
    const { start, end } = dateRangeLimits;
    if (start === 0 || end === Infinity) {
      return { start: 0, end: 0 };
    }
    const duration = end - start;
    const prevEnd = start - 1;
    const prevStart = start - duration;
    return { start: prevStart, end: prevEnd };
  }, [dateRangeLimits]);

  const trends = useMemo(() => {
    const { start, end } = previousPeriodLimits;
    if (start === 0) {
      return { revenue: 0, profit: 0, activeClients: 0, avgTransaction: 0 };
    }

    const prevSales = transactions.filter(s => {
      const txTime = s._creationTime;
      const matchesDate = txTime >= start && txTime <= end;
      const matchesPayment = paymentFilter === 'All Methods' || 
                            s.paymentMethod === paymentFilter || 
                            s.paymentBreakdown.some((p: any) => p.method === paymentFilter);
      
      const computedTier = (s.customerTier || '').toLowerCase();
      const isWalkIn = !s.customerId || s.customerName === "Walk-in" || !s.customerName;
      
      let matchesTier = true;
      if (tierFilter !== 'All Tiers') {
        if (tierFilter === 'Walk-in') {
          matchesTier = isWalkIn;
        } else if (tierFilter === 'VIP / Platinum') {
          matchesTier = !isWalkIn && (computedTier === 'vip' || computedTier === 'platinum');
        } else if (tierFilter === 'Gold / Premium') {
          matchesTier = !isWalkIn && (computedTier === 'gold' || computedTier === 'premium');
        } else if (tierFilter === 'Standard / Regular') {
          matchesTier = !isWalkIn && (computedTier === 'standard' || computedTier === 'regular');
        }
      }

      const min = minAmount ? parseFloat(minAmount) : -Infinity;
      const max = maxAmount ? parseFloat(maxAmount) : Infinity;
      const matchesAmount = s.total >= min && s.total <= max;
      const matchesStatus = statusFilter === 'All Status' || s.status === statusFilter;

      return matchesDate && matchesPayment && matchesTier && matchesAmount && matchesStatus;
    });

    const prevRevenue = prevSales.reduce((acc, s) => acc + s.total, 0);
    const prevProfit = prevSales.reduce((acc, s) => acc + s.profit, 0);
    const prevAvg = prevSales.length > 0 ? (prevRevenue / prevSales.length) : 0;
    
    const prevClientIds = new Set();
    let prevWalkIn = 0;
    prevSales.forEach(s => {
      if (s.customerId) prevClientIds.add(s.customerId);
      else prevWalkIn++;
    });
    const prevClientsCount = prevClientIds.size + (prevWalkIn > 0 ? 1 : 0);

    const prevPending = prevSales.reduce((acc, s) => {
      const amountReceived = s.amountReceived || 0;
      const pending = s.total - amountReceived;
      return acc + (pending > 0 ? pending : 0);
    }, 0);

    const calculatePercentChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    return {
      revenue: calculatePercentChange(dynamicKPIs.totalRevenue, prevRevenue),
      profit: calculatePercentChange(dynamicKPIs.totalProfit, prevProfit),
      activeClients: calculatePercentChange(dynamicKPIs.activeClients, prevClientsCount),
      avgTransaction: calculatePercentChange(dynamicKPIs.avgTransaction, prevAvg),
      totalPending: calculatePercentChange(dynamicKPIs.totalPending, prevPending),
    };
  }, [previousPeriodLimits, transactions, paymentFilter, tierFilter, minAmount, maxAmount, statusFilter, dynamicKPIs]);

  const getSparklineData = (metric: 'total' | 'profit' | 'count') => {
    if (filteredSales.length === 0) {
      return Array(6).fill(0).map(() => ({ value: 0 }));
    }

    const { start, end } = dateRangeLimits;
    const actualStart = start > 0 ? start : Math.min(...filteredSales.map(s => s._creationTime));
    const actualEnd = end < Infinity ? end : Math.max(...filteredSales.map(s => s._creationTime));
    
    const interval = (actualEnd - actualStart) / 6 || 1;
    const points = Array(6).fill(0).map((_, i) => {
      const intervalStart = actualStart + i * interval;
      const intervalEnd = intervalStart + interval;

      const salesInInterval = filteredSales.filter(s => s._creationTime >= intervalStart && s._creationTime <= intervalEnd);
      
      let value = 0;
      if (metric === 'total') {
        value = salesInInterval.reduce((acc, s) => acc + s.total, 0);
      } else if (metric === 'profit') {
        value = salesInInterval.reduce((acc, s) => acc + s.profit, 0);
      } else {
        value = salesInInterval.length;
      }
      return { value };
    });

    return points;
  };

  const dynamicRevenueHistory = useMemo(() => {
    if (filteredSales.length === 0) {
      return [];
    }

    const { start, end } = dateRangeLimits;

    const formatDateKey = (timestamp: number, format: 'hour' | 'day' | 'date' | 'month') => {
      const d = new Date(timestamp);
      if (format === 'hour') {
        return `${d.getHours().toString().padStart(2, '0')}:00`;
      }
      if (format === 'day') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[d.getDay()];
      }
      if (format === 'date') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    let format: 'hour' | 'day' | 'date' | 'month' = 'month';
    let durationDays = 30;

    if (start > 0 && end < Infinity) {
      durationDays = (end - start) / (1000 * 60 * 60 * 24);
      if (durationDays <= 2) {
        format = 'hour';
      } else if (durationDays <= 8) {
        format = 'day';
      } else if (durationDays <= 35) {
        format = 'date';
      } else {
        format = 'month';
      }
    } else {
      format = 'month';
    }

    const dataMap: Record<string, { name: string; revenue: number; profit: number; orders: number }> = {};

    if (format === 'hour') {
      for (let i = 0; i < 24; i += 2) {
        const key = `${i.toString().padStart(2, '0')}:00`;
        dataMap[key] = { name: key, revenue: 0, profit: 0, orders: 0 };
      }
    } else if (format === 'day') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const current = new Date(start > 0 ? start : Date.now() - 6 * 24 * 3600 * 1000);
      for (let i = 0; i < 7; i++) {
        const key = days[current.getDay()];
        dataMap[key] = { name: key, revenue: 0, profit: 0, orders: 0 };
        current.setDate(current.getDate() + 1);
      }
    } else if (format === 'date') {
      const current = new Date(start > 0 ? start : Date.now() - 29 * 24 * 3600 * 1000);
      const limit = new Date(end < Infinity ? end : Date.now());
      let count = 0;
      while (current <= limit && count < 32) {
        const key = formatDateKey(current.getTime(), 'date');
        dataMap[key] = { name: key, revenue: 0, profit: 0, orders: 0 };
        current.setDate(current.getDate() + 1);
        count++;
      }
    } else {
      const monthsSet = new Set<string>();
      filteredSales.forEach(s => {
        monthsSet.add(formatDateKey(s._creationTime, 'month'));
      });
      if (monthsSet.size === 0) {
        const current = new Date();
        for (let i = 0; i < 6; i++) {
          monthsSet.add(formatDateKey(current.getTime(), 'month'));
          current.setMonth(current.getMonth() - 1);
        }
      }
      Array.from(monthsSet).reverse().forEach(key => {
        dataMap[key] = { name: key, revenue: 0, profit: 0, orders: 0 };
      });
    }

    filteredSales.forEach(s => {
      const key = formatDateKey(s._creationTime, format);
      if (!dataMap[key]) {
        dataMap[key] = { name: key, revenue: 0, profit: 0, orders: 0 };
      }
      dataMap[key].revenue += s.total;
      dataMap[key].profit += s.profit;
      dataMap[key].orders += 1;
    });

    return Object.values(dataMap);
  }, [filteredSales, dateRangeLimits]);

  const dynamicCategoryDistribution = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    let totalItems = 0;

    filteredSales.forEach(s => {
      s.items.forEach((item: any) => {
        const p = products.find(prod => prod._id === item.productId);
        const category = p?.category || 'Other';
        categoryCounts[category] = (categoryCounts[category] || 0) + item.quantity;
        totalItems += item.quantity;
      });
    });

    const categories = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      value: totalItems > 0 ? Math.round((count / totalItems) * 100) : 0,
      count
    }));

    return categories.sort((a, b) => b.value - a.value);
  }, [filteredSales, products]);

  const dynamicPayoutDistribution = useMemo(() => {
    const methodCounts: Record<string, number> = {};
    let totalPaid = 0;

    filteredSales.forEach(s => {
      if (s.paymentBreakdown && s.paymentBreakdown.length > 0) {
        s.paymentBreakdown.forEach((p: any) => {
          methodCounts[p.method] = (methodCounts[p.method] || 0) + p.amount;
          totalPaid += p.amount;
        });
      } else if (s.paymentMethod) {
        methodCounts[s.paymentMethod] = (methodCounts[s.paymentMethod] || 0) + s.total;
        totalPaid += s.total;
      }
    });

    const methods = Object.entries(methodCounts).map(([name, amount], index) => ({
      name,
      amount,
      value: totalPaid > 0 ? Math.round((amount / totalPaid) * 100) : 0,
      fill: COLORS[index % COLORS.length]
    }));

    return methods.sort((a, b) => b.value - a.value);
  }, [filteredSales]);

  const topSellingItems = useMemo(() => {
    const itemCounts: Record<string, { name: string, count: number }> = {};
    
    filteredSales.forEach(s => {
      s.items.forEach((item: any) => {
        if (!itemCounts[item.productId]) {
          const p = products.find(prod => prod._id === item.productId);
          itemCounts[item.productId] = { name: p?.name || item.name || 'Unknown', count: 0 };
        }
        itemCounts[item.productId].count += item.quantity;
      });
    });

    return Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredSales, products]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-MZ', { style: 'currency', currency: 'MZN' })
      .format(val)
      .replace('MZN', 'Mt');

  const handleRegisterSale = async () => {
    try {
      const receiptNumber = `INV-${Math.floor(10000 + Math.random() * 90000)}`;
      
      // Calculate profit (needs product cost prices)
      let totalProfit = 0;
      const itemsForMutation = saleForm.items.map(item => {
        const p = products.find(prod => prod._id === item.productId);
        const cost = p?.costPrice || 0;
        totalProfit += (item.price - cost) * item.quantity;
        return {
          productId: item.productId as any,
          quantity: item.quantity,
          price: item.price,
        };
      });

      // 2. Derive Settlement Type & Validate
      const totalPaid = saleForm.paymentBreakdown.reduce((acc, p) => acc + p.amount, 0);
      const remainingBalance = saleTotals.total - totalPaid;
      
      let settlementType: 'Completed' | 'Partially Paid' | 'Pending' = 'Pending';
      if (totalPaid >= saleTotals.total) settlementType = 'Completed';
      else if (totalPaid > 0) settlementType = 'Partially Paid';

      if (saleForm.items.length === 0) {
        toast.error("Cart is empty. Please add boutique pieces.");
        return;
      }

      // Walk-in Lockdown
      if (!saleForm.customerId && settlementType !== 'Completed') {
        toast.error("Walk-in transactions must be fully paid at checkout.");
        return;
      }

      await createTransaction({
        customerId: (saleForm.customerId ?? undefined) as any,
        subtotal: saleTotals.subtotal,
        discount: saleForm.discount,
        taxes: 0,
        total: saleTotals.total,
        profit: totalProfit,
        cashierName: "System Admin", // Replace with auth user if available
        receiptNumber,
        amountReceived: totalPaid,
        changeGiven: totalPaid > saleTotals.total ? totalPaid - saleTotals.total : 0,
        changeHandling: totalPaid > saleTotals.total ? "Cash" : undefined,
        deliveryStatus: "Pending",
        paymentBreakdown: saleForm.paymentBreakdown,
        items: itemsForMutation,
        notes: saleForm.notes,
      });

      setLastReceipt(receiptNumber);
      setIsSuccess(true);
      
      setSaleForm({
        customerId: undefined,
        items: [],
        paymentBreakdown: [{ method: 'BCI', amount: 0 }],
        discount: 0,
        notes: '',
      });
      toast.success(`Transaction ${receiptNumber} finalized`);
    } catch (error: any) {
      const errorMessage = error.data || error.message || "Failed to process sale";
      toast.error(typeof errorMessage === 'string' ? errorMessage : "Failed to process sale");
    }
  };

  const handleRemoveSale = async (id: string) => {
    toast.warning("Confirm Deletion", {
      description: "This will restore inventory stock for all items in this sale. Proceed?",
      action: {
        label: "Confirm Purge",
        onClick: async () => {
          try {
            await removeTransaction({ id: id as any });
            setSelectedSale(null);
            toast.success("Transaction purged and stock restored");
          } catch (error) {
            toast.error("Failed to remove transaction");
            console.error(error);
          }
        },
      },
    });
  };

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
          <button 
            onClick={() => router.push('/pos')}
            className="flex-1 md:flex-none px-6 py-3 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> NEW SALE
          </button>
        </div>
      </div>

      {/* Dynamic Advanced Filters Panel */}
      <div className="glass-panel p-6 rounded-3xl border border-white/50 bg-white/20 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Filter size={18} />
            </div>
            <div>
              <h3 className="font-headline-md text-lg text-primary">Dashboard Filters</h3>
              <p className="font-label-caps text-[9px] text-outline tracking-widest uppercase">
                {startDate || endDate 
                  ? `Active range: ${startDate || 'All Time'} to ${endDate || 'All Time'}`
                  : 'Active range: All Time'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="px-4 py-2 font-label-caps text-[10px] rounded-xl bg-white/40 hover:bg-white/60 text-primary border border-primary/10 flex items-center gap-1.5 ml-auto"
            >
              {isFiltersExpanded ? 'HIDE OPTIONS' : 'SHOW OPTIONS'}
              {isFiltersExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Container */}
        <AnimatePresence>
          {isFiltersExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="overflow-hidden border-t border-primary/10 pt-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Custom Date Pickers */}
                <div className="sm:col-span-2 grid grid-cols-2 gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                  <div>
                    <label className="font-label-caps text-[9px] text-outline block mb-1.5">BEGIN DATE</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white/60 border border-primary/10 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-data-tabular"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-label-caps text-[9px] text-outline block mb-1.5">END DATE</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white/60 border border-primary/10 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-data-tabular"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="font-label-caps text-[9px] text-outline block mb-1.5">PAYMENT METHOD</label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/60 border border-primary/10 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none font-bold text-primary cursor-pointer"
                  >
                    <option value="All Methods">All Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="e-Mola">e-Mola</option>
                    <option value="BCI">BCI</option>
                    <option value="BIM">BIM</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                {/* Client Loyalty Tier */}
                <div>
                  <label className="font-label-caps text-[9px] text-outline block mb-1.5">LOYALTY TIER</label>
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/60 border border-primary/10 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none font-bold text-primary cursor-pointer"
                  >
                    <option value="All Tiers">All Tiers</option>
                    <option value="VIP / Platinum">VIP / Platinum</option>
                    <option value="Gold / Premium">Gold / Premium</option>
                    <option value="Standard / Regular">Standard / Regular</option>
                    <option value="Walk-in">Walk-in Customer</option>
                  </select>
                </div>

                {/* Settlement Status */}
                <div>
                  <label className="font-label-caps text-[9px] text-outline block mb-1.5">SETTLEMENT STATUS</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/60 border border-primary/10 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none font-bold text-primary cursor-pointer"
                  >
                    <option value="All Status">All Status</option>
                    <option value="Completed">Completed / Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>

                {/* Amount Filter Range */}
                <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-label-caps text-[9px] text-outline block mb-1.5">MIN AMOUNT (Mt)</label>
                    <input
                      type="number"
                      placeholder="Min limit"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/60 border border-primary/10 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-data-tabular"
                    />
                  </div>
                  <div>
                    <label className="font-label-caps text-[9px] text-outline block mb-1.5">MAX AMOUNT (Mt)</label>
                    <input
                      type="number"
                      placeholder="Max limit"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/60 border border-primary/10 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-data-tabular"
                    />
                  </div>
                </div>

                {/* Reset Buttons */}
                <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setPaymentFilter('All Methods');
                      setTierFilter('All Tiers');
                      setStatusFilter('All Status');
                      setMinAmount('');
                      setMaxAmount('');
                    }}
                    className="w-full py-2.5 px-4 bg-white hover:bg-primary/5 text-primary border border-primary/20 rounded-xl font-label-caps text-[10px] transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={12} /> RESET ALL FILTERS
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <KPIStats 
          title="TOTAL REVENUE" 
          value={formatCurrency(dynamicKPIs.totalRevenue)} 
          trend={trends.revenue} 
          icon={DollarSign} 
          color="primary" 
          sparklineData={getSparklineData('total')}
        />
        <KPIStats 
          title="TOTAL PROFIT" 
          value={formatCurrency(dynamicKPIs.totalProfit)} 
          trend={trends.profit} 
          icon={TrendingUp} 
          color="secondary" 
          sparklineData={getSparklineData('profit')}
        />
        <KPIStats 
          title="TOTAL PENDING" 
          value={formatCurrency(dynamicKPIs.totalPending)} 
          trend={trends.totalPending} 
          icon={AlertCircle} 
          color="error" 
          sparklineData={getSparklineData('total')}
        />
        <KPIStats 
          title="AVG TRANSACTION" 
          value={formatCurrency(dynamicKPIs.avgTransaction)} 
          trend={trends.avgTransaction} 
          icon={ShoppingBag} 
          color="primary" 
          sparklineData={getSparklineData('total')}
        />
      </div>

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border border-white/50">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="font-headline-md text-xl text-primary">Revenue Trends</h3>
              <p className="font-label-caps text-[9px] text-outline tracking-widest">DYNAMIC FISCAL PERFORMANCE</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicRevenueHistory}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1" >
                    <stop offset="5%" stopColor="#8a4853" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8a4853" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e2de" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#857374'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#857374'}} dx={-10} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#8a4853" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
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
                <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                <span className="font-label-caps text-[10px] text-on-surface-variant">{entry.name} ({entry.value}%)</span>
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
                <Treemap
                  data={dynamicPayoutDistribution}
                  dataKey="amount"
                  stroke="#fff"
                  isAnimationActive={false}
                >
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
                <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                <span className="font-label-caps text-[10px] text-on-surface-variant">{entry.name} ({entry.value}%)</span>
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
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#857374'}} width={120} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(138, 72, 83, 0.05)' }}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
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
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-outline-variant/30 rounded-xl text-[11px] font-label-caps focus:ring-2 focus:ring-primary/10 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="All Status">All Status</option>
                <option value="Completed">Completed / Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Pending">Pending</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
            <button 
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className={`p-2 border border-outline-variant/30 rounded-xl hover:bg-white transition-all text-outline ${isFiltersExpanded ? 'bg-primary/10 text-primary border-primary/20 shadow-sm' : ''}`}
              title="Toggle Advanced Filters"
            >
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
                  key={sale._id} 
                  className="hover:bg-white/40 transition-colors group cursor-pointer"
                  onClick={() => setSelectedSale(sale)}
                >
                  <td className="px-8 py-5 font-data-tabular text-sm font-bold text-primary">
                    {sale.receiptNumber}
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-body-md text-sm font-bold text-on-surface">{sale.customerName || 'Walk-in'}</p>
                      <p className="font-label-caps text-[9px] text-outline tracking-widest">{sale.paymentStatus}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex -space-x-3">
                      {(sale.items || []).slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-sm bg-surface-container">
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">ITEM</div>
                        </div>
                      ))}
                      {(sale.items || []).length > 3 && (
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-surface-variant flex items-center justify-center text-[10px] font-bold text-outline shadow-sm">
                          +{(sale.items || []).length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 font-data-tabular text-sm font-bold">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`font-data-tabular text-sm ${sale.balance > 0 ? 'text-error' : 'text-outline opacity-40'}`}>
                      {sale.balance > 0 ? formatCurrency(sale.balance) : '0 Mt'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      sale.status === 'Completed' ? 'bg-secondary-container/20 text-secondary' :
                      sale.status === 'Partially Paid' ? 'bg-primary/10 text-primary' :
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
                  <h2 className="font-headline-md text-2xl text-primary">{selectedSale.receiptNumber}</h2>
                  <p className="font-label-caps text-[10px] text-outline tracking-widest mt-1">
                    TRANSACTION COMPLETED ON {new Date(selectedSale._creationTime).toLocaleDateString()} AT {new Date(selectedSale._creationTime).toLocaleTimeString()} BY {selectedSale.cashierName?.toUpperCase() || 'SYSTEM'}
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
                    {selectedSale.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-white/40 rounded-2xl border border-white/60">
                        <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md">
                          <img src={item.photo || null} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="font-body-md text-sm font-bold text-on-surface">{item.name}</p>
                          <p className="font-data-tabular text-xs text-outline">{formatCurrency(item.price)} × {item.quantity}</p>
                        </div>
                        <p className="font-data-tabular text-sm font-bold text-primary">
                          {formatCurrency(item.price * item.quantity)}
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
                      <span className="font-data-tabular font-bold">{formatCurrency(selectedSale.subtotal)}</span>
                    </div>
                    {selectedSale.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant font-body-md">Discount</span>
                        <span className="font-data-tabular font-bold text-error">-{formatCurrency(selectedSale.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-outline-variant/30 pt-3">
                      <span className="text-on-surface font-bold font-headline-md">Invoice Total</span>
                      <span className="font-data-tabular font-bold text-xl text-primary">{formatCurrency(selectedSale.total)}</span>
                    </div>
                    
                    {/* Tenders Received */}
                    {selectedSale.paymentBreakdown?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-outline-variant/30 space-y-2">
                        <span className="font-label-caps text-[9px] text-outline mb-1 block">TENDERS RECEIVED</span>
                        {selectedSale.paymentBreakdown.map((p: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-on-surface-variant font-body-md">{p.method}</span>
                            <span className="font-data-tabular font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Change Given */}
                    {(selectedSale.changeGiven || 0) > 0 && (
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-on-surface-variant font-body-md">
                          Change Given {selectedSale.changeHandling ? `(${selectedSale.changeHandling})` : ''}
                        </span>
                        <span className="font-data-tabular font-bold text-amber-600">{formatCurrency(selectedSale.changeGiven || 0)}</span>
                      </div>
                    )}

                    {selectedSale.balance > 0 && (
                      <div className="flex justify-between text-sm bg-error/5 p-3 rounded-xl mt-4 border border-error/10">
                        <span className="text-error font-bold flex items-center gap-1"><AlertCircle size={14} /> Outstanding Balance</span>
                        <span className="font-data-tabular font-bold text-error">{formatCurrency(selectedSale.balance)}</span>
                      </div>
                    )}
                  </div>
                </section>

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-8 border-t border-outline-variant/30 bg-white/40 backdrop-blur-md sticky bottom-0">
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex flex-col items-center gap-2 p-3 bg-white border border-outline-variant/30 rounded-2xl text-primary hover:bg-primary/5 transition-all">
                    <Printer size={18} />
                    <span className="font-label-caps text-[8px]">PRINT</span>
                  </button>
                  <button 
                    onClick={() => handleRemoveSale(selectedSale._id)}
                    className="flex flex-col items-center gap-2 p-3 bg-white border border-error/20 rounded-2xl text-error hover:bg-error/5 transition-all"
                  >
                    <Trash2 size={18} />
                    <span className="font-label-caps text-[8px]">PURGE</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Sale Drawer */}
      <AnimatePresence>
        {isAddingSale && (
          <div className="fixed inset-0 z-[110] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingSale(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="relative w-full max-w-2xl h-full bg-surface-container shadow-2xl flex flex-col border-l border-white/40"
            >
              {/* POS Header */}
              <div className="p-8 bg-atelier-gradient border-b border-primary/10">
                <div className="flex justify-between items-center">
                  <h2 className="font-headline-md text-3xl text-primary">New Sale Ticket</h2>
                  <button onClick={() => setIsAddingSale(false)} className="p-2 hover:bg-white/40 rounded-full text-primary">
                    <X size={24} />
                  </button>
                </div>
                <p className="font-label-caps text-[10px] text-primary/70 mt-2 tracking-widest">BOUTIQUE POS INTERFACE</p>
              </div>

              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full flex flex-col items-center justify-center p-12 text-center"
                    >
                      <div className="w-24 h-24 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-6">
                        <CheckCircle2 size={48} />
                      </div>
                      <h3 className="font-headline-md text-3xl text-primary mb-2">Transaction Finalized</h3>
                      <p className="font-body-md text-on-surface-variant mb-8">
                        The sale has been successfully recorded in the vault.
                      </p>
                      
                      <div className="w-full bg-white/40 border border-white/60 rounded-3xl p-6 mb-10">
                        <p className="font-label-caps text-[10px] text-outline mb-2">RECEIPT NUMBER</p>
                        <p className="font-data-tabular text-2xl font-bold text-primary">{lastReceipt}</p>
                      </div>

                      <button 
                        onClick={() => {
                          setIsAddingSale(false);
                          setIsSuccess(false);
                        }}
                        className="w-full py-5 bg-primary text-on-primary rounded-2xl font-label-caps text-sm shadow-xl shadow-primary/20"
                      >
                        CLOSE TICKET
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="pos-form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-8 space-y-10"
                    >
                      {/* Customer Selection */}
                      <section>
                        <label className="font-label-caps text-[11px] text-outline mb-4 block">1. LINK CLIENT ACCOUNT</label>
                        <select 
                          className="w-full p-4 bg-white/40 border border-white/60 rounded-2xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                          value={saleForm.customerId || ''}
                          onChange={(e) => setSaleForm({...saleForm, customerId: e.target.value || undefined})}
                        >
                          <option value="">WALK-IN CUSTOMER (NO ACCOUNT)</option>
                          {customers.map(c => (
                            <option key={c._id} value={c._id}>{c.firstName} {c.lastName} ({c.financialTier} - {c.loyaltyLevel})</option>
                          ))}
                        </select>
                      </section>

                      {/* Items Selection */}
                      <section className="space-y-6">
                        <label className="font-label-caps text-[11px] text-outline block">2. SELECT BOUTIQUE PIECES</label>
                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1">
                          {products.filter(p => p.stock > 0).map(p => (
                            <button 
                              key={p._id}
                              onClick={() => {
                                const existing = saleForm.items.find(i => i.productId === p._id);
                                if (existing) {
                                  setSaleForm({...saleForm, items: saleForm.items.map(i => i.productId === p._id ? {...i, quantity: i.quantity + 1} : i)});
                                } else {
                                  setSaleForm({...saleForm, items: [...saleForm.items, { productId: p._id, name: p.name, quantity: 1, price: p.sellingPrice }]});
                                }
                              }}
                              className="p-4 bg-white/60 border border-white/80 rounded-2xl flex flex-col items-start gap-2 hover:bg-white transition-all text-left group"
                            >
                              <div className="w-full aspect-square rounded-xl overflow-hidden mb-2">
                                <img src={p.imageUrl || undefined} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                              </div>
                              <p className="font-bold text-xs text-primary">{p.name}</p>
                              <div className="flex justify-between w-full items-center">
                                <span className="font-data-tabular text-[10px] text-outline">{formatCurrency(p.sellingPrice)}</span>
                                <span className="text-[9px] font-bold text-secondary">{p.stock} IN STOCK</span>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Cart Items */}
                        <div className="space-y-3">
                          {saleForm.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                              <div>
                                <p className="font-bold text-sm text-primary">{item.name}</p>
                                <div className="flex gap-4 mt-1">
                                  <span className="font-data-tabular text-[10px] text-outline">QTY: {item.quantity}</span>
                                  <span className="font-data-tabular text-[10px] text-outline">UNIT: {formatCurrency(item.price)}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => setSaleForm({...saleForm, items: saleForm.items.filter((_, i) => i !== idx)})}
                                className="p-2 text-error hover:bg-error/10 rounded-full"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Financial Summary */}
                      <section className="bg-white/40 p-6 rounded-3xl border border-white space-y-4">
                        <h4 className="font-label-caps text-[11px] text-outline">3. FINANCIAL RECONCILIATION</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-outline">SUBTOTAL</span>
                            <span className="font-data-tabular font-bold">{formatCurrency(saleTotals.subtotal)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-outline">DISCOUNT (Mt)</span>
                            <input 
                              type="number" 
                              value={saleForm.discount}
                              onChange={(e) => setSaleForm({...saleForm, discount: parseFloat(e.target.value) || 0})}
                              className="w-24 text-right bg-transparent border-b border-primary/20 font-data-tabular font-bold focus:border-primary outline-none"
                            />
                          </div>
                          <div className="pt-4 border-t border-primary/20 flex justify-between">
                            <span className="font-headline-sm text-primary text-xl">GRANDE TOTAL</span>
                            <span className="font-headline-sm text-primary text-2xl">{formatCurrency(saleTotals.total)}</span>
                          </div>
                        </div>
                      </section>

                      {/* Payment Breakdown */}
                      <section>
                        <label className="font-label-caps text-[11px] text-outline mb-4 block">4. PAYMENT METHODS & SPLITS</label>
                        
                        <div className="space-y-4">
                          {saleForm.paymentBreakdown.map((pay, idx) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={idx} 
                              className="flex gap-4 items-center"
                            >
                              <select 
                                className="flex-1 p-4 bg-white/40 border border-white/60 rounded-2xl text-xs font-bold"
                                value={pay.method}
                                onChange={(e) => setSaleForm({...saleForm, paymentBreakdown: saleForm.paymentBreakdown.map((p, i) => i === idx ? {...p, method: e.target.value} : p)})}
                              >
                                <option>Cash</option>
                                <option>M-Pesa</option>
                                <option>e-Mola</option>
                                <option>BCI</option>
                                <option>BIM</option>
                                <option>Bank Transfer</option>
                                <option>Card</option>
                              </select>
                              <input 
                                type="number" 
                                placeholder="Amount"
                                value={pay.amount}
                                onChange={(e) => setSaleForm({...saleForm, paymentBreakdown: saleForm.paymentBreakdown.map((p, i) => i === idx ? {...p, amount: parseFloat(e.target.value) || 0} : p)})}
                                className="flex-1 p-4 bg-white/40 border border-white/60 rounded-2xl font-data-tabular text-sm"
                              />
                              {saleForm.paymentBreakdown.length > 1 && (
                                <button 
                                  onClick={() => setSaleForm({...saleForm, paymentBreakdown: saleForm.paymentBreakdown.filter((_, i) => i !== idx)})}
                                  className="p-2 text-outline/40 hover:text-error transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </motion.div>
                          ))}
                          
                          <div className="flex justify-between items-center px-2">
                            <button 
                              onClick={() => setSaleForm({...saleForm, paymentBreakdown: [...saleForm.paymentBreakdown, { method: 'BCI', amount: 0 }]})}
                              className="text-xs font-label-caps text-primary hover:underline flex items-center gap-1"
                            >
                              <Plus size={14} /> ADD PAYMENT METHOD
                            </button>

                            <div className="text-right">
                              <p className="font-label-caps text-[9px] text-outline">REMAINING</p>
                              <p className={`font-data-tabular font-bold ${saleTotals.total - saleForm.paymentBreakdown.reduce((acc, p) => acc + p.amount, 0) > 0 ? 'text-error' : 'text-secondary'}`}>
                                {formatCurrency(saleTotals.total - saleForm.paymentBreakdown.reduce((acc, p) => acc + p.amount, 0))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* POS Footer */}
              {!isSuccess && (
                <div className="p-8 border-t border-outline-variant/30 bg-white/60 sticky bottom-0">
                  <button 
                    onClick={handleRegisterSale}
                    disabled={saleForm.items.length === 0}
                    className="w-full py-5 bg-primary text-on-primary rounded-2xl font-label-caps text-sm shadow-2xl shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                  >
                    <CheckCircle2 size={24} /> FINALIZE TRANSACTION
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

