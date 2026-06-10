'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Download, Calendar, BarChart, TrendingUp, AlertCircle, Search } from 'lucide-react';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-MZ', { style: 'currency', currency: 'MZN' })
    .format(val)
    .replace('MZN', 'Mt');

const formatDate = (ts: number) => {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function CaixaReports() {
  const [dateRange, setDateRange] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const filterParams = useMemo(() => {
    const now = new Date();
    if (dateRange === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return { startDate: start };
    }
    if (dateRange === 'YESTERDAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1;
      return { startDate: start, endDate: end };
    }
    if (dateRange === 'CUSTOM' && customStart && customEnd) {
      const start = new Date(customStart).getTime();
      const end = new Date(customEnd).getTime() + 86399999;
      return { startDate: start, endDate: end };
    }
    return {};
  }, [dateRange, customStart, customEnd]);

  const reports = useQuery(api.caixa.getCaixaReports, filterParams) || [];

  const kpis = useMemo(() => {
    let totalCashSales = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;
    let totalVariances = 0;

    reports.forEach(r => {
      totalCashSales += r.totalCashSales;
      totalCashIn += r.totalCashIn;
      totalCashOut += r.totalCashOut;
      if (r.variance) totalVariances += Math.abs(r.variance);
    });

    return {
      totalCashSales,
      totalCashIn,
      totalCashOut,
      totalVariances,
      numberOfSessions: reports.length,
      averageSessionValue: reports.length > 0 ? totalCashSales / reports.length : 0,
    };
  }, [reports]);

  const KPICard = ({ title, value, colorClass, icon: Icon }: any) => (
    <div className={`p-6 rounded-3xl border border-white/50 bg-white/40 backdrop-blur-md shadow-sm relative overflow-hidden group hover:shadow-xl transition-all`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${colorClass}`}>
        <Icon size={18} />
      </div>
      <p className="text-[10px] font-label-caps text-outline uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-headline-md text-primary mt-1">{value}</h3>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
        <div>
          <h1 className="font-headline-lg text-4xl text-primary mb-2 flex items-center gap-3">
            <BarChart className="text-primary" size={32} />
            Caixa Reports
          </h1>
          <p className="font-body-md text-on-surface-variant max-w-xl">
            Audit logs and summaries of cash register sessions.
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
          <select 
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="px-4 py-3 rounded-2xl text-xs bg-white/60 border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none font-label-caps cursor-pointer shadow-sm"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="CUSTOM">Custom Range</option>
          </select>
          {dateRange === 'CUSTOM' && (
            <>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-4 py-3 rounded-2xl text-xs bg-white/60 border border-primary/10 outline-none shadow-sm" />
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-4 py-3 rounded-2xl text-xs bg-white/60 border border-primary/10 outline-none shadow-sm" />
            </>
          )}
          <button className="px-6 py-3 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl hover:bg-primary/90 transition-all flex items-center gap-2">
            <Download size={16} /> EXPORT CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
        <KPICard title="Total Cash Sales" value={formatCurrency(kpis.totalCashSales)} icon={TrendingUp} colorClass="bg-emerald-100 text-emerald-700" />
        <KPICard title="Total Cash In" value={formatCurrency(kpis.totalCashIn)} icon={TrendingUp} colorClass="bg-blue-100 text-blue-700" />
        <KPICard title="Total Cash Out" value={formatCurrency(kpis.totalCashOut)} icon={TrendingUp} colorClass="bg-amber-100 text-amber-700" />
        <KPICard title="Total Variances" value={formatCurrency(kpis.totalVariances)} icon={AlertCircle} colorClass="bg-rose-100 text-rose-700" />
        <KPICard title="Total Sessions" value={kpis.numberOfSessions} icon={Calendar} colorClass="bg-purple-100 text-purple-700" />
        <KPICard title="Avg Session Value" value={formatCurrency(kpis.averageSessionValue)} icon={BarChart} colorClass="bg-primary/10 text-primary" />
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden border border-white/50 shadow-sm flex flex-col">
        <div className="p-6 border-b border-primary/10 bg-white/40">
          <h3 className="font-headline-md text-lg text-primary">Session History</h3>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-white/90 text-[10px] font-label-caps text-outline uppercase">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Opening</th>
                <th className="px-6 py-4 text-right">Cash Sales</th>
                <th className="px-6 py-4 text-right">Expected</th>
                <th className="px-6 py-4 text-right">Counted</th>
                <th className="px-6 py-4 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {reports.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-outline">No sessions found for this period.</td></tr>
              ) : reports.map((r) => (
                <tr key={r._id} className="hover:bg-white/40 transition-colors">
                  <td className="px-6 py-4 font-data-tabular text-xs text-primary font-bold">{formatDate(r.openedAt)}</td>
                  <td className="px-6 py-4 text-xs text-outline">{r.openedBy}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                      r.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-surface border border-primary/10 text-outline'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-data-tabular">{formatCurrency(r.openingAmount)}</td>
                  <td className="px-6 py-4 text-right font-data-tabular text-emerald-600 font-bold">{formatCurrency(r.totalCashSales)}</td>
                  <td className="px-6 py-4 text-right font-data-tabular">{formatCurrency(r.expectedCash)}</td>
                  <td className="px-6 py-4 text-right font-data-tabular">{r.countedCash !== undefined ? formatCurrency(r.countedCash) : '-'}</td>
                  <td className="px-6 py-4 text-right font-data-tabular font-bold">
                    {r.variance !== undefined ? (
                      <span className={Math.abs(r.variance) > 5 ? 'text-error' : 'text-emerald-600'}>
                        {formatCurrency(r.variance)}
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
