/**
 * Leituras públicas do acervo (Turso).
 *
 * Versão de baixo consumo:
 * - cards visuais usam o índice materializado entity_dedupe_index;
 * - totais e tipos vêm de tabelas-resumo pequenas;
 * - paginação usa cursor em vez de COUNT + OFFSET;
 * - busca usa FTS nativo do Turso quando disponível;
 * - a Home consulta pools pequenos e sorteia em memória.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type AcervoListRow = {
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
};

type FeaturedRow = Pick<
  AcervoListRow,
  "id" | "title" | "subtitle" | "entity_type" | "image_url" | "date_display" | "continent"
> & {
  featured_category?: string;
  featured_category_id?: string;
};

const PRIMARY_LENS_FACET = {
  women: "curadoria:mulheres-e-maes",
  indigenous: "curadoria:indigenas",
  black: "curadoria:negros-e-diasporas",
  lgbtqia: "curadoria:lgbtqia",
  bioethics: "curadoria:bioetica-e-animalidades",
  beyond: "curadoria:alem-do-antropoceno",
} as const;

const PRIMARY_SPECIAL_FACETS = Object.values(PRIMARY_LENS_FACET);
const canonicalClause = "(di.entity_id IS NULL OR di.is_canonical=1)";

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

export const listAcervo = createServerFn({ method: "GET" }).handler(async () => {
  const { query } = await import("@/lib/turso/client.server");
  const { cachedPublic } = await import("@/lib/server-cache.server");

  return cachedPublic<AcervoListRow[]>("acervo:list:low-read:v1", 10 * 60_000, async () =>
    query<AcervoListRow>(
      `SELECT e.id,e.title,e.subtitle,e.entity_type,e.image_url,e.date_display,
              e.continent,e.country,e.culture,e.tags,e.themes,e.metadata
         FROM entities e
         LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
        WHERE e.status='published'
          AND e.image_url IS NOT NULL AND trim(e.image_url)<>''
          AND ${canonicalClause}
        ORDER BY e.id ASC
        LIMIT 240`,
    ),
  );
});

export const getAcervoStats = createServerFn({ method: "GET" }).handler(async () => {
  const { query } = await import("@/lib/turso/client.server");
  const { cachedPublic } = await import("@/lib/server-cache.server");

  return cachedPublic("acervo:stats:low-read:v1", 15 * 60_000, async () => {
    try {
      const keys = [
        "published",
        "published_with_image",
        "unique_images",
        "published_without_image",
        "aic_public_domain",
        "aic_with_image",
      ];
      const rows = await query<{ key: string; value: number }>(
        `SELECT key,value FROM atlas_metrics WHERE key IN (${keys.map(() => "?").join(",")})`,
        keys,
      );
      const metrics = new Map(rows.map((row) => [row.key, Number(row.value ?? 0)]));
      return {
        published: metrics.get("published") ?? 0,
        withImage: metrics.get("published_with_image") ?? 0,
        uniqueImages: metrics.get("unique_images") ?? 0,
        withoutImage: metrics.get("published_without_image") ?? 0,
        aicPublicDomain: metrics.get("aic_public_domain") ?? 0,
        aicWithImage: metrics.get("aic_with_image") ?? 0,
        statsReady: rows.length > 0,
      };
    } catch {
      return {
        published: 0,
        withImage: 0,
        uniqueImages: 0,
        withoutImage: 0,
        aicPublicDomain: 0,
        aicWithImage: 0,
        statsReady: false,
      };
    }
  });
});

const AcervoSearchInput = z.object({
  q: z.string().trim().max(160).optional(),
  type: z.string().trim().max(60).nullable().optional(),
  lens: z.enum(["traditional", "women", "indigenous", "black", "lgbtqia", "bioethics", "beyond"]).nullable().optional(),
  page: z.number().int().min(1).max(10000).default(1),
  pageSize: z.number().int().min(12).max(72).default(48),
  cursor: z.string().nullable().optional(),
});

export const searchAcervo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AcervoSearchInput.parse(d))
  .handler(async ({ data }) => {
    const { query, queryOne } = await import("@/lib/turso/client.server");
    const { cachedPublic, cacheKey } = await import("@/lib/server-cache.server");
    const { expandSearchTerms } = await import("@/lib/search-dictionary");
    const normalized = {
      q: data.q ?? "",
      type: data.type ?? null,
      lens: data.lens ?? null,
      page: data.page,
      pageSize: data.pageSize,
      cursor: data.cursor ?? null,
    };

    return cachedPublic(cacheKey("acervo:search:low-read:v1", normalized), 5 * 60_000, async () => {
      const where: string[] = [
        "e.status='published'",
        "e.image_url IS NOT NULL",
        "trim(e.image_url)<>''",
        canonicalClause,
      ];
      const args: Array<string | number> = [];

      const q = data.q?.trim();
      if (q) {
        const terms = expandSearchTerms(q, 8);
        if (await hasNativeFts(queryOne)) {
          // No parser Tantivy, termos separados funcionam como OR; preserva a busca ampliada sem varrer entities.
          const ftsQuery = terms
            .map((term) => term.replace(/["'():^*]/g, " ").trim())
            .filter(Boolean)
            .join(" ");
          where.push(`fts_match(
            e.title,e.subtitle,e.description,e.culture,e.country,e.tags,e.themes,e.materials,e.techniques,?
          )`);
          args.push(ftsQuery || q);
        } else {
          // Fallback de segurança: só prefixo em título/subtítulo (há índices NOCASE).
          // É propositalmente menos amplo que o FTS para nunca transformar uma busca em varredura
          // de 6–11 campos quando o acervo chegar a dezenas de milhares de registros.
          const fallbackTerms = terms.slice(0, 4);
          const groups: string[] = [];
          for (const term of fallbackTerms) {
            const prefix = `${term}%`;
            groups.push(`(e.title LIKE ? COLLATE NOCASE OR e.subtitle LIKE ? COLLATE NOCASE)`);
            args.push(prefix, prefix);
          }
          if (groups.length) where.push(`(${groups.join(" OR ")})`);
        }
      }

      if (data.type) {
        where.push("e.entity_type=?");
        args.push(data.type);
      }

      if (data.lens === "traditional") {
        where.push(`NOT EXISTS (
          SELECT 1 FROM entity_facets ef
           WHERE ef.entity_id=e.id
             AND ef.facet_id IN (${PRIMARY_SPECIAL_FACETS.map(() => "?").join(",")})
        )`);
        args.push(...PRIMARY_SPECIAL_FACETS);
      } else if (data.lens) {
        const facet = PRIMARY_LENS_FACET[data.lens];
        where.push("EXISTS (SELECT 1 FROM entity_facets ef WHERE ef.entity_id=e.id AND ef.facet_id=?)");
        args.push(facet);
      }

      if (data.cursor) {
        where.push("e.id>?");
        args.push(data.cursor);
      }

      const rows = await query<AcervoListRow>(
        `SELECT e.id,e.title,e.subtitle,e.entity_type,e.image_url,e.date_display,
                e.continent,e.country,e.culture,e.tags,e.themes,e.metadata
           FROM entities e
           LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
          WHERE ${where.join(" AND ")}
          ORDER BY e.id ASC
          LIMIT ?`,
        [...args, data.pageSize + 1],
      );
      const hasNext = rows.length > data.pageSize;
      const items = rows.slice(0, data.pageSize);
      const nextCursor = hasNext && items.length ? items[items.length - 1].id : null;

      const typeRows = await cachedPublic<{ entity_type: string }[]>(
        "acervo:types:low-read:v1",
        15 * 60_000,
        async () => {
          try {
            return await query<{ entity_type: string }>(
              "SELECT entity_type FROM atlas_type_stats WHERE with_image_count>0 ORDER BY entity_type COLLATE NOCASE",
            );
          } catch {
            return [];
          }
        },
      );
      const types = typeRows.map((row) => row.entity_type);

      let total: number | null = null;
      if (!q && !data.type) {
        try {
          if (!data.lens) {
            const row = await queryOne<{ value: number }>(
              "SELECT value FROM atlas_metrics WHERE key='unique_images'",
            );
            total = row ? Number(row.value ?? 0) : null;
          } else if (data.lens === "traditional") {
            const row = await queryOne<{ value: number }>(
              "SELECT value FROM atlas_metrics WHERE key='traditional_with_image'",
            );
            total = row ? Number(row.value ?? 0) : null;
          } else {
            const row = await queryOne<{ total: number }>(
              "SELECT with_image_count AS total FROM atlas_facet_stats WHERE facet_id=?",
              [PRIMARY_LENS_FACET[data.lens]],
            );
            total = row ? Number(row.total ?? 0) : null;
          }
        } catch {
          total = null;
        }
      }

      return {
        items,
        total,
        types,
        page: data.page,
        pageSize: data.pageSize,
        hasNext,
        nextCursor,
      };
    });
  });

/**
 * Home balanceada por perspectiva. Os pools são pequenos, indexados e ficam em cache;
 * a aleatoriedade acontece em memória, não com ORDER BY random() no banco.
 */
