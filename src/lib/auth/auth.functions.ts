/**
 * Autenticação própria do Atlas em Turso.
 * Recuperação de senha por link único enviado ao e-mail da conta.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido");
const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha").max(256),
});
const signUpSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(12, "A senha precisa ter pelo menos 12 caracteres")
    .max(128, "A senha é longa demais"),
  displayName: z.string().trim().min(1).max(120).optional(),
});
const requestResetSchema = z.object({ email: emailSchema });
const resetSchema = z.object({
  token: z.string().min(40, "Link de recuperação inválido").max(200),
  newPassword: z
    .string()
    .min(12, "A nova senha precisa ter pelo menos 12 caracteres")
    .max(128, "A senha é longa demais"),
});

const DUMMY_PASSWORD_HASH =
  "pbkdf2$210000$h+AvCb0sOyferhRlSTo6Hw==$nniVn9aSBNsPqlzDO7ccQbBA8tsuhuYhCIYfzRXbpVA=";

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signUpSchema.parse(d))
  .handler(async ({ data }) => {
    const { execute, queryOne, nowIso } = await import("@/lib/turso/client.server");
    const { hashPassword } = await import("@/lib/auth/password.server");
    const { createSession } = await import("@/lib/auth/session.server");
    const { consumeRateLimit, getClientIp } = await import(
      "@/lib/auth/security.server"
    );

    const ip = getClientIp();
    if (
      ip &&
      !(await consumeRateLimit({
        action: "signup_ip",
        identity: ip,
        maxAttempts: 10,
        windowMinutes: 60,
        blockMinutes: 60,
      }))
    ) {
      throw new Error("Muitas tentativas. Aguarde antes de tentar novamente.");
    }

    const email = data.email;
    const { isAuthorizedCuratorEmail } = await import("@/lib/auth/session.server");
    if (isAuthorizedCuratorEmail(email)) {
      throw new Error("Esta conta de curadoria não pode ser criada pelo cadastro público. Use Entrar ou Esqueci minha senha.");
    }
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE lower(email) = lower(?)",
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
      `INSERT INTO profiles (id, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [id, data.displayName ?? email, now, now],
    );
    await execute(
      `INSERT OR IGNORE INTO user_roles (id, user_id, role, created_at)
       VALUES (?, ?, 'estudante', ?)`,
      [crypto.randomUUID(), id, now],
    );

    await createSession(id);
    return { id, email, displayName: data.displayName ?? email, roles: ["estudante"] };
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signInSchema.parse(d))
  .handler(async ({ data }) => {
    const { queryOne, query } = await import("@/lib/turso/client.server");
    const { verifyPassword } = await import("@/lib/auth/password.server");
    const { createSession } = await import("@/lib/auth/session.server");
    const {
      consumeRateLimit,
      clearRateLimit,
      getClientIp,
      recordSecurityEvent,
    } = await import("@/lib/auth/security.server");

    const email = data.email;
    const ip = getClientIp();
    const emailAllowed = await consumeRateLimit({
      action: "signin_email",
      identity: email,
      maxAttempts: 8,
      windowMinutes: 15,
      blockMinutes: 15,
    });
    const ipAllowed = ip
      ? await consumeRateLimit({
          action: "signin_ip",
          identity: ip,
          maxAttempts: 30,
          windowMinutes: 15,
          blockMinutes: 15,
        })
      : true;

    if (!emailAllowed || !ipAllowed) {
      throw new Error("Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.");
    }

    const user = await queryOne<{
      id: string;
      email: string;
      password_hash: string | null;
    }>("SELECT id, email, password_hash FROM users WHERE lower(email) = lower(?)", [
      email,
    ]);

    // Mesmo caminho criptográfico quando o e-mail não existe, reduzindo
    // diferença de tempo útil para enumeração de contas.
    const ok = await verifyPassword(
      data.password,
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !ok) {
      await recordSecurityEvent("login_failed", user?.id ?? null);
      throw new Error("E-mail ou senha incorretos.");
    }

    await clearRateLimit("signin_email", email);
    if (ip) await clearRateLimit("signin_ip", ip);
    await recordSecurityEvent("login_succeeded", user.id);
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

/**
 * Sempre responde da mesma forma, exista ou não uma conta.
 * O token só é criado para contas existentes e nunca é armazenado em texto puro.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestResetSchema.parse(d))
  .handler(async ({ data }) => {
    const { assertPasswordEmailConfigured, sendPasswordResetEmail } = await import(
      "@/lib/auth/email.server"
    );
    const {
      ensureAuthSecuritySchema,
      consumeRateLimit,
      getClientIp,
      purgeExpiredResetTokens,
      recordSecurityEvent,
    } = await import("@/lib/auth/security.server");
    const { queryOne, batch, nowIso } = await import("@/lib/turso/client.server");
    const { randomToken, sha256 } = await import("@/lib/auth/password.server");

    // Falha de configuração é independente da existência da conta.
    assertPasswordEmailConfigured();
    await ensureAuthSecuritySchema();
    await purgeExpiredResetTokens();

    const email = data.email;
    const ip = getClientIp();
    const emailAllowed = await consumeRateLimit({
      action: "reset_email",
      identity: email,
      maxAttempts: 4,
      windowMinutes: 60,
      blockMinutes: 60,
    });
    const ipAllowed = ip
      ? await consumeRateLimit({
          action: "reset_ip",
          identity: ip,
          maxAttempts: 12,
          windowMinutes: 60,
          blockMinutes: 60,
        })
      : true;

    // Mesmo texto para não revelar se o endereço possui conta.
    const generic = {
      ok: true,
      message:
        "Se existir uma conta para este e-mail, enviaremos um link de recuperação. Verifique também a pasta de spam.",
    };

    if (!emailAllowed || !ipAllowed) return generic;

    const user = await queryOne<{ id: string; email: string }>(
      "SELECT id, email FROM users WHERE lower(email) = lower(?) LIMIT 1",
      [email],
    );
    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return generic;
    }

    const token = randomToken(32); // 256 bits de entropia
    const tokenHash = await sha256(token);
    const now = nowIso();
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

    await batch([
      {
        sql: "DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL",
        args: [user.id],
      },
      {
        sql: `INSERT INTO password_reset_tokens
               (id, user_id, token_hash, expires_at, used_at, created_at)
              VALUES (?, ?, ?, ?, NULL, ?)`,
        args: [crypto.randomUUID(), user.id, tokenHash, expiresAt, now],
      },
    ]);

    try {
      await sendPasswordResetEmail(user.email, token);
      await recordSecurityEvent("password_reset_requested", user.id);
    } catch (error) {
      // Revoga o token caso o provedor não tenha aceitado a mensagem.
      await batch([
        {
          sql: "DELETE FROM password_reset_tokens WHERE token_hash = ?",
          args: [tokenHash],
        },
      ]);
      console.error("[auth] Não foi possível entregar e-mail de recuperação.", error);
      // A resposta permanece genérica para impedir enumeração de contas.
    }

    return generic;
  });

export const resetPasswordWithToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => resetSchema.parse(d))
  .handler(async ({ data }) => {
    const { queryOne, execute, batch, nowIso } = await import(
      "@/lib/turso/client.server"
    );
    const { hashPassword, sha256 } = await import("@/lib/auth/password.server");
    const {
      ensureAuthSecuritySchema,
      clearRateLimit,
      recordSecurityEvent,
    } = await import("@/lib/auth/security.server");

    await ensureAuthSecuritySchema();
    const tokenHash = await sha256(data.token);
    const now = nowIso();
    const tokenRow = await queryOne<{
      id: string;
      user_id: string;
      expires_at: string;
      email: string;
    }>(
      `SELECT pr.id, pr.user_id, pr.expires_at, u.email
         FROM password_reset_tokens pr
         JOIN users u ON u.id = pr.user_id
        WHERE pr.token_hash = ? AND pr.used_at IS NULL
        LIMIT 1`,
      [tokenHash],
    );

    if (!tokenRow || new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      throw new Error("Este link é inválido ou expirou. Solicite um novo link.");
    }

    // Claim atômico: o mesmo token não pode ser usado duas vezes, nem em
    // duas abas simultâneas.
    const claim = await execute(
      `UPDATE password_reset_tokens
          SET used_at = ?
        WHERE id = ? AND used_at IS NULL AND expires_at > ?`,
      [now, tokenRow.id, now],
    );
    if (Number(claim.rowsAffected ?? 0) !== 1) {
      throw new Error("Este link já foi utilizado. Solicite um novo link.");
    }

    const passwordHash = await hashPassword(data.newPassword);
    await batch([
      {
        sql: `UPDATE users
                 SET password_hash = ?, email_verified = 1, updated_at = ?
               WHERE id = ?`,
        args: [passwordHash, now, tokenRow.user_id],
      },
      {
        sql: "DELETE FROM sessions WHERE user_id = ?",
        args: [tokenRow.user_id],
      },
      {
        sql: `DELETE FROM password_reset_tokens
               WHERE user_id = ? AND id <> ?`,
        args: [tokenRow.user_id, tokenRow.id],
      },
    ]);

    await clearRateLimit("signin_email", tokenRow.email);
    await clearRateLimit("reset_email", tokenRow.email);
    await recordSecurityEvent("password_reset_completed", tokenRow.user_id);

    return { ok: true };
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
