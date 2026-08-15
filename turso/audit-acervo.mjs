import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url || !authToken) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
const db = createClient({ url, authToken });

async function scalar(sql, args = []) {
  const result = await db.execute({ sql, args });
  return Number(result.rows[0]?.total ?? 0);
}

const [
  published,
  uniqueImages,
  withoutImage,
  aicRecords,
  aicImages,
  aicWithoutImage,
  duplicateImages,
  duplicateSignatures,
] = await Promise.all([
  scalar(`SELECT COUNT(*) total FROM entities WHERE status='published'`),
  scalar(`SELECT COUNT(DISTINCT lower(trim(image_url))) total
            FROM entities
           WHERE status='published' AND image_url IS NOT NULL AND trim(image_url)<>''`),
  scalar(`SELECT COUNT(*) total FROM entities
           WHERE status='published' AND (image_url IS NULL OR trim(image_url)='')`),
  scalar(`SELECT COUNT(*) total FROM entities WHERE status='published' AND id LIKE 'aic-%'`),
  scalar(`SELECT COUNT(*) total FROM entities
           WHERE status='published' AND id LIKE 'aic-%' AND image_url IS NOT NULL AND trim(image_url)<>''`),
  scalar(`SELECT COUNT(*) total FROM entities
           WHERE status='published' AND id LIKE 'aic-%' AND (image_url IS NULL OR trim(image_url)='')`),
  scalar(`SELECT COUNT(*) total FROM (
    SELECT lower(trim(image_url)) u
      FROM entities
     WHERE status='published' AND image_url IS NOT NULL AND trim(image_url)<>''
     GROUP BY u HAVING COUNT(*)>1
  )`),
  scalar(`SELECT COUNT(*) total FROM (
    SELECT lower(trim(title)) || '|' || lower(trim(COALESCE(subtitle,''))) || '|' || lower(trim(COALESCE(date_display,''))) signature
      FROM entities
     WHERE status='published'
     GROUP BY signature HAVING COUNT(*)>1
  )`),
]);

console.log('\nATLAS PLANETÁRIO — AUDITORIA DO ACERVO');
console.log('--------------------------------------');
console.log(`Registros documentais publicados: ${published.toLocaleString('pt-BR')}`);
console.log(`Imagens únicas exibíveis: ${uniqueImages.toLocaleString('pt-BR')}`);
console.log(`Registros publicados sem imagem: ${withoutImage.toLocaleString('pt-BR')}`);
console.log('');
console.log(`AIC em domínio público sincronizados: ${aicRecords.toLocaleString('pt-BR')}`);
console.log(`AIC com imagem IIIF: ${aicImages.toLocaleString('pt-BR')}`);
console.log(`AIC sem imagem IIIF: ${aicWithoutImage.toLocaleString('pt-BR')}`);
console.log('');
console.log(`Grupos com a mesma URL de imagem: ${duplicateImages.toLocaleString('pt-BR')}`);
console.log(`Assinaturas documentais repetidas: ${duplicateSignatures.toLocaleString('pt-BR')}`);

const facets = [
  ['curadoria:mulheres-e-maes', 'Mulheres e mães'],
  ['curadoria:indigenas', 'Indígenas'],
  ['curadoria:negros-e-diasporas', 'Negros e diásporas'],
  ['curadoria:lgbtqia', 'LGBTQIA+'],
  ['curadoria:bioetica-e-animalidades', 'Bioética e animalidades'],
  ['curadoria:alem-do-antropoceno', 'Além do Antropoceno'],
];

console.log('\nCOBERTURA DAS LENTES CURATORIAIS');
for (const [facet, label] of facets) {
  const [records, images] = await Promise.all([
    scalar(`SELECT COUNT(DISTINCT e.id) total
              FROM entities e JOIN entity_facets ef ON ef.entity_id=e.id
             WHERE e.status='published' AND ef.facet_id=?`, [facet]),
    scalar(`SELECT COUNT(DISTINCT e.id) total
              FROM entities e JOIN entity_facets ef ON ef.entity_id=e.id
             WHERE e.status='published' AND ef.facet_id=?
               AND e.image_url IS NOT NULL AND trim(e.image_url)<>''`, [facet]),
  ]);
  console.log(`${label}: ${records.toLocaleString('pt-BR')} registros · ${images.toLocaleString('pt-BR')} com imagem`);
}
console.log('');
