import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
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
  authRateLimiter,
  type AuthRequest,
  hashPassword,
  requireAuth,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from './server/auth.ts';
import {
  formatInvoiceNumber,
  generateId,
  getDb,
  logActivity,
  refreshOverdueStatuses,
  saveDb,
  stripPassword,
} from './server/db.ts';
import {
  buildFtaQrPayload,
  generateFtaQrCodeImage,
  generatePintAeXml,
  validateInvoiceForFta,
} from './server/fta.ts';
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
} from './shared/schemas.ts';
import type {
  Client,
  CreditNote,
  CreditNoteLineItem,
  DashboardSummary,
  Invoice,
  InvoiceLineItem,
  UserRole,
} from './shared/types.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' }));

// Safe logo serving with strict path confinement
app.get('/api/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename || '');
  if (!/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(filename)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_FILE', message: 'Invalid filename' } });
    return;
  }
  const resolved = path.resolve(UPLOADS_DIR, filename);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(resolved)) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
    return;
  }
  res.sendFile(resolved);
});

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const extMap: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/webp': '.webp',
      };
      const ext = extMap[file.mimetype] || '.png';
      cb(null, `logo_${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, and WebP logos are allowed'));
    }
  },
});

function formatZodError(err: z.ZodError) {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: err.issues[0]?.message || 'Validation failed',
      details: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    },
  };
}

function getUserDisplayName(userId: string): string {
  const db = getDb();
  const u = db.users.find((x) => x.id === userId);
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
  const totalBilled = roundMoney(
    clientInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
  );
  const totalPaid = roundMoney(
    clientInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0)
  );
  const outstanding = roundMoney(
    clientInvoices.reduce((sum, inv) => sum + inv.amountDue, 0)
  );

  const paidInvoices = clientInvoices.filter((inv) => inv.paidAt);
  let averagePaymentDays = 0;
  if (paidInvoices.length > 0) {
    const totalDays = paidInvoices.reduce((sum, inv) => {
      const diff = differenceInCalendarDays(
        parseISO(inv.paidAt!),
        parseISO(inv.issueDate)
      );
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

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }

  const db = getDb();
  const emailLower = parsed.data.email.toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === emailLower)) {
    res.status(409).json({
      success: false,
      error: {
        code: 'EMAIL_EXISTS',
        message: 'An account with this email already exists',
      },
    });
    return;
  }

  const now = new Date().toISOString();
  const companyId = generateId('cmp');
  const userId = generateId('usr');
  const [firstName, ...rest] = parsed.data.fullName.trim().split(/\s+/);
  const lastName = rest.join(' ') || '';

  const company = {
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

  const passwordHash = await hashPassword(parsed.data.password);
  const user = {
    id: userId,
    email: emailLower,
    passwordHash,
    firstName,
    lastName,
    role: 'OWNER' as UserRole,
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

  const tokenPayload = {
    userId: user.id,
    companyId: company.id,
    email: user.email,
    role: user.role,
  };

  res.status(201).json({
    success: true,
    data: {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken(tokenPayload),
      user: stripPassword(user),
      company,
    },
  });
});

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }

  const db = getDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === parsed.data.email.toLowerCase() && u.isActive
  );
  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
    return;
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
    return;
  }

  user.lastLoginAt = new Date().toISOString();
  saveDb();

  const company = db.companies.find((c) => c.id === user.companyId);
  const tokenPayload = {
    userId: user.id,
    companyId: user.companyId,
    email: user.email,
    role: user.role,
  };

  res.json({
    success: true,
    data: {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken(tokenPayload),
      user: stripPassword(user),
      company,
    },
  });
});

// One-click demo workspace sign-in (authenticates seeded UAE demo company cleanly on server)
app.post('/api/auth/demo', authRateLimiter, (_req, res) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === 'usr_omar_owner') || db.users[0];
  const company = db.companies.find((c) => c.id === user.companyId);
  user.lastLoginAt = new Date().toISOString();
  saveDb();

  const tokenPayload = {
    userId: user.id,
    companyId: user.companyId,
    email: user.email,
    role: user.role,
  };

  res.json({
    success: true,
    data: {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken(tokenPayload),
      user: stripPassword(user),
      company,
    },
  });
});

app.post('/api/auth/refresh', authRateLimiter, (req, res) => {
  const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
  if (!refreshToken) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_TOKEN', message: 'Refresh token required' },
    });
    return;
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const db = getDb();
    const user = db.users.find((u) => u.id === decoded.userId && u.isActive);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found' },
      });
      return;
    }
    const payload = {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    };
    res.json({
      success: true,
      data: {
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
      },
    });
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_REFRESH', message: 'Invalid or expired refresh token' },
    });
  }
});

app.post('/api/auth/forgot-password', authRateLimiter, (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!email || !email.includes('@')) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid email address' },
    });
    return;
  }
  // Always return generic success to avoid email enumeration
  res.json({
    success: true,
    data: {
      message: 'If an account matches that email, a password reset link has been dispatched.',
    },
  });
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === req.user!.userId);
  const company = db.companies.find((c) => c.id === req.user!.companyId);
  if (!user || !company) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Profile not found' },
    });
    return;
  }
  res.json({ success: true, data: { user: stripPassword(user), company } });
});

app.put('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  const schema = z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().optional().default(''),
    email: z.string().trim().email(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }
  const db = getDb();
  const user = db.users.find((u) => u.id === req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }
  user.firstName = parsed.data.firstName;
  user.lastName = parsed.data.lastName;
  user.email = parsed.data.email.toLowerCase();
  user.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ success: true, data: stripPassword(user) });
});

app.put('/api/auth/password', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }
  const db = getDb();
  const user = db.users.find((u) => u.id === req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }
  const matches = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!matches) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' },
    });
    return;
  }
  user.passwordHash = await hashPassword(parsed.data.newPassword);
  user.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ success: true, data: { message: 'Password updated successfully' } });
});

// ==================== COMPANY ROUTES ====================

app.get('/api/company', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const company = db.companies.find((c) => c.id === req.user!.companyId);
  if (!company) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
    return;
  }
  res.json({ success: true, data: company });
});

app.put('/api/company', requireAuth, (req: AuthRequest, res) => {
  const parsed = companyUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }
  const db = getDb();
  const company = db.companies.find((c) => c.id === req.user!.companyId);
  if (!company) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
    return;
  }
  Object.assign(company, parsed.data, { updatedAt: new Date().toISOString() });
  saveDb();
  logActivity({
    companyId: company.id,
    userId: req.user!.userId,
    userName: getUserDisplayName(req.user!.userId),
    action: 'company.updated',
    entityType: 'company',
    entityId: company.id,
    description: `Updated company profile & compliance settings`,
  });
  res.json({ success: true, data: company });
});

app.post(
  '/api/company/logo',
  requireAuth,
  logoUpload.single('logo'),
  (req: AuthRequest, res) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Please upload a PNG, JPG, or WebP logo file' },
      });
      return;
    }
    const db = getDb();
    const company = db.companies.find((c) => c.id === req.user!.companyId);
    if (!company) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
      return;
    }
    company.logoUrl = `/api/uploads/${req.file.filename}`;
    company.updatedAt = new Date().toISOString();
    saveDb();
    res.json({ success: true, data: { logoUrl: company.logoUrl } });
  }
);

app.delete('/api/company/logo', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const company = db.companies.find((c) => c.id === req.user!.companyId);
  if (!company) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
    return;
  }
  if (company.logoUrl) {
    const filename = path.basename(company.logoUrl);
    const resolved = path.resolve(UPLOADS_DIR, filename);
    if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
  }
  company.logoUrl = null;
  company.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ success: true, data: { logoUrl: null } });
});

// ==================== CLIENTS ROUTES ====================

app.get('/api/clients', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const search = String(req.query.search || '').trim().toLowerCase();
  const statusFilter = String(req.query.status || 'active');

  let items = db.clients.filter((c) => c.companyId === req.user!.companyId);
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
  res.json({ success: true, data: enriched, total: enriched.length });
});

app.get('/api/clients/:id', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const client = db.clients.find(
    (c) => c.id === req.params.id && c.companyId === req.user!.companyId
  );
  if (!client) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } });
    return;
  }
  refreshOverdueStatuses(req.user!.companyId);
  const invoices = db.invoices
    .filter((i) => i.companyId === req.user!.companyId && i.clientId === client.id)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const creditNotes = db.creditNotes
    .filter((cn) => cn.companyId === req.user!.companyId && cn.clientId === client.id)
    .map((cn) => ({
      ...cn,
      invoiceNumber: db.invoices.find((i) => i.id === cn.invoiceId)?.invoiceNumber,
    }));
  const invoiceIds = new Set(invoices.map((i) => i.id));
  const activities = db.activities
    .filter(
      (a) =>
        a.companyId === req.user!.companyId &&
        (a.entityId === client.id || (a.invoiceId && invoiceIds.has(a.invoiceId)))
    )
    .slice(0, 30);

  res.json({
    success: true,
    data: {
      client: enrichClientStats(client),
      invoices,
      creditNotes,
      activities,
    },
  });
});

app.post('/api/clients', requireAuth, (req: AuthRequest, res) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }
  const db = getDb();
  const now = new Date().toISOString();
  const client: Client = {
    id: generateId('cli'),
    ...parsed.data,
    companyId: req.user!.companyId,
    createdAt: now,
    updatedAt: now,
  };
  db.clients.push(client);
  saveDb();

  logActivity({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    userName: getUserDisplayName(req.user!.userId),
    action: 'client.created',
    entityType: 'client',
    entityId: client.id,
    description: `New client added: ${client.nameEn}`,
  });

  res.status(201).json({ success: true, data: enrichClientStats(client) });
});

app.put('/api/clients/:id', requireAuth, (req: AuthRequest, res) => {
  const parsed = clientSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }
  const db = getDb();
  const client = db.clients.find(
    (c) => c.id === req.params.id && c.companyId === req.user!.companyId
  );
  if (!client) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } });
    return;
  }
  Object.assign(client, parsed.data, { updatedAt: new Date().toISOString() });
  saveDb();
  res.json({ success: true, data: enrichClientStats(client) });
});

app.delete('/api/clients/:id', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const client = db.clients.find(
    (c) => c.id === req.params.id && c.companyId === req.user!.companyId
  );
  if (!client) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } });
    return;
  }
  client.isActive = false;
  client.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ success: true, data: { id: client.id, isActive: false } });
});

// ==================== PRODUCTS ROUTES ====================

app.get('/api/products', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const search = String(req.query.search || '').trim().toLowerCase();
  let items = db.products.filter((p) => p.companyId === req.user!.companyId);
  if (search) {
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.description && p.description.toLowerCase().includes(search))
    );
  }
  res.json({ success: true, data: items, total: items.length });
});

app.post('/api/products', requireAuth, (req: AuthRequest, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }
  const db = getDb();
  const now = new Date().toISOString();
  const product = {
    id: generateId('prd'),
    ...parsed.data,
    vatRate: getVatRateForCategory(parsed.data.vatCategory),
    companyId: req.user!.companyId,
    createdAt: now,
    updatedAt: now,
  };
  db.products.push(product);
  saveDb();
  res.status(201).json({ success: true, data: product });
});

app.put('/api/products/:id', requireAuth, (req: AuthRequest, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }
  const db = getDb();
  const product = db.products.find(
    (p) => p.id === req.params.id && p.companyId === req.user!.companyId
  );
  if (!product) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return;
  }
  Object.assign(product, parsed.data, {
    vatRate: parsed.data.vatCategory
      ? getVatRateForCategory(parsed.data.vatCategory)
      : product.vatRate,
    updatedAt: new Date().toISOString(),
  });
  saveDb();
  res.json({ success: true, data: product });
});

app.delete('/api/products/:id', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const product = db.products.find(
    (p) => p.id === req.params.id && p.companyId === req.user!.companyId
  );
  if (!product) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return;
  }
  product.isActive = false;
  product.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ success: true, data: { id: product.id, isActive: false } });
});

// ==================== INVOICES ROUTES ====================

app.get('/api/invoices/next-number', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const company = db.companies.find((c) => c.id === req.user!.companyId);
  if (!company) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
    return;
  }
  res.json({
    success: true,
    data: {
      nextNumber: formatInvoiceNumber(company.invoicePrefix, company.invoiceNextNumber),
      prefix: company.invoicePrefix,
      sequence: company.invoiceNextNumber,
    },
  });
});

app.get('/api/invoices', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  refreshOverdueStatuses(companyId);

  const status = String(req.query.status || 'ALL').toUpperCase();
  const search = String(req.query.search || '').trim().toLowerCase();
  const fromDate = String(req.query.from || '');
  const toDate = String(req.query.to || '');
  const sort = String(req.query.sort || 'newest');
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

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

  if (status !== 'ALL') {
    list = list.filter((i) => i.status === status);
  }
  if (fromDate) {
    list = list.filter((i) => i.issueDate >= fromDate);
  }
  if (toDate) {
    list = list.filter((i) => i.issueDate <= toDate);
  }
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
      list.sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.invoiceNumber.localeCompare(a.invoiceNumber));
  }

  const total = list.length;
  const start = (page - 1) * limit;
  const paginated = list.slice(start, start + limit);

  res.json({
    success: true,
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

app.get('/api/invoices/:id', requireAuth, async (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  refreshOverdueStatuses(companyId);

  const invoice = db.invoices.find(
    (i) => i.id === req.params.id && i.companyId === companyId
  );
  if (!invoice) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    return;
  }

  const company = db.companies.find((c) => c.id === companyId)!;
  const client = db.clients.find((c) => c.id === invoice.clientId) || null;
  const qrPayload = invoice.qrCodeData || buildFtaQrPayload(company, invoice);
  const qrCodeImage = await generateFtaQrCodeImage(qrPayload);
  const companyInvNumbers = db.invoices
    .filter((i) => i.companyId === companyId)
    .map((i) => i.invoiceNumber);
  const validation = validateInvoiceForFta(invoice, company, client, companyInvNumbers);

  const activities = db.activities.filter(
    (a) => a.companyId === companyId && a.invoiceId === invoice.id
  );
  const linkedCreditNotes = db.creditNotes.filter(
    (cn) => cn.companyId === companyId && cn.invoiceId === invoice.id
  );

  res.json({
    success: true,
    data: {
      invoice: {
        ...invoice,
        qrCodeData: qrPayload,
        qrCodeImage,
        client: client || undefined,
        company,
        createdByName: getUserDisplayName(invoice.createdById),
      },
      validation,
      activities,
      creditNotes: linkedCreditNotes,
    },
  });
});

app.post('/api/invoices', requireAuth, (req: AuthRequest, res) => {
  const parsed = invoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }

  const db = getDb();
  const companyId = req.user!.companyId;
  const company = db.companies.find((c) => c.id === companyId);
  if (!company) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
    return;
  }

  const client = db.clients.find(
    (c) => c.id === parsed.data.clientId && c.companyId === companyId
  );
  if (!client) {
    res.status(400).json({ success: false, error: { code: 'INVALID_CLIENT', message: 'Selected client not found' } });
    return;
  }

  const invoiceNumber =
    parsed.data.invoiceNumber?.trim() ||
    formatInvoiceNumber(company.invoicePrefix, company.invoiceNextNumber);

  if (
    db.invoices.some(
      (i) => i.companyId === companyId && i.invoiceNumber === invoiceNumber
    )
  ) {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_NUMBER',
        message: `Invoice number ${invoiceNumber} already exists`,
      },
    });
    return;
  }

  const calc = calculateInvoiceTotals(parsed.data.lineItems);
  const id = generateId('inv');
  const now = new Date().toISOString();

  const lineItems: InvoiceLineItem[] = parsed.data.lineItems.map((it, idx) => ({
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
    invoiceId: id,
  }));

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
    createdById: req.user!.userId,
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
    userId: req.user!.userId,
    userName: getUserDisplayName(req.user!.userId),
    action: 'invoice.created',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Invoice ${invoice.invoiceNumber} created for ${client.nameEn}`,
  });

  res.status(201).json({ success: true, data: { ...invoice, client } });
});

