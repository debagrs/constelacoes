import { createClient } from '@libsql/client';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  throw new Error('Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN antes de executar.');
}

const db = createClient({ url, authToken });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'acervo-export');

const imports = [
  ['regions', 'regions.json'],
  ['facets', 'facets.json'],
  ['entities', 'entities.json'],
  ['motifs', 'motifs.json'],
  ['bibliography', 'bibliography.json'],
  ['relations', 'relations.json'],
  ['entity_facets', 'entity_facets.json'],
  ['entity_motifs', 'entity_motifs.json'],
  ['entity_bibliography', 'entity_bibliography.json'],
  ['relation_bibliography', 'relation_bibliography.json'],
  ['image_suggestions', 'image_suggestions.json'],
];

function sqlValue(value) {
  if (value === undefined) return null;
  if (Array.isArray(value) || (value && typeof value === 'object')) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

async function tableColumns(table) {
  const result = await db.execute(`PRAGMA table_info(${table})`);
  return new Set(result.rows.map((row) => String(row.name)));
}

async function importTable(table, filename) {
  const filePath = path.join(dataDir, filename);
  let rows;
  try {
    rows = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    console.log(`↷ ${filename}: arquivo ausente ou inválido; ignorado.`);
    return;
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`↷ ${table}: sem registros.`);
    return;
  }

  const columns = await tableColumns(table);
  if (columns.size === 0) {
    console.log(`↷ ${table}: tabela não existe no banco; ignorada.`);
    return;
  }

  const statements = [];
  for (const row of rows) {
    const keys = Object.keys(row).filter((key) => columns.has(key));
    if (keys.length === 0) continue;
    const placeholders = keys.map(() => '?').join(', ');
    statements.push({
      sql: `INSERT OR IGNORE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
      args: keys.map((key) => sqlValue(row[key])),
    });
  }

  const chunkSize = 80;
  for (let index = 0; index < statements.length; index += chunkSize) {
    await db.batch(statements.slice(index, index + chunkSize), 'write');
    const done = Math.min(index + chunkSize, statements.length);
    process.stdout.write(`\r${table}: ${done}/${statements.length}`);
  }
  process.stdout.write('\n');

  const count = await db.execute(`SELECT COUNT(*) AS total FROM ${table}`);
  console.log(`✓ ${table}: ${count.rows[0]?.total ?? 0} registros no banco.`);
}

console.log('Atlas Planetário — restauração segura do acervo');
console.log('A operação usa INSERT OR IGNORE: não apaga nem duplica IDs existentes.\n');

for (const [table, filename] of imports) {
  await importTable(table, filename);
}

try {
  await db.execute("INSERT INTO entities_fts(entities_fts) VALUES('rebuild')");
  console.log('✓ Índice de busca reconstruído.');
} catch (error) {
  console.log('↷ Índice FTS não foi reconstruído:', error instanceof Error ? error.message : error);
}

const summary = await db.execute(
  `SELECT status, COUNT(*) AS total FROM entities GROUP BY status ORDER BY status`,
);
console.log('\nResumo de entities:');
for (const row of summary.rows) console.log(`- ${row.status}: ${row.total}`);
console.log('\nConcluído. Faça um Redeploy na Vercel para atualizar o front.');
