import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

if (!url || !authToken) {
  throw new Error('TURSO_CONFIG: faltam TURSO_DATABASE_URL e/ou TURSO_AUTH_TOKEN nos Secrets do GitHub Actions.');
}

const db = createClient({ url, authToken });

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

function classify(error) {
  const text = message(error);
  if (/BLOCKED/i.test(text)) {
    return `TURSO_BLOCKED: o Turso recusou a consulta por bloqueio/cota. Confirme no painel se o plano Developer está ativo nesta mesma organização. Detalhe: ${text}`;
  }
  if (/401|unauthor|auth|token/i.test(text)) {
    return `TURSO_AUTH: a URL/token usados pelo GitHub não foram aceitos. Detalhe: ${text}`;
  }
  return text;
}

async function run(label, sql, args = []) {
  try {
    return await db.execute({ sql, args });
  } catch (error) {
    throw new Error(`${label}: ${classify(error)}`);
  }
}

async function tableExists(table) {
  const result = await run(
    `verificar tabela ${table}`,
    "SELECT 1 FROM sqlite_schema WHERE type='table' AND name=? LIMIT 1",
    [table],
  );
  return result.rows.length > 0;
}

async function columns(table) {
  const result = await run(`ler colunas de ${table}`, `PRAGMA table_info(${table})`);
  return new Set(result.rows.map((row) => String(row.name)));
}