app.put('/api/invoices/:id', requireAuth, (req: AuthRequest, res) => {
  const parsed = invoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }
  const db = getDb();
  const companyId = req.user!.companyId;
  const company = db.companies.find((c) => c.id === companyId)!;
  const invoice = db.invoices.find(
    (i) => i.id === req.params.id && i.companyId === companyId
  );
  if (!invoice) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    return;
  }
  if (['PAID', 'VOID', 'CANCELLED'].includes(invoice.status)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'TERMINAL_STATUS',
        message: `Cannot edit an invoice with status ${invoice.status}`,
      },
    });
    return;
  }

  const calc = calculateInvoiceTotals(parsed.data.lineItems);
  const lineItems: InvoiceLineItem[] = parsed.data.lineItems.map((it, idx) => ({
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
    invoiceId: invoice.id,
  }));

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
    userId: req.user!.userId,
    userName: getUserDisplayName(req.user!.userId),
    action: 'invoice.updated',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Invoice ${invoice.invoiceNumber} updated`,
  });

  res.json({ success: true, data: invoice });
});

app.delete('/api/invoices/:id', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const idx = db.invoices.findIndex(
    (i) => i.id === req.params.id && i.companyId === req.user!.companyId
  );
  if (idx === -1) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    return;
  }
  if (db.invoices[idx].status !== 'DRAFT') {
    res.status(400).json({
      success: false,
      error: {
        code: 'DELETE_RESTRICTED',
        message: 'Only DRAFT invoices can be deleted. Use Void for issued invoices.',
      },
    });
    return;
  }
  const [removed] = db.invoices.splice(idx, 1);
  saveDb();
  res.json({ success: true, data: { id: removed.id } });
});

app.post('/api/invoices/:id/validate', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  const invoice = db.invoices.find(
    (i) => i.id === req.params.id && i.companyId === companyId
  );
  if (!invoice) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    return;
  }
  const company = db.companies.find((c) => c.id === companyId)!;
  const client = db.clients.find((c) => c.id === invoice.clientId) || null;
  const numbers = db.invoices
    .filter((i) => i.companyId === companyId)
    .map((i) => i.invoiceNumber);
  const validation = validateInvoiceForFta(invoice, company, client, numbers);
  res.json({ success: true, data: validation });
});

app.post('/api/invoices/:id/send', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  const invoice = db.invoices.find(
    (i) => i.id === req.params.id && i.companyId === companyId
  );
  if (!invoice) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    return;
  }
  if (['VOID', 'CANCELLED'].includes(invoice.status)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_TRANSITION', message: 'Cannot send a void or cancelled invoice' },
    });
    return;
  }

  const company = db.companies.find((c) => c.id === companyId)!;
  const client = db.clients.find((c) => c.id === invoice.clientId) || null;
  const numbers = db.invoices
    .filter((i) => i.companyId === companyId)
    .map((i) => i.invoiceNumber);
  const validation = validateInvoiceForFta(invoice, company, client, numbers);

  if (!validation.valid) {
    res.status(422).json({
      success: false,
      error: {
        code: 'FTA_VALIDATION_FAILED',
        message: `FTA compliance check failed (${validation.errors.length} issue${validation.errors.length === 1 ? '' : 's'} found)`,
        details: validation.errors,
      },
    });
    return;
  }

  const now = new Date().toISOString();
  if (invoice.status === 'DRAFT') {
    invoice.status = 'SENT';
  }
  invoice.sentAt = now;
  invoice.qrCodeData = buildFtaQrPayload(company, invoice);
  invoice.updatedAt = now;
  saveDb();

  logActivity({
    companyId,
    userId: req.user!.userId,
    userName: getUserDisplayName(req.user!.userId),
    action: 'invoice.sent',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Invoice ${invoice.invoiceNumber} sent to ${client?.nameEn || 'client'}${client?.email ? ` (${client.email})` : ''}`,
  });

  res.json({ success: true, data: invoice });
});

