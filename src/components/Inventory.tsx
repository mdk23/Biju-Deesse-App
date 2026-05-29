'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  TrendingUp,
  Box,
  DollarSign,
  Clock,
  ChevronRight,
  Filter,
  Search,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  X,
  Image as ImageIcon,
  History,
  ShieldCheck,
  Camera,
  Check,
  Tag,
  Gem
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Interfaces ---

interface InventoryProduct {
  id: string;
  name: string;
  category: 'Rings' | 'Necklaces' | 'Bracelets' | 'Watches' | 'Earrings';
  brand: string;
  goldPurity: string;
  costPrice: number;
  sellingPrice: number;
  quantity: {
    current: number;
    reserved: number;
    damaged: number;
    available: number;
  };
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Dead Stock';
  photos: string[];
  addedDate: string;
  lastMovement: string;
}

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';

// No static MOCK_INVENTORY here anymore

// --- Sub-components ---

const StatCard = ({ title, value, subValue, icon: Icon, trend, color }: any) => (
  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:shadow-xl transition-all duration-300">
    <div className={`absolute top-0 right-0 p-4 opacity-10 text-${color}`}>
      <Icon size={48} />
    </div>
    <p className="font-label-caps text-[10px] text-outline mb-2">{title}</p>
    <div className="flex items-baseline gap-2">
      <h3 className="font-headline-md text-2xl text-primary">{value}</h3>
      {trend && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center ${trend > 0 ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-error-container text-on-error-container'}`}>
          {trend > 0 ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="font-body-md text-xs text-on-surface-variant mt-1">{subValue}</p>
    <div className="mt-4 h-1 w-full bg-white/20 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '70%' }}
        transition={{ duration: 1, delay: 0.2 }}
        className={`h-full bg-${color}`}
      />
    </div>
  </div>
);

const InventoryActions = () => (
  <div className="flex flex-wrap gap-3 mb-8">
    <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-label-caps text-[11px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
      <Plus size={16} /> STOCK IN
    </button>
    <button className="flex items-center gap-2 px-5 py-2.5 bg-white/60 backdrop-blur-md border border-primary/20 text-primary rounded-xl font-label-caps text-[11px] hover:bg-primary/5 transition-all">
      <ArrowUpRight size={16} /> STOCK OUT
    </button>
    <button className="flex items-center gap-2 px-5 py-2.5 bg-white/60 backdrop-blur-md border border-outline-variant text-on-surface-variant rounded-xl font-label-caps text-[11px] hover:bg-surface-variant/50 transition-all">
      <Filter size={16} /> ADJUSTMENTS
    </button>
  </div>
);

// --- Main Component ---

export default function Inventory() {
  const products = useQuery(api.products.list, { archived: false }) || [];
  const upsertProduct = useMutation(api.products.upsert);
  const deleteProduct = useMutation(api.products.remove);

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Rings',
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    reorderLevel: 5,
    archived: false,
    description: '',
  });

  const estimatedMargin = useMemo(() => {
    if (formData.sellingPrice <= 0) return 0;
    return ((formData.sellingPrice - formData.costPrice) / formData.sellingPrice) * 100;
  }, [formData.costPrice, formData.sellingPrice]);

  const analytics = useQuery(api.products.getInventoryAnalytics);

  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [products]);

  const agingData = useMemo(() => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    let bucket0_30 = 0;
    let bucket31_60 = 0;
    let bucket61_90 = 0;
    let bucket90plus = 0;

    products.forEach((p) => {
      const ageInDays = Math.floor((now - p._creationTime) / DAY);
      if (ageInDays <= 30) bucket0_30++;
      else if (ageInDays <= 60) bucket31_60++;
      else if (ageInDays <= 90) bucket61_90++;
      else bucket90plus++;
    });

    return [
      { name: '0-30 Days', value: bucket0_30 },
      { name: '31-60 Days', value: bucket31_60 },
      { name: '61-90 Days', value: bucket61_90 },
      { name: '90+ Days', value: bucket90plus },
    ];
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const COLORS = ['#8a4853', '#735c00', '#6e5371', '#d7c1c3', '#857374'];

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      code: '',
      name: '',
      category: 'Rings',
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
      reorderLevel: 5,
      archived: false,
      description: '',
    });
    setIsAddingProduct(true);
  };

  const handleOpenEdit = (product: any) => {
    setEditingId(product._id);
    setFormData({
      code: product.code,
      name: product.name,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      reorderLevel: product.reorderLevel,
      archived: product.archived,
      description: product.description || '',
    });
    setIsAddingProduct(true);
    setSelectedProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertProduct({
        id: (editingId ?? undefined) as any,
        ...formData,
      });
      setIsAddingProduct(false);
      setEditingId(null);
      toast.success(editingId ? "Inventory piece updated" : "New piece registered in the vault");
    } catch (error) {
      toast.error("Failed to save inventory piece");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    toast.warning("Confirm Deletion", {
      description: "Are you sure you want to remove this piece? This action is permanent.",
      action: {
        label: "Remove Permanent",
        onClick: async () => {
          try {
            await deleteProduct({ id: id as any });
            setSelectedProduct(null);
            toast.success("Piece purged from inventory vault");
          } catch (error) {
            toast.error("Failed to delete piece");
            console.error(error);
          }
        },
      },
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <h1 className="font-headline-lg text-4xl text-primary mb-2">Inventory Control</h1>
          <p className="font-body-md text-on-surface-variant max-w-xl">
            Global stock management, procurement, and real-time jewelry analytics.
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="hidden lg:flex items-center gap-3 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-white/60 shadow-sm">
            <div className="flex flex-col px-4 border-r border-outline-variant/30">
              <span className="font-label-caps text-[9px] text-outline">STOCK ACCURACY</span>
              <span className="font-data-tabular text-sm text-primary font-bold">99.8%</span>
            </div>
            <div className="flex flex-col px-4">
              <span className="font-label-caps text-[9px] text-outline">LAST SYNC</span>
              <span className="font-data-tabular text-sm text-on-surface-variant">2 mins ago</span>
            </div>
          </div>
          <button
            onClick={() => setIsAddingProduct(true)}
            className="flex-1 md:flex-none px-6 py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> NEW ACQUISITION
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        <StatCard
          title="TOTAL STOCK VALUE"
          value={analytics ? `${analytics.totalStockValue.toLocaleString()} Mt` : "..."}
          subValue={`Valuation of ${products.length} active pieces`}
          icon={DollarSign}
          trend={analytics?.valuationTrend}
          color="primary"
        />
        <StatCard
          title="LOW STOCK ITEMS"
          value={analytics ? analytics.lowStockCount : "..."}
          subValue="Requires immediate action"
          icon={AlertTriangle}
          trend={analytics?.lowStockTrend}
          color="secondary"
        />
        <StatCard
          title="OUT OF STOCK"
          value={analytics ? analytics.outOfStockCount : "..."}
          subValue="Lost revenue potential"
          icon={Box}
          color="error"
        />
        <StatCard
          title="DEAD STOCK"
          value={analytics ? analytics.deadStockCount : "..."}
          subValue="Idle capital > 180 days"
          icon={Clock}
          color="outline"
        />
        <StatCard
          title="FAST MOVING"
          value={analytics ? analytics.fastMovingProducts.length : "..."}
          subValue="Top performers this month"
          icon={TrendingUp}
          trend={18}
          color="tertiary"
        />
      </div>

      <InventoryActions />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Alerts Section */}
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-error/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-error" size={20} />
              <h3 className="font-headline-md text-lg text-primary">Critical Alerts</h3>
            </div>
            <span className="bg-error/10 text-error px-2 py-0.5 rounded text-[10px] font-bold">4 ISSUES</span>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Negative Stock Detected', desc: 'SKU: PRD-102 (Bracelet)', type: 'error' },
              { label: 'Missing Inventory Scan', desc: 'Section: Vault B, Row 4', type: 'warning' },
              { label: 'Dead Stock Threshold', desc: '12 items idle > 9 months', type: 'warning' },
              { label: 'Low Margin Warning', desc: 'Celestial Collection (Promo)', type: 'info' },
            ].map((alert, i) => (
              <div key={i} className="p-3 bg-white/40 rounded-xl border border-white/60 hover:bg-white/60 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-label-caps text-[11px] text-on-surface">{alert.label}</p>
                    <p className="font-body-md text-[10px] text-on-surface-variant">{alert.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-outline opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 border border-error/20 text-error font-label-caps text-[10px] rounded-lg hover:bg-error/5 transition-colors">RESOLVE ALL</button>
        </div>

        {/* Category Distribution Chart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-headline-md text-lg text-primary">Category Distribution</h3>
              <p className="font-label-caps text-[9px] text-outline">TOTAL VOLUME BY TYPE</p>
            </div>
          </div>
          <div className="h-48 w-full min-h-[192px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {categoryDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="font-label-caps text-[10px] text-on-surface-variant">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Aging Chart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-headline-md text-lg text-primary">Inventory Aging</h3>
              <p className="font-label-caps text-[9px] text-outline">STOCK RETENTION PERIOD</p>
            </div>
          </div>
          <div className="h-48 w-full min-h-[192px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e2de" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#857374' }} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(138, 72, 83, 0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#8a4853" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 font-body-md text-[10px] text-on-surface-variant text-center italic">
            {products.length > 0
              ? `* ${Math.round((agingData[3].value / products.length) * 100)}% of inventory has exceeded the 90-day retention threshold.`
              : '* No inventory data available.'}
          </p>
        </div>
      </div>

      {/* Product Table Section */}
      <section className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-white/40">
        <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-primary/10">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <h4 className="font-headline-md text-xl text-primary whitespace-nowrap">Product Catalog</h4>
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
              <input
                type="text"
                placeholder="Search SKU or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-primary/10 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {['All', 'Earrings', 'Bracelets', 'Charms', 'Piercings', 'Necklaces', 'Necklace & Earring Sets', 'Watches', 'Rings'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-1.5 rounded-full font-label-caps text-[10px] transition-all whitespace-nowrap ${categoryFilter === cat ? 'bg-primary text-on-primary' : 'bg-white/60 text-primary border border-primary/20 hover:bg-primary/5'}`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-primary/5 border-b border-primary/10 font-label-caps text-[11px] text-primary">
                <th className="px-8 py-5">PRODUCT INFO</th>
                <th className="px-6 py-5">CATEGORY</th>
                <th className="px-6 py-5">COST PRICE</th>
                <th className="px-6 py-5">SELLING PRICE</th>
                <th className="px-6 py-5">QUANTITY</th>
                <th className="px-6 py-5">STATUS</th>
                <th className="px-8 py-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredProducts.map((product) => (
                <tr
                  key={product._id}
                  className="hover:bg-white/50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-white bg-surface-container shadow-sm">
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div>
                        <p className="font-body-md text-sm font-bold text-on-surface">{product.name}</p>
                        <p className="font-data-tabular text-[10px] text-outline">{product.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-label-caps text-[10px] text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-data-tabular text-sm text-outline">
                    {(product.costPrice).toLocaleString()} Mt
                  </td>
                  <td className="px-6 py-5 font-data-tabular text-sm font-bold text-primary">
                    {(product.sellingPrice).toLocaleString()} Mt
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-data-tabular text-sm">{product.stock} units</span>
                      <span className="font-label-caps text-[9px] text-secondary">{product.stock} available</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${product.stock > product.reorderLevel ? 'bg-secondary-container/20 text-secondary' :
                      product.stock > 0 ? 'bg-primary-fixed/30 text-primary' :
                        'bg-error-container/30 text-error'
                      }`}>
                      {product.stock > product.reorderLevel ? 'In Stock' : (product.stock > 0 ? 'Low Stock' : 'Out of Stock')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(product); }}
                        className="p-2 hover:bg-primary/10 rounded-full text-outline hover:text-primary transition-colors"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                        className="p-2 hover:bg-primary/10 rounded-full text-outline hover:text-primary transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-8 py-4 bg-primary/5 flex justify-between items-center border-t border-primary/10">
          <p className="font-label-caps text-[10px] text-outline">Showing {filteredProducts.length} of {products.length} pieces</p>
          <div className="flex gap-2">
            <button className="px-4 py-1 border border-primary/20 rounded-lg text-primary font-label-caps text-[10px] hover:bg-white transition-all">PREVIOUS</button>
            <button className="px-4 py-1 border border-primary/20 rounded-lg text-primary font-label-caps text-[10px] hover:bg-white transition-all">NEXT</button>
          </div>
        </div>
      </section>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-end p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl h-full bg-surface-container overflow-y-auto shadow-2xl rounded-l-3xl md:rounded-3xl border-l border-white/40"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-surface-container/80 backdrop-blur-md p-8 flex justify-between items-start border-b border-outline-variant/30">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-xl">
                    <img src={selectedProduct.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="font-headline-md text-2xl text-primary">{selectedProduct.name}</h2>
                    <p className="font-label-caps text-xs text-outline">{selectedProduct.code} • {selectedProduct.category.toUpperCase()}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">PREMIUM COLLECTION</span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary text-[10px] font-bold">CERTIFIED</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 hover:bg-primary/5 rounded-full text-outline transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-10">
                {/* Basic Info & Specifics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-label-caps text-[11px] text-outline mb-3 flex items-center gap-2">
                        <ImageIcon size={14} /> BASIC INFO
                      </h4>
                      <div className="space-y-3 bg-white/40 p-4 rounded-2xl border border-white/60">
                        <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                          <span className="font-body-md text-sm text-on-surface-variant">Brand</span>
                          <span className="font-body-md text-sm font-bold">{selectedProduct.brand}</span>
                        </div>
                        <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                          <span className="font-body-md text-sm text-on-surface-variant">Category</span>
                          <span className="font-body-md text-sm font-bold">{selectedProduct.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-body-md text-sm text-on-surface-variant">Added Date</span>
                          <span className="font-body-md text-sm font-bold">{selectedProduct.addedDate}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-label-caps text-[11px] text-outline mb-3 flex items-center gap-2">
                        <ShieldCheck size={14} /> JEWELRY SPECIFIC
                      </h4>
                      <div className="bg-atelier-gradient p-5 rounded-2xl border border-primary/10 text-primary">
                        <p className="font-label-caps text-[10px] opacity-70">METAL & PURITY</p>
                        <p className="font-headline-md text-xl">{selectedProduct.goldPurity}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-label-caps text-[11px] text-outline mb-3 flex items-center gap-2">
                        <DollarSign size={14} /> FINANCIAL DATA
                      </h4>
                      <div className="space-y-3 bg-white/40 p-4 rounded-2xl border border-white/60">
                        <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                          <span className="font-body-md text-sm text-on-surface-variant">Cost Price</span>
                          <span className="font-data-tabular text-sm">{(selectedProduct.costPrice).toLocaleString()} Mt</span>
                        </div>
                        <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                          <span className="font-body-md text-sm text-on-surface-variant">Selling Price</span>
                          <span className="font-data-tabular text-sm font-bold text-primary">{(selectedProduct.sellingPrice).toLocaleString()} Mt</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="font-body-md text-sm text-on-surface-variant">Profit Margin</span>
                          <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-lg font-bold text-xs">
                            {(((selectedProduct.sellingPrice - selectedProduct.costPrice) / selectedProduct.sellingPrice) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Info */}
                <div>
                  <h4 className="font-label-caps text-[11px] text-outline mb-4 flex items-center gap-2">
                    <Box size={14} /> STOCK LEVELS
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm text-center">
                      <p className="font-label-caps text-[10px] text-outline mb-1">TOTAL</p>
                      <p className="font-headline-md text-2xl text-on-surface">{selectedProduct.stock}</p>
                    </div>
                    <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm text-center">
                      <p className="font-label-caps text-[10px] text-outline mb-1">STATUS</p>
                      <p className="font-headline-md text-sm text-secondary">{selectedProduct.stock > selectedProduct.reorderLevel ? 'STOCK OK' : 'LOW STOCK'}</p>
                    </div>
                    <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm text-center opacity-40">
                      <p className="font-label-caps text-[10px] text-outline mb-1">RESERVED</p>
                      <p className="font-headline-md text-2xl text-primary">0</p>
                    </div>
                    <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm text-center opacity-40">
                      <p className="font-label-caps text-[10px] text-outline mb-1">DAMAGED</p>
                      <p className="font-headline-md text-2xl text-error">0</p>
                    </div>
                  </div>
                </div>

                {/* Photos Grid */}
                <div>
                  <h4 className="font-label-caps text-[11px] text-outline mb-4 flex items-center gap-2">
                    <ImageIcon size={14} /> PRODUCT MEDIA
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[selectedProduct.imageUrl].filter(Boolean).map((photo: any, i: number) => (
                      <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-white shadow-md hover:scale-[1.02] transition-all cursor-zoom-in">
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <button className="aspect-square rounded-2xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-outline hover:bg-white/20 transition-all">
                      <Plus size={24} />
                      <span className="font-label-caps text-[9px] mt-2">ADD PHOTO</span>
                    </button>
                  </div>
                </div>

                {/* History/Timeline */}
                <div>
                  <h4 className="font-label-caps text-[11px] text-outline mb-4 flex items-center gap-2">
                    <History size={14} /> MOVEMENT HISTORY
                  </h4>
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start relative pb-6 border-l border-outline-variant/30 ml-2 pl-6">
                      <div className="absolute top-0 -left-1.5 w-3 h-3 rounded-full bg-secondary"></div>
                      <div>
                        <p className="font-body-md text-sm font-bold">Stock Out - Sale (#INV-92841)</p>
                        <p className="font-data-tabular text-[10px] text-outline">12 Oct 2023 • 14:22</p>
                        <p className="font-body-md text-xs mt-1 text-on-surface-variant">Sold to Eleanor Vance • -1 unit</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start relative pb-2 border-l border-transparent ml-2 pl-6">
                      <div className="absolute top-0 -left-1.5 w-3 h-3 rounded-full bg-outline"></div>
                      <div>
                        <p className="font-body-md text-sm font-bold">Stock In - Manual Addition</p>
                        <p className="font-data-tabular text-[10px] text-outline">15 Jan 2023 • 09:15</p>
                        <p className="font-body-md text-xs mt-1 text-on-surface-variant">Initial stock entry • +13 units</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-outline-variant/30">
                  <button
                    onClick={() => handleOpenEdit(selectedProduct)}
                    className="flex-1 py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-xs shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
                    <History size={16} /> Edit Piece Details
                  </button>
                  <button
                    onClick={() => handleDelete(selectedProduct._id)}
                    className="flex-1 py-4 bg-white border border-error/30 text-error rounded-2xl font-label-caps text-xs hover:bg-error/5 transition-all uppercase tracking-widest"
                  >
                    Permanent Removal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Product Drawer */}
      <AnimatePresence>
        {isAddingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingProduct(false)}
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
                  onClick={() => setIsAddingProduct(false)}
                  className="absolute top-6 right-6 p-2 bg-white/40 backdrop-blur-md rounded-full text-primary hover:bg-white transition-all shadow-sm"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mt-4">
                  <div className="w-20 h-20 bg-white/40 backdrop-blur-md rounded-3xl border-2 border-white flex items-center justify-center text-primary shadow-xl mb-4 group cursor-pointer hover:bg-white transition-all">
                    <Camera size={32} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <h2 className="font-headline-md text-3xl text-primary uppercase tracking-tight">
                    {editingId ? 'Update Piece Integrity' : 'New Piece Acquisition'}
                  </h2>
                  <p className="font-label-caps text-[10px] text-outline mt-2 tracking-[0.2em]">REGISTER TO THE ROYAL VAULT</p>
                </div>
              </div>

              {/* Form Content */}
              <form className="flex-1 p-8 space-y-10" onSubmit={handleSubmit}>
                {/* Basic Identification */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    <h4 className="font-label-caps text-[11px] text-primary tracking-widest">PRODUCT IDENTITY</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-1.5">
                        <label className="font-label-caps text-[9px] text-outline ml-1">PIECE NAME</label>
                        <input
                          type="text"
                          placeholder="e.g. Diamond Drop Earrings"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-label-caps text-[9px] text-outline ml-1">PIECE CODE (SKU)</label>
                        <input
                          type="text"
                          placeholder="VAULT-..."
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl text-xs font-bold text-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-label-caps text-[9px] text-outline ml-1">CATEGORY</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl text-xs font-bold text-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm appearance-none"
                        >
                          <option value="Earrings">EARRINGS</option>
                          <option value="Bracelets">BRACELETS</option>
                          <option value="Charms">CHARMS</option>
                          <option value="Piercings">PIERCINGS</option>
                          <option value="Necklaces">NECKLACES</option>
                          <option value="Necklace & Earring Sets">NECKLACE & EARRING SETS</option>
                          <option value="Watches">WATCHES</option>
                          <option value="Rings">RINGS</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-label-caps text-[9px] text-outline ml-1">PIECE DESCRIPTION</label>
                        <input
                          type="text"
                          placeholder="Brief stylistic details"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Jewelry Specs */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-secondary rounded-full"></div>
                    <h4 className="font-label-caps text-[11px] text-secondary tracking-widest">JEWELRY SPECIFICATIONS</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">MATERIAL</label>
                      <div className="relative">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
                        <input
                          type="text"
                          placeholder="e.g. 18K Rose Gold"
                          className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>

                  </div>
                </section>

                {/* Financials */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-tertiary rounded-full"></div>
                    <h4 className="font-label-caps text-[11px] text-tertiary tracking-widest">FINANCIAL VALUATION</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">COST PRICE (Mt)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl font-data-tabular text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-label-caps text-[9px] text-outline ml-1">SELLING PRICE (Mt)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl font-data-tabular text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-secondary/5 rounded-2xl border border-secondary/10 flex justify-between items-center">
                    <span className="font-label-caps text-[10px] text-secondary font-bold">ESTIMATED MARGIN</span>
                    <span className="font-data-tabular text-sm font-bold text-secondary">
                      {estimatedMargin.toFixed(1)}%
                    </span>
                  </div>
                </section>

                {/* Stock Control */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-outline rounded-full"></div>
                    <h4 className="font-label-caps text-[11px] text-outline tracking-widest">INITIAL STOCK CONTROL</h4>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label-caps text-[9px] text-outline ml-1 text-center block">TOTAL STOCK</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl font-data-tabular text-sm text-center focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label-caps text-[9px] text-outline ml-1 text-center block">REORDER LEVEL</label>
                    <input
                      type="number"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-xl font-data-tabular text-sm text-center focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                      required
                    />
                  </div>
                  <div className="flex flex-col justify-center items-center">
                    <label className="font-label-caps text-[9px] text-outline mb-2">ARCHIVED</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, archived: !formData.archived })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${formData.archived ? 'bg-error' : 'bg-outline-variant'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.archived ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </section>
              </form>

              {/* Drawer Footer Actions */}
              <div className="p-8 border-t border-outline-variant/30 bg-white/20 sticky bottom-0">
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsAddingProduct(false)}
                    className="flex-1 py-4 bg-white border border-outline-variant/30 text-outline rounded-2xl font-label-caps text-[11px] hover:bg-surface-variant transition-all uppercase tracking-widest"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    className="flex-[2] py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
                    <Check size={16} /> {editingId ? 'Update Piece' : 'Register Piece'}
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

