/** Camada planetária: regiões, facetas e exploração multidimensional do acervo. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type RegionNode = {
  id: string;
  parent_id: string | null;
  name: string;
  continent: string;
  latitude: number | null;
  longitude: number | null;
  summary: string | null;
  total: number;
};

export const listRegions = createServerFn({ method: "GET" }).handler(async () => {
  const { query } = await import("@/lib/turso/client.server");
  return await query<RegionNode>(
    `SELECT r.id, r.parent_id, r.name, r.continent, r.latitude, r.longitude, r.summary,
            (SELECT COUNT(*) FROM entities e
              WHERE e.status = 'published'
                AND (e.region_id = r.id OR e.region_id IN (SELECT id FROM regions WHERE parent_id = r.id))) AS total
       FROM regions r
      ORDER BY r.sort_order ASC`,
  );
});

export type FacetRow = { id: string; kind: string; name: string; summary: string | null; total: number };

export const listFacets = createServerFn({ method: "GET" }).handler(async () => {
  const { query } = await import("@/lib/turso/client.server");
  return await query<FacetRow>(
    `SELECT f.id, f.kind, f.name, f.summary,
            (SELECT COUNT(*) FROM entity_facets ef
               JOIN entities e ON e.id = ef.entity_id AND e.status = 'published'
              WHERE ef.facet_id = f.id) AS total
       FROM facets f
      ORDER BY f.kind ASC, f.name COLLATE NOCASE ASC`,
  );
});

export const ExploreFilters = z.object({
  q: z.string().optional(),
  regions: z.array(z.string()).optional(),
  facets: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  from: z.number().nullable().optional(),
  to: z.number().nullable().optional(),
  onlyWithImage: z.boolean().optional(),
  limit: z.number().optional(),
});
export type ExploreFiltersInput = z.infer<typeof ExploreFilters>;

export type ExploreItem = {
  id: string;
  title: string;
  subtitle: string | null;
  entity_type: string;
  image_url: string | null;
  date_display: string | null;
  date_start: number | null;
  continent: string | null;
  country: string | null;
  culture: string | null;
  region_id: string | null;
  latitude: number | null;
  longitude: number | null;
};

export const exploreEntities = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ExploreFilters.parse(d))
  .handler(async ({ data }) => {
    const { query } = await import("@/lib/turso/client.server");
    const where: string[] = ["e.status = 'published'"];
    const args: (string | number)[] = [];

    if (data.q?.trim()) {
      where.push("(e.title LIKE ? OR e.subtitle LIKE ? OR e.culture LIKE ? OR e.country LIKE ?)");
      const like = `%${data.q.trim()}%`;
      args.push(like, like, like, like);
    }
    if (data.regions?.length) {
      const ph = data.regions.map(() => "?").join(",");
      where.push(
        `(e.region_id IN (${ph}) OR e.region_id IN (SELECT id FROM regions WHERE parent_id IN (${ph})))`,
      );
      args.push(...data.regions, ...data.regions);
    }
    if (data.types?.length) {
      where.push(`e.entity_type IN (${data.types.map(() => "?").join(",")})`);
      args.push(...data.types);
    }
    if (typeof data.from === "number") {
      where.push("e.date_start IS NOT NULL AND e.date_start >= ?");
      args.push(data.from);
    }
    if (typeof data.to === "number") {
      where.push("COALESCE(e.date_end, e.date_start) <= ?");
      args.push(data.to);
    }
    if (data.onlyWithImage) where.push("e.image_url IS NOT NULL AND e.image_url <> ''");
    if (data.facets?.length) {
      where.push(
        `(SELECT COUNT(DISTINCT ef.facet_id) FROM entity_facets ef
            WHERE ef.entity_id = e.id AND ef.facet_id IN (${data.facets.map(() => "?").join(",")})) = ?`,
      );
      args.push(...data.facets, data.facets.length);
    }

    const limit = Math.min(data.limit ?? 300, 800);
    return await query<ExploreItem>(
      `SELECT e.id, e.title, e.subtitle, e.entity_type, e.image_url, e.date_display, e.date_start,
              e.continent, e.country, e.culture, e.region_id, e.latitude, e.longitude
         FROM entities e
        WHERE ${where.join(" AND ")}
        ORDER BY (e.image_url IS NULL OR e.image_url = '') ASC, e.date_start ASC, e.title COLLATE NOCASE ASC
        LIMIT ${limit}`,
      args,
    );
  });

export const getRegionOverview = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { query, queryOne } = await import("@/lib/turso/client.server");
    const region = await queryOne<RegionNode>(
      "SELECT id, parent_id, name, continent, latitude, longitude, summary, 0 AS total FROM regions WHERE id = ?",
      [data.id],
    );
    if (!region) return null;

    const scope = `(e.region_id = ?1 OR e.region_id IN (SELECT id FROM regions WHERE parent_id = ?1))`;

    const timeline = await query<{ bucket: number; total: number }>(
      `SELECT CAST(e.date_start / 500 AS INTEGER) * 500 AS bucket, COUNT(*) AS total
         FROM entities e
        WHERE e.status = 'published' AND e.date_start IS NOT NULL AND ${scope}
        GROUP BY bucket ORDER BY bucket ASC`,
      [data.id],
    );

    const items = await query<ExploreItem>(
      `SELECT e.id, e.title, e.subtitle, e.entity_type, e.image_url, e.date_display, e.date_start,
              e.continent, e.country, e.culture, e.region_id, e.latitude, e.longitude
         FROM entities e
        WHERE e.status = 'published' AND ${scope}
        ORDER BY (e.image_url IS NULL OR e.image_url = '') ASC, e.date_start ASC
        LIMIT 60`,
      [data.id],
    );

    const facets = await query<{ id: string; kind: string; name: string; total: number }>(
      `SELECT f.id, f.kind, f.name, COUNT(*) AS total
         FROM entity_facets ef
         JOIN facets f ON f.id = ef.facet_id
         JOIN entities e ON e.id = ef.entity_id AND e.status = 'published'
        WHERE ${scope}
        GROUP BY f.id ORDER BY total DESC LIMIT 12`,
      [data.id],
    );

    const children = await query<RegionNode>(
      `SELECT r.id, r.parent_id, r.name, r.continent, r.latitude, r.longitude, r.summary,
              (SELECT COUNT(*) FROM entities e WHERE e.status='published' AND e.region_id = r.id) AS total
         FROM regions r WHERE r.parent_id = ? ORDER BY r.sort_order`,
      [data.id],
    );

    return { region, timeline, items, facets, children };
  });

/** Busca paginada de itens dentro de uma região (inclui sub-regiões). */
export const searchRegionItems = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().min(1),
        q: z.string().optional(),
        types: z.array(z.string()).optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { query, queryOne } = await import("@/lib/turso/client.server");
    const page = Math.max(1, Math.floor(data.page ?? 1));
    const pageSize = Math.min(48, Math.max(4, Math.floor(data.pageSize ?? 12)));

    const where: string[] = [
      "e.status = 'published'",
      "(e.region_id = ? OR e.region_id IN (SELECT id FROM regions WHERE parent_id = ?))",
    ];
    const args: (string | number)[] = [data.id, data.id];

    const term = data.q?.trim();
    if (term) {
      where.push("(e.title LIKE ? OR e.subtitle LIKE ? OR e.culture LIKE ? OR e.country LIKE ?)");
      const like = `%${term}%`;
      args.push(like, like, like, like);
    }
    if (data.types?.length) {
      where.push(`e.entity_type IN (${data.types.map(() => "?").join(",")})`);
      args.push(...data.types);
    }

    const clause = where.join(" AND ");
    const countRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM entities e WHERE ${clause}`,
      args,
    );
    const total = countRow?.total ?? 0;

    const items = await query<ExploreItem>(
      `SELECT e.id, e.title, e.subtitle, e.entity_type, e.image_url, e.date_display, e.date_start,
              e.continent, e.country, e.culture, e.region_id, e.latitude, e.longitude
         FROM entities e
        WHERE ${clause}
        ORDER BY (e.image_url IS NULL OR e.image_url = '') ASC, e.date_start ASC, e.title COLLATE NOCASE ASC
        LIMIT ? OFFSET ?`,
      [...args, pageSize, (page - 1) * pageSize],
    );

    return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  });