app.post('/api/invoices/:id/payment', requireAuth, (req: AuthRequest, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }
  const db = getDb();
  const companyId = req.user!.companyId;
  const invoice = db.invoices.find(
    (i) => i.id === req.params.id && i.companyId === companyId
  );
  if (!invoice) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    return;
  }
  if (['PAID', 'VOID', 'CANCELLED'].includes(invoice.status)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Cannot record payment on this invoice' },
    });
    return;
  }
  if (parsed.data.amount > invoice.amountDue + 0.01) {
    res.status(400).json({
      success: false,
      error: {
        code: 'EXCEEDS_BALANCE',
        message: `Payment amount exceeds remaining balance (${invoice.currency} ${invoice.amountDue.toFixed(2)})`,
      },
    });
    return;
  }

  const recordedBy = getUserDisplayName(req.user!.userId);
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
    userId: req.user!.userId,
    userName: recordedBy,
    action: 'payment.recorded',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Payment of ${invoice.currency} ${parsed.data.amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })} recorded for ${invoice.invoiceNumber}`,
  });

  res.json({ success: true, data: invoice });
});

app.post('/api/invoices/:id/void', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  const invoice = db.invoices.find(
    (i) => i.id === req.params.id && i.companyId === companyId
  );
  if (!invoice) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    return;
  }
  if (['PAID', 'VOID', 'CANCELLED'].includes(invoice.status)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_TRANSITION', message: `Cannot void an invoice in ${invoice.status} state` },
    });
    return;
  }
  invoice.status = invoice.status === 'DRAFT' ? 'CANCELLED' : 'VOID';
  invoice.amountDue = 0;
  invoice.updatedAt = new Date().toISOString();
  saveDb();

  logActivity({
    companyId,
    userId: req.user!.userId,
    userName: getUserDisplayName(req.user!.userId),
    action: 'invoice.voided',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Invoice ${invoice.invoiceNumber} marked as ${invoice.status}`,
  });

  res.json({ success: true, data: invoice });
});

