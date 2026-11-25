// ---------------------------------------------------------------------------
// In-browser mock of the Express API (server.ts), backed by localStorage.
//
// Lets the frontend run as a static site (e.g. on Vercel) with no backend.
// `mockFetch` has the same signature as `fetch` and returns a real Response,
// so api.ts keeps its normal error handling. Each handler is a close port of
// the matching route in server.ts: same validation (shared/schemas.ts), same
// status codes, same response shapes, same FTA logic (server/fta.ts).
//
// Keep this file in sync when routes in server.ts change.
// ---------------------------------------------------------------------------

import {
  differenceInCalendarDays,
  format,
  isSameMonth,
  parseISO,
  subMonths,
  subWeeks,
} from 'date-fns';
import { z } from 'zod';
import {
  buildFtaQrPayload,
  generateFtaQrCodeImage,
  generatePintAeXml,
  validateInvoiceForFta,
} from '../../server/fta.ts';
import {
  calculateInvoiceTotals,
  clientSchema,
  companyUpdateSchema,
  creditNoteSchema,
  getVatRateForCategory,
  invoiceSchema,
  loginSchema,
  paymentSchema,
  productSchema,
  registerSchema,
  roundMoney,
} from '../../shared/schemas.ts';
import type {
  Client,
  Company,
  CreditNote,
  CreditNoteLineItem,
  DashboardSummary,
  Invoice,
  InvoiceLineItem,
  UserRole,
} from '../../shared/types.ts';
import {
  ensureDb,
  formatInvoiceNumber,
  generateId,
  getDb,
  hashPassword,
  logActivity,
  refreshOverdueStatuses,
  saveDb,
  stripPassword,
  verifyPassword,
  type StoredUser,
} from './mockDb.ts';

// ── Request / response plumbing ─────────────────────────────────────────────

interface TokenPayload {
  userId: string;
  companyId: string;
  email: string;
  role: UserRole;
}

interface Ctx {
  params: Record<string, string>;
  query: URLSearchParams;
  body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  user: TokenPayload; // only populated on authenticated routes
}

interface MockResult {
  status: number;
  body: unknown;
  /** Defaults to application/json. Non-JSON bodies must be strings. */
  contentType?: string;
}

type Handler = (ctx: Ctx) => MockResult | Promise<MockResult>;

function ok(data: unknown, status = 200, extra: Record<string, unknown> = {}): MockResult {
  return { status, body: { success: true, data, ...extra } };
}

function fail(status: number, code: string, message: string, details?: unknown): MockResult {
  return {
    status,
    body: { success: false, error: { code, message, ...(details !== undefined ? { details } : {}) } },
  };
}

function zodFail(err: z.ZodError): MockResult {
  return {
    status: 400,
    body: {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues[0]?.message || 'Validation failed',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    },
  };
}

// Mock tokens are unsigned: everything runs in the user's own browser, so a
// signature would protect nothing. They only carry the session identity.
function encodeToken(kind: 'access' | 'refresh', payload: TokenPayload): string {
  const json = JSON.stringify({ ...payload, kind, iat: Date.now() });
  return `mock-${kind}.${btoa(unescape(encodeURIComponent(json)))}`;
}

function decodeToken(kind: 'access' | 'refresh', token: string): TokenPayload | null {
  const prefix = `mock-${kind}.`;
  if (!token.startsWith(prefix)) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(token.slice(prefix.length)))));
    if (parsed.kind !== kind || !parsed.userId || !parsed.companyId) return null;
    const user = getDb().users.find((u) => u.id === parsed.userId && u.isActive);
    if (!user) return null;
    return { userId: user.id, companyId: user.companyId, email: user.email, role: user.role };
  } catch {
    return null;
  }
}

function sessionFor(user: StoredUser) {
  const payload: TokenPayload = {
    userId: user.id,
    companyId: user.companyId,
    email: user.email,
    role: user.role,
  };
  return {
    accessToken: encodeToken('access', payload),
    refreshToken: encodeToken('refresh', payload),
  };
}

// ── Shared domain helpers (ported from server.ts) ───────────────────────────

function getUserDisplayName(userId: string): string {
  const u = getDb().users.find((x) => x.id === userId);
  return u ? `${u.firstName} ${u.lastName}`.trim() : 'Team Member';
}

function enrichClientStats(client: Client): Client {
  const db = getDb();
  const clientInvoices = db.invoices.filter(
    (inv) =>
      inv.companyId === client.companyId &&
      inv.clientId === client.id &&
      inv.status !== 'VOID' &&
      inv.status !== 'CANCELLED'
  );
  const totalBilled = roundMoney(clientInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0));
  const totalPaid = roundMoney(clientInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0));
  const outstanding = roundMoney(clientInvoices.reduce((sum, inv) => sum + inv.amountDue, 0));

  const paidInvoices = clientInvoices.filter((inv) => inv.paidAt);
  let averagePaymentDays = 0;
  if (paidInvoices.length > 0) {
    const totalDays = paidInvoices.reduce((sum, inv) => {
      const diff = differenceInCalendarDays(parseISO(inv.paidAt!), parseISO(inv.issueDate));
      return sum + Math.max(0, diff);
    }, 0);
    averagePaymentDays = Math.round(totalDays / paidInvoices.length);
  }

  return {
    ...client,
    invoiceCount: clientInvoices.length,
    totalBilled,
    totalPaid,
    outstanding,
    averagePaymentDays,
  };
}

function findCompany(companyId: string): Company | undefined {
  return getDb().companies.find((c) => c.id === companyId);
}

function buildLineItems(
  items: z.infer<typeof invoiceSchema>['lineItems'],
  invoiceId: string
): { calc: ReturnType<typeof calculateInvoiceTotals>; lineItems: InvoiceLineItem[] } {
  const calc = calculateInvoiceTotals(items);
  const lineItems: InvoiceLineItem[] = items.map((it, idx) => ({
    id: generateId('ili'),
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
    hsnCode: it.hsnCode || null,
    invoiceId,
  }));
  return { calc, lineItems };
}

function companyInvoiceNumbers(companyId: string): string[] {
  return getDb()
    .invoices.filter((i) => i.companyId === companyId)
    .map((i) => i.invoiceNumber);
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

// ── Auth routes ─────────────────────────────────────────────────────────────

const register: Handler = async ({ body }) => {
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const db = getDb();
  const emailLower = parsed.data.email.toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === emailLower)) {
    return fail(409, 'EMAIL_EXISTS', 'An account with this email already exists');
  }

  const now = new Date().toISOString();
  const companyId = generateId('cmp');
  const [firstName, ...rest] = parsed.data.fullName.trim().split(/\s+/);

  const company: Company = {
    id: companyId,
    nameEn: parsed.data.companyName,
    nameAr: null,
    trn: null,
    tin: null,
    licenseNumber: null,
    addressLine1: null,
    addressLine2: null,
    city: parsed.data.emirate,
    emirate: parsed.data.emirate,
    poBox: null,
    country: 'AE',
    email: emailLower,
    phone: parsed.data.phone || null,
    website: null,
    logoUrl: null,
    accentColor: '#F26522',
    invoicePrefix: 'INV',
    invoiceNextNumber: 1,
    creditNotePrefix: 'CN',
    creditNoteNextNum: 1,
    defaultPaymentTermsDays: 30,
    defaultCurrency: 'AED',
    defaultNotes: 'Thank you for your business.',
    bankName: null,
    bankAccountName: parsed.data.companyName,
    bankAccountNumber: null,
    bankIban: null,
    bankSwift: null,
    isOnboarded: false,
    createdAt: now,
    updatedAt: now,
  };

  const user: StoredUser = {
    id: generateId('usr'),
    email: emailLower,
    passwordHash: await hashPassword(parsed.data.password),
    firstName,
    lastName: rest.join(' ') || '',
    role: 'OWNER',
    avatarUrl: null,
    isActive: true,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    companyId,
  };

  db.companies.push(company);
  db.users.push(user);
  saveDb();

  return ok({ ...sessionFor(user), user: stripPassword(user), company }, 201);
};

