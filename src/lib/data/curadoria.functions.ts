import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EntityIdInput = z.object({ entityId: z.string().min(1).max(200) });
const SuggestionInput = z.object({ suggestionId: z.string().min(1).max(200) });

const CURATORIAL_FACETS = [
  "curadoria:mulheres-e-maes",
  "curadoria:indigenas",
  "curadoria:negros-e-diasporas",
  "curadoria:lgbtqia",
  "curadoria:bioetica-e-animalidades",
  "curadoria:alem-do-antropoceno",
] as const;

const CURATORIAL_FACET_DEFINITIONS: Record<(typeof CURATORIAL_FACETS)[number], { name: string; summary: string }> = {
  "curadoria:mulheres-e-maes": { name: "Mulheres e mães", summary: "Lente curatorial documentada e aprovada manualmente." },
  "curadoria:indigenas": { name: "Indígenas", summary: "Lente curatorial documentada e aprovada manualmente." },
  "curadoria:negros-e-diasporas": { name: "Negros e diásporas", summary: "Lente curatorial documentada e aprovada manualmente." },
  "curadoria:lgbtqia": { name: "LGBTQIA+", summary: "Lente curatorial documentada e aprovada manualmente." },
  "curadoria:bioetica-e-animalidades": { name: "Bioética e animalidades", summary: "Lente curatorial documentada e aprovada manualmente." },
  "curadoria:alem-do-antropoceno": { name: "Além do Antropoceno", summary: "Lente curatorial documentada e aprovada manualmente." },
};

export const listImageQueue = createServerFn({ method: "GET" }).handler(async () => {
  const { requireReviewer } = await import("@/lib/auth/session.server");
  const { query } = await import("@/lib/turso/client.server");
  await requireReviewer();

  const rows = await query<Record<string, unknown>>(
    `SELECT s.id,s.entity_id,s.rank,s.image_url,s.thumbnail_url,s.source_url,s.wikidata_qid,
            s.candidate_title,s.candidate_description,s.license,s.score,s.status,
            e.title,e.subtitle,e.entity_type,e.date_display,e.culture
       FROM image_suggestions s
       JOIN entities e ON e.id=s.entity_id
      WHERE s.status='pending'
      ORDER BY e.title COLLATE NOCASE ASC,s.rank ASC,s.score DESC`,
  );

  const groups = new Map<string, { entity: Record<string, unknown>; suggestions: Record<string, unknown>[] }>();
  for (const row of rows) {
    const entityId = String(row.entity_id);
    let group = groups.get(entityId);
    if (!group) {
      group = {
        entity: {
          id: entityId,
          title: String(row.title ?? ""),
          subtitle: row.subtitle ?? null,
          entity_type: String(row.entity_type ?? "obra"),
          date_display: row.date_display ?? null,
          culture: row.culture ?? null,
        },
        suggestions: [],
      };
      groups.set(entityId, group);
    }
    group.suggestions.push({
      id: String(row.id),
      entity_id: entityId,
      rank: Number(row.rank ?? 0),
      image_url: String(row.image_url ?? ""),
      thumbnail_url: row.thumbnail_url ?? null,
      source_url: row.source_url ?? null,
      wikidata_qid: row.wikidata_qid ?? null,
      candidate_title: row.candidate_title ?? null,
      candidate_description: row.candidate_description ?? null,
      status: String(row.status ?? "pending"),
    });
  }
  return [...groups.values()];
});