app.post('/api/invoices/:id/duplicate', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  const company = db.companies.find((c) => c.id === companyId)!;
  const original = db.invoices.find(
    (i) => i.id === req.params.id && i.companyId === companyId
  );
  if (!original) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    return;
  }

  const now = new Date();
  const newId = generateId('inv');
  const invoiceNumber = formatInvoiceNumber(
    company.invoicePrefix,
    company.invoiceNextNumber
  );
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
    createdById: req.user!.userId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lineItems: original.lineItems.map((li) => ({
      ...li,
      id: generateId('ili'),
      invoiceId: newId,
    })),
  };
  clone.qrCodeData = buildFtaQrPayload(company, clone);
  db.invoices.unshift(clone);
  saveDb();

  res.status(201).json({ success: true, data: clone });
});

app.get('/api/invoices/:id/xml', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  const invoice = db.invoices.find(
    (i) => i.id === req.params.id && i.companyId === companyId
  );
  if (!invoice) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    return;
  }
  const company = db.companies.find((c) => c.id === companyId)!;
  const client = db.clients.find((c) => c.id === invoice.clientId);
  if (!client) {
    res.status(400).json({ success: false, error: { code: 'MISSING_CLIENT', message: 'Client record required for XML generation' } });
    return;
  }

  const xml = generatePintAeXml(invoice, company, client);
  invoice.xmlGenerated = true;
  invoice.xmlGeneratedAt = new Date().toISOString();
  saveDb();

  logActivity({
    companyId,
    userId: req.user!.userId,
    userName: getUserDisplayName(req.user!.userId),
    action: 'invoice.xml_generated',
    entityType: 'invoice',
    entityId: invoice.id,
    invoiceId: invoice.id,
    description: `Generated PINT-AE UBL 2.1 XML for ${invoice.invoiceNumber}`,
  });

  if (req.query.format === 'json') {
    res.json({ success: true, data: { xml, filename: `${invoice.invoiceNumber}-PINT-AE.xml` } });
    return;
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${invoice.invoiceNumber}-PINT-AE.xml"`
  );
  res.send(xml);
});

