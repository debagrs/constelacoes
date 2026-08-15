import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url || !authToken) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');

const db = createClient({ url, authToken });
const PAGE_SIZE = Math.max(200, Math.min(2000, Number(process.env.ATLAS_INDEX_PAGE_SIZE || 1000)));
const WRITE_BATCH = 180;

const FACETS = {
  women: 'curadoria:mulheres-e-maes',
  indigenous: 'curadoria:indigenas',
  black: 'curadoria:negros-e-diasporas',
  lgbtqia: 'curadoria:lgbtqia',
  animalities: 'curadoria:bioetica-e-animalidades',
  beyond: 'curadoria:alem-do-antropoceno',
};
const PRIMARY_FACETS = new Set(Object.values(FACETS));

const LEGACY_FACETS = {
  women: ['identidade:mulheres','identidade:maes','sensibilidade:artistas-maes','sensibilidade:maternidade'],
  indigenous: ['identidade:povos-indigenas','sensibilidade:cosmovisao-indigena'],
  black: ['identidade:pessoas-negras','identidade:quilombolas','cosmologia:ancestralidade-afro-diasporica'],
  lgbtqia: ['identidade:lgbtqia'],
  animalities: ['sensibilidade:bioetica','sensibilidade:direitos-animais','sensibilidade:animalidades','sensibilidade:mais-que-humano','sensibilidade:multiespecies'],
  beyond: ['sensibilidade:alem-do-antropoceno','sensibilidade:antropoceno','sensibilidade:pos-humanismo','sensibilidade:ecologia','sensibilidade:mais-que-humano','sensibilidade:tecnodiversidade'],
};

const REGION_COUNTRY_TOKENS = {
  brasil: ['brasil'], franca: ['franca','france'], italia: ['italia','italy'], egito: ['egito','egypt'],
  mali: ['mali'], nigeria: ['nigeria'], 'africa-do-sul': ['africa do sul','south africa'],
  indonesia: ['indonesia'], filipinas: ['filipinas','philippines'], japao: ['japao','japan'], china: ['china'], coreia: ['coreia','korea'],
};

const VERIFIED_MOTHERS = [
  'artemisia gentileschi','lavinia fontana','berthe morisot','suzanne valadon','käthe kollwitz','kathe kollwitz',
  'barbara hepworth','ruth asawa','alice neel','faith ringgold','betye saar','elizabeth catlett','sally mann',
  'mary kelly','niki de saint phalle','yoko ono','graciela iturbide','tarsila do amaral','tomie ohtake',
  'lygia clark','anna maria maiolino','ana maria maiolino','patricia piccinini',
];

const TERMS = {
  women: ['woman','women','female','mulher','mulheres','mother','motherhood','mãe','mae','mães','maes','maternity','maternidade','feminist','feminism','feminismo'],
  indigenous: [
    'indigenous','indígena','indigena','native american','first nations','aboriginal','aborígene','aborigene','inuit','maori','māori',
    'mapuche','maya','mayan','navajo','diné','dine','hopi','lakota','cherokee','yanomami','xavante','guarani','tupi','tikuna','ashaninka',
    'pueblo people','native peoples','american indian','first peoples',
  ],
  black: [
    'african american','african-american','afro-american','afro american','black artist','black art','negro','negra','afro-brasil','afro brasil',
    'afro-brazil','afro brazil','afro-caribbean','afro caribbean','afro-diaspora','african diaspora','diáspora africana','diaspora africana',
    'quilomb','harlem renaissance','african art','arts of africa','yoruba','iorubá','kongo','benin','akan','ashanti','ethiopian','nigerian','ghanaian',
  ],
  lgbtqia: ['lgbt','lgbtq','lgbtqia','queer','lesbian','lésbica','lesbica','gay artist','gay culture','transgender','trans artist','nonbinary','non-binary','homosexual'],
  animalities: [
    'animal','animals','animalidade','animalidades','multispecies','multiespécies','multiespecies','more-than-human','mais-que-humano','nonhuman','não humano','nao humano',
    'umwelt','zoolog','cat','cats','gato','gatos','dog','dogs','cão','cao','cachorro','horse','horses','cavalo','bird','birds','ave','aves','fish','peixe',
    'whale','baleia','insect','inseto','butterfly','borboleta','beetle','besouro','elephant','elefante','cow','cattle','vaca','boi','pig','porco','chicken','galinha',
    'sheep','ovelha','goat','cabra','deer','veado','lion','leão','leao','tiger','tigre','monkey','macaco','species','espécie','especie','fauna','bioart','bio art','bioética','bioetica',
  ],
  beyond: [
    'anthropocene','antropoceno','capitalocene','capitaloceno','plantationocene','plantationoceno','chthulucene','chthuluceno','posthuman','pós-humano','pos-humano',
    'ecology','ecologia','ecological','ecológico','ecologico','environment','environmental','ambiental','climate','clima','forest','floresta','ocean','oceano','river','rio',
    'water','água','agua','plant','plants','planta','plantas','botanical','botânica','botanica','tree','trees','árvore','arvore','fungi','fungus','fungo','fungos','mushroom',
    'cogumelo','soil','solo','mineral','geology','geologia','landscape','paisagem','extinction','extinção','extincao','biodiversity','biodiversidade','cosmotechnic','cosmotécnica',
    'cosmotecnica','technodiversity','tecnodiversidade','more-than-human','mais-que-humano','multispecies','multiespécies','multiespecies',
  ],
};

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function cleanKey(value) {
  return normalize(value).replace(/\s+/g, ' ').trim();
}

