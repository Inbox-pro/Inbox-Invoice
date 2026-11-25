import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../services/api.ts';
import { useAuthStore } from '../stores/authStore.ts';
import {
  CURRENCIES,
  isValidUaeTrn,
  PAYMENT_TERMS_OPTIONS,
  UAE_EMIRATES,
} from '../../shared/schemas.ts';
import {
  Button,
  Card,
  FatooraLogo,
  Input,
  Select,
  Textarea,
} from '../components/ui/Primitives.tsx';
import type { Company } from '../../shared/types.ts';

const STEPS = [
  { id: 1, title: 'Company Details' },
  { id: 2, title: 'Branding & Bank' },
  { id: 3, title: 'Invoice Settings' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { company, setCompany } = useAuthStore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [form, setForm] = useState({
    nameEn: company?.nameEn || '',
    nameAr: company?.nameAr || '',
    trn: company?.trn || '',
    licenseNumber: company?.licenseNumber || '',
    emirate: company?.emirate || 'Dubai',
    city: company?.city || 'Dubai',
    addressLine1: company?.addressLine1 || '',
    bankName: company?.bankName || '',
    bankAccountName: company?.bankAccountName || company?.nameEn || '',
    bankIban: company?.bankIban || '',
    bankSwift: company?.bankSwift || '',
    invoicePrefix: company?.invoicePrefix || 'INV',
    invoiceNextNumber: company?.invoiceNextNumber || 1,
    defaultPaymentTermsDays: company?.defaultPaymentTermsDays || 30,
    defaultCurrency: company?.defaultCurrency || 'AED',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logoUrl || null);

  const trnError =
    form.trn && !isValidUaeTrn(form.trn)
      ? 'UAE TRN must be 15 digits starting with 100'
      : undefined;

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post<{ success: boolean; data: { logoUrl: string } }>(
        '/api/company/logo',
        fd
      );
      setLogoPreview(res.data.logoUrl);
      if (company) setCompany({ ...company, logoUrl: res.data.logoUrl });
      toast.success('Company logo uploaded');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFinish = async (skip = false) => {
    if (!skip && trnError) {
      toast.error(trnError);
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      const payload = skip
        ? { isOnboarded: true }
        : {
            ...form,
            trn: form.trn || null,
            nameAr: form.nameAr || null,
            licenseNumber: form.licenseNumber || null,
            addressLine1: form.addressLine1 || null,
            bankName: form.bankName || null,
            bankAccountName: form.bankAccountName || null,
            bankIban: form.bankIban || null,
            bankSwift: form.bankSwift || null,
            isOnboarded: true,
          };
      const res = await api.put<{ success: boolean; data: Company }>('/api/company', payload);
      setCompany(res.data);
      toast.success('Company setup complete! Welcome to Inbox Invoice.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save company setup');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <FatooraLogo size="md" />
          <button
            type="button"
            onClick={() => handleFinish(true)}
            className="text-xs font-medium text-[#78716C] hover:text-[#1C1917] cursor-pointer"
          >
            Skip for now
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, idx) => {
            const done = step > s.id;
            const current = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      done
                        ? 'bg-[#16A34A] text-white'
                        : current
                          ? 'bg-[#F26522] text-white'
                          : 'bg-white border border-[#E7E5E4] text-[#78716C]'
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:inline ${
                      current ? 'text-[#1C1917]' : 'text-[#78716C]'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 h-px bg-[#E7E5E4] mx-4" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <Card className="p-6 sm:p-8 shadow-sm">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-[#1C1917]">Company Details</h1>
                <p className="text-sm text-[#78716C] mt-1">
                  These details appear on your UAE Tax Invoices and PINT-AE XML documents.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Company Name (English) *"
                  required
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                />
                <Input
                  label="Company Name (Arabic)"
                  dir="rtl"
                  placeholder="الاسم التجاري بالعربية"
                  className="font-arabic"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="UAE TRN (Tax Registration Number)"
                  placeholder="100345678901234"
                  maxLength={15}
                  value={form.trn}
                  error={trnError}
                  helperText="15 digits starting with 100"
                  onChange={(e) =>
                    setForm({ ...form, trn: e.target.value.replace(/\D/g, '') })
                  }
                />
                <Input
                  label="Trade License Number"
                  placeholder="CN-4829104"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Textarea
                label="Street Address"
                rows={2}
                placeholder="Office 1205, Business Bay Tower"
                value={form.addressLine1}
                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-[#1C1917]">Branding &amp; Bank Details</h1>
                <p className="text-sm text-[#78716C] mt-1">
                  Upload your company logo and add payment coordinates shown on invoices.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#44403C] mb-1.5">
                  Company Logo
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E7E5E4] hover:border-[#F26522] rounded-lg p-6 cursor-pointer bg-[#FAFAF9] transition-colors">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Company logo"
                      className="h-14 object-contain mb-2"
                    />
                  ) : (
                    <Upload className="w-6 h-6 text-[#A8A29E] mb-2" />
                  )}
                  <span className="text-xs font-medium text-[#44403C]">
                    {uploadingLogo ? 'Uploading...' : 'Click to upload PNG, JPG, or WebP (max 2MB)'}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoUpload(f);
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Bank Name"
                  placeholder="Emirates NBD"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                />
                <Input
                  label="Account Name"
                  placeholder="Your Company LLC"
                  value={form.bankAccountName}
                  onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="IBAN"
                  placeholder="AE070260001015489203401"
                  value={form.bankIban}
                  onChange={(e) => setForm({ ...form, bankIban: e.target.value.toUpperCase() })}
                />
                <Input
                  label="SWIFT / BIC"
                  placeholder="EBILAEAD"
                  value={form.bankSwift}
                  onChange={(e) => setForm({ ...form, bankSwift: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-[#1C1917]">Invoice Settings</h1>
                <p className="text-sm text-[#78716C] mt-1">
                  Configure your sequential numbering and default billing preferences.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Invoice Prefix"
                  value={form.invoicePrefix}
                  onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value.toUpperCase() })}
                />
                <Input
                  label="Starting Number"
                  type="number"
                  min={1}
                  value={form.invoiceNextNumber}
                  onChange={(e) =>
                    setForm({ ...form, invoiceNextNumber: Number(e.target.value) || 1 })
                  }
                  helperText={`First invoice: ${form.invoicePrefix}-${String(form.invoiceNextNumber).padStart(5, '0')}`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Default Payment Terms"
                  value={form.defaultPaymentTermsDays}
                  onChange={(e) =>
                    setForm({ ...form, defaultPaymentTermsDays: Number(e.target.value) })
                  }
                >
                  {PAYMENT_TERMS_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.days}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Default Currency"
                  value={form.defaultCurrency}
                  onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          <div className="mt-8 pt-5 border-t border-[#F0EEEC] flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Back
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                onClick={() => {
                  if (step === 1 && !form.nameEn.trim()) {
                    toast.error('Company English name is required');
                    return;
                  }
                  if (step === 1 && trnError) {
                    toast.error(trnError);
                    return;
                  }
                  setStep((s) => s + 1);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button type="button" loading={saving} onClick={() => handleFinish(false)}>
                Complete Setup
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