export const approveImageSuggestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SuggestionInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, batch, nowIso } = await import("@/lib/turso/client.server");
    const reviewer = await requireReviewer();
    const suggestion = await queryOne<{
      id: string; entity_id: string; image_url: string; source_url: string | null; license: string | null; status: string;
    }>("SELECT id,entity_id,image_url,source_url,license,status FROM image_suggestions WHERE id=?", [data.suggestionId]);
    if (!suggestion) throw new Error("Sugestão de imagem não encontrada.");
    if (suggestion.status !== "pending") throw new Error("Esta sugestão já foi revisada.");
    const now = nowIso();
    await batch([
      {
        sql: `UPDATE entities
                 SET image_url=?, image_license=COALESCE(NULLIF(?,''),image_license),
                     source_url=COALESCE(NULLIF(?,''),source_url), open_image=1, updated_at=?
               WHERE id=?`,
        args: [suggestion.image_url, suggestion.license ?? "", suggestion.source_url ?? "", now, suggestion.entity_id],
      },
      {
        sql: `UPDATE image_suggestions
                 SET status='approved',reviewed_by=?,reviewed_at=?,updated_at=?
               WHERE id=?`,
        args: [reviewer.id, now, now, suggestion.id],
      },
      {
        sql: `UPDATE image_suggestions
                 SET status='rejected',reviewed_by=?,reviewed_at=?,notes='Descartada após aprovação de outra sugestão.',updated_at=?
               WHERE entity_id=? AND id<>? AND status='pending'`,
        args: [reviewer.id, now, now, suggestion.entity_id, suggestion.id],
      },
    ]);
    return { ok: true };
  });

export const rejectImageSuggestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SuggestionInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { execute, nowIso } = await import("@/lib/turso/client.server");
    const reviewer = await requireReviewer();
    await execute(
      `UPDATE image_suggestions
          SET status='rejected',reviewed_by=?,reviewed_at=?,updated_at=?
        WHERE id=? AND status='pending'`,
      [reviewer.id, nowIso(), nowIso(), data.suggestionId],
    );
    return { ok: true };
  });

export const getCuratorialEntity = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => EntityIdInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, query } = await import("@/lib/turso/client.server");
    await requireReviewer();
    const row = await queryOne<Record<string, unknown>>(
      `SELECT id,entity_type,title,slug,subtitle,description,date_start,date_end,date_display,location,country,continent,
              culture,region_id,people,cosmology,latitude,longitude,image_url,image_license,open_image,source_url,
              tags,themes,colors,materials,techniques,metadata,status
         FROM entities WHERE id=?`,
      [data.entityId],
    );
    if (!row) throw new Error("Registro não encontrado.");
    let facets: Array<{ facet_id: string }> = [];
    try {
      facets = await query<{ facet_id: string }>(
        `SELECT facet_id FROM entity_facets WHERE entity_id=? AND facet_id IN (${CURATORIAL_FACETS.map(() => "?").join(",")})`,
        [data.entityId, ...CURATORIAL_FACETS],
      );
    } catch {
      // Bancos antigos podem ainda não ter recebido a camada de facetas; o primeiro salvamento cria as tabelas.
    }
    return { ...row, curatorial_facets: facets.map((item) => item.facet_id) };
  });

