/**
 * Server functions de autenticação (cadastro, login, logout, usuário atual).
 * Módulo thin-wrapper: sem helpers em escopo de módulo.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const credentials = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa de ao menos 8 caracteres"),
  displayName: z.string().trim().min(1).max(120).optional(),
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => credentials.parse(d))
  .handler(async ({ data }) => {
    const { execute, queryOne, nowIso } = await import("@/lib/turso/client.server");
    const { hashPassword } = await import("@/lib/auth/password.server");
    const { createSession } = await import("@/lib/auth/session.server");

    const email = data.email.trim().toLowerCase();
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existing) throw new Error("Já existe uma conta com este e-mail.");

    const id = crypto.randomUUID();
    const now = nowIso();
    await execute(
      `INSERT INTO users (id, email, email_verified, password_hash, created_at, updated_at)
       VALUES (?, ?, 0, ?, ?, ?)`,
      [id, email, await hashPassword(data.password), now, now],
    );
    await execute(
      `INSERT INTO profiles (id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [id, data.displayName ?? email, now, now],
    );
    await execute(
      `INSERT OR IGNORE INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, 'estudante', ?)`,
      [crypto.randomUUID(), id, now],
    );

    await createSession(id);
    return { id, email, displayName: data.displayName ?? email, roles: ["estudante"] };
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    credentials.pick({ email: true, password: true }).parse(d),
  )
  .handler(async ({ data }) => {
    const { queryOne, query } = await import("@/lib/turso/client.server");
    const { verifyPassword } = await import("@/lib/auth/password.server");
    const { createSession } = await import("@/lib/auth/session.server");

    const email = data.email.trim().toLowerCase();
    const user = await queryOne<{
      id: string;
      email: string;
      password_hash: string | null;
    }>("SELECT id, email, password_hash FROM users WHERE email = ?", [email]);

    const ok = user && (await verifyPassword(data.password, user.password_hash));
    if (!user || !ok) throw new Error("E-mail ou senha incorretos.");

    await createSession(user.id);
    const profile = await queryOne<{ display_name: string | null }>(
      "SELECT display_name FROM profiles WHERE id = ?",
      [user.id],
    );
    const roles = await query<{ role: string }>(
      "SELECT role FROM user_roles WHERE user_id = ?",
      [user.id],
    );
    return {
      id: user.id,
      email: user.email,
      displayName: profile?.display_name ?? null,
      roles: roles.map((r) => r.role),
    };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { destroyCurrentSession } = await import("@/lib/auth/session.server");
  await destroyCurrentSession();
  return { ok: true };
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUser } = await import("@/lib/auth/session.server");
  return await getSessionUser();
});
