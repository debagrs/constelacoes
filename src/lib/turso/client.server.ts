// Cliente libSQL (Turso). Server-only: nunca importe isto de código de browser.
import { createClient, type Client, type InArgs } from "@libsql/client/web";

let _db: Client | undefined;

export function db(): Client {
  if (_db) return _db;
  const url = process.env["TURSO_DATABASE_URL"];
  const authToken = process.env["TURSO_AUTH_TOKEN"];
  if (!url || !authToken) {
    throw new Error(
      "Variáveis do Turso ausentes: TURSO_DATABASE_URL e/ou TURSO_AUTH_TOKEN.",
    );
  }
  _db = createClient({ url, authToken });
  return _db;
}

/** SELECT tipado. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  args: InArgs = [],
): Promise<T[]> {
  const res = await db().execute({ sql, args });
  return res.rows as unknown as T[];
}

/** SELECT de uma única linha. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args: InArgs = [],
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

/** INSERT/UPDATE/DELETE. */
export async function execute(sql: string, args: InArgs = []) {
  return db().execute({ sql, args });
}

/** Várias escritas numa transação. */
export async function batch(
  statements: { sql: string; args?: InArgs }[],
) {
  if (statements.length === 0) return;
  await db().batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write",
  );
}

export const nowIso = () => new Date().toISOString();