export const listFeatured = createServerFn({ method: "GET" }).handler(async () => {
  const { query } = await import("@/lib/turso/client.server");
  const { cachedPublic } = await import("@/lib/server-cache.server");

  const categories = [
    { id: "traditional", label: "Tradicional", facet: null },
    { id: "women", label: "Mulheres e mães", facet: PRIMARY_LENS_FACET.women },
    { id: "indigenous", label: "Indígenas", facet: PRIMARY_LENS_FACET.indigenous },
    { id: "black", label: "Negros e diásporas", facet: PRIMARY_LENS_FACET.black },
    { id: "lgbtqia", label: "LGBTQIA+", facet: PRIMARY_LENS_FACET.lgbtqia },
    { id: "bioethics", label: "Bioética e animalidades", facet: PRIMARY_LENS_FACET.bioethics },
    { id: "beyond", label: "Além do Antropoceno", facet: PRIMARY_LENS_FACET.beyond },
  ] as const;

  const pools = await cachedPublic<Record<string, FeaturedRow[]>>(
    "acervo:featured-pools:low-read:v1",
    15 * 60_000,
    async () => {
      const result: Record<string, FeaturedRow[]> = {};
      for (const category of categories) {
        if (category.facet) {
          result[category.id] = await query<FeaturedRow>(
            `SELECT e.id,e.title,e.subtitle,e.entity_type,e.image_url,e.date_display,e.continent
               FROM entity_facets ef
               JOIN entities e ON e.id=ef.entity_id
               LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
              WHERE ef.facet_id=?
                AND e.status='published'
                AND e.image_url IS NOT NULL AND trim(e.image_url)<>''
                AND ${canonicalClause}
              ORDER BY ef.entity_id DESC
              LIMIT 64`,
            [category.facet],
          );
        } else {
          result[category.id] = await query<FeaturedRow>(
            `SELECT e.id,e.title,e.subtitle,e.entity_type,e.image_url,e.date_display,e.continent
               FROM entities e
               LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
              WHERE e.status='published'
                AND e.image_url IS NOT NULL AND trim(e.image_url)<>''
                AND ${canonicalClause}
                AND NOT EXISTS (
                  SELECT 1 FROM entity_facets ef
                   WHERE ef.entity_id=e.id
                     AND ef.facet_id IN (${PRIMARY_SPECIAL_FACETS.map(() => "?").join(",")})
                )
              ORDER BY e.updated_at DESC
              LIMIT 64`,
            PRIMARY_SPECIAL_FACETS,
          );
        }
      }
      return result;
    },
  );

  const selected: FeaturedRow[] = [];
  const usedIds = new Set<string>();
  const usedImages = new Set<string>();
  const shuffle = <T,>(values: T[]) => {
    for (let i = values.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  };

  for (const category of categories) {
    const pick = shuffle([...(pools[category.id] ?? [])]).find((candidate) => {
      const image = candidate.image_url?.trim().toLowerCase() ?? "";
      return !usedIds.has(candidate.id) && (!image || !usedImages.has(image));
    });
    if (!pick) continue;
    usedIds.add(pick.id);
    if (pick.image_url) usedImages.add(pick.image_url.trim().toLowerCase());
    selected.push({ ...pick, featured_category: category.label, featured_category_id: category.id });
  }

  if (selected.length < categories.length) {
    const fallback = await cachedPublic<FeaturedRow[]>(
      "acervo:featured-fallback:low-read:v1",
      15 * 60_000,
      async () =>
        query<FeaturedRow>(
          `SELECT e.id,e.title,e.subtitle,e.entity_type,e.image_url,e.date_display,e.continent
             FROM entities e
             LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
            WHERE e.status='published'
              AND e.image_url IS NOT NULL AND trim(e.image_url)<>''
              AND ${canonicalClause}
            ORDER BY e.updated_at DESC
            LIMIT 96`,
        ),
    );
    for (const candidate of shuffle([...fallback])) {
      if (selected.length >= categories.length) break;
      const image = candidate.image_url?.trim().toLowerCase() ?? "";
      if (usedIds.has(candidate.id) || (image && usedImages.has(image))) continue;
      usedIds.add(candidate.id);
      if (image) usedImages.add(image);
      selected.push({ ...candidate, featured_category: "Acervo aberto" });
    }
  }

  return selected;
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
        ? `SELECT e.id,e.title,e.subtitle,e.entity_type,e.image_url,e.date_display,
                  e.country,e.culture,e.source_url
             FROM entities e
             LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
            WHERE e.status='published'
              AND e.image_url IS NOT NULL AND trim(e.image_url)<>''
              AND (di.entity_id IS NULL OR di.is_canonical=1)
              AND e.id<>?1
              AND e.entity_type IN ('obra','projeto','fotografia','design','arquitetura','filme','performance')
              AND (
                e.subtitle=?2 COLLATE NOCASE
                OR COALESCE(e.subtitle,'') LIKE ?2 || '%' COLLATE NOCASE
                OR EXISTS (
                  SELECT 1 FROM relations r
                   WHERE r.status='published'
                     AND ((r.source_id=?1 AND r.target_id=e.id) OR (r.target_id=?1 AND r.source_id=e.id))
                )
              )
            ORDER BY COALESCE(e.date_display,''),e.title COLLATE NOCASE
            LIMIT 24`
        : `WITH creators AS (
             SELECT DISTINCT a.id,a.title
               FROM relations r
               JOIN entities a ON a.id=CASE WHEN r.source_id=?1 THEN r.target_id ELSE r.source_id END
              WHERE r.status='published'
                AND (r.source_id=?1 OR r.target_id=?1)
                AND lower(a.entity_type)='artista'
           ), linked AS (
             SELECT DISTINCT CASE WHEN rr.source_id=c.id THEN rr.target_id ELSE rr.source_id END AS entity_id
               FROM creators c
               JOIN relations rr ON rr.status='published' AND (rr.source_id=c.id OR rr.target_id=c.id)
           )
           SELECT e.id,e.title,e.subtitle,e.entity_type,e.image_url,e.date_display,
                  e.country,e.culture,e.source_url
             FROM entities e
             LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
            WHERE e.status='published'
              AND e.image_url IS NOT NULL AND trim(e.image_url)<>''
              AND (di.entity_id IS NULL OR di.is_canonical=1)
              AND e.id<>?1
              AND e.entity_type IN ('obra','projeto','fotografia','design','arquitetura','filme','performance')
              AND (
                e.id IN (SELECT entity_id FROM linked)
                OR EXISTS (
                  SELECT 1 FROM creators c
                   WHERE e.subtitle=c.title COLLATE NOCASE
                      OR COALESCE(e.subtitle,'') LIKE c.title || '%' COLLATE NOCASE
                )
                OR (
                  NOT EXISTS (SELECT 1 FROM creators)
                  AND trim(COALESCE(?2,''))<>''
                  AND (e.subtitle=?2 COLLATE NOCASE OR COALESCE(e.subtitle,'') LIKE ?2 || '%' COLLATE NOCASE)
                )
              )
            ORDER BY COALESCE(e.date_display,''),e.title COLLATE NOCASE
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
    const { query, queryOne } = await import("@/lib/turso/client.server");
    const useFts = await hasNativeFts(queryOne);
    const args: string[] = [];
    let textClause: string;
    if (useFts) {
      textClause = `fts_match(e.title,e.subtitle,e.description,e.culture,e.country,e.tags,e.themes,e.materials,e.techniques,?)`;
      args.push(data.tag.trim());
    } else {
      const like = `%${data.tag.trim()}%`;
      textClause = `(
        COALESCE(e.tags,'') LIKE ? COLLATE NOCASE OR COALESCE(e.themes,'') LIKE ? COLLATE NOCASE OR
        COALESCE(e.culture,'') LIKE ? COLLATE NOCASE OR COALESCE(e.country,'') LIKE ? COLLATE NOCASE
      )`;
      args.push(like, like, like, like);
    }

    return query<{
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
      `SELECT e.id,e.title,e.subtitle,e.description,e.entity_type,e.image_url,e.date_display,
              e.country,e.continent,e.culture,e.source_url,e.tags,e.themes,e.metadata
         FROM entities e
         LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
        WHERE e.status='published'
          AND e.image_url IS NOT NULL AND trim(e.image_url)<>''
          AND (di.entity_id IS NULL OR di.is_canonical=1)
          AND ${textClause}
        ORDER BY e.id ASC
        LIMIT 240`,
      args,
    );
  });

const NetworkInput = z.object({
  focus: z.string().trim().max(240).nullable().optional(),
});

type NetworkEntityRow = {
  id: string;
  title: string;
  subtitle: string | null;
  entity_type: string;
  image_url: string | null;
  date_start: number | null;
  country: string | null;
  continent: string | null;
  culture: string | null;
  tags: string;
  themes: string;
  materials: string;
  techniques: string;
  metadata: string;
  updated_at: string | null;
};

type NetworkLink = {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  description: string | null;
  confidence: number | null;
  provenance: "registered" | "suggested";
  evidence: string[];
};

type NetworkConcept = {
  id: string;
  title: string;
  relationType: string;
  keywords: string[];
};

type NetworkAuthor = {
  id: string;
  title: string;
  concepts: string[];
};

const NETWORK_CONCEPTS: NetworkConcept[] = [
  {
    id: "concept:sobrevivencia-gesto",
    title: "Sobrevivência, gesto e migração das formas",
    relationType: "sobrevivencia",
    keywords: [
      "gesto", "pathos", "iconografia", "alegoria", "mitologia", "memoria visual",
      "antiguidade", "renascimento", "ninfa", "formula de pathos", "sobrevivencia",
      "migração das formas", "migracao das formas",
    ],
  },
  {
    id: "concept:reproducao-percepcao",
    title: "Reprodução técnica, olhar e percepção",
    relationType: "tecnologia",
    keywords: [
      "fotografia", "cinema", "reproducao", "imagem tecnica", "publicidade", "olhar",
      "percepcao", "aura", "impressao", "gravura", "mass media",
    ],
  },
  {
    id: "concept:dissenso-visualidade",
    title: "Dissenso, espectador e regimes de visualidade",
    relationType: "politica",
    keywords: [
      "dissenso", "espectador", "politica", "visualidade", "representacao", "comunidade",
      "emancipacao", "regime estetico", "regime de imagens",
    ],
  },
  {
    id: "concept:hibridacao-circulacao",
    title: "Hibridação, circulação e interculturalidade",
    relationType: "continuidade",
    keywords: [
      "hibrid", "intercultural", "cultura popular", "cultura urbana", "latino-amer",
      "circulacao", "migracao", "fronteira", "mesti", "transcultural",
    ],
  },
  {
    id: "concept:historia-potencial-arquivo",
    title: "História potencial, arquivo e regimes de visualidade",
    relationType: "colonialidade",
    keywords: [
      "arquivo", "documento", "museu", "colonial", "restituicao", "violencia", "fotografia",
      "colecao", "patrimonio", "proveniencia", "regime de visualidade",
    ],
  },
  {
    id: "concept:multiespecies-umwelt",
    title: "Multiespécies, Umwelt e percepção animal",
    relationType: "ecologia",
    keywords: [
      "animal", "gato", "felino", "cachorro", "cao", "ave", "passaro", "inseto", "aranha",
      "peixe", "cavalo", "umwelt", "multiespec", "percepcao animal", "especie companheira",
      "companion species", "mais que humano", "mais-que-humano",
    ],
  },
  {
    id: "concept:poshumano-materialidade",
    title: "Pós-humano, materialidade e agência",
    relationType: "material",
    keywords: [
      "pos-humano", "poshumano", "posthuman", "materia", "materialidade", "agencia",
      "ciborgue", "cibernet", "informacao", "assemblage", "vibrante", "intra-acao",
    ],
  },
  {
    id: "concept:colonialidade-decolonialidade",
    title: "Colonialidade, decolonialidade e território",
    relationType: "colonialidade",
    keywords: [
      "colonial", "decolonial", "descolon", "indigena", "povos originarios", "quilomb",
      "territorio", "fronteira", "sul global", "extrativ", "restituicao", "diáspora", "diaspora",
    ],
  },
  {
    id: "concept:cosmotecnica-tecnodiversidade",
    title: "Cosmotécnica e tecnodiversidade",
    relationType: "cosmologia",
    keywords: [
      "cosmotecn", "tecnodivers", "tecnologia", "digital", "computacional", "interface",
      "cosmologia", "cosmopolit", "maquina", "software", "hardware", "algoritmo",
    ],
  },
  {
    id: "concept:individuacao-tecnica",
    title: "Individuação e objetos técnicos",
    relationType: "tecnologia",
    keywords: [
      "objeto tecnico", "individuacao", "tecnologia", "maquina", "dispositivo", "interface",
      "processo", "sistema", "automacao", "mecanismo",
    ],
  },
  {
    id: "concept:redes-cosmopolitica",
    title: "Redes, associações e cosmopolíticas",
    relationType: "cosmologia",
    keywords: [
      "rede", "associacao", "ator-rede", "cosmopolit", "controversia", "infraestrutura",
      "ecologia", "comum", "coletivo", "agenciamento",
    ],
  },
  {
    id: "concept:ia-vigilancia-dados",
    title: "IA, vigilância, datasets e imagens operacionais",
    relationType: "politica",
    keywords: [
      "inteligencia artificial", "ia", "artificial intelligence", "machine learning", "dataset",
      "dados", "vigilancia", "reconhecimento facial", "algoritmo", "visao computacional",
      "imagem operacional", "deep learning", "generative ai", "ia generativa",
    ],
  },
  {
    id: "concept:infraestrutura-plataforma",
    title: "Infraestruturas, plataformas e territórios",
    relationType: "tecnologia",
    keywords: [
      "infraestrutura", "plataforma", "cloud", "nuvem", "rede", "servidor", "banco de dados",
      "data center", "cartografia", "territorio", "interface", "sistema complexo",
    ],
  },
  {
    id: "concept:arte-digital-webarte",
    title: "Arte digital, webarte e imagem técnica",
    relationType: "tecnologia",
    keywords: [
      "arte digital", "digital art", "webart", "web art", "net art", "internet art", "software art",
      "generative art", "arte generativa", "computacional", "interativo", "interface", "glitch",
      "realidade virtual", "vr", "realidade aumentada", "augmented reality", "game art", "videoarte", "video art",
    ],
  },
  {
    id: "concept:feminismos-genero",
    title: "Feminismos, gênero e regimes de representação",
    relationType: "politica",
    keywords: [
      "femin", "mulher", "women", "genero", "gender", "corpo feminino", "patriarc", "queer",
      "lgbt", "sexualidade", "representacao feminina",
    ],
  },
  {
    id: "concept:maternidade-cuidado",
    title: "Maternidade, cuidado e trabalho reprodutivo",
    relationType: "continuidade",
    keywords: [
      "maternidade", "mae", "mãe", "mother", "motherhood", "cuidado", "care", "filho", "filha",
      "parental", "trabalho reprodutivo", "gestacao", "amamentacao",
    ],
  },
  {
    id: "concept:bioetica-animalidades",
    title: "Bioética, animalidades e vidas não humanas",
    relationType: "ecologia",
    keywords: [
      "bioetica", "animalidade", "animal", "direitos animais", "experimentacao", "vivisseccao",
      "bioarte", "bio art", "biotecnologia", "celula", "tecido vivo", "organismo", "especie",
      "plant based", "vegano", "vegan",
    ],
  },
  {
    id: "concept:ecologias-mais-que-humano",
    title: "Ecologias e mundos mais-que-humanos",
    relationType: "ecologia",
    keywords: [
      "ecologia", "antropoceno", "mais que humano", "mais-que-humano", "floresta", "planta", "fungo",
      "micelio", "agua", "oceano", "clima", "paisagem", "biodiversidade", "extincao", "especie",
    ],
  },
  {
    id: "concept:cosmologias-indigenas",
    title: "Cosmologias indígenas e pluriverso",
    relationType: "cosmologia",
    keywords: [
      "indigena", "indigenous", "povos originarios", "ancestral", "cosmologia indigena", "pluriverso",
      "territorio", "xaman", "ritual", "perspectivismo", "cosmovisao",
    ],
  },
  {
    id: "concept:afrodiaspora",
    title: "Diásporas negras, representação e ancestralidade",
    relationType: "colonialidade",
    keywords: [
      "afro", "negro", "black", "diaspora", "diáspora", "quilomb", "ancestralidade", "racismo",
      "escrav", "african", "africa", "representacao negra",
    ],
  },
  {
    id: "concept:curadoria-exposicao",
    title: "Curadoria, exposição e produção de relações",
    relationType: "continuidade",
    keywords: [
      "curadoria", "curatorial", "exposicao", "exhibition", "museu", "galeria", "display", "arquivo",
      "colecao", "montagem", "instalacao", "bienal",
    ],
  },
];

const NETWORK_AUTHORS: NetworkAuthor[] = [
  { id: "theory:aby-warburg", title: "Aby Warburg", concepts: ["concept:sobrevivencia-gesto"] },
  { id: "theory:georges-didi-huberman", title: "Georges Didi-Huberman", concepts: ["concept:sobrevivencia-gesto"] },
  { id: "theory:walter-benjamin", title: "Walter Benjamin", concepts: ["concept:reproducao-percepcao"] },
  { id: "theory:john-berger", title: "John Berger", concepts: ["concept:reproducao-percepcao"] },
  { id: "theory:jacques-ranciere", title: "Jacques Rancière", concepts: ["concept:dissenso-visualidade"] },
  { id: "theory:nestor-garcia-canclini", title: "Néstor García Canclini", concepts: ["concept:hibridacao-circulacao"] },
  { id: "theory:ariella-azoulay", title: "Ariella Aïsha Azoulay", concepts: ["concept:historia-potencial-arquivo", "concept:colonialidade-decolonialidade"] },
  { id: "theory:donna-haraway", title: "Donna Haraway", concepts: ["concept:multiespecies-umwelt", "concept:poshumano-materialidade", "concept:bioetica-animalidades"] },
  { id: "theory:jakob-von-uexkull", title: "Jakob von Uexküll", concepts: ["concept:multiespecies-umwelt"] },
  { id: "theory:katherine-hayles", title: "N. Katherine Hayles", concepts: ["concept:poshumano-materialidade", "concept:arte-digital-webarte"] },
  { id: "theory:jane-bennett", title: "Jane Bennett", concepts: ["concept:poshumano-materialidade"] },
  { id: "theory:karen-barad", title: "Karen Barad", concepts: ["concept:poshumano-materialidade"] },
  { id: "theory:walter-mignolo", title: "Walter Mignolo", concepts: ["concept:colonialidade-decolonialidade"] },
  { id: "theory:arturo-escobar", title: "Arturo Escobar", concepts: ["concept:colonialidade-decolonialidade", "concept:cosmologias-indigenas"] },
  { id: "theory:silvia-rivera-cusicanqui", title: "Silvia Rivera Cusicanqui", concepts: ["concept:colonialidade-decolonialidade", "concept:cosmologias-indigenas"] },
  { id: "theory:achille-mbembe", title: "Achille Mbembe", concepts: ["concept:colonialidade-decolonialidade", "concept:afrodiaspora"] },
  { id: "theory:yuk-hui", title: "Yuk Hui", concepts: ["concept:cosmotecnica-tecnodiversidade"] },
  { id: "theory:gilbert-simondon", title: "Gilbert Simondon", concepts: ["concept:individuacao-tecnica"] },
  { id: "theory:bruno-latour", title: "Bruno Latour", concepts: ["concept:redes-cosmopolitica"] },
  { id: "theory:isabelle-stengers", title: "Isabelle Stengers", concepts: ["concept:redes-cosmopolitica"] },
  { id: "theory:kate-crawford", title: "Kate Crawford", concepts: ["concept:ia-vigilancia-dados", "concept:infraestrutura-plataforma"] },
  { id: "theory:trevor-paglen", title: "Trevor Paglen", concepts: ["concept:ia-vigilancia-dados"] },
  { id: "theory:hito-steyerl", title: "Hito Steyerl", concepts: ["concept:ia-vigilancia-dados", "concept:arte-digital-webarte"] },
  { id: "theory:joanna-zylinska", title: "Joanna Zylinska", concepts: ["concept:ia-vigilancia-dados", "concept:poshumano-materialidade", "concept:bioetica-animalidades"] },
  { id: "theory:louise-amoore", title: "Louise Amoore", concepts: ["concept:ia-vigilancia-dados"] },
  { id: "theory:benjamin-bratton", title: "Benjamin Bratton", concepts: ["concept:infraestrutura-plataforma"] },
  { id: "theory:shannon-mattern", title: "Shannon Mattern", concepts: ["concept:infraestrutura-plataforma"] },
  { id: "theory:lev-manovich", title: "Lev Manovich", concepts: ["concept:arte-digital-webarte"] },
  { id: "theory:arlindo-machado", title: "Arlindo Machado", concepts: ["concept:arte-digital-webarte"] },
  { id: "theory:vilem-flusser", title: "Vilém Flusser", concepts: ["concept:reproducao-percepcao", "concept:arte-digital-webarte"] },
  { id: "theory:domenico-quaranta", title: "Domenico Quaranta", concepts: ["concept:arte-digital-webarte"] },
  { id: "theory:daphne-dragona", title: "Daphne Dragona", concepts: ["concept:arte-digital-webarte"] },
  { id: "theory:linda-nochlin", title: "Linda Nochlin", concepts: ["concept:feminismos-genero"] },
  { id: "theory:griselda-pollock", title: "Griselda Pollock", concepts: ["concept:feminismos-genero"] },
  { id: "theory:bell-hooks", title: "bell hooks", concepts: ["concept:feminismos-genero", "concept:afrodiaspora"] },
  { id: "theory:tj-demos", title: "T. J. Demos", concepts: ["concept:ecologias-mais-que-humano", "concept:colonialidade-decolonialidade"] },
  { id: "theory:giovanni-aloi", title: "Giovanni Aloi", concepts: ["concept:bioetica-animalidades"] },
  { id: "theory:stefano-mancuso", title: "Stefano Mancuso", concepts: ["concept:ecologias-mais-que-humano"] },
  { id: "theory:paco-calvo", title: "Paco Calvo", concepts: ["concept:ecologias-mais-que-humano"] },
  { id: "theory:suzanne-simard", title: "Suzanne Simard", concepts: ["concept:ecologias-mais-que-humano"] },
  { id: "theory:ray-kurzweil", title: "Ray Kurzweil", concepts: ["concept:ia-vigilancia-dados", "concept:poshumano-materialidade"] },
  { id: "theory:lucia-santaella", title: "Lúcia Santaella", concepts: ["concept:arte-digital-webarte", "concept:poshumano-materialidade"] },
  { id: "theory:pablo-gobira", title: "Pablo Gobira", concepts: ["concept:arte-digital-webarte", "concept:curadoria-exposicao"] },
  { id: "theory:raul-nino-bernal", title: "Raúl Niño Bernal", concepts: ["concept:ia-vigilancia-dados", "concept:ecologias-mais-que-humano", "concept:redes-cosmopolitica"] },
  { id: "theory:anna-tsing", title: "Anna Lowenhaupt Tsing", concepts: ["concept:multiespecies-umwelt", "concept:ecologias-mais-que-humano"] },
  { id: "theory:vinciane-despret", title: "Vinciane Despret", concepts: ["concept:multiespecies-umwelt", "concept:bioetica-animalidades"] },
  { id: "theory:maria-puig-bellacasa", title: "María Puig de la Bellacasa", concepts: ["concept:maternidade-cuidado", "concept:ecologias-mais-que-humano"] },
  { id: "theory:rosi-braidotti", title: "Rosi Braidotti", concepts: ["concept:poshumano-materialidade"] },
  { id: "theory:cary-wolfe", title: "Cary Wolfe", concepts: ["concept:poshumano-materialidade", "concept:bioetica-animalidades"] },
  { id: "theory:eduardo-viveiros-de-castro", title: "Eduardo Viveiros de Castro", concepts: ["concept:cosmologias-indigenas", "concept:multiespecies-umwelt"] },
  { id: "theory:ailton-krenak", title: "Ailton Krenak", concepts: ["concept:cosmologias-indigenas", "concept:ecologias-mais-que-humano"] },
  { id: "theory:davi-kopenawa", title: "Davi Kopenawa", concepts: ["concept:cosmologias-indigenas", "concept:ecologias-mais-que-humano"] },
  { id: "theory:silvia-federici", title: "Silvia Federici", concepts: ["concept:maternidade-cuidado", "concept:feminismos-genero"] },
  { id: "theory:joan-tronto", title: "Joan Tronto", concepts: ["concept:maternidade-cuidado"] },
  { id: "theory:saidiya-hartman", title: "Saidiya Hartman", concepts: ["concept:historia-potencial-arquivo", "concept:afrodiaspora"] },
  { id: "theory:denise-ferreira-da-silva", title: "Denise Ferreira da Silva", concepts: ["concept:colonialidade-decolonialidade", "concept:afrodiaspora"] },
  { id: "theory:hans-ulrich-obrist", title: "Hans Ulrich Obrist", concepts: ["concept:curadoria-exposicao"] },
  { id: "theory:paul-oneill", title: "Paul O'Neill", concepts: ["concept:curadoria-exposicao"] },
  { id: "theory:claire-bishop", title: "Claire Bishop", concepts: ["concept:curadoria-exposicao"] },
];

export const getNetwork = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => NetworkInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { query } = await import("@/lib/turso/client.server");
    const { cachedPublic, cacheKey } = await import("@/lib/server-cache.server");

    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    const normalizeText = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const matchesTerm = (haystack: string, term: string) => {
      const normalizedTerm = normalizeText(term).trim();
      if (!normalizedTerm) return false;
      if (normalizedTerm.length <= 3) {
        const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
      }
      return haystack.includes(normalizedTerm);
    };

    const normalizeRelationType = (value: string) => {
      const type = normalize(value);
      if (type === "influence") return "influencia";
      if (type === "continuity") return "continuidade";
      if (type === "survival") return "sobrevivencia";
      return type;
    };

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

    const corpus = await cachedPublic<{
      explicit: Array<{
        id: string;
        source_id: string;
        target_id: string;
        relation_type: string;
        description: string | null;
        confidence: number | null;
      }>;
      entities: NetworkEntityRow[];
      motifs: Array<{ entity_id: string; motif_name: string }>;
    }>(cacheKey("acervo:network:corpus:low-read:v1", { focus: data.focus ?? null }), 15 * 60_000, async () => {
      const [explicit, entities, motifs] = await Promise.all([
        query<{
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
        ),
        query<NetworkEntityRow>(
          `WITH base AS (
             SELECT id,title,subtitle,entity_type,image_url,date_start,country,continent,
                    culture,tags,themes,materials,techniques,metadata,updated_at
               FROM entities
              WHERE status='published'
                AND image_url IS NOT NULL AND trim(image_url)<>''
              ORDER BY updated_at DESC,id DESC
              LIMIT 2400
           )
           SELECT * FROM base
           UNION
           SELECT id,title,subtitle,entity_type,image_url,date_start,country,continent,
                  culture,tags,themes,materials,techniques,metadata,updated_at
             FROM entities
            WHERE status='published' AND id=?`,
          [data.focus ?? ""],
        ),
        query<{ entity_id: string; motif_name: string }>(
          `SELECT em.entity_id, m.name AS motif_name
             FROM entity_motifs em
             JOIN motifs m ON m.id = em.motif_id
             JOIN entities e ON e.id = em.entity_id
            WHERE m.status = 'published' AND e.status = 'published'
            LIMIT 12000`,
        ),
      ]);
      return { explicit, entities, motifs };
    });

    const motifsByEntity = new Map<string, string[]>();
    for (const row of corpus.motifs) {
      const current = motifsByEntity.get(row.entity_id) ?? [];
      current.push(row.motif_name);
      motifsByEntity.set(row.entity_id, current);
    }

    const entities = corpus.entities.map((row) => {
      const tokens = new Set<string>();
      const add = (value: string | null | undefined, prefix: string) => {
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

      const context = normalizeText(
        [
          row.title,
          row.subtitle,
          row.country,
          row.continent,
          row.culture,
          ...parseArray(row.tags),
          ...parseArray(row.themes),
          ...parseArray(row.materials),
          ...parseArray(row.techniques),
          ...(motifsByEntity.get(row.id) ?? []),
          row.metadata,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return { ...row, tokens, context };
    });

    const entityById = new Map(entities.map((entity) => [entity.id, entity]));
    const conceptById = new Map(NETWORK_CONCEPTS.map((concept) => [concept.id, concept]));
    const authorById = new Map(NETWORK_AUTHORS.map((author) => [author.id, author]));

    const conceptMatches = new Map<string, Array<{ entityId: string; score: number; evidence: string[] }>>();
    const conceptsByEntity = new Map<string, Array<{ conceptId: string; score: number; evidence: string[] }>>();

    for (const concept of NETWORK_CONCEPTS) {
      const matches: Array<{ entityId: string; score: number; evidence: string[] }> = [];
      const normalizedKeywords = concept.keywords.map((keyword) => ({
        raw: keyword,
        normalized: normalizeText(keyword),
      }));
      for (const entity of entities) {
        const evidence = normalizedKeywords
          .filter(({ raw }) => matchesTerm(entity.context, raw))
          .map(({ raw }) => raw);
        if (evidence.length === 0) continue;
        const score = evidence.reduce((sum, item) => sum + (item.includes(" ") ? 2 : 1), 0);
        matches.push({ entityId: entity.id, score, evidence: evidence.slice(0, 5) });
        const current = conceptsByEntity.get(entity.id) ?? [];
        current.push({ conceptId: concept.id, score, evidence: evidence.slice(0, 5) });
        conceptsByEntity.set(entity.id, current);
      }
      matches.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ai = entityById.get(a.entityId)?.image_url ? 1 : 0;
        const bi = entityById.get(b.entityId)?.image_url ? 1 : 0;
        return bi - ai;
      });
      conceptMatches.set(concept.id, matches);
    }

    const selectedEntityIds = new Set<string>();
    const requestedFocus = data.focus?.trim() || null;
    const focusEntity = requestedFocus ? entityById.get(requestedFocus) : undefined;
    const focusConcept = requestedFocus ? conceptById.get(requestedFocus) : undefined;
    const focusAuthor = requestedFocus ? authorById.get(requestedFocus) : undefined;

    const addEntity = (id: string | undefined | null) => {
      if (id && entityById.has(id)) selectedEntityIds.add(id);
    };

    if (focusEntity) {
      addEntity(focusEntity.id);

      for (const relation of corpus.explicit) {
        if (relation.source_id === focusEntity.id) addEntity(relation.target_id);
        if (relation.target_id === focusEntity.id) addEntity(relation.source_id);
      }

      const matchedConcepts = (conceptsByEntity.get(focusEntity.id) ?? [])
        .sort((a, b) => b.score - a.score)
        .slice(0, 7);
      for (const match of matchedConcepts) {
        for (const candidate of (conceptMatches.get(match.conceptId) ?? []).slice(0, 16)) {
          addEntity(candidate.entityId);
          if (selectedEntityIds.size >= 92) break;
        }
        if (selectedEntityIds.size >= 92) break;
      }

      const sharedCandidates = entities
        .filter((entity) => entity.id !== focusEntity.id)
        .map((entity) => {
          const shared = Array.from(focusEntity.tokens).filter((token) => entity.tokens.has(token));
          return { id: entity.id, score: shared.length, shared };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 48);
      for (const candidate of sharedCandidates) addEntity(candidate.id);
    } else if (focusConcept) {
      for (const match of (conceptMatches.get(focusConcept.id) ?? []).slice(0, 96)) {
        addEntity(match.entityId);
      }
    } else if (focusAuthor) {
      for (const conceptId of focusAuthor.concepts) {
        for (const match of (conceptMatches.get(conceptId) ?? []).slice(0, 36)) {
          addEntity(match.entityId);
          if (selectedEntityIds.size >= 96) break;
        }
        if (selectedEntityIds.size >= 96) break;
      }
    } else {
      for (const relation of corpus.explicit) {
        addEntity(relation.source_id);
        addEntity(relation.target_id);
      }
      for (const concept of NETWORK_CONCEPTS) {
        for (const match of (conceptMatches.get(concept.id) ?? []).slice(0, 6)) {
          addEntity(match.entityId);
        }
      }
      const rankedByConceptRichness = entities
        .map((entity) => ({
          id: entity.id,
          score: (conceptsByEntity.get(entity.id) ?? []).reduce((sum, item) => sum + item.score, 0),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);
      for (const item of rankedByConceptRichness) {
        if (selectedEntityIds.size >= 150) break;
        addEntity(item.id);
      }
    }

    const selectedEntities = Array.from(selectedEntityIds)
      .map((id) => entityById.get(id))
      .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity));

    const links: NetworkLink[] = [];
    const pairKeys = new Set<string>();
    const pairKey = (a: string, b: string, type: string) =>
      [a, b].sort().join("|") + "|" + type;

    for (const relation of corpus.explicit) {
      if (!selectedEntityIds.has(relation.source_id) || !selectedEntityIds.has(relation.target_id)) continue;
      const relationType = normalizeRelationType(relation.relation_type);
      pairKeys.add(pairKey(relation.source_id, relation.target_id, relationType));
      links.push({
        id: relation.id,
        source_id: relation.source_id,
        target_id: relation.target_id,
        relation_type: relationType,
        description: relation.description,
        confidence: relation.confidence,
        provenance: "registered",
        evidence: relation.description ? [relation.description] : [],
      });
    }

    const tokenLabel = (token: string) => token.split(":").slice(1).join(":").replace(/_/g, " ");
    const tokenKind = (token: string) => token.split(":")[0];
    const containsAny = (values: string[], terms: string[]) => {
      const haystack = normalizeText(values.join(" "));
      return terms.some((term) => matchesTerm(haystack, term));
    };

    const relationCandidates: Array<{
      sourceId: string;
      targetId: string;
      relationType: string;
      score: number;
      evidence: string[];
      description: string;
      confidence: number;
    }> = [];

    const survivalTerms = [
      "gesto", "mao", "mão", "corpo", "halo", "aureola", "auréola", "cruz", "madona", "mae",
      "mãe", "animal", "gato", "ave", "serpente", "cavalo", "arvore", "árvore", "flor", "lua",
      "sol", "caveira", "vanitas", "retrato", "paisagem", "ritual", "mitologia", "alegoria",
    ];
    const ecologyTerms = ["ecologia", "animal", "planta", "fungo", "agua", "oceano", "clima", "antropoceno", "biodiversidade", "extincao"];
    const colonialTerms = ["colonial", "decolonial", "indigena", "quilomb", "diaspora", "afro", "restituicao", "territorio", "sul global"];
    const cosmologyTerms = ["cosmologia", "cosmovisao", "ancestral", "xaman", "pluriverso", "mitologia"];
    const ritualTerms = ["ritual", "cerimonia", "sagrado", "religiao", "religioso", "devocao", "culto"];
    const gestureTerms = ["gesto", "mao", "mão", "postura", "pathos", "corpo", "expressao"];
    const politicalTerms = ["politica", "protesto", "ativismo", "violencia", "guerra", "poder", "vigilancia", "racismo", "femin"];
    const colorTerms = ["cor", "color", "vermelho", "azul", "verde", "preto", "branco", "amarelo", "dourado"];
    const technologyTerms = ["digital", "web", "software", "video", "fotografia", "camera", "computacional", "ia", "algoritmo", "interface", "eletron", "realidade virtual"];

    for (let i = 0; i < selectedEntities.length; i += 1) {
      for (let j = i + 1; j < selectedEntities.length; j += 1) {
        const source = selectedEntities[i];
        const target = selectedEntities[j];
        const sharedTokens = Array.from(source.tokens).filter((token) => target.tokens.has(token));
        if (sharedTokens.length === 0) continue;

        const labels = sharedTokens.map(tokenLabel);
        const kinds = new Set(sharedTokens.map(tokenKind));
        const dateGap =
          source.date_start != null && target.date_start != null
            ? Math.abs(source.date_start - target.date_start)
            : null;

        const proposed: Array<{ type: string; weight: number; description: string }> = [];

        if (kinds.has("motif") || containsAny(labels, survivalTerms)) {
          proposed.push({
            type: "sobrevivencia",
            weight: 7,
            description: "Sobrevivência visual sugerida por recorrências iconográficas, gestuais ou temáticas. Requer validação curatorial.",
          });
        }
        if (containsAny(labels, ecologyTerms)) {
          proposed.push({ type: "ecologia", weight: 6, description: "Aproximação ecológica sugerida por temas e entidades mais-que-humanas compartilhadas." });
        }
        if (containsAny(labels, colonialTerms)) {
          proposed.push({ type: "colonialidade", weight: 6, description: "Aproximação sugerida por território, colonialidade, decolonialidade ou diáspora." });
        }
        if (containsAny(labels, cosmologyTerms)) {
          proposed.push({ type: "cosmologia", weight: 6, description: "Aproximação sugerida por cosmologias, ancestralidades ou cosmovisões compartilhadas." });
        }
        if (containsAny(labels, ritualTerms)) {
          proposed.push({ type: "ritual", weight: 5, description: "Relação ritual sugerida por temas, funções ou contextos simbólicos compartilhados." });
        }
        if (containsAny(labels, gestureTerms)) {
          proposed.push({ type: "gesto", weight: 5, description: "Relação gestual sugerida por recorrências corporais e expressivas." });
        }
        if (containsAny(labels, politicalTerms)) {
          proposed.push({ type: "politica", weight: 5, description: "Aproximação política sugerida por temas e contextos de poder compartilhados." });
        }
        if (containsAny(labels, colorTerms)) {
          proposed.push({ type: "cor", weight: 3, description: "Aproximação cromática sugerida por cores ou vocabulário cromático compartilhado." });
        }
        if (kinds.has("technique") && containsAny(labels, technologyTerms)) {
          proposed.push({ type: "tecnologia", weight: 6, description: "Relação tecnológica sugerida por técnicas, mídias, dispositivos ou processos compartilhados." });
        } else if (kinds.has("technique")) {
          proposed.push({ type: "tecnologia", weight: 4, description: "Aproximação técnica sugerida por processos ou meios compartilhados." });
        }
        if (kinds.has("material")) {
          proposed.push({ type: "material", weight: 4, description: "Relação material sugerida por suportes ou matérias compartilhadas." });
        }

        const conceptCount = sharedTokens.filter((token) => token.startsWith("tag:") || token.startsWith("theme:")).length;
        if (conceptCount >= 3 && dateGap != null && dateGap > 0 && dateGap <= 180) {
          proposed.push({ type: "influencia", weight: 5, description: "Possível influência sugerida por proximidade temporal e múltiplas afinidades documentadas; não constitui atribuição histórica." });
        }
        if (proposed.length === 0) {
          proposed.push({ type: "continuidade", weight: 3, description: "Continuidade curatorial sugerida por metadados compartilhados." });
        }

        const baseScore = sharedTokens.length * 2 + (dateGap != null && dateGap <= 100 ? 1 : 0);
        const uniqueTypes = new Set<string>();
        for (const item of proposed.sort((a, b) => b.weight - a.weight)) {
          if (uniqueTypes.has(item.type) || uniqueTypes.size >= 2) continue;
          uniqueTypes.add(item.type);
          let sourceId = source.id;
          let targetId = target.id;
          if (
            item.type === "influencia" &&
            source.date_start != null &&
            target.date_start != null &&
            source.date_start > target.date_start
          ) {
            sourceId = target.id;
            targetId = source.id;
          }
          relationCandidates.push({
            sourceId,
            targetId,
            relationType: item.type,
            score: baseScore + item.weight,
            evidence: labels.slice(0, 6),
            description: item.description,
            confidence: Math.min(0.94, 0.45 + (baseScore + item.weight) * 0.025),
          });
        }
      }
    }

    relationCandidates.sort((a, b) => b.score - a.score);
    const degrees = new Map<string, number>();
    for (const link of links) {
      degrees.set(link.source_id, (degrees.get(link.source_id) ?? 0) + 1);
      degrees.set(link.target_id, (degrees.get(link.target_id) ?? 0) + 1);
    }
    const maxSuggestedDegree = requestedFocus ? 16 : 10;

    for (const candidate of relationCandidates) {
      const key = pairKey(candidate.sourceId, candidate.targetId, candidate.relationType);
      if (pairKeys.has(key)) continue;
      const sourceDegree = degrees.get(candidate.sourceId) ?? 0;
      const targetDegree = degrees.get(candidate.targetId) ?? 0;
      if (sourceDegree >= maxSuggestedDegree || targetDegree >= maxSuggestedDegree) continue;
      pairKeys.add(key);
      links.push({
        id: `suggested:${candidate.sourceId}:${candidate.targetId}:${candidate.relationType}`,
        source_id: candidate.sourceId,
        target_id: candidate.targetId,
        relation_type: candidate.relationType,
        description: candidate.description,
        confidence: candidate.confidence,
        provenance: "suggested",
        evidence: candidate.evidence.map((item) => `metadado compartilhado: ${item}`),
      });
      degrees.set(candidate.sourceId, sourceDegree + 1);
      degrees.set(candidate.targetId, targetDegree + 1);
    }

    const activeConceptIds = new Set<string>();
    for (const entity of selectedEntities) {
      for (const match of conceptsByEntity.get(entity.id) ?? []) {
        activeConceptIds.add(match.conceptId);
      }
    }
    if (focusConcept) activeConceptIds.add(focusConcept.id);
    if (focusAuthor) focusAuthor.concepts.forEach((id) => activeConceptIds.add(id));

    const virtualNodes: Array<{ id: string; title: string; entity_type: string }> = [];
    for (const conceptId of activeConceptIds) {
      const concept = conceptById.get(conceptId);
      if (!concept) continue;
      virtualNodes.push({ id: concept.id, title: concept.title, entity_type: "Conceito" });

      const matches = (conceptMatches.get(concept.id) ?? [])
        .filter((match) => selectedEntityIds.has(match.entityId))
        .slice(0, requestedFocus ? 28 : 14);
      for (const match of matches) {
        links.push({
          id: `concept-link:${concept.id}:${match.entityId}`,
          source_id: concept.id,
          target_id: match.entityId,
          relation_type: concept.relationType,
          description: `Aproximação teórico-curatorial com “${concept.title}”.`,
          confidence: Math.min(0.9, 0.55 + match.score * 0.04),
          provenance: "suggested",
          evidence: match.evidence.map((item) => `vocabulário documentado: ${item}`),
        });
      }
    }

    const candidateAuthors = NETWORK_AUTHORS.filter((author) =>
      author.concepts.some((conceptId) => activeConceptIds.has(conceptId)),
    );

    const authorsToShow: NetworkAuthor[] = [];
    const authorIds = new Set<string>();
    const addAuthor = (author: NetworkAuthor) => {
      if (authorIds.has(author.id)) return;
      authorIds.add(author.id);
      authorsToShow.push(author);
    };

    if (focusAuthor) {
      addAuthor(focusAuthor);
      candidateAuthors
        .filter((author) => author.concepts.some((id) => focusAuthor.concepts.includes(id)))
        .forEach(addAuthor);
    } else if (focusConcept) {
      candidateAuthors
        .filter((author) => author.concepts.includes(focusConcept.id))
        .forEach(addAuthor);
    } else {
      for (const conceptId of activeConceptIds) {
        candidateAuthors
          .filter((author) => author.concepts.includes(conceptId))
          .slice(0, requestedFocus ? 3 : 2)
          .forEach(addAuthor);
      }
    }
    for (const author of authorsToShow) {
      virtualNodes.push({ id: author.id, title: author.title, entity_type: "Autor/a teórico/a" });
      for (const conceptId of author.concepts) {
        if (!activeConceptIds.has(conceptId)) continue;
        const concept = conceptById.get(conceptId);
        if (!concept) continue;
        links.push({
          id: `theory-link:${author.id}:${concept.id}`,
          source_id: author.id,
          target_id: concept.id,
          relation_type: concept.relationType,
          description: `${author.title} é mobilizado como referência para o eixo “${concept.title}”.`,
          confidence: 1,
          provenance: "suggested",
          evidence: ["referência teórica curatorial"],
        });
      }
    }

    const nodes = [
      ...selectedEntities.map(({ id, title, entity_type }) => ({ id, title, entity_type })),
      ...virtualNodes,
    ];
    const validIds = new Set(nodes.map((node) => node.id));
    const validLinks = links.filter(
      (link) => validIds.has(link.source_id) && validIds.has(link.target_id),
    );

    return {
      nodes,
      links: validLinks,
      stats: {
        corpusEntities: entities.length,
        selectedEntities: selectedEntities.length,
        theoreticalAuthors: authorsToShow.length,
        concepts: activeConceptIds.size,
        explicitRelations: validLinks.filter((link) => link.provenance === "registered").length,
        suggestedRelations: validLinks.filter((link) => link.provenance === "suggested").length,
        mode: requestedFocus ? "focused" : "overview",
      },
    };
  });