// ==================== CREDIT NOTES ROUTES ====================

app.get('/api/credit-notes', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
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

  res.json({ success: true, data: list });
});

app.post('/api/credit-notes', requireAuth, (req: AuthRequest, res) => {
  const parsed = creditNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }

  const db = getDb();
  const companyId = req.user!.companyId;
  const company = db.companies.find((c) => c.id === companyId)!;
  const invoice = db.invoices.find(
    (i) => i.id === parsed.data.invoiceId && i.companyId === companyId
  );
  if (!invoice) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Linked invoice not found' } });
    return;
  }

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
    res.status(400).json({
      success: false,
      error: {
        code: 'EXCEEDS_INVOICE',
        message: `Credit note total (${invoice.currency} ${grandTotal.toFixed(2)}) cannot exceed original invoice total (${invoice.currency} ${invoice.grandTotal.toFixed(2)})`,
      },
    });
    return;
  }

  const creditNoteNumber = formatInvoiceNumber(
    company.creditNotePrefix,
    company.creditNoteNextNum
  );
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
    userId: req.user!.userId,
    userName: getUserDisplayName(req.user!.userId),
    action: 'credit_note.created',
    entityType: 'credit_note',
    entityId: cn.id,
    invoiceId: invoice.id,
    description: `Credit note ${cn.creditNoteNumber} created against ${invoice.invoiceNumber}`,
  });

  res.status(201).json({ success: true, data: cn });
});