const UpdateCuratorialEntityInput = z.object({
  entityId: z.string().min(1).max(200),
  entityType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(300),
  slug: z.string().trim().max(300).optional().default(""),
  subtitle: z.string().trim().max(500).optional().default(""),
  description: z.string().max(15000).optional().default(""),
  dateStart: z.number().int().min(-100000).max(3000).nullable().optional(),
  dateEnd: z.number().int().min(-100000).max(3000).nullable().optional(),
  dateDisplay: z.string().trim().max(200).optional().default(""),
  location: z.string().trim().max(300).optional().default(""),
  country: z.string().trim().max(160).optional().default(""),
  continent: z.string().trim().max(160).optional().default(""),
  culture: z.string().trim().max(300).optional().default(""),
  regionId: z.string().trim().max(200).optional().default(""),
  people: z.string().trim().max(300).optional().default(""),
  cosmology: z.string().trim().max(500).optional().default(""),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  imageUrl: z.string().trim().max(3000).optional().default("").refine((v) => !v || /^https?:\/\//i.test(v), "A URL da imagem precisa começar com http:// ou https://."),
  imageLicense: z.string().trim().max(300).optional().default(""),
  openImage: z.boolean().default(false),
  sourceUrl: z.string().trim().max(2000).optional().default("").refine((v) => !v || /^https?:\/\//i.test(v), "A URL da fonte precisa começar com http:// ou https://."),
  tags: z.array(z.string().trim().min(1).max(160)).max(80),
  themes: z.array(z.string().trim().min(1).max(160)).max(80),
  colors: z.array(z.string().trim().min(1).max(160)).max(80),
  materials: z.array(z.string().trim().min(1).max(160)).max(80),
  techniques: z.array(z.string().trim().min(1).max(160)).max(80),
  metadata: z.record(z.string(), z.unknown()),
  curatorialFacets: z.array(z.enum(CURATORIAL_FACETS)).max(CURATORIAL_FACETS.length).default([]),
  status: z.enum(["draft", "review", "published", "archived"]),
});

export const updateCuratorialEntity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateCuratorialEntityInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { batch, nowIso } = await import("@/lib/turso/client.server");
    await requireReviewer();
    const now = nowIso();
    const statements: { sql: string; args: Array<string | number | null> }[] = [
      {
        sql: "CREATE TABLE IF NOT EXISTS facets (id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, summary TEXT)",
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS entity_facets (
          entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
          facet_id TEXT NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
          PRIMARY KEY (entity_id, facet_id)
        )`,
        args: [],
      },
      {
        sql: `UPDATE entities SET
          entity_type=?,title=?,slug=?,subtitle=?,description=?,date_start=?,date_end=?,date_display=?,location=?,country=?,continent=?,culture=?,
          region_id=?,people=?,cosmology=?,latitude=?,longitude=?,image_url=?,image_license=?,open_image=?,source_url=?,
          tags=?,themes=?,colors=?,materials=?,techniques=?,metadata=?,status=?,updated_at=?
          WHERE id=?`,
        args: [
          data.entityType, data.title, data.slug || null, data.subtitle || null, data.description || null,
          data.dateStart ?? null, data.dateEnd ?? null, data.dateDisplay || null, data.location || null, data.country || null, data.continent || null, data.culture || null,
          data.regionId || null, data.people || null, data.cosmology || null, data.latitude ?? null, data.longitude ?? null,
          data.imageUrl || null, data.imageLicense || null, data.openImage ? 1 : 0, data.sourceUrl || null,
          JSON.stringify(data.tags), JSON.stringify(data.themes), JSON.stringify(data.colors), JSON.stringify(data.materials),
          JSON.stringify(data.techniques), JSON.stringify(data.metadata), data.status, now, data.entityId,
        ],
      },
      {
        sql: `DELETE FROM entity_facets WHERE entity_id=? AND facet_id IN (${CURATORIAL_FACETS.map(() => "?").join(",")})`,
        args: [data.entityId, ...CURATORIAL_FACETS],
      },
    ];
    for (const facetId of data.curatorialFacets) {
      const definition = CURATORIAL_FACET_DEFINITIONS[facetId];
      statements.push({
        sql: "INSERT OR IGNORE INTO facets(id,kind,name,summary) VALUES (?,?,?,?)",
        args: [facetId, "curadoria", definition.name, definition.summary],
      });
      statements.push({
        sql: "INSERT OR IGNORE INTO entity_facets(entity_id,facet_id) VALUES (?,?)",
        args: [data.entityId, facetId],
      });
    }
    await batch(statements);
    return { ok: true };
  });


export const deleteCuratorialEntity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => EntityIdInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { batch } = await import("@/lib/turso/client.server");
    await requireReviewer();
    await batch([
      { sql: "DELETE FROM relations WHERE source_id=? OR target_id=?", args: [data.entityId, data.entityId] },
      { sql: "DELETE FROM atlas_cards WHERE entity_id=?", args: [data.entityId] },
      { sql: "DELETE FROM image_suggestions WHERE entity_id=?", args: [data.entityId] },
      { sql: "DELETE FROM entities WHERE id=?", args: [data.entityId] },
    ]);
    return { ok: true };
  });
