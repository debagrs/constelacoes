/**
 * Sessões próprias em cookie httpOnly, persistidas no Turso.
 * A curadoria falha fechada: exige e-mail explicitamente autorizado,
 * e-mail verificado e papel admin/curador gravado no banco.
 */
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { execute, queryOne, nowIso } from "@/lib/turso/client.server";
import { randomToken, sha256 } from "./password.server";

export const SESSION_COOKIE = "__Host-atlas_session";
const SESSION_DAYS = 30;

function curatorEmails(): Set<string> {
  return new Set(
    (process.env.CURATOR_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAuthorizedCuratorEmail(email: string): boolean {
  // Sem CURATOR_EMAILS configurado, ninguém recebe acesso de curadoria.
  return curatorEmails().has(email.trim().toLowerCase());
}

export interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  roles: string[];
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await execute(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), userId, tokenHash, expiresAt, nowIso()],
  );

  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function destroyCurrentSession() {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    await execute("DELETE FROM sessions WHERE token_hash = ?", [await sha256(token)]);
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);

  const row = await queryOne<{
    user_id: string;
    email: string;
    email_verified: number;
    expires_at: string;
    display_name: string | null;
  }>(
    `SELECT s.user_id, s.expires_at, u.email, u.email_verified, p.display_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN profiles p ON p.id = s.user_id
      WHERE s.token_hash = ?`,
    [tokenHash],
  );
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await execute("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
    deleteCookie(SESSION_COOKIE, { path: "/" });
    return null;
  }

  const { query } = await import("@/lib/turso/client.server");
  const roleRows = await query<{ role: string }>(
    "SELECT role FROM user_roles WHERE user_id = ?",
    [row.user_id],
  );

  return {
    id: row.user_id,
    email: row.email,
    emailVerified: Boolean(row.email_verified),
    displayName: row.display_name ?? null,
    roles: roleRows.map((r) => r.role),
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}

export const isReviewer = (u: SessionUser) =>
  u.emailVerified &&
  isAuthorizedCuratorEmail(u.email) &&
  (u.roles.includes("admin") || u.roles.includes("curador"));

export async function requireReviewer(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isReviewer(user)) throw new Response("Forbidden", { status: 403 });
  return user;
}
