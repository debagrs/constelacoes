/**
 * Leituras públicas do acervo (Turso). Thin wrapper: nada em escopo de módulo.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listAcervo = createServerFn({ method: "GET" }).handler(async () => {
  const { query } = await import("@/lib/turso/client.server");
  return await query<{
    id: string;
    title: string;
    subtitle: string | null;
    entity_type: string;
    image_url: string | null;
    date_display: string | null;
    continent: string | null;
    country: string | null;
    culture: string | null;
    tags: string;
    themes: string;
    metadata: string;
  }>(
    `SELECT id, title, subtitle, entity_type, image_url, date_display, continent, country, culture, tags, themes, metadata
       FROM entities WHERE status = 'published' ORDER BY title COLLATE NOCASE ASC`,
  );
});

export const listFeatured = createServerFn({ method: "GET" }).handler(async () => {
  const { query } = await import("@/lib/turso/client.server");
  return await query<{
    id: string;
    title: string;
    subtitle: string | null;
    entity_type: string;
    image_url: string | null;
    date_display: string | null;
    continent: string | null;
  }>(
    `SELECT id, title, subtitle, entity_type, image_url, date_display, continent
       FROM entities
      WHERE status = 'published' AND image_url IS NOT NULL AND image_url <> ''
      ORDER BY created_at DESC LIMIT 6`,
  );
});

export const getEntityDetail = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { query, queryOne } = await import("@/lib/turso/client.server");
    const { mapEntity } = await import("@/lib/turso/rows");

    const row = await queryOne<Record<string, unknown>>(
      "SELECT * FROM entities WHERE id = ? AND status = 'published'",
      [data.id],
    );
    if (!row) return null;
    const entity = mapEntity(row);

    const rels = await query<{
      id: string;
      source_id: string;
      target_id: string;
      relation_type: string;
      description: string | null;
      other_id: string;
      other_title: string | null;
      other_type: string | null;
    }>(
      `SELECT r.id, r.source_id, r.target_id, r.relation_type, r.description,
              CASE WHEN r.source_id = ?1 THEN r.target_id ELSE r.source_id END AS other_id,
              e.title AS other_title, e.entity_type AS other_type
         FROM relations r
         LEFT JOIN entities e
                ON e.id = CASE WHEN r.source_id = ?1 THEN r.target_id ELSE r.source_id END
        WHERE r.status = 'published' AND (r.source_id = ?1 OR r.target_id = ?1)`,
      [data.id],
    );

    const related = rels.map((r) => ({
      relationId: r.id,
      relationType: r.relation_type,
      description: r.description,
      direction: r.source_id === data.id ? ("out" as const) : ("in" as const),
      id: r.other_id,
      title: r.other_title ?? "—",
      entity_type: r.other_type ?? "obra",
    }));

    const bibliography = await query<{
      id: string;
      title: string;
      authors: string | null;
      year: number | null;
      url: string | null;
    }>(
      `SELECT b.id, b.title, b.authors, b.year, b.url
         FROM entity_bibliography eb
         JOIN bibliography b ON b.id = eb.bibliography_id
        WHERE eb.entity_id = ?
        ORDER BY COALESCE(b.year, 0) ASC`,
      [data.id],
    );

    return { entity, related, bibliography };
  });

export const getNetwork = createServerFn({ method: "GET" }).handler(async () => {
  const { query } = await import("@/lib/turso/client.server");
  const [nodes, links] = await Promise.all([
    query<{ id: string; title: string; entity_type: string }>(
      "SELECT id, title, entity_type FROM entities WHERE status = 'published'",
    ),
    query<{
      id: string;
      source_id: string;
      target_id: string;
      relation_type: string;
    }>(
      "SELECT id, source_id, target_id, relation_type FROM relations WHERE status = 'published'",
    ),
  ]);
  return { nodes, links };
});
