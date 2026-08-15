/**
 * Adiciona/atualiza um núcleo verificado de artistas mulheres e mães.
 *
 * Princípios:
 * - nunca cria uma imagem por busca livre de nome;
 * - resolve a imagem somente pelo item Wikidata correspondente ao ano de nascimento;
 * - registra a fonte que documenta a maternidade;
 * - não duplica artistas já existentes: procura título canônico e aliases;
 * - adiciona a lente curatorial "Mulheres e mães" e facetas documentais.
 *
 * Uso:
 *   npm run ingest:mulheres-maes
 */
import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
}

const USER_AGENT = 'AtlasPlanetarioUFSM/1.0 (curadoria academica; fonte: Wikidata/Wikimedia Commons)';

const ARTISTS = [
  {
    name: 'Artemisia Gentileschi', aliases: [], birth: 1593, death: 1654,
    country: 'Itália', continent: 'Europa', culture: 'Barroco italiano', region: 'italia',
    children: 'Maternidade documentada; teve cinco filhos.',
    note: 'Artista profissional do Barroco, com trajetória marcada por autonomia de ateliê, encomendas públicas e circulação entre Florença, Roma, Nápoles e Londres.',
    motherhoodSource: 'https://www.nationalgallery.org.uk/artists/artemisia-gentileschi',
  },
  {
    name: 'Lavinia Fontana', aliases: [], birth: 1552, death: 1614,
    country: 'Itália', continent: 'Europa', culture: 'Maneirismo bolonhês', region: 'italia',
    children: 'Maternidade documentada; teve onze filhos.',
    note: 'Pintora de retratos e encomendas religiosas que conciliou um ateliê profissional de grande projeção com a maternidade.',
    motherhoodSource: 'https://scma.smith.edu/blog/lavinia-fontana-renaissance-artist',
  },
  {
    name: 'Berthe Morisot', aliases: [], birth: 1841, death: 1895,
    country: 'França', continent: 'Europa', culture: 'Impressionismo', region: 'franca',
    children: 'Maternidade documentada; mãe de Julie Manet.',
    note: 'A filha Julie tornou-se presença recorrente em sua obra, articulando intimidade, infância, cotidiano e pintura impressionista.',
    motherhoodSource: 'https://new.artsmia.org/programs/teachers-and-students/teaching-the-arts/art-in-context/everyday-art',
  },
  {
    name: 'Suzanne Valadon', aliases: [], birth: 1865, death: 1938,
    country: 'França', continent: 'Europa', culture: 'Pós-impressionismo', region: 'franca',
    children: 'Maternidade documentada; mãe do pintor Maurice Utrillo.',
    note: 'De modelo a artista profissional, construiu uma trajetória própria na pintura e uma genealogia artística singular com o filho Maurice Utrillo.',
    motherhoodSource: 'https://www.musee-orangerie.fr/en/articles/maurice-utrillo-105467',
  },
  {
    name: 'Käthe Kollwitz', aliases: ['Kathe Kollwitz'], birth: 1867, death: 1945,
    country: 'Alemanha', continent: 'Europa', culture: 'Expressionismo e realismo social', region: 'europa-central',
    children: 'Maternidade documentada; mãe de Hans e Peter Kollwitz.',
    note: 'A perda do filho Peter na Primeira Guerra atravessou profundamente sua iconografia de luto, guerra, cuidado e resistência.',
    motherhoodSource: 'https://www.kollwitz.de/biography',
  },
  {
    name: 'Barbara Hepworth', aliases: [], birth: 1903, death: 1975,
    country: 'Reino Unido', continent: 'Europa', culture: 'Escultura moderna britânica', region: 'britanicas',
    children: 'Maternidade documentada; mãe de quatro filhos, incluindo trigêmeos.',
    note: 'A prática escultórica de Hepworth se desenvolveu em paralelo ao cuidado de quatro filhos, tensionando trabalho artístico, casa, corpo e espaço.',
    motherhoodSource: 'https://barbarahepworth.org.uk/biography/',
  },
  {
    name: 'Ruth Asawa', aliases: [], birth: 1926, death: 2013,
    country: 'Estados Unidos', continent: 'América do Norte', culture: 'Escultura e educação artística', region: 'america-do-norte',
    children: 'Maternidade documentada; mãe de seis filhos.',
    note: 'Produziu em casa enquanto criava seis filhos e fez da educação artística, da comunidade e do trabalho manual uma extensão de sua prática.',
    motherhoodSource: 'https://ruthasawa.com/life/',
  },
  {
    name: 'Alice Neel', aliases: [], birth: 1900, death: 1984,
    country: 'Estados Unidos', continent: 'América do Norte', culture: 'Retrato moderno e realismo social', region: 'america-do-norte',
    children: 'Maternidade documentada; teve filhas e filhos ao longo de sua trajetória.',
    note: 'Sua biografia e seus retratos atravessam maternidade, perda, gravidez, vida doméstica, classe e relações afetivas.',
    motherhoodSource: 'https://www.modernamuseet.se/en/malmo/exhibitions/alice-neel/alice-neel-biography/',
  },
  {
    name: 'Faith Ringgold', aliases: [], birth: 1930, death: 2024,
    country: 'Estados Unidos', continent: 'América do Norte', culture: 'Arte afro-americana e feminismo', region: 'afro-americano',
    children: 'Maternidade documentada; mãe de duas filhas.',
    note: 'Quilts narrativos, livros, pintura e ativismo articulam memória familiar, infância, raça, gênero e história negra.',
    motherhoodSource: 'https://www.moma.org/collection/artists/7066',
  },
  {
    name: 'Betye Saar', aliases: [], birth: 1926, death: 2026,
    country: 'Estados Unidos', continent: 'América do Norte', culture: 'Assemblage, arte negra e feminismo', region: 'afro-americano',
    children: 'Maternidade documentada; mãe de três filhas: Lezley, Alison e Tracye.',
    note: 'Maternidade, memória, ancestralidade e produção doméstica atravessam sua prática e a formação artística de suas filhas.',
    motherhoodSource: 'https://www.moma.org/collection/works/284134',
  },
  {
    name: 'Elizabeth Catlett', aliases: ['Elizabeth Catlett Mora'], birth: 1915, death: 2012,
    country: 'Estados Unidos/México', continent: 'América do Norte', culture: 'Escultura e gravura afro-diaspórica', region: 'mesoamerica',
    children: 'Maternidade documentada; mãe de três filhos.',
    note: 'Sua obra centrou mulheres negras, mães, trabalhadores e movimentos de emancipação nos Estados Unidos e no México.',
    motherhoodSource: 'https://nmwa.org/art/artists/elizabeth-catlett/',
  },
  {
    name: 'Sally Mann', aliases: [], birth: 1951, death: null,
    country: 'Estados Unidos', continent: 'América do Norte', culture: 'Fotografia contemporânea', region: 'america-do-norte',
    children: 'Maternidade documentada; mãe de Emmett, Jessie e Virginia.',
    note: 'A série familiar investiga infância, intimidade, memória, paisagem e os limites éticos entre vida privada e imagem pública.',
    motherhoodSource: 'https://www.getty.edu/art/exhibitions/sally_mann/inner.html',
  },
  {
    name: 'Mary Kelly', aliases: [], birth: 1941, death: null,
    country: 'Estados Unidos/Reino Unido', continent: 'América do Norte', culture: 'Arte conceitual feminista', region: 'america-do-norte',
    children: 'Maternidade documentada; Post-Partum Document acompanha o desenvolvimento de seu filho.',
    note: 'Transformou a relação mãe-filho em investigação conceitual, psicanalítica, documental e feminista.',
    motherhoodSource: 'https://www.moma.org/collection/works/402559',
  },
  {
    name: 'Niki de Saint Phalle', aliases: [], birth: 1930, death: 2002,
    country: 'França/Estados Unidos', continent: 'Europa', culture: 'Nouveau Réalisme, escultura e performance', region: 'franca',
    children: 'Maternidade documentada; mãe de Laura e Philip.',
    note: 'Sua trajetória articula corpo, feminismo, violência, monumentalidade, cuidado, infância e reinvenção de formas de vida.',
    motherhoodSource: 'https://nikidesaintphalle.org/niki-de-saint-phalle/biography/',
  },
  {
    name: 'Yoko Ono', aliases: [], birth: 1933, death: null,
    country: 'Japão/Estados Unidos', continent: 'Ásia', culture: 'Fluxus, performance, arte conceitual e música experimental', region: 'japao-arquipelago',
    children: 'Maternidade documentada; mãe de Kyoko e Sean.',
    note: 'Participação, instrução, corpo, paz, som e relações familiares atravessam uma prática experimental de longa duração.',
    motherhoodSource: 'https://www.imaginepeace.com/archives/17770',
  },
  {
    name: 'Graciela Iturbide', aliases: [], birth: 1942, death: null,
    country: 'México', continent: 'América do Norte', culture: 'Fotografia mexicana', region: 'mesoamerica',
    children: 'Maternidade documentada; mãe de três filhos.',
    note: 'Fotografia, ritual, cotidiano, morte, mulheres e comunidades indígenas mexicanas se articulam em sua produção.',
    motherhoodSource: 'https://nmwa.org/art/artists/graciela-iturbide/',
  },
  {
    name: 'Tarsila do Amaral', aliases: [], birth: 1886, death: 1973,
    country: 'Brasil', continent: 'América do Sul', culture: 'Modernismo brasileiro', region: 'brasil',
    children: 'Maternidade documentada; mãe de Dulce.',
    note: 'Figura central do modernismo brasileiro, permite reler antropofagia, modernidade, paisagem e circulação internacional pela experiência de uma artista-mãe.',
    motherhoodSource: 'https://www.guggenheim-bilbao.eus/en/did-you-know/chronology-tarsila-do-amaral',
  },
  {
    name: 'Tomie Ohtake', aliases: [], birth: 1913, death: 2015,
    country: 'Japão/Brasil', continent: 'América do Sul', culture: 'Abstração, pintura, gravura e escultura', region: 'brasil',
    children: 'Maternidade documentada; mãe de Ruy e Ricardo Ohtake.',
    note: 'Começou a pintar profissionalmente perto dos quarenta anos, depois de criar os filhos, e desenvolveu uma das trajetórias mais extensas da abstração brasileira.',
    motherhoodSource: 'https://www.institutotomieohtake.org.br/tomie-ohtake/',
  },
  {
    name: 'Lygia Clark', aliases: [], birth: 1920, death: 1988,
    country: 'Brasil', continent: 'América do Sul', culture: 'Neoconcretismo, participação e práticas sensoriais', region: 'brasil',
    children: 'Maternidade documentada; mãe de Elisabeth, Álvaro e Eduardo.',
    note: 'Corpo, participação, sensorialidade e cuidado se tornam centrais em uma trajetória que desestabilizou a própria categoria de obra de arte.',
    motherhoodSource: 'https://portal.lygiaclark.org.br/en/timeline',
  },
  {
    name: 'Anna Maria Maiolino', aliases: ['Ana Maria Maiolino'], birth: 1942, death: null,
    country: 'Itália/Brasil', continent: 'América do Sul', culture: 'Arte contemporânea brasileira', region: 'brasil',
    children: 'Maternidade documentada; seus dois filhos nasceram no Brasil.',
    note: 'Desenho, fotografia, performance, linguagem, alimento, corpo, repetição e argila articulam arte, vida doméstica e experiência migratória.',
    motherhoodSource: 'https://www.moma.org/magazine/articles/693',
  },
  {
    name: 'Patricia Piccinini', aliases: [], birth: 1965, death: null,
    country: 'Serra Leoa/Austrália', continent: 'Oceania', culture: 'Bioarte, escultura e arte contemporânea', region: 'oceania',
    children: 'Maternidade documentada; vive com o parceiro e seus dois filhos.',
    note: 'Bioética, reprodução, biotecnologia, cuidado, criaturas híbridas, parentesco e relações multiespécies estruturam sua prática.',
    motherhoodSource: 'https://awarewomenartists.com/en/artiste/patricia-piccinini/',
  },
];

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function yearFromWikidataTime(value) {
  const m = String(value ?? '').match(/^([+-]\d{4,})-/);
  return m ? Number(m[1]) : null;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function wikidataForArtist(artist) {
  const searchUrl = new URL('https://www.wikidata.org/w/api.php');
  searchUrl.search = new URLSearchParams({
    action: 'wbsearchentities',
    search: artist.name,
    language: 'en',
    uselang: 'en',
    type: 'item',
    limit: '8',
    format: 'json',
    origin: '*',
  }).toString();

  const search = await fetchJson(searchUrl);
  const candidates = search.search ?? [];

  for (const candidate of candidates) {
    const qid = candidate.id;
    const detail = await fetchJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
    const entity = detail.entities?.[qid];
    if (!entity) continue;
    const birth = yearFromWikidataTime(entity.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time);
    if (birth !== artist.birth) continue;

    const labels = Object.values(entity.labels ?? {}).map((x) => normalize(x.value));
    const expected = [artist.name, ...(artist.aliases ?? [])].map(normalize);
    const labelMatch = expected.some((name) => labels.includes(name)) || labels.some((label) => expected.includes(label));
    if (!labelMatch) continue;

    const fileName = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    return {
      qid,
      wikidataUrl: `https://www.wikidata.org/wiki/${qid}`,
      imageFile: fileName || null,
      imageUrl: fileName ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}` : null,
      imagePage: fileName ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName.replace(/ /g, '_'))}` : null,
    };
  }

  return null;
}

