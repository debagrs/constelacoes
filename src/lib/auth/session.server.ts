/**
 * Sessões próprias em cookie httpOnly, persistidas na tabela `sessions` do Turso.
 * Server-only.
 */
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { execute, queryOne, nowIso } from "@/lib/turso/client.server";
import { randomToken, sha256 } from "./password.server";

export const SESSION_COOKIE = "atlas_session";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
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
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function destroyCurrentSession() {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    await execute("DELETE FROM sessions WHERE token_hash = ?", [
      await sha256(token),
    ]);
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

/** Usuário atual ou null. Nunca lança. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;

  const row = await queryOne<{
    user_id: string;
    email: string;
    expires_at: string;
    display_name: string | null;
  }>(
    `SELECT s.user_id, s.expires_at, u.email, p.display_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN profiles p ON p.id = s.user_id
      WHERE s.token_hash = ?`,
    [await sha256(token)],
  );
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await execute("DELETE FROM sessions WHERE token_hash = ?", [
      await sha256(token),
    ]);
    return null;
  }

  const roleRows = await (
    await import("@/lib/turso/client.server")
  ).query<{ role: string }>("SELECT role FROM user_roles WHERE user_id = ?", [
    row.user_id,
  ]);

  return {
    id: row.user_id,
    email: row.email,
    displayName: row.display_name ?? null,
    roles: roleRows.map((r) => r.role),
  };
}

/** Usuário atual ou 401. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}

export const isReviewer = (u: SessionUser) =>
  u.roles.includes("admin") || u.roles.includes("curador");

/** Usuário atual com papel de curadoria, ou 403. */
export async function requireReviewer(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isReviewer(user)) throw new Response("Forbidden", { status: 403 });
  return user;
}
