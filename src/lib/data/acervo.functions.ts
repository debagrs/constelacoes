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

    const entityType = String(entity.entity_type ?? "").toLowerCase();

    const sameArtistWorks = await query<{
      id: string;
      title: string;
      subtitle: string | null;
      entity_type: string;
      image_url: string | null;
      date_display: string | null;
      country: string | null;
      culture: string | null;
      source_url: string | null;
    }>(
      entityType === "artista"
        ? `WITH candidates AS (
             SELECT e.id, e.title, e.subtitle, e.entity_type, e.image_url,
                    e.date_display, e.country, e.culture, e.source_url,
                    ROW_NUMBER() OVER (
                      PARTITION BY CASE
                        WHEN e.image_url IS NOT NULL AND trim(e.image_url) <> ''
                          THEN lower(trim(e.image_url))
                        ELSE lower(trim(e.title)) || '|' || lower(trim(COALESCE(e.subtitle, '')))
                      END
                      ORDER BY e.created_at ASC, e.id ASC
                    ) AS duplicate_rank
               FROM entities e
              WHERE e.status = 'published'
                AND e.id <> ?1
                AND e.entity_type IN ('obra','projeto','fotografia','design','arquitetura','filme','performance')
                AND (
                  lower(trim(COALESCE(e.subtitle, ''))) = lower(trim(?2))
                  OR lower(COALESCE(e.subtitle, '')) LIKE '%' || lower(trim(?2)) || '%'
                  OR lower(COALESCE(e.metadata, '')) LIKE '%' || lower(trim(?2)) || '%'
                  OR EXISTS (
                    SELECT 1 FROM relations r
                     WHERE r.status = 'published'
                       AND ((r.source_id = ?1 AND r.target_id = e.id)
                         OR (r.target_id = ?1 AND r.source_id = e.id))
                  )
                )
           )
           SELECT id, title, subtitle, entity_type, image_url, date_display,
                  country, culture, source_url
             FROM candidates
            WHERE duplicate_rank = 1
            ORDER BY COALESCE(date_display, ''), title COLLATE NOCASE
            LIMIT 24`
        : `WITH creators AS (
             SELECT DISTINCT other_id, other_title
               FROM (
                 SELECT CASE WHEN r.source_id = ?1 THEN r.target_id ELSE r.source_id END AS other_id,
                        a.title AS other_title, a.entity_type AS other_type
                   FROM relations r
                   JOIN entities a ON a.id = CASE WHEN r.source_id = ?1 THEN r.target_id ELSE r.source_id END
                  WHERE r.status = 'published'
                    AND (r.source_id = ?1 OR r.target_id = ?1)
               )
              WHERE lower(other_type) = 'artista'
           ), candidates AS (
             SELECT e.id, e.title, e.subtitle, e.entity_type, e.image_url,
                    e.date_display, e.country, e.culture, e.source_url,
                    ROW_NUMBER() OVER (
                      PARTITION BY CASE
                        WHEN e.image_url IS NOT NULL AND trim(e.image_url) <> ''
                          THEN lower(trim(e.image_url))
                        ELSE lower(trim(e.title)) || '|' || lower(trim(COALESCE(e.subtitle, '')))
                      END
                      ORDER BY e.created_at ASC, e.id ASC
                    ) AS duplicate_rank
               FROM entities e
              WHERE e.status = 'published'
                AND e.id <> ?1
                AND e.entity_type IN ('obra','projeto','fotografia','design','arquitetura','filme','performance')
                AND (
                  EXISTS (
                    SELECT 1 FROM creators c
                     WHERE lower(trim(COALESCE(e.subtitle, ''))) = lower(trim(c.other_title))
                        OR lower(COALESCE(e.metadata, '')) LIKE '%' || lower(trim(c.other_title)) || '%'
                        OR EXISTS (
                          SELECT 1 FROM relations rr
                           WHERE rr.status = 'published'
                             AND ((rr.source_id = c.other_id AND rr.target_id = e.id)
                               OR (rr.target_id = c.other_id AND rr.source_id = e.id))
                        )
                  )
                  OR (
                    NOT EXISTS (SELECT 1 FROM creators)
                    AND trim(COALESCE(?2, '')) <> ''
                    AND (
                      lower(trim(COALESCE(e.subtitle, ''))) = lower(trim(?2))
                      OR lower(COALESCE(e.subtitle, '')) LIKE '%' || lower(trim(?2)) || '%'
                    )
                  )
                )
           )
           SELECT id, title, subtitle, entity_type, image_url, date_display,
                  country, culture, source_url
             FROM candidates
            WHERE duplicate_rank = 1
            ORDER BY COALESCE(date_display, ''), title COLLATE NOCASE
            LIMIT 24`,
      [data.id, entity.subtitle ?? entity.title],
    );

    return { entity, related, bibliography, sameArtistWorks };
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

  const normalizeRelationType = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_")
      .replace(/^influence$/, "influencia")
      .replace(/^continuity$/, "continuidade")
      .replace(/^survival$/, "sobrevivencia");

  const rawLinks = await query<{
    id: string;
    source_id: string;
    target_id: string;
    relation_type: string;
  }>(
    `SELECT id, source_id, target_id, relation_type
       FROM relations
      WHERE status = 'published'
        AND source_id IS NOT NULL
        AND target_id IS NOT NULL
        AND trim(source_id) <> ''
        AND trim(target_id) <> ''`,
  );

  const links = rawLinks.map((link) => ({
    ...link,
    relation_type: normalizeRelationType(link.relation_type),
  }));

  const connectedIds = Array.from(
    new Set(links.flatMap((link) => [link.source_id, link.target_id])),
  );

  if (connectedIds.length === 0) return { nodes: [], links: [] };

  const placeholders = connectedIds.map(() => "?").join(",");
  const nodes = await query<{ id: string; title: string; entity_type: string }>(
    `SELECT id, title, entity_type
       FROM entities
      WHERE status = 'published'
        AND id IN (${placeholders})
      ORDER BY title COLLATE NOCASE`,
    connectedIds,
  );

  const validIds = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    links: links.filter(
      (link) => validIds.has(link.source_id) && validIds.has(link.target_id),
    ),
  };
});
