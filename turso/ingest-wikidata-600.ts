/**
 * Ingestão de +600 obras reais (Wikidata/Wikimedia, imagens de domínio público)
 * com equilíbrio planetário + europeu. Uso: bun run turso/ingest-wikidata-600.ts
 */
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const UA = "AtlasPlanetario/1.0 (curadoria academica; contato via app)";
const SPARQL = "https://query.wikidata.org/sparql";

type Target = {
  q: string; // QID do país / cultura
  country: string;
  region: string;
  continent: string;
  culture: string;
  want: number;
};

// Equilíbrio planetário + europeu
const TARGETS: Target[] = [
  // Europa
  { q: "Q38", country: "Itália", region: "italia", continent: "Europa", culture: "Italiana", want: 45 },
  { q: "Q142", country: "França", region: "franca", continent: "Europa", culture: "Francesa", want: 40 },
  { q: "Q29", country: "Espanha", region: "iberia", continent: "Europa", culture: "Espanhola", want: 25 },
  { q: "Q45", country: "Portugal", region: "iberia", continent: "Europa", culture: "Portuguesa", want: 15 },
  { q: "Q55", country: "Países Baixos", region: "europa-central", continent: "Europa", culture: "Neerlandesa", want: 35 },
  { q: "Q31", country: "Bélgica", region: "europa-central", continent: "Europa", culture: "Flamenga", want: 15 },
  { q: "Q183", country: "Alemanha", region: "europa-central", continent: "Europa", culture: "Alemã", want: 25 },
  { q: "Q40", country: "Áustria", region: "europa-central", continent: "Europa", culture: "Austríaca", want: 12 },
  { q: "Q145", country: "Reino Unido", region: "britanicas", continent: "Europa", culture: "Britânica", want: 25 },
  { q: "Q159", country: "Rússia", region: "europa-oriental", continent: "Europa", culture: "Russa", want: 18 },
  { q: "Q34", country: "Suécia", region: "escandinavia", continent: "Europa", culture: "Escandinava", want: 10 },
  { q: "Q20", country: "Noruega", region: "escandinavia", continent: "Europa", culture: "Escandinava", want: 8 },
  { q: "Q41", country: "Grécia", region: "balcas", continent: "Europa", culture: "Grega", want: 15 },
  { q: "Q36", country: "Polônia", region: "europa-central", continent: "Europa", culture: "Polonesa", want: 10 },
  // Ásia
  { q: "Q17", country: "Japão", region: "japao-arquipelago", continent: "Ásia", culture: "Japonesa", want: 40 },
  { q: "Q148", country: "China", region: "china-norte", continent: "Ásia", culture: "Chinesa", want: 40 },
  { q: "Q884", country: "Coreia do Sul", region: "coreia-peninsula", continent: "Ásia", culture: "Coreana", want: 15 },
  { q: "Q668", country: "Índia", region: "sul-da-asia", continent: "Ásia", culture: "Indiana", want: 30 },
  { q: "Q794", country: "Irã", region: "persia", continent: "Ásia", culture: "Persa", want: 18 },
  { q: "Q43", country: "Turquia", region: "anatolia", continent: "Ásia", culture: "Anatólia/Otomana", want: 15 },
  { q: "Q796", country: "Iraque", region: "mesopotamia", continent: "Ásia", culture: "Mesopotâmica", want: 12 },
  { q: "Q252", country: "Indonésia", region: "indonesia", continent: "Ásia", culture: "Indonésia", want: 12 },
  { q: "Q869", country: "Tailândia", region: "indochina", continent: "Ásia", culture: "Tailandesa", want: 10 },
  { q: "Q881", country: "Vietnã", region: "indochina", continent: "Ásia", culture: "Vietnamita", want: 8 },
  { q: "Q928", country: "Filipinas", region: "filipinas", continent: "Ásia", culture: "Filipina", want: 8 },
  { q: "Q265", country: "Uzbequistão", region: "rota-da-seda", continent: "Ásia", culture: "Timúrida", want: 6 },
  // África
  { q: "Q79", country: "Egito", region: "egito", continent: "África", culture: "Egípcia", want: 30 },
  { q: "Q1033", country: "Nigéria", region: "nigeria", continent: "África", culture: "Iorubá/Benim", want: 18 },
  { q: "Q912", country: "Mali", region: "mali", continent: "África", culture: "Mande", want: 10 },
  { q: "Q115", country: "Etiópia", region: "etiopia", continent: "África", culture: "Etíope", want: 12 },
  { q: "Q117", country: "Gana", region: "africa-ocidental", continent: "África", culture: "Akan", want: 8 },
  { q: "Q974", country: "República Democrática do Congo", region: "congo", continent: "África", culture: "Kongo", want: 10 },
  { q: "Q258", country: "África do Sul", region: "africa-do-sul", continent: "África", culture: "Sul-africana", want: 10 },
  { q: "Q1028", country: "Marrocos", region: "norte-africa", continent: "África", culture: "Magrebina", want: 8 },
  { q: "Q1049", country: "Sudão", region: "sahel", continent: "África", culture: "Núbia", want: 6 },
  // Américas
  { q: "Q96", country: "México", region: "mesoamerica", continent: "América do Norte", culture: "Mesoamericana", want: 25 },
  { q: "Q419", country: "Peru", region: "andes", continent: "América do Sul", culture: "Andina", want: 20 },
  { q: "Q155", country: "Brasil", region: "brasil", continent: "América do Sul", culture: "Brasileira", want: 25 },
  { q: "Q298", country: "Chile", region: "andes", continent: "América do Sul", culture: "Andina", want: 8 },
  { q: "Q414", country: "Argentina", region: "patagonia", continent: "América do Sul", culture: "Rio-platense", want: 10 },
  { q: "Q739", country: "Colômbia", region: "andes", continent: "América do Sul", culture: "Muísca", want: 8 },
  { q: "Q30", country: "Estados Unidos", region: "america-do-norte", continent: "América do Norte", culture: "Norte-americana", want: 25 },
  { q: "Q16", country: "Canadá", region: "primeiras-nacoes", continent: "América do Norte", culture: "Primeiras Nações", want: 10 },
  { q: "Q241", country: "Cuba", region: "caribe", continent: "América do Norte", culture: "Caribenha", want: 8 },
  { q: "Q736", country: "Equador", region: "andes", continent: "América do Sul", culture: "Andina", want: 6 },
  { q: "Q77", country: "Uruguai", region: "patagonia", continent: "América do Sul", culture: "Rio-platense", want: 6 },
  { q: "Q733", country: "Paraguai", region: "guarani", continent: "América do Sul", culture: "Guarani", want: 5 },
  // Oceania
  { q: "Q408", country: "Austrália", region: "aborigene", continent: "Oceania", culture: "Aborígene/Australiana", want: 15 },
  { q: "Q664", country: "Nova Zelândia", region: "maori", continent: "Oceania", culture: "Māori", want: 12 },
  { q: "Q691", country: "Papua-Nova Guiné", region: "melanesia", continent: "Oceania", culture: "Melanésia", want: 6 },
];