async function tableColumns(table) {
  const result = await db.execute(`PRAGMA table_info(${table})`);
  return new Set(result.rows.map((r) => String(r.name)));
}

async function findExisting(artist) {
  const names = [artist.name, ...(artist.aliases ?? [])]
    .map((value) => String(value).trim())
    .filter(Boolean);
  const placeholders = names.map(() => '?').join(',');
  const result = await db.execute({
    // O índice idx_entities_title_nocase pode atender esta comparação; evita lower(trim(title))
    // que forçava varredura completa uma vez para cada artista.
    sql: `SELECT id, title, subtitle, description, image_url, source_url, tags, themes, metadata
            FROM entities
           WHERE title COLLATE NOCASE IN (${placeholders})
           LIMIT 1`,
    args: names,
  });
  return result.rows[0] ?? null;
}

function parseStringArray(value) {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mergeStrings(...groups) {
  const seen = new Set();
  const result = [];
  for (const group of groups) {
    for (const value of group ?? []) {
      const text = String(value).trim();
      const key = normalize(text);
      if (!text || seen.has(key)) continue;
      seen.add(key);
      result.push(text);
    }
  }
  return result;
}

async function ensureFacets() {
  const facets = [
    ['curadoria:mulheres-e-maes', 'curadoria', 'Mulheres e mães', 'Lente curatorial documentada para genealogias femininas, maternidades, cuidado e produção de mulheres.'],
    ['identidade:mulheres', 'identidade', 'Mulheres', 'Identidade documentada pela fonte da entidade.'],
    ['identidade:maes', 'identidade', 'Mães', 'Maternidade documentada por fonte confiável.'],
    ['sensibilidade:artistas-maes', 'sensibilidade', 'Artistas mães', 'Artistas cuja maternidade é documentada e relevante para a leitura curatorial.'],
    ['sensibilidade:maternidade', 'sensibilidade', 'Maternidade', 'Maternidade, cuidado, reprodução e genealogias familiares.'],
  ];
  for (const facet of facets) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO facets (id, kind, name, summary) VALUES (?,?,?,?)',
      args: facet,
    });
  }
}