app.post('/api/credit-notes/:id/issue', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  const cn = db.creditNotes.find(
    (c) => c.id === req.params.id && c.companyId === companyId
  );
  if (!cn) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Credit note not found' } });
    return;
  }
  if (cn.status !== 'DRAFT') {
    res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Credit note is already issued or void' } });
    return;
  }

  cn.status = 'ISSUED';
  cn.updatedAt = new Date().toISOString();

  // Adjust linked invoice outstanding amount
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
    userId: req.user!.userId,
    userName: getUserDisplayName(req.user!.userId),
    action: 'credit_note.issued',
    entityType: 'credit_note',
    entityId: cn.id,
    invoiceId: cn.invoiceId,
    description: `Credit note ${cn.creditNoteNumber} issued (${cn.grandTotal.toFixed(2)} AED)`,
  });

  res.json({ success: true, data: cn });
});

app.delete('/api/credit-notes/:id', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const idx = db.creditNotes.findIndex(
    (c) => c.id === req.params.id && c.companyId === req.user!.companyId
  );
  if (idx === -1) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Credit note not found' } });
    return;
  }
  if (db.creditNotes[idx].status !== 'DRAFT') {
    res.status(400).json({ success: false, error: { code: 'DELETE_RESTRICTED', message: 'Only draft credit notes can be deleted' } });
    return;
  }
  const [removed] = db.creditNotes.splice(idx, 1);
  saveDb();
  res.json({ success: true, data: { id: removed.id } });
});

// ==================== REPORTS & DASHBOARD ROUTES ====================

