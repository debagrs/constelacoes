/**
 * Atlas Planetário — sincronização integral das obras em domínio público do
 * Art Institute of Chicago (AIC) a partir do dump oficial.
 *
 * Princípios:
 * - não existe mais meta artificial de 10 mil / 20 mil / 30 mil;
 * - importa TODO registro do dump com is_public_domain === true;
 * - obras sem image_id permanecem como registros documentais no Turso;
 * - obras com image_id recebem URL IIIF oficial (a imagem não é copiada para o Turso);
 * - IDs institucionais `aic-<id>` tornam a sincronização idempotente;
 * - o cursor é persistido para retomar uma execução interrompida;
 * - classificações identitárias não são inferidas por aparência.
 *
 * Variáveis de ambiente:
 *   TURSO_DATABASE_URL
 *   TURSO_AUTH_TOKEN
 *   AIC_DATA_DIR=/tmp/aic-data
 *   ATLAS_RESET_AIC_CURSOR=false
 *   ATLAS_AIC_BATCH=400
 */
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

const databaseUrl = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
const AIC_DATA_DIR = process.env.AIC_DATA_DIR?.trim();
const RESET_CURSOR = String(process.env.ATLAS_RESET_AIC_CURSOR ?? 'false').toLowerCase() === 'true';
const FILE_BATCH = Math.max(100, Math.min(Number(process.env.ATLAS_AIC_BATCH ?? 400), 1000));

if (!databaseUrl || !authToken) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
if (!AIC_DATA_DIR || !fs.existsSync(AIC_DATA_DIR)) {
  throw new Error('AIC_DATA_DIR não existe. Baixe e extraia o dump oficial do Art Institute antes de executar a ingestão.');
}

const db = createClient({ url: databaseUrl, authToken });

const FACETS = {
  women: 'curadoria:mulheres-e-maes',
  indigenous: 'curadoria:indigenas',
  black: 'curadoria:negros-e-diasporas',
  lgbtqia: 'curadoria:lgbtqia',
  animalities: 'curadoria:bioetica-e-animalidades',
  beyond: 'curadoria:alem-do-antropoceno',
};

const VERIFIED_MOTHERS = [
  'Artemisia Gentileschi',
  'Lavinia Fontana',
  'Berthe Morisot',
  'Suzanne Valadon',
  'Käthe Kollwitz',
  'Kathe Kollwitz',
  'Barbara Hepworth',
  'Ruth Asawa',
  'Alice Neel',
  'Faith Ringgold',
  'Betye Saar',
  'Elizabeth Catlett',
  'Sally Mann',
  'Mary Kelly',
  'Niki de Saint Phalle',
  'Yoko Ono',
  'Graciela Iturbide',
  'Tarsila do Amaral',
  'Tomie Ohtake',
  'Lygia Clark',
  'Anna Maria Maiolino',
  'Ana Maria Maiolino',
  'Patricia Piccinini',
];

const TERMS = {
  women: ['motherhood','maternity','mother and child','maternal','maternidade','mãe','mae'],
  indigenous: [
    'indigenous','native american','first nations','aboriginal','inuit','māori','maori','mapuche','maya','mayan',
    'navajo','diné','dine','hopi','lakota','cherokee','pueblo','yanomami','guarani','xavante','tikuna','ashaninka',
    'american indian','native peoples','first peoples',
  ],
  black: [
    'african american','african-american','african diaspora','afro-caribbean','afro caribbean','black art',
    'harlem renaissance','yoruba','yorùbá','kongo','benin','akan','ashanti','afro-brazil','afro brazil','afro-brasil',
    'quilomb','arts of africa',
  ],
  lgbtqia: ['lgbt','lgbtq','queer','lesbian','gay culture','transgender','nonbinary','non-binary'],
  animalities: [
    'animal','animals','fauna','zoolog','cat','cats','dog','dogs','horse','horses','bird','birds','fish','whale',
    'insect','butterfly','beetle','elephant','cattle','cow','pig','sheep','goat','deer','lion','tiger','monkey',
    'multispecies','more-than-human','nonhuman','bioart','bio art',
  ],
  beyond: [
    'anthropocene','capitalocene','plantationocene','chthulucene','posthuman','ecology','ecological','environment',
    'environmental','climate','forest','ocean','river','water','botanical','plant','plants','tree','trees','fungi',
    'fungus','mushroom','soil','mineral','geology','landscape','extinction','biodiversity','natural history',
    'more-than-human','multispecies',
  ],
};

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text, terms) {
  return terms.some((term) => {
    const needle = normalize(term);
    if (!needle) return false;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
  });
}

