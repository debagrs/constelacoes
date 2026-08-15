import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url || !authToken) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
const db = createClient({ url, authToken });

async function metric(key) {
  const result = await db.execute({ sql: `SELECT value FROM atlas_metrics WHERE key=?`, args: [key] });
  return Number(result.rows[0]?.value ?? 0);
}

async function facet(facetId) {
  const result = await db.execute({
    sql: `SELECT published_count,with_image_count FROM atlas_facet_stats WHERE facet_id=?`,
    args: [facetId],
  });
  return {
    records: Number(result.rows[0]?.published_count ?? 0),
    images: Number(result.rows[0]?.with_image_count ?? 0),
  };
}

const published = await metric('published');
if (!published) {
  console.log('As estatísticas materiais ainda não foram reconstruídas. Rode: npm run db:refresh-indexes');
  process.exit(0);
}

console.log('\nATLAS PLANETÁRIO — AUDITORIA DE BAIXO CONSUMO');
console.log('---------------------------------------------');
console.log(`Registros documentais publicados: ${published.toLocaleString('pt-BR')}`);
console.log(`Imagens únicas exibíveis: ${(await metric('unique_images')).toLocaleString('pt-BR')}`);
console.log(`Registros publicados sem imagem: ${(await metric('published_without_image')).toLocaleString('pt-BR')}`);
console.log('');
console.log(`AIC em domínio público sincronizados: ${(await metric('aic_public_domain')).toLocaleString('pt-BR')}`);
console.log(`AIC com imagem IIIF: ${(await metric('aic_with_image')).toLocaleString('pt-BR')}`);
console.log(`AIC sem imagem IIIF: ${(await metric('aic_without_image')).toLocaleString('pt-BR')}`);
console.log(`Grupos duplicados indexados: ${(await metric('duplicate_groups')).toLocaleString('pt-BR')}`);

const facets = [
  ['curadoria:mulheres-e-maes', 'Mulheres e mães'],
  ['curadoria:indigenas', 'Indígenas'],
  ['curadoria:negros-e-diasporas', 'Negros e diásporas'],
  ['curadoria:lgbtqia', 'LGBTQIA+'],
  ['curadoria:bioetica-e-animalidades', 'Bioética e animalidades'],
  ['curadoria:alem-do-antropoceno', 'Além do Antropoceno'],
];
console.log('\nCOBERTURA DAS LENTES CURATORIAIS');
for (const [facetId, label] of facets) {
  const data = await facet(facetId);
  console.log(`${label}: ${data.records.toLocaleString('pt-BR')} registros · ${data.images.toLocaleString('pt-BR')} com imagem`);
}
console.log('');
