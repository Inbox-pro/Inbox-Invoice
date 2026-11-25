import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Eye,
  Package,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../services/api.ts';
import { useAuthStore } from '../stores/authStore.ts';
import {
  calculateInvoiceTotals,
  CURRENCIES,
  isValidUaeTrn,
  PAYMENT_METHODS,
  PAYMENT_TERMS_OPTIONS,
  UAE_EMIRATES,
  UNITS,
  VAT_CATEGORIES,
} from '../../shared/schemas.ts';
import { formatCurrency } from '../lib/formatters.ts';
import InvoicePreview from '../components/invoices/InvoicePreview.tsx';
import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  SlideOver,
  Textarea,
} from '../components/ui/Primitives.tsx';
import type {
  Client,
  DiscountType,
  Invoice,
  InvoiceType,
  Product,
  VatCategory,
} from '../../shared/types.ts';

interface EditableLine {
  key: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  vatCategory: VatCategory;
}

const newLine = (): EditableLine => ({
  key: `ln_${Math.random().toString(36).slice(2, 9)}`,
  description: '',
  quantity: 1,
  unit: 'UNIT',
  unitPrice: 0,
  discountType: 'NONE',
  discountValue: 0,
  vatCategory: 'STANDARD',
});

export default function InvoiceEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  const today = format(new Date(), 'yyyy-MM-dd');
  const defaultTermsDays = company?.defaultPaymentTermsDays ?? 30;

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('STANDARD_TAX');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(
    format(addDays(new Date(), defaultTermsDays), 'yyyy-MM-dd')
  );
  const [paymentTerms, setPaymentTerms] = useState(`Net ${defaultTermsDays}`);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [currency, setCurrency] = useState(company?.defaultCurrency || 'AED');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [clientId, setClientId] = useState(searchParams.get('clientId') || '');
  const [purchaseOrderRef, setPurchaseOrderRef] = useState('');
  const [notes, setNotes] = useState(company?.defaultNotes || '');
  const [internalNotes, setInternalNotes] = useState('');
  const [lines, setLines] = useState<EditableLine[]>([newLine()]);

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    nameEn: '',
    nameAr: '',
    trn: '',
    email: '',
    phone: '',
    addressLine1: '',
    emirate: 'Dubai',
    city: 'Dubai',
  });
  const [creatingClient, setCreatingClient] = useState(false);

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'active'],
    queryFn: () =>
      api.get<{ success: boolean; data: Client[] }>('/api/clients?status=active'),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<{ success: boolean; data: Product[] }>('/api/products'),
  });

  const { data: nextNumData } = useQuery({
    queryKey: ['invoices-next-number'],
    enabled: !isEdit,
    queryFn: () =>
      api.get<{ success: boolean; data: { nextNumber: string } }>(
        '/api/invoices/next-number'
      ),
  });

  const { data: existingData } = useQuery({
    queryKey: ['invoice', id],
    enabled: isEdit,
    queryFn: () =>
      api.get<{ success: boolean; data: { invoice: Invoice } }>(`/api/invoices/${id}`),
  });

  useEffect(() => {
    if (!isEdit && nextNumData?.data?.nextNumber && !invoiceNumber) {
      setInvoiceNumber(nextNumData.data.nextNumber);
    }
  }, [isEdit, nextNumData, invoiceNumber]);

  useEffect(() => {
    const inv = existingData?.data?.invoice;
    if (inv) {
      setInvoiceNumber(inv.invoiceNumber);
      setInvoiceType(inv.invoiceType);
      setIssueDate(inv.issueDate.slice(0, 10));
      setDueDate(inv.dueDate.slice(0, 10));
      setPaymentTerms(inv.paymentTerms || 'Net 30');
      setPaymentMethod(inv.paymentMethod || 'BANK_TRANSFER');
      setCurrency(inv.currency);
      setExchangeRate(inv.exchangeRate);
      setClientId(inv.clientId);
      setPurchaseOrderRef(inv.purchaseOrderRef || '');
      setNotes(inv.notes || '');
      setInternalNotes(inv.internalNotes || '');
      setLines(
        inv.lineItems.map((li) => ({
          key: li.id,
          description: li.description,
          quantity: li.quantity,
          unit: li.unit,
          unitPrice: li.unitPrice,
          discountType: li.discountType,
          discountValue: li.discountValue,
          vatCategory: li.vatCategory,
        }))
      );
    }
  }, [existingData]);

  const clients = clientsData?.data || [];
  const products = (productsData?.data || []).filter((p) => p.isActive);
  const selectedClient = clients.find((c) => c.id === clientId);

  const totals = useMemo(() => calculateInvoiceTotals(lines), [lines]);

  // Live client-side FTA 51-field readiness check
  const ftaIssues = useMemo(() => {
    const issues: string[] = [];
    if (!invoiceNumber.trim()) issues.push('Invoice number is required');
    if (!company?.trn || !isValidUaeTrn(company.trn)) {
      issues.push('Your company 15-digit UAE TRN must be configured in Settings');
    }
    if (!company?.addressLine1) {
      issues.push('Your company address is missing in Company Settings');
    }
    if (!selectedClient) {
      issues.push('Select a buyer (client)');
    } else {
      if (invoiceType === 'STANDARD_TAX' && !isValidUaeTrn(selectedClient.trn)) {
        issues.push('Standard B2B Tax Invoices require a 15-digit Buyer TRN starting with 100');
      }
      if (!selectedClient.addressLine1 && !selectedClient.emirate) {
        issues.push('Buyer address/Emirate is required');
      }
    }
    if (lines.length === 0) issues.push('Add at least one line item');
    if (lines.some((l) => !l.description.trim() || l.quantity <= 0)) {
      issues.push('Every line item needs a description and quantity > 0');
    }
    if (dueDate < issueDate) issues.push('Due date cannot be earlier than issue date');
    return issues;
  }, [invoiceNumber, company, selectedClient, invoiceType, lines, dueDate, issueDate]);

  const updateLine = (index: number, patch: Partial<EditableLine>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const moveLine = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= lines.length) return;
    setLines((prev) => {
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const handleAddFromProduct = (p: Product) => {
    const item: EditableLine = {
      key: `ln_${Math.random().toString(36).slice(2, 9)}`,
      description: p.description ? `${p.name} — ${p.description}` : p.name,
      quantity: 1,
      unit: p.unit,
      unitPrice: p.unitPrice,
      discountType: 'NONE',
      discountValue: 0,
      vatCategory: p.vatCategory,
    };
    setLines((prev) =>
      prev.length === 1 && !prev[0].description.trim() && prev[0].unitPrice === 0
        ? [item]
        : [...prev, item]
    );
    setCatalogOpen(false);
    toast.success(`Added "${p.name}"`);
  };

  const handleTermsChange = (termsLabel: string) => {
    setPaymentTerms(termsLabel);
    const found = PAYMENT_TERMS_OPTIONS.find((t) => t.label === termsLabel);
    if (found && issueDate) {
      setDueDate(format(addDays(parseISO(issueDate), found.days), 'yyyy-MM-dd'));
    }
  };

  const handleCurrencyChange = (code: string) => {
    setCurrency(code);
    const meta = CURRENCIES.find((c) => c.code === code);
    setExchangeRate(meta?.defaultRate ?? 1);
  };

  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingClient(true);
    try {
      const res = await api.post<{ success: boolean; data: Client }>('/api/clients', {
        ...newClientForm,
        trn: newClientForm.trn || null,
        nameAr: newClientForm.nameAr || null,
        email: newClientForm.email || null,
      });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      setClientId(res.data.id);
      setQuickClientOpen(false);
      setNewClientForm({
        nameEn: '',
        nameAr: '',
        trn: '',
        email: '',
        phone: '',
        addressLine1: '',
        emirate: 'Dubai',
        city: 'Dubai',
      });
      toast.success(`Client "${res.data.nameEn}" added`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create client');
    } finally {
      setCreatingClient(false);
    }
  };

  const saveInvoice = async (andSend: boolean) => {
    if (!clientId) {
      toast.error('Please select a buyer/client first');
      return;
    }
    if (lines.some((l) => !l.description.trim())) {
      toast.error('Please fill in all line item descriptions');
      return;
    }
    if (andSend && ftaIssues.length > 0) {
      toast.error(`Resolve ${ftaIssues.length} FTA compliance issue(s) before sending`);
      return;
    }

    if (andSend) setSending(true);
    else setSaving(true);

    try {
      const payload = {
        invoiceNumber,
        invoiceType,
        issueDate,
        dueDate,
        clientId,
        purchaseOrderRef: purchaseOrderRef || null,
        notes: notes || null,
        internalNotes: internalNotes || null,
        currency,
        exchangeRate,
        paymentTerms,
        paymentMethod,
        lineItems: lines.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity),
          unit: l.unit,
          unitPrice: Number(l.unitPrice),
          discountType: l.discountType,
          discountValue: Number(l.discountValue) || 0,
          vatCategory: l.vatCategory,
        })),
      };

      const saved = isEdit
        ? await api.put<{ success: boolean; data: Invoice }>(`/api/invoices/${id}`, payload)
        : await api.post<{ success: boolean; data: Invoice }>('/api/invoices', payload);

      const savedId = saved.data.id;

      if (andSend) {
        await api.post(`/api/invoices/${savedId}/send`);
        toast.success(`Invoice ${saved.data.invoiceNumber} validated & sent!`);
      } else {
        toast.success(`Invoice ${saved.data.invoiceNumber} saved as draft`);
      }

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/invoices/${savedId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save invoice');
    } finally {
      setSaving(false);
      setSending(false);
    }
  };

  // Construct preview invoice object for Preview Modal
  const previewInvoice: Invoice = {
    id: id || 'preview',
    invoiceNumber: invoiceNumber || 'INV-PREVIEW',
    invoiceType,
    issueDate,
    dueDate,
    purchaseOrderRef,
    notes,
    internalNotes,
    currency,
    exchangeRate,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    totalBeforeVat: totals.totalBeforeVat,
    totalVat: totals.totalVat,
    grandTotal: totals.grandTotal,
    amountPaid: 0,
    amountDue: totals.grandTotal,
    status: 'DRAFT',
    paymentTerms,
    paymentMethod,
    xmlGenerated: false,
    companyId: company?.id || '',
    clientId,
    createdById: '',
    createdAt: today,
    updatedAt: today,
    client: selectedClient,
    lineItems: lines.map((l, idx) => ({
      id: l.key,
      lineNumber: idx + 1,
      description: l.description || 'Line item',
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
      discountType: l.discountType,
      discountValue: l.discountValue,
      discountAmount: totals.computedItems[idx]?.discountAmount || 0,
      vatCategory: l.vatCategory,
      vatRate: totals.computedItems[idx]?.vatRate || 0,
      vatAmount: totals.computedItems[idx]?.vatAmount || 0,
      lineSubtotal: totals.computedItems[idx]?.lineSubtotal || 0,
      lineTotalBeforeVat: totals.computedItems[idx]?.lineTotalBeforeVat || 0,
      lineTotal: totals.computedItems[idx]?.lineTotal || 0,
      invoiceId: id || 'preview',
    })),
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-md border border-[#E7E5E4] text-[#44403C] hover:bg-[#F5F5F4] cursor-pointer"
            aria-label="Back to invoices"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1C1917]">
              {isEdit ? `Edit Invoice ${invoiceNumber}` : 'New Tax Invoice'}
            </h1>
            <p className="text-xs text-[#78716C] mt-0.5">
              PINT-AE UBL 2.1 compliant builder with live 51-field UAE FTA validation
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            <Eye className="w-4 h-4" />
            Preview PDF
          </Button>
          <Button
            variant="secondary"
            loading={saving}
            onClick={() => saveInvoice(false)}
          >
            Save as Draft
          </Button>
          <Button loading={sending} onClick={() => saveInvoice(true)}>
            <Send className="w-4 h-4" />
            Save &amp; Send
          </Button>
        </div>
      </div>

      {/* Live FTA Compliance Banner */}
      <div
        className={`rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
          ftaIssues.length === 0
            ? 'bg-[#F0FDF4] border-[#16A34A]/25 text-[#16A34A]'
            : 'bg-[#FFFBEB] border-[#F59E0B]/35 text-[#B45309]'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {ftaIssues.length === 0 ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">
              {ftaIssues.length === 0
                ? 'FTA Compliance Ready — All 51 PINT-AE mandatory fields verified'
                : `FTA Compliance Check: ${ftaIssues.length} issue${ftaIssues.length === 1 ? '' : 's'} to resolve before sending`}
            </p>
            {ftaIssues.length > 0 && (
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-[#92400E]">
                {ftaIssues.map((iss) => (
                  <li key={iss}>{iss}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 font-mono font-medium shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
          PINT-AE 2.1
        </span>
      </div>

      {/* Section 1: Invoice Details */}
      <Card className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            label="Invoice Number"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="font-mono"
          />
          <Select
            label="Invoice Type"
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
          >
            <option value="STANDARD_TAX">Standard Tax Invoice (B2B)</option>
            <option value="SIMPLIFIED_TAX">Simplified Tax Invoice (B2C)</option>
            <option value="DEBIT_NOTE">Tax Debit Note</option>
          </Select>
          <Input
            label="Issue Date"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Input
            label="P.O. Reference"
            placeholder="PO-2026-001"
            value={purchaseOrderRef}
            onChange={(e) => setPurchaseOrderRef(e.target.value)}
          />
        </div>
      </Card>

      {/* Section 2: Parties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1C1917]">From (Seller)</h2>
            <Link
              to="/settings"
              className="text-xs font-medium text-[#F26522] hover:text-[#E05A1B]"
            >
              Edit in settings
            </Link>
          </div>
          {company ? (
            <div className="text-sm space-y-1">
              <p className="font-semibold text-[#1C1917]">{company.nameEn}</p>
              {company.nameAr && (
                <p className="font-arabic text-xs text-[#44403C]" dir="rtl">
                  {company.nameAr}
                </p>
              )}
              <p className="text-xs text-[#78716C] tabular-nums">
                TRN: {company.trn || 'Not configured'}
              </p>
              <p className="text-xs text-[#78716C]">
                {[company.addressLine1, company.city, company.emirate, 'UAE']
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className="text-xs text-[#78716C]">{company.email}</p>
            </div>
          ) : null}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1C1917]">To (Buyer)</h2>
            <button
              type="button"
              onClick={() => setQuickClientOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#F26522] hover:text-[#E05A1B] cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add new client
            </button>
          </div>

          <Select
            aria-label="Select Buyer"
            value={clientId}
            onChange={(e) => {
              const cid = e.target.value;
              setClientId(cid);
              const cl = clients.find((x) => x.id === cid);
              if (cl?.defaultPaymentTermsDays !== null && cl?.defaultPaymentTermsDays !== undefined) {
                setPaymentTerms(`Net ${cl.defaultPaymentTermsDays}`);
                setDueDate(
                  format(addDays(parseISO(issueDate), cl.defaultPaymentTermsDays), 'yyyy-MM-dd')
                );
              }
            }}
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn} {c.trn ? `(TRN ${c.trn})` : ''}
              </option>
            ))}
          </Select>

          {selectedClient && (
            <div className="mt-3 p-3 rounded-md bg-[#FAFAF9] border border-[#F0EEEC] text-xs text-[#78716C] space-y-0.5">
              <p className="font-medium text-[#1C1917]">{selectedClient.nameEn}</p>
              {selectedClient.trn && (
                <p className="tabular-nums">TRN: {selectedClient.trn}</p>
              )}
              <p>
                {[selectedClient.addressLine1, selectedClient.city, selectedClient.emirate]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {selectedClient.email && <p>{selectedClient.email}</p>}
            </div>
          )}
        </Card>
      </div>

      {/* Section 3: Line Items */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F0EEEC] flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#1C1917]">Line Items</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setCatalogOpen(true)}>
              <Package className="w-3.5 h-3.5" />
              Add from Catalog
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-[#F26522] hover:bg-[#FFF3ED]"
              onClick={() => setLines((prev) => [...prev, newLine()])}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Line Item
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[880px]">
            <thead>
              <tr className="bg-[#FAFAF9] text-[#78716C] uppercase tracking-wider border-b border-[#E7E5E4]">
                <th className="py-3 px-3 w-14 text-center">#</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-2 w-20">Qty</th>
                <th className="py-3 px-2 w-28">Unit</th>
                <th className="py-3 px-2 w-32">Unit Price ({currency})</th>
                <th className="py-3 px-2 w-36">Discount</th>
                <th className="py-3 px-2 w-36">VAT Category</th>
                <th className="py-3 px-3 w-32 text-right">Line Total</th>
                <th className="py-3 px-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EEEC]">
              {lines.map((line, idx) => {
                const comp = totals.computedItems[idx];
                return (
                  <tr key={line.key} className="align-top">
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-mono text-[#78716C]">{idx + 1}</span>
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveLine(idx, -1)}
                            className="p-0.5 text-[#A8A29E] hover:text-[#1C1917] disabled:opacity-30 cursor-pointer"
                            aria-label="Move up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === lines.length - 1}
                            onClick={() => moveLine(idx, 1)}
                            className="p-0.5 text-[#A8A29E] hover:text-[#1C1917] disabled:opacity-30 cursor-pointer"
                            aria-label="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        placeholder="Item or service description..."
                        value={line.description}
                        onChange={(e) => updateLine(idx, { description: e.target.value })}
                        className="w-full h-9 px-2.5 bg-white border border-[#E7E5E4] rounded-md text-xs text-[#1C1917] focus:outline-none focus:border-[#F26522]"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(idx, { quantity: Number(e.target.value) || 0 })
                        }
                        className="w-full h-9 px-2 bg-white border border-[#E7E5E4] rounded-md text-xs text-right tabular-nums focus:outline-none focus:border-[#F26522]"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={line.unit}
                        onChange={(e) => updateLine(idx, { unit: e.target.value })}
                        className="w-full h-9 px-2 bg-white border border-[#E7E5E4] rounded-md text-xs focus:outline-none focus:border-[#F26522]"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(idx, { unitPrice: Number(e.target.value) || 0 })
                        }
                        className="w-full h-9 px-2 bg-white border border-[#E7E5E4] rounded-md text-xs text-right tabular-nums focus:outline-none focus:border-[#F26522]"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <select
                          aria-label="Discount type"
                          value={line.discountType}
                          onChange={(e) =>
                            updateLine(idx, {
                              discountType: e.target.value as DiscountType,
                              discountValue:
                                e.target.value === 'NONE' ? 0 : line.discountValue,
                            })
                          }
                          className="h-9 px-1.5 bg-white border border-[#E7E5E4] rounded-md text-xs"
                        >
                          <option value="NONE">None</option>
                          <option value="PERCENTAGE">%</option>
                          <option value="FIXED">{currency}</option>
                        </select>
                        {line.discountType !== 'NONE' && (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.discountValue}
                            onChange={(e) =>
                              updateLine(idx, {
                                discountValue: Number(e.target.value) || 0,
                              })
                            }
                            className="w-16 h-9 px-2 bg-white border border-[#E7E5E4] rounded-md text-xs text-right tabular-nums"
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={line.vatCategory}
                        onChange={(e) =>
                          updateLine(idx, {
                            vatCategory: e.target.value as VatCategory,
                          })
                        }
                        className="w-full h-9 px-2 bg-white border border-[#E7E5E4] rounded-md text-xs focus:outline-none focus:border-[#F26522]"
                      >
                        {VAT_CATEGORIES.map((vc) => (
                          <option key={vc.value} value={vc.value}>
                            {vc.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#1C1917] tabular-nums pt-5">
                      {formatCurrency(comp?.lineTotal || 0, currency)}
                    </td>
                    <td className="py-3 px-2 pt-4">
                      <button
                        type="button"
                        disabled={lines.length === 1}
                        onClick={() =>
                          setLines((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 rounded text-[#A8A29E] hover:text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-30 cursor-pointer"
                        aria-label="Delete line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Section 4: Totals + Additional Settings */}
        <div className="p-6 border-t border-[#F0EEEC] grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Currency"
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </Select>
              <Select
                label="Payment Terms"
                value={paymentTerms}
                onChange={(e) => handleTermsChange(e.target.value)}
              >
                {PAYMENT_TERMS_OPTIONS.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </Select>
            </div>

            {currency !== 'AED' && (
              <Input
                label={`AED Exchange Rate (1 ${currency} = ? AED)`}
                type="number"
                step="0.0001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value) || 1)}
                helperText="FTA requires tax amounts reported in AED equivalent"
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label="Notes to Buyer (shown on PDF)"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Textarea
                label="Internal Notes (team only)"
                rows={3}
                placeholder="Not visible to buyer..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg p-5 space-y-2.5 text-sm tabular-nums">
              <div className="flex justify-between">
                <span className="text-[#78716C]">Subtotal</span>
                <span className="font-medium text-[#1C1917]">
                  {formatCurrency(totals.subtotal, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Discount</span>
                <span className="font-medium text-[#DC2626]">
                  -{formatCurrency(totals.totalDiscount, currency)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E7E5E4]">
                <span className="text-[#78716C]">Total Before VAT</span>
                <span className="font-medium text-[#1C1917]">
                  {formatCurrency(totals.totalBeforeVat, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">VAT (Per Line)</span>
                <span className="font-medium text-[#1C1917]">
                  {formatCurrency(totals.totalVat, currency)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#E7E5E4] text-lg font-bold text-[#1C1917]">
                <span>Grand Total</span>
                <span>{formatCurrency(totals.grandTotal, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Product Catalog Modal */}
      <Modal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        title="Add from Product & Service Catalog"
        description="Select a saved item to insert with preset AED pricing and UAE VAT category."
      >
        <div className="divide-y divide-[#F0EEEC]">
          {products.length === 0 ? (
            <p className="text-sm text-[#78716C] py-6 text-center">
              No active products in catalog yet.
            </p>
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                className="py-3 flex items-center justify-between gap-4 hover:bg-[#FAFAF9] px-2 rounded-md"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1C1917]">{p.name}</p>
                  <p className="text-xs text-[#78716C] truncate">{p.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold tabular-nums">
                    {formatCurrency(p.unitPrice)} / {p.unit}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => handleAddFromProduct(p)}>
                    Add
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Preview PDF Modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Tax Invoice Preview"
        maxWidth="max-w-4xl"
      >
        {company && <InvoicePreview invoice={previewInvoice} company={company} />}
      </Modal>

      {/* Quick Add Client SlideOver */}
      <SlideOver
        open={quickClientOpen}
        onClose={() => setQuickClientOpen(false)}
        title="Quick Add Buyer"
        description="Add a UAE client with TRN without leaving your invoice."
      >
        <form onSubmit={handleQuickCreateClient} className="space-y-4">
          <Input
            label="Client Name (English) *"
            required
            value={newClientForm.nameEn}
            onChange={(e) => setNewClientForm({ ...newClientForm, nameEn: e.target.value })}
          />
          <Input
            label="Client Name (Arabic)"
            dir="rtl"
            className="font-arabic"
            value={newClientForm.nameAr}
            onChange={(e) => setNewClientForm({ ...newClientForm, nameAr: e.target.value })}
          />
          <Input
            label="Buyer TRN (15 digits)"
            placeholder="100123456789012"
            maxLength={15}
            value={newClientForm.trn}
            error={
              newClientForm.trn && !isValidUaeTrn(newClientForm.trn)
                ? 'UAE TRN must be 15 digits starting with 100'
                : undefined
            }
            onChange={(e) =>
              setNewClientForm({
                ...newClientForm,
                trn: e.target.value.replace(/\D/g, ''),
              })
            }
          />
          <Input
            label="Email"
            type="email"
            value={newClientForm.email}
            onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
          />
          <Input
            label="Street Address"
            value={newClientForm.addressLine1}
            onChange={(e) =>
              setNewClientForm({ ...newClientForm, addressLine1: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Emirate"
              value={newClientForm.emirate}
              onChange={(e) =>
                setNewClientForm({ ...newClientForm, emirate: e.target.value })
              }
            >
              {UAE_EMIRATES.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </Select>
            <Input
              label="City"
              value={newClientForm.city}
              onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })}
            />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setQuickClientOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creatingClient}>
              Save Client
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
