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

async function searchCommons(query: string, limit: number): Promise<FederatedArtwork[]> {
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

export const searchOpenCollections = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { toExternalSearchQuery } = await import("@/lib/search-dictionary");
    const perSource = Math.max(4, Math.ceil(data.limit / 3));
    const externalQuery = toExternalSearchQuery(data.query);
    const settled = await Promise.allSettled([
      searchMet(externalQuery, perSource),
      searchAic(externalQuery, perSource),
      searchCommons(externalQuery, perSource),
    ]);

    const sources = ["met", "aic", "commons"] as const;
    const errors: string[] = [];
    const results: FederatedArtwork[] = [];

    settled.forEach((item, index) => {
      if (item.status === "fulfilled") results.push(...item.value);
      else errors.push(`${sources[index]}: ${item.reason instanceof Error ? item.reason.message : "falha"}`);
    });

    const unique = Array.from(new Map(results.map((item) => [`${item.sourceName}:${item.id}`, item])).values());
    return { results: unique.slice(0, data.limit), errors };
  });