function cleanText(value, max = 2500) {
  if (!value) return null;
  const text = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, max) : null;
}

function uniq(values, max = 80) {
  return [...new Set((values ?? []).filter(Boolean).map((v) => String(v).trim()).filter(Boolean))].slice(0, max);
}

function inferContinent(place) {
  const p = normalize(place);
  if (!p) return null;
  if (/(brazil|brasil|argentina|chile|peru|colombia|uruguay|paraguay|bolivia|ecuador|venezuela|guyana|suriname)/.test(p)) return 'América do Sul';
  if (/(mexico|canada|united states|usa|greenland)/.test(p)) return 'América do Norte';
  if (/(guatemala|belize|honduras|el salvador|nicaragua|costa rica|panama|caribbean|cuba|haiti|jamaica|puerto rico)/.test(p)) return 'América Central';
  if (/(france|italy|spain|portugal|germany|austria|belgium|netherlands|england|united kingdom|ireland|scotland|switzerland|greece|poland|ukraine|russia|sweden|norway|denmark|finland|czech|bohemia|hungary|romania|serbia|croatia)/.test(p)) return 'Europa';
  if (/(china|japan|korea|india|thailand|cambodia|vietnam|indonesia|philippines|nepal|tibet|mongolia|iran|iraq|syria|lebanon|israel|palestine|turkey|afghanistan|pakistan|sri lanka)/.test(p)) return 'Ásia';
  if (/(egypt|morocco|algeria|tunisia|ethiopia|kenya|nigeria|ghana|senegal|mali|congo|south africa|zimbabwe|uganda|tanzania|sudan|benin)/.test(p)) return 'África';
  if (/(australia|new zealand|papua|polynesia|melanesia|micronesia|oceania)/.test(p)) return 'Oceania';
  return null;
}

function inferCountry(place) {
  const p = normalize(place);
  const pairs = [
    [/\b(brazil|brasil)\b/, 'Brasil'], [/\bfrance\b/, 'França'], [/\bitaly\b/, 'Itália'], [/\bspain\b/, 'Espanha'],
    [/\bportugal\b/, 'Portugal'], [/\bgermany\b/, 'Alemanha'], [/\baustria\b/, 'Áustria'], [/\bbelgium\b/, 'Bélgica'],
    [/\bnetherlands\b/, 'Países Baixos'], [/\b(united kingdom|england|scotland)\b/, 'Reino Unido'], [/\bireland\b/, 'Irlanda'],
    [/\bswitzerland\b/, 'Suíça'], [/\bgreece\b/, 'Grécia'], [/\bpoland\b/, 'Polônia'], [/\bchina\b/, 'China'], [/\bjapan\b/, 'Japão'],
    [/\b(korea|south korea)\b/, 'Coreia'], [/\bindia\b/, 'Índia'], [/\bindonesia\b/, 'Indonésia'], [/\bphilippines\b/, 'Filipinas'],
    [/\begypt\b/, 'Egito'], [/\bmali\b/, 'Mali'], [/\bnigeria\b/, 'Nigéria'], [/\bghana\b/, 'Gana'], [/\bethiopia\b/, 'Etiópia'],
    [/\bsouth africa\b/, 'África do Sul'], [/\baustralia\b/, 'Austrália'], [/\bnew zealand\b/, 'Nova Zelândia'],
    [/\bunited states\b|\busa\b/, 'Estados Unidos'], [/\bcanada\b/, 'Canadá'], [/\bmexico\b/, 'México'],
    [/\bargentina\b/, 'Argentina'], [/\bchile\b/, 'Chile'], [/\bperu\b/, 'Peru'], [/\bcolombia\b/, 'Colômbia'],
  ];
  for (const [pattern, country] of pairs) if (pattern.test(p)) return country;
  return null;
}

