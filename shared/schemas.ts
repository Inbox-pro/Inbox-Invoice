import { z } from 'zod';
import type { DiscountType, VatCategory } from './types.ts';

export const UAE_EMIRATES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Ras Al Khaimah',
  'Fujairah',
  'Umm Al Quwain',
] as const;

export const CURRENCIES = [
  { code: 'AED', label: 'AED — UAE Dirham', defaultRate: 1 },
  { code: 'USD', label: 'USD — US Dollar', defaultRate: 3.6725 },
  { code: 'EUR', label: 'EUR — Euro', defaultRate: 3.98 },
  { code: 'GBP', label: 'GBP — British Pound', defaultRate: 4.65 },
  { code: 'SAR', label: 'SAR — Saudi Riyal', defaultRate: 0.9793 },
] as const;

export const UNITS = [
  'UNIT',
  'HOUR',
  'DAY',
  'MONTH',
  'PROJECT',
  'KG',
  'METER',
  'BOX',
  'LICENSE',
] as const;

export const VAT_CATEGORIES: {
  value: VatCategory;
  label: string;
  rate: number;
  pintCode: string;
}[] = [
  { value: 'STANDARD', label: 'Standard (5%)', rate: 5, pintCode: 'S' },
  { value: 'ZERO_RATED', label: 'Zero-Rated (0%)', rate: 0, pintCode: 'Z' },
  { value: 'EXEMPT', label: 'Exempt (0%)', rate: 0, pintCode: 'E' },
  { value: 'REVERSE_CHARGE', label: 'Reverse Charge (0%)', rate: 0, pintCode: 'AE' },
  { value: 'OUT_OF_SCOPE', label: 'Out of Scope (0%)', rate: 0, pintCode: 'O' },
];

export const PAYMENT_TERMS_OPTIONS = [
  { label: 'Due on Receipt', days: 0 },
  { label: 'Net 15', days: 15 },
  { label: 'Net 30', days: 30 },
  { label: 'Net 45', days: 45 },
  { label: 'Net 60', days: 60 },
] as const;

export const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CARD', label: 'Credit / Debit Card' },
] as const;

export const UAE_TRN_REGEX = /^100\d{12}$/;

export function isValidUaeTrn(trn?: string | null): boolean {
  if (!trn) return false;
  return UAE_TRN_REGEX.test(trn.trim());
}

export function getVatRateForCategory(category: VatCategory): number {
  return category === 'STANDARD' ? 5 : 0;
}

export function roundMoney(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export interface ComputedLineItem {
  lineSubtotal: number;
  discountAmount: number;
  lineTotalBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
}

export function calculateLineTotals(item: {
  quantity: number;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  vatCategory: VatCategory;
}): ComputedLineItem {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unitPrice) || 0;
  const lineSubtotal = roundMoney(qty * price);

  let discountAmount = 0;
  if (item.discountType === 'PERCENTAGE') {
    const pct = Math.min(100, Math.max(0, Number(item.discountValue) || 0));
    discountAmount = roundMoney((lineSubtotal * pct) / 100);
  } else if (item.discountType === 'FIXED') {
    discountAmount = roundMoney(
      Math.min(lineSubtotal, Math.max(0, Number(item.discountValue) || 0))
    );
  }

  const lineTotalBeforeVat = roundMoney(Math.max(0, lineSubtotal - discountAmount));
  const vatRate = getVatRateForCategory(item.vatCategory);
  const vatAmount = roundMoney((lineTotalBeforeVat * vatRate) / 100);
  const lineTotal = roundMoney(lineTotalBeforeVat + vatAmount);

  return {
    lineSubtotal,
    discountAmount,
    lineTotalBeforeVat,
    vatRate,
    vatAmount,
    lineTotal,
  };
}

export function calculateInvoiceTotals(
  items: {
    quantity: number;
    unitPrice: number;
    discountType: DiscountType;
    discountValue: number;
    vatCategory: VatCategory;
  }[]
) {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalBeforeVat = 0;
  let totalVat = 0;
  let grandTotal = 0;

  const computedItems = items.map((item) => {
    const c = calculateLineTotals(item);
    subtotal = roundMoney(subtotal + c.lineSubtotal);
    totalDiscount = roundMoney(totalDiscount + c.discountAmount);
    totalBeforeVat = roundMoney(totalBeforeVat + c.lineTotalBeforeVat);
    totalVat = roundMoney(totalVat + c.vatAmount);
    grandTotal = roundMoney(grandTotal + c.lineTotal);
    return c;
  });

  return {
    subtotal,
    totalDiscount,
    totalBeforeVat,
    totalVat,
    grandTotal,
    computedItems,
  };
}

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Valid email address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().trim().min(2, 'Company name is required'),
  emirate: z.string().trim().min(2, 'Emirate is required'),
  phone: z.string().trim().optional().default(''),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export const companyUpdateSchema = z.object({
  nameEn: z.string().trim().min(2, 'Company English name is required').optional(),
  nameAr: z.string().trim().nullable().optional(),
  trn: z
    .string()
    .trim()
    .refine((v) => !v || UAE_TRN_REGEX.test(v), {
      message: 'UAE TRN must be exactly 15 digits starting with 100',
    })
    .nullable()
    .optional(),
  tin: z.string().trim().nullable().optional(),
  licenseNumber: z.string().trim().nullable().optional(),
  addressLine1: z.string().trim().nullable().optional(),
  addressLine2: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  emirate: z.string().trim().nullable().optional(),
  poBox: z.string().trim().nullable().optional(),
  country: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().nullable().optional(),
  website: z.string().trim().nullable().optional(),
  accentColor: z.string().trim().nullable().optional(),
  invoicePrefix: z.string().trim().min(1).max(12).optional(),
  invoiceNextNumber: z.coerce.number().int().min(1).optional(),
  creditNotePrefix: z.string().trim().min(1).max(12).optional(),
  creditNoteNextNum: z.coerce.number().int().min(1).optional(),
  defaultPaymentTermsDays: z.coerce.number().int().min(0).max(365).optional(),
  defaultCurrency: z.string().trim().length(3).optional(),
  defaultNotes: z.string().trim().nullable().optional(),
  bankName: z.string().trim().nullable().optional(),
  bankAccountName: z.string().trim().nullable().optional(),
  bankAccountNumber: z.string().trim().nullable().optional(),
  bankIban: z.string().trim().nullable().optional(),
  bankSwift: z.string().trim().nullable().optional(),
  isOnboarded: z.boolean().optional(),
});

