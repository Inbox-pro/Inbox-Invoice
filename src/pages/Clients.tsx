import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit3,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../services/api.ts';
import { isValidUaeTrn, UAE_EMIRATES } from '../../shared/schemas.ts';
import { formatCurrency, formatDate, formatRelativeTime } from '../lib/formatters.ts';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  SkeletonCard,
  SkeletonTable,
  SlideOver,
  StatusBadge,
  Textarea,
} from '../components/ui/Primitives.tsx';
import type { Activity, Client, CreditNote, Invoice } from '../../shared/types.ts';

function ClientFormSlideOver({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Client | null;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nameEn: '',
    nameAr: '',
    trn: '',
    tin: '',
    email: '',
    phone: '',
    contactPerson: '',
    addressLine1: '',
    city: 'Dubai',
    emirate: 'Dubai',
    poBox: '',
    defaultPaymentTermsDays: 30,
    notes: '',
  });

  useEffect(() => {
    if (editing) {
      setForm({
        nameEn: editing.nameEn || '',
        nameAr: editing.nameAr || '',
        trn: editing.trn || '',
        tin: editing.tin || '',
        email: editing.email || '',
        phone: editing.phone || '',
        contactPerson: editing.contactPerson || '',
        addressLine1: editing.addressLine1 || '',
        city: editing.city || 'Dubai',
        emirate: editing.emirate || 'Dubai',
        poBox: editing.poBox || '',
        defaultPaymentTermsDays: editing.defaultPaymentTermsDays ?? 30,
        notes: editing.notes || '',
      });
    } else {
      setForm({
        nameEn: '',
        nameAr: '',
        trn: '',
        tin: '',
        email: '',
        phone: '',
        contactPerson: '',
        addressLine1: '',
        city: 'Dubai',
        emirate: 'Dubai',
        poBox: '',
        defaultPaymentTermsDays: 30,
        notes: '',
      });
    }
  }, [editing, open]);

  const trnError =
    form.trn && !isValidUaeTrn(form.trn)
      ? 'UAE TRN must be 15 digits starting with 100'
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trnError) {
      toast.error(trnError);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        trn: form.trn || null,
        tin: form.tin || null,
        nameAr: form.nameAr || null,
        email: form.email || null,
        phone: form.phone || null,
        contactPerson: form.contactPerson || null,
        addressLine1: form.addressLine1 || null,
        poBox: form.poBox || null,
        notes: form.notes || null,
      };
      if (editing) {
        await api.put(`/api/clients/${editing.id}`, payload);
        toast.success('Client updated');
      } else {
        await api.post('/api/clients', payload);
        toast.success('Client added');
      }
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      if (editing) queryClient.invalidateQueries({ queryKey: ['client', editing.id] });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Client' : 'Add Client'}
      description="Buyer details are used on bilingual UAE tax invoices and PINT-AE XML."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Client Name (English) *"
          required
          value={form.nameEn}
          onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
        />
        <Input
          label="Client Name (Arabic)"
          dir="rtl"
          className="font-arabic"
          placeholder="الاسم بالعربية"
          value={form.nameAr}
          onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="UAE TRN (15 digits)"
            placeholder="100123456789012"
            maxLength={15}
            value={form.trn}
            error={trnError}
            onChange={(e) =>
              setForm({ ...form, trn: e.target.value.replace(/\D/g, '') })
            }
          />
          <Input
            label="Peppol TIN"
            placeholder="0235:1001234..."
            value={form.tin}
            onChange={(e) => setForm({ ...form, tin: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Phone"
            placeholder="+971 4 123 4567"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <Input
          label="Contact Person"
          value={form.contactPerson}
          onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
        />
        <Input
          label="Street Address"
          value={form.addressLine1}
          onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Emirate"
            value={form.emirate}
            onChange={(e) => setForm({ ...form, emirate: e.target.value })}
          >
            {UAE_EMIRATES.map((em) => (
              <option key={em} value={em}>
                {em}
              </option>
            ))}
          </Select>
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <Input
          label="Default Payment Terms (Days)"
          type="number"
          min={0}
          max={365}
          value={form.defaultPaymentTermsDays}
          onChange={(e) =>
            setForm({ ...form, defaultPaymentTermsDays: Number(e.target.value) || 0 })
          }
        />
        <Textarea
          label="Internal Notes"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div className="pt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? 'Update Client' : 'Save Client'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}

export function ClientsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [drawerOpen, setDrawerOpen] = useState(searchParams.get('new') === '1');
  const [editing, setEditing] = useState<Client | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setDrawerOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', statusFilter, search],
    queryFn: () =>
      api.get<{ success: boolean; data: Client[] }>(
        `/api/clients?status=${statusFilter}&search=${encodeURIComponent(search)}`
      ),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client moved to inactive');
    },
  });

  const clients = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Clients</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Manage UAE buyers, verified 15-digit TRNs, and receivable balances.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      {/* Controls */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, TRN, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-white border border-[#E7E5E4] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center p-1 bg-[#F5F5F4] rounded-md">
            {(['active', 'inactive', 'all'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded text-xs font-medium capitalize cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center p-1 bg-[#F5F5F4] rounded-md">
            <button
              type="button"
              aria-label="Table view"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#1C1917]' : 'text-[#78716C]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Card view"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-[#1C1917]' : 'text-[#78716C]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <SkeletonTable rows={5} cols={6} />
        </Card>
      ) : clients.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No clients found"
            description="Add your first UAE business client with their TRN to start issuing compliant invoices."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setDrawerOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Add Client
              </Button>
            }
          />
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#FAFAF9] text-[#78716C] text-xs font-medium uppercase tracking-wider border-b border-[#E7E5E4]">
                  <th className="py-3 px-5">Client Name</th>
                  <th className="py-3 px-4">TRN</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Emirate</th>
                  <th className="py-3 px-4 text-right">Invoices</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEEC]">
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="h-[52px] hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                  >
                    <td className="px-5">
                      <p className="font-semibold text-[#1C1917]">{c.nameEn}</p>
                      {c.nameAr && (
                        <p className="font-arabic text-xs text-[#78716C]">{c.nameAr}</p>
                      )}
                    </td>
                    <td className="px-4 font-mono text-xs text-[#44403C] tabular-nums">
                      {c.trn || '—'}
                    </td>
                    <td className="px-4 text-xs text-[#78716C]">{c.email || '—'}</td>
                    <td className="px-4 text-xs text-[#78716C]">{c.emirate || '—'}</td>
                    <td className="px-4 text-right text-xs font-medium tabular-nums">
                      {c.invoiceCount ?? 0}
                    </td>
                    <td className="px-4 text-right font-semibold text-[#1C1917] tabular-nums">
                      {formatCurrency(c.outstanding || 0)}
                    </td>
                    <td
                      className="px-5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(c);
                            setDrawerOpen(true);
                          }}
                          className="p-1.5 rounded text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917] cursor-pointer"
                          aria-label="Edit client"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {c.isActive && (
                          <button
                            type="button"
                            onClick={() => archiveMutation.mutate(c.id)}
                            className="p-1.5 rounded text-[#78716C] hover:bg-[#FEF2F2] hover:text-[#DC2626] cursor-pointer"
                            aria-label="Deactivate client"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <Card key={c.id} className="p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[#1C1917]">{c.nameEn}</h3>
                    {c.trn && (
                      <p className="text-xs font-mono text-[#78716C] mt-0.5">
                        TRN {c.trn}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <p className="text-xs text-[#78716C] mt-2">{c.email || c.phone || c.emirate}</p>
                <div className="mt-4 pt-3 border-t border-[#F0EEEC] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[#A8A29E]">Invoices</p>
                    <p className="font-semibold text-[#1C1917] tabular-nums">
                      {c.invoiceCount ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#A8A29E]">Outstanding</p>
                    <p className="font-semibold text-[#1C1917] tabular-nums">
                      {formatCurrency(c.outstanding || 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => navigate(`/clients/${c.id}`)}
                >
                  View
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/invoices/new?clientId=${c.id}`)}
                >
                  New Invoice
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ClientFormSlideOver
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editing}
      />
    </div>
  );
}

export function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'invoices' | 'creditNotes' | 'activity' | 'notes'>('invoices');
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () =>
      api.get<{
        success: boolean;
        data: {
          client: Client;
          invoices: Invoice[];
          creditNotes: CreditNote[];
          activities: Activity[];
        };
      }>(`/api/clients/${id}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const payload = data?.data;
  if (!payload) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-[#1C1917]">Client not found.</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/clients')}>
          Back to Clients
        </Button>
      </Card>
    );
  }

  const { client, invoices, creditNotes, activities } = payload;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="p-2 rounded-md border border-[#E7E5E4] text-[#44403C] hover:bg-[#F5F5F4] cursor-pointer"
            aria-label="Back to clients"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1C1917]">{client.nameEn}</h1>
            <p className="text-xs text-[#78716C] mt-0.5 tabular-nums">
              {client.trn ? `TRN ${client.trn}` : 'No TRN'} · {client.emirate || 'UAE'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Edit3 className="w-4 h-4" />
            Edit
          </Button>
          <Button onClick={() => navigate(`/invoices/new?clientId=${client.id}`)}>
            <Plus className="w-4 h-4" />
            New Invoice for Client
          </Button>
        </div>
      </div>

      {/* 4 Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs font-medium text-[#78716C]">Total Billed</p>
          <p className="text-xl font-bold text-[#1C1917] tabular-nums mt-1.5">
            {formatCurrency(client.totalBilled || 0)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#78716C]">Total Paid</p>
          <p className="text-xl font-bold text-[#16A34A] tabular-nums mt-1.5">
            {formatCurrency(client.totalPaid || 0)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#78716C]">Outstanding</p>
          <p className="text-xl font-bold text-[#F26522] tabular-nums mt-1.5">
            {formatCurrency(client.outstanding || 0)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-[#78716C]">Avg Payment Time</p>
          <p className="text-xl font-bold text-[#1C1917] tabular-nums mt-1.5">
            {client.averagePaymentDays || 0} days
          </p>
        </Card>
      </div>

      {/* Client Info Card */}
      <Card className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E] mb-2">
            Legal &amp; Tax Details
          </p>
          <p className="font-medium text-[#1C1917]">{client.nameEn}</p>
          {client.nameAr && (
            <p className="font-arabic text-xs text-[#44403C] mt-0.5">{client.nameAr}</p>
          )}
          <p className="text-xs text-[#78716C] font-mono mt-1.5">
            TRN: {client.trn || 'Not provided'}
          </p>
          {client.tin && (
            <p className="text-xs text-[#78716C] font-mono">TIN: {client.tin}</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E] mb-2">
            Contact
          </p>
          <p className="text-xs text-[#1C1917]">{client.contactPerson || '—'}</p>
          <p className="text-xs text-[#78716C] mt-1">{client.email || '—'}</p>
          <p className="text-xs text-[#78716C] mt-0.5">{client.phone || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E] mb-2">
            Address
          </p>
          <p className="text-xs text-[#44403C]">
            {[client.addressLine1, client.city, client.emirate, client.poBox, client.country]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
      </Card>

      {/* Tabs */}
      <Card className="overflow-hidden">
        <div className="px-6 border-b border-[#E7E5E4] flex items-center gap-6 overflow-x-auto">
          {(
            [
              { id: 'invoices', label: `Invoices (${invoices.length})` },
              { id: 'creditNotes', label: `Credit Notes (${creditNotes.length})` },
              { id: 'activity', label: 'Activity' },
              { id: 'notes', label: 'Notes' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                tab === t.id
                  ? 'border-[#F26522] text-[#F26522]'
                  : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'invoices' && (
          <div className="overflow-x-auto">
            {invoices.length === 0 ? (
              <p className="text-sm text-[#78716C] py-10 text-center">No invoices yet.</p>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#FAFAF9] text-[#78716C] text-xs uppercase border-b border-[#E7E5E4]">
                    <th className="py-3 px-5">Invoice #</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EEEC]">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="h-[48px] hover:bg-[#FAFAF9] cursor-pointer"
                    >
                      <td className="px-5 font-mono text-xs font-semibold">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 text-xs text-[#78716C]">
                        {formatDate(inv.issueDate)}
                      </td>
                      <td className="px-4 text-xs text-[#78716C]">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="px-4 text-right font-semibold tabular-nums">
                        {formatCurrency(inv.grandTotal, inv.currency)}
                      </td>
                      <td className="px-5 text-right">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'creditNotes' && (
          <div className="p-6">
            {creditNotes.length === 0 ? (
              <p className="text-sm text-[#78716C] text-center py-6">
                No credit notes for this client.
              </p>
            ) : (
              <div className="divide-y divide-[#F0EEEC]">
                {creditNotes.map((cn) => (
                  <div key={cn.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-mono font-semibold">{cn.creditNoteNumber}</span>
                      <span className="text-xs text-[#78716C] ml-3">
                        Invoice {cn.invoiceNumber} · {formatDate(cn.issueDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(cn.grandTotal)}
                      </span>
                      <StatusBadge status={cn.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="p-6 divide-y divide-[#F0EEEC]">
            {activities.length === 0 ? (
              <p className="text-sm text-[#78716C] text-center py-6">No logged activity.</p>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="py-3 flex justify-between gap-4 text-sm">
                  <span className="text-[#1C1917]">{a.description}</span>
                  <span className="text-xs text-[#A8A29E] whitespace-nowrap">
                    {formatRelativeTime(a.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="p-6 text-sm text-[#44403C]">
            {client.notes || 'No internal notes saved for this client.'}
          </div>
        )}
      </Card>

      <ClientFormSlideOver
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={client}
      />
    </div>
  );
}
