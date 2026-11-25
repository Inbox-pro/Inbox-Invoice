import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle2, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../services/api.ts';
import {
  getVatRateForCategory,
  roundMoney,
  UNITS,
  VAT_CATEGORIES,
} from '../../shared/schemas.ts';
import { formatCurrency, formatDate } from '../lib/formatters.ts';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  SkeletonTable,
  StatusBadge,
  Textarea,
} from '../components/ui/Primitives.tsx';
import type {
  CreditNote,
  CreditNoteReason,
  Invoice,
  VatCategory,
} from '../../shared/types.ts';

const REASONS: { value: CreditNoteReason; label: string }[] = [
  { value: 'ADJUSTMENT', label: 'Price / Scope Adjustment' },
  { value: 'REFUND', label: 'Customer Refund' },
  { value: 'CORRECTION', label: 'Invoice Correction' },
  { value: 'RETURN', label: 'Goods Return' },
  { value: 'CANCELLATION', label: 'Service Cancellation' },
  { value: 'OTHER', label: 'Other' },
];

export function CreditNotesList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['credit-notes'],
    queryFn: () =>
      api.get<{ success: boolean; data: CreditNote[] }>('/api/credit-notes'),
  });

  const issueMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/credit-notes/${id}/issue`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Credit note issued and applied to linked invoice');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Unable to issue credit note'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/credit-notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success('Draft credit note deleted');
    },
  });

  const list = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Credit Notes</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            FTA-compliant credit adjustments linked to original UAE tax invoices.
          </p>
        </div>
        <Button onClick={() => navigate('/credit-notes/new')}>
          <Plus className="w-4 h-4" />
          New Credit Note
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={4} cols={7} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="w-6 h-6" />}
            title="No credit notes yet"
            description="Issue a tax credit note linked to an existing invoice to handle refunds or billing corrections."
            action={
              <Button onClick={() => navigate('/credit-notes/new')}>
                <Plus className="w-4 h-4" />
                Create Credit Note
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#FAFAF9] text-[#78716C] text-xs font-medium uppercase tracking-wider border-b border-[#E7E5E4]">
                  <th className="py-3 px-5">Credit Note #</th>
                  <th className="py-3 px-4">Linked Invoice</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEEC]">
                {list.map((cn) => (
                  <tr key={cn.id} className="h-[52px] hover:bg-[#FAFAF9] transition-colors">
                    <td className="px-5 font-mono text-xs font-semibold text-[#1C1917]">
                      {cn.creditNoteNumber}
                    </td>
                    <td className="px-4 font-mono text-xs text-[#F26522]">
                      <button
                        type="button"
                        onClick={() => navigate(`/invoices/${cn.invoiceId}`)}
                        className="hover:underline cursor-pointer"
                      >
                        {cn.invoiceNumber}
                      </button>
                    </td>
                    <td className="px-4 text-[#1C1917]">{cn.client?.nameEn || '—'}</td>
                    <td className="px-4 text-xs text-[#78716C] tabular-nums">
                      {formatDate(cn.issueDate)}
                    </td>
                    <td className="px-4 text-xs text-[#44403C] capitalize">
                      {cn.reason.toLowerCase()}
                    </td>
                    <td className="px-4 text-right font-semibold tabular-nums">
                      {formatCurrency(cn.grandTotal)}
                    </td>
                    <td className="px-4">
                      <StatusBadge status={cn.status} />
                    </td>
                    <td className="px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {cn.status === 'DRAFT' && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => issueMutation.mutate(cn.id)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                              Issue
                            </Button>
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate(cn.id)}
                              className="p-1.5 rounded text-[#A8A29E] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                              aria-label="Delete credit note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function CreditNoteCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [invoiceId, setInvoiceId] = useState(searchParams.get('invoiceId') || '');
  const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reason, setReason] = useState<CreditNoteReason>('ADJUSTMENT');
  const [reasonDetail, setReasonDetail] = useState('');
  const [lines, setLines] = useState([
    {
      description: '',
      quantity: 1,
      unit: 'UNIT',
      unitPrice: 0,
      vatCategory: 'STANDARD' as VatCategory,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const { data: invoicesData } = useQuery({
    queryKey: ['invoices-all-for-cn'],
    queryFn: () =>
      api.get<{ success: boolean; data: Invoice[] }>('/api/invoices?limit=100'),
  });

  const eligibleInvoices = (invoicesData?.data || []).filter(
    (i) => !['VOID', 'CANCELLED'].includes(i.status)
  );
  const selectedInvoice = eligibleInvoices.find((i) => i.id === invoiceId);

  useEffect(() => {
    if (selectedInvoice && lines.length === 1 && !lines[0].description) {
      const first = selectedInvoice.lineItems[0];
      if (first) {
        setLines([
          {
            description: `Credit adjustment — ${first.description}`,
            quantity: 1,
            unit: first.unit,
            unitPrice: first.unitPrice,
            vatCategory: first.vatCategory,
          },
        ]);
      }
    }
  }, [selectedInvoice]);

  const totals = lines.reduce(
    (acc, l) => {
      const base = roundMoney((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0));
      const vat = roundMoney((base * getVatRateForCategory(l.vatCategory)) / 100);
      return {
        subtotal: roundMoney(acc.subtotal + base),
        vat: roundMoney(acc.vat + vat),
        grand: roundMoney(acc.grand + base + vat),
      };
    },
    { subtotal: 0, vat: 0, grand: 0 }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) {
      toast.error('Please select the original invoice');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/credit-notes', {
        invoiceId,
        issueDate,
        reason,
        reasonDetail: reasonDetail || null,
        lineItems: lines,
      });
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success('Credit note created as draft');
      navigate('/credit-notes');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create credit note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/credit-notes')}
          className="p-2 rounded-md border border-[#E7E5E4] text-[#44403C] hover:bg-[#F5F5F4] cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">New Tax Credit Note</h1>
          <p className="text-xs text-[#78716C] mt-0.5">
            Must reference an original invoice and cannot exceed its grand total.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Original Invoice *"
              required
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
            >
              <option value="">Select invoice...</option>
              {eligibleInvoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber} — {i.client?.nameEn} ({formatCurrency(i.grandTotal, i.currency)})
                </option>
              ))}
            </Select>
            <Input
              label="Issue Date *"
              type="date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
            <Select
              label="Reason *"
              value={reason}
              onChange={(e) => setReason(e.target.value as CreditNoteReason)}
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Reason Details"
            rows={2}
            placeholder="Explain the adjustment or refund reason per FTA guidelines..."
            value={reasonDetail}
            onChange={(e) => setReasonDetail(e.target.value)}
          />
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1C1917]">Credit Line Items</h2>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-[#F26522]"
              onClick={() =>
                setLines((p) => [
                  ...p,
                  {
                    description: '',
                    quantity: 1,
                    unit: 'UNIT',
                    unitPrice: 0,
                    vatCategory: 'STANDARD',
                  },
                ])
              }
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end pb-3 border-b border-[#F0EEEC]"
              >
                <div className="sm:col-span-4">
                  <Input
                    label={idx === 0 ? 'Description' : undefined}
                    required
                    value={line.description}
                    onChange={(e) =>
                      setLines((p) =>
                        p.map((x, i) =>
                          i === idx ? { ...x, description: e.target.value } : x
                        )
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label={idx === 0 ? 'Qty' : undefined}
                    type="number"
                    min={0.01}
                    step="any"
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((p) =>
                        p.map((x, i) =>
                          i === idx ? { ...x, quantity: Number(e.target.value) || 0 } : x
                        )
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Select
                    label={idx === 0 ? 'Unit' : undefined}
                    value={line.unit}
                    onChange={(e) =>
                      setLines((p) =>
                        p.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x))
                      )
                    }
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label={idx === 0 ? 'Price' : undefined}
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) =>
                      setLines((p) =>
                        p.map((x, i) =>
                          i === idx ? { ...x, unitPrice: Number(e.target.value) || 0 } : x
                        )
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Select
                    label={idx === 0 ? 'VAT' : undefined}
                    value={line.vatCategory}
                    onChange={(e) =>
                      setLines((p) =>
                        p.map((x, i) =>
                          i === idx
                            ? { ...x, vatCategory: e.target.value as VatCategory }
                            : x
                        )
                      )
                    }
                  >
                    {VAT_CATEGORIES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="text-xs text-[#78716C]">
              {selectedInvoice && (
                <span>
                  Max credit allowed for {selectedInvoice.invoiceNumber}:{' '}
                  <strong className="text-[#1C1917] tabular-nums">
                    {formatCurrency(selectedInvoice.grandTotal, selectedInvoice.currency)}
                  </strong>
                </span>
              )}
            </div>
            <div className="w-full sm:w-64 space-y-1.5 text-sm tabular-nums">
              <div className="flex justify-between text-[#78716C]">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#78716C]">
                <span>VAT</span>
                <span>{formatCurrency(totals.vat)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#1C1917] pt-2 border-t border-[#E7E5E4]">
                <span>Total Credit</span>
                <span>{formatCurrency(totals.grand)}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/credit-notes')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Save Credit Note
          </Button>
        </div>
      </form>
    </div>
  );
}
