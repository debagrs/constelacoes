import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type FederatedArtwork = {
  id: string;
  title: string;
  artist: string | null;
  date: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  sourceName: string;
  sourceUrl: string;
  license: string | null;
  culture: string | null;
  objectType: string | null;
};

export type FederatedSourceLink = {
  name: string;
  url: string;
  note: string;
};

const inputSchema = z.object({
  query: z.string().trim().min(2).max(120),
  limit: z.number().int().min(4).max(48).default(24),
});

async function fetchJson<T>(
  url: string,
  timeoutMs = 12_000,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AtlasPlanetario/1.0 (educational cultural project)",
        ...extraHeaders,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchMet(query: string, limit: number): Promise<FederatedArtwork[]> {
  type SearchResponse = { objectIDs: number[] | null };
  type MetObject = {
    objectID: number;
    title: string;
    artistDisplayName: string;
    objectDate: string;
    primaryImage: string;
    primaryImageSmall: string;
    objectURL: string;
    culture: string;
    objectName: string;
    isPublicDomain: boolean;
  };

  const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(query)}`;
  const search = await fetchJson<SearchResponse>(searchUrl);
  const ids = (search.objectIDs ?? []).slice(0, Math.min(limit, 16));
  const objects = await Promise.allSettled(
    ids.map((id) =>
      fetchJson<MetObject>(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`),
    ),
  );

  return objects
    .filter((item): item is PromiseFulfilledResult<MetObject> => item.status === "fulfilled")
    .map(({ value }) => ({
      id: `met-${value.objectID}`,
      title: value.title || "Sem título",
      artist: value.artistDisplayName || null,
      date: value.objectDate || null,
      imageUrl: value.primaryImage || value.primaryImageSmall || null,
      thumbnailUrl: value.primaryImageSmall || value.primaryImage || null,
      sourceName: "The Metropolitan Museum of Art",
      sourceUrl: value.objectURL,
      license: value.isPublicDomain ? "Domínio público" : "Consulte a instituição",
      culture: value.culture || null,
      objectType: value.objectName || null,
    }))
    .filter((item) => item.imageUrl);
}

async function searchAic(query: string, limit: number): Promise<FederatedArtwork[]> {
  type AicResponse = {
    data: Array<{
      id: number;
      title: string;
      artist_display: string | null;
      date_display: string | null;
      image_id: string | null;
      place_of_origin: string | null;
      artwork_type_title: string | null;
      is_public_domain: boolean;
    }>;
    config: { iiif_url: string };
  };

  const fields = [
    "id",
    "title",
    "artist_display",
    "date_display",
    "image_id",
    "place_of_origin",
    "artwork_type_title",
    "is_public_domain",
  ].join(",");
  const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&query[term][is_public_domain]=true&limit=${Math.min(limit, 24)}&fields=${fields}`;
  const response = await fetchJson<AicResponse>(url, 12_000, {
    "AIC-User-Agent": "AtlasPlanetarioUFSM/1.0",
  });
  const iiif = response.config?.iiif_url || "https://www.artic.edu/iiif/2";

  return response.data
    .filter((item) => item.image_id)
    .map((item) => ({
      id: `aic-${item.id}`,
      title: item.title || "Sem título",
      artist: item.artist_display || null,
      date: item.date_display || null,
      imageUrl: `${iiif}/${item.image_id}/full/843,/0/default.jpg`,
      thumbnailUrl: `${iiif}/${item.image_id}/full/400,/0/default.jpg`,
      sourceName: "Art Institute of Chicago",
      sourceUrl: `https://www.artic.edu/artworks/${item.id}`,
      license: item.is_public_domain ? "Domínio público" : "Consulte a instituição",
      culture: item.place_of_origin || null,
      objectType: item.artwork_type_title || null,
    }));
}

