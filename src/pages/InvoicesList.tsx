import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Eye,
  FileCode2,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../services/api.ts';
import {
  downloadTextFile,
  exportToCsv,
  formatCurrency,
  formatDate,
} from '../lib/formatters.ts';
import {
  Button,
  Card,
  EmptyState,
  SkeletonTable,
  StatusBadge,
} from '../components/ui/Primitives.tsx';
import type { Invoice, InvoiceStatus } from '../../shared/types.ts';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PARTIALLY_PAID', label: 'Partial' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'VOID', label: 'Void' },
];

export default function InvoicesList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { status, search, fromDate, toDate, sort, page }],
    queryFn: async () => {
      const qs = new URLSearchParams({
        status,
        search,
        from: fromDate,
        to: toDate,
        sort,
        page: String(page),
        limit: '20',
      });
      return api.get<{
        success: boolean;
        data: Invoice[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/api/invoices?${qs.toString()}`);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<{ success: boolean; data: Invoice }>(`/api/invoices/${id}/duplicate`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Duplicated as draft ${res.data.invoiceNumber}`);
      navigate(`/invoices/${res.data.id}/edit`);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not duplicate invoice'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/invoices/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Invoice validated and marked as Sent');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'FTA validation failed'),
  });

  const voidMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/invoices/${id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Invoice voided');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Unable to void invoice'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Draft invoice deleted');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Only draft invoices can be deleted'),
  });

  const handleDownloadXml = async (inv: Invoice) => {
    try {
      const res = await api.get<{
        success: boolean;
        data: { xml: string; filename: string };
      }>(`/api/invoices/${inv.id}/xml?format=json`);
      downloadTextFile(res.data.filename, res.data.xml, 'application/xml');
      toast.success(`Downloaded ${res.data.filename}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to generate PINT-AE XML');
    }
  };

  const invoices = data?.data || [];
  const pagination = data?.pagination;

  const handleExportCsv = () => {
    if (!invoices.length) {
      toast.info('No invoices to export');
      return;
    }
    exportToCsv(
      'inbox-invoice-invoices.csv',
      ['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Subtotal', 'VAT', 'Grand Total', 'Currency', 'Status'],
      invoices.map((i) => [
        i.invoiceNumber,
        i.client?.nameEn || '',
        i.issueDate,
        i.dueDate,
        i.totalBeforeVat.toFixed(2),
        i.totalVat.toFixed(2),
        i.grandTotal.toFixed(2),
        i.currency,
        i.status,
      ])
    );
    toast.success('Invoices exported to CSV');
  };

  return (
    <div className="space-y-6" onClick={() => openMenuId && setOpenMenuId(null)}>
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Invoices</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Create, validate, send, and archive FTA-compliant tax invoices.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={handleExportCsv}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button onClick={() => navigate('/invoices/new')}>
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                status === tab.value
                  ? 'bg-[#F26522] text-white'
                  : 'bg-[#FAFAF9] text-[#44403C] hover:bg-[#F5F5F4]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice #, client, PO, or amount..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 pl-9 pr-3 bg-white border border-[#E7E5E4] rounded-md text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522]"
            />
          </div>
          <div className="md:col-span-2">
            <input
              type="date"
              aria-label="From date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 bg-white border border-[#E7E5E4] rounded-md text-xs text-[#1C1917] focus:outline-none focus:border-[#F26522]"
            />
          </div>
          <div className="md:col-span-2">
            <input
              type="date"
              aria-label="To date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 bg-white border border-[#E7E5E4] rounded-md text-xs text-[#1C1917] focus:outline-none focus:border-[#F26522]"
            />
          </div>
          <div className="md:col-span-3">
            <select
              aria-label="Sort invoices"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-[#E7E5E4] rounded-md text-sm text-[#1C1917] focus:outline-none focus:border-[#F26522]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-visible">
        {isLoading ? (
          <SkeletonTable rows={6} cols={8} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No invoices found"
            description="Create your first FTA-compliant UAE tax invoice or clear your active search filters."
            action={
              <Button onClick={() => navigate('/invoices/new')}>
                <Plus className="w-4 h-4" />
                Create Invoice
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#FAFAF9] text-[#78716C] text-xs font-medium uppercase tracking-wider border-b border-[#E7E5E4]">
                    <th className="py-3 px-5">Invoice #</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">VAT</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EEEC]">
                  {invoices.map((inv) => {
                    const isTerminal = ['PAID', 'VOID', 'CANCELLED'].includes(inv.status);
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="h-[52px] hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                      >
                        <td className="px-5 font-mono text-xs font-semibold text-[#1C1917] whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 font-medium text-[#1C1917] max-w-[200px] truncate">
                          {inv.client?.nameEn || '—'}
                        </td>
                        <td className="px-4 text-xs text-[#78716C] tabular-nums whitespace-nowrap">
                          {formatDate(inv.issueDate)}
                        </td>
                        <td className="px-4 text-xs text-[#78716C] tabular-nums whitespace-nowrap">
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="px-4 text-right text-xs text-[#44403C] tabular-nums whitespace-nowrap">
                          {formatCurrency(inv.totalBeforeVat, inv.currency)}
                        </td>
                        <td className="px-4 text-right text-xs text-[#78716C] tabular-nums whitespace-nowrap">
                          {formatCurrency(inv.totalVat, inv.currency)}
                        </td>
                        <td className="px-4 text-right font-semibold text-[#1C1917] tabular-nums whitespace-nowrap">
                          {formatCurrency(inv.grandTotal, inv.currency)}
                        </td>
                        <td className="px-4">
                          <StatusBadge status={inv.status as InvoiceStatus} />
                        </td>
                        <td
                          className="px-5 text-right relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            aria-label="Invoice actions"
                            onClick={() =>
                              setOpenMenuId(openMenuId === inv.id ? null : inv.id)
                            }
                            className="p-1.5 rounded-md text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917] cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenuId === inv.id && (
                            <div className="absolute right-5 top-11 z-30 w-48 bg-white rounded-lg border border-[#E7E5E4] shadow-lg py-1.5 text-left text-xs">
                              <button
                                type="button"
                                onClick={() => navigate(`/invoices/${inv.id}`)}
                                className="w-full px-3.5 py-2 flex items-center gap-2 text-[#1C1917] hover:bg-[#FAFAF9] cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#78716C]" />
                                View &amp; PDF
                              </button>
                              {!isTerminal && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                                  className="w-full px-3.5 py-2 flex items-center gap-2 text-[#1C1917] hover:bg-[#FAFAF9] cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-[#78716C]" />
                                  Edit Invoice
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  duplicateMutation.mutate(inv.id);
                                }}
                                className="w-full px-3.5 py-2 flex items-center gap-2 text-[#1C1917] hover:bg-[#FAFAF9] cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-[#78716C]" />
                                Duplicate
                              </button>
                              {inv.status === 'DRAFT' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    sendMutation.mutate(inv.id);
                                  }}
                                  className="w-full px-3.5 py-2 flex items-center gap-2 text-[#F26522] hover:bg-[#FFF3ED] cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  Validate &amp; Send
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleDownloadXml(inv);
                                }}
                                className="w-full px-3.5 py-2 flex items-center gap-2 text-[#1C1917] hover:bg-[#FAFAF9] cursor-pointer"
                              >
                                <FileCode2 className="w-3.5 h-3.5 text-[#78716C]" />
                                Download PINT-AE XML
                              </button>
                              <div className="my-1 border-t border-[#F0EEEC]" />
                              {!isTerminal && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    voidMutation.mutate(inv.id);
                                  }}
                                  className="w-full px-3.5 py-2 flex items-center gap-2 text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Void Invoice
                                </button>
                              )}
                              {inv.status === 'DRAFT' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    deleteMutation.mutate(inv.id);
                                  }}
                                  className="w-full px-3.5 py-2 flex items-center gap-2 text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete Draft
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-[#F0EEEC]">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="p-4 space-y-2 hover:bg-[#FAFAF9] cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#1C1917]">
                      {inv.invoiceNumber}
                    </span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-sm font-medium text-[#1C1917]">
                    {inv.client?.nameEn || '—'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-[#78716C]">
                    <span>Due {formatDate(inv.dueDate)}</span>
                    <span className="text-sm font-semibold text-[#1C1917] tabular-nums">
                      {formatCurrency(inv.grandTotal, inv.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && (
              <div className="px-5 py-3.5 border-t border-[#F0EEEC] flex items-center justify-between text-xs text-[#78716C]">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} invoices
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
