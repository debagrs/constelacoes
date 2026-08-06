/**
 * Migração Supabase (Postgres) -> Turso (libSQL).
 * Uso: bun turso/migrate.ts [--reset]
 * Idempotente: usa INSERT OR REPLACE.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const PG = {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
};

/** Lê uma tabela do Postgres como JSON via psql. */
async function pgRows(table: string): Promise<Record<string, unknown>[]> {
  const sql = `select coalesce(json_agg(t), '[]') from (select * from public.${table}) t`;
  const proc = Bun.spawn(["psql", "-At", "-c", sql], {
    env: { ...process.env, PGPASSWORD: PG.password ?? "" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  if ((await proc.exited) !== 0) throw new Error(`psql ${table}: ${err}`);
  return JSON.parse(out.trim() || "[]");
}

const isoOrNull = (v: unknown) =>
  v == null ? null : new Date(v as string).toISOString();

/** Converte um valor Postgres para o tipo aceito pelo SQLite. */
function cell(v: unknown): string | number | null {
  if (v == null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

type Spec = {
  table: string;
  columns: string[];
  transform?: (r: Record<string, unknown>) => Record<string, unknown>;
};

const TIMESTAMPS = ["created_at", "updated_at", "reviewed_at", "due_at"];

const SPECS: Spec[] = [
  { table: "profiles", columns: ["id", "display_name", "bio", "avatar_url", "institution", "created_at", "updated_at"] },
  { table: "user_roles", columns: ["id", "user_id", "role", "created_at"] },
  {
    table: "entities",
    columns: [
      "id", "entity_type", "title", "slug", "subtitle", "description",
      "date_start", "date_end", "date_display", "location", "country",
      "continent", "culture", "image_url", "image_license", "open_image",
      "source_url", "tags", "themes", "colors", "materials", "techniques",
      "metadata", "status", "created_by", "created_at", "updated_at",
    ],
  },
  { table: "motifs", columns: ["id", "name", "slug", "description", "image_url", "status", "created_by", "created_at", "updated_at"] },
  { table: "entity_motifs", columns: ["entity_id", "motif_id"] },
  { table: "relations", columns: ["id", "source_id", "target_id", "relation_type", "description", "author", "confidence", "status", "created_by", "created_at", "updated_at"] },
  { table: "bibliography", columns: ["id", "title", "authors", "year", "ref_type", "doi", "isbn", "url", "created_by", "created_at", "updated_at"] },
  { table: "entity_bibliography", columns: ["entity_id", "bibliography_id"] },
  { table: "relation_bibliography", columns: ["relation_id", "bibliography_id"] },
  { table: "atlases", columns: ["id", "owner_id", "title", "description", "cover_url", "status", "is_public", "created_at", "updated_at"] },
  { table: "atlas_groups", columns: ["id", "atlas_id", "title", "color", "created_at", "updated_at"] },
  { table: "atlas_cards", columns: ["id", "atlas_id", "card_type", "entity_id", "group_id", "title", "body", "media_url", "link_url", "x", "y", "width", "height", "rotation", "z_index", "style", "created_at", "updated_at"] },
  { table: "atlas_connections", columns: ["id", "atlas_id", "source_card_id", "target_card_id", "relation_type", "argument", "created_at", "updated_at"] },
  { table: "curation_reviews", columns: ["id", "atlas_id", "reviewer_id", "from_status", "to_status", "comment", "created_at"] },
  { table: "image_suggestions", columns: ["id", "entity_id", "rank", "image_url", "thumbnail_url", "source_url", "wikidata_qid", "candidate_title", "candidate_description", "license", "score", "status", "reviewed_by", "reviewed_at", "notes", "created_at", "updated_at"] },
  { table: "ai_proposals", columns: ["id", "user_id", "target_type", "target_id", "proposal_type", "payload", "status", "review_notes", "created_at", "updated_at"] },
  { table: "ai_decisions", columns: ["id", "proposal_id", "user_id", "action", "diff", "notes", "created_at"] },
  { table: "classes", columns: ["id", "professor_id", "name", "description", "code", "created_at", "updated_at"] },
  { table: "class_enrollments", columns: ["id", "class_id", "student_id", "created_at"] },
  { table: "activities", columns: ["id", "class_id", "title", "prompt", "due_at", "created_at", "updated_at"] },
];

function splitStatements(ddl: string): string[] {
  const lines = ddl.split("\n").filter((l) => !l.trim().startsWith("--"));
  const out: string[] = [];
  let buf: string[] = [];
  let inBlock = false;
  for (const line of lines) {
    buf.push(line);
    const t = line.trim().toUpperCase();
    if (t.endsWith("BEGIN")) inBlock = true;
    const ends = inBlock ? t === "END;" : line.trim().endsWith(";");
    if (ends) {
      const stmt = buf.join("\n").trim().replace(/;$/, "").trim();
      if (stmt) out.push(stmt);
      buf = [];
      inBlock = false;
    }
  }
  return out;
}

async function applySchema() {
  const ddl = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  const statements = splitStatements(ddl);
  for (const stmt of statements) await turso.execute(stmt);
  console.log(`schema aplicado (${statements.length} statements)`);
}

/** Cria linhas em users/ a partir dos profiles para preservar as FKs. */
async function seedUsersFromProfiles(profiles: Record<string, unknown>[]) {
  for (const p of profiles) {
    await turso.execute({
      sql: `INSERT OR IGNORE INTO users (id, email, email_verified) VALUES (?, ?, 1)`,
      args: [String(p.id), `${String(p.id)}@migrado.local`],
    });
  }
}

async function copyTable(spec: Spec) {
  const rows = await pgRows(spec.table);
  if (rows.length === 0) {
    console.log(`${spec.table}: 0`);
    return 0;
  }
  if (spec.table === "profiles") await seedUsersFromProfiles(rows);

  const placeholders = spec.columns.map(() => "?").join(", ");
  const sql = `INSERT OR REPLACE INTO ${spec.table} (${spec.columns.join(", ")}) VALUES (${placeholders})`;

  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK).map((raw) => {
      const r = spec.transform ? spec.transform(raw) : raw;
      return {
        sql,
        args: spec.columns.map((c) =>
          TIMESTAMPS.includes(c) ? cell(isoOrNull(r[c])) : cell(r[c]),
        ),
      };
    });
    await turso.batch(batch, "write");
  }
  console.log(`${spec.table}: ${rows.length}`);
  return rows.length;
}

async function rebuildSearchIndex() {
  await turso.execute("INSERT INTO entities_fts(entities_fts) VALUES('rebuild')");
  console.log("índice de busca reconstruído");
}

async function main() {
  await applySchema();
  let total = 0;
  for (const spec of SPECS) total += await copyTable(spec);
  await rebuildSearchIndex();
  console.log(`\ntotal de linhas migradas: ${total}`);
}

await main();
