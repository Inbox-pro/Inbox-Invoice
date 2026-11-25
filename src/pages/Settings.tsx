import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Upload, UserPlus } from 'lucide-react';
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
  Input,
  Modal,
  Select,
  Textarea,
} from '../components/ui/Primitives.tsx';
import type { Company, User, UserRole } from '../../shared/types.ts';

type SettingsTab = 'profile' | 'invoice' | 'bank' | 'branding' | 'team' | 'account';

const ACCENT_PRESETS = ['#F26522', '#1C1917', '#0F766E', '#1D4ED8', '#B45309'];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, company, setCompany, setUser } = useAuthStore();

  const initialTab = (searchParams.get('tab') as SettingsTab) || 'profile';
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab') as SettingsTab | null;
    if (t && ['profile', 'invoice', 'bank', 'branding', 'team', 'account'].includes(t)) {
      setTab(t);
    }
  }, [searchParams]);

  const [form, setForm] = useState({
    nameEn: company?.nameEn || '',
    nameAr: company?.nameAr || '',
    trn: company?.trn || '',
    tin: company?.tin || '',
    licenseNumber: company?.licenseNumber || '',
    addressLine1: company?.addressLine1 || '',
    addressLine2: company?.addressLine2 || '',
    city: company?.city || 'Dubai',
    emirate: company?.emirate || 'Dubai',
    poBox: company?.poBox || '',
    email: company?.email || '',
    phone: company?.phone || '',
    website: company?.website || '',
    accentColor: company?.accentColor || '#F26522',
    invoicePrefix: company?.invoicePrefix || 'INV',
    invoiceNextNumber: company?.invoiceNextNumber || 1,
    creditNotePrefix: company?.creditNotePrefix || 'CN',
    creditNoteNextNum: company?.creditNoteNextNum || 1,
    defaultPaymentTermsDays: company?.defaultPaymentTermsDays || 30,
    defaultCurrency: company?.defaultCurrency || 'AED',
    defaultNotes: company?.defaultNotes || '',
    bankName: company?.bankName || '',
    bankAccountName: company?.bankAccountName || '',
    bankAccountNumber: company?.bankAccountNumber || '',
    bankIban: company?.bankIban || '',
    bankSwift: company?.bankSwift || '',
  });

  const [accountForm, setAccountForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'ACCOUNTANT' as 'ADMIN' | 'ACCOUNTANT' | 'VIEWER',
  });

  const { data: teamData } = useQuery({
    queryKey: ['team'],
    enabled: tab === 'team',
    queryFn: () => api.get<{ success: boolean; data: User[] }>('/api/team'),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.post('/api/team/invite', inviteForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setInviteOpen(false);
      setInviteForm({ firstName: '', lastName: '', email: '', role: 'ACCOUNTANT' });
      toast.success('Team member invited');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Unable to invite member'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/team/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Team member removed');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Unable to remove member'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      api.put(`/api/team/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Role updated');
    },
  });

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.trn && !isValidUaeTrn(form.trn)) {
      toast.error('UAE TRN must be 15 digits starting with 100');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put<{ success: boolean; data: Company }>('/api/company', {
        ...form,
        trn: form.trn || null,
        tin: form.tin || null,
        nameAr: form.nameAr || null,
        licenseNumber: form.licenseNumber || null,
        addressLine1: form.addressLine1 || null,
        addressLine2: form.addressLine2 || null,
        poBox: form.poBox || null,
        phone: form.phone || null,
        website: form.website || null,
        defaultNotes: form.defaultNotes || null,
        bankName: form.bankName || null,
        bankAccountName: form.bankAccountName || null,
        bankAccountNumber: form.bankAccountNumber || null,
        bankIban: form.bankIban || null,
        bankSwift: form.bankSwift || null,
      });
      setCompany(res.data);
      toast.success('Company settings saved');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post<{ success: boolean; data: { logoUrl: string } }>(
        '/api/company/logo',
        fd
      );
      if (company) setCompany({ ...company, logoUrl: res.data.logoUrl });
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await api.delete('/api/company/logo');
      if (company) setCompany({ ...company, logoUrl: null });
      toast.success('Logo removed');
    } catch {
      toast.error('Could not remove logo');
    }
  };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put<{ success: boolean; data: User }>('/api/auth/me', accountForm);
      setUser(res.data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/auth/password', pwForm);
      setPwForm({ currentPassword: '', newPassword: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Password change failed');
    } finally {
      setSaving(false);
    }
  };

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: 'profile', label: 'Company Profile' },
    { id: 'invoice', label: 'Invoice Settings' },
    { id: 'bank', label: 'Bank Details' },
    { id: 'branding', label: 'Branding' },
    { id: 'team', label: 'Team Members' },
    { id: 'account', label: 'My Account' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1C1917]">Settings</h1>
        <p className="text-sm text-[#78716C] mt-0.5">
          Manage your UAE TRN legal profile, invoice numbering, bank coordinates, and team access.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-[#E7E5E4]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSearchParams(t.id === 'profile' ? {} : { tab: t.id });
            }}
            className={`px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              tab === t.id
                ? 'border-[#F26522] text-[#F26522]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PROFILE */}
      {tab === 'profile' && (
        <Card className="p-6">
          <form onSubmit={saveCompany} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Legal Name (English) *"
                required
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              />
              <Input
                label="Company Legal Name (Arabic)"
                dir="rtl"
                className="font-arabic"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="UAE TRN (15 digits)"
                maxLength={15}
                value={form.trn}
                error={
                  form.trn && !isValidUaeTrn(form.trn)
                    ? 'Must be 15 digits starting with 100'
                    : undefined
                }
                onChange={(e) =>
                  setForm({ ...form, trn: e.target.value.replace(/\D/g, '') })
                }
              />
              <Input
                label="Peppol TIN"
                value={form.tin}
                onChange={(e) => setForm({ ...form, tin: e.target.value })}
              />
              <Input
                label="Trade License #"
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Address Line 1"
                value={form.addressLine1}
                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
              />
              <Input
                label="Address Line 2"
                value={form.addressLine2}
                onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <Input
                label="P.O. Box"
                value={form.poBox}
                onChange={(e) => setForm({ ...form, poBox: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Billing Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="Website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" loading={saving}>
                Save Company Profile
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* INVOICE SETTINGS */}
      {tab === 'invoice' && (
        <Card className="p-6">
          <form onSubmit={saveCompany} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Invoice Prefix"
                value={form.invoicePrefix}
                onChange={(e) =>
                  setForm({ ...form, invoicePrefix: e.target.value.toUpperCase() })
                }
              />
              <Input
                label="Next Invoice Number"
                type="number"
                min={1}
                value={form.invoiceNextNumber}
                onChange={(e) =>
                  setForm({ ...form, invoiceNextNumber: Number(e.target.value) || 1 })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Credit Note Prefix"
                value={form.creditNotePrefix}
                onChange={(e) =>
                  setForm({ ...form, creditNotePrefix: e.target.value.toUpperCase() })
                }
              />
              <Input
                label="Next Credit Note Number"
                type="number"
                min={1}
                value={form.creditNoteNextNum}
                onChange={(e) =>
                  setForm({ ...form, creditNoteNextNum: Number(e.target.value) || 1 })
                }
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
                {PAYMENT_TERMS_OPTIONS.map((t) => (
                  <option key={t.label} value={t.days}>
                    {t.label}
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
            <Textarea
              label="Default Invoice Notes"
              rows={3}
              value={form.defaultNotes}
              onChange={(e) => setForm({ ...form, defaultNotes: e.target.value })}
            />
            <div className="pt-2 flex justify-end">
              <Button type="submit" loading={saving}>
                Save Invoice Settings
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* BANK DETAILS */}
      {tab === 'bank' && (
        <Card className="p-6">
          <form onSubmit={saveCompany} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                placeholder="Emirates NBD"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              />
              <Input
                label="Account Holder Name"
                value={form.bankAccountName}
                onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Account Number"
                value={form.bankAccountNumber}
                onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
              />
              <Input
                label="IBAN"
                value={form.bankIban}
                onChange={(e) =>
                  setForm({ ...form, bankIban: e.target.value.toUpperCase() })
                }
              />
              <Input
                label="SWIFT / BIC"
                value={form.bankSwift}
                onChange={(e) =>
                  setForm({ ...form, bankSwift: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" loading={saving}>
                Save Bank Details
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* BRANDING */}
      {tab === 'branding' && (
        <Card className="p-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-[#1C1917] mb-2">Company Logo</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-24 h-24 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] flex items-center justify-center overflow-hidden p-2">
                {company?.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt="Company logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-[#A8A29E]">No logo</span>
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#E7E5E4] text-sm font-medium text-[#1C1917] hover:bg-[#F5F5F4] cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
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
                {company?.logoUrl && (
                  <div>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-xs text-[#DC2626] hover:underline cursor-pointer"
                    >
                      Remove logo
                    </button>
                  </div>
                )}
                <p className="text-xs text-[#A8A29E]">PNG, JPG, or WebP up to 2MB.</p>
              </div>
            </div>
          </div>

          <form onSubmit={saveCompany} className="space-y-4 pt-4 border-t border-[#F0EEEC]">
            <div>
              <p className="text-sm font-semibold text-[#1C1917] mb-2">
                Invoice Accent Color
              </p>
              <div className="flex items-center gap-3">
                {ACCENT_PRESETS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Select color ${hex}`}
                    onClick={() => setForm({ ...form, accentColor: hex })}
                    className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                      form.accentColor === hex
                        ? 'border-[#1C1917] scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Custom accent color"
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  className="w-9 h-9 rounded cursor-pointer border border-[#E7E5E4]"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" loading={saving}>
                Save Branding
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TEAM MEMBERS */}
      {tab === 'team' && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0EEEC] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1C1917]">Workspace Team</h2>
              <p className="text-xs text-[#78716C]">
                Invite accountants, admins, or read-only auditors.
              </p>
            </div>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-3.5 h-3.5" />
              Invite Member
            </Button>
          </div>
          <div className="divide-y divide-[#F0EEEC]">
            {(teamData?.data || []).map((m) => (
              <div
                key={m.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#1C1917]">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="text-xs text-[#78716C]">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {m.role === 'OWNER' ? (
                    <span className="text-xs font-semibold text-[#F26522] px-2.5 py-1 rounded bg-[#FFF3ED]">
                      Owner
                    </span>
                  ) : (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) =>
                          roleMutation.mutate({
                            id: m.id,
                            role: e.target.value as UserRole,
                          })
                        }
                        className="h-8 px-2 text-xs bg-white border border-[#E7E5E4] rounded-md"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeMemberMutation.mutate(m.id)}
                        className="p-1.5 rounded text-[#78716C] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                        aria-label="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* MY ACCOUNT */}
      {tab === 'account' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-[#1C1917] mb-4">Personal Profile</h2>
            <form onSubmit={saveAccount} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  required
                  value={accountForm.firstName}
                  onChange={(e) =>
                    setAccountForm({ ...accountForm, firstName: e.target.value })
                  }
                />
                <Input
                  label="Last Name"
                  value={accountForm.lastName}
                  onChange={(e) =>
                    setAccountForm({ ...accountForm, lastName: e.target.value })
                  }
                />
              </div>
              <Input
                label="Email Address"
                type="email"
                required
                value={accountForm.email}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, email: e.target.value })
                }
              />
              <div className="flex justify-end">
                <Button type="submit" loading={saving}>
                  Save Profile
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-[#1C1917] mb-4">Change Password</h2>
            <form onSubmit={savePassword} className="space-y-4 max-w-md">
              <Input
                label="Current Password"
                type="password"
                required
                value={pwForm.currentPassword}
                onChange={(e) =>
                  setPwForm({ ...pwForm, currentPassword: e.target.value })
                }
              />
              <Input
                label="New Password"
                type="password"
                required
                minLength={8}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              />
              <Button type="submit" loading={saving}>
                Update Password
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Team Member"
        description="Add a colleague to your UAE invoicing workspace."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inviteMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              required
              value={inviteForm.firstName}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, firstName: e.target.value })
              }
            />
            <Input
              label="Last Name"
              value={inviteForm.lastName}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, lastName: e.target.value })
              }
            />
          </div>
          <Input
            label="Work Email *"
            type="email"
            required
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
          />
          <Select
            label="Role"
            value={inviteForm.role}
            onChange={(e) =>
              setInviteForm({
                ...inviteForm,
                role: e.target.value as 'ADMIN' | 'ACCOUNTANT' | 'VIEWER',
              })
            }
          >
            <option value="ADMIN">Admin — Full workspace access</option>
            <option value="ACCOUNTANT">Accountant — Invoices, clients &amp; VAT reports</option>
            <option value="VIEWER">Viewer — Read-only access</option>
          </Select>
          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={inviteMutation.isPending}>
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
