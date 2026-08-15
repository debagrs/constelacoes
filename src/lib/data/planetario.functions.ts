/**
 * Camada planetária do Atlas.
 *
 * Versão de baixo consumo para Turso:
 * - totais, linha do tempo e facetas vêm de tabelas-resumo materializadas;
 * - deduplicação usa entity_dedupe_index, preparada fora das requisições públicas;
 * - paginação evita COUNT/GROUP BY sobre o acervo e usa cursor por id;
 * - busca usa FTS nativo do Turso quando disponível e um fallback simples quando não.
 */
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

export type FacetRow = {
  id: string;
  kind: string;
  name: string;
  summary: string | null;
  total: number;
};

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

const REGION_COUNTRY_TOKENS: Record<string, string[]> = {
  brasil: ["Brasil"],
  franca: ["França", "France"],
  italia: ["Itália", "Italy"],
  egito: ["Egito", "Egypt"],
  mali: ["Mali"],
  nigeria: ["Nigéria", "Nigeria"],
  "africa-do-sul": ["África do Sul", "South Africa"],
  indonesia: ["Indonésia", "Indonesia"],
  filipinas: ["Filipinas", "Philippines"],
  japao: ["Japão", "Japan"],
  china: ["China"],
  coreia: ["Coreia", "Korea"],
};

function countryCoherenceSql(regionId: string, alias = "e") {
  const tokens = REGION_COUNTRY_TOKENS[regionId];
  if (!tokens?.length) return { sql: "", args: [] as string[] };
  return {
    sql: ` AND (${tokens.map(() => `LOWER(COALESCE(${alias}.country,'')) LIKE LOWER(?)`).join(" OR ")})`,
    args: tokens.map((token) => `%${token}%`),
  };
}