async function ensureColumn(table, name, definition) {
  if (!(await tableExists(table))) return;
  const current = await columns(table);
  if (current.has(name)) return;
  await run(`adicionar ${table}.${name}`, `ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  console.log(`+ coluna ${table}.${name}`);
}

async function ensureTable(name, sql) {
  await run(`criar/confirmar tabela ${name}`, sql);
  console.log(`✓ tabela ${name}`);
}

async function safeIndex(name, sql) {
  try {
    await db.execute(sql);
    console.log(`✓ índice ${name}`);
  } catch (error) {
    // Índice é otimização. Nunca deve impedir a recuperação do Atlas.
    console.warn(`⚠ índice ${name} não criado: ${classify(error)}`);
  }
}

console.log('1/5 Testando conexão com o Turso...');
await run('teste de conexão', 'SELECT 1 AS ok');
console.log('✓ conexão Turso OK');

if (!(await tableExists('entities'))) {
  throw new Error('ATLAS_SCHEMA: a tabela entities não existe. Este reparo é não destrutivo e não criará um acervo vazio por cima do banco atual.');
}

console.log('2/5 Ajustando somente colunas compatíveis com versões antigas...');
for (const [name, type] of [
  ['region_id', 'TEXT'],
  ['people', 'TEXT'],
  ['cosmology', 'TEXT'],
  ['latitude', 'REAL'],
  ['longitude', 'REAL'],
]) {
  await ensureColumn('entities', name, type);
}
await ensureColumn('relations', 'status', "TEXT NOT NULL DEFAULT 'draft'");

console.log('3/5 Criando a camada de baixo consumo sem reaplicar o schema inteiro...');
await ensureTable('regions', `CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  continent TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  summary TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
)`);
for (const [name, type] of [
  ['parent_id', 'TEXT'], ['continent', "TEXT NOT NULL DEFAULT ''"], ['latitude', 'REAL'],
  ['longitude', 'REAL'], ['summary', 'TEXT'], ['sort_order', 'INTEGER NOT NULL DEFAULT 0'],
]) {
  await ensureColumn('regions', name, type);
}

await ensureTable('facets', `CREATE TABLE IF NOT EXISTS facets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  summary TEXT
)`);
await ensureTable('entity_facets', `CREATE TABLE IF NOT EXISTS entity_facets (
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  facet_id TEXT NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  PRIMARY KEY (entity_id, facet_id)
)`);
await ensureTable('entity_quality', `CREATE TABLE IF NOT EXISTS entity_quality (
  entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  quality_status TEXT NOT NULL DEFAULT 'unreviewed',
  issues TEXT NOT NULL DEFAULT '[]',
  canonical_entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
  original_status TEXT,
  reviewer_id TEXT,
  notes TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
)`);
for (const [name, type] of [
  ['quality_status', "TEXT NOT NULL DEFAULT 'unreviewed'"], ['issues', "TEXT NOT NULL DEFAULT '[]'"],
  ['canonical_entity_id', 'TEXT'], ['original_status', 'TEXT'], ['reviewer_id', 'TEXT'],
  ['notes', 'TEXT'], ['reviewed_at', 'TEXT'], ['created_at', 'TEXT'], ['updated_at', 'TEXT'],
]) {
  await ensureColumn('entity_quality', name, type);
}

const summaryTables = [
  ['atlas_metrics', `CREATE TABLE IF NOT EXISTS atlas_metrics (
    key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`],
  ['atlas_type_stats', `CREATE TABLE IF NOT EXISTS atlas_type_stats (
    entity_type TEXT PRIMARY KEY, published_count INTEGER NOT NULL DEFAULT 0,
    with_image_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`],
  ['atlas_facet_stats', `CREATE TABLE IF NOT EXISTS atlas_facet_stats (
    facet_id TEXT PRIMARY KEY REFERENCES facets(id) ON DELETE CASCADE,
    published_count INTEGER NOT NULL DEFAULT 0, with_image_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`],
  ['atlas_region_stats', `CREATE TABLE IF NOT EXISTS atlas_region_stats (
    region_id TEXT PRIMARY KEY REFERENCES regions(id) ON DELETE CASCADE,
    published_count INTEGER NOT NULL DEFAULT 0, with_image_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`],
  ['atlas_continent_stats', `CREATE TABLE IF NOT EXISTS atlas_continent_stats (
    continent TEXT PRIMARY KEY, published_count INTEGER NOT NULL DEFAULT 0,
    with_image_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`],
  ['atlas_region_timeline', `CREATE TABLE IF NOT EXISTS atlas_region_timeline (
    region_id TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    bucket INTEGER NOT NULL, total INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (region_id, bucket)
  )`],
  ['atlas_region_facet_stats', `CREATE TABLE IF NOT EXISTS atlas_region_facet_stats (
    region_id TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    facet_id TEXT NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
    total INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (region_id, facet_id)
  )`],
  ['atlas_quality_issues', `CREATE TABLE IF NOT EXISTS atlas_quality_issues (
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    issue TEXT NOT NULL,
    PRIMARY KEY (entity_id, issue)
  )`],
  ['entity_facet_candidates', `CREATE TABLE IF NOT EXISTS entity_facet_candidates (
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    facet_id TEXT NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
    evidence TEXT NOT NULL DEFAULT '[]',
    PRIMARY KEY (entity_id, facet_id)
  )`],
  ['entity_dedupe_index', `CREATE TABLE IF NOT EXISTS entity_dedupe_index (
    entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
    image_key TEXT, signature_key TEXT, is_canonical INTEGER NOT NULL DEFAULT 1
  )`],
  ['atlas_import_state', `CREATE TABLE IF NOT EXISTS atlas_import_state (
    source TEXT PRIMARY KEY, cursor TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`],
  ['atlas_capabilities', `CREATE TABLE IF NOT EXISTS atlas_capabilities (
    key TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0, detail TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`],
];
for (const [name, sql] of summaryTables) await ensureTable(name, sql);

console.log('4/5 Garantindo lentes curatoriais e índices leves...');
const facetRows = [
  ['curadoria:mulheres-e-maes','curadoria','Mulheres e mães','Lente curatorial documentada para genealogias femininas, maternidades, cuidado e produção de mulheres.'],
  ['curadoria:indigenas','curadoria','Indígenas','Lente curatorial documentada para produções, povos, cosmologias, territórios e questões indígenas.'],
  ['curadoria:negros-e-diasporas','curadoria','Negros e diásporas','Lente curatorial documentada para produções negras, afro-diaspóricas, quilombolas e relações correlatas.'],
  ['curadoria:lgbtqia','curadoria','LGBTQIA+','Lente curatorial documentada para produções e questões LGBTQIA+.'],
  ['curadoria:bioetica-e-animalidades','curadoria','Bioética e animalidades','Lente para bioética, animalidades, relações multiespécies e mais-que-humano.'],
  ['curadoria:alem-do-antropoceno','curadoria','Além do Antropoceno','Lente para ecologias, pós-humanismos, plantas, fungos, clima, água, materialidades e cosmotécnicas.'],
  ['sensibilidade:animalidades','sensibilidade','Animalidades','Relações entre humanos e outros animais, representação, percepção e agência animal.'],
  ['sensibilidade:mais-que-humano','sensibilidade','Mais-que-humano','Relações multiespécies, ecologias e agências não humanas.'],
  ['sensibilidade:multiespecies','sensibilidade','Multiespécies','Coexistências e relações entre espécies.'],
  ['sensibilidade:alem-do-antropoceno','sensibilidade','Além do Antropoceno','Perspectivas ecológicas, pós-humanas e cosmotécnicas.'],
];
for (const row of facetRows) {
  await run('registrar lente curatorial', 'INSERT OR IGNORE INTO facets(id,kind,name,summary) VALUES(?,?,?,?)', row);
}

const indexes = [
  ['idx_entities_status_id', "CREATE INDEX IF NOT EXISTS idx_entities_status_id ON entities(status,id)"],
  ['idx_entities_status_image', "CREATE INDEX IF NOT EXISTS idx_entities_status_image ON entities(status,image_url)"],
  ['idx_entities_status_region_id', "CREATE INDEX IF NOT EXISTS idx_entities_status_region_id ON entities(status,region_id,id)"],
  ['idx_entities_status_continent_id', "CREATE INDEX IF NOT EXISTS idx_entities_status_continent_id ON entities(status,continent,id)"],
  ['idx_entities_status_type_id', "CREATE INDEX IF NOT EXISTS idx_entities_status_type_id ON entities(status,entity_type,id)"],
  ['idx_entities_status_updated', "CREATE INDEX IF NOT EXISTS idx_entities_status_updated ON entities(status,updated_at DESC,id)"],
  ['idx_entities_title_nocase', "CREATE INDEX IF NOT EXISTS idx_entities_title_nocase ON entities(title COLLATE NOCASE)"],
  ['idx_entities_subtitle_nocase', "CREATE INDEX IF NOT EXISTS idx_entities_subtitle_nocase ON entities(subtitle COLLATE NOCASE)"],
  ['idx_entity_facets_facet_entity', "CREATE INDEX IF NOT EXISTS idx_entity_facets_facet_entity ON entity_facets(facet_id,entity_id)"],
  ['idx_entity_quality_status', "CREATE INDEX IF NOT EXISTS idx_entity_quality_status ON entity_quality(quality_status)"],
  ['idx_entity_quality_canonical', "CREATE INDEX IF NOT EXISTS idx_entity_quality_canonical ON entity_quality(canonical_entity_id)"],
  ['idx_entity_dedupe_image', "CREATE INDEX IF NOT EXISTS idx_entity_dedupe_image ON entity_dedupe_index(image_key,is_canonical,entity_id)"],
  ['idx_entity_dedupe_signature', "CREATE INDEX IF NOT EXISTS idx_entity_dedupe_signature ON entity_dedupe_index(signature_key,is_canonical,entity_id)"],
  ['idx_entity_facet_candidates_facet', "CREATE INDEX IF NOT EXISTS idx_entity_facet_candidates_facet ON entity_facet_candidates(facet_id,entity_id)"],
  ['idx_atlas_quality_issues_issue', "CREATE INDEX IF NOT EXISTS idx_atlas_quality_issues_issue ON atlas_quality_issues(issue,entity_id)"],
  ['idx_region_facet_stats_region', "CREATE INDEX IF NOT EXISTS idx_region_facet_stats_region ON atlas_region_facet_stats(region_id,total DESC)"],
  ['idx_regions_parent_sort', "CREATE INDEX IF NOT EXISTS idx_regions_parent_sort ON regions(parent_id,sort_order,id)"],
  ['idx_regions_continent', "CREATE INDEX IF NOT EXISTS idx_regions_continent ON regions(continent)"],
];
for (const [name, sql] of indexes) await safeIndex(name, sql);

// Enquanto não confirmarmos o engine FTS do banco remoto, a busca usa o fallback leve.
await run(
  'registrar capacidade FTS',
  `INSERT INTO atlas_capabilities(key,enabled,detail,updated_at)
   VALUES('fts',0,'fallback leve; FTS não é pré-requisito para recuperar o Atlas',strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   ON CONFLICT(key) DO UPDATE SET enabled=excluded.enabled,detail=excluded.detail,updated_at=excluded.updated_at`,
);

console.log('5/5 Verificando estruturas críticas...');
for (const table of ['entities','facets','entity_facets','atlas_metrics','entity_dedupe_index','atlas_import_state','atlas_capabilities']) {
  if (!(await tableExists(table))) throw new Error(`ATLAS_SCHEMA: a tabela crítica ${table} não pôde ser criada.`);
}

console.log('✓ Migração de baixo consumo concluída sem apagar registros e sem reaplicar o schema legado inteiro.');
console.log('Próximo passo seguro: executar npm run db:refresh-indexes uma única vez.');