type Hit = {
  qid: string;
  title: string;
  img: string;
  year: number | null;
  dateRaw: string | null;
  creator: string | null;
  genre: string | null;
  material: string | null;
  collection: string | null;
};

const TYPES = [
  "Q3305213", "Q860861", "Q93184", "Q11060274", "Q219423", "Q206811",
  "Q133067", "Q48498", "Q220659", "Q13464614", "Q28823", "Q125191", "Q17514",
].map((q) => `wd:${q}`).join(" ");

function sparqlFor(q: string, limit: number) {
  return `SELECT ?item ?itemLabel ?img ?date ?creatorLabel ?collLabel WHERE {
  VALUES ?type { ${TYPES} }
  { ?item wdt:P495 wd:${q} } UNION { ?item wdt:P17 wd:${q} }
  ?item wdt:P31 ?type ; wdt:P18 ?img .
  OPTIONAL { ?item wdt:P571 ?date . }
  OPTIONAL { ?item wdt:P170 ?creator . }
  OPTIONAL { ?item wdt:P195 ?coll . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
} LIMIT ${limit}`;
}

async function fetchTarget(t: Target): Promise<Hit[]> {
  const url = `${SPARQL}?format=json&query=${encodeURIComponent(sparqlFor(t.q, t.want * 3))}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } });
    if (res.ok) {
      const json = (await res.json()) as {
        results: { bindings: Record<string, { value: string }>[] };
      };
      const seen = new Set<string>();
      const out: Hit[] = [];
      for (const b of json.results.bindings) {
        const qid = b["item"]!.value.split("/").pop()!;
        if (seen.has(qid)) continue;
        seen.add(qid);
        const label = b["itemLabel"]?.value ?? "";
        if (!label || /^Q\d+$/.test(label)) continue;
        const dateRaw = b["date"]?.value ?? null;
        const year = dateRaw ? parseInt(dateRaw.slice(0, 1) === "-" ? dateRaw.slice(0, 5) : dateRaw.slice(0, 4), 10) : NaN;
        out.push({
          qid,
          title: label,
          img: b["img"]!.value,
          year: Number.isFinite(year) ? year : null,
          dateRaw,
          creator: b["creatorLabel"]?.value ?? null,
          genre: null,
          material: null,
          collection: b["collLabel"]?.value ?? null,
        });
      }
      return out;
    }
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }
  console.warn(`falhou: ${t.country}`);
  return [];
}

const commonsUrl = (raw: string) => raw.replace(/^http:/, "https:");

function dateDisplay(year: number | null): string | null {
  if (year === null) return null;
  if (year < 0) return `${Math.abs(year)} a.C.`;
  return String(year);
}

async function main() {
  const existing = new Set(
    (await db.execute("SELECT LOWER(title) t FROM entities")).rows.map(
      (r) => (r as unknown as { t: string }).t,
    ),
  );
  const existingQids = new Set(
    (await db.execute("SELECT metadata FROM entities WHERE metadata LIKE '%\"qid\"%'")).rows
      .map((r) => {
        try {
          return JSON.parse((r as unknown as { metadata: string }).metadata).qid as string;
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  );

  let inserted = 0;
  for (const t of TARGETS) {
    const hits = await fetchTarget(t);
    let n = 0;
    for (const h of hits) {
      if (n >= t.want) break;
      const key = h.title.toLowerCase();
      if (existing.has(key) || existingQids.has(h.qid)) continue;
      existing.add(key);
      existingQids.add(h.qid);

      const subtitle = [h.creator, h.culture ?? null].filter(Boolean).join(" · ") || t.culture;
      const metadata = JSON.stringify({
        escola: t.culture,
        regiao: { pais: t.country, continente: t.continent, regiao: t.region },
        periodo: dateDisplay(h.year),
        autor: h.creator,
        genero: h.genre,
        material: h.material,
        colecao: h.collection,
        proveniencia: "Wikidata / Wikimedia Commons",
        licenca_tipo: "public-domain",
        status_metadados: h.year && h.creator ? "completo" : "parcial",
        qid: h.qid,
        imagem_fonte: `https://www.wikidata.org/wiki/${h.qid}`,
      });
      const tags = JSON.stringify(
        ["obra", t.culture.toLowerCase(), h.genre?.toLowerCase(), h.material?.toLowerCase()].filter(Boolean),
      );

      await db.execute({
        sql: `INSERT INTO entities (id, entity_type, title, subtitle, description, date_display, date_start, date_end,
                country, continent, culture, region_id, latitude, longitude, image_url,
                tags, themes, metadata, source_url, status)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,
                (SELECT latitude FROM regions WHERE id = ?),
                (SELECT longitude FROM regions WHERE id = ?),
                ?,?,?,?,?, 'published')`,
        args: [
          randomUUID(),
          "obra",
          h.title,
          subtitle.slice(0, 200),
          [h.creator ? `Autoria: ${h.creator}.` : null, h.collection ? `Acervo: ${h.collection}.` : null,
           `Origem: ${t.country}.`].filter(Boolean).join(" "),
          dateDisplay(h.year),
          h.year,
          h.year,
          t.country,
          t.continent,
          t.culture,
          t.region,
          t.region,
          t.region,
          commonsUrl(h.img),
          tags,
          JSON.stringify([]),
          metadata,
          `https://www.wikidata.org/wiki/${h.qid}`,
        ],
      });
      n++;
      inserted++;
    }
    console.log(`${t.country}: +${n} (total ${inserted})`);
    await new Promise((r) => setTimeout(r, 500));
  }

  const stats = await db.execute(
    `SELECT (SELECT COUNT(*) FROM entities) total,
            (SELECT COUNT(*) FROM entities WHERE image_url IS NOT NULL AND image_url <> '') com_imagem`,
  );
  console.log("inseridos:", inserted, stats.rows[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
