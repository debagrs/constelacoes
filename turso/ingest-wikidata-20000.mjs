/**
 * Atlas Planetário — ampliar o acervo até 20 mil imagens abertas.
 *
 * Importa registros documentais do Wikidata/Wikimedia Commons sem copiar os arquivos.
 * Nenhuma identidade sensível é inferida ou atribuída automaticamente.
 * Os novos registros entram como acervo aberto ainda não classificado nas lentes curatoriais.
 *
 * Variáveis:
 *   TURSO_DATABASE_URL
 *   TURSO_AUTH_TOKEN
 *   ATLAS_TARGET_TOTAL=20000   total desejado de imagens únicas no Atlas
 *   ATLAS_PAGE=250             tamanho do lote Wikidata (50–500)
 *   ATLAS_START_OFFSET=0       opcional, útil para retomar uma execução
 */
import { createClient } from "@libsql/client";

const databaseUrl = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!databaseUrl || !authToken) {
  throw new Error("Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.");
}

const db = createClient({ url: databaseUrl, authToken });
const TARGET_TOTAL = Math.max(100, Number(process.env.ATLAS_TARGET_TOTAL ?? 20000));
const PAGE = Math.max(50, Math.min(Number(process.env.ATLAS_PAGE ?? 250), 500));
const START_OFFSET = Math.max(0, Number(process.env.ATLAS_START_OFFSET ?? 0));
const endpoint = "https://query.wikidata.org/sparql";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Classes amplas já usadas pelo projeto. O importador não transforma essas classes
// em categorias identitárias: servem apenas para limitar a busca a objetos culturais/obras.
const ART_CLASSES = ["Q838948", "Q3305213", "Q860861", "Q17537576"];

function sparqlQuery(offset) {
  const values = ART_CLASSES.map((qid) => `wd:${qid}`).join(" ");
  return `
SELECT DISTINCT ?item ?itemLabel ?itemDescription ?image ?creatorLabel
                ?countryLabel ?continentLabel ?cultureLabel ?collectionLabel
                ?inventory ?date WHERE {
  VALUES ?class { ${values} }
  ?item wdt:P31/wdt:P279* ?class;
        wdt:P18 ?image.
  OPTIONAL { ?item wdt:P170 ?creator. }
  OPTIONAL {
    ?item wdt:P17 ?country.
    OPTIONAL { ?country wdt:P30 ?continent. }
  }
  OPTIONAL { ?item wdt:P2596 ?culture. }
  OPTIONAL { ?item wdt:P195 ?collection. }
  OPTIONAL { ?item wdt:P217 ?inventory. }
  OPTIONAL { ?item wdt:P571|wdt:P577 ?date. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en,es,fr". }
}
ORDER BY ?item
LIMIT ${PAGE}
OFFSET ${offset}`;
}

async function fetchRows(query, attempt = 1) {
  const url = `${endpoint}?format=json&query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "AtlasPlanetarioUFSM/3.0 (projeto academico de cultura visual)",
    },
  });

  if (response.ok) {
    const payload = await response.json();
    return payload.results.bindings;
  }

  if ((response.status === 429 || response.status >= 500) && attempt < 7) {
    const delay = Math.min(30_000, 2500 * 2 ** (attempt - 1));
    console.warn(`Wikidata respondeu ${response.status}. Nova tentativa em ${delay} ms.`);
    await sleep(delay);
    return fetchRows(query, attempt + 1);
  }

  throw new Error(`Wikidata respondeu ${response.status}: ${await response.text()}`);
}

function commonsFilePage(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const fileName = decodeURIComponent(url.pathname.split("/").pop() ?? "");
    return fileName
      ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`
      : "https://commons.wikimedia.org";
  } catch {
    return "https://commons.wikimedia.org";
  }
}

function safeYear(value) {
  if (!value) return null;
  const match = String(value).match(/^-?(\d{1,6})/);
  if (!match) return null;
  const year = Number(match[0]);
  return Number.isFinite(year) && Math.abs(year) < 100000 ? year : null;
}

function continentPt(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("south america")) return "América do Sul";
  if (normalized.includes("north america")) return "América do Norte";
  if (normalized.includes("europe")) return "Europa";
  if (normalized.includes("africa")) return "África";
  if (normalized.includes("asia")) return "Ásia";
  if (normalized.includes("oceania")) return "Oceania";
  if (normalized.includes("antarctica")) return "Antártida";
  return value || null;
}