const login: Handler = async ({ body }) => {
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const db = getDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === parsed.data.email.toLowerCase() && u.isActive
  );
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  user.lastLoginAt = new Date().toISOString();
  saveDb();
  const company = findCompany(user.companyId);
  return ok({ ...sessionFor(user), user: stripPassword(user), company });
};

const demoLogin: Handler = () => {
  const db = getDb();
  const user = db.users.find((u) => u.id === 'usr_omar_owner') || db.users[0];
  const company = findCompany(user.companyId);
  user.lastLoginAt = new Date().toISOString();
  saveDb();
  return ok({ ...sessionFor(user), user: stripPassword(user), company });
};

const refresh: Handler = ({ body }) => {
  const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : '';
  if (!refreshToken) return fail(400, 'MISSING_TOKEN', 'Refresh token required');

  const decoded = decodeToken('refresh', refreshToken);
  if (!decoded) return fail(401, 'INVALID_REFRESH', 'Invalid or expired refresh token');
  const user = getDb().users.find((u) => u.id === decoded.userId && u.isActive);
  if (!user) return fail(401, 'UNAUTHORIZED', 'User not found');
  return ok(sessionFor(user));
};

const forgotPassword: Handler = ({ body }) => {
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!email || !email.includes('@')) {
    return fail(400, 'VALIDATION_ERROR', 'Please provide a valid email address');
  }
  return ok({
    message: 'If an account matches that email, a password reset link has been dispatched.',
  });
};

const getMe: Handler = ({ user: auth }) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === auth.userId);
  const company = findCompany(auth.companyId);
  if (!user || !company) return fail(404, 'NOT_FOUND', 'Profile not found');
  return ok({ user: stripPassword(user), company });
};

const updateMe: Handler = ({ user: auth, body }) => {
  const schema = z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().optional().default(''),
    email: z.string().trim().email(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const user = getDb().users.find((u) => u.id === auth.userId);
  if (!user) return fail(404, 'NOT_FOUND', 'User not found');
  user.firstName = parsed.data.firstName;
  user.lastName = parsed.data.lastName;
  user.email = parsed.data.email.toLowerCase();
  user.updatedAt = new Date().toISOString();
  saveDb();
  return ok(stripPassword(user));
};

const changePassword: Handler = async ({ user: auth, body }) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const user = getDb().users.find((u) => u.id === auth.userId);
  if (!user) return fail(404, 'NOT_FOUND', 'User not found');
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return fail(400, 'INVALID_PASSWORD', 'Current password is incorrect');
  }
  user.passwordHash = await hashPassword(parsed.data.newPassword);
  user.updatedAt = new Date().toISOString();
  saveDb();
  return ok({ message: 'Password updated successfully' });
};

// ── Company routes ──────────────────────────────────────────────────────────

const getCompany: Handler = ({ user }) => {
  const company = findCompany(user.companyId);
  if (!company) return fail(404, 'NOT_FOUND', 'Company not found');
  return ok(company);
};

const updateCompany: Handler = ({ user, body }) => {
  const parsed = companyUpdateSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);
  const company = findCompany(user.companyId);
  if (!company) return fail(404, 'NOT_FOUND', 'Company not found');

  Object.assign(company, parsed.data, { updatedAt: new Date().toISOString() });
  saveDb();
  logActivity({
    companyId: company.id,
    userId: user.userId,
    userName: getUserDisplayName(user.userId),
    action: 'company.updated',
    entityType: 'company',
    entityId: company.id,
    description: 'Updated company profile & compliance settings',
  });
  return ok(company);
};

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

// The server stores the file on disk; here the logo is kept as a data URL.
const uploadLogo: Handler = async ({ user, body }) => {
  const file = body instanceof FormData ? body.get('logo') : null;
  if (!(file instanceof Blob)) {
    return fail(400, 'NO_FILE', 'Please upload a PNG, JPG, or WebP logo file');
  }
  if (!LOGO_TYPES.includes(file.type)) {
    return fail(400, 'INVALID_FILE', 'Only PNG, JPG, and WebP logos are allowed');
  }
  if (file.size > LOGO_MAX_BYTES) {
    return fail(400, 'FILE_TOO_LARGE', 'Logo must be 2MB or smaller');
  }
  const company = findCompany(user.companyId);
  if (!company) return fail(404, 'NOT_FOUND', 'Company not found');

  const previous = { logoUrl: company.logoUrl, updatedAt: company.updatedAt };
  company.logoUrl = await readFileAsDataUrl(file);
  company.updatedAt = new Date().toISOString();
  if (!saveDb()) {
    Object.assign(company, previous);
    return fail(
      413,
      'STORAGE_FULL',
      'This logo is too large to store in demo mode. Try a smaller image (under ~1MB).'
    );
  }
  return ok({ logoUrl: company.logoUrl });
};

const deleteLogo: Handler = ({ user }) => {
  const company = findCompany(user.companyId);
  if (!company) return fail(404, 'NOT_FOUND', 'Company not found');
  company.logoUrl = null;
  company.updatedAt = new Date().toISOString();
  saveDb();
  return ok({ logoUrl: null });
};

// ── Client routes ───────────────────────────────────────────────────────────

const listClients: Handler = ({ user, query }) => {
  const search = (query.get('search') || '').trim().toLowerCase();
  const statusFilter = query.get('status') || 'active';

  let items = getDb().clients.filter((c) => c.companyId === user.companyId);
  if (statusFilter === 'active') items = items.filter((c) => c.isActive);
  else if (statusFilter === 'inactive') items = items.filter((c) => !c.isActive);

  if (search) {
    items = items.filter(
      (c) =>
        c.nameEn.toLowerCase().includes(search) ||
        (c.nameAr && c.nameAr.includes(search)) ||
        (c.trn && c.trn.includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search))
    );
  }

  const enriched = items.map(enrichClientStats);
  return ok(enriched, 200, { total: enriched.length });
};

const getClient: Handler = ({ user, params }) => {
  const db = getDb();
  const client = db.clients.find((c) => c.id === params.id && c.companyId === user.companyId);
  if (!client) return fail(404, 'NOT_FOUND', 'Client not found');

  refreshOverdueStatuses(user.companyId);
  const invoices = db.invoices
    .filter((i) => i.companyId === user.companyId && i.clientId === client.id)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const creditNotes = db.creditNotes
    .filter((cn) => cn.companyId === user.companyId && cn.clientId === client.id)
    .map((cn) => ({
      ...cn,
      invoiceNumber: db.invoices.find((i) => i.id === cn.invoiceId)?.invoiceNumber,
    }));
  const invoiceIds = new Set(invoices.map((i) => i.id));
  const activities = db.activities
    .filter(
      (a) =>
        a.companyId === user.companyId &&
        (a.entityId === client.id || (a.invoiceId && invoiceIds.has(a.invoiceId)))
    )
    .slice(0, 30);

  return ok({ client: enrichClientStats(client), invoices, creditNotes, activities });
};