function hasAny(text, terms) {
  return terms.some((term) => {
    const needle = normalize(term).trim();
    if (!needle) return false;
    if (needle.length <= 3) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
    }
    return text.includes(needle);
  });
}

function parseArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return String(value).split(/[,;|]/).map((v) => v.trim()).filter(Boolean);
  }
}

function increment(map, key, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + amount);
}

function nestedIncrement(map, key1, key2, amount = 1) {
  if (!key1 && key1 !== 0) return;
  let inner = map.get(key1);
  if (!inner) {
    inner = new Map();
    map.set(key1, inner);
  }
  increment(inner, key2, amount);
}

function qualityIssues(row) {
  const issues = [];
  const hasImage = Boolean(String(row.image_url ?? '').trim());
  const source = String(row.source_url ?? '').trim();
  const license = normalize(row.image_license ?? '');
  const metadata = normalize(row.metadata ?? '');
  if (hasImage && (!source || Number(row.open_image ?? 0) === 0 || license.includes('uso educacional') || metadata.includes('expansao_'))) issues.push('suspect_image');
  if (!source) issues.push('missing_source');
  if (['obra','projeto','fotografia','design','arquitetura','filme','performance'].includes(String(row.entity_type ?? '').toLowerCase()) && !String(row.subtitle ?? '').trim()) issues.push('missing_attribution');
  const techniques = String(row.techniques ?? '').trim();
  if (!techniques || techniques === '[]') issues.push('missing_technique');
  if (hasImage && !String(row.image_license ?? '').trim()) issues.push('missing_license');
  return issues;
}

function evidenceFor(row, category) {
  const text = normalize([
    row.title,row.subtitle,row.description,row.culture,row.country,row.continent,row.tags,row.themes,row.materials,row.techniques,row.metadata,
  ].filter(Boolean).join(' '));
  return TERMS[category].filter((term) => hasAny(text, [term])).slice(0, 10);
}

function autoFacetsFor(row) {
  const facets = [];
  const nameText = normalize(`${row.title ?? ''} ${row.subtitle ?? ''}`);
  if (VERIFIED_MOTHERS.some((name) => nameText.includes(normalize(name)))) facets.push(FACETS.women);
  if (evidenceFor(row, 'animalities').length) facets.push(FACETS.animalities);
  if (evidenceFor(row, 'beyond').length) facets.push(FACETS.beyond);
  return facets;
}

function primaryFacetsFromExisting(entityFacets) {
  const out = [];
  for (const [category, legacy] of Object.entries(LEGACY_FACETS)) {
    if (entityFacets.has(FACETS[category]) || legacy.some((facet) => entityFacets.has(facet))) out.push(FACETS[category]);
  }
  return out;
}

