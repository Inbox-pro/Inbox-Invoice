import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Plus,
  ReceiptText,
  Send,
  UserPlus,
} from 'lucide-react';
import { api } from '../services/api.ts';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatRelativeTime,
} from '../lib/formatters.ts';
import {
  Button,
  Card,
  SkeletonCard,
  SkeletonTable,
  StatusBadge,
} from '../components/ui/Primitives.tsx';
import type { DashboardSummary } from '../../shared/types.ts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: DashboardSummary }>(
        '/api/reports/dashboard'
      );
      return res.data;
    },
  });

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-medium text-[#1C1917]">Unable to load dashboard metrics.</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const chartData = data ? data.revenueSeries[period] : [];
  const sparkData = data?.monthlySparkline || [];

  const getActivityIcon = (action: string) => {
    if (action.includes('payment')) return <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />;
    if (action.includes('sent')) return <Send className="w-4 h-4 text-[#F26522]" />;
    if (action.includes('client')) return <UserPlus className="w-4 h-4 text-[#2563EB]" />;
    return <FileText className="w-4 h-4 text-[#78716C]" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Dashboard</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Real-time UAE invoicing, receivables, and FTA compliance overview.
          </p>
        </div>
        <Button onClick={() => navigate('/invoices/new')}>
          <Plus className="w-4 h-4" />
          New Invoice
        </Button>
      </div>

      {/* Row 1: 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading || !data ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <Card className="p-5">
              <p className="text-sm font-medium text-[#78716C]">Total Revenue (This Month)</p>
              <p className="text-2xl sm:text-3xl font-semibold text-[#1C1917] tabular-nums mt-2">
                {formatCompactCurrency(data.totalRevenueThisMonth)}
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs font-medium">
                {data.revenueChangePercent >= 0 ? (
                  <span className="inline-flex items-center text-[#16A34A]">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    +{data.revenueChangePercent}%
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[#DC2626]">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {data.revenueChangePercent}%
                  </span>
                )}
                <span className="text-[#A8A29E]">vs last month</span>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-sm font-medium text-[#78716C]">Outstanding Receivables</p>
              <p className="text-2xl sm:text-3xl font-semibold text-[#1C1917] tabular-nums mt-2">
                {formatCompactCurrency(data.totalOutstanding)}
              </p>
              <p className="mt-2 text-xs text-[#78716C]">
                {data.outstandingInvoices.length} open invoice
                {data.outstandingInvoices.length === 1 ? '' : 's'} awaiting settlement
              </p>
            </Card>

            <Card className="p-5">
              <p className="text-sm font-medium text-[#78716C]">Overdue Amount</p>
              <p
                className={`text-2xl sm:text-3xl font-semibold tabular-nums mt-2 ${
                  data.overdueCount > 0 ? 'text-[#DC2626]' : 'text-[#1C1917]'
                }`}
              >
                {formatCompactCurrency(data.overdueAmount)}
              </p>
              <p
                className={`mt-2 text-xs font-medium ${
                  data.overdueCount > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'
                }`}
              >
                {data.overdueCount > 0
                  ? `${data.overdueCount} overdue invoice${data.overdueCount === 1 ? '' : 's'} past due`
                  : 'All invoices on schedule'}
              </p>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[#78716C]">Invoices This Month</p>
                  <p className="text-2xl sm:text-3xl font-semibold text-[#1C1917] tabular-nums mt-2">
                    {data.invoicesThisMonth}
                  </p>
                </div>
                <div className="w-20 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#F26522"
                        strokeWidth={2}
                        fill="#FFF3ED"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="mt-2 text-xs text-[#78716C]">6-month issuance trend</p>
            </Card>
          </>
        )}
      </div>

      {/* Row 2: Revenue Chart (60%) + Recent Activity (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-semibold text-[#1C1917]">Revenue Overview</h2>
              <p className="text-xs text-[#78716C] mt-0.5">
                Total billed revenue (incl. 5% UAE VAT)
              </p>
            </div>
            <div className="inline-flex items-center p-1 bg-[#F5F5F4] rounded-md self-start">
              {(['week', 'month', 'quarter'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors cursor-pointer ${
                    period === p
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[260px] w-full">
            {isLoading ? (
              <div className="h-full w-full bg-[#FAFAF9] rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fatooraOrange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F26522" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#F26522" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EEEC" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#78716C', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#78716C', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(val) => [formatCurrency(Number(val ?? 0)), 'Revenue']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E7E5E4',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#F26522"
                    strokeWidth={2.2}
                    fillOpacity={1}
                    fill="url(#fatooraOrange)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-5 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#1C1917]">Recent Activity</h2>
            <Clock className="w-4 h-4 text-[#A8A29E]" />
          </div>

          <div className="divide-y divide-[#F0EEEC] flex-1">
            {isLoading ? (
              <SkeletonTable rows={5} cols={2} />
            ) : data && data.recentActivities.length > 0 ? (
              data.recentActivities.slice(0, 6).map((act) => (
                <div key={act.id} className="py-3 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{getActivityIcon(act.action)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#1C1917] leading-snug">{act.description}</p>
                    <p className="text-xs text-[#A8A29E] mt-0.5">
                      {act.userName ? `${act.userName} · ` : ''}
                      {formatRelativeTime(act.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#78716C] py-8 text-center">No recent activity yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: Outstanding Invoices (60%) + Quick Actions (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0EEEC] flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1C1917]">Outstanding Invoices</h2>
            <Link
              to="/invoices"
              className="text-xs font-medium text-[#F26522] hover:text-[#E05A1B] inline-flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <SkeletonTable rows={4} cols={5} />
          ) : data && data.outstandingInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#FAFAF9] text-[#78716C] text-xs font-medium uppercase tracking-wider border-b border-[#E7E5E4]">
                    <th className="py-3 px-5">Invoice #</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4 text-right">Due Amount</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EEEC]">
                  {data.outstandingInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-5 font-mono text-xs font-semibold text-[#1C1917]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 text-[#44403C] max-w-[180px] truncate">
                        {inv.client?.nameEn || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium tabular-nums">
                        {formatCurrency(inv.amountDue, inv.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#78716C] tabular-nums whitespace-nowrap">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[#78716C] py-10 text-center">
              All issued invoices are fully settled.
            </p>
          )}
        </Card>

        <Card className="lg:col-span-5 p-6">
          <h2 className="text-base font-semibold text-[#1C1917] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/invoices/new')}
              className="p-4 rounded-lg bg-[#F26522] text-white text-left hover:bg-[#E05A1B] transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5 mb-3" />
              <p className="text-sm font-semibold">New Invoice</p>
              <p className="text-xs text-white/80 mt-0.5">FTA validated</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/clients?new=1')}
              className="p-4 rounded-lg bg-white border border-[#E7E5E4] text-left hover:bg-[#FAFAF9] transition-colors cursor-pointer"
            >
              <UserPlus className="w-5 h-5 text-[#F26522] mb-3" />
              <p className="text-sm font-semibold text-[#1C1917]">New Client</p>
              <p className="text-xs text-[#78716C] mt-0.5">Add buyer &amp; TRN</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/credit-notes/new')}
              className="p-4 rounded-lg bg-white border border-[#E7E5E4] text-left hover:bg-[#FAFAF9] transition-colors cursor-pointer"
            >
              <ReceiptText className="w-5 h-5 text-[#F26522] mb-3" />
              <p className="text-sm font-semibold text-[#1C1917]">New Credit Note</p>
              <p className="text-xs text-[#78716C] mt-0.5">Adjust an invoice</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/vat-summary')}
              className="p-4 rounded-lg bg-white border border-[#E7E5E4] text-left hover:bg-[#FAFAF9] transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5 text-[#F26522] mb-3" />
              <p className="text-sm font-semibold text-[#1C1917]">VAT Report</p>
              <p className="text-xs text-[#78716C] mt-0.5">FTA VAT 201 ready</p>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