async function searchWikiArt(query: string, limit: number): Promise<FederatedArtwork[]> {
  const accessKey = process.env.WIKIART_API_ACCESS_KEY?.trim();
  if (!accessKey) return [];

  type WikiArtPainting = {
    id?: string | number;
    title?: string;
    artistName?: string;
    completitionYear?: number | string | null;
    completionYear?: number | string | null;
    image?: string | null;
    url?: string | null;
    paintingUrl?: string | null;
    genre?: string | null;
    style?: string | null;
  };
  type WikiArtResponse = {
    data?: WikiArtPainting[];
    paintings?: WikiArtPainting[];
  };

  const params = new URLSearchParams({ term: query, authSessionKey: accessKey });
  const response = await fetchJson<WikiArtResponse | WikiArtPainting[]>(
    `https://www.wikiart.org/en/api/2/PaintingSearch?${params}`,
  );
  const paintings = Array.isArray(response)
    ? response
    : response.data ?? response.paintings ?? [];

  return paintings
    .filter((item) => item.image && (item.url || item.paintingUrl))
    .slice(0, limit)
    .map((item, index) => ({
      id: `wikiart-${item.id ?? index}-${encodeURIComponent(item.title ?? query)}`,
      title: item.title?.trim() || "Sem título",
      artist: item.artistName?.trim() || null,
      date: String(item.completitionYear ?? item.completionYear ?? "").trim() || null,
      imageUrl: item.image ?? null,
      thumbnailUrl: item.image ?? null,
      sourceName: "WikiArt",
      sourceUrl: item.url ?? item.paintingUrl ?? `https://www.wikiart.org/en/Search/${encodeURIComponent(query)}`,
      license: "Consulte os direitos na página da obra",
      culture: item.style?.trim() || null,
      objectType: item.genre?.trim() || "Obra de arte",
    }));
}

