import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api.ts';
import { useAuthStore } from '../stores/authStore.ts';
import {
  downloadVatReturnPdf,
  exportToCsv,
  formatCurrency,
  formatDate,
} from '../lib/formatters.ts';
import {
  Button,
  Card,
  SkeletonCard,
  SkeletonTable,
} from '../components/ui/Primitives.tsx';
import type { Client } from '../../shared/types.ts';

type ReportTab = 'revenue' | 'vat' | 'aging' | 'clients';

export default function Reports({ defaultTab = 'revenue' }: { defaultTab?: ReportTab }) {
  const { company } = useAuthStore();
  const [tab, setTab] = useState<ReportTab>(defaultTab);
  const [revPeriod, setRevPeriod] = useState<'month' | 'quarter' | 'year'>('year');
  const [vatPeriod, setVatPeriod] = useState<'month' | 'quarter'>('quarter');

  const { data: revData, isLoading: revLoading } = useQuery({
    queryKey: ['report-revenue', revPeriod],
    enabled: tab === 'revenue',
    queryFn: () =>
      api.get<{
        success: boolean;
        data: {
          totals: {
            grossRevenue: number;
            vatCollected: number;
            netRevenue: number;
            collected: number;
          };
          breakdown: {
            month: string;
            invoiceCount: number;
            netRevenue: number;
            vatCollected: number;
            grossRevenue: number;
            collected: number;
          }[];
        };
      }>(`/api/reports/revenue?period=${revPeriod}`),
  });

  const { data: vatData, isLoading: vatLoading } = useQuery({
    queryKey: ['report-vat', vatPeriod],
    enabled: tab === 'vat',
    queryFn: () =>
      api.get<{
        success: boolean;
        data: {
          period: string;
          periodStart: string;
          periodEnd: string;
          invoiceCount: number;
          creditNoteCount: number;
          grossOutputVat: number;
          creditNoteVatAdjustment: number;
          outputVat: number;
          inputVat: number;
          netVatPayable: number;
          categories: {
            category: string;
            label: string;
            taxableAmount: number;
            vatAmount: number;
          }[];
        };
      }>(`/api/reports/vat-summary?period=${vatPeriod}`),
  });

  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ['report-aging'],
    enabled: tab === 'aging',
    queryFn: () =>
      api.get<{
        success: boolean;
        data: {
          summary: {
            current: number;
            days1to30: number;
            days31to60: number;
            days61to90: number;
            days90plus: number;
            total: number;
          };
          rows: {
            clientId: string;
            clientName: string;
            current: number;
            days1to30: number;
            days31to60: number;
            days61to90: number;
            days90plus: number;
            total: number;
          }[];
        };
      }>('/api/reports/aging'),
  });

  const { data: topClientsData, isLoading: topLoading } = useQuery({
    queryKey: ['report-top-clients'],
    enabled: tab === 'clients',
    queryFn: () =>
      api.get<{ success: boolean; data: Client[] }>('/api/reports/top-clients'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1C1917]">
          {tab === 'vat' ? 'VAT Summary (FTA VAT 201)' : 'Financial Reports'}
        </h1>
        <p className="text-sm text-[#78716C] mt-0.5">
          Instant revenue breakdowns, FTA VAT 201 return summaries, and receivable aging.
        </p>
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E7E5E4]">
        {(
          [
            { id: 'revenue', label: 'Revenue Report' },
            { id: 'vat', label: 'VAT Summary' },
            { id: 'aging', label: 'A/R Aging' },
            { id: 'clients', label: 'Top Clients' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              tab === t.id
                ? 'border-[#F26522] text-[#F26522]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: REVENUE */}
      {tab === 'revenue' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center p-1 bg-[#F5F5F4] rounded-md">
              {(
                [
                  { id: 'month', label: 'This Month' },
                  { id: 'quarter', label: 'Quarter' },
                  { id: 'year', label: '6 Months' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setRevPeriod(p.id)}
                  className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                    revPeriod === p.id
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (!revData?.data) return;
                exportToCsv(
                  'inbox-invoice-revenue-report.csv',
                  ['Month', 'Invoices', 'Net Revenue (AED)', 'VAT Collected (AED)', 'Gross Revenue (AED)', 'Collected (AED)'],
                  revData.data.breakdown.map((b) => [
                    b.month,
                    b.invoiceCount,
                    b.netRevenue.toFixed(2),
                    b.vatCollected.toFixed(2),
                    b.grossRevenue.toFixed(2),
                    b.collected.toFixed(2),
                  ])
                );
                toast.success('Revenue report exported');
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>

          {revLoading || !revData?.data ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5">
                  <p className="text-xs font-medium text-[#78716C]">Total Gross Revenue</p>
                  <p className="text-2xl font-bold text-[#1C1917] tabular-nums mt-1.5">
                    {formatCurrency(revData.data.totals.grossRevenue)}
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-xs font-medium text-[#78716C]">Net Revenue (Excl. VAT)</p>
                  <p className="text-2xl font-bold text-[#1C1917] tabular-nums mt-1.5">
                    {formatCurrency(revData.data.totals.netRevenue)}
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-xs font-medium text-[#78716C]">Total VAT Collected</p>
                  <p className="text-2xl font-bold text-[#F26522] tabular-nums mt-1.5">
                    {formatCurrency(revData.data.totals.vatCollected)}
                  </p>
                </Card>
              </div>

              <Card className="p-6">
                <h2 className="text-sm font-semibold text-[#1C1917] mb-4">
                  Monthly Revenue Breakdown
                </h2>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revData.data.breakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EEEC" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: '#78716C', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#78716C', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                      <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0))} />
                      <Bar dataKey="netRevenue" name="Net Revenue" fill="#F26522" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="vatCollected" name="VAT (5%)" fill="#FDBA74" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FAFAF9] text-[#78716C] text-xs uppercase border-b border-[#E7E5E4]">
                      <th className="py-3 px-5">Month</th>
                      <th className="py-3 px-4 text-right">Invoices</th>
                      <th className="py-3 px-4 text-right">Net Revenue</th>
                      <th className="py-3 px-4 text-right">VAT Collected</th>
                      <th className="py-3 px-5 text-right">Gross Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EEEC]">
                    {revData.data.breakdown.map((row) => (
                      <tr key={row.month} className="h-[48px]">
                        <td className="px-5 font-medium">{row.month}</td>
                        <td className="px-4 text-right tabular-nums text-[#78716C]">{row.invoiceCount}</td>
                        <td className="px-4 text-right tabular-nums">{formatCurrency(row.netRevenue)}</td>
                        <td className="px-4 text-right tabular-nums text-[#78716C]">{formatCurrency(row.vatCollected)}</td>
                        <td className="px-5 text-right font-semibold tabular-nums">{formatCurrency(row.grossRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 2: VAT SUMMARY */}
      {tab === 'vat' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center p-1 bg-[#F5F5F4] rounded-md">
              {(['month', 'quarter'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setVatPeriod(p)}
                  className={`px-3 py-1 rounded text-xs font-medium capitalize cursor-pointer ${
                    vatPeriod === p
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  {p === 'month' ? 'Monthly' : 'Quarterly'}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              onClick={() => {
                if (!vatData?.data || !company) return;
                downloadVatReturnPdf(company, vatData.data);
                toast.success('Exported FTA VAT 201 return summary PDF');
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Export for VAT 201 Return
            </Button>
          </div>

          {vatLoading || !vatData?.data ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5">
                  <p className="text-xs font-medium text-[#78716C]">Output VAT (Net of Credit Notes)</p>
                  <p className="text-2xl font-bold text-[#1C1917] tabular-nums mt-1.5">
                    {formatCurrency(vatData.data.outputVat)}
                  </p>
                  <p className="text-xs text-[#A8A29E] mt-1">
                    {formatDate(vatData.data.periodStart)} – {formatDate(vatData.data.periodEnd)}
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-xs font-medium text-[#78716C]">Input VAT (Purchases)</p>
                  <p className="text-2xl font-bold text-[#78716C] tabular-nums mt-1.5">
                    {formatCurrency(vatData.data.inputVat)}
                  </p>
                  <p className="text-xs text-[#A8A29E] mt-1">Supplier bills module coming soon</p>
                </Card>
                <Card className="p-5 border-[#F26522]/40 bg-[#FFF3ED]/40">
                  <p className="text-xs font-semibold text-[#F26522]">Net VAT Payable to FTA</p>
                  <p className="text-2xl font-bold text-[#1C1917] tabular-nums mt-1.5">
                    {formatCurrency(vatData.data.netVatPayable)}
                  </p>
                  <p className="text-xs text-[#78716C] mt-1">
                    {vatData.data.invoiceCount} tax invoices · {vatData.data.creditNoteCount} credit notes
                  </p>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-[#F0EEEC]">
                  <h2 className="text-sm font-semibold text-[#1C1917]">
                    Breakdown by UAE VAT Category
                  </h2>
                </div>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FAFAF9] text-[#78716C] text-xs uppercase border-b border-[#E7E5E4]">
                      <th className="py-3 px-5">VAT Schedule</th>
                      <th className="py-3 px-4 text-right">Taxable Amount (AED)</th>
                      <th className="py-3 px-5 text-right">VAT Amount (AED)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EEEC]">
                    {vatData.data.categories.map((cat) => (
                      <tr key={cat.category} className="h-[48px]">
                        <td className="px-5 font-medium text-[#1C1917]">{cat.label}</td>
                        <td className="px-4 text-right tabular-nums">
                          {formatCurrency(cat.taxableAmount)}
                        </td>
                        <td className="px-5 text-right font-semibold tabular-nums">
                          {formatCurrency(cat.vatAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 3: AGING */}
      {tab === 'aging' && (
        <div className="space-y-6">
          {agingLoading || !agingData?.data ? (
            <Card>
              <SkeletonTable rows={4} cols={6} />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Current', val: agingData.data.summary.current },
                  { label: '1–30 Days', val: agingData.data.summary.days1to30 },
                  { label: '31–60 Days', val: agingData.data.summary.days31to60 },
                  { label: '61–90 Days', val: agingData.data.summary.days61to90 },
                  { label: '90+ Days', val: agingData.data.summary.days90plus },
                  { label: 'Total A/R', val: agingData.data.summary.total, highlight: true },
                ].map((b) => (
                  <Card
                    key={b.label}
                    className={`p-4 ${b.highlight ? 'border-[#F26522]/40 bg-[#FFF3ED]/40' : ''}`}
                  >
                    <p className="text-xs text-[#78716C]">{b.label}</p>
                    <p className="text-base font-bold text-[#1C1917] tabular-nums mt-1">
                      {formatCurrency(b.val)}
                    </p>
                  </Card>
                ))}
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#FAFAF9] text-[#78716C] text-xs uppercase border-b border-[#E7E5E4]">
                        <th className="py-3 px-5">Client</th>
                        <th className="py-3 px-3 text-right">Current</th>
                        <th className="py-3 px-3 text-right">1–30</th>
                        <th className="py-3 px-3 text-right">31–60</th>
                        <th className="py-3 px-3 text-right">61–90</th>
                        <th className="py-3 px-3 text-right">90+</th>
                        <th className="py-3 px-5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EEEC]">
                      {agingData.data.rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-[#78716C]">
                            No open receivables.
                          </td>
                        </tr>
                      ) : (
                        agingData.data.rows.map((r) => (
                          <tr key={r.clientId} className="h-[48px]">
                            <td className="px-5 font-medium text-[#1C1917]">{r.clientName}</td>
                            <td className="px-3 text-right tabular-nums text-xs">{formatCurrency(r.current)}</td>
                            <td className="px-3 text-right tabular-nums text-xs">{formatCurrency(r.days1to30)}</td>
                            <td className="px-3 text-right tabular-nums text-xs">{formatCurrency(r.days31to60)}</td>
                            <td className="px-3 text-right tabular-nums text-xs">{formatCurrency(r.days61to90)}</td>
                            <td className="px-3 text-right tabular-nums text-xs text-[#DC2626]">{formatCurrency(r.days90plus)}</td>
                            <td className="px-5 text-right font-semibold tabular-nums">{formatCurrency(r.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 4: TOP CLIENTS */}
      {tab === 'clients' && (
        <div className="space-y-6">
          {topLoading || !topClientsData?.data ? (
            <Card>
              <SkeletonTable rows={5} cols={5} />
            </Card>
          ) : (
            <>
              <Card className="p-6">
                <h2 className="text-sm font-semibold text-[#1C1917] mb-4">
                  Top Clients by Total Billed Revenue (AED)
                </h2>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topClientsData.data}
                      layout="vertical"
                      margin={{ left: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EEEC" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#78716C', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                      <YAxis type="category" dataKey="nameEn" width={150} tick={{ fill: '#1C1917', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0))} />
                      <Bar dataKey="totalBilled" name="Total Billed" fill="#F26522" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FAFAF9] text-[#78716C] text-xs uppercase border-b border-[#E7E5E4]">
                      <th className="py-3 px-5">Client</th>
                      <th className="py-3 px-4 text-right">Invoices</th>
                      <th className="py-3 px-4 text-right">Total Billed</th>
                      <th className="py-3 px-4 text-right">Total Paid</th>
                      <th className="py-3 px-5 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EEEC]">
                    {topClientsData.data.map((c) => (
                      <tr key={c.id} className="h-[48px]">
                        <td className="px-5 font-medium text-[#1C1917]">{c.nameEn}</td>
                        <td className="px-4 text-right tabular-nums text-[#78716C]">{c.invoiceCount || 0}</td>
                        <td className="px-4 text-right font-semibold tabular-nums">{formatCurrency(c.totalBilled || 0)}</td>
                        <td className="px-4 text-right text-[#16A34A] tabular-nums">{formatCurrency(c.totalPaid || 0)}</td>
                        <td className="px-5 text-right text-[#F26522] tabular-nums">{formatCurrency(c.outstanding || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