app.get('/api/reports/dashboard', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  refreshOverdueStatuses(companyId);

  const now = new Date();
  const lastMonthDate = subMonths(now, 1);
  const clientMap = new Map(
    db.clients.filter((c) => c.companyId === companyId).map((c) => [c.id, c])
  );

  const activeInvoices = db.invoices.filter(
    (i) => i.companyId === companyId && !['VOID', 'CANCELLED'].includes(i.status)
  );

  const thisMonthInvoices = activeInvoices.filter((i) =>
    isSameMonth(parseISO(i.issueDate), now)
  );
  const lastMonthInvoices = activeInvoices.filter((i) =>
    isSameMonth(parseISO(i.issueDate), lastMonthDate)
  );

  const totalRevenueThisMonth = roundMoney(
    thisMonthInvoices.reduce((s, i) => s + i.grandTotal, 0)
  );
  const totalRevenueLastMonth = roundMoney(
    lastMonthInvoices.reduce((s, i) => s + i.grandTotal, 0)
  );
  const revenueChangePercent =
    totalRevenueLastMonth > 0
      ? Math.round(
          ((totalRevenueThisMonth - totalRevenueLastMonth) / totalRevenueLastMonth) * 100
        )
      : totalRevenueThisMonth > 0
        ? 100
        : 0;

  const unpaid = activeInvoices.filter(
    (i) => i.amountDue > 0 && i.status !== 'DRAFT'
  );
  const totalOutstanding = roundMoney(unpaid.reduce((s, i) => s + i.amountDue, 0));

  const overdueList = activeInvoices.filter((i) => i.status === 'OVERDUE');
  const overdueAmount = roundMoney(overdueList.reduce((s, i) => s + i.amountDue, 0));

  // Monthly series for last 6 months
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

  // Weekly series for last 6 weeks
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

  // Quarter series (last 4 quarters)
  const quarterSeries = [
    {
      label: 'Q-3',
      revenue: roundMoney(monthSeries.slice(0, 2).reduce((s, x) => s + x.revenue, 0)),
      vat: roundMoney(monthSeries.slice(0, 2).reduce((s, x) => s + x.vat, 0)),
    },
    {
      label: 'Q-2',
      revenue: roundMoney(monthSeries.slice(2, 4).reduce((s, x) => s + x.revenue, 0)),
      vat: roundMoney(monthSeries.slice(2, 4).reduce((s, x) => s + x.vat, 0)),
    },
    {
      label: 'Current Q',
      revenue: roundMoney(monthSeries.slice(4, 6).reduce((s, x) => s + x.revenue, 0)),
      vat: roundMoney(monthSeries.slice(4, 6).reduce((s, x) => s + x.vat, 0)),
    },
  ];

  const outstandingInvoices = unpaid
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)
    .map((i) => ({ ...i, client: clientMap.get(i.clientId) }));

  const recentActivities = db.activities
    .filter((a) => a.companyId === companyId)
    .slice(0, 8);

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
    recentActivities,
    outstandingInvoices,
  };

  res.json({ success: true, data: summary });
});

app.get('/api/reports/revenue', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  const period = String(req.query.period || 'year');
  const now = new Date();
  const monthsBack = period === 'month' ? 1 : period === 'quarter' ? 3 : 6;

  const activeInvoices = db.invoices.filter(
    (i) => i.companyId === companyId && !['VOID', 'CANCELLED'].includes(i.status)
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

  res.json({
    success: true,
    data: {
      totals: {
        grossRevenue: roundMoney(breakdown.reduce((s, r) => s + r.grossRevenue, 0)),
        vatCollected: roundMoney(breakdown.reduce((s, r) => s + r.vatCollected, 0)),
        netRevenue: roundMoney(breakdown.reduce((s, r) => s + r.netRevenue, 0)),
        collected: roundMoney(breakdown.reduce((s, r) => s + r.collected, 0)),
      },
      breakdown,
    },
  });
});

app.get('/api/reports/vat-summary', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  const period = String(req.query.period || 'quarter');
  const now = new Date();
  const cutoff = period === 'month' ? subMonths(now, 1) : subMonths(now, 3);

  const invoices = db.invoices.filter(
    (i) =>
      i.companyId === companyId &&
      !['DRAFT', 'VOID', 'CANCELLED'].includes(i.status) &&
      parseISO(i.issueDate) >= cutoff
  );

  const issuedCreditNotes = db.creditNotes.filter(
    (cn) =>
      cn.companyId === companyId &&
      cn.status === 'ISSUED' &&
      parseISO(cn.issueDate) >= cutoff
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

  const creditNoteVatAdjustment = roundMoney(
    issuedCreditNotes.reduce((s, cn) => s + cn.totalVat, 0)
  );
  const grossOutputVat = roundMoney(
    Object.values(categoryTotals).reduce((s, b) => s + b.vatAmount, 0)
  );
  const outputVat = roundMoney(Math.max(0, grossOutputVat - creditNoteVatAdjustment));

  res.json({
    success: true,
    data: {
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
    },
  });
});

