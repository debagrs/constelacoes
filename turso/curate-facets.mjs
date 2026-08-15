import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url || !authToken) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');

const db = createClient({ url, authToken });

const FACETS = {
  women: 'curadoria:mulheres-e-maes',
  indigenous: 'curadoria:indigenas',
  black: 'curadoria:negros-e-diasporas',
  lgbtqia: 'curadoria:lgbtqia',
  animalities: 'curadoria:bioetica-e-animalidades',
  beyond: 'curadoria:alem-do-antropoceno',
};

const VERIFIED_WOMEN = [
  'artemisia gentileschi','lavinia fontana','berthe morisot','suzanne valadon','käthe kollwitz','kathe kollwitz',
  'barbara hepworth','ruth asawa','alice neel','faith ringgold','betye saar','elizabeth catlett','sally mann',
  'mary kelly','niki de saint phalle','yoko ono','graciela iturbide','tarsila do amaral','tomie ohtake',
  'lygia clark','anna maria maiolino','ana maria maiolino','patricia piccinini',
];

const TERMS = {
  indigenous: [
    'indigenous','indígena','indigena','native american','first nations','aboriginal','aborígene','aborigene','inuit','maori','māori',
    'mapuche','maya','mayan','navajo','diné','dine','hopi','lakota','cherokee','yanomami','xavante','guarani','tupi','tikuna','ashaninka',
    'pueblo people','native peoples','american indian','first peoples',
  ],
  black: [
    'african american','african-american','afro-american','afro american','black artist','black art','negro','negra','afro-brasil','afro brasil',
    'afro-brazil','afro brazil','afro-caribbean','afro caribbean','afro-diaspora','african diaspora','diáspora africana','diaspora africana',
    'quilomb','harlem renaissance','african art','arts of africa','yoruba','yorùbá','kongo','benin','akan','ashanti','ethiopian','nigerian','ghanaian',
  ],
  lgbtqia: ['lgbt','lgbtq','queer','lesbian','gay artist','gay culture','transgender','trans artist','nonbinary','non-binary','homosexual'],
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

function hasAny(text, terms) {
  return terms.some((term) => {
    const needle = normalize(term);
    if (!needle) return false;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
  });
}

await db.batch([
  { sql: `INSERT OR IGNORE INTO facets (id,kind,name,summary) VALUES (?,?,?,?)`, args: [FACETS.women,'curadoria','Mulheres e mães','Pertinência documentada à lente Mulheres e mães.'] },
  { sql: `INSERT OR IGNORE INTO facets (id,kind,name,summary) VALUES (?,?,?,?)`, args: [FACETS.indigenous,'curadoria','Indígenas','Pertinência documentada à lente Indígenas.'] },
  { sql: `INSERT OR IGNORE INTO facets (id,kind,name,summary) VALUES (?,?,?,?)`, args: [FACETS.black,'curadoria','Negros e diásporas','Pertinência documentada à lente Negros e diásporas.'] },
  { sql: `INSERT OR IGNORE INTO facets (id,kind,name,summary) VALUES (?,?,?,?)`, args: [FACETS.lgbtqia,'curadoria','LGBTQIA+','Pertinência documentada à lente LGBTQIA+.'] },
  { sql: `INSERT OR IGNORE INTO facets (id,kind,name,summary) VALUES (?,?,?,?)`, args: [FACETS.animalities,'curadoria','Bioética e animalidades','Bioética, animalidades, multiespécies e mais-que-humano.'] },
  { sql: `INSERT OR IGNORE INTO facets (id,kind,name,summary) VALUES (?,?,?,?)`, args: [FACETS.beyond,'curadoria','Além do Antropoceno','Ecologias, pós-humanismos, plantas, fungos, água, clima e cosmotécnicas.'] },
], 'write');

let offset = 0;
let classified = 0;
const limit = 500;
while (true) {
  const result = await db.execute({
    sql: `SELECT id,title,subtitle,description,culture,country,tags,themes,materials,techniques,metadata
            FROM entities WHERE status='published' ORDER BY id LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  if (!result.rows.length) break;
  const statements = [];
  for (const row of result.rows) {
    const text = normalize([
      row.title,row.subtitle,row.description,row.culture,row.country,row.tags,row.themes,row.materials,row.techniques,row.metadata,
    ].filter(Boolean).join(' '));
    const nameText = normalize(`${row.title ?? ''} ${row.subtitle ?? ''}`);
    const facets = new Set();
    if (VERIFIED_WOMEN.some((name) => nameText.includes(normalize(name))) || /"artist_gender"\s*:\s*"?female/i.test(String(row.metadata ?? ''))) {
      facets.add(FACETS.women);
    }
    if (hasAny(text, TERMS.indigenous)) facets.add(FACETS.indigenous);
    if (hasAny(text, TERMS.black)) facets.add(FACETS.black);
    if (hasAny(text, TERMS.lgbtqia)) facets.add(FACETS.lgbtqia);
    if (hasAny(text, TERMS.animalities)) facets.add(FACETS.animalities);
    if (hasAny(text, TERMS.beyond)) facets.add(FACETS.beyond);
    for (const facet of facets) {
      statements.push({ sql: `INSERT OR IGNORE INTO entity_facets(entity_id,facet_id) VALUES (?,?)`, args: [String(row.id), facet] });
      classified += 1;
    }
  }
  for (let i = 0; i < statements.length; i += 200) {
    await db.batch(statements.slice(i, i + 200), 'write');
  }
  offset += result.rows.length;
  if (result.rows.length < limit) break;
}

console.log(`Reclassificação concluída: ${classified} vínculos de faceta confirmados por metadados documentais.`);