await db.execute(`CREATE INDEX IF NOT EXISTS idx_entities_image_url ON entities(image_url)`);
await db.execute(`CREATE INDEX IF NOT EXISTS idx_entities_status_type ON entities(status, entity_type)`);

const currentResult = await db.execute(
  `SELECT COUNT(DISTINCT image_url) AS total
     FROM entities
    WHERE status='published' AND image_url IS NOT NULL AND trim(image_url) <> ''`,
);
let currentTotal = Number(currentResult.rows[0]?.total ?? 0);

console.log(`Atlas atualmente: ${currentTotal.toLocaleString("pt-BR")} imagens únicas.`);
console.log(`Meta: ${TARGET_TOTAL.toLocaleString("pt-BR")} imagens únicas.`);

if (currentTotal >= TARGET_TOTAL) {
  console.log("A meta já foi atingida. Nenhuma importação necessária.");
  process.exit(0);
}

let inserted = 0;
let examined = 0;
let offset = START_OFFSET;
let emptyPages = 0;

while (currentTotal < TARGET_TOTAL && emptyPages < 3) {
  const rows = await fetchRows(sparqlQuery(offset));
  if (!rows.length) {
    emptyPages += 1;
    offset += PAGE;
    continue;
  }
  emptyPages = 0;

  for (const row of rows) {
    if (currentTotal >= TARGET_TOTAL) break;
    examined += 1;

    const qid = String(row.item?.value ?? "").split("/").pop();
    const imageUrl = row.image?.value?.trim();
    if (!qid || !imageUrl) continue;

    const id = `wikidata-${qid}`;
    const title = row.itemLabel?.value || qid;
    const creator = row.creatorLabel?.value || null;
    const country = row.countryLabel?.value || null;
    const continent = continentPt(row.continentLabel?.value || null);
    const culture = row.cultureLabel?.value || null;
    const collection = row.collectionLabel?.value || null;
    const inventory = row.inventory?.value || null;
    const year = safeYear(row.date?.value);
    const sourceUrl = commonsFilePage(imageUrl);
    const description =
      row.itemDescription?.value ||
      `${title}${creator ? ` — ${creator}` : ""}. Registro relacionado a acervo aberto.`;

    const metadata = {
      wikidata_qid: qid,
      wikidata_url: `https://www.wikidata.org/wiki/${qid}`,
      creator_name: creator,
      collection,
      inventory_number: inventory,
      import_source: "Wikidata + Wikimedia Commons",
      curatorial_classification: "open_collection_unclassified",
      image_origin: "Wikimedia Commons",
      image_linked_not_copied: true,
      license_review: "consultar_pagina_da_imagem",
      sensitive_metadata_status: "não inferido; classificar somente por fontes documentais",
    };

    const result = await db.execute({
      sql: `INSERT INTO entities (
        id, entity_type, title, subtitle, description,
        date_start, date_display, country, continent, culture,
        image_url, image_license, open_image, source_url,
        tags, themes, metadata, status, created_at, updated_at
      )
      SELECT
        ?, 'obra', ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, 'Verificar licença e atribuição na página do Wikimedia Commons', 1, ?,
        ?, ?, ?, 'published',
        strftime('%Y-%m-%dT%H:%M:%fZ','now'),
        strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE NOT EXISTS (SELECT 1 FROM entities WHERE id = ?)
        AND NOT EXISTS (SELECT 1 FROM entities WHERE image_url = ?)`,
      args: [
        id,
        title,
        creator,
        description,
        year,
        year ? String(year) : null,
        country,
        continent,
        culture,
        imageUrl,
        sourceUrl,
        JSON.stringify(["Wikidata", "Wikimedia Commons", "acervo aberto"]),
        JSON.stringify(["open_collection_unclassified"]),
        JSON.stringify(metadata),
        id,
        imageUrl,
      ],
    });

    if (result.rowsAffected > 0) {
      inserted += 1;
      currentTotal += 1;
    }
  }

  console.log(
    `offset ${offset}: ${currentTotal}/${TARGET_TOTAL} imagens únicas; ${inserted} novas; ${examined} examinadas.`,
  );
  offset += PAGE;
  await sleep(1200);
}

console.log(`Importação concluída. Total estimado: ${currentTotal} imagens únicas.`);
console.log(`Novos registros nesta execução: ${inserted}. Próximo offset sugerido: ${offset}.`);
console.log("As imagens permanecem nas fontes externas; o Atlas guarda URLs e metadados de proveniência.");