const createClient: Handler = ({ user, body }) => {
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const now = new Date().toISOString();
  const client: Client = {
    id: generateId('cli'),
    ...parsed.data,
    companyId: user.companyId,
    createdAt: now,
    updatedAt: now,
  };
  getDb().clients.push(client);
  saveDb();

  logActivity({
    companyId: user.companyId,
    userId: user.userId,
    userName: getUserDisplayName(user.userId),
    action: 'client.created',
    entityType: 'client',
    entityId: client.id,
    description: `New client added: ${client.nameEn}`,
  });
  return ok(enrichClientStats(client), 201);
};

const updateClient: Handler = ({ user, params, body }) => {
  const parsed = clientSchema.partial().safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);
  const client = getDb().clients.find(
    (c) => c.id === params.id && c.companyId === user.companyId
  );
  if (!client) return fail(404, 'NOT_FOUND', 'Client not found');

  Object.assign(client, parsed.data, { updatedAt: new Date().toISOString() });
  saveDb();
  return ok(enrichClientStats(client));
};

const deleteClient: Handler = ({ user, params }) => {
  const client = getDb().clients.find(
    (c) => c.id === params.id && c.companyId === user.companyId
  );
  if (!client) return fail(404, 'NOT_FOUND', 'Client not found');
  client.isActive = false;
  client.updatedAt = new Date().toISOString();
  saveDb();
  return ok({ id: client.id, isActive: false });
};

// ── Product routes ──────────────────────────────────────────────────────────

const listProducts: Handler = ({ user, query }) => {
  const search = (query.get('search') || '').trim().toLowerCase();
  let items = getDb().products.filter((p) => p.companyId === user.companyId);
  if (search) {
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.description && p.description.toLowerCase().includes(search))
    );
  }
  return ok(items, 200, { total: items.length });
};

const createProduct: Handler = ({ user, body }) => {
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);
  const now = new Date().toISOString();
  const product = {
    id: generateId('prd'),
    ...parsed.data,
    vatRate: getVatRateForCategory(parsed.data.vatCategory),
    companyId: user.companyId,
    createdAt: now,
    updatedAt: now,
  };
  getDb().products.push(product);
  saveDb();
  return ok(product, 201);
};

const updateProduct: Handler = ({ user, params, body }) => {
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);
  const product = getDb().products.find(
    (p) => p.id === params.id && p.companyId === user.companyId
  );
  if (!product) return fail(404, 'NOT_FOUND', 'Product not found');

  Object.assign(product, parsed.data, {
    vatRate: parsed.data.vatCategory
      ? getVatRateForCategory(parsed.data.vatCategory)
      : product.vatRate,
    updatedAt: new Date().toISOString(),
  });
  saveDb();
  return ok(product);
};

const deleteProduct: Handler = ({ user, params }) => {
  const product = getDb().products.find(
    (p) => p.id === params.id && p.companyId === user.companyId
  );
  if (!product) return fail(404, 'NOT_FOUND', 'Product not found');
  product.isActive = false;
  product.updatedAt = new Date().toISOString();
  saveDb();
  return ok({ id: product.id, isActive: false });
};

// ── Invoice routes ──────────────────────────────────────────────────────────

const nextInvoiceNumber: Handler = ({ user }) => {
  const company = findCompany(user.companyId);
  if (!company) return fail(404, 'NOT_FOUND', 'Company not found');
  return ok({
    nextNumber: formatInvoiceNumber(company.invoicePrefix, company.invoiceNextNumber),
    prefix: company.invoicePrefix,
    sequence: company.invoiceNextNumber,
  });
};

