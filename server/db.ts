import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { format } from 'date-fns';
import type { Activity, User } from '../shared/types.ts';
import {
  buildSeedState,
  DEMO_PASSWORD,
  formatInvoiceNumber,
  type DatabaseState,
  type StoredUser,
} from './seed.ts';

export { formatInvoiceNumber };
export type { DatabaseState, StoredUser };

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'fatoora-db.json');

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export function stripPassword(user: StoredUser): User {
  const { passwordHash: _removed, ...safe } = user;
  return safe;
}

let cachedState: DatabaseState | null = null;

export function getDb(): DatabaseState {
  if (cachedState) {
    return cachedState;
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cachedState = JSON.parse(raw) as DatabaseState;
      return cachedState;
    }
  } catch (err) {
    console.error('Failed to read existing database file, recreating seed state:', err);
  }
  cachedState = buildSeedState(bcrypt.hashSync(DEMO_PASSWORD, 10));
  saveDb();
  return cachedState;
}

export function saveDb(): void {
  if (!cachedState) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(cachedState, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

/**
 * Automatically transitions SENT / PARTIALLY_PAID invoices whose due date has passed to OVERDUE.
 */
export function refreshOverdueStatuses(companyId: string): boolean {
  const db = getDb();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  let changed = false;

  for (const inv of db.invoices) {
    if (inv.companyId !== companyId) continue;
    if (
      (inv.status === 'SENT' || inv.status === 'PARTIALLY_PAID') &&
      inv.dueDate < todayStr &&
      inv.amountDue > 0
    ) {
      inv.status = 'OVERDUE';
      inv.updatedAt = new Date().toISOString();
      changed = true;
    }
  }

  if (changed) saveDb();
  return changed;
}

export function logActivity(params: {
  companyId: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  invoiceId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Activity {
  const db = getDb();
  const act: Activity = {
    id: generateId('act'),
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata || null,
    companyId: params.companyId,
    userId: params.userId || null,
    userName: params.userName || null,
    invoiceId: params.invoiceId || null,
    createdAt: new Date().toISOString(),
  };
  db.activities.unshift(act);
  if (db.activities.length > 500) {
    db.activities.length = 500;
  }
  saveDb();
  return act;
}