app.get('/api/reports/aging', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  refreshOverdueStatuses(companyId);

  const now = new Date();
  const clients = db.clients.filter((c) => c.companyId === companyId);

  const rows = clients
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
        else if (overdueDays <= 30)
          buckets.days1to30 = roundMoney(buckets.days1to30 + inv.amountDue);
        else if (overdueDays <= 60)
          buckets.days31to60 = roundMoney(buckets.days31to60 + inv.amountDue);
        else if (overdueDays <= 90)
          buckets.days61to90 = roundMoney(buckets.days61to90 + inv.amountDue);
        else buckets.days90plus = roundMoney(buckets.days90plus + inv.amountDue);
        buckets.total = roundMoney(buckets.total + inv.amountDue);
      }
      return buckets;
    })
    .filter((r) => r.total > 0);

  const summary = {
    current: roundMoney(rows.reduce((s, r) => s + r.current, 0)),
    days1to30: roundMoney(rows.reduce((s, r) => s + r.days1to30, 0)),
    days31to60: roundMoney(rows.reduce((s, r) => s + r.days31to60, 0)),
    days61to90: roundMoney(rows.reduce((s, r) => s + r.days61to90, 0)),
    days90plus: roundMoney(rows.reduce((s, r) => s + r.days90plus, 0)),
    total: roundMoney(rows.reduce((s, r) => s + r.total, 0)),
  };

  res.json({ success: true, data: { summary, rows } });
});

app.get('/api/reports/top-clients', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const companyId = req.user!.companyId;
  const clients = db.clients
    .filter((c) => c.companyId === companyId)
    .map(enrichClientStats)
    .sort((a, b) => (b.totalBilled || 0) - (a.totalBilled || 0))
    .slice(0, 10);

  res.json({ success: true, data: clients });
});

// ==================== ACTIVITIES & TEAM ROUTES ====================

app.get('/api/activities', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const items = db.activities
    .filter((a) => a.companyId === req.user!.companyId)
    .slice(0, 50);
  res.json({ success: true, data: items });
});

app.get('/api/team', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const members = db.users
    .filter((u) => u.companyId === req.user!.companyId && u.isActive)
    .map(stripPassword);
  res.json({ success: true, data: members });
});

app.post('/api/team/invite', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().optional().default(''),
    email: z.string().trim().email('Valid email required'),
    role: z.enum(['ADMIN', 'ACCOUNTANT', 'VIEWER']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }

  const db = getDb();
  if (
    db.users.some(
      (u) => u.email.toLowerCase() === parsed.data.email.toLowerCase() && u.isActive
    )
  ) {
    res.status(409).json({
      success: false,
      error: { code: 'EMAIL_EXISTS', message: 'A user with this email already exists' },
    });
    return;
  }

  const now = new Date().toISOString();
  const tempPasswordHash = await hashPassword(crypto.randomBytes(16).toString('hex'));
  const member = {
    id: generateId('usr'),
    email: parsed.data.email.toLowerCase(),
    passwordHash: tempPasswordHash,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    role: parsed.data.role as UserRole,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    companyId: req.user!.companyId,
  };
  db.users.push(member);
  saveDb();

  logActivity({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    userName: getUserDisplayName(req.user!.userId),
    action: 'team.invited',
    entityType: 'user',
    entityId: member.id,
    description: `Invited ${member.firstName} ${member.lastName} (${member.role})`,
  });

  res.status(201).json({ success: true, data: stripPassword(member) });
});

app.put('/api/team/:id/role', requireAuth, (req: AuthRequest, res) => {
  const schema = z.object({ role: z.enum(['ADMIN', 'ACCOUNTANT', 'VIEWER']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(formatZodError(parsed.error));
    return;
  }
  const db = getDb();
  const member = db.users.find(
    (u) => u.id === req.params.id && u.companyId === req.user!.companyId
  );
  if (!member) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
    return;
  }
  if (member.role === 'OWNER') {
    res.status(400).json({ success: false, error: { code: 'OWNER_PROTECTED', message: 'Cannot change the Owner role' } });
    return;
  }
  member.role = parsed.data.role;
  member.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ success: true, data: stripPassword(member) });
});

app.delete('/api/team/:id', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const member = db.users.find(
    (u) => u.id === req.params.id && u.companyId === req.user!.companyId
  );
  if (!member) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
    return;
  }
  if (member.role === 'OWNER' || member.id === req.user!.userId) {
    res.status(400).json({
      success: false,
      error: { code: 'CANNOT_REMOVE', message: 'Cannot remove the workspace owner or yourself' },
    });
    return;
  }
  member.isActive = false;
  member.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ success: true, data: { id: member.id } });
});

// Global API error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled API error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An unexpected server error occurred',
      },
    });
  }
);

async function startServer() {
  // Initialize DB lazily on startup (file-backed, no external connection)
  getDb();

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    // This process serves the real API, so point the frontend at it rather than
    // the in-browser mock (src/services/mockApi.ts) unless explicitly overridden.
    process.env.VITE_USE_MOCK_API ??= 'false';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fatoora server running on http://localhost:${PORT} (listening on all interfaces)`);
  });
}

startServer();
