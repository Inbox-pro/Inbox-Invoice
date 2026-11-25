import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Edit3,
  FileCode2,
  Printer,
  ReceiptText,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../services/api.ts';
import {
  downloadInvoicePdf,
  downloadTextFile,
  formatCurrency,
  formatDate,
  formatRelativeTime,
} from '../lib/formatters.ts';
import { PAYMENT_METHODS } from '../../shared/schemas.ts';
import InvoicePreview from '../components/invoices/InvoicePreview.tsx';
import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  SkeletonCard,
  StatusBadge,
} from '../components/ui/Primitives.tsx';
import type {
  Activity,
  CreditNote,
  FtaValidationResult,
  Invoice,
} from '../../shared/types.ts';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [xmlContent, setXmlContent] = useState('');
  const [xmlFilename, setXmlFilename] = useState('');
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'BANK_TRANSFER',
    reference: '',
    notes: '',
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () =>
      api.get<{
        success: boolean;
        data: {
          invoice: Invoice;
          validation: FtaValidationResult;
          activities: Activity[];
          creditNotes: CreditNote[];
        };
      }>(`/api/invoices/${id}`),
  });

  const sendMutation = useMutation({
    mutationFn: () => api.post(`/api/invoices/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Invoice validated and sent to client');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Unable to send invoice'),
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/invoices/${id}/payment`, {
        amount: Number(payForm.amount),
        paymentDate: payForm.paymentDate,
        paymentMethod: payForm.paymentMethod,
        reference: payForm.reference || null,
        notes: payForm.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setPaymentModalOpen(false);
      toast.success('Payment recorded');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Payment could not be recorded'),
  });

  const voidMutation = useMutation({
    mutationFn: () => api.post(`/api/invoices/${id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice voided');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not void invoice'),
  });

  const duplicateMutation = useMutation({
    mutationFn: () =>
      api.post<{ success: boolean; data: Invoice }>(`/api/invoices/${id}/duplicate`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Duplicated as ${res.data.invoiceNumber}`);
      navigate(`/invoices/${res.data.id}/edit`);
    },
  });

  const handleGenerateXml = async () => {
    try {
      const res = await api.get<{
        success: boolean;
        data: { xml: string; filename: string };
      }>(`/api/invoices/${id}/xml?format=json`);
      setXmlContent(res.data.xml);
      setXmlFilename(res.data.filename);
      setXmlModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'XML generation failed');
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="lg:col-span-7">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isError || !data?.data?.invoice) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-medium text-[#1C1917]">Invoice not found.</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </Button>
      </Card>
    );
  }

  const { invoice, validation, activities, creditNotes } = data.data;
  const isTerminal = ['PAID', 'VOID', 'CANCELLED'].includes(invoice.status);

  return (
    <div className="space-y-6">
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
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-[#1C1917] font-mono">
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">
              Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isTerminal && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => duplicateMutation.mutate()}
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </Button>
          {invoice.status === 'DRAFT' && (
            <Button
              size="sm"
              loading={sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              <Send className="w-3.5 h-3.5" />
              Validate &amp; Send
            </Button>
          )}
          {!isTerminal && invoice.amountDue > 0 && (
            <Button
              size="sm"
              onClick={() => {
                setPayForm({
                  ...payForm,
                  amount: invoice.amountDue.toFixed(2),
                });
                setPaymentModalOpen(true);
              }}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Split Layout: 40% Info Panel + 60% Live Invoice Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel */}
        <div className="lg:col-span-5 space-y-5">
          {/* Payment Summary */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#1C1917]">Payment Status</h2>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-md bg-[#FAFAF9] border border-[#F0EEEC]">
                <p className="text-[#78716C]">Grand Total</p>
                <p className="text-base font-bold text-[#1C1917] tabular-nums mt-0.5">
                  {formatCurrency(invoice.grandTotal, invoice.currency)}
                </p>
              </div>
              <div className="p-3 rounded-md bg-[#FAFAF9] border border-[#F0EEEC]">
                <p className="text-[#78716C]">Amount Due</p>
                <p
                  className={`text-base font-bold tabular-nums mt-0.5 ${
                    invoice.amountDue > 0 ? 'text-[#F26522]' : 'text-[#16A34A]'
                  }`}
                >
                  {formatCurrency(invoice.amountDue, invoice.currency)}
                </p>
              </div>
            </div>

            {invoice.payments && invoice.payments.length > 0 && (
              <div className="pt-2 border-t border-[#F0EEEC] space-y-2">
                <p className="text-xs font-medium text-[#78716C]">Recorded Payments</p>
                {invoice.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs py-1.5"
                  >
                    <div>
                      <p className="font-medium text-[#1C1917]">
                        {formatDate(p.paymentDate)} · {p.paymentMethod.replace('_', ' ')}
                      </p>
                      {p.reference && (
                        <p className="text-[#A8A29E] font-mono">Ref: {p.reference}</p>
                      )}
                    </div>
                    <span className="font-semibold text-[#16A34A] tabular-nums">
                      +{formatCurrency(p.amount, invoice.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-[#F0EEEC] flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate(`/credit-notes/new?invoiceId=${invoice.id}`)}
              >
                <ReceiptText className="w-3.5 h-3.5" />
                Issue Credit Note
              </Button>
              {!isTerminal && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#DC2626] hover:bg-[#FEF2F2]"
                  onClick={() => voidMutation.mutate()}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Void
                </Button>
              )}
            </div>
          </Card>

          {/* FTA 51-Field Compliance Checklist */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#F26522]" />
                <h2 className="text-sm font-semibold text-[#1C1917]">FTA PINT-AE Compliance</h2>
              </div>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  validation.valid ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}
              >
                {validation.passedFieldsCount}/{validation.totalFieldsChecked} fields
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {validation.checks.map((chk) => (
                <div
                  key={chk.id}
                  className="flex items-start gap-2.5 text-xs py-1.5 border-b border-[#F0EEEC] last:border-0"
                >
                  {chk.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-[#1C1917]">{chk.label}</p>
                    <p className="text-[#78716C]">{chk.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#F0EEEC] flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={handleGenerateXml}>
                <FileCode2 className="w-3.5 h-3.5" />
                {invoice.xmlGenerated ? 'View / Download PINT-AE XML' : 'Generate PINT-AE XML'}
              </Button>
            </div>
          </Card>

          {/* Linked Credit Notes */}
          {creditNotes.length > 0 && (
            <Card className="p-5 space-y-2.5">
              <h2 className="text-sm font-semibold text-[#1C1917]">Linked Credit Notes</h2>
              {creditNotes.map((cn) => (
                <div
                  key={cn.id}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-[#F0EEEC] last:border-0"
                >
                  <div>
                    <span className="font-mono font-semibold text-[#1C1917]">
                      {cn.creditNoteNumber}
                    </span>
                    <span className="text-[#78716C] ml-2">{cn.reason}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      -{formatCurrency(cn.grandTotal, invoice.currency)}
                    </span>
                    <StatusBadge status={cn.status} />
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Timeline */}
          <Card className="p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#1C1917]">Invoice Timeline</h2>
            {invoice.client && (
              <p className="text-xs text-[#78716C]">
                Client:{' '}
                <Link
                  to={`/clients/${invoice.client.id}`}
                  className="font-medium text-[#F26522] hover:underline"
                >
                  {invoice.client.nameEn}
                </Link>
              </p>
            )}
            <div className="space-y-2.5 text-xs pt-1">
              {activities.length === 0 ? (
                <p className="text-[#78716C]">Created {formatDate(invoice.createdAt)}</p>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="flex justify-between gap-3">
                    <span className="text-[#44403C]">{a.description}</span>
                    <span className="text-[#A8A29E] whitespace-nowrap shrink-0">
                      {formatRelativeTime(a.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel: Bilingual Tax Invoice Preview */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#78716C]">
              Bilingual UAE Tax Invoice Document
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.print()}
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (invoice.company) {
                    downloadInvoicePdf(invoice, invoice.company);
                    toast.success(`Downloaded ${invoice.invoiceNumber}.pdf`);
                  }
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </Button>
            </div>
          </div>

          {invoice.company && (
            <InvoicePreview invoice={invoice} company={invoice.company} />
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment — ${invoice.invoiceNumber}`}
        description={`Remaining balance: ${formatCurrency(invoice.amountDue, invoice.currency)}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            paymentMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label={`Payment Amount (${invoice.currency}) *`}
            type="number"
            step="0.01"
            min="0.01"
            max={invoice.amountDue}
            required
            value={payForm.amount}
            onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Payment Date *"
              type="date"
              required
              value={payForm.paymentDate}
              onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
            />
            <Select
              label="Method"
              value={payForm.paymentMethod}
              onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.value} value={pm.value}>
                  {pm.label}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Bank / Transfer Reference"
            placeholder="FT-20269910"
            value={payForm.reference}
            onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
          />
          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={paymentMutation.isPending}>
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* PINT-AE XML Modal */}
      <Modal
        open={xmlModalOpen}
        onClose={() => setXmlModalOpen(false)}
        title={`PINT-AE UBL 2.1 XML — ${invoice.invoiceNumber}`}
        description="Structured UAE Peppol 5-corner electronic invoice payload."
        maxWidth="max-w-3xl"
      >
        <pre className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg p-4 text-[11px] font-mono text-[#1C1917] overflow-x-auto max-h-[55vh]">
          {xmlContent}
        </pre>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setXmlModalOpen(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              downloadTextFile(xmlFilename, xmlContent, 'application/xml');
              toast.success(`Downloaded ${xmlFilename}`);
            }}
          >
            <Download className="w-4 h-4" />
            Download XML File
          </Button>
        </div>
      </Modal>
    </div>
  );
}