const listInvoices: Handler = ({ user, query }) => {
  const db = getDb();
  const companyId = user.companyId;
  refreshOverdueStatuses(companyId);

  const status = (query.get('status') || 'ALL').toUpperCase();
  const search = (query.get('search') || '').trim().toLowerCase();
  const fromDate = query.get('from') || '';
  const toDate = query.get('to') || '';
  const sort = query.get('sort') || 'newest';
  const page = Math.max(1, Number(query.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 20));

  const clientMap = new Map(
    db.clients.filter((c) => c.companyId === companyId).map((c) => [c.id, c])
  );

  let list = db.invoices
    .filter((i) => i.companyId === companyId)
    .map((inv) => ({
      ...inv,
      client: clientMap.get(inv.clientId),
      createdByName: getUserDisplayName(inv.createdById),
    }));

  if (status !== 'ALL') list = list.filter((i) => i.status === status);
  if (fromDate) list = list.filter((i) => i.issueDate >= fromDate);
  if (toDate) list = list.filter((i) => i.issueDate <= toDate);
  if (search) {
    list = list.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(search) ||
        (i.client?.nameEn.toLowerCase().includes(search) ?? false) ||
        String(i.grandTotal).includes(search) ||
        (i.purchaseOrderRef?.toLowerCase().includes(search) ?? false)
    );
  }

  switch (sort) {
    case 'oldest':
      list.sort((a, b) => a.issueDate.localeCompare(b.issueDate));
      break;
    case 'amount_desc':
      list.sort((a, b) => b.grandTotal - a.grandTotal);
      break;
    case 'amount_asc':
      list.sort((a, b) => a.grandTotal - b.grandTotal);
      break;
    default:
      list.sort(
        (a, b) =>
          b.issueDate.localeCompare(a.issueDate) || b.invoiceNumber.localeCompare(a.invoiceNumber)
      );
  }

  const total = list.length;
  const start = (page - 1) * limit;
  return ok(list.slice(start, start + limit), 200, {
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
};

const getInvoice: Handler = async ({ user, params }) => {
  const db = getDb();
  const companyId = user.companyId;
  refreshOverdueStatuses(companyId);

  const invoice = db.invoices.find((i) => i.id === params.id && i.companyId === companyId);
  if (!invoice) return fail(404, 'NOT_FOUND', 'Invoice not found');

  const company = findCompany(companyId)!;
  const client = db.clients.find((c) => c.id === invoice.clientId) || null;
  const qrPayload = invoice.qrCodeData || buildFtaQrPayload(company, invoice);
  const qrCodeImage = await generateFtaQrCodeImage(qrPayload);
  const validation = validateInvoiceForFta(
    invoice,
    company,
    client,
    companyInvoiceNumbers(companyId)
  );

  return ok({
    invoice: {
      ...invoice,
      qrCodeData: qrPayload,
      qrCodeImage,
      client: client || undefined,
      company,
      createdByName: getUserDisplayName(invoice.createdById),
    },
    validation,
    activities: db.activities.filter(
      (a) => a.companyId === companyId && a.invoiceId === invoice.id
    ),
    creditNotes: db.creditNotes.filter(
      (cn) => cn.companyId === companyId && cn.invoiceId === invoice.id
    ),
  });
};

const createInvoice: Handler = ({ user, body }) => {
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const db = getDb();
  const companyId = user.companyId;
  const company = findCompany(companyId);
  if (!company) return fail(404, 'NOT_FOUND', 'Company not found');

  const client = db.clients.find(
    (c) => c.id === parsed.data.clientId && c.companyId === companyId
  );
  if (!client) return fail(400, 'INVALID_CLIENT', 'Selected client not found');

  const invoiceNumber =
    parsed.data.invoiceNumber?.trim() ||
    formatInvoiceNumber(company.invoicePrefix, company.invoiceNextNumber);
  if (db.invoices.some((i) => i.companyId === companyId && i.invoiceNumber === invoiceNumber)) {
    return fail(409, 'DUPLICATE_NUMBER', `Invoice number ${invoiceNumber} already exists`);
  }

  const id = generateId('inv');
  const now = new Date().toISOString();
  const { calc, lineItems } = buildLineItems(parsed.data.lineItems, id);

  const invoice: Invoice = {
    id,
    invoiceNumber,
    invoiceType: parsed.data.invoiceType,
    issueDate: parsed.data.issueDate,
    dueDate: parsed.data.dueDate,
    purchaseOrderRef: parsed.data.purchaseOrderRef || null,
    projectRef: parsed.data.projectRef || null,
    notes: parsed.data.notes || null,
    internalNotes: parsed.data.internalNotes || null,
    currency: parsed.data.currency,
    exchangeRate: parsed.data.exchangeRate,
    subtotal: calc.subtotal,
    totalDiscount: calc.totalDiscount,
    totalBeforeVat: calc.totalBeforeVat,
    totalVat: calc.totalVat,
    grandTotal: calc.grandTotal,
    amountPaid: 0,
    amountDue: calc.grandTotal,
    status: 'DRAFT',
    paymentTerms: parsed.data.paymentTerms || null,
    paymentMethod: parsed.data.paymentMethod || 'BANK_TRANSFER',
    paidAt: null,
    qrCodeData: null,
    xmlGenerated: false,
    xmlGeneratedAt: null,
    companyId,
    clientId: client.id,
    createdById: user.userId,
    createdAt: now,
    updatedAt: now,
    sentAt: null,
    lineItems,
    payments: [],
  };

  invoice.qrCodeData = buildFtaQrPayload(company, invoice);
  company.invoiceNextNumber += 1;
  db.invoices.unshift(invoice);
  saveDb();

  logActivity({
    companyId,
    userId: user.userId,
    userName: getUserDisplayName(user.userId),
    action: 'invoice.created',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Invoice ${invoice.invoiceNumber} created for ${client.nameEn}`,
  });

  return ok({ ...invoice, client }, 201);
};

const updateInvoice: Handler = ({ user, params, body }) => {
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const db = getDb();
  const companyId = user.companyId;
  const company = findCompany(companyId)!;
  const invoice = db.invoices.find((i) => i.id === params.id && i.companyId === companyId);
  if (!invoice) return fail(404, 'NOT_FOUND', 'Invoice not found');
  if (['PAID', 'VOID', 'CANCELLED'].includes(invoice.status)) {
    return fail(400, 'TERMINAL_STATUS', `Cannot edit an invoice with status ${invoice.status}`);
  }

  const { calc, lineItems } = buildLineItems(parsed.data.lineItems, invoice.id);
  Object.assign(invoice, {
    invoiceNumber: parsed.data.invoiceNumber || invoice.invoiceNumber,
    invoiceType: parsed.data.invoiceType,
    issueDate: parsed.data.issueDate,
    dueDate: parsed.data.dueDate,
    clientId: parsed.data.clientId,
    purchaseOrderRef: parsed.data.purchaseOrderRef || null,
    projectRef: parsed.data.projectRef || null,
    notes: parsed.data.notes || null,
    internalNotes: parsed.data.internalNotes || null,
    currency: parsed.data.currency,
    exchangeRate: parsed.data.exchangeRate,
    paymentTerms: parsed.data.paymentTerms || null,
    paymentMethod: parsed.data.paymentMethod || 'BANK_TRANSFER',
    subtotal: calc.subtotal,
    totalDiscount: calc.totalDiscount,
    totalBeforeVat: calc.totalBeforeVat,
    totalVat: calc.totalVat,
    grandTotal: calc.grandTotal,
    amountDue: roundMoney(Math.max(0, calc.grandTotal - invoice.amountPaid)),
    lineItems,
    updatedAt: new Date().toISOString(),
  });
  invoice.qrCodeData = buildFtaQrPayload(company, invoice);
  saveDb();

  logActivity({
    companyId,
    userId: user.userId,
    userName: getUserDisplayName(user.userId),
    action: 'invoice.updated',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Invoice ${invoice.invoiceNumber} updated`,
  });
  return ok(invoice);
};

const deleteInvoice: Handler = ({ user, params }) => {
  const db = getDb();
  const idx = db.invoices.findIndex((i) => i.id === params.id && i.companyId === user.companyId);
  if (idx === -1) return fail(404, 'NOT_FOUND', 'Invoice not found');
  if (db.invoices[idx].status !== 'DRAFT') {
    return fail(
      400,
      'DELETE_RESTRICTED',
      'Only DRAFT invoices can be deleted. Use Void for issued invoices.'
    );
  }
  const [removed] = db.invoices.splice(idx, 1);
  saveDb();
  return ok({ id: removed.id });
};

const validateInvoice: Handler = ({ user, params }) => {
  const db = getDb();
  const invoice = db.invoices.find((i) => i.id === params.id && i.companyId === user.companyId);
  if (!invoice) return fail(404, 'NOT_FOUND', 'Invoice not found');
  const company = findCompany(user.companyId)!;
  const client = db.clients.find((c) => c.id === invoice.clientId) || null;
  return ok(validateInvoiceForFta(invoice, company, client, companyInvoiceNumbers(user.companyId)));
};

const sendInvoice: Handler = ({ user, params }) => {
  const db = getDb();
  const companyId = user.companyId;
  const invoice = db.invoices.find((i) => i.id === params.id && i.companyId === companyId);
  if (!invoice) return fail(404, 'NOT_FOUND', 'Invoice not found');
  if (['VOID', 'CANCELLED'].includes(invoice.status)) {
    return fail(400, 'INVALID_TRANSITION', 'Cannot send a void or cancelled invoice');
  }

  const company = findCompany(companyId)!;
  const client = db.clients.find((c) => c.id === invoice.clientId) || null;
  const validation = validateInvoiceForFta(
    invoice,
    company,
    client,
    companyInvoiceNumbers(companyId)
  );
  if (!validation.valid) {
    const n = validation.errors.length;
    return fail(
      422,
      'FTA_VALIDATION_FAILED',
      `FTA compliance check failed (${n} issue${n === 1 ? '' : 's'} found)`,
      validation.errors
    );
  }

  const now = new Date().toISOString();
  if (invoice.status === 'DRAFT') invoice.status = 'SENT';
  invoice.sentAt = now;
  invoice.qrCodeData = buildFtaQrPayload(company, invoice);
  invoice.updatedAt = now;
  saveDb();

  logActivity({
    companyId,
    userId: user.userId,
    userName: getUserDisplayName(user.userId),
    action: 'invoice.sent',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Invoice ${invoice.invoiceNumber} sent to ${client?.nameEn || 'client'}${
      client?.email ? ` (${client.email})` : ''
    }`,
  });
  return ok(invoice);
};

const recordPayment: Handler = ({ user, params, body }) => {
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const db = getDb();
  const companyId = user.companyId;
  const invoice = db.invoices.find((i) => i.id === params.id && i.companyId === companyId);
  if (!invoice) return fail(404, 'NOT_FOUND', 'Invoice not found');
  if (['PAID', 'VOID', 'CANCELLED'].includes(invoice.status)) {
    return fail(400, 'INVALID_STATUS', 'Cannot record payment on this invoice');
  }
  if (parsed.data.amount > invoice.amountDue + 0.01) {
    return fail(
      400,
      'EXCEEDS_BALANCE',
      `Payment amount exceeds remaining balance (${invoice.currency} ${invoice.amountDue.toFixed(2)})`
    );
  }

  const recordedBy = getUserDisplayName(user.userId);
  invoice.payments = invoice.payments || [];
  invoice.payments.push({
    id: generateId('pay'),
    amount: roundMoney(parsed.data.amount),
    paymentDate: parsed.data.paymentDate,
    paymentMethod: parsed.data.paymentMethod,
    reference: parsed.data.reference || null,
    notes: parsed.data.notes || null,
    recordedBy,
  });

  invoice.amountPaid = roundMoney(invoice.amountPaid + parsed.data.amount);
  invoice.amountDue = roundMoney(Math.max(0, invoice.grandTotal - invoice.amountPaid));
  if (invoice.amountDue <= 0.01) {
    invoice.amountDue = 0;
    invoice.status = 'PAID';
    invoice.paidAt = new Date().toISOString();
  } else {
    invoice.status = 'PARTIALLY_PAID';
  }
  invoice.updatedAt = new Date().toISOString();
  saveDb();

  logActivity({
    companyId,
    userId: user.userId,
    userName: recordedBy,
    action: 'payment.recorded',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Payment of ${invoice.currency} ${parsed.data.amount.toLocaleString('en-AE', {
      minimumFractionDigits: 2,
    })} recorded for ${invoice.invoiceNumber}`,
  });
  return ok(invoice);
};

const voidInvoice: Handler = ({ user, params }) => {
  const db = getDb();
  const companyId = user.companyId;
  const invoice = db.invoices.find((i) => i.id === params.id && i.companyId === companyId);
  if (!invoice) return fail(404, 'NOT_FOUND', 'Invoice not found');
  if (['PAID', 'VOID', 'CANCELLED'].includes(invoice.status)) {
    return fail(400, 'INVALID_TRANSITION', `Cannot void an invoice in ${invoice.status} state`);
  }
  invoice.status = invoice.status === 'DRAFT' ? 'CANCELLED' : 'VOID';
  invoice.amountDue = 0;
  invoice.updatedAt = new Date().toISOString();
  saveDb();

  logActivity({
    companyId,
    userId: user.userId,
    userName: getUserDisplayName(user.userId),
    action: 'invoice.voided',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Invoice ${invoice.invoiceNumber} marked as ${invoice.status}`,
  });
  return ok(invoice);
};

const duplicateInvoice: Handler = ({ user, params }) => {
  const db = getDb();
  const companyId = user.companyId;
  const company = findCompany(companyId)!;
  const original = db.invoices.find((i) => i.id === params.id && i.companyId === companyId);
  if (!original) return fail(404, 'NOT_FOUND', 'Invoice not found');

  const now = new Date();
  const newId = generateId('inv');
  const invoiceNumber = formatInvoiceNumber(company.invoicePrefix, company.invoiceNextNumber);
  company.invoiceNextNumber += 1;

  const clone: Invoice = {
    ...original,
    id: newId,
    invoiceNumber,
    issueDate: format(now, 'yyyy-MM-dd'),
    dueDate: format(
      new Date(now.getTime() + company.defaultPaymentTermsDays * 86400000),
      'yyyy-MM-dd'
    ),
    status: 'DRAFT',
    amountPaid: 0,
    amountDue: original.grandTotal,
    paidAt: null,
    sentAt: null,
    xmlGenerated: false,
    xmlGeneratedAt: null,
    payments: [],
    createdById: user.userId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lineItems: original.lineItems.map((li) => ({ ...li, id: generateId('ili'), invoiceId: newId })),
  };
  clone.qrCodeData = buildFtaQrPayload(company, clone);
  db.invoices.unshift(clone);
  saveDb();
  return ok(clone, 201);
};

const invoiceXml: Handler = ({ user, params, query }) => {
  const db = getDb();
  const companyId = user.companyId;
  const invoice = db.invoices.find((i) => i.id === params.id && i.companyId === companyId);
  if (!invoice) return fail(404, 'NOT_FOUND', 'Invoice not found');
  const company = findCompany(companyId)!;
  const client = db.clients.find((c) => c.id === invoice.clientId);
  if (!client) {
    return fail(400, 'MISSING_CLIENT', 'Client record required for XML generation');
  }

  const xml = generatePintAeXml(invoice, company, client);
  invoice.xmlGenerated = true;
  invoice.xmlGeneratedAt = new Date().toISOString();
  saveDb();

  logActivity({
    companyId,
    userId: user.userId,
    userName: getUserDisplayName(user.userId),
    action: 'invoice.xml_generated',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Generated PINT-AE UBL 2.1 XML for ${invoice.invoiceNumber}`,
  });

  if (query.get('format') === 'json') {
    return ok({ xml, filename: `${invoice.invoiceNumber}-PINT-AE.xml` });
  }
  return { status: 200, body: xml, contentType: 'application/xml; charset=utf-8' };
};

// ── Credit note routes ──────────────────────────────────────────────────────

const listCreditNotes: Handler = ({ user }) => {
  const db = getDb();
  const companyId = user.companyId;
  const clientMap = new Map(
    db.clients.filter((c) => c.companyId === companyId).map((c) => [c.id, c])
  );
  const invMap = new Map(
    db.invoices.filter((i) => i.companyId === companyId).map((i) => [i.id, i])
  );

  const list = db.creditNotes
    .filter((cn) => cn.companyId === companyId)
    .map((cn) => ({
      ...cn,
      client: clientMap.get(cn.clientId),
      invoiceNumber: invMap.get(cn.invoiceId)?.invoiceNumber || '—',
    }))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  return ok(list);
};

const createCreditNote: Handler = ({ user, body }) => {
  const parsed = creditNoteSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const db = getDb();
  const companyId = user.companyId;
  const company = findCompany(companyId)!;
  const invoice = db.invoices.find(
    (i) => i.id === parsed.data.invoiceId && i.companyId === companyId
  );
  if (!invoice) return fail(404, 'NOT_FOUND', 'Linked invoice not found');

  let subtotal = 0;
  let totalVat = 0;
  const cnId = generateId('cn');
  const lineItems: CreditNoteLineItem[] = parsed.data.lineItems.map((it, idx) => {
    const rate = getVatRateForCategory(it.vatCategory);
    const base = roundMoney(it.quantity * it.unitPrice);
    const vat = roundMoney((base * rate) / 100);
    subtotal = roundMoney(subtotal + base);
    totalVat = roundMoney(totalVat + vat);
    return {
      id: generateId('cnli'),
      lineNumber: idx + 1,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unitPrice,
      vatCategory: it.vatCategory,
      vatRate: rate,
      vatAmount: vat,
      lineTotal: roundMoney(base + vat),
      creditNoteId: cnId,
    };
  });

  const grandTotal = roundMoney(subtotal + totalVat);
  if (grandTotal > invoice.grandTotal + 0.01) {
    return fail(
      400,
      'EXCEEDS_INVOICE',
      `Credit note total (${invoice.currency} ${grandTotal.toFixed(2)}) cannot exceed original invoice total (${invoice.currency} ${invoice.grandTotal.toFixed(2)})`
    );
  }

  const creditNoteNumber = formatInvoiceNumber(company.creditNotePrefix, company.creditNoteNextNum);
  company.creditNoteNextNum += 1;

  const now = new Date().toISOString();
  const cn: CreditNote = {
    id: cnId,
    creditNoteNumber,
    issueDate: parsed.data.issueDate,
    reason: parsed.data.reason,
    reasonDetail: parsed.data.reasonDetail || null,
    subtotal,
    totalVat,
    grandTotal,
    status: 'DRAFT',
    companyId,
    clientId: invoice.clientId,
    invoiceId: invoice.id,
    createdAt: now,
    updatedAt: now,
    lineItems,
  };
  db.creditNotes.unshift(cn);
  saveDb();

  logActivity({
    companyId,
    userId: user.userId,
    userName: getUserDisplayName(user.userId),
    action: 'credit_note.created',
    entityType: 'credit_note',
    entityId: cn.id,
    invoiceId: invoice.id,
    description: `Credit note ${cn.creditNoteNumber} created against ${invoice.invoiceNumber}`,
  });
  return ok(cn, 201);
};

const issueCreditNote: Handler = ({ user, params }) => {
  const db = getDb();
  const companyId = user.companyId;
  const cn = db.creditNotes.find((c) => c.id === params.id && c.companyId === companyId);
  if (!cn) return fail(404, 'NOT_FOUND', 'Credit note not found');
  if (cn.status !== 'DRAFT') {
    return fail(400, 'INVALID_STATUS', 'Credit note is already issued or void');
  }

  cn.status = 'ISSUED';
  cn.updatedAt = new Date().toISOString();

  // Reduce the linked invoice's outstanding balance
  const invoice = db.invoices.find((i) => i.id === cn.invoiceId && i.companyId === companyId);
  if (invoice && invoice.amountDue > 0) {
    invoice.amountDue = roundMoney(Math.max(0, invoice.amountDue - cn.grandTotal));
    if (invoice.amountDue === 0 && invoice.status !== 'VOID' && invoice.status !== 'CANCELLED') {
      invoice.status = 'PAID';
      invoice.paidAt = new Date().toISOString();
    }
    invoice.updatedAt = new Date().toISOString();
  }
  saveDb();

  logActivity({
    companyId,
    userId: user.userId,
    userName: getUserDisplayName(user.userId),
    action: 'credit_note.issued',
    entityType: 'credit_note',
    entityId: cn.id,
    invoiceId: cn.invoiceId,
    description: `Credit note ${cn.creditNoteNumber} issued (${cn.grandTotal.toFixed(2)} AED)`,
  });
  return ok(cn);
};

const deleteCreditNote: Handler = ({ user, params }) => {
  const db = getDb();
  const idx = db.creditNotes.findIndex(
    (c) => c.id === params.id && c.companyId === user.companyId
  );
  if (idx === -1) return fail(404, 'NOT_FOUND', 'Credit note not found');
  if (db.creditNotes[idx].status !== 'DRAFT') {
    return fail(400, 'DELETE_RESTRICTED', 'Only draft credit notes can be deleted');
  }
  const [removed] = db.creditNotes.splice(idx, 1);
  saveDb();
  return ok({ id: removed.id });
};

// ── Reports ─────────────────────────────────────────────────────────────────

const dashboard: Handler = ({ user }) => {
  const db = getDb();
  const companyId = user.companyId;
  refreshOverdueStatuses(companyId);

  const now = new Date();
  const lastMonthDate = subMonths(now, 1);
  const clientMap = new Map(
    db.clients.filter((c) => c.companyId === companyId).map((c) => [c.id, c])
  );
  const activeInvoices = db.invoices.filter(
    (i) => i.companyId === companyId && !['VOID', 'CANCELLED'].includes(i.status)
  );

  const thisMonthInvoices = activeInvoices.filter((i) => isSameMonth(parseISO(i.issueDate), now));
  const lastMonthInvoices = activeInvoices.filter((i) =>
    isSameMonth(parseISO(i.issueDate), lastMonthDate)
  );
  const totalRevenueThisMonth = roundMoney(thisMonthInvoices.reduce((s, i) => s + i.grandTotal, 0));
  const totalRevenueLastMonth = roundMoney(lastMonthInvoices.reduce((s, i) => s + i.grandTotal, 0));
  const revenueChangePercent =
    totalRevenueLastMonth > 0
      ? Math.round(((totalRevenueThisMonth - totalRevenueLastMonth) / totalRevenueLastMonth) * 100)
      : totalRevenueThisMonth > 0
        ? 100
        : 0;

  const unpaid = activeInvoices.filter((i) => i.amountDue > 0 && i.status !== 'DRAFT');
  const totalOutstanding = roundMoney(unpaid.reduce((s, i) => s + i.amountDue, 0));
  const overdueList = activeInvoices.filter((i) => i.status === 'OVERDUE');
  const overdueAmount = roundMoney(overdueList.reduce((s, i) => s + i.amountDue, 0));

  const monthSeries: { label: string; revenue: number; vat: number; count: number }[] = [];
  for (let m = 5; m >= 0; m--) {
    const dt = subMonths(now, m);
    const inMonth = activeInvoices.filter((i) => isSameMonth(parseISO(i.issueDate), dt));
    monthSeries.push({
      label: format(dt, 'MMM yyyy'),
      revenue: roundMoney(inMonth.reduce((s, i) => s + i.grandTotal, 0)),
      vat: roundMoney(inMonth.reduce((s, i) => s + i.totalVat, 0)),
      count: inMonth.length,
    });
  }

  const weekSeries: { label: string; revenue: number; vat: number }[] = [];
  for (let w = 5; w >= 0; w--) {
    const end = subWeeks(now, w);
    const start = subWeeks(now, w + 1);
    const inWeek = activeInvoices.filter((i) => {
      const d = parseISO(i.issueDate);
      return d > start && d <= end;
    });
    weekSeries.push({
      label: format(end, 'dd MMM'),
      revenue: roundMoney(inWeek.reduce((s, i) => s + i.grandTotal, 0)),
      vat: roundMoney(inWeek.reduce((s, i) => s + i.totalVat, 0)),
    });
  }

  const sumSlice = (from: number, to: number, key: 'revenue' | 'vat') =>
    roundMoney(monthSeries.slice(from, to).reduce((s, x) => s + x[key], 0));
  const quarterSeries = [
    { label: 'Q-3', revenue: sumSlice(0, 2, 'revenue'), vat: sumSlice(0, 2, 'vat') },
    { label: 'Q-2', revenue: sumSlice(2, 4, 'revenue'), vat: sumSlice(2, 4, 'vat') },
    { label: 'Current Q', revenue: sumSlice(4, 6, 'revenue'), vat: sumSlice(4, 6, 'vat') },
  ];

  const summary: DashboardSummary = {
    totalRevenueThisMonth,
    revenueChangePercent,
    totalOutstanding,
    overdueAmount,
    overdueCount: overdueList.length,
    invoicesThisMonth: thisMonthInvoices.length,
    monthlySparkline: monthSeries.map((m) => ({
      label: m.label.slice(0, 3),
      count: m.count,
      revenue: m.revenue,
    })),
    revenueSeries: {
      week: weekSeries,
      month: monthSeries.map(({ label, revenue, vat }) => ({ label: label.slice(0, 3), revenue, vat })),
      quarter: quarterSeries,
    },
    recentActivities: db.activities.filter((a) => a.companyId === companyId).slice(0, 8),
    outstandingInvoices: [...unpaid]
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
      .map((i) => ({ ...i, client: clientMap.get(i.clientId) })),
  };
  return ok(summary);
};

const revenueReport: Handler = ({ user, query }) => {
  const period = query.get('period') || 'year';
  const now = new Date();
  const monthsBack = period === 'month' ? 1 : period === 'quarter' ? 3 : 6;
  const activeInvoices = getDb().invoices.filter(
    (i) => i.companyId === user.companyId && !['VOID', 'CANCELLED'].includes(i.status)
  );

  const breakdown: {
    month: string;
    invoiceCount: number;
    netRevenue: number;
    vatCollected: number;
    grossRevenue: number;
    collected: number;
  }[] = [];
  for (let m = monthsBack - 1; m >= 0; m--) {
    const dt = subMonths(now, m);
    const inMonth = activeInvoices.filter((i) => isSameMonth(parseISO(i.issueDate), dt));
    breakdown.push({
      month: format(dt, 'MMM yyyy'),
      invoiceCount: inMonth.length,
      netRevenue: roundMoney(inMonth.reduce((s, i) => s + i.totalBeforeVat, 0)),
      vatCollected: roundMoney(inMonth.reduce((s, i) => s + i.totalVat, 0)),
      grossRevenue: roundMoney(inMonth.reduce((s, i) => s + i.grandTotal, 0)),
      collected: roundMoney(inMonth.reduce((s, i) => s + i.amountPaid, 0)),
    });
  }

  const total = (key: 'grossRevenue' | 'vatCollected' | 'netRevenue' | 'collected') =>
    roundMoney(breakdown.reduce((s, r) => s + r[key], 0));
  return ok({
    totals: {
      grossRevenue: total('grossRevenue'),
      vatCollected: total('vatCollected'),
      netRevenue: total('netRevenue'),
      collected: total('collected'),
    },
    breakdown,
  });
};

const vatSummary: Handler = ({ user, query }) => {
  const db = getDb();
  const companyId = user.companyId;
  const period = query.get('period') || 'quarter';
  const now = new Date();
  const cutoff = period === 'month' ? subMonths(now, 1) : subMonths(now, 3);

  const invoices = db.invoices.filter(
    (i) =>
      i.companyId === companyId &&
      !['DRAFT', 'VOID', 'CANCELLED'].includes(i.status) &&
      parseISO(i.issueDate) >= cutoff
  );
  const issuedCreditNotes = db.creditNotes.filter(
    (cn) => cn.companyId === companyId && cn.status === 'ISSUED' && parseISO(cn.issueDate) >= cutoff
  );

  const categoryTotals: Record<
    string,
    { category: string; label: string; taxableAmount: number; vatAmount: number }
  > = {
    STANDARD: { category: 'STANDARD', label: 'Standard Rated Supplies (5%)', taxableAmount: 0, vatAmount: 0 },
    ZERO_RATED: { category: 'ZERO_RATED', label: 'Zero-Rated Supplies (0%)', taxableAmount: 0, vatAmount: 0 },
    EXEMPT: { category: 'EXEMPT', label: 'Exempt Supplies', taxableAmount: 0, vatAmount: 0 },
    REVERSE_CHARGE: { category: 'REVERSE_CHARGE', label: 'Reverse Charge Mechanism', taxableAmount: 0, vatAmount: 0 },
    OUT_OF_SCOPE: { category: 'OUT_OF_SCOPE', label: 'Out of Scope Supplies', taxableAmount: 0, vatAmount: 0 },
  };

  for (const inv of invoices) {
    for (const line of inv.lineItems) {
      const bucket = categoryTotals[line.vatCategory] || categoryTotals.STANDARD;
      bucket.taxableAmount = roundMoney(bucket.taxableAmount + line.lineTotalBeforeVat);
      bucket.vatAmount = roundMoney(bucket.vatAmount + line.vatAmount);
    }
  }

  const creditNoteVatAdjustment = roundMoney(issuedCreditNotes.reduce((s, cn) => s + cn.totalVat, 0));
  const grossOutputVat = roundMoney(
    Object.values(categoryTotals).reduce((s, b) => s + b.vatAmount, 0)
  );
  const outputVat = roundMoney(Math.max(0, grossOutputVat - creditNoteVatAdjustment));

  return ok({
    period,
    periodStart: format(cutoff, 'yyyy-MM-dd'),
    periodEnd: format(now, 'yyyy-MM-dd'),
    invoiceCount: invoices.length,
    creditNoteCount: issuedCreditNotes.length,
    grossOutputVat,
    creditNoteVatAdjustment,
    outputVat,
    inputVat: 0,
    netVatPayable: outputVat,
    categories: Object.values(categoryTotals),
  });
};

const agingReport: Handler = ({ user }) => {
  const db = getDb();
  const companyId = user.companyId;
  refreshOverdueStatuses(companyId);
  const now = new Date();

  const rows = db.clients
    .filter((c) => c.companyId === companyId)
    .map((client) => {
      const unpaid = db.invoices.filter(
        (i) =>
          i.companyId === companyId &&
          i.clientId === client.id &&
          i.amountDue > 0 &&
          !['DRAFT', 'VOID', 'CANCELLED'].includes(i.status)
      );
      const buckets = {
        clientId: client.id,
        clientName: client.nameEn,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
        total: 0,
      };
      for (const inv of unpaid) {
        const overdueDays = differenceInCalendarDays(now, parseISO(inv.dueDate));
        if (overdueDays <= 0) buckets.current = roundMoney(buckets.current + inv.amountDue);
        else if (overdueDays <= 30) buckets.days1to30 = roundMoney(buckets.days1to30 + inv.amountDue);
        else if (overdueDays <= 60) buckets.days31to60 = roundMoney(buckets.days31to60 + inv.amountDue);
        else if (overdueDays <= 90) buckets.days61to90 = roundMoney(buckets.days61to90 + inv.amountDue);
        else buckets.days90plus = roundMoney(buckets.days90plus + inv.amountDue);
        buckets.total = roundMoney(buckets.total + inv.amountDue);
      }
      return buckets;
    })
    .filter((r) => r.total > 0);

  const sum = (key: Exclude<keyof (typeof rows)[number], 'clientId' | 'clientName'>) =>
    roundMoney(rows.reduce((s, r) => s + r[key], 0));
  return ok({
    summary: {
      current: sum('current'),
      days1to30: sum('days1to30'),
      days31to60: sum('days31to60'),
      days61to90: sum('days61to90'),
      days90plus: sum('days90plus'),
      total: sum('total'),
    },
    rows,
  });
};

const topClients: Handler = ({ user }) => {
  const clients = getDb()
    .clients.filter((c) => c.companyId === user.companyId)
    .map(enrichClientStats)
    .sort((a, b) => (b.totalBilled || 0) - (a.totalBilled || 0))
    .slice(0, 10);
  return ok(clients);
};

// ── Activities & team ───────────────────────────────────────────────────────

const listActivities: Handler = ({ user }) =>
  ok(getDb().activities.filter((a) => a.companyId === user.companyId).slice(0, 50));

const listTeam: Handler = ({ user }) =>
  ok(
    getDb()
      .users.filter((u) => u.companyId === user.companyId && u.isActive)
      .map(stripPassword)
  );

const inviteMember: Handler = async ({ user, body }) => {
  const schema = z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().optional().default(''),
    email: z.string().trim().email('Valid email required'),
    role: z.enum(['ADMIN', 'ACCOUNTANT', 'VIEWER']),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const db = getDb();
  if (
    db.users.some((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase() && u.isActive)
  ) {
    return fail(409, 'EMAIL_EXISTS', 'A user with this email already exists');
  }

  const now = new Date().toISOString();
  const member: StoredUser = {
    id: generateId('usr'),
    email: parsed.data.email.toLowerCase(),
    // Invited members get an unguessable placeholder password, as on the server.
    passwordHash: await hashPassword(generateId('tmp') + generateId('tmp')),
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    role: parsed.data.role,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    companyId: user.companyId,
  };
  db.users.push(member);
  saveDb();

  logActivity({
    companyId: user.companyId,
    userId: user.userId,
    userName: getUserDisplayName(user.userId),
    action: 'team.invited',
    entityType: 'user',
    entityId: member.id,
    description: `Invited ${member.firstName} ${member.lastName} (${member.role})`,
  });
  return ok(stripPassword(member), 201);
};

const changeMemberRole: Handler = ({ user, params, body }) => {
  const parsed = z.object({ role: z.enum(['ADMIN', 'ACCOUNTANT', 'VIEWER']) }).safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);
  const member = getDb().users.find((u) => u.id === params.id && u.companyId === user.companyId);
  if (!member) return fail(404, 'NOT_FOUND', 'Member not found');
  if (member.role === 'OWNER') return fail(400, 'OWNER_PROTECTED', 'Cannot change the Owner role');
  member.role = parsed.data.role;
  member.updatedAt = new Date().toISOString();
  saveDb();
  return ok(stripPassword(member));
};

const removeMember: Handler = ({ user, params }) => {
  const member = getDb().users.find((u) => u.id === params.id && u.companyId === user.companyId);
  if (!member) return fail(404, 'NOT_FOUND', 'Member not found');
  if (member.role === 'OWNER' || member.id === user.userId) {
    return fail(400, 'CANNOT_REMOVE', 'Cannot remove the workspace owner or yourself');
  }
  member.isActive = false;
  member.updatedAt = new Date().toISOString();
  saveDb();
  return ok({ id: member.id });
};

// ── Route table ─────────────────────────────────────────────────────────────
// Order matters: literal segments (e.g. /next-number) must precede /:id.

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
interface Route {
  method: Method;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
  auth: boolean;
}

const routes: Route[] = [];

function route(method: Method, path: string, handler: Handler, auth = true) {
  const keys: string[] = [];
  const source = path.replace(/:([A-Za-z]+)/g, (_m, key: string) => {
    keys.push(key);
    return '([^/]+)';
  });
  routes.push({ method, pattern: new RegExp(`^${source}/?$`), keys, handler, auth });
}

route('POST', '/api/auth/register', register, false);
route('POST', '/api/auth/login', login, false);
route('POST', '/api/auth/demo', demoLogin, false);
route('POST', '/api/auth/refresh', refresh, false);
route('POST', '/api/auth/forgot-password', forgotPassword, false);
route('GET', '/api/auth/me', getMe);
route('PUT', '/api/auth/me', updateMe);
route('PUT', '/api/auth/password', changePassword);

route('GET', '/api/company', getCompany);
route('PUT', '/api/company', updateCompany);
route('POST', '/api/company/logo', uploadLogo);
route('DELETE', '/api/company/logo', deleteLogo);

route('GET', '/api/clients', listClients);
route('GET', '/api/clients/:id', getClient);
route('POST', '/api/clients', createClient);
route('PUT', '/api/clients/:id', updateClient);
route('DELETE', '/api/clients/:id', deleteClient);

route('GET', '/api/products', listProducts);
route('POST', '/api/products', createProduct);
route('PUT', '/api/products/:id', updateProduct);
route('DELETE', '/api/products/:id', deleteProduct);

route('GET', '/api/invoices/next-number', nextInvoiceNumber);
route('GET', '/api/invoices', listInvoices);
route('GET', '/api/invoices/:id', getInvoice);
route('POST', '/api/invoices', createInvoice);
route('PUT', '/api/invoices/:id', updateInvoice);
route('DELETE', '/api/invoices/:id', deleteInvoice);
route('POST', '/api/invoices/:id/validate', validateInvoice);
route('POST', '/api/invoices/:id/send', sendInvoice);
route('POST', '/api/invoices/:id/payment', recordPayment);
route('POST', '/api/invoices/:id/void', voidInvoice);
route('POST', '/api/invoices/:id/duplicate', duplicateInvoice);
route('GET', '/api/invoices/:id/xml', invoiceXml);

route('GET', '/api/credit-notes', listCreditNotes);
route('POST', '/api/credit-notes', createCreditNote);
route('POST', '/api/credit-notes/:id/issue', issueCreditNote);
route('DELETE', '/api/credit-notes/:id', deleteCreditNote);

route('GET', '/api/reports/dashboard', dashboard);
route('GET', '/api/reports/revenue', revenueReport);
route('GET', '/api/reports/vat-summary', vatSummary);
route('GET', '/api/reports/aging', agingReport);
route('GET', '/api/reports/top-clients', topClients);

route('GET', '/api/activities', listActivities);
route('GET', '/api/team', listTeam);
route('POST', '/api/team/invite', inviteMember);
route('PUT', '/api/team/:id/role', changeMemberRole);
route('DELETE', '/api/team/:id', removeMember);

// ── fetch-compatible entry point ────────────────────────────────────────────

/** Simulated network latency so loading states behave like the real app. */
const LATENCY_MS = { min: 80, max: 220 };

function delay(): Promise<void> {
  const ms = LATENCY_MS.min + Math.random() * (LATENCY_MS.max - LATENCY_MS.min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toResponse(result: MockResult): Response {
  const isText = typeof result.body === 'string' && result.contentType;
  // Serialising also detaches the response from the live mock DB objects, so
  // React Query caches can never mutate stored data.
  return new Response(isText ? (result.body as string) : JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': result.contentType || 'application/json' },
  });
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (body == null) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

export async function mockFetch(input: string, init: RequestInit = {}): Promise<Response> {
  await delay();
  await ensureDb();

  const url = new URL(input, window.location.origin);
  const method = (init.method || 'GET').toUpperCase() as Method;

  let params: Record<string, string> | null = null;
  const matched = routes.find((r) => {
    if (r.method !== method) return false;
    const m = r.pattern.exec(url.pathname);
    if (!m) return false;
    params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    return true;
  });

  if (!matched) {
    return toResponse(fail(404, 'NOT_FOUND', `No mock route for ${method} ${url.pathname}`));
  }

  let user: TokenPayload | null = null;
  if (matched.auth) {
    const header = new Headers(init.headers).get('Authorization') || '';
    if (!header.startsWith('Bearer ')) {
      return toResponse(fail(401, 'UNAUTHORIZED', 'Authentication token required'));
    }
    user = decodeToken('access', header.slice('Bearer '.length).trim());
    if (!user) {
      return toResponse(fail(401, 'TOKEN_INVALID', 'Session expired or invalid token'));
    }
  }

  try {
    const result = await matched.handler({
      params: params ?? {},
      query: url.searchParams,
      body: parseBody(init.body),
      user: user as TokenPayload,
    });
    return toResponse(result);
  } catch (err) {
    console.error('[mock-api] Unhandled error:', err);
    return toResponse(
      fail(
        500,
        'INTERNAL_ERROR',
        err instanceof Error ? err.message : 'An unexpected server error occurred'
      )
    );
  }
}
