export type UserRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';

export type VatCategory =
  | 'STANDARD'
  | 'ZERO_RATED'
  | 'EXEMPT'
  | 'REVERSE_CHARGE'
  | 'OUT_OF_SCOPE';

export type InvoiceType = 'STANDARD_TAX' | 'SIMPLIFIED_TAX' | 'DEBIT_NOTE';

export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'DELIVERED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'VOID';

export type DiscountType = 'NONE' | 'PERCENTAGE' | 'FIXED';

export type CreditNoteReason =
  | 'CANCELLATION'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'CORRECTION'
  | 'RETURN'
  | 'OTHER';

export type CreditNoteStatus = 'DRAFT' | 'ISSUED' | 'VOID';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  companyId: string;
}

export interface Company {
  id: string;
  nameEn: string;
  nameAr?: string | null;
  trn?: string | null;
  tin?: string | null;
  licenseNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  emirate?: string | null;
  poBox?: string | null;
  country: string;
  email: string;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  accentColor?: string | null;
  invoicePrefix: string;
  invoiceNextNumber: number;
  creditNotePrefix: string;
  creditNoteNextNum: number;
  defaultPaymentTermsDays: number;
  defaultCurrency: string;
  defaultNotes?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIban?: string | null;
  bankSwift?: string | null;
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  nameEn: string;
  nameAr?: string | null;
  trn?: string | null;
  tin?: string | null;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  emirate?: string | null;
  poBox?: string | null;
  country: string;
  defaultPaymentTermsDays?: number | null;
  notes?: string | null;
  isActive: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  invoiceCount?: number;
  totalBilled?: number;
  totalPaid?: number;
  outstanding?: number;
  averagePaymentDays?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  unitPrice: number;
  unit: string;
  vatCategory: VatCategory;
  vatRate: number;
  hsnCode?: string | null;
  isActive: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  vatCategory: VatCategory;
  vatRate: number;
  vatAmount: number;
  lineSubtotal: number;
  lineTotalBeforeVat: number;
  lineTotal: number;
  hsnCode?: string | null;
  invoiceId: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
  recordedBy: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  issueDate: string;
  dueDate: string;
  purchaseOrderRef?: string | null;
  projectRef?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  totalDiscount: number;
  totalBeforeVat: number;
  totalVat: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  status: InvoiceStatus;
  paymentTerms?: string | null;
  paymentMethod?: string | null;
  paidAt?: string | null;
  qrCodeData?: string | null;
  qrCodeImage?: string | null;
  xmlGenerated: boolean;
  xmlGeneratedAt?: string | null;
  companyId: string;
  clientId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string | null;
  lineItems: InvoiceLineItem[];
  payments?: PaymentRecord[];
  client?: Client;
  company?: Company;
  createdByName?: string;
}

export interface CreditNoteLineItem {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatCategory: VatCategory;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  creditNoteId: string;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  issueDate: string;
  reason: CreditNoteReason;
  reasonDetail?: string | null;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  status: CreditNoteStatus;
  companyId: string;
  clientId: string;
  invoiceId: string;
  createdAt: string;
  updatedAt: string;
  lineItems: CreditNoteLineItem[];
  client?: Client;
  invoiceNumber?: string;
}

export interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  companyId: string;
  userId?: string | null;
  userName?: string | null;
  invoiceId?: string | null;
  createdAt: string;
}

export interface FtaValidationItem {
  id: string;
  group: string;
  label: string;
  fieldCount: number;
  passed: boolean;
  message: string;
  fieldRef?: string;
}

export interface FtaValidationResult {
  valid: boolean;
  totalFieldsChecked: number;
  passedFieldsCount: number;
  errors: FtaValidationItem[];
  checks: FtaValidationItem[];
}

export interface DashboardSummary {
  totalRevenueThisMonth: number;
  revenueChangePercent: number;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  invoicesThisMonth: number;
  monthlySparkline: { label: string; count: number; revenue: number }[];
  revenueSeries: {
    week: { label: string; revenue: number; vat: number }[];
    month: { label: string; revenue: number; vat: number }[];
    quarter: { label: string; revenue: number; vat: number }[];
  };
  recentActivities: Activity[];
  outstandingInvoices: Invoice[];
}
