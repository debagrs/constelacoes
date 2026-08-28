/**
 * Sessões próprias em cookie httpOnly, persistidas no Turso.
 * A curadoria falha fechada: exige e-mail explicitamente autorizado
 * e papel admin/curador gravado no banco. Contas de curadoria não podem
 * ser criadas pelo cadastro público; o papel é provisionado pelo servidor.
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
  const roles = roleRows.map((r) => r.role);

  // Bootstrap seguro da curadoria: somente e-mails presentes em CURATOR_EMAILS,
  // variável privada do servidor, podem receber automaticamente o papel curador.
  // Isso corrige contas antigas criadas antes da implantação da área de curadoria.
  if (isAuthorizedCuratorEmail(row.email) && !roles.includes("admin") && !roles.includes("curador")) {
    await execute(
      `INSERT OR IGNORE INTO user_roles (id, user_id, role, created_at)
       VALUES (?, ?, 'curador', ?)`,
      [crypto.randomUUID(), row.user_id, nowIso()],
    );
    roles.push("curador");
  }

  return {
    id: row.user_id,
    email: row.email,
    emailVerified: Boolean(row.email_verified),
    displayName: row.display_name ?? null,
    roles,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}

/**
 * O allowlist CURATOR_EMAILS serve apenas para provisionar o papel curador.
 * Depois de gravado no banco, o papel é a fonte de autorização. Isso evita
 * derrubar curadores já provisionados quando um novo deployment não recebe a
 * variável imediatamente ou quando a lista é atualizada na Vercel.
 */
export const isReviewer = (u: SessionUser) =>
  u.roles.includes("admin") || u.roles.includes("curador");

export async function requireReviewer(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isReviewer(user)) throw new Response("Forbidden", { status: 403 });
  return user;
}