function normalizeEvidence(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MORE_THAN_HUMAN_TERMS = [
  "animal", "animals", "bird", "birds", "plant", "plants", "tree", "trees",
  "flower", "flowers", "forest", "forests", "fungi", "fungus", "mushroom",
  "ocean", "sea", "river", "water", "climate", "ecology", "ecosystem",
  "landscape", "soil", "insect", "insects", "pollution", "anthropocene",
];

const ART_DESIGN_SIGNALS = [
  "artwork", "work of art", "painting", "sculpture", "drawing", "printmaking",
  "engraving", "lithograph", "photographic art", "installation", "performance",
  "museum", "gallery", "artist", "architecture", "architectural", "design",
  "ceramic art", "textile art", "public art", "visual art", "art collection",
];

function commonsIsCuratoriallyRelevant(
  evidence: string,
  originalQuery: string,
  variant: string,
) {
  const text = normalizeEvidence(evidence);
  const queryTokens = normalizeEvidence(`${originalQuery} ${variant}`)
    .split(" ")
    .filter((token) => token.length >= 3);
  const queryMatches = queryTokens.some((token) => text.includes(token));
  const natureSearch = queryTokens.some((token) => MORE_THAN_HUMAN_TERMS.includes(token));
  const artSignal = ART_DESIGN_SIGNALS.some((signal) => text.includes(signal));
  return queryMatches && (natureSearch || artSignal);
}

async function searchCommons(query: string, limit: number, originalQuery = query): Promise<FederatedArtwork[]> {
  type CommonsResponse = {
    query?: {
      pages?: Record<
        string,
        {
          pageid: number;
          title: string;
          imageinfo?: Array<{
            url: string;
            thumburl?: string;
            descriptionurl?: string;
            extmetadata?: Record<string, { value?: string }>;
          }>;
        }
      >;
    };
  };

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: String(Math.min(limit, 24)),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "800",
  });
  const data = await fetchJson<CommonsResponse>(`https://commons.wikimedia.org/w/api.php?${params}`);
  const pages = Object.values(data.query?.pages ?? {});

  const stripHtml = (value?: string) =>
    value ? value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

  return pages
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.url) return null;
      const meta = info.extmetadata ?? {};
      const evidence = [
        page.title,
        meta.ObjectName?.value,
        meta.ImageDescription?.value,
        meta.Categories?.value,
        meta.Artist?.value,
        meta.Credit?.value,
      ].filter(Boolean).join(" ");
      if (!commonsIsCuratoriallyRelevant(evidence, originalQuery, query)) return null;
      return {
        id: `commons-${page.pageid}`,
        title: stripHtml(meta.ObjectName?.value) || page.title.replace(/^File:/, ""),
        artist: stripHtml(meta.Artist?.value) || null,
        date: stripHtml(meta.DateTimeOriginal?.value || meta.DateTime?.value) || null,
        imageUrl: info.thumburl || info.url,
        thumbnailUrl: info.thumburl || info.url,
        sourceName: "Wikimedia Commons",
        sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/?curid=${page.pageid}`,
        license: stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value) || "Consulte a página do arquivo",
        culture: null,
        objectType: stripHtml(meta.MimeType?.value) || "Imagem",
      } satisfies FederatedArtwork;
    })
    .filter((item): item is FederatedArtwork => Boolean(item));
}

function normalizeSearchVariant(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function selectExternalVariants(input: string, expanded: string[], preferred: string) {
  const variants: string[] = [];
  const seen = new Set<string>();

  const add = (value?: string | null) => {
    const clean = value?.trim();
    if (!clean || clean.length < 2) return;
    const normalized = normalizeSearchVariant(clean);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    variants.push(clean);
  };

  add(preferred);
  const inputWords = normalizeSearchVariant(input).split(" ").filter(Boolean);
  if (inputWords.length >= 2 && normalizeSearchVariant(preferred) === normalizeSearchVariant(input)) {
    return variants;
  }
  if (/s$/i.test(preferred) && preferred.length > 3) add(preferred.replace(/s$/i, ""));
  add(input);
  expanded.forEach(add);

  // O vocabulário continua centralizado em search-dictionary.ts.
  // Acrescentar aliases ali automaticamente amplia esta busca também.
  return variants.slice(0, 4);
}

export const searchOpenCollections = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { expandSearchTerms, toExternalSearchQuery } = await import("@/lib/search-dictionary");
    const expanded = expandSearchTerms(data.query, 18);
    const preferred = toExternalSearchQuery(data.query);
    const variants = selectExternalVariants(data.query, expanded, preferred);
    const perQueryPerSource = Math.max(3, Math.ceil(data.limit / Math.max(1, variants.length * 4)));

    const tasks = variants.flatMap((variant) => [
      { source: "met", variant, promise: searchMet(variant, perQueryPerSource) },
      { source: "aic", variant, promise: searchAic(variant, perQueryPerSource) },
      { source: "wikiart", variant, promise: searchWikiArt(variant, perQueryPerSource) },
      { source: "commons", variant, promise: searchCommons(variant, perQueryPerSource, data.query) },
    ] as const);

    const settled = await Promise.allSettled(tasks.map((task) => task.promise));
    const errors: string[] = [];
    const results: FederatedArtwork[] = [];

    settled.forEach((item, index) => {
      const task = tasks[index];
      if (item.status === "fulfilled") {
        results.push(...item.value);
      } else {
        errors.push(`${task.source} (${task.variant}): ${item.reason instanceof Error ? item.reason.message : "falha"}`);
      }
    });

    const unique = Array.from(
      new Map(results.map((item) => [`${item.sourceName}:${item.id}`, item])).values(),
    );

    const sourceLinks: FederatedSourceLink[] = [
      {
        name: "WikiArt",
        url: `https://www.wikiart.org/en/Search/${encodeURIComponent(preferred)}`,
        note: process.env.WIKIART_API_ACCESS_KEY
          ? "Integração ativa pela API oficial."
          : "Abra a pesquisa no WikiArt; a integração automática aguarda a chave oficial.",
      },
      {
        name: "Wikimedia Commons",
        url: `https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=${encodeURIComponent(preferred)}`,
        note: "Resultados automáticos passam pela curadoria de Arte e Design ou Além do Antropoceno.",
      },
    ];

    return { results: unique.slice(0, data.limit), errors, queryVariants: variants, sourceLinks };
  });
