/**
 * Controles de segurança da autenticação.
 * Server-only: rate limiting, tokens de recuperação e auditoria mínima.
 */
import { getRequest } from "@tanstack/react-start/server";
import { execute, queryOne, nowIso } from "@/lib/turso/client.server";
import { sha256 } from "./password.server";

let schemaReady = false;

export async function ensureAuthSecuritySchema() {
  if (schemaReady) return;

  await execute(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at    TEXT,
      created_at TEXT NOT NULL
    )
  `);
  await execute(
    "CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id)",
  );
  await execute(
    "CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at)",
  );

  await execute(`
    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      action            TEXT NOT NULL,
      identity_hash     TEXT NOT NULL,
      window_started_at TEXT NOT NULL,
      attempts          INTEGER NOT NULL DEFAULT 0,
      blocked_until     TEXT,
      updated_at        TEXT NOT NULL,
      PRIMARY KEY (action, identity_hash)
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS auth_security_events (
      id         TEXT PRIMARY KEY,
      user_id    TEXT,
      event_type TEXT NOT NULL,
      ip_hash    TEXT,
      created_at TEXT NOT NULL
    )
  `);
  await execute(
    "CREATE INDEX IF NOT EXISTS idx_auth_events_user ON auth_security_events(user_id, created_at)",
  );

  schemaReady = true;
}

export function getClientIp(): string | null {
  const request = getRequest();
  if (!request?.headers) return null;

  const forwarded = request.headers.get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    forwarded ||
    request.headers.get("x-real-ip")?.trim() ||
    null
  );
}

export async function consumeRateLimit({
  action,
  identity,
  maxAttempts,
  windowMinutes,
  blockMinutes,
}: {
  action: string;
  identity: string;
  maxAttempts: number;
  windowMinutes: number;
  blockMinutes: number;
}): Promise<boolean> {
  await ensureAuthSecuritySchema();

  const key = await sha256(identity.trim().toLowerCase());
  const now = new Date();
  const nowText = now.toISOString();
  const row = await queryOne<{
    window_started_at: string;
    attempts: number;
    blocked_until: string | null;
  }>(
    `SELECT window_started_at, attempts, blocked_until
       FROM auth_rate_limits
      WHERE action = ? AND identity_hash = ?`,
    [action, key],
  );

  if (row?.blocked_until && new Date(row.blocked_until).getTime() > now.getTime()) {
    return false;
  }

  const windowMs = windowMinutes * 60_000;
  const windowExpired =
    !row || now.getTime() - new Date(row.window_started_at).getTime() >= windowMs;
  const attempts = windowExpired ? 1 : Number(row.attempts) + 1;
  const windowStart = windowExpired ? nowText : row!.window_started_at;
  const blockedUntil =
    attempts > maxAttempts
      ? new Date(now.getTime() + blockMinutes * 60_000).toISOString()
      : null;

  await execute(
    `INSERT INTO auth_rate_limits
       (action, identity_hash, window_started_at, attempts, blocked_until, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(action, identity_hash) DO UPDATE SET
       window_started_at = excluded.window_started_at,
       attempts = excluded.attempts,
       blocked_until = excluded.blocked_until,
       updated_at = excluded.updated_at`,
    [action, key, windowStart, attempts, blockedUntil, nowText],
  );

  return !blockedUntil;
}

export async function clearRateLimit(action: string, identity: string) {
  const key = await sha256(identity.trim().toLowerCase());
  await execute(
    "DELETE FROM auth_rate_limits WHERE action = ? AND identity_hash = ?",
    [action, key],
  );
}

export async function recordSecurityEvent(
  eventType: string,
  userId?: string | null,
) {
  await ensureAuthSecuritySchema();
  const ip = getClientIp();
  const ipHash = ip ? await sha256(ip) : null;
  await execute(
    `INSERT INTO auth_security_events (id, user_id, event_type, ip_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), userId ?? null, eventType, ipHash, nowIso()],
  );
}

export async function purgeExpiredResetTokens() {
  await ensureAuthSecuritySchema();
  await execute(
    `DELETE FROM password_reset_tokens
      WHERE expires_at < ? OR (used_at IS NOT NULL AND used_at < ?)`,
    [
      nowIso(),
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    ],
  );
}
