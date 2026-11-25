// Browser-safe seed data shared by the Express server (server/db.ts) and the
// localStorage mock API (src/services/mockDb.ts). Keep this file free of Node
// built-ins (fs, path, crypto) so Vite can bundle it for the client.
import { addDays, format, subDays, subMonths } from 'date-fns';
import type {
  Activity,
  Client,
  Company,
  CreditNote,
  CreditNoteLineItem,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  Product,
  User,
} from '../shared/types.ts';
import { calculateInvoiceTotals, roundMoney } from '../shared/schemas.ts';
import { buildFtaQrPayload } from './fta.ts';
import { DEMO_PASSWORD, DEMO_USER_EMAIL } from '../shared/demo.ts';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface DatabaseState {
  users: StoredUser[];
  companies: Company[];
  clients: Client[];
  products: Product[];
  invoices: Invoice[];
  creditNotes: CreditNote[];
  activities: Activity[];
}

/** Every seeded demo user (omar@ / fatima@nexusdigital.ae) shares DEMO_PASSWORD. */
export { DEMO_PASSWORD, DEMO_USER_EMAIL };

export function formatInvoiceNumber(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(5, '0')}`;
}

export function buildSeedState(demoPasswordHash: string): DatabaseState {
  const now = new Date();
  const isoNow = now.toISOString();

  const companyId = 'cmp_nexus_digital';
  const ownerId = 'usr_omar_owner';
  const accountantId = 'usr_fatima_acc';

  // Seeded demo users share DEMO_PASSWORD; the caller supplies its hash.
  const demoHash = demoPasswordHash;

  const company: Company = {
    id: companyId,
    nameEn: 'Nexus Digital Solutions LLC',
    nameAr: 'نيكسوس للحلول الرقمية ذ.م.م',
    trn: '100345678901234',
    tin: '0235:100345678901234',
    licenseNumber: 'CN-4829104',
    addressLine1: 'Office 1205, Business Bay Tower',
    addressLine2: 'Al Abraj Street, Business Bay',
    city: 'Dubai',
    emirate: 'Dubai',
    poBox: 'P.O. Box 118420',
    country: 'AE',
    email: 'billing@nexusdigital.ae',
    phone: '+971 4 512 8890',
    website: 'https://nexusdigital.ae',
    logoUrl: null,
    accentColor: '#F26522',
    invoicePrefix: 'INV',
    invoiceNextNumber: 19,
    creditNotePrefix: 'CN',
    creditNoteNextNum: 4,
    defaultPaymentTermsDays: 30,
    defaultCurrency: 'AED',
    defaultNotes:
      'Thank you for your business. Please include the invoice number as payment reference.',
    bankName: 'Emirates NBD',
    bankAccountName: 'Nexus Digital Solutions LLC',
    bankAccountNumber: '1015489203401',
    bankIban: 'AE070260001015489203401',
    bankSwift: 'EBILAEAD',
    isOnboarded: true,
    createdAt: subMonths(now, 6).toISOString(),
    updatedAt: isoNow,
  };

  const users: StoredUser[] = [
    {
      id: ownerId,
      email: DEMO_USER_EMAIL,
      passwordHash: demoHash,
      firstName: 'Omar',
      lastName: 'Al Mansoori',
      role: 'OWNER',
      avatarUrl: null,
      isActive: true,
      lastLoginAt: isoNow,
      createdAt: subMonths(now, 6).toISOString(),
      updatedAt: isoNow,
      companyId,
    },
    {
      id: accountantId,
      email: 'fatima@nexusdigital.ae',
      passwordHash: demoHash,
      firstName: 'Fatima',
      lastName: 'Al Hashimi',
      role: 'ACCOUNTANT',
      avatarUrl: null,
      isActive: true,
      lastLoginAt: subDays(now, 1).toISOString(),
      createdAt: subMonths(now, 5).toISOString(),
      updatedAt: isoNow,
      companyId,
    },
  ];

  const clients: Client[] = [
    {
      id: 'cli_alnoor',
      nameEn: 'Al Noor Trading LLC',
      nameAr: 'شركة النور للتجارة ذ.م.م',
      trn: '100123456789012',
      tin: '0235:100123456789012',
      email: 'accounts@alnoortrading.ae',
      phone: '+971 4 228 4410',
      contactPerson: 'Rashid Al Suwaidi',
      addressLine1: 'Suite 402, Deira Twin Towers',
      city: 'Dubai',
      emirate: 'Dubai',
      poBox: 'P.O. Box 45210',
      country: 'AE',
      defaultPaymentTermsDays: 30,
      notes: 'Long-term enterprise web & cloud retainer client. Prefers consolidated monthly invoices.',
      isActive: true,
      companyId,
      createdAt: subMonths(now, 6).toISOString(),
      updatedAt: isoNow,
    },
    {
      id: 'cli_horizon',
      nameEn: 'Horizon Technology FZE',
      nameAr: 'هورايزون للتكنولوجيا م.م.ح',
      trn: '100234567890123',
      tin: '0235:100234567890123',
      email: 'finance@horizontech.ae',
      phone: '+971 4 881 7300',
      contactPerson: 'Nadia Khoury',
      addressLine1: 'Building 14, JAFZA One',
      city: 'Jebel Ali',
      emirate: 'Dubai',
      poBox: 'P.O. Box 261904',
      country: 'AE',
      defaultPaymentTermsDays: 30,
      notes: 'Free zone technology partner. Always include PO reference on tax invoices.',
      isActive: true,
      companyId,
      createdAt: subMonths(now, 5).toISOString(),
      updatedAt: isoNow,
    },
    {
      id: 'cli_gulfstar',
      nameEn: 'Gulf Star Consulting',
      nameAr: 'نجمة الخليج للاستشارات',
      trn: '100345678901234',
      tin: '0235:100345678901234',
      email: 'ap@gulfstar.ae',
      phone: '+971 2 674 9120',
      contactPerson: 'Tariq Al Dhaheri',
      addressLine1: 'Floor 18, Al Maryah Tower',
      city: 'Abu Dhabi',
      emirate: 'Abu Dhabi',
      poBox: 'P.O. Box 71042',
      country: 'AE',
      defaultPaymentTermsDays: 45,
      notes: 'Abu Dhabi advisory firm on Net 45 payment cycle.',
      isActive: true,
      companyId,
      createdAt: subMonths(now, 5).toISOString(),
      updatedAt: isoNow,
    },
    {
      id: 'cli_emiratesfresh',
      nameEn: 'Emirates Fresh Foods Co.',
      nameAr: 'شركة الإمارات للأغذية الطازجة',
      trn: '100456789012345',
      tin: '0235:100456789012345',
      email: 'billing@emiratesfresh.ae',
      phone: '+971 6 534 1188',
      contactPerson: 'Saeed Al Qasimi',
      addressLine1: 'Industrial Area 15, Plot 29',
      city: 'Sharjah',
      emirate: 'Sharjah',
      poBox: 'P.O. Box 24189',
      country: 'AE',
      defaultPaymentTermsDays: 15,
      notes: 'Mobile commerce & ERP integration client.',
      isActive: true,
      companyId,
      createdAt: subMonths(now, 4).toISOString(),
      updatedAt: isoNow,
    },
    {
      id: 'cli_coralbay',
      nameEn: 'Coral Bay Properties',
      nameAr: 'كورال باي للعقارات',
      trn: '100567890123456',
      tin: '0235:100567890123456',
      email: 'accounts@coralbayproperties.ae',
      phone: '+971 4 399 2055',
      contactPerson: 'Layla Haddad',
      addressLine1: 'Level 9, Marina Plaza',
      city: 'Dubai Marina',
      emirate: 'Dubai',
      poBox: 'P.O. Box 33219',
      country: 'AE',
      defaultPaymentTermsDays: 30,
      notes: 'Property portal development & SEO services.',
      isActive: true,
      companyId,
      createdAt: subMonths(now, 4).toISOString(),
      updatedAt: isoNow,
    },
  ];

  const products: Product[] = [
    {
      id: 'prd_webdev',
      name: 'Web Development',
      description: 'Full-stack web engineering & monthly platform retainer',
      unitPrice: 5000,
      unit: 'MONTH',
      vatCategory: 'STANDARD',
      vatRate: 5,
      hsnCode: '998314',
      isActive: true,
      companyId,
      createdAt: subMonths(now, 6).toISOString(),
      updatedAt: isoNow,
    },
    {
      id: 'prd_uiux',
      name: 'UI/UX Design',
      description: 'Product interface design, prototyping & design systems',
      unitPrice: 200,
      unit: 'HOUR',
      vatCategory: 'STANDARD',
      vatRate: 5,
      hsnCode: '998313',
      isActive: true,
      companyId,
      createdAt: subMonths(now, 6).toISOString(),
      updatedAt: isoNow,
    },
    {
      id: 'prd_hosting',
      name: 'Cloud Hosting',
      description: 'Managed UAE cloud infrastructure, SSL & daily backups',
      unitPrice: 500,
      unit: 'MONTH',
      vatCategory: 'STANDARD',
      vatRate: 5,
      hsnCode: '998315',
      isActive: true,
      companyId,
      createdAt: subMonths(now, 6).toISOString(),
      updatedAt: isoNow,
    },
    {
      id: 'prd_seo',
      name: 'SEO Services',
      description: 'Technical SEO, bilingual search optimization & reporting',
      unitPrice: 3000,
      unit: 'MONTH',
      vatCategory: 'STANDARD',
      vatRate: 5,
      hsnCode: '998365',
      isActive: true,
      companyId,
      createdAt: subMonths(now, 5).toISOString(),
      updatedAt: isoNow,
    },
    {
      id: 'prd_mobile',
      name: 'Mobile App Development',
      description: 'iOS & Android native/cross-platform feature sprint',
      unitPrice: 8000,
      unit: 'MONTH',
      vatCategory: 'STANDARD',
      vatRate: 5,
      hsnCode: '998314',
      isActive: true,
      companyId,
      createdAt: subMonths(now, 5).toISOString(),
      updatedAt: isoNow,
    },
    {
      id: 'prd_consult',
      name: 'IT Consultation',
      description: 'Technical architecture, FTA PINT-AE advisory & security audit',
      unitPrice: 350,
      unit: 'HOUR',
      vatCategory: 'STANDARD',
      vatRate: 5,
      hsnCode: '998311',
      isActive: true,
      companyId,
      createdAt: subMonths(now, 5).toISOString(),
      updatedAt: isoNow,
    },
  ];

  // Helper to construct realistic invoices across the last 6 months
  const makeInvoice = (cfg: {
    num: number;
    clientId: string;
    daysAgo: number;
    termsDays: number;
    status: InvoiceStatus;
    paidFraction?: number;
    poRef?: string;
    xmlGenerated?: boolean;
    items: {
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      discountType?: 'NONE' | 'PERCENTAGE' | 'FIXED';
      discountValue?: number;
      vatCategory?: 'STANDARD' | 'ZERO_RATED' | 'EXEMPT' | 'REVERSE_CHARGE' | 'OUT_OF_SCOPE';
    }[];
  }): Invoice => {
    const id = `inv_seed_${String(cfg.num).padStart(3, '0')}`;
    const issueDate = subDays(now, cfg.daysAgo);
    const dueDate = addDays(issueDate, cfg.termsDays);
    const normalizedItems = cfg.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      discountType: item.discountType || ('NONE' as const),
      discountValue: item.discountValue || 0,
      vatCategory: item.vatCategory || ('STANDARD' as const),
    }));

    const calc = calculateInvoiceTotals(normalizedItems);
    const lineItems: InvoiceLineItem[] = normalizedItems.map((it, idx) => ({
      id: `${id}_li_${idx + 1}`,
      lineNumber: idx + 1,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unitPrice,
      discountType: it.discountType,
      discountValue: it.discountValue,
      discountAmount: calc.computedItems[idx].discountAmount,
      vatCategory: it.vatCategory,
      vatRate: calc.computedItems[idx].vatRate,
      vatAmount: calc.computedItems[idx].vatAmount,
      lineSubtotal: calc.computedItems[idx].lineSubtotal,
      lineTotalBeforeVat: calc.computedItems[idx].lineTotalBeforeVat,
      lineTotal: calc.computedItems[idx].lineTotal,
      hsnCode: null,
      invoiceId: id,
    }));

    let amountPaid = 0;
    if (cfg.status === 'PAID') amountPaid = calc.grandTotal;
    else if (cfg.status === 'PARTIALLY_PAID') {
      amountPaid = roundMoney(calc.grandTotal * (cfg.paidFraction ?? 0.5));
    }
    const amountDue = roundMoney(Math.max(0, calc.grandTotal - amountPaid));
    const paidAt =
      cfg.status === 'PAID'
        ? addDays(issueDate, Math.min(cfg.termsDays - 4, 14)).toISOString()
        : null;

    const invoice: Invoice = {
      id,
      invoiceNumber: formatInvoiceNumber(company.invoicePrefix, cfg.num),
      invoiceType: 'STANDARD_TAX',
      issueDate: format(issueDate, 'yyyy-MM-dd'),
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      purchaseOrderRef: cfg.poRef || null,
      projectRef: null,
      notes: company.defaultNotes,
      internalNotes: null,
      currency: 'AED',
      exchangeRate: 1,
      subtotal: calc.subtotal,
      totalDiscount: calc.totalDiscount,
      totalBeforeVat: calc.totalBeforeVat,
      totalVat: calc.totalVat,
      grandTotal: calc.grandTotal,
      amountPaid,
      amountDue,
      status: cfg.status,
      paymentTerms: `Net ${cfg.termsDays}`,
      paymentMethod: 'BANK_TRANSFER',
      paidAt,
      qrCodeData: null,
      xmlGenerated: Boolean(cfg.xmlGenerated),
      xmlGeneratedAt: cfg.xmlGenerated ? issueDate.toISOString() : null,
      companyId,
      clientId: cfg.clientId,
      createdById: cfg.num % 2 === 0 ? ownerId : accountantId,
      createdAt: issueDate.toISOString(),
      updatedAt: issueDate.toISOString(),
      sentAt: cfg.status !== 'DRAFT' ? issueDate.toISOString() : null,
      lineItems,
      payments:
        amountPaid > 0
          ? [
              {
                id: `${id}_pay_1`,
                amount: amountPaid,
                paymentDate: format(
                  addDays(issueDate, Math.min(12, Math.max(2, cfg.daysAgo - 1))),
                  'yyyy-MM-dd'
                ),
                paymentMethod: 'BANK_TRANSFER',
                reference: `FT-${202600 + cfg.num}`,
                notes: 'Received via Emirates NBD corporate transfer',
                recordedBy: 'Omar Al Mansoori',
              },
            ]
          : [],
    };
    invoice.qrCodeData = buildFtaQrPayload(company, invoice);
    return invoice;
  };

  const invoices: Invoice[] = [
    // 5 months ago
    makeInvoice({
      num: 1,
      clientId: 'cli_alnoor',
      daysAgo: 155,
      termsDays: 30,
      status: 'PAID',
      poRef: 'PO-AN-2026-01',
      xmlGenerated: true,
      items: [
        { description: 'Web Development — Portal Phase 1', quantity: 2, unit: 'MONTH', unitPrice: 5000 },
        { description: 'Cloud Hosting', quantity: 2, unit: 'MONTH', unitPrice: 500 },
      ],
    }),
    makeInvoice({
      num: 2,
      clientId: 'cli_gulfstar',
      daysAgo: 142,
      termsDays: 45,
      status: 'PAID',
      poRef: 'PO-GS-412',
      xmlGenerated: true,
      items: [
        { description: 'IT Consultation — Cloud Migration', quantity: 24, unit: 'HOUR', unitPrice: 350 },
        { description: 'UI/UX Design', quantity: 18, unit: 'HOUR', unitPrice: 200 },
      ],
    }),
    // 4 months ago
    makeInvoice({
      num: 3,
      clientId: 'cli_horizon',
      daysAgo: 124,
      termsDays: 30,
      status: 'PAID',
      poRef: 'HZ-PO-889',
      xmlGenerated: true,
      items: [
        { description: 'Mobile App Development — Sprint 1', quantity: 1, unit: 'MONTH', unitPrice: 8000 },
        { description: 'UI/UX Design', quantity: 20, unit: 'HOUR', unitPrice: 200, discountType: 'PERCENTAGE', discountValue: 5 },
      ],
    }),
    makeInvoice({
      num: 4,
      clientId: 'cli_coralbay',
      daysAgo: 112,
      termsDays: 30,
      status: 'PAID',
      items: [
        { description: 'Web Development — Property Listings', quantity: 1, unit: 'MONTH', unitPrice: 5000 },
        { description: 'SEO Services', quantity: 1, unit: 'MONTH', unitPrice: 3000 },
      ],
    }),
    // 3 months ago
    makeInvoice({
      num: 5,
      clientId: 'cli_emiratesfresh',
      daysAgo: 94,
      termsDays: 15,
      status: 'PAID',
      poRef: 'EFF-1042',
      xmlGenerated: true,
      items: [
        { description: 'Mobile App Development — B2B Ordering', quantity: 2, unit: 'MONTH', unitPrice: 8000 },
        { description: 'Cloud Hosting', quantity: 2, unit: 'MONTH', unitPrice: 500 },
      ],
    }),
    makeInvoice({
      num: 6,
      clientId: 'cli_alnoor',
      daysAgo: 86,
      termsDays: 30,
      status: 'PAID',
      poRef: 'PO-AN-2026-08',
      items: [
        { description: 'Web Development — Retainer', quantity: 1, unit: 'MONTH', unitPrice: 5000 },
        { description: 'SEO Services', quantity: 1, unit: 'MONTH', unitPrice: 3000 },
        { description: 'IT Consultation', quantity: 10, unit: 'HOUR', unitPrice: 350 },
      ],
    }),
    // 2 months ago
    makeInvoice({
      num: 7,
      clientId: 'cli_horizon',
      daysAgo: 68,
      termsDays: 30,
      status: 'PAID',
      poRef: 'HZ-PO-914',
      xmlGenerated: true,
      items: [
        { description: 'Mobile App Development — Sprint 2', quantity: 1, unit: 'MONTH', unitPrice: 8000 },
        { description: 'IT Consultation — Peppol Readiness', quantity: 16, unit: 'HOUR', unitPrice: 350 },
      ],
    }),
    makeInvoice({
      num: 8,
      clientId: 'cli_gulfstar',
      daysAgo: 61,
      termsDays: 30,
      status: 'OVERDUE',
      poRef: 'PO-GS-498',
      xmlGenerated: true,
      items: [
        { description: 'Web Development — Client Portal', quantity: 1, unit: 'MONTH', unitPrice: 5000 },
        { description: 'UI/UX Design', quantity: 25, unit: 'HOUR', unitPrice: 200 },
        { description: 'Cloud Hosting', quantity: 1, unit: 'MONTH', unitPrice: 500 },
      ],
    }),
    makeInvoice({
      num: 9,
      clientId: 'cli_coralbay',
      daysAgo: 54,
      termsDays: 30,
      status: 'PAID',
      items: [
        { description: 'SEO Services — Bilingual Campaign', quantity: 2, unit: 'MONTH', unitPrice: 3000 },
        { description: 'UI/UX Design', quantity: 12, unit: 'HOUR', unitPrice: 200 },
      ],
    }),
    // Last month
    makeInvoice({
      num: 10,
      clientId: 'cli_alnoor',
      daysAgo: 42,
      termsDays: 30,
      status: 'OVERDUE',
      poRef: 'PO-AN-2026-14',
      xmlGenerated: true,
      items: [
        { description: 'Web Development — ERP Integration', quantity: 2, unit: 'MONTH', unitPrice: 5000 },
        { description: 'IT Consultation', quantity: 14, unit: 'HOUR', unitPrice: 350, discountType: 'FIXED', discountValue: 400 },
      ],
    }),
    makeInvoice({
      num: 11,
      clientId: 'cli_emiratesfresh',
      daysAgo: 35,
      termsDays: 15,
      status: 'PAID',
      poRef: 'EFF-1109',
      xmlGenerated: true,
      items: [
        { description: 'Mobile App Development — Delivery Tracking', quantity: 1, unit: 'MONTH', unitPrice: 8000 },
        { description: 'Cloud Hosting', quantity: 1, unit: 'MONTH', unitPrice: 500 },
      ],
    }),
    makeInvoice({
      num: 12,
      clientId: 'cli_horizon',
      daysAgo: 29,
      termsDays: 30,
      status: 'PARTIALLY_PAID',
      paidFraction: 0.6,
      poRef: 'HZ-PO-955',
      xmlGenerated: true,
      items: [
        { description: 'Mobile App Development — Analytics Suite', quantity: 2, unit: 'MONTH', unitPrice: 8000 },
        { description: 'UI/UX Design', quantity: 15, unit: 'HOUR', unitPrice: 200 },
      ],
    }),
    // This month
    makeInvoice({
      num: 13,
      clientId: 'cli_coralbay',
      daysAgo: 18,
      termsDays: 30,
      status: 'PAID',
      poRef: 'CB-2026-77',
      xmlGenerated: true,
      items: [
        { description: 'Web Development — Investor Dashboard', quantity: 2, unit: 'MONTH', unitPrice: 5000 },
        { description: 'SEO Services', quantity: 1, unit: 'MONTH', unitPrice: 3000 },
        { description: 'Cloud Hosting', quantity: 1, unit: 'MONTH', unitPrice: 500 },
      ],
    }),
    makeInvoice({
      num: 14,
      clientId: 'cli_alnoor',
      daysAgo: 12,
      termsDays: 30,
      status: 'PAID',
      poRef: 'PO-AN-2026-19',
      xmlGenerated: true,
      items: [
        { description: 'Web Development — Monthly Retainer', quantity: 1, unit: 'MONTH', unitPrice: 5000 },
        { description: 'UI/UX Design', quantity: 20, unit: 'HOUR', unitPrice: 200, discountType: 'PERCENTAGE', discountValue: 10 },
        { description: 'Cloud Hosting', quantity: 1, unit: 'MONTH', unitPrice: 500 },
      ],
    }),
    makeInvoice({
      num: 15,
      clientId: 'cli_emiratesfresh',
      daysAgo: 9,
      termsDays: 15,
      status: 'SENT',
      poRef: 'EFF-1182',
      xmlGenerated: true,
      items: [
        { description: 'Mobile App Development — Warehouse Module', quantity: 1, unit: 'MONTH', unitPrice: 8000 },
        { description: 'IT Consultation', quantity: 12, unit: 'HOUR', unitPrice: 350 },
      ],
    }),
    makeInvoice({
      num: 16,
      clientId: 'cli_gulfstar',
      daysAgo: 6,
      termsDays: 45,
      status: 'SENT',
      poRef: 'PO-GS-540',
      items: [
        { description: 'IT Consultation — Export Advisory (Zero-Rated)', quantity: 20, unit: 'HOUR', unitPrice: 350, vatCategory: 'ZERO_RATED' },
        { description: 'Web Development — Advisory Portal', quantity: 1, unit: 'MONTH', unitPrice: 5000, vatCategory: 'STANDARD' },
      ],
    }),
    makeInvoice({
      num: 17,
      clientId: 'cli_horizon',
      daysAgo: 3,
      termsDays: 30,
      status: 'SENT',
      poRef: 'HZ-PO-991',
      xmlGenerated: true,
      items: [
        { description: 'Mobile App Development — Sprint 4', quantity: 1, unit: 'MONTH', unitPrice: 8000 },
        { description: 'SEO Services', quantity: 1, unit: 'MONTH', unitPrice: 3000 },
        { description: 'Cloud Hosting', quantity: 2, unit: 'MONTH', unitPrice: 500 },
      ],
    }),
    makeInvoice({
      num: 18,
      clientId: 'cli_coralbay',
      daysAgo: 1,
      termsDays: 30,
      status: 'DRAFT',
      items: [
        { description: 'UI/UX Design — Mobile Property Search', quantity: 18, unit: 'HOUR', unitPrice: 200 },
        { description: 'IT Consultation', quantity: 8, unit: 'HOUR', unitPrice: 350 },
      ],
    }),
  ];

  const buildCn = (cfg: {
    num: number;
    invoice: Invoice;
    daysAgo: number;
    reason: CreditNote['reason'];
    reasonDetail: string;
    status: CreditNote['status'];
    items: {
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      vatCategory: 'STANDARD' | 'ZERO_RATED' | 'EXEMPT' | 'REVERSE_CHARGE' | 'OUT_OF_SCOPE';
    }[];
  }): CreditNote => {
    const id = `cn_seed_${String(cfg.num).padStart(3, '0')}`;
    const issueDate = subDays(now, cfg.daysAgo);
    let subtotal = 0;
    let totalVat = 0;
    const lineItems: CreditNoteLineItem[] = cfg.items.map((it, idx) => {
      const rate = it.vatCategory === 'STANDARD' ? 5 : 0;
      const base = roundMoney(it.quantity * it.unitPrice);
      const vat = roundMoney((base * rate) / 100);
      subtotal = roundMoney(subtotal + base);
      totalVat = roundMoney(totalVat + vat);
      return {
        id: `${id}_li_${idx + 1}`,
        lineNumber: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        vatCategory: it.vatCategory,
        vatRate: rate,
        vatAmount: vat,
        lineTotal: roundMoney(base + vat),
        creditNoteId: id,
      };
    });

    return {
      id,
      creditNoteNumber: formatInvoiceNumber(company.creditNotePrefix, cfg.num),
      issueDate: format(issueDate, 'yyyy-MM-dd'),
      reason: cfg.reason,
      reasonDetail: cfg.reasonDetail,
      subtotal,
      totalVat,
      grandTotal: roundMoney(subtotal + totalVat),
      status: cfg.status,
      companyId,
      clientId: cfg.invoice.clientId,
      invoiceId: cfg.invoice.id,
      createdAt: issueDate.toISOString(),
      updatedAt: issueDate.toISOString(),
      lineItems,
    };
  };

  const creditNotes: CreditNote[] = [
    buildCn({
      num: 1,
      invoice: invoices[5],
      daysAgo: 45,
      reason: 'ADJUSTMENT',
      reasonDetail: 'Agreed SLA credit for scheduled maintenance window',
      status: 'ISSUED',
      items: [
        {
          description: 'SLA Maintenance Credit — Web Retainer',
          quantity: 1,
          unit: 'UNIT',
          unitPrice: 750,
          vatCategory: 'STANDARD',
        },
      ],
    }),
    buildCn({
      num: 2,
      invoice: invoices[11],
      daysAgo: 14,
      reason: 'CORRECTION',
      reasonDetail: 'Scope reduction on UI/UX hours billed',
      status: 'ISSUED',
      items: [
        {
          description: 'UI/UX Design — 5 unused hours adjustment',
          quantity: 5,
          unit: 'HOUR',
          unitPrice: 200,
          vatCategory: 'STANDARD',
        },
      ],
    }),
    buildCn({
      num: 3,
      invoice: invoices[14],
      daysAgo: 2,
      reason: 'REFUND',
      reasonDetail: 'Pending review for partial consultation credit',
      status: 'DRAFT',
      items: [
        {
          description: 'IT Consultation — 2 hours billing adjustment',
          quantity: 2,
          unit: 'HOUR',
          unitPrice: 350,
          vatCategory: 'STANDARD',
        },
      ],
    }),
  ];

  const activities: Activity[] = [
    {
      id: 'act_001',
      action: 'invoice.sent',
      entityType: 'invoice',
      entityId: invoices[16].id,
      description: `Invoice ${invoices[16].invoiceNumber} sent to Horizon Technology FZE`,
      companyId,
      userId: ownerId,
      userName: 'Omar Al Mansoori',
      invoiceId: invoices[16].id,
      createdAt: subDays(now, 0).toISOString(),
    },
    {
      id: 'act_002',
      action: 'invoice.xml_generated',
      entityType: 'invoice',
      entityId: invoices[16].id,
      description: `PINT-AE UBL 2.1 XML generated for ${invoices[16].invoiceNumber}`,
      companyId,
      userId: ownerId,
      userName: 'Omar Al Mansoori',
      invoiceId: invoices[16].id,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'act_003',
      action: 'payment.recorded',
      entityType: 'invoice',
      entityId: invoices[13].id,
      description: `Payment received for ${invoices[13].invoiceNumber} (AED ${invoices[13].grandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2 })})`,
      companyId,
      userId: accountantId,
      userName: 'Fatima Al Hashimi',
      invoiceId: invoices[13].id,
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'act_004',
      action: 'invoice.created',
      entityType: 'invoice',
      entityId: invoices[17].id,
      description: `Draft invoice ${invoices[17].invoiceNumber} created for Coral Bay Properties`,
      companyId,
      userId: accountantId,
      userName: 'Fatima Al Hashimi',
      invoiceId: invoices[17].id,
      createdAt: subDays(now, 1).toISOString(),
    },
    {
      id: 'act_005',
      action: 'credit_note.created',
      entityType: 'credit_note',
      entityId: creditNotes[2].id,
      description: `Credit note ${creditNotes[2].creditNoteNumber} drafted for ${invoices[14].invoiceNumber}`,
      companyId,
      userId: ownerId,
      userName: 'Omar Al Mansoori',
      invoiceId: invoices[14].id,
      createdAt: subDays(now, 2).toISOString(),
    },
    {
      id: 'act_006',
      action: 'invoice.sent',
      entityType: 'invoice',
      entityId: invoices[15].id,
      description: `Invoice ${invoices[15].invoiceNumber} sent to Gulf Star Consulting`,
      companyId,
      userId: ownerId,
      userName: 'Omar Al Mansoori',
      invoiceId: invoices[15].id,
      createdAt: subDays(now, 6).toISOString(),
    },
  ];

  return {
    users,
    companies: [company],
    clients,
    products,
    invoices,
    creditNotes,
    activities,
  };
}
