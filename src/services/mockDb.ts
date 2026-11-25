// ---------------------------------------------------------------------------
// Browser mock database persisted to localStorage.
//
// Mirrors the helper surface of server/db.ts (getDb / saveDb / logActivity /
// refreshOverdueStatuses / ...) so the handlers in mockApi.ts can stay a close
// port of server.ts. Seed data comes from server/seed.ts, the same builder the
// Express server uses, so both modes start from identical demo data.
// ---------------------------------------------------------------------------

import { format } from 'date-fns';
import type { Activity, User } from '../../shared/types.ts';
import {
  buildSeedState,
  DEMO_PASSWORD,
  formatInvoiceNumber,
  type DatabaseState,
  type StoredUser,
} from '../../server/seed.ts';

export { formatInvoiceNumber, DEMO_PASSWORD };
export type { DatabaseState, StoredUser };

// Bump the version suffix whenever the seed or stored shape changes so that
// existing browsers re-seed instead of loading incompatible data.
const LS_KEY = 'fatoora-mock-db-v1';

let cachedState: DatabaseState | null = null;

// ── Helpers ────────────────────────────────────────────────────────────────

export function generateId(prefix: string): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

export function stripPassword(user: StoredUser): User {
  const { passwordHash: _removed, ...safe } = user;
  return safe;
}

/**
 * Hashes a password for the mock store. This is a demo running entirely in the
 * browser, so this only avoids keeping plaintext in localStorage; it is not a
 * security boundary.
 */
export async function hashPassword(password: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${hex}`;
  }
  // Non-secure contexts (plain http on a LAN IP) have no SubtleCrypto.
  return `plain:${password}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('plain:')) return hash === `plain:${password}`;
  return (await hashPassword(password)) === hash;
}

// ── Persistence ────────────────────────────────────────────────────────────

/** Loads (or seeds) the database. Must be awaited once before getDb(). */
export async function ensureDb(): Promise<DatabaseState> {
  if (cachedState) return cachedState;

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      cachedState = JSON.parse(raw) as DatabaseState;
      return cachedState;
    }
  } catch (err) {
    console.warn('[mock-api] Stored demo data is unreadable; re-seeding.', err);
  }

  cachedState = buildSeedState(await hashPassword(DEMO_PASSWORD));
  saveDb();
  return cachedState;
}

export function getDb(): DatabaseState {
  if (!cachedState) {
    throw new Error('Mock database not loaded; call ensureDb() first');
  }
  return cachedState;
}

/** Persists to localStorage. Returns false if the write failed (usually quota). */
export function saveDb(): boolean {
  if (!cachedState) return false;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cachedState));
    return true;
  } catch (err) {
    // Most likely the ~5MB quota. Changes stay in memory for this tab.
    console.warn('[mock-api] Could not persist demo data to localStorage.', err);
    return false;
  }
}

/** Wipes stored demo data; the next request re-seeds from server/seed.ts. */
export function resetMockDb(): void {
  cachedState = null;
  localStorage.removeItem(LS_KEY);
}

// ── Domain helpers (ported from server/db.ts) ───────────────────────────────

/** Moves SENT / PARTIALLY_PAID invoices past their due date to OVERDUE. */
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
