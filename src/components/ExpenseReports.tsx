'use client';

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { BarChart, Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-MZ', { style: 'currency', currency: 'MZN' })
    .format(val)
    .replace('MZN', 'Mt');

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const KPICard = ({ title, value, colorClass, icon: Icon }: any) => (
  <div className="p-6 rounded-3xl border border-white/50 bg-white/40 backdrop-blur-md shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${colorClass}`}>
      <Icon size={18} />
    </div>
    <p className="text-[10px] font-label-caps text-outline uppercase tracking-widest">{title}</p>
    <h3 className="text-2xl font-headline-md text-primary mt-1">{value}</h3>
  </div>
);

export default function ExpenseReports() {
  const [month, setMonth] = useState(currentMonthKey());

  const report = useQuery(api.expenses.getMonthlyReport, { month });

  const handleExportExcel = () => {
    if (!report) return;

    const { summary, byCategory, paidVsPending, recurringVsManual, cashFlow, rows } = report;

    const summarySheet: any[][] = [
      [`RELATÓRIO DE DESPESAS - ${month}`],
      [],
      ['RESUMO'],
      ['Total de Despesas', summary.totalCount],
      ['Valor Pago', summary.paidAmount],
      ['Valor Pendente', summary.pendingAmount],
      ['Valor em Atraso', summary.overdueAmount],
      ['Valor Total', summary.totalAmount],
      [],
      ['ESTADO'],
      ['Pagas', paidVsPending.paidCount],
      ['Pendentes', paidVsPending.pendingCount],
      ['Em Atraso', paidVsPending.overdueCount],
      ['Canceladas', paidVsPending.cancelledCount],
      [],
      ['ORIGEM'],
      ['Recorrentes', recurringVsManual.recurringCount],
      ['Manuais', recurringVsManual.manualCount],
      [],
      ['POR CATEGORIA'],
      ['Categoria', 'Valor'],
      ...Object.entries(byCategory).map(([cat, amount]) => [cat, amount]),
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheet);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

    const rowsData: any[][] = [
      ['Título', 'Categoria', 'Valor', 'Data de Vencimento', 'Estado', 'Origem', 'Método de Pagamento', 'Data de Pagamento'],
      ...rows.map((r: any) => [
        r.title,
        r.category,
        r.amount,
        new Date(r.dueDate).toLocaleDateString('pt-PT'),
        r.status,
        r.origin,
        r.paymentMethod || '-',
        r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('pt-PT') : '-',
      ]),
    ];
    const wsRows = XLSX.utils.aoa_to_sheet(rowsData);
    wsRows['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsRows, 'Despesas');

    const cashFlowData: any[][] = [
      ['Data de Pagamento', 'Título', 'Categoria', 'Valor', 'Método de Pagamento'],
      ...cashFlow.map((c: any) => [
        c.paymentDate ? new Date(c.paymentDate).toLocaleDateString('pt-PT') : '-',
        c.title,
        c.category,
        c.amount,
        c.paymentMethod || '-',
      ]),
    ];
    const wsCashFlow = XLSX.utils.aoa_to_sheet(cashFlowData);
    wsCashFlow['!cols'] = [{ wch: 16 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsCashFlow, 'Fluxo de Caixa');

    XLSX.writeFile(wb, `Relatorio_Despesas_${month}.xlsx`);
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
        <div>
          <h1 className="font-headline-lg text-4xl text-primary mb-2 flex items-center gap-3">
            <BarChart className="text-primary" size={32} />
            Expense Reports
          </h1>
          <p className="font-body-md text-on-surface-variant max-w-xl">
            Monthly breakdown of expenses, payments, and cash flow.
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="pl-9 pr-4 py-3 rounded-2xl text-xs bg-white/60 border border-primary/10 focus:ring-2 focus:ring-primary/20 outline-none font-label-caps cursor-pointer shadow-sm"
            />
          </div>
          <button
            onClick={handleExportExcel}
            disabled={!report}
            className="px-6 py-3 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <Download size={16} /> EXPORT EXCEL
          </button>
        </div>
      </div>

      {!report ? (
        <div className="p-12 text-center text-outline">Loading report...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <KPICard title="Total Expenses" value={formatCurrency(report.summary.totalAmount)} icon={BarChart} colorClass="bg-primary/10 text-primary" />
            <KPICard title="Paid" value={formatCurrency(report.summary.paidAmount)} icon={BarChart} colorClass="bg-emerald-100 text-emerald-700" />
            <KPICard title="Pending" value={formatCurrency(report.summary.pendingAmount)} icon={BarChart} colorClass="bg-amber-100 text-amber-700" />
            <KPICard title="Overdue" value={formatCurrency(report.summary.overdueAmount)} icon={BarChart} colorClass="bg-rose-100 text-rose-700" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <div className="glass-panel rounded-3xl p-6 border border-white/50 shadow-sm">
              <h3 className="font-headline-md text-lg text-primary mb-4">By Category</h3>
              {Object.entries(report.byCategory).filter(([, v]) => (v as number) > 0).length === 0 ? (
                <p className="text-outline text-sm">No expenses this month.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(report.byCategory)
                    .filter(([, v]) => (v as number) > 0)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([cat, val]) => (
                      <div key={cat} className="flex justify-between text-sm py-2 border-b border-primary/5">
                        <span className="text-on-surface-variant">{cat}</span>
                        <span className="font-data-tabular font-bold text-primary">{formatCurrency(val as number)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="glass-panel rounded-3xl p-6 border border-white/50 shadow-sm">
              <h3 className="font-headline-md text-lg text-primary mb-4">Breakdown</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-primary/5 rounded-xl">
                  <p className="text-[9px] font-label-caps text-outline">PAID</p>
                  <p className="font-bold text-lg text-primary">{report.paidVsPending.paidCount}</p>
                </div>
                <div className="p-3 bg-primary/5 rounded-xl">
                  <p className="text-[9px] font-label-caps text-outline">PENDING</p>
                  <p className="font-bold text-lg text-primary">{report.paidVsPending.pendingCount}</p>
                </div>
                <div className="p-3 bg-primary/5 rounded-xl">
                  <p className="text-[9px] font-label-caps text-outline">OVERDUE</p>
                  <p className="font-bold text-lg text-primary">{report.paidVsPending.overdueCount}</p>
                </div>
                <div className="p-3 bg-primary/5 rounded-xl">
                  <p className="text-[9px] font-label-caps text-outline">CANCELLED</p>
                  <p className="font-bold text-lg text-primary">{report.paidVsPending.cancelledCount}</p>
                </div>
                <div className="p-3 bg-secondary/5 rounded-xl col-span-2 flex justify-between items-center">
                  <span className="text-[9px] font-label-caps text-outline">RECURRING VS MANUAL</span>
                  <span className="font-bold text-sm text-primary">
                    {report.recurringVsManual.recurringCount} / {report.recurringVsManual.manualCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden border border-white/50 shadow-sm">
            <div className="p-6 border-b border-primary/10 bg-white/40">
              <h3 className="font-headline-md text-lg text-primary">Expenses this Month</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-white/90 text-[10px] font-label-caps text-outline uppercase">
                  <tr>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Origin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {report.rows.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-outline">No expenses found for this month.</td></tr>
                  ) : report.rows.map((r: any) => (
                    <tr key={r._id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 font-body-md font-bold text-primary">{r.title}</td>
                      <td className="px-6 py-4 text-xs text-outline">{r.category}</td>
                      <td className="px-6 py-4 font-data-tabular text-xs">{new Date(r.dueDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right font-data-tabular font-bold">{formatCurrency(r.amount)}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider bg-surface border border-primary/10 text-outline">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-outline">{r.origin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