function discoverArtworkFiles(root) {
  const artworkDirs = [];
  function visit(dir, depth = 0) {
    if (depth > 8) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === 'artworks') artworkDirs.push(full);
      else visit(full, depth + 1);
    }
  }
  visit(root);

  // O dump oficial hoje usa arquivos {id}.json dentro de json/artworks.
  // A coleta abaixo também aceita subpastas, para não quebrar se a estrutura
  // do dump for particionada no futuro.
  const files = [];
  function collectJson(dir, depth = 0) {
    if (depth > 5) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collectJson(full, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.json')) files.push(full);
    }
  }
  for (const dir of artworkDirs) collectJson(dir);

  files.sort((a, b) => {
    const na = Number(path.basename(a, '.json'));
    const nb = Number(path.basename(b, '.json'));
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  });
  return files;
}

function findConfig(root) {
  const candidates = [
    path.join(root, 'json', 'config.json'),
    path.join(root, 'artic-api-data', 'json', 'config.json'),
    path.join(root, 'config.json'),
  ];
  for (const filename of candidates) {
    if (!fs.existsSync(filename)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
      const iiif = parsed?.iiif_url || parsed?.data?.iiif_url || parsed?.config?.iiif_url;
      if (typeof iiif === 'string' && iiif.startsWith('http')) return iiif.replace(/\/$/, '');
    } catch { /* fallback abaixo */ }
  }
  return 'https://www.artic.edu/iiif/2';
}