function safeFtsQuery(value: string) {
  return value
    .replace(/["'():^*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

async function hasNativeFts(queryOne: any) {
  try {
    const row = await queryOne<{ enabled: number }>(
      "SELECT enabled FROM atlas_capabilities WHERE key='fts' LIMIT 1",
    );
    return Number(row?.enabled ?? 0) === 1;
  } catch {
    return false;
  }
}

const canonicalClause = "(di.entity_id IS NULL OR di.is_canonical = 1)";

export const listRegions = createServerFn({ method: "GET" }).handler(async () => {
  const { query } = await import("@/lib/turso/client.server");
  const { cachedPublic } = await import("@/lib/server-cache.server");

  return cachedPublic("planetario:regions:low-read:v1", 15 * 60_000, async () => {
    try {
      return await query<RegionNode>(
        `SELECT r.id,r.parent_id,r.name,r.continent,r.latitude,r.longitude,r.summary,
                COALESCE(s.published_count,0) AS total
           FROM regions r
           LEFT JOIN atlas_region_stats s ON s.region_id=r.id
          ORDER BY r.sort_order ASC`,
      );
    } catch {
      // O fallback permite o site abrir antes da primeira reconstrução dos resumos.
      return query<RegionNode>(
        `SELECT id,parent_id,name,continent,latitude,longitude,summary,0 AS total
           FROM regions ORDER BY sort_order ASC`,
      );
    }
  });
});

export const listFacets = createServerFn({ method: "GET" }).handler(async () => {
  const { query } = await import("@/lib/turso/client.server");
  const { cachedPublic } = await import("@/lib/server-cache.server");

  return cachedPublic("planetario:facets:low-read:v1", 15 * 60_000, async () => {
    try {
      return await query<FacetRow>(
        `SELECT f.id,f.kind,f.name,f.summary,COALESCE(s.published_count,0) AS total
           FROM facets f
           LEFT JOIN atlas_facet_stats s ON s.facet_id=f.id
          ORDER BY f.kind ASC,f.name COLLATE NOCASE ASC`,
      );
    } catch {
      return query<FacetRow>(
        `SELECT id,kind,name,summary,0 AS total FROM facets ORDER BY kind,name COLLATE NOCASE`,
      );
    }
  });
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

export const exploreEntities = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ExploreFilters.parse(d))
  .handler(async ({ data }) => {
    const { query, queryOne } = await import("@/lib/turso/client.server");
    const where: string[] = ["e.status='published'", canonicalClause];
    const args: Array<string | number> = [];

    const q = data.q?.trim();
    if (q) {
      if (await hasNativeFts(queryOne)) {
        where.push(`fts_match(
          e.title,e.subtitle,e.description,e.culture,e.country,e.tags,e.themes,e.materials,e.techniques,?
        )`);
        args.push(safeFtsQuery(q) || q);
      } else {
        const prefix = `${q}%`;
        where.push(`(e.title LIKE ? COLLATE NOCASE OR e.subtitle LIKE ? COLLATE NOCASE)`);
        args.push(prefix, prefix);
      }
    }

    if (data.regions?.length) {
      const ph = data.regions.map(() => "?").join(",");
      where.push(`(e.region_id IN (${ph}) OR e.region_id IN (SELECT id FROM regions WHERE parent_id IN (${ph})))`);
      args.push(...data.regions, ...data.regions);
    }
    if (data.types?.length) {
      where.push(`e.entity_type IN (${data.types.map(() => "?").join(",")})`);
      args.push(...data.types);
    }
    if (typeof data.from === "number") {
      where.push("e.date_start>=?");
      args.push(data.from);
    }
    if (typeof data.to === "number") {
      where.push("COALESCE(e.date_end,e.date_start)<=?");
      args.push(data.to);
    }
    if (data.onlyWithImage) where.push("e.image_url IS NOT NULL AND trim(e.image_url)<>''");

    for (const facet of data.facets ?? []) {
      where.push("EXISTS (SELECT 1 FROM entity_facets ef WHERE ef.entity_id=e.id AND ef.facet_id=?)");
      args.push(facet);
    }

    const limit = Math.min(data.limit ?? 300, 800);
    return query<ExploreItem>(
      `SELECT e.id,e.title,e.subtitle,e.entity_type,e.image_url,e.date_display,e.date_start,
              e.continent,e.country,e.culture,e.region_id,e.latitude,e.longitude
         FROM entities e
         LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
        WHERE ${where.join(" AND ")}
        ORDER BY e.id ASC
        LIMIT ?`,
      [...args, limit],
    );
  });

export const getRegionOverview = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { query, queryOne } = await import("@/lib/turso/client.server");
    const { cachedPublic } = await import("@/lib/server-cache.server");

    return cachedPublic(`planetario:overview:low-read:v1:${data.id}`, 10 * 60_000, async () => {
      const region = await queryOne<RegionNode>(
        `SELECT r.id,r.parent_id,r.name,r.continent,r.latitude,r.longitude,r.summary,
                COALESCE(s.published_count,0) AS total
           FROM regions r
           LEFT JOIN atlas_region_stats s ON s.region_id=r.id
          WHERE r.id=?`,
        [data.id],
      );
      if (!region) return null;

      const coherence = countryCoherenceSql(data.id);
      const itemArgs: Array<string | number> = [data.id, data.id, ...coherence.args];
      const scope = `(e.region_id=? OR e.region_id IN (SELECT id FROM regions WHERE parent_id=?))${coherence.sql}`;

      const [timeline, items, facets, children] = await Promise.all([
        query<{ bucket: number; total: number }>(
          `SELECT bucket,total FROM atlas_region_timeline WHERE region_id=? ORDER BY bucket ASC`,
          [data.id],
        ).catch(() => []),
        query<ExploreItem>(
          `SELECT e.id,e.title,e.subtitle,e.entity_type,e.image_url,e.date_display,e.date_start,
                  e.continent,e.country,e.culture,e.region_id,e.latitude,e.longitude
             FROM entities e
             LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
            WHERE e.status='published' AND ${scope} AND ${canonicalClause}
            ORDER BY CASE WHEN e.image_url IS NOT NULL AND trim(e.image_url)<>'' THEN 0 ELSE 1 END,e.id ASC
            LIMIT 60`,
          itemArgs,
        ),
        query<{ id: string; kind: string; name: string; total: number }>(
          `SELECT f.id,f.kind,f.name,s.total
             FROM atlas_region_facet_stats s
             JOIN facets f ON f.id=s.facet_id
            WHERE s.region_id=?
            ORDER BY s.total DESC
            LIMIT 12`,
          [data.id],
        ).catch(() => []),
        query<RegionNode>(
          `SELECT r.id,r.parent_id,r.name,r.continent,r.latitude,r.longitude,r.summary,
                  COALESCE(s.published_count,0) AS total
             FROM regions r
             LEFT JOIN atlas_region_stats s ON s.region_id=r.id
            WHERE r.parent_id=?
            ORDER BY r.sort_order`,
          [data.id],
        ),
      ]);

      return { region, timeline, items, facets, children };
    });
  });

/**
 * Galeria do mapa com paginação por cursor. Não calcula COUNT sobre entities.
 * O total exato só é lido das tabelas-resumo quando não há filtros adicionais.
 */
export const searchRegionItems = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().min(1).optional(),
        continent: z.string().min(1).optional(),
        q: z.string().optional(),
        types: z.array(z.string()).optional(),
        facets: z.array(z.string()).optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
        cursor: z.string().nullable().optional(),
      })
      .refine((value) => Boolean(value.id || value.continent), {
        message: "Informe uma região ou continente.",
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { query, queryOne } = await import("@/lib/turso/client.server");
    const { cachedPublic, cacheKey } = await import("@/lib/server-cache.server");
    const page = Math.max(1, Math.floor(data.page ?? 1));
    const pageSize = Math.min(48, Math.max(4, Math.floor(data.pageSize ?? 20)));
    const normalized = {
      id: data.id ?? null,
      continent: data.continent?.trim() ?? null,
      q: data.q?.trim() ?? "",
      types: [...(data.types ?? [])].sort(),
      facets: [...(data.facets ?? [])].sort(),
      page,
      pageSize,
      cursor: data.cursor ?? null,
    };

    return cachedPublic(cacheKey("planetario:map-items:low-read:v1", normalized), 5 * 60_000, async () => {
      const where: string[] = ["e.status='published'", canonicalClause];
      const args: Array<string | number> = [];

      if (data.id) {
        const coherence = countryCoherenceSql(data.id);
        where.push(`(e.region_id=? OR e.region_id IN (SELECT id FROM regions WHERE parent_id=?))${coherence.sql}`);
        args.push(data.id, data.id, ...coherence.args);
      } else if (data.continent) {
        // Só usa o continente documentado no registro; não herda region_id potencialmente inconsistente.
        where.push("LOWER(TRIM(COALESCE(e.continent,'')))=LOWER(TRIM(?))");
        args.push(data.continent.trim());
      }

      const term = data.q?.trim();
      if (term) {
        if (await hasNativeFts(queryOne)) {
          where.push(`fts_match(
            e.title,e.subtitle,e.description,e.culture,e.country,e.tags,e.themes,e.materials,e.techniques,?
          )`);
          args.push(safeFtsQuery(term) || term);
        } else {
          const prefix = `${term}%`;
          where.push(`(e.title LIKE ? COLLATE NOCASE OR e.subtitle LIKE ? COLLATE NOCASE)`);
          args.push(prefix, prefix);
        }
      }

      if (data.types?.length) {
        where.push(`e.entity_type IN (${data.types.map(() => "?").join(",")})`);
        args.push(...data.types);
      }
      for (const facet of data.facets ?? []) {
        where.push("EXISTS (SELECT 1 FROM entity_facets ef WHERE ef.entity_id=e.id AND ef.facet_id=?)");
        args.push(facet);
      }
      if (data.cursor) {
        where.push("e.id>?");
        args.push(data.cursor);
      }

      const rows = await query<ExploreItem>(
        `SELECT e.id,e.title,e.subtitle,e.entity_type,e.image_url,e.date_display,e.date_start,
                e.continent,e.country,e.culture,e.region_id,e.latitude,e.longitude
           FROM entities e
           LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
          WHERE ${where.join(" AND ")}
          ORDER BY e.id ASC
          LIMIT ?`,
        [...args, pageSize + 1],
      );

      const hasNext = rows.length > pageSize;
      const items = rows.slice(0, pageSize);
      const nextCursor = hasNext && items.length ? items[items.length - 1].id : null;

      let total: number | null = null;
      const noExtraFilters = !term && !(data.types?.length) && !(data.facets?.length);
      if (noExtraFilters) {
        if (data.id) {
          const stat = await queryOne<{ total: number }>(
            "SELECT published_count AS total FROM atlas_region_stats WHERE region_id=?",
            [data.id],
          ).catch(() => null);
          total = stat ? Number(stat.total ?? 0) : null;
        } else if (data.continent) {
          const stat = await queryOne<{ total: number }>(
            "SELECT published_count AS total FROM atlas_continent_stats WHERE continent=?",
            [data.continent.trim()],
          ).catch(() => null);
          total = stat ? Number(stat.total ?? 0) : null;
        }
      }

      return { items, total, page, pageSize, hasNext, nextCursor };
    });
  });
