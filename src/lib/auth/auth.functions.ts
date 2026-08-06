/**
 * Server functions de autenticação.
 * Retornam resultados estruturados para que erros do Turso não sejam ocultados
 * pela serialização de produção do TanStack Start.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const credentials = z.object({
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  displayName: z.string().trim().min(1, "Informe um nome de exibição.").max(120).optional(),
});

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string; code: string };

function readableDatabaseError(error: unknown): AuthResult {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();

  if (
    lower.includes("turso_database_url") ||
    lower.includes("turso_auth_token") ||
    lower.includes("variáveis do turso ausentes")
  ) {
    return {
      ok: false,
      code: "TURSO_ENV_MISSING",
      error:
        "A conexão com o banco não está configurada na Vercel. Confira TURSO_DATABASE_URL e TURSO_AUTH_TOKEN e faça um novo deploy.",
    };
  }

  if (
    lower.includes("unauthorized") ||
    lower.includes("authentication") ||
    lower.includes("auth token") ||
    lower.includes("401")
  ) {
    return {
      ok: false,
      code: "TURSO_TOKEN_INVALID",
      error:
        "O token do Turso foi recusado. Gere um novo token para o banco constelacoes, atualize TURSO_AUTH_TOKEN na Vercel e faça um novo deploy.",
    };
  }

  if (
    lower.includes("no such table") ||
    lower.includes("has no column") ||
    lower.includes("table users")
  ) {
    return {
      ok: false,
      code: "DATABASE_SCHEMA_MISSING",
      error:
        "As tabelas de autenticação ainda não estão completas no banco constelacoes. Execute a ação de atualização do esquema antes de criar a conta.",
    };
  }

  if (lower.includes("unique constraint failed: users.email")) {
    return {
      ok: false,
      code: "EMAIL_ALREADY_EXISTS",
      error: "Já existe uma conta com este e-mail. Use a aba Entrar.",
    };
  }

  console.error("[Atlas auth]", error);
  return {
    ok: false,
    code: "AUTH_UNEXPECTED",
    error:
      raw && raw !== "Error"
        ? `Não foi possível autenticar: ${raw}`
        : "Não foi possível autenticar. Verifique a conexão com o banco e tente novamente.",
  };
}

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => credentials.parse(d))
  .handler(async ({ data }): Promise<AuthResult> => {
    try {
      const { execute, queryOne, nowIso } = await import("@/lib/turso/client.server");
      const { hashPassword } = await import("@/lib/auth/password.server");
      const { createSession } = await import("@/lib/auth/session.server");

      const email = data.email.trim().toLowerCase();
      const existing = await queryOne<{ id: string }>(
        "SELECT id FROM users WHERE lower(email) = ?",
        [email],
      );

      if (existing) {
        return {
          ok: false,
          code: "EMAIL_ALREADY_EXISTS",
          error: "Já existe uma conta com este e-mail. Use a aba Entrar.",
        };
      }

      const id = crypto.randomUUID();
      const now = nowIso();
      const passwordHash = await hashPassword(data.password);

      await execute(
        `INSERT INTO users (id, email, email_verified, password_hash, created_at, updated_at)
         VALUES (?, ?, 0, ?, ?, ?)`,
        [id, email, passwordHash, now, now],
      );

      await execute(
        `INSERT INTO profiles (id, display_name, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
        [id, data.displayName?.trim() || email, now, now],
      );

      await execute(
        `INSERT OR IGNORE INTO user_roles (id, user_id, role, created_at)
         VALUES (?, ?, 'estudante', ?)`,
        [crypto.randomUUID(), id, now],
      );

      await createSession(id);

      return {
        ok: true,
        user: {
          id,
          email,
          displayName: data.displayName?.trim() || email,
          roles: ["estudante"],
        },
      };
    } catch (error) {
      return readableDatabaseError(error);
    }
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    credentials.pick({ email: true, password: true }).parse(d),
  )
  .handler(async ({ data }): Promise<AuthResult> => {
    try {
      const { queryOne, query } = await import("@/lib/turso/client.server");
      const { verifyPassword } = await import("@/lib/auth/password.server");
      const { createSession } = await import("@/lib/auth/session.server");

      const email = data.email.trim().toLowerCase();
      const user = await queryOne<{
        id: string;
        email: string;
        password_hash: string | null;
      }>("SELECT id, email, password_hash FROM users WHERE lower(email) = ?", [email]);

      if (!user) {
        return {
          ok: false,
          code: "INVALID_CREDENTIALS",
          error: "E-mail ou senha incorretos.",
        };
      }

      const passwordIsValid = await verifyPassword(data.password, user.password_hash);
      if (!passwordIsValid) {
        return {
          ok: false,
          code: "INVALID_CREDENTIALS",
          error: "E-mail ou senha incorretos.",
        };
      }

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
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: profile?.display_name ?? null,
          roles: roles.map((row) => row.role),
        },
      };
    } catch (error) {
      return readableDatabaseError(error);
    }
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { destroyCurrentSession } = await import("@/lib/auth/session.server");
  await destroyCurrentSession();
  return { ok: true };
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getSessionUser } = await import("@/lib/auth/session.server");
    return await getSessionUser();
  } catch (error) {
    console.error("[Atlas current user]", error);
    return null;
  }
});
