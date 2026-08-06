/**
 * Povoa a camada planetária: colunas novas em `entities`, regiões, facetas,
 * acervo curado global e backfill das entradas já existentes.
 * Uso: bun run turso/seed-planetario.ts
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { REGIONS } from "./data/regions";
import { ALL_FACETS, facetId } from "./data/facets";
import { PLANETARIO } from "./data/planetario";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function addColumn(table: string, col: string, ddl: string) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  if (info.rows.some((r) => (r as unknown as { name: string }).name === col)) return;
  await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`);
  console.log(`+ coluna ${table}.${col}`);
}

async function main() {
  // 1. esquema
  const sql = readFileSync(new URL("./planetario.sql", import.meta.url), "utf8");
  for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
    await db.execute(stmt);
  }
  await addColumn("entities", "region_id", "TEXT");
  await addColumn("entities", "people", "TEXT");
  await addColumn("entities", "cosmology", "TEXT");
  await addColumn("entities", "latitude", "REAL");
  await addColumn("entities", "longitude", "REAL");
  console.log("esquema ok");

  // 2. regiões
  for (const [idx, r] of REGIONS.entries()) {
    await db.execute({
      sql: `INSERT INTO regions (id, parent_id, name, continent, latitude, longitude, summary, sort_order)
            VALUES (?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET parent_id=excluded.parent_id, name=excluded.name,
              continent=excluded.continent, latitude=excluded.latitude, longitude=excluded.longitude,
              summary=excluded.summary, sort_order=excluded.sort_order`,
      args: [r.id, r.parent ?? null, r.name, r.continent, r.lat ?? null, r.lon ?? null, r.summary ?? null, idx],
    });
  }
  console.log(`regiões: ${REGIONS.length}`);

  // 3. facetas
  for (const f of ALL_FACETS) {
    await db.execute({
      sql: `INSERT INTO facets (id, kind, name, summary) VALUES (?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, summary=excluded.summary`,
      args: [f.id, f.kind, f.name, f.summary ?? null],
    });
  }
  console.log(`facetas: ${ALL_FACETS.length}`);

  // 4. acervo planetário
  const regionById = new Map(REGIONS.map((r) => [r.id, r]));
  let created = 0;
  let updated = 0;

  for (const s of PLANETARIO) {
    const region = regionById.get(s.region);
    const existing = await db.execute({
      sql: "SELECT id FROM entities WHERE title = ? LIMIT 1",
      args: [s.title],
    });
    const id = (existing.rows[0] as unknown as { id: string } | undefined)?.id ?? randomUUID();
    const metadata = JSON.stringify({
      escola: s.culture,
      regiao: { pais: s.country, continente: region?.continent ?? null, regiao: region?.name ?? null },
      periodo: s.dateDisplay,
      proveniencia: "Curadoria Atlas Planetário — camada planetária",
      licenca_tipo: "public-domain",
      status_metadados: "completo",
      imagem_fonte: `https://en.wikipedia.org/wiki/${encodeURIComponent(s.wiki.replace(/ /g, "_"))}`,
      wiki: s.wiki,
    });
    const tags = JSON.stringify([s.type, s.culture.toLowerCase(), ...(s.povo ?? []).map((p) => p.toLowerCase())]);
    const themes = JSON.stringify(s.sens);

    if (existing.rows.length) {
      await db.execute({
        sql: `UPDATE entities SET subtitle=?, description=?, date_display=?, date_start=?, date_end=?,
                country=?, continent=?, culture=?, region_id=?, people=?, cosmology=?,
                latitude=?, longitude=?, tags=?, themes=?, metadata=?, source_url=?, status='published',
                updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
              WHERE id=?`,
        args: [
          s.subtitle, s.desc ?? s.subtitle, s.dateDisplay, s.ds, s.de,
          s.country, region?.continent ?? null, s.culture, s.region,
          JSON.stringify(s.povo ?? []), JSON.stringify(s.cosmo ?? []),
          region?.lat ?? null, region?.lon ?? null, tags, themes, metadata,
          `https://en.wikipedia.org/wiki/${encodeURIComponent(s.wiki.replace(/ /g, "_"))}`, id,
        ],
      });
      updated++;
    } else {
      await db.execute({
        sql: `INSERT INTO entities (id, entity_type, title, subtitle, description, date_display, date_start, date_end,
                country, continent, culture, region_id, people, cosmology, latitude, longitude,
                tags, themes, metadata, source_url, status)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'published')`,
        args: [
          id, s.type, s.title, s.subtitle, s.desc ?? s.subtitle, s.dateDisplay, s.ds, s.de,
          s.country, region?.continent ?? null, s.culture, s.region,
          JSON.stringify(s.povo ?? []), JSON.stringify(s.cosmo ?? []),
          region?.lat ?? null, region?.lon ?? null, tags, themes, metadata,
          `https://en.wikipedia.org/wiki/${encodeURIComponent(s.wiki.replace(/ /g, "_"))}`,
        ],
      });
      created++;
    }

    // facetas
    await db.execute({ sql: "DELETE FROM entity_facets WHERE entity_id = ?", args: [id] });
    const links = [
      ...s.sens.map((n) => facetId("sensibilidade", n)),
      ...(s.ident ?? []).map((n) => facetId("identidade", n)),
      ...(s.povo ?? []).map((n) => facetId("povo", n)),
      ...(s.cosmo ?? []).map((n) => facetId("cosmologia", n)),
    ];
    for (const fid of new Set(links)) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO entity_facets (entity_id, facet_id) VALUES (?,?)",
        args: [id, fid],
      });
    }
  }
  console.log(`acervo planetário: ${created} criados, ${updated} atualizados`);

  // 5. backfill de região para o acervo pré-existente
  const byCountry: Record<string, string> = {
    Itália: "italia", França: "franca", Espanha: "iberia", Portugal: "iberia",
    Grécia: "balcas", Alemanha: "europa-central", Áustria: "europa-central",
    "Países Baixos": "europa-central", Bélgica: "europa-central", Suíça: "europa-central",
    "Reino Unido": "britanicas", Irlanda: "britanicas", Rússia: "europa-oriental",
    Polônia: "europa-central", Sérvia: "balcas", Turquia: "anatolia", Egito: "egito",
    Iraque: "mesopotamia", Irã: "persia", Síria: "levante", Israel: "levante",
    Palestina: "levante", "Arábia Saudita": "arabia", Índia: "sul-da-asia",
    China: "china-norte", Japão: "japao-arquipelago", "Coreia do Sul": "coreia-peninsula",
    Indonésia: "indonesia", Camboja: "indochina", Tailândia: "indochina",
    México: "mesoamerica", Peru: "andes", Bolívia: "andes", Chile: "andes",
    Brasil: "brasil", Argentina: "patagonia", "Estados Unidos": "afro-americano",
    Canadá: "primeiras-nacoes", Nigéria: "nigeria", Mali: "mali", Etiópia: "etiopia",
    Gana: "africa-ocidental", "África do Sul": "africa-do-sul", Marrocos: "norte-africa",
    Austrália: "aborigene", "Nova Zelândia": "maori",
  };
  const byContinent: Record<string, string> = {
    Europa: "europa", África: "africa", Ásia: "asia-central", "América do Sul": "america-do-sul",
    "América do Norte": "america-do-norte", Oceania: "oceania", Planetário: "planetario",
  };
  for (const [country, rid] of Object.entries(byCountry)) {
    await db.execute({
      sql: `UPDATE entities SET region_id = ?,
              latitude = (SELECT latitude FROM regions WHERE id = ?),
              longitude = (SELECT longitude FROM regions WHERE id = ?)
            WHERE region_id IS NULL AND country = ?`,
      args: [rid, rid, rid, country],
    });
  }
  for (const [cont, rid] of Object.entries(byContinent)) {
    await db.execute({
      sql: `UPDATE entities SET region_id = ?,
              latitude = COALESCE(latitude, (SELECT latitude FROM regions WHERE id = ?)),
              longitude = COALESCE(longitude, (SELECT longitude FROM regions WHERE id = ?))
            WHERE region_id IS NULL AND continent = ?`,
      args: [rid, rid, rid, cont],
    });
  }

  const stats = await db.execute(
    `SELECT (SELECT COUNT(*) FROM entities) total,
            (SELECT COUNT(*) FROM entities WHERE region_id IS NOT NULL) com_regiao,
            (SELECT COUNT(*) FROM entity_facets) vinculos`,
  );
  console.log(stats.rows[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
