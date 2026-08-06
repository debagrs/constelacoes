/**
 * Atlas Planetário — importação incremental de obras com imagens abertas.
 *
 * O arquivo da imagem não é copiado para o GitHub ou para o Turso.
 * O banco guarda:
 * - image_url: link direto para a imagem no Wikimedia Commons;
 * - source_url: página do arquivo, onde constam autoria e licença;
 * - metadata: QID, lente curatorial, origem e estado de revisão.
 *
 * Uso:
 *   ATLAS_TARGET=2000 ATLAS_PAGE=250 npm run ingest:20000
 */
import { createClient } from "@libsql/client";

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!databaseUrl || !authToken) {
  throw new Error("Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.");
}

const db = createClient({ url: databaseUrl, authToken });
const TARGET = Math.max(1, Number(process.env.ATLAS_TARGET ?? 2000));
const PAGE = Math.max(25, Math.min(Number(process.env.ATLAS_PAGE ?? 250), 500));
const endpoint = "https://query.wikidata.org/sparql";

const lenses = [
  { key: "traditional", label: "história da arte e cultura visual", classes: ["Q838948", "Q3305213", "Q860861", "Q17537576"] },
  { key: "women", label: "mulheres artistas", classes: ["Q838948", "Q3305213"] },
  { key: "indigenous", label: "artes e culturas indígenas", classes: ["Q12306538", "Q178885"] },
  { key: "black", label: "Áfricas e diásporas negras", classes: ["Q838948", "Q3305213"] },
  { key: "lgbtqia", label: "artistas e perspectivas LGBTQIA+", classes: ["Q838948", "Q3305213"] },
  { key: "bioethics", label: "bioética, animalidades e relações multiespécies", classes: ["Q838948", "Q17537576"] },
  { key: "beyond_anthropocene", label: "além do Antropoceno", classes: ["Q838948", "Q17537576"] },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sparqlQuery(offset, classes) {
  const values = classes.map((qid) => `wd:${qid}`).join(" ");
  return `
SELECT DISTINCT ?item ?itemLabel ?itemDescription ?image ?creatorLabel ?countryLabel ?cultureLabel ?date WHERE {
  VALUES ?class { ${values} }
  ?item wdt:P31/wdt:P279* ?class;
        wdt:P18 ?image.
  OPTIONAL { ?item wdt:P170 ?creator. }
  OPTIONAL { ?item wdt:P17 ?country. }
  OPTIONAL { ?item wdt:P2596 ?culture. }
  OPTIONAL { ?item wdt:P571|wdt:P577 ?date. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en,es,fr". }
}
LIMIT ${PAGE}
OFFSET ${offset}`;
}

async function fetchRows(query, attempt = 1) {
  const url = `${endpoint}?format=json&query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "AtlasPlanetarioUFSM/2.0 (projeto acadêmico de cultura aberta)",
    },
  });

  if (response.ok) {
    const payload = await response.json();
    return payload.results.bindings;
  }

  if ((response.status === 429 || response.status >= 500) && attempt < 6) {
    const delay = 2500 * attempt;
    console.warn(`Wikidata respondeu ${response.status}. Nova tentativa em ${delay} ms.`);
    await sleep(delay);
    return fetchRows(query, attempt + 1);
  }

  throw new Error(`Wikidata respondeu ${response.status}: ${await response.text()}`);
}

function commonsFilePage(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const specialPath = "/wiki/Special:FilePath/";
    if (url.pathname.includes(specialPath)) {
      const fileName = decodeURIComponent(url.pathname.split(specialPath)[1] ?? "");
      return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`;
    }

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
  const year = new Date(value).getUTCFullYear();
  return Number.isFinite(year) && year > -100000 && year < 100000 ? year : null;
}

let inserted = 0;
let examined = 0;

for (const lens of lenses) {
  for (let offset = 0; inserted < TARGET; offset += PAGE) {
    const rows = await fetchRows(sparqlQuery(offset, lens.classes));
    if (!rows.length) break;

    for (const row of rows) {
      if (inserted >= TARGET) break;
      examined += 1;

      const qid = String(row.item.value).split("/").pop();
      if (!qid) continue;

      const id = `wikidata-${qid}`;
      const title = row.itemLabel?.value || qid;
      const imageUrl = row.image?.value || null;
      if (!imageUrl) continue;

      const creator = row.creatorLabel?.value || null;
      const country = row.countryLabel?.value || null;
      const culture = row.cultureLabel?.value || null;
      const year = safeYear(row.date?.value);
      const sourceUrl = commonsFilePage(imageUrl);
      const description = row.itemDescription?.value ||
        `${title}${creator ? ` — ${creator}` : ""}. Registro de cultura aberta relacionado ao Atlas Planetário.`;

      const metadata = {
        wikidata_qid: qid,
        wikidata_url: `https://www.wikidata.org/wiki/${qid}`,
        creator_name: creator,
        curatorial_lens: lens.key,
        curatorial_lens_label: lens.label,
        image_origin: "Wikimedia Commons",
        image_linked_not_copied: true,
        license_review: "consultar_pagina_da_imagem",
        sensitive_metadata_status: "não_inferir_revisar_por_fontes",
      };

      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO entities (
          id, entity_type, title, subtitle, description,
          date_start, date_display, country, culture,
          image_url, image_license, open_image, source_url,
          tags, themes, metadata, status, created_at, updated_at
        ) VALUES (
          ?, 'obra', ?, ?, ?,
          ?, ?, ?, ?,
          ?, 'Verificar licença e atribuição na página do Wikimedia Commons', 1, ?,
          ?, ?, ?, 'published',
          strftime('%Y-%m-%dT%H:%M:%fZ','now'),
          strftime('%Y-%m-%dT%H:%M:%fZ','now')
        )`,
        args: [
          id,
          title,
          creator,
          description,
          year,
          year ? String(year) : null,
          country,
          culture,
          imageUrl,
          sourceUrl,
          JSON.stringify([lens.label, "Wikidata", "Wikimedia Commons"]),
          JSON.stringify([lens.key]),
          JSON.stringify(metadata),
        ],
      });

      if (result.rowsAffected > 0) inserted += 1;
    }

    console.log(`${lens.label}: ${inserted}/${TARGET} novos; ${examined} examinados.`);
    await sleep(1400);
  }
}

console.log(`Importação concluída: ${inserted} novos registros com links de imagem.`);
console.log("As imagens permanecem hospedadas no Wikimedia Commons; o Atlas guarda apenas os links e metadados de origem.");