function regionIsCoherent(regionId, country) {
  const tokens = REGION_COUNTRY_TOKENS[regionId];
  if (!tokens?.length) return true;
  const normalizedCountry = normalize(country);
  return tokens.some((token) => normalizedCountry.includes(normalize(token)));
}

async function batchWrite(statements) {
  for (let i = 0; i < statements.length; i += WRITE_BATCH) {
    await db.batch(statements.slice(i, i + WRITE_BATCH), 'write');
  }
}

async function readAllFacets() {
  const byEntity = new Map();
  let lastEntity = '';
  let lastFacet = '';
  while (true) {
    const result = await db.execute({
      sql: `SELECT entity_id, facet_id
              FROM entity_facets
             WHERE entity_id > ?
                OR (entity_id = ? AND facet_id > ?)
             ORDER BY entity_id, facet_id
             LIMIT ?`,
      args: [lastEntity, lastEntity, lastFacet, PAGE_SIZE * 4],
    });
    if (!result.rows.length) break;
    for (const row of result.rows) {
      const entityId = String(row.entity_id);
      const facetId = String(row.facet_id);
      if (!byEntity.has(entityId)) byEntity.set(entityId, new Set());
      byEntity.get(entityId).add(facetId);
      lastEntity = entityId;
      lastFacet = facetId;
    }
    if (result.rows.length < PAGE_SIZE * 4) break;
  }
  return byEntity;
}

async function readRegions() {
  const result = await db.execute(`SELECT id,parent_id,continent FROM regions ORDER BY id`);
  const parent = new Map();
  const continent = new Map();
  for (const row of result.rows) {
    parent.set(String(row.id), row.parent_id ? String(row.parent_id) : null);
    continent.set(String(row.id), String(row.continent ?? ''));
  }
  const ancestorsCache = new Map();
  function ancestors(id) {
    if (!id) return [];
    if (ancestorsCache.has(id)) return ancestorsCache.get(id);
    const out = [];
    let current = id;
    const seen = new Set();
    while (current && !seen.has(current)) {
      out.push(current);
      seen.add(current);
      current = parent.get(current) ?? null;
    }
    ancestorsCache.set(id, out);
    return out;
  }
  return { parent, continent, ancestors };
}

