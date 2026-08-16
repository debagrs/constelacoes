// Cliente libSQL (Turso). Server-only: nunca importe este arquivo no navegador.
import { createClient, type Client, type InArgs } from "@libsql/client/web";

let cachedClient: Client | undefined;

function cleanEnvironmentValue(value: string | undefined, name: string): string {
  const cleaned = value?.trim().replace(/^['"]|['"]$/g, "");
  if (!cleaned) {
    throw new Error(
      `Variável do Turso ausente: ${name}. Configure-a na Vercel para Production e faça um novo deploy.`,
    );
  }
  return cleaned;
}

/**
 * IMPORTANTE:
 * Leia as variáveis por acesso estático (process.env.NOME) e somente quando db()
 * é chamado durante a requisição. TanStack Start/Nitro recomenda leitura
 * per-request e o acesso estático evita que o bundler perca a chave ao
 * transformar código server-only.
 */
function readTursoEnvironment() {
  const url = cleanEnvironmentValue(
    process.env.TURSO_DATABASE_URL,
    "TURSO_DATABASE_URL",
  );
  const authToken = cleanEnvironmentValue(
    process.env.TURSO_AUTH_TOKEN,
    "TURSO_AUTH_TOKEN",
  );

  if (!url.startsWith("libsql://") && !url.startsWith("https://")) {
    throw new Error(
      "TURSO_DATABASE_URL inválida. Ela deve começar com libsql:// ou https://.",
    );
  }

  return { url, authToken };
}

export function db(): Client {
  if (cachedClient) return cachedClient;

  const { url, authToken } = readTursoEnvironment();
  cachedClient = createClient({ url, authToken });
  return cachedClient;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  args: InArgs = [],
): Promise<T[]> {
  const result = await db().execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args: InArgs = [],
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

export async function execute(sql: string, args: InArgs = []) {
  return db().execute({ sql, args });
}

export async function batch(statements: { sql: string; args?: InArgs }[]) {
  if (statements.length === 0) return;

  await db().batch(
    statements.map((statement) => ({
      sql: statement.sql,
      args: statement.args ?? [],
    })),
    "write",
  );
}

export const nowIso = () => new Date().toISOString();
