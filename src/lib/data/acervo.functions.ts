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

  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  const normalizeRelationType = (value: string) => {
    const type = normalize(value);
    if (type === "influence") return "influencia";
    if (type === "continuity") return "continuidade";
    if (type === "survival") return "sobrevivencia";
    return type;
  };

  const rawExplicit = await query<{
    id: string;
    source_id: string;
    target_id: string;
    relation_type: string;
    description: string | null;
    confidence: number | null;
  }>(
    `SELECT id, source_id, target_id, relation_type, description, confidence
       FROM relations
      WHERE status = 'published'
        AND source_id IS NOT NULL
        AND target_id IS NOT NULL
        AND trim(source_id) <> ''
        AND trim(target_id) <> ''`,
  );

  const entityRows = await query<{
    id: string;
    title: string;
    subtitle: string | null;
    entity_type: string;
    date_start: number | null;
    country: string | null;
    continent: string | null;
    culture: string | null;
    tags: string;
    themes: string;
    materials: string;
    techniques: string;
    metadata: string;
  }>(
    `SELECT id, title, subtitle, entity_type, date_start, country, continent,
            culture, tags, themes, materials, techniques, metadata
       FROM entities
      WHERE status = 'published'
      ORDER BY CASE WHEN image_url IS NOT NULL AND trim(image_url) <> '' THEN 0 ELSE 1 END,
               updated_at DESC`,
  );

  const motifRows = await query<{
    entity_id: string;
    motif_id: string;
    motif_name: string;
  }>(
    `SELECT em.entity_id, em.motif_id, m.name AS motif_name
       FROM entity_motifs em
       JOIN motifs m ON m.id = em.motif_id
       JOIN entities e ON e.id = em.entity_id
      WHERE m.status = 'published' AND e.status = 'published'`,
  );

  const parseArray = (value: string | null | undefined): string[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((item) => String(item).trim()).filter(Boolean)
        : [];
    } catch {
      return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
    }
  };

  const motifsByEntity = new Map<string, string[]>();
  for (const row of motifRows) {
    const current = motifsByEntity.get(row.entity_id) ?? [];
    current.push(row.motif_name);
    motifsByEntity.set(row.entity_id, current);
  }

  const entities = entityRows.map((row) => {
    const tokens = new Set<string>();
    const add = (value: string | null | undefined, prefix = "") => {
      if (!value) return;
      const normalized = normalize(value);
      if (normalized.length > 2) tokens.add(prefix + normalized);
    };
    for (const tag of parseArray(row.tags)) add(tag, "tag:");
    for (const theme of parseArray(row.themes)) add(theme, "theme:");
    for (const material of parseArray(row.materials)) add(material, "material:");
    for (const technique of parseArray(row.techniques)) add(technique, "technique:");
    for (const motif of motifsByEntity.get(row.id) ?? []) add(motif, "motif:");
    add(row.country, "country:");
    add(row.culture, "culture:");
    return { ...row, tokens };
  });

  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const links: Array<{
    id: string;
    source_id: string;
    target_id: string;
    relation_type: string;
    description: string | null;
    confidence: number | null;
    provenance: "registered" | "suggested";
    evidence: string[];
  }> = [];
  const pairKeys = new Set<string>();

  const pairKey = (a: string, b: string, type: string) =>
    [a, b].sort().join("|") + "|" + type;

  for (const relation of rawExplicit) {
    if (!entityById.has(relation.source_id) || !entityById.has(relation.target_id)) continue;
    const type = normalizeRelationType(relation.relation_type);
    pairKeys.add(pairKey(relation.source_id, relation.target_id, type));
    links.push({
      ...relation,
      relation_type: type,
      provenance: "registered",
      evidence: relation.description ? [relation.description] : [],
    });
  }

  const buckets = new Map<string, string[]>();
  for (const entity of entities) {
    for (const token of entity.tokens) {
      const bucket = buckets.get(token) ?? [];
      if (bucket.length < 45) bucket.push(entity.id);
      buckets.set(token, bucket);
    }
  }

  const candidateEvidence = new Map<string, Set<string>>();
  for (const [token, ids] of buckets) {
    if (ids.length < 2 || ids.length > 45) continue;
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const key = [ids[i], ids[j]].sort().join("|");
        const evidence = candidateEvidence.get(key) ?? new Set<string>();
        evidence.add(token);
        candidateEvidence.set(key, evidence);
      }
    }
  }

  const degrees = new Map<string, number>();
  for (const link of links) {
    degrees.set(link.source_id, (degrees.get(link.source_id) ?? 0) + 1);
    degrees.set(link.target_id, (degrees.get(link.target_id) ?? 0) + 1);
  }

  const scoredCandidates = Array.from(candidateEvidence.entries())
    .map(([key, evidenceSet]) => {
      const [sourceId, targetId] = key.split("|");
      const source = entityById.get(sourceId);
      const target = entityById.get(targetId);
      if (!source || !target) return null;
      const evidence = Array.from(evidenceSet);
      const motifs = evidence.filter((item) => item.startsWith("motif:"));
      const concepts = evidence.filter(
        (item) => item.startsWith("tag:") || item.startsWith("theme:"),
      );
      const techniques = evidence.filter(
        (item) => item.startsWith("material:") || item.startsWith("technique:"),
      );
      const dateGap =
        source.date_start != null && target.date_start != null
          ? Math.abs(source.date_start - target.date_start)
          : null;
      const score = motifs.length * 5 + concepts.length * 3 + techniques.length * 2 +
        (evidence.some((item) => item.startsWith("culture:")) ? 1 : 0) +
        (dateGap != null && dateGap <= 100 ? 1 : 0);
      return { source, target, evidence, motifs, concepts, techniques, dateGap, score };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.score >= 5)
    .sort((a, b) => b.score - a.score);

  let suggestedCount = 0;
  for (const candidate of scoredCandidates) {
    if (suggestedCount >= 650) break;
    const sourceDegree = degrees.get(candidate.source.id) ?? 0;
    const targetDegree = degrees.get(candidate.target.id) ?? 0;
    if (sourceDegree >= 7 || targetDegree >= 7) continue;

    let relationType = "continuidade";
    if (candidate.motifs.length > 0) relationType = "sobrevivencia";
    else if (
      candidate.concepts.length >= 3 &&
      candidate.dateGap != null &&
      candidate.dateGap > 0 &&
      candidate.dateGap <= 180
    ) {
      relationType = "influencia";
    }

    const key = pairKey(candidate.source.id, candidate.target.id, relationType);
    if (pairKeys.has(key)) continue;
    pairKeys.add(key);

    let sourceId = candidate.source.id;
    let targetId = candidate.target.id;
    if (
      relationType === "influencia" &&
      candidate.source.date_start != null &&
      candidate.target.date_start != null &&
      candidate.source.date_start > candidate.target.date_start
    ) {
      sourceId = candidate.target.id;
      targetId = candidate.source.id;
    }

    const readableEvidence = candidate.evidence.slice(0, 5).map((item) => {
      const [kind, ...rest] = item.split(":");
      const label = rest.join(":").replace(/_/g, " ");
      const kindLabel: Record<string, string> = {
        motif: "motivo",
        tag: "tag",
        theme: "tema",
        material: "material",
        technique: "técnica",
        culture: "cultura",
        country: "território",
      };
      return `${kindLabel[kind] ?? kind}: ${label}`;
    });

    links.push({
      id: `suggested:${sourceId}:${targetId}:${relationType}`,
      source_id: sourceId,
      target_id: targetId,
      relation_type: relationType,
      description:
        relationType === "sobrevivencia"
          ? "Sobrevivência visual sugerida por motivos recorrentes."
          : relationType === "influencia"
            ? "Possível influência sugerida por proximidade temporal e afinidades documentadas."
            : "Continuidade curatorial sugerida por metadados compartilhados.",
      confidence: Math.min(0.92, 0.48 + candidate.score * 0.035),
      provenance: "suggested",
      evidence: readableEvidence,
    });
    degrees.set(sourceId, sourceDegree + 1);
    degrees.set(targetId, targetDegree + 1);
    suggestedCount += 1;
  }

  const connectedIds = Array.from(
    new Set(links.flatMap((link) => [link.source_id, link.target_id])),
  );
  const nodes = entities
    .filter((entity) => connectedIds.includes(entity.id))
    .map(({ id, title, entity_type }) => ({ id, title, entity_type }));

  const validIds = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    links: links.filter(
      (link) => validIds.has(link.source_id) && validIds.has(link.target_id),
    ),
  };
});