async function main() {
  console.log('Atlas: reconstruindo índices materiais e estatísticas com uma única leitura linear do acervo.');
  const facetsByEntity = await readAllFacets();
  const regionModel = await readRegions();

  const entities = [];
  const imageCounts = new Map();
  const imageCanonical = new Map();
  const signatureCounts = new Map();
  const signatureCanonical = new Map();
  const metrics = new Map();
  const typeStats = new Map();
  const regionStats = new Map();
  const continentStats = new Map();
  const regionTimeline = new Map();
  const regionFacetStats = new Map();
  const facetStats = new Map();
  const qualityIssueRows = [];
  const candidateRows = [];
  const autoFacetStatements = [];

  let cursor = '';
  let scanned = 0;
  while (true) {
    const result = await db.execute({
      sql: `SELECT id,entity_type,title,subtitle,description,date_start,date_display,country,continent,culture,
                   region_id,image_url,image_license,open_image,source_url,tags,themes,materials,techniques,metadata,status
              FROM entities
             WHERE id > ?
             ORDER BY id
             LIMIT ?`,
      args: [cursor, PAGE_SIZE],
    });
    if (!result.rows.length) break;

    for (const raw of result.rows) {
      const row = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v]));
      const id = String(row.id);
      cursor = id;
      scanned += 1;
      const status = String(row.status ?? '');
      const hasImage = Boolean(String(row.image_url ?? '').trim());
      const imageKey = hasImage ? cleanKey(row.image_url) : '';
      const signatureKey = [row.title,row.subtitle,row.date_display,row.entity_type,row.country,row.culture].map(cleanKey).join('|');
      entities.push({ id, status, hasImage, imageKey, signatureKey, row });

      if (status !== 'published') {
        if (status === 'review') {
          for (const issue of qualityIssues(row)) qualityIssueRows.push({ entityId: id, issue });
        }
        continue;
      }

      increment(metrics, 'published');
      if (hasImage) {
        increment(metrics, 'published_with_image');
        increment(imageCounts, imageKey);
        if (!imageCanonical.has(imageKey) || id < imageCanonical.get(imageKey)) imageCanonical.set(imageKey, id);
      } else {
        increment(metrics, 'published_without_image');
        increment(signatureCounts, signatureKey);
        if (!signatureCanonical.has(signatureKey) || id < signatureCanonical.get(signatureKey)) signatureCanonical.set(signatureKey, id);
      }
      if (id.startsWith('aic-')) {
        increment(metrics, 'aic_public_domain');
        increment(metrics, hasImage ? 'aic_with_image' : 'aic_without_image');
      }

      const type = String(row.entity_type ?? 'outro');
      if (!typeStats.has(type)) typeStats.set(type, { published: 0, withImage: 0 });
      typeStats.get(type).published += 1;
      if (hasImage) typeStats.get(type).withImage += 1;

      const entityFacets = facetsByEntity.get(id) ?? new Set();
      for (const facetId of [...new Set([...primaryFacetsFromExisting(entityFacets), ...autoFacetsFor(row)])]) {
        if (!entityFacets.has(facetId)) {
          entityFacets.add(facetId);
          if (!facetsByEntity.has(id)) facetsByEntity.set(id, entityFacets);
          autoFacetStatements.push({ sql: `INSERT OR IGNORE INTO entity_facets(entity_id,facet_id) VALUES (?,?)`, args: [id, facetId] });
        }
      }

      for (const [category, facetId] of Object.entries(FACETS)) {
        if (entityFacets.has(facetId)) continue;
        const evidence = evidenceFor(row, category);
        if (evidence.length) candidateRows.push({ entityId: id, facetId, evidence });
      }

      for (const issue of qualityIssues(row)) qualityIssueRows.push({ entityId: id, issue });

      const regionId = row.region_id ? String(row.region_id) : '';
      const ancestors = regionIsCoherent(regionId, row.country) ? regionModel.ancestors(regionId) : [];
      for (const rid of ancestors) {
        if (!regionStats.has(rid)) regionStats.set(rid, { published: 0, withImage: 0 });
        regionStats.get(rid).published += 1;
        if (hasImage) regionStats.get(rid).withImage += 1;
        if (Number.isFinite(Number(row.date_start))) {
          const year = Number(row.date_start);
          const bucket = Math.trunc(year / 500) * 500;
          nestedIncrement(regionTimeline, rid, bucket, 1);
        }
        for (const facetId of entityFacets) nestedIncrement(regionFacetStats, rid, facetId, 1);
      }

      const continent = String(row.continent ?? '').trim();
      if (continent) {
        if (!continentStats.has(continent)) continentStats.set(continent, { published: 0, withImage: 0 });
        continentStats.get(continent).published += 1;
        if (hasImage) continentStats.get(continent).withImage += 1;
      }

      for (const facetId of entityFacets) {
        if (!facetStats.has(facetId)) facetStats.set(facetId, { published: 0, withImage: 0 });
        facetStats.get(facetId).published += 1;
        if (hasImage) facetStats.get(facetId).withImage += 1;
      }

      if (hasImage && ![...entityFacets].some((facet) => PRIMARY_FACETS.has(facet))) increment(metrics, 'traditional_with_image');
    }

    if (scanned % 10000 === 0) console.log(`  ${scanned.toLocaleString('pt-BR')} entidades lidas...`);
    if (result.rows.length < PAGE_SIZE) break;
  }

  // Facetas temáticas detectadas são persistidas uma única vez; identidades ficam como candidatas para revisão.
  await batchWrite(autoFacetStatements);

  const uniqueImages = imageCounts.size;
  metrics.set('unique_images', uniqueImages);
  metrics.set('duplicate_groups', [...imageCounts.values()].filter((n) => n > 1).length + [...signatureCounts.values()].filter((n) => n > 1).length);
  metrics.set('total_records', scanned);

  for (const issue of ['suspect_image','missing_source','missing_attribution','missing_technique','missing_license']) {
    metrics.set(issue, qualityIssueRows.filter((row) => row.issue === issue).length);
  }
  for (const facetId of Object.values(FACETS)) {
    metrics.set(`candidate:${facetId}`, candidateRows.filter((row) => row.facetId === facetId).length);
  }

  const quality = await db.execute(`SELECT quality_status, COUNT(*) AS total FROM entity_quality GROUP BY quality_status`);
  for (const row of quality.rows) metrics.set(String(row.quality_status), Number(row.total ?? 0));

  const supportTables = [
    'atlas_metrics','atlas_type_stats','atlas_facet_stats','atlas_region_stats','atlas_continent_stats',
    'atlas_region_timeline','atlas_region_facet_stats','atlas_quality_issues',
    'entity_facet_candidates','entity_dedupe_index',
  ];
  for (const table of supportTables) await db.execute(`DELETE FROM ${table}`);

  const nowSql = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
  const writes = [];
  for (const [key, value] of metrics) writes.push({
    sql: `INSERT INTO atlas_metrics(key,value,updated_at) VALUES (?,?,${nowSql})
          ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
    args: [key, Number(value ?? 0)],
  });
  for (const [entityType, value] of typeStats) writes.push({
    sql: `INSERT INTO atlas_type_stats(entity_type,published_count,with_image_count,updated_at) VALUES (?,?,?,${nowSql})`,
    args: [entityType, value.published, value.withImage],
  });
  for (const [facetId, value] of facetStats) writes.push({
    sql: `INSERT INTO atlas_facet_stats(facet_id,published_count,with_image_count,updated_at) VALUES (?,?,?,${nowSql})`,
    args: [facetId, value.published, value.withImage],
  });
  for (const [regionId, value] of regionStats) writes.push({
    sql: `INSERT INTO atlas_region_stats(region_id,published_count,with_image_count,updated_at) VALUES (?,?,?,${nowSql})`,
    args: [regionId, value.published, value.withImage],
  });
  for (const [continent, value] of continentStats) writes.push({
    sql: `INSERT INTO atlas_continent_stats(continent,published_count,with_image_count,updated_at) VALUES (?,?,?,${nowSql})`,
    args: [continent, value.published, value.withImage],
  });
  for (const [regionId, buckets] of regionTimeline) {
    for (const [bucket, total] of buckets) writes.push({
      sql: `INSERT INTO atlas_region_timeline(region_id,bucket,total) VALUES (?,?,?)`, args: [regionId, bucket, total],
    });
  }
  for (const [regionId, facets] of regionFacetStats) {
    for (const [facetId, total] of facets) writes.push({
      sql: `INSERT INTO atlas_region_facet_stats(region_id,facet_id,total) VALUES (?,?,?)`, args: [regionId, facetId, total],
    });
  }
  for (const item of qualityIssueRows) writes.push({
    sql: `INSERT OR IGNORE INTO atlas_quality_issues(entity_id,issue) VALUES (?,?)`, args: [item.entityId, item.issue],
  });
  for (const item of candidateRows) writes.push({
    sql: `INSERT OR IGNORE INTO entity_facet_candidates(entity_id,facet_id,evidence) VALUES (?,?,?)`,
    args: [item.entityId, item.facetId, JSON.stringify(item.evidence)],
  });
  for (const item of entities) {
    const isCanonical = item.imageKey
      ? imageCanonical.get(item.imageKey) === item.id
      : signatureCanonical.get(item.signatureKey) === item.id;
    writes.push({
      sql: `INSERT INTO entity_dedupe_index(entity_id,image_key,signature_key,is_canonical) VALUES (?,?,?,?)`,
      args: [item.id, item.imageKey || null, item.signatureKey || null, isCanonical ? 1 : 0],
    });
  }

  await batchWrite(writes);

  console.log(`Índices reconstruídos com ${scanned.toLocaleString('pt-BR')} leituras lineares de entidades.`);
  console.log(`Imagens únicas: ${uniqueImages.toLocaleString('pt-BR')}.`);
  console.log(`Candidatos curatoriais: ${candidateRows.length.toLocaleString('pt-BR')}.`);
  console.log(`Problemas de qualidade indexados: ${qualityIssueRows.length.toLocaleString('pt-BR')}.`);
  console.log('As páginas do site agora consultam tabelas-resumo pequenas, sem recalcular COUNT/GROUP BY a cada acesso.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
