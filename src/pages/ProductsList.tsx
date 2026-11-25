import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Package, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../services/api.ts';
import { UNITS, VAT_CATEGORIES } from '../../shared/schemas.ts';
import { formatCurrency } from '../lib/formatters.ts';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  SkeletonTable,
  SlideOver,
  StatusBadge,
  Textarea,
} from '../components/ui/Primitives.tsx';
import type { Product, VatCategory } from '../../shared/types.ts';

export default function ProductsList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    unitPrice: '0',
    unit: 'UNIT',
    vatCategory: 'STANDARD' as VatCategory,
    hsnCode: '',
  });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description || '',
        unitPrice: String(editing.unitPrice),
        unit: editing.unit,
        vatCategory: editing.vatCategory,
        hsnCode: editing.hsnCode || '',
      });
    } else {
      setForm({
        name: '',
        description: '',
        unitPrice: '0',
        unit: 'UNIT',
        vatCategory: 'STANDARD',
        hsnCode: '',
      });
    }
  }, [editing, drawerOpen]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () =>
      api.get<{ success: boolean; data: Product[] }>(
        `/api/products?search=${encodeURIComponent(search)}`
      ),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product marked inactive');
    },
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        unitPrice: Number(form.unitPrice) || 0,
        unit: form.unit,
        vatCategory: form.vatCategory,
        hsnCode: form.hsnCode || null,
      };
      if (editing) {
        await api.put(`/api/products/${editing.id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/api/products', payload);
        toast.success('Product added to catalog');
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDrawerOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const products = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Products &amp; Services</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Reusable line items with preset AED pricing and UAE VAT categories.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products or services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-white border border-[#E7E5E4] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522]"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="No products or services yet"
            description="Save frequently billed items to speed up invoice creation and enforce consistent VAT rules."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setDrawerOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#FAFAF9] text-[#78716C] text-xs font-medium uppercase tracking-wider border-b border-[#E7E5E4]">
                  <th className="py-3 px-5">Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">VAT Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEEC]">
                {products.map((p) => {
                  const vatMeta = VAT_CATEGORIES.find((v) => v.value === p.vatCategory);
                  return (
                    <tr key={p.id} className="h-[52px] hover:bg-[#FAFAF9] transition-colors">
                      <td className="px-5 font-semibold text-[#1C1917]">{p.name}</td>
                      <td className="px-4 text-xs text-[#78716C] max-w-xs truncate">
                        {p.description || '—'}
                      </td>
                      <td className="px-4 text-right font-semibold tabular-nums">
                        {formatCurrency(p.unitPrice)}
                      </td>
                      <td className="px-4 text-xs text-[#78716C]">{p.unit}</td>
                      <td className="px-4 text-xs text-[#44403C]">
                        {vatMeta?.label || p.vatCategory}
                      </td>
                      <td className="px-4">
                        <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td className="px-5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(p);
                              setDrawerOpen(true);
                            }}
                            className="p-1.5 rounded text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917] cursor-pointer"
                            aria-label="Edit product"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {p.isActive && (
                            <button
                              type="button"
                              onClick={() => deactivateMutation.mutate(p.id)}
                              className="p-1.5 rounded text-[#78716C] hover:bg-[#FEF2F2] hover:text-[#DC2626] cursor-pointer"
                              aria-label="Deactivate product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SlideOver
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Edit Product / Service' : 'Add Product / Service'}
        description="Configure pricing and UAE FTA VAT schedule."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Name *"
            required
            placeholder="Web Development Retainer"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Textarea
            label="Description"
            rows={3}
            placeholder="Monthly full-stack engineering support"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unit Price (AED) *"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            />
            <Select
              label="Unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
          <Select
            label="UAE VAT Category"
            value={form.vatCategory}
            onChange={(e) =>
              setForm({ ...form, vatCategory: e.target.value as VatCategory })
            }
          >
            {VAT_CATEGORIES.map((vc) => (
              <option key={vc.value} value={vc.value}>
                {vc.label}
              </option>
            ))}
          </Select>
          <Input
            label="HS / SAC Code (Optional)"
            placeholder="998314"
            value={form.hsnCode}
            onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
          />
          <div className="pt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
