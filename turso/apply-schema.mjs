import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url || !authToken) throw new Error("Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.");

const db = createClient({ url, authToken });
const ddl = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");

function splitStatements(sql) {
  const lines = sql.split("\n").filter((line) => !line.trim().startsWith("--"));
  const out = [];
  let buffer = [];
  let trigger = false;
  for (const line of lines) {
    buffer.push(line);
    const upper = buffer.join(" ").toUpperCase();
    const trimmed = line.trim().toUpperCase();
    if (/CREATE\s+TRIGGER/.test(upper)) trigger = true;
    const done = trigger ? trimmed === "END;" : line.trim().endsWith(";");
    if (done) {
      const statement = buffer.join("\n").trim().replace(/;$/, "");
      if (statement) out.push(statement);
      buffer = [];
      trigger = false;
    }
  }
  return out;
}

async function tableColumns(table) {
  const result = await db.execute(`PRAGMA table_info(${table})`);
  return new Set(result.rows.map((row) => String(row.name)));
}

async function tableExists(table) {
  const result = await db.execute({
    sql: "SELECT 1 FROM sqlite_schema WHERE type='table' AND name=? LIMIT 1",
    args: [table],
  });
  return result.rows.length > 0;
}

async function ensureEntityColumns() {
  // Em banco novo, o próprio schema cria `entities` já com estas colunas.
  // Em banco antigo, fazemos apenas os ALTERs realmente necessários.
  if (!(await tableExists("entities"))) return;
  const columns = await tableColumns("entities");
  const additions = [
    ["region_id", "TEXT"],
    ["people", "TEXT"],
    ["cosmology", "TEXT"],
    ["latitude", "REAL"],
    ["longitude", "REAL"],
  ];
  for (const [name, type] of additions) {
    if (columns.has(name)) continue;
    await db.execute(`ALTER TABLE entities ADD COLUMN ${name} ${type}`);
    console.log(`+ coluna entities.${name}`);
  }
}

// O banco existente pode ter sido criado antes da camada planetária.
// As colunas precisam existir antes de os índices do schema serem aplicados.
await ensureEntityColumns();

const statements = splitStatements(ddl);
let applied = 0;
for (const statement of statements) {
  await db.execute(statement);
  applied += 1;
}

// Turso atual usa FTS próprio (Tantivy), não a tabela virtual SQLite FTS5.
// O índice é opcional: se a região/versão ainda não oferecer a extensão,
// a busca pública usa um fallback conservador e o deploy não quebra.
let ftsEnabled = 0;
let ftsDetail = "fallback LIKE";
try {
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_entities_turso_fts
    ON entities USING fts (
      title, subtitle, description, culture, country,
      tags, themes, materials, techniques
    ) WITH (weights = 'title=3.0,subtitle=2.0,description=1.0,culture=1.2,country=1.1,tags=1.2,themes=1.2,materials=1.0,techniques=1.0')`);
  ftsEnabled = 1;
  ftsDetail = "Turso FTS/Tantivy";
} catch (error) {
  console.warn("FTS nativo não pôde ser ativado; a busca seguirá com fallback leve.");
  console.warn(error instanceof Error ? error.message : String(error));
}

await db.execute({
  sql: `INSERT INTO atlas_capabilities(key,enabled,detail,updated_at)
        VALUES('fts',?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(key) DO UPDATE SET enabled=excluded.enabled,detail=excluded.detail,updated_at=excluded.updated_at`,
  args: [ftsEnabled, ftsDetail],
});

console.log(`Esquema atualizado: ${applied} instruções aplicadas sem apagar o acervo.`);
console.log(`Busca textual: ${ftsDetail}.`);