function readRecord(filename) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
    return parsed?.data && !Array.isArray(parsed.data) ? parsed.data : parsed;
  } catch (error) {
    console.warn(`Ignorando ${path.basename(filename)}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function facetsFromItem(item) {
  const facets = new Set();
  const artist = normalize(`${item.artist_title ?? ''} ${item.artist_display ?? ''}`);
  if (VERIFIED_MOTHERS.some((name) => artist.includes(normalize(name)))) facets.add(FACETS.women);

  const text = normalize([
    item.title, item.artist_title, item.artist_display, item.place_of_origin, item.description, item.short_description,
    item.medium_display, ...(item.classification_titles ?? []), ...(item.subject_titles ?? []), ...(item.style_titles ?? []),
    ...(item.material_titles ?? []), ...(item.technique_titles ?? []), ...(item.theme_titles ?? []),
    ...(item.category_titles ?? []), ...(item.term_titles ?? []),
  ].filter(Boolean).join(' '));

  // Identidades/pertencimentos não são inferidos por palavras soltas do objeto.
  // Mulheres/mães só entra automaticamente quando a maternidade já foi documentada
  // no núcleo verificado. Indígenas, negros/diásporas e LGBTQIA+ vão para a fila
  // de candidatos do refresh-atlas-indexes e exigem revisão curatorial.
  if (hasAny(text, TERMS.animalities)) facets.add(FACETS.animalities);
  if (hasAny(text, TERMS.beyond)) facets.add(FACETS.beyond);
  return [...facets];
}

function statementsForItem(item, iiifBase) {
  if (!item?.id || item.is_public_domain !== true) return [];

  const id = `aic-${item.id}`;
  const imageUrl = item.image_id ? `${iiifBase}/${item.image_id}/full/843,/0/default.jpg` : null;
  const sourceUrl = `https://www.artic.edu/artworks/${item.id}`;
  const artist = item.artist_display || item.artist_title || null;
  const title = item.title || 'Sem título';
  const description = cleanText(item.short_description) || cleanText(item.description) || `${title}${artist ? ` — ${artist}` : ''}.`;
  const tags = uniq([
    ...(item.classification_titles ?? []), ...(item.subject_titles ?? []), ...(item.style_titles ?? []),
    ...(item.category_titles ?? []), ...(item.term_titles ?? []),
  ]);
  const themes = uniq(item.theme_titles ?? []);
  const materials = uniq(item.material_titles?.length ? item.material_titles : (item.medium_display ? [item.medium_display] : []));
  const techniques = uniq(item.technique_titles ?? []);
  const place = item.place_of_origin || null;
  const country = inferCountry(place);
  const continent = inferContinent(place);
  const facets = facetsFromItem(item);

  const metadata = {
    source: 'Art Institute of Chicago — public data dump',
    source_type: 'institutional_museum_dump',
    aic_id: item.id,
    aic_api_url: item.api_link || `https://api.artic.edu/api/v1/artworks/${item.id}`,
    aic_artwork_url: sourceUrl,
    public_domain: true,
    image_id: item.image_id ?? null,
    image_iiif: Boolean(item.image_id),
    image_linked_not_copied: true,
    main_reference_number: item.main_reference_number ?? null,
    artist_id: item.artist_id ?? null,
    artist_ids: uniq(item.artist_ids ?? [], 20),
    artist_title: item.artist_title ?? null,
    department: item.department_title ?? null,
    artwork_type: item.artwork_type_title ?? null,
    dimensions: item.dimensions ?? null,
    medium_display: item.medium_display ?? null,
    credit_line: item.credit_line ?? null,
    classification_titles: uniq(item.classification_titles ?? []),
    subject_titles: uniq(item.subject_titles ?? []),
    style_titles: uniq(item.style_titles ?? []),
    material_titles: uniq(item.material_titles ?? []),
    technique_titles: uniq(item.technique_titles ?? []),
    theme_titles: uniq(item.theme_titles ?? []),
    category_titles: uniq(item.category_titles ?? []),
    term_titles: uniq(item.term_titles ?? []),
    curatorial_facets_from_documented_metadata: facets,
    synced_from_aic_dump: true,
  };

  const statements = [{
    sql: `INSERT INTO entities (
      id,entity_type,title,subtitle,description,date_start,date_end,date_display,location,country,continent,culture,
      image_url,image_license,open_image,source_url,tags,themes,materials,techniques,metadata,status,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'published',
      strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    ON CONFLICT(id) DO UPDATE SET
      image_url=excluded.image_url,
      image_license=excluded.image_license,
      open_image=excluded.open_image,
      source_url=excluded.source_url,
      location=COALESCE(NULLIF(entities.location,''),excluded.location),
      country=COALESCE(NULLIF(entities.country,''),excluded.country),
      continent=COALESCE(NULLIF(entities.continent,''),excluded.continent),
      tags=CASE WHEN entities.tags IS NULL OR trim(entities.tags)='' OR trim(entities.tags)='[]' THEN excluded.tags ELSE entities.tags END,
      themes=CASE WHEN entities.themes IS NULL OR trim(entities.themes)='' OR trim(entities.themes)='[]' THEN excluded.themes ELSE entities.themes END,
      materials=CASE WHEN entities.materials IS NULL OR trim(entities.materials)='' OR trim(entities.materials)='[]' THEN excluded.materials ELSE entities.materials END,
      techniques=CASE WHEN entities.techniques IS NULL OR trim(entities.techniques)='' OR trim(entities.techniques)='[]' THEN excluded.techniques ELSE entities.techniques END,
      metadata=excluded.metadata,
      status='published',
      updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    args: [
      id,'obra',title,artist,description,item.date_start ?? null,item.date_end ?? null,item.date_display ?? null,
      place,country,continent,null,imageUrl,imageUrl ? 'Domínio público — Art Institute of Chicago' : null,
      imageUrl ? 1 : 0,sourceUrl,JSON.stringify(tags),JSON.stringify(themes),JSON.stringify(materials),JSON.stringify(techniques),JSON.stringify(metadata),
    ],
  }];

  for (const facet of facets) {
    statements.push({
      sql: `INSERT OR IGNORE INTO entity_facets(entity_id,facet_id) VALUES (?,?)`,
      args: [id, facet],
    });
  }
  return statements;
}

async function ensureSupportSchema() {
  await db.batch([
    { sql: `CREATE TABLE IF NOT EXISTS atlas_import_state (
      source TEXT PRIMARY KEY,
      cursor INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_entities_image_url ON entities(image_url)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_entities_status_type ON entities(status,entity_type)` },
    { sql: `INSERT OR IGNORE INTO facets(id,kind,name,summary) VALUES
      ('curadoria:mulheres-e-maes','curadoria','Mulheres e mães','Lente curatorial documentada.'),
      ('curadoria:indigenas','curadoria','Indígenas','Lente curatorial documentada.'),
      ('curadoria:negros-e-diasporas','curadoria','Negros e diásporas','Lente curatorial documentada.'),
      ('curadoria:lgbtqia','curadoria','LGBTQIA+','Lente curatorial documentada.'),
      ('curadoria:bioetica-e-animalidades','curadoria','Bioética e animalidades','Bioética, animalidades e relações mais-que-humanas.'),
      ('curadoria:alem-do-antropoceno','curadoria','Além do Antropoceno','Ecologias, pós-humanismos e relações mais-que-humanas.')` },
  ], 'write');
}


async function main() {
  await ensureSupportSchema();
  const files = discoverArtworkFiles(AIC_DATA_DIR);
  if (!files.length) throw new Error(`Nenhum JSON de artworks foi localizado dentro de ${AIC_DATA_DIR}.`);

  const iiifBase = findConfig(AIC_DATA_DIR);
  console.log(`Dump AIC: ${files.length.toLocaleString('pt-BR')} arquivos de artworks encontrados.`);
  console.log(`IIIF: ${iiifBase}`);
  console.log('Modo de baixo consumo: sem COUNT/GROUP BY do acervo remoto durante a carga.');

  let cursor = 0;
  if (!RESET_CURSOR) {
    const state = await db.execute({ sql: `SELECT cursor FROM atlas_import_state WHERE source='aic_public_domain_full'`, args: [] });
    cursor = Number(state.rows[0]?.cursor ?? 0);
    if (!Number.isFinite(cursor) || cursor < 0) cursor = 0;
  }
  if (RESET_CURSOR) cursor = 0;
  if (!RESET_CURSOR && cursor >= files.length) {
    console.log('O dump AIC já foi percorrido integralmente. Nada a reimportar; use reset_cursor=true apenas se quiser uma ressincronização completa.');
    return;
  }

  let publicDomainSeen = 0;
  let withImageSeen = 0;
  let withoutImageSeen = 0;
  let malformed = 0;

  while (cursor < files.length) {
    const end = Math.min(files.length, cursor + FILE_BATCH);
    const statements = [];

    for (let i = cursor; i < end; i += 1) {
      const item = readRecord(files[i]);
      if (!item) { malformed += 1; continue; }
      if (item.is_public_domain !== true) continue;
      publicDomainSeen += 1;
      if (item.image_id) withImageSeen += 1;
      else withoutImageSeen += 1;
      statements.push(...statementsForItem(item, iiifBase));
    }

    for (let i = 0; i < statements.length; i += 180) {
      await db.batch(statements.slice(i, i + 180), 'write');
    }

    cursor = end;
    await db.execute({
      sql: `INSERT INTO atlas_import_state(source,cursor,updated_at)
            VALUES('aic_public_domain_full',?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            ON CONFLICT(source) DO UPDATE SET cursor=excluded.cursor,updated_at=excluded.updated_at`,
      args: [cursor],
    });

    if (cursor % (FILE_BATCH * 10) === 0 || cursor === files.length) {
      console.log(`Progresso: ${cursor.toLocaleString('pt-BR')}/${files.length.toLocaleString('pt-BR')} arquivos; domínio público nesta execução: ${publicDomainSeen.toLocaleString('pt-BR')}.`);
    }
  }

  console.log(`\nLeitura do dump nesta execução:`);
  console.log(`Domínio público encontrados: ${publicDomainSeen.toLocaleString('pt-BR')}`);
  console.log(`Com image_id: ${withImageSeen.toLocaleString('pt-BR')}`);
  console.log(`Sem image_id: ${withoutImageSeen.toLocaleString('pt-BR')}`);
  console.log(`JSONs malformados ignorados: ${malformed.toLocaleString('pt-BR')}`);
  console.log('Sincronização AIC concluída. O Turso guarda metadados e URLs; as imagens continuam hospedadas no IIIF do museu.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
