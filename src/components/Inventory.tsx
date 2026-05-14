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
  ShieldCheck
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

// --- Mock Data ---

const MOCK_INVENTORY: InventoryProduct[] = [
  {
    id: 'PRD-001',
    name: 'Solitaire Eternity Ring',
    category: 'Rings',
    brand: 'Celestial Aura',
    goldPurity: '18K Rose Gold',
    costPrice: 8500,
    sellingPrice: 12400,
    quantity: { current: 12, reserved: 2, damaged: 0, available: 10 },
    status: 'In Stock',
    photos: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=400'],
    addedDate: '2023-01-15',
    lastMovement: '2023-10-12'
  },
  {
    id: 'PRD-002',
    name: 'Cuban Link Bracelet',
    category: 'Bracelets',
    brand: 'Timeless Gold',
    goldPurity: '18K Yellow Gold',
    costPrice: 3200,
    sellingPrice: 4950,
    quantity: { current: 3, reserved: 1, damaged: 0, available: 2 },
    status: 'Low Stock',
    photos: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400'],
    addedDate: '2023-02-20',
    lastMovement: '2023-10-11'
  },
  {
    id: 'PRD-003',
    name: 'Arctic Frost Necklace',
    category: 'Necklaces',
    brand: 'Arctic Frost',
    goldPurity: 'Platinum',
    costPrice: 15000,
    sellingPrice: 24100,
    quantity: { current: 5, reserved: 0, damaged: 0, available: 5 },
    status: 'In Stock',
    photos: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=400'],
    addedDate: '2023-03-10',
    lastMovement: '2023-10-10'
  },
  {
    id: 'PRD-004',
    name: 'Vintage Chronograph',
    category: 'Watches',
    brand: 'Horology Heritage',
    goldPurity: 'Stainless Steel',
    costPrice: 12000,
    sellingPrice: 18500,
    quantity: { current: 2, reserved: 1, damaged: 1, available: 0 },
    status: 'Out of Stock',
    photos: ['https://images.unsplash.com/photo-1524592091214-8c97afad3d3a?auto=format&fit=crop&q=80&w=400'],
    addedDate: '2022-11-05',
    lastMovement: '2023-09-28'
  },
  {
    id: 'PRD-005',
    name: 'Diamond Drop Earrings',
    category: 'Earrings',
    brand: 'Celestial Aura',
    goldPurity: '14K White Gold',
    costPrice: 4500,
    sellingPrice: 7200,
    quantity: { current: 15, reserved: 3, damaged: 0, available: 12 },
    status: 'In Stock',
    photos: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=400'],
    addedDate: '2023-05-22',
    lastMovement: '2023-10-05'
  },
  {
    id: 'PRD-006',
    name: 'Emerald Heritage Ring',
    category: 'Rings',
    brand: 'Horology Heritage',
    goldPurity: '18K Yellow Gold',
    costPrice: 9200,
    sellingPrice: 15800,
    quantity: { current: 1, reserved: 0, damaged: 0, available: 1 },
    status: 'Dead Stock',
    photos: ['https://images.unsplash.com/photo-1603561591411-0e7045c97e4a?auto=format&fit=crop&q=80&w=400'],
    addedDate: '2022-06-12',
    lastMovement: '2022-12-15'
  }
];

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
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Calculations
  const stats = useMemo(() => {
    const totalValue = MOCK_INVENTORY.reduce((acc, curr) => acc + (curr.costPrice * curr.quantity.current), 0);
    const lowStock = MOCK_INVENTORY.filter(p => p.status === 'Low Stock').length;
    const outOfStock = MOCK_INVENTORY.filter(p => p.status === 'Out of Stock').length;
    const deadStock = MOCK_INVENTORY.filter(p => p.status === 'Dead Stock').length;
    const fastMoving = 3; // Mock value

    return { totalValue, lowStock, outOfStock, deadStock, fastMoving };
  }, []);

  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    MOCK_INVENTORY.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  const agingData = [
    { name: '0-30 Days', value: 45 },
    { name: '31-60 Days', value: 25 },
    { name: '61-90 Days', value: 15 },
    { name: '90+ Days', value: 15 },
  ];

  const filteredProducts = MOCK_INVENTORY.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const COLORS = ['#8a4853', '#735c00', '#6e5371', '#d7c1c3', '#857374'];

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
        <div className="flex items-center gap-3 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-white/60">
          <div className="flex flex-col px-4 border-r border-outline-variant/30">
            <span className="font-label-caps text-[9px] text-outline">STOCK ACCURACY</span>
            <span className="font-data-tabular text-sm text-primary font-bold">99.8%</span>
          </div>
          <div className="flex flex-col px-4">
            <span className="font-label-caps text-[9px] text-outline">LAST SYNC</span>
            <span className="font-data-tabular text-sm text-on-surface-variant">2 mins ago</span>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        <StatCard 
          title="TOTAL STOCK VALUE" 
          value={`${(stats.totalValue).toLocaleString()} Mt`} 
          subValue="Across 342 active pieces"
          icon={DollarSign}
          trend={4.2}
          color="primary"
        />
        <StatCard 
          title="LOW STOCK ITEMS" 
          value={stats.lowStock} 
          subValue="Requires immediate action"
          icon={AlertTriangle}
          trend={-12}
          color="secondary"
        />
        <StatCard 
          title="OUT OF STOCK" 
          value={stats.outOfStock} 
          subValue="Lost revenue potential"
          icon={Box}
          color="error"
        />
        <StatCard 
          title="DEAD STOCK" 
          value={stats.deadStock} 
          subValue="Idle capital > 180 days"
          icon={Clock}
          color="outline"
        />
        <StatCard 
          title="FAST MOVING" 
          value={stats.fastMoving} 
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
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
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
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
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
            * 15% of inventory has exceeded the 90-day retention threshold.
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
            {['All', 'Rings', 'Necklaces', 'Bracelets', 'Watches'].map(cat => (
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
                  key={product.id} 
                  className="hover:bg-white/50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-white bg-surface-container shadow-sm">
                        <img src={product.photos[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div>
                        <p className="font-body-md text-sm font-bold text-on-surface">{product.name}</p>
                        <p className="font-data-tabular text-[10px] text-outline">{product.id}</p>
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
                      <span className="font-data-tabular text-sm">{product.quantity.current} units</span>
                      <span className="font-label-caps text-[9px] text-secondary">{product.quantity.available} available</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      product.status === 'In Stock' ? 'bg-secondary-container/20 text-secondary' :
                      product.status === 'Low Stock' ? 'bg-primary-fixed/30 text-primary' :
                      product.status === 'Out of Stock' ? 'bg-error-container/30 text-error' :
                      'bg-outline/10 text-outline'
                    }`}>
                      {product.status}
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
        <div className="px-8 py-4 bg-primary/5 flex justify-between items-center border-t border-primary/10">
          <p className="font-label-caps text-[10px] text-outline">Showing {filteredProducts.length} of {MOCK_INVENTORY.length} pieces</p>
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
                    <img src={selectedProduct.photos[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="font-headline-md text-2xl text-primary">{selectedProduct.name}</h2>
                    <p className="font-label-caps text-xs text-outline">{selectedProduct.id} • {selectedProduct.category.toUpperCase()}</p>
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
                      <p className="font-headline-md text-2xl text-on-surface">{selectedProduct.quantity.current}</p>
                    </div>
                    <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm text-center">
                      <p className="font-label-caps text-[10px] text-outline mb-1">AVAILABLE</p>
                      <p className="font-headline-md text-2xl text-secondary">{selectedProduct.quantity.available}</p>
                    </div>
                    <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm text-center">
                      <p className="font-label-caps text-[10px] text-outline mb-1">RESERVED</p>
                      <p className="font-headline-md text-2xl text-primary">{selectedProduct.quantity.reserved}</p>
                    </div>
                    <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm text-center">
                      <p className="font-label-caps text-[10px] text-outline mb-1">DAMAGED</p>
                      <p className="font-headline-md text-2xl text-error">{selectedProduct.quantity.damaged}</p>
                    </div>
                  </div>
                </div>

                {/* Photos Grid */}
                <div>
                  <h4 className="font-label-caps text-[11px] text-outline mb-4 flex items-center gap-2">
                    <ImageIcon size={14} /> PRODUCT MEDIA
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedProduct.photos.map((photo, i) => (
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

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t border-outline-variant/30">
                  <button className="flex-1 py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-xs shadow-xl shadow-primary/20 hover:opacity-90 transition-all">
                    EDIT PRODUCT
                  </button>
                  <button className="flex-1 py-4 bg-white/60 border border-outline text-on-surface-variant rounded-2xl font-label-caps text-xs hover:bg-white transition-all">
                    ARCHIVE SKU
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