async function main() {
  await ensureFacets();
  const columns = await tableColumns('entities');
  const hasRegion = columns.has('region_id');
  const hasLat = columns.has('latitude');
  const hasLng = columns.has('longitude');

  let created = 0;
  let updated = 0;
  let withImage = 0;
  const unresolvedImages = [];

  for (const artist of ARTISTS) {
    let wiki = null;
    try {
      wiki = await wikidataForArtist(artist);
    } catch (error) {
      console.warn(`Wikidata falhou para ${artist.name}:`, error.message);
    }

    const existing = await findExisting(artist);
    const id = existing?.id ? String(existing.id) : randomUUID();
    const currentMetadata = (() => {
      try { return JSON.parse(String(existing?.metadata ?? '{}')); } catch { return {}; }
    })();

    const metadata = {
      ...currentMetadata,
      maternidade: {
        ...(currentMetadata.maternidade ?? {}),
        documentada: true,
        descricao: artist.children,
        fonte: artist.motherhoodSource,
        revisao: 'núcleo-verificado-2026-08',
      },
      curadoria: {
        ...(currentMetadata.curadoria ?? {}),
        mulheres_e_maes: true,
        fonte: artist.motherhoodSource,
      },
      wikidata: wiki?.qid ?? currentMetadata.wikidata ?? null,
      wikidata_url: wiki?.wikidataUrl ?? currentMetadata.wikidata_url ?? null,
      image_page: wiki?.imagePage ?? currentMetadata.image_page ?? null,
      image_match_status: wiki?.imageUrl ? 'verified_wikidata_p18' : (currentMetadata.image_match_status ?? 'needs_review'),
      image_match_confidence: wiki?.imageUrl ? 1 : (currentMetadata.image_match_confidence ?? null),
      dossie: 'mulheres-maes-verificadas',
    };

    const tags = JSON.stringify(mergeStrings(
      parseStringArray(existing?.tags),
      ['artista', 'mulheres', 'mães', 'maternidade', 'cuidado'],
    ));
    const themes = JSON.stringify(mergeStrings(
      parseStringArray(existing?.themes),
      ['maternidade', 'genealogias femininas', 'cuidado', 'trabalho artístico'],
    ));
    const motherhoodText = `${artist.note} ${artist.children}`;
    const existingDescription = String(existing?.description ?? '').trim();
    const description = existingDescription
      ? (normalize(existingDescription).includes('maternidade')
          ? existingDescription
          : `${existingDescription} ${motherhoodText}`)
      : motherhoodText;
    const dateDisplay = artist.death ? `${artist.birth}–${artist.death}` : `${artist.birth}–`;

    if (!existing) {
      await db.execute({
        sql: `INSERT INTO entities (
          id, entity_type, title, subtitle, description, date_start, date_end, date_display,
          country, continent, culture, image_url, image_license, open_image, source_url,
          tags, themes, metadata, status
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'published')`,
        args: [
          id, 'artista', artist.name, `${artist.culture} · ${artist.country}`, description,
          artist.birth, artist.death, dateDisplay, artist.country, artist.continent, artist.culture,
          wiki?.imageUrl ?? null,
          wiki?.imageUrl ? 'Wikimedia Commons — licença indicada na página do arquivo' : null,
          wiki?.imageUrl ? 1 : 0,
          artist.motherhoodSource,
          tags, themes, JSON.stringify(metadata),
        ],
      });
      created++;
    } else {
      await db.execute({
        sql: `UPDATE entities SET
          title = ?, subtitle = ?, description = ?, date_start = ?, date_end = ?, date_display = ?,
          country = ?, continent = ?, culture = ?,
          image_url = COALESCE(?, image_url),
          image_license = CASE WHEN ? IS NOT NULL THEN 'Wikimedia Commons — licença indicada na página do arquivo' ELSE image_license END,
          open_image = CASE WHEN ? IS NOT NULL THEN 1 ELSE open_image END,
          source_url = COALESCE(NULLIF(source_url,''), ?), tags = ?, themes = ?, metadata = ?, status = 'published',
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id = ?`,
        args: [
          artist.name, `${artist.culture} · ${artist.country}`, description,
          artist.birth, artist.death, dateDisplay, artist.country, artist.continent, artist.culture,
          wiki?.imageUrl ?? null, wiki?.imageUrl ?? null, wiki?.imageUrl ?? null,
          artist.motherhoodSource, tags, themes, JSON.stringify(metadata), id,
        ],
      });
      updated++;
    }

    if (hasRegion) {
      const parts = ['region_id = ?'];
      const args = [artist.region];
      if (hasLat) parts.push('latitude = COALESCE(latitude, (SELECT latitude FROM regions WHERE id = ?))'), args.push(artist.region);
      if (hasLng) parts.push('longitude = COALESCE(longitude, (SELECT longitude FROM regions WHERE id = ?))'), args.push(artist.region);
      args.push(id);
      try {
        await db.execute({ sql: `UPDATE entities SET ${parts.join(', ')} WHERE id = ?`, args });
      } catch (error) {
        console.warn(`Região não atualizada para ${artist.name}:`, error.message);
      }
    }

    for (const facetId of [
      'curadoria:mulheres-e-maes',
      'identidade:mulheres',
      'identidade:maes',
      'sensibilidade:artistas-maes',
      'sensibilidade:maternidade',
    ]) {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO entity_facets (entity_id, facet_id) VALUES (?,?)',
        args: [id, facetId],
      });
    }

    if (wiki?.imageUrl) {
      withImage++;
      await db.execute({
        sql: `INSERT INTO entity_quality (entity_id, quality_status, issues, notes, reviewed_at)
              VALUES (?, 'verified', '[]', ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
              ON CONFLICT(entity_id) DO UPDATE SET
                quality_status='verified', issues='[]', notes=excluded.notes,
                reviewed_at=excluded.reviewed_at, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
        args: [id, `Maternidade documentada em ${artist.motherhoodSource}; imagem vinculada pelo P18 do Wikidata.`],
      });
    } else {
      unresolvedImages.push(artist.name);
      await db.execute({
        sql: `INSERT INTO entity_quality (entity_id, quality_status, issues, notes)
              VALUES (?, 'needs_review', '["missing_image"]', ?)
              ON CONFLICT(entity_id) DO UPDATE SET
                quality_status='needs_review', issues='["missing_image"]', notes=excluded.notes,
                updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
        args: [id, `Maternidade documentada em ${artist.motherhoodSource}; imagem ainda precisa de revisão.`],
      });
    }
  }

  const count = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM entity_facets WHERE facet_id='curadoria:mulheres-e-maes'`,
    args: [],
  });

  console.log(JSON.stringify({
    created,
    updated,
    verifiedImages: withImage,
    unresolvedImages,
    totalMulheresEMaes: Number(count.rows[0]?.total ?? 0),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
