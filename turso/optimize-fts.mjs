import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url || !authToken) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');

const db = createClient({ url, authToken });

try {
  const result = await db.execute("SELECT enabled FROM atlas_capabilities WHERE key='fts' LIMIT 1");
  const enabled = Number(result.rows[0]?.enabled ?? 0) === 1;
  if (!enabled) {
    console.log('FTS nativo não está ativo neste banco; nenhuma otimização necessária.');
    process.exit(0);
  }
  await db.execute('OPTIMIZE INDEX idx_entities_turso_fts');
  console.log('Índice FTS do Atlas otimizado após a carga em lote.');
} catch (error) {
  // Não derruba a sincronização se a região/engine ainda não suportar OPTIMIZE INDEX.
  console.warn('Não foi possível executar OPTIMIZE INDEX; o acervo continua válido.');
  console.warn(error instanceof Error ? error.message : String(error));
}
