import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EntityIdInput = z.object({ entityId: z.string().min(1).max(200) });
const SuggestionInput = z.object({ suggestionId: z.string().min(1).max(200) });

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
    const { queryOne } = await import("@/lib/turso/client.server");
    await requireReviewer();
    const row = await queryOne<Record<string, unknown>>(
      `SELECT id,entity_type,title,slug,subtitle,description,date_display,location,country,continent,
              culture,region_id,people,cosmology,image_license,source_url,tags,themes,colors,materials,techniques,metadata
         FROM entities WHERE id=?`,
      [data.entityId],
    );
    if (!row) throw new Error("Registro não encontrado.");
    return row;
  });

const UpdateCuratorialEntityInput = z.object({
  entityId: z.string().min(1).max(200),
  entityType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(300),
  slug: z.string().trim().max(300).optional().default(""),
  subtitle: z.string().trim().max(500).optional().default(""),
  description: z.string().max(15000).optional().default(""),
  dateDisplay: z.string().trim().max(200).optional().default(""),
  location: z.string().trim().max(300).optional().default(""),
  country: z.string().trim().max(160).optional().default(""),
  continent: z.string().trim().max(160).optional().default(""),
  culture: z.string().trim().max(300).optional().default(""),
  regionId: z.string().trim().max(200).optional().default(""),
  people: z.string().trim().max(300).optional().default(""),
  cosmology: z.string().trim().max(500).optional().default(""),
  imageLicense: z.string().trim().max(300).optional().default(""),
  sourceUrl: z.string().trim().max(2000).optional().default("").refine((v) => !v || /^https?:\/\//i.test(v), "A URL da fonte precisa começar com http:// ou https://."),
  tags: z.array(z.string().trim().min(1).max(160)).max(80),
  themes: z.array(z.string().trim().min(1).max(160)).max(80),
  colors: z.array(z.string().trim().min(1).max(160)).max(80),
  materials: z.array(z.string().trim().min(1).max(160)).max(80),
  techniques: z.array(z.string().trim().min(1).max(160)).max(80),
  metadata: z.record(z.string(), z.unknown()),
});

export const updateCuratorialEntity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateCuratorialEntityInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { execute, nowIso } = await import("@/lib/turso/client.server");
    await requireReviewer();
    await execute(
      `UPDATE entities SET
         entity_type=?,title=?,slug=?,subtitle=?,description=?,date_display=?,location=?,country=?,continent=?,culture=?,
         region_id=?,people=?,cosmology=?,image_license=?,source_url=?,tags=?,themes=?,colors=?,materials=?,techniques=?,metadata=?,updated_at=?
       WHERE id=?`,
      [
        data.entityType, data.title, data.slug || null, data.subtitle || null, data.description || null,
        data.dateDisplay || null, data.location || null, data.country || null, data.continent || null, data.culture || null,
        data.regionId || null, data.people || null, data.cosmology || null, data.imageLicense || null, data.sourceUrl || null,
        JSON.stringify(data.tags), JSON.stringify(data.themes), JSON.stringify(data.colors), JSON.stringify(data.materials),
        JSON.stringify(data.techniques), JSON.stringify(data.metadata), nowIso(), data.entityId,
      ],
    );
    return { ok: true };
  });
