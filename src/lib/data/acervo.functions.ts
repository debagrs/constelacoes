/**
 * Leituras públicas do acervo (Turso).
 * A listagem remove duplicatas visuais sem apagar nenhum registro do banco.
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
    `WITH ranked AS (
       SELECT
         id, title, subtitle, entity_type, image_url, date_display,
         continent, country, culture, tags, themes, metadata,
         ROW_NUMBER() OVER (
           PARTITION BY
             CASE
               WHEN image_url IS NOT NULL AND trim(image_url) <> '' THEN lower(trim(image_url))
               ELSE lower(trim(title)) || '|' || lower(trim(COALESCE(subtitle, '')))
             END
           ORDER BY
             CASE WHEN image_url IS NOT NULL AND trim(image_url) <> '' THEN 0 ELSE 1 END,
             created_at ASC,
             id ASC
         ) AS duplicate_rank
       FROM entities
       WHERE status = 'published'
     )
     SELECT id, title, subtitle, entity_type, image_url, date_display,
            continent, country, culture, tags, themes, metadata
     FROM ranked
     WHERE duplicate_rank = 1
     ORDER BY title COLLATE NOCASE ASC`,
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
    `WITH ranked AS (
       SELECT id, title, subtitle, entity_type, image_url, date_display, continent,
              ROW_NUMBER() OVER (
                PARTITION BY lower(trim(image_url))
                ORDER BY created_at DESC, id ASC
              ) AS duplicate_rank,
              created_at
       FROM entities
       WHERE status = 'published'
         AND image_url IS NOT NULL
         AND trim(image_url) <> ''
     )
     SELECT id, title, subtitle, entity_type, image_url, date_display, continent
     FROM ranked
     WHERE duplicate_rank = 1
     ORDER BY created_at DESC
     LIMIT 6`,
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


export const listEntitiesByTag = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ tag: z.string().trim().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { query } = await import("@/lib/turso/client.server");
    const like = `%${data.tag.trim()}%`;

    return await query<{
      id: string;
      title: string;
      subtitle: string | null;
      description: string | null;
      entity_type: string;
      image_url: string | null;
      date_display: string | null;
      country: string | null;
      continent: string | null;
      culture: string | null;
      source_url: string | null;
      tags: string;
      themes: string;
      metadata: string;
    }>(
      `WITH ranked AS (
         SELECT
           id, title, subtitle, description, entity_type, image_url, date_display,
           country, continent, culture, source_url, tags, themes, metadata,
           ROW_NUMBER() OVER (
             PARTITION BY
               CASE
                 WHEN image_url IS NOT NULL AND trim(image_url) <> ''
                   THEN lower(trim(image_url))
                 ELSE lower(trim(title)) || '|' || lower(trim(COALESCE(subtitle, '')))
               END
             ORDER BY created_at ASC, id ASC
           ) AS duplicate_rank
         FROM entities
         WHERE status = 'published'
           AND (
             COALESCE(tags, '') LIKE ?1 COLLATE NOCASE
             OR COALESCE(themes, '') LIKE ?1 COLLATE NOCASE
             OR COALESCE(metadata, '') LIKE ?1 COLLATE NOCASE
             OR COALESCE(culture, '') LIKE ?1 COLLATE NOCASE
             OR COALESCE(country, '') LIKE ?1 COLLATE NOCASE
           )
       )
       SELECT id, title, subtitle, description, entity_type, image_url, date_display,
              country, continent, culture, source_url, tags, themes, metadata
       FROM ranked
       WHERE duplicate_rank = 1
       ORDER BY title COLLATE NOCASE ASC
       LIMIT 240`,
      [like],
    );
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