export const clientSchema = z.object({
  nameEn: z.string().trim().min(2, 'Client English name is required'),
  nameAr: z.string().trim().nullable().optional(),
  trn: z
    .string()
    .trim()
    .refine((v) => !v || UAE_TRN_REGEX.test(v), {
      message: 'UAE TRN must be exactly 15 digits starting with 100',
    })
    .nullable()
    .optional(),
  tin: z.string().trim().nullable().optional(),
  email: z
    .string()
    .trim()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: 'Invalid email address',
    })
    .nullable()
    .optional(),
  phone: z.string().trim().nullable().optional(),
  contactPerson: z.string().trim().nullable().optional(),
  addressLine1: z.string().trim().nullable().optional(),
  addressLine2: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  emirate: z.string().trim().nullable().optional(),
  poBox: z.string().trim().nullable().optional(),
  country: z.string().trim().default('AE'),
  defaultPaymentTermsDays: z.coerce.number().int().min(0).max(365).nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Product/Service name is required'),
  description: z.string().trim().nullable().optional(),
  unitPrice: z.coerce.number().min(0, 'Unit price must be 0 or greater'),
  unit: z.string().trim().min(1).default('UNIT'),
  vatCategory: z
    .enum(['STANDARD', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE', 'OUT_OF_SCOPE'])
    .default('STANDARD'),
  hsnCode: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(1, 'Line description is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unit: z.string().trim().min(1).default('UNIT'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be 0 or greater'),
  discountType: z.enum(['NONE', 'PERCENTAGE', 'FIXED']).default('NONE'),
  discountValue: z.coerce.number().min(0).default(0),
  vatCategory: z
    .enum(['STANDARD', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE', 'OUT_OF_SCOPE'])
    .default('STANDARD'),
  hsnCode: z.string().trim().nullable().optional(),
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1, 'Invoice number is required').optional(),
  invoiceType: z
    .enum(['STANDARD_TAX', 'SIMPLIFIED_TAX', 'DEBIT_NOTE'])
    .default('STANDARD_TAX'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  clientId: z.string().min(1, 'Client is required'),
  purchaseOrderRef: z.string().trim().nullable().optional(),
  projectRef: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  internalNotes: z.string().trim().nullable().optional(),
  currency: z.string().trim().length(3).default('AED'),
  exchangeRate: z.coerce.number().positive().default(1),
  paymentTerms: z.string().trim().nullable().optional(),
  paymentMethod: z.string().trim().nullable().optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1, 'At least one line item is required'),
});

export const paymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMethod: z.string().trim().min(1).default('BANK_TRANSFER'),
  reference: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const creditNoteSchema = z.object({
  invoiceId: z.string().min(1, 'Linked invoice is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  reason: z.enum([
    'CANCELLATION',
    'REFUND',
    'ADJUSTMENT',
    'CORRECTION',
    'RETURN',
    'OTHER',
  ]),
  reasonDetail: z.string().trim().nullable().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string().trim().min(1),
        quantity: z.coerce.number().positive(),
        unit: z.string().trim().default('UNIT'),
        unitPrice: z.coerce.number().min(0),
        vatCategory: z
          .enum(['STANDARD', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE', 'OUT_OF_SCOPE'])
          .default('STANDARD'),
      })
    )
    .min(1, 'At least one credit note line item is required'),
});

export function numberToWords(amount: number, currency = 'AED'): string {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const convertChunk = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return (
      ones[Math.floor(n / 100)] +
      ' Hundred' +
      (n % 100 ? ' ' + convertChunk(n % 100) : '')
    );
  };

  const intPart = Math.floor(Math.abs(amount));
  const fracPart = Math.round((Math.abs(amount) - intPart) * 100);

  let words = '';
  if (intPart === 0) {
    words = 'Zero';
  } else {
    const billions = Math.floor(intPart / 1_000_000_000);
    const millions = Math.floor((intPart % 1_000_000_000) / 1_000_000);
    const thousands = Math.floor((intPart % 1_000_000) / 1_000);
    const remainder = intPart % 1_000;
    const parts: string[] = [];
    if (billions) parts.push(`${convertChunk(billions)} Billion`);
    if (millions) parts.push(`${convertChunk(millions)} Million`);
    if (thousands) parts.push(`${convertChunk(thousands)} Thousand`);
    if (remainder) parts.push(convertChunk(remainder));
    words = parts.join(' ');
  }

  const subUnit = currency === 'AED' ? 'Fils' : 'Cents';
  if (fracPart > 0) {
    return `${words} ${currency} and ${convertChunk(fracPart)} ${subUnit} Only`;
  }
  return `${words} ${currency} Only`;
}
