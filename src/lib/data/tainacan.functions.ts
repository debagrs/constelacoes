import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { FederatedArtwork } from "@/lib/data/federated.functions";

export type TainacanSource = {
  key: string;
  name: string;
  baseUrl: string;
  region: string;
  focus: string;
};

export type TainacanArtwork = FederatedArtwork & {
  provider: "tainacan";
  sourceKey: string;
  repositoryName: string;
  collectionId: string | null;
  collectionName: string | null;
  description: string | null;
  entityType: string;
  explicitBrazilian: boolean;
  metadata: Record<string, string[]>;
};

export const TAINACAN_SOURCES: TainacanSource[] = [
  {
    key: "brasiliana",
    name: "Brasiliana Museus / Ibram",
    baseUrl: "https://brasiliana.museus.gov.br",
    region: "Brasil",
    focus: "Acervos museológicos brasileiros integrados",
  },
  {
    key: "fvcb",
    name: "Fundação Vera Chaves Barcellos",
    baseUrl: "https://fvcb.com.br/acervo",
    region: "Rio Grande do Sul",
    focus: "Arte moderna e contemporânea",
  },
  {
    key: "margs",
    name: "MARGS · Acervo documental",
    baseUrl: "https://acervo.margs.rs.gov.br",
    region: "Rio Grande do Sul",
    focus: "Artes visuais e documentação artística",
  },
  {
    key: "macrs",
    name: "Museu de Arte Contemporânea do RS",
    baseUrl: "https://acervo.macrs.rs.gov.br",
    region: "Rio Grande do Sul",
    focus: "Arte contemporânea",
  },
  {
    key: "ufrgs",
    name: "Museu da UFRGS",
    baseUrl: "https://www.ufrgs.br/museutainacan",
    region: "Rio Grande do Sul",
    focus: "Artes visuais, fotografia, história e memória",
  },
  {
    key: "musecom",
    name: "MuseCom",
    baseUrl: "https://acervos.musecom.rs.gov.br",
    region: "Rio Grande do Sul",
    focus: "Fotografia, audiovisual e comunicação",
  },
  {
    key: "museu-julio",
    name: "Museu de História Julio de Castilhos",
    baseUrl: "https://acervos.museujulio.rs.gov.br",
    region: "Rio Grande do Sul",
    focus: "História, iconografia, etnologia e cultura material",
  },
  {
    key: "museus-df",
    name: "Museus da SECEC/DF",
    baseUrl: "https://museu.acervo.cultura.df.gov.br",
    region: "Distrito Federal",
    focus: "Arte contemporânea, artes visuais e cultura",
  },
];

const searchInput = z.object({
  query: z.string().trim().min(2).max(160),
  limit: z.number().int().min(4).max(48).default(24),
});

const importInput = z.object({
  sourceKey: z.string().trim().min(1).max(80),
  itemId: z.union([z.string(), z.number()]).transform(String),
  entityType: z.string().trim().min(1).max(80).optional(),
});

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function stripHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8211;|&#8212;/g, "–")
    .replace(/&#8217;/g, "’")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function asString(value: unknown): string {
  if (typeof value === "string") return stripHtml(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const key of ["rendered", "raw", "value", "name", "label"]) {
      const nested = obj[key];
      if (typeof nested === "string" || typeof nested === "number") {
        const text = stripHtml(String(nested));
        if (text) return text;
      }
    }
  }
  return "";
}

function compactStrings(values: unknown[]): string[] {
  const result: string[] = [];
  const visit = (value: unknown) => {
    if (value == null) return;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      const text = asString(value);
      if (text) result.push(text);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      for (const key of ["value_as_string", "value", "values", "name", "label", "title"]) {
        if (key in obj) visit(obj[key]);
      }
    }
  };
  values.forEach(visit);
  return [...new Set(result.map((value) => value.trim()).filter(Boolean))];
}

function firstUrl(value: unknown): string | null {
  const urls: string[] = [];
  const visit = (input: unknown) => {
    if (!input || urls.length > 12) return;
    if (typeof input === "string") {
      const text = input.trim().replace(/^http:\/\//i, "https://");
      if (/^https?:\/\//i.test(text) && /\.(?:jpe?g|png|webp|gif|avif)(?:\?|$)/i.test(text)) urls.push(text);
      return;
    }
    if (Array.isArray(input)) {
      input.forEach(visit);
      return;
    }
    if (typeof input === "object") Object.values(input as Record<string, unknown>).forEach(visit);
  };
  visit(value);
  return urls[0] ?? null;
}

function chooseThumbnail(value: unknown): string | null {
  if (!value || typeof value !== "object") return firstUrl(value);
  const obj = value as Record<string, unknown>;
  for (const key of ["large", "medium_large", "medium", "tainacan-medium", "full", "thumbnail"]) {
    const found = firstUrl(obj[key]);
    if (found) return found;
  }
  return firstUrl(value);
}

async function fetchJson<T>(url: string, timeoutMs = 8_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "AtlasPlanetarioUFSM/1.0 (Tainacan interoperability; educational cultural project)",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function extractItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const candidates = [obj.items, obj.data, obj.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }
  return [];
}

function normalizeMetadata(payload: unknown): Record<string, string[]> {
  const output: Record<string, string[]> = {};
  const entries = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? Object.values(payload as Record<string, unknown>)
      : [];

  for (const raw of entries) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const metadatum = item.metadatum && typeof item.metadatum === "object"
      ? item.metadatum as Record<string, unknown>
      : item.metadata && typeof item.metadata === "object"
        ? item.metadata as Record<string, unknown>
        : {};
    const label = asString(metadatum.name ?? metadatum.title ?? item.name ?? item.label);
    if (!label) continue;
    const values = compactStrings([
      item.value_as_string,
      item.value_as_html,
      item.values,
      item.value,
    ]).filter((value) => value !== label);
    if (values.length) output[label] = values;
  }
  return output;
}

function metadataValues(metadata: Record<string, string[]>, matcher: RegExp): string[] {
  return Object.entries(metadata)
    .filter(([label]) => matcher.test(label.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
    .flatMap(([, values]) => values)
    .map(stripHtml)
    .filter(Boolean);
}

function firstMetadata(metadata: Record<string, string[]>, matcher: RegExp): string | null {
  return metadataValues(metadata, matcher)[0] ?? null;
}

function normalizeEvidence(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s:+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasExplicitBrazilianEvidence(metadata: Record<string, string[]>, combined: string) {
  const nationality = metadataValues(metadata, /nacionalidade|nationality|pais|country|territorio|territory/i).join(" ");
  const evidence = normalizeEvidence(`${nationality} ${combined}`);
  return /\bbrasil\b|\bbrasileir[oa]s?\b|\bbrazil\b|\bbrazilian\b/.test(evidence);
}

function inferEntityType(collectionName: string | null, metadata: Record<string, string[]>) {
  const evidence = normalizeEvidence(`${collectionName ?? ""} ${Object.keys(metadata).join(" ")}`);
  if (/\bartistas?\b|\bartist profiles?\b|\bbiograf/.test(evidence) && !/colecao artistas contemporaneos/.test(evidence)) return "artista";
  const denomination = normalizeEvidence(firstMetadata(metadata, /denominacao|tipologia|tipo de objeto|object type|categoria|genero/i) ?? "");
  if (/fotograf/.test(denomination)) return "fotografia";
  if (/performance/.test(denomination)) return "performance";
  if (/instalacao|installation/.test(denomination)) return "instalacao";
  if (/arquitet|architecture/.test(denomination)) return "arquitetura";
  if (/design/.test(denomination)) return "design";
  if (/filme|cinema|videoarte|video art/.test(denomination)) return "filme";
  return "obra";
}

function suggestedCuratorialFacets(metadata: Record<string, string[]>) {
  const text = normalizeEvidence(Object.entries(metadata).flatMap(([key, values]) => [key, ...values]).join(" "));
  const facets: string[] = [];
  if (/\bmulher(es)?\b|\bwomen\b|\bfeminina\b|maternidade|motherhood/.test(text)) facets.push("curadoria:mulheres-e-maes");
  if (/indigena|indigenous|povos originarios|native peoples/.test(text)) facets.push("curadoria:indigenas");
  if (/negro|negra|black|afro-brasileir|afrobrasileir|diaspora africana/.test(text)) facets.push("curadoria:negros-e-diasporas");
  if (/lgbt|queer|transgener|transgenero|homossexual|lesbica|lesbian|gay/.test(text)) facets.push("curadoria:lgbtqia");
  if (/bioetica|animalidade|direitos dos animais|animal rights|especismo/.test(text)) facets.push("curadoria:bioetica-e-animalidades");
  if (/antropoceno|ecologia|ecological|clima|climate|mais que humano|more-than-human/.test(text)) facets.push("curadoria:alem-do-antropoceno");
  return facets;
}

function extractYear(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/\b(1[0-9]{3}|20[0-9]{2}|2100)\b/);
  return match ? Number(match[1]) : null;
}

async function fetchCollectionName(source: TainacanSource, collectionId: string | null): Promise<string | null> {
  if (!collectionId) return null;
  try {
    const payload = await fetchJson<Record<string, unknown>>(
      `${cleanBaseUrl(source.baseUrl)}/wp-json/tainacan/v2/collections/${encodeURIComponent(collectionId)}`,
      3_500,
    );
    return asString(payload.name ?? payload.title) || null;
  } catch {
    return null;
  }
}

async function fetchItemMetadata(source: TainacanSource, itemId: string): Promise<Record<string, string[]>> {
  try {
    const payload = await fetchJson<unknown>(
      `${cleanBaseUrl(source.baseUrl)}/wp-json/tainacan/v2/item/${encodeURIComponent(itemId)}/metadata?context=view`,
      6_000,
    );
    return normalizeMetadata(payload);
  } catch {
    return {};
  }
}

async function fetchTainacanItem(source: TainacanSource, itemId: string): Promise<TainacanArtwork> {
  const [item, metadata] = await Promise.all([
    fetchJson<Record<string, unknown>>(
      `${cleanBaseUrl(source.baseUrl)}/wp-json/tainacan/v2/items/${encodeURIComponent(itemId)}?context=view&fetch_only=thumbnail,document,author_name,title,description,url,public_url,collection_id,document_type`,
      6_000,
    ),
    fetchItemMetadata(source, itemId),
  ]);
  const collectionId = asString(item.collection_id) || null;
  const collectionName = await fetchCollectionName(source, collectionId);
  return mapTainacanItem(source, item, metadata, collectionName);
}

function mapTainacanItem(
  source: TainacanSource,
  item: Record<string, unknown>,
  metadata: Record<string, string[]> = {},
  collectionName: string | null = null,
): TainacanArtwork {
  const itemId = asString(item.id) || asString(item.ID) || "sem-id";
  const title = asString(item.title) || "Sem título";
  const description = asString(item.description) || null;
  const artist = firstMetadata(metadata, /artista|artist|autoria|creator|criador|autor da obra|nome do autor/i);
  const date = firstMetadata(metadata, /data da obra|data de producao|ano|date|periodo|period/i);
  const objectType = firstMetadata(metadata, /denominacao|tipologia|tipo de objeto|object type|categoria|genero/i);
  const culture = firstMetadata(metadata, /cultura|contexto cultural|culture|origem|procedencia/i);
  const license = firstMetadata(metadata, /licenca|license|direitos|rights|copyright/i) || "Consulte os direitos na instituição";
  const imageUrl = chooseThumbnail(item.thumbnail) || firstUrl(item.document);
  const sourceUrl = asString(item.public_url) || asString(item.url) || cleanBaseUrl(source.baseUrl);
  const collectionId = asString(item.collection_id) || null;
  const evidence = `${title} ${description ?? ""} ${artist ?? ""} ${culture ?? ""}`;

  return {
    id: `tainacan-${source.key}-${itemId}`,
    title,
    artist,
    date,
    imageUrl,
    thumbnailUrl: imageUrl,
    sourceName: `Tainacan · ${source.name}`,
    sourceUrl,
    license,
    culture,
    objectType,
    provider: "tainacan",
    sourceKey: source.key,
    repositoryName: source.name,
    collectionId,
    collectionName,
    description,
    entityType: inferEntityType(collectionName, metadata),
    explicitBrazilian: hasExplicitBrazilianEvidence(metadata, evidence),
    metadata,
  };
}

async function searchSource(source: TainacanSource, query: string, perSource: number) {
  const params = new URLSearchParams({
    search: query,
    perpage: String(perSource),
    paged: "1",
    context: "view",
    fetch_only: "thumbnail,document,author_name,title,description,url,public_url,collection_id,document_type",
  });
  const payload = await fetchJson<unknown>(`${cleanBaseUrl(source.baseUrl)}/wp-json/tainacan/v2/items?${params}`, 5_500);
  const items = extractItems(payload).slice(0, perSource);
  return items.map((item) => mapTainacanItem(source, item));
}

export const searchTainacanBrazil = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => searchInput.parse(input))
  .handler(async ({ data }) => {
    const perSource = Math.max(2, Math.min(6, Math.ceil(data.limit / TAINACAN_SOURCES.length) + 1));
    const settled = await Promise.allSettled(
      TAINACAN_SOURCES.map((source) => searchSource(source, data.query, perSource)),
    );
    const errors: string[] = [];
    const rawResults: TainacanArtwork[] = [];

    settled.forEach((result, index) => {
      const source = TAINACAN_SOURCES[index];
      if (result.status === "fulfilled") rawResults.push(...result.value);
      else errors.push(`${source.name}: ${result.reason instanceof Error ? result.reason.message : "falha de conexão"}`);
    });

    const results = Array.from(
      new Map(rawResults.map((item) => [`${item.sourceKey}:${item.id}`, item])).values(),
    ).slice(0, data.limit);

    return {
      results,
      errors,
      sources: TAINACAN_SOURCES.map((source) => ({
        ...source,
        apiUrl: `${cleanBaseUrl(source.baseUrl)}/wp-json/tainacan/v2/items`,
      })),
      documentationUrl: "https://tainacan.org/funcionalidades/",
    };
  });

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "registro";
}

function artistNamesFromMetadata(metadata: Record<string, string[]>) {
  return [...new Set(metadataValues(metadata, /artista|artist|autoria|creator|criador|autor da obra|nome do autor/i)
    .flatMap((value) => value.split(/\s*[;|]\s*/g))
    .map((value) => value.trim())
    .filter((value) => value.length >= 2 && value.length <= 240))];
}

export const importTainacanItemToCuration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => importInput.parse(input))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, batch, nowIso } = await import("@/lib/turso/client.server");
    const reviewer = await requireReviewer();
    const source = TAINACAN_SOURCES.find((candidate) => candidate.key === data.sourceKey);
    if (!source) throw new Error("Fonte Tainacan não reconhecida.");

    const artwork = await fetchTainacanItem(source, data.itemId);
    const entityId = `tainacan:${source.key}:${data.itemId}`;
    const existing = await queryOne<{ id: string; status: string }>("SELECT id,status FROM entities WHERE id=?", [entityId]);
    if (existing) return { ok: true, entityId, existed: true, status: existing.status };

    const now = nowIso();
    const suggestedFacets = suggestedCuratorialFacets(artwork.metadata);
    const techniqueValues = metadataValues(artwork.metadata, /tecnica|technique|medium|processo/i);
    const materialValues = metadataValues(artwork.metadata, /material|suporte|support/i);
    const themeValues = metadataValues(artwork.metadata, /tema|assunto|subject|palavra.?chave|keyword/i);
    const tags = [...new Set([
      "fonte:Tainacan",
      `instituição:${source.name}`,
      ...(artwork.collectionName ? [`coleção:${artwork.collectionName}`] : []),
      ...(artwork.explicitBrazilian ? ["Brasil", "curadoria:brasil"] : []),
    ])];
    const dateStart = extractYear(artwork.date);
    const metadata = {
      source_provider: "Tainacan",
      source_key: source.key,
      source_repository: source.name,
      source_region: source.region,
      source_focus: source.focus,
      tainacan_item_id: data.itemId,
      tainacan_collection_id: artwork.collectionId,
      tainacan_collection_name: artwork.collectionName,
      tainacan_api_url: `${cleanBaseUrl(source.baseUrl)}/wp-json/tainacan/v2/items/${encodeURIComponent(data.itemId)}`,
      imported_at: now,
      imported_by: reviewer.id,
      explicit_brazilian_evidence: artwork.explicitBrazilian,
      suggested_curatorial_facets: suggestedFacets,
      suggested_facets_note: "Sugestões geradas apenas a partir de termos explícitos dos metadados de origem. A inclusão nas lentes do Atlas exige confirmação humana na curadoria.",
      original_metadata: artwork.metadata,
    };

    const chosenType = data.entityType || artwork.entityType || "obra";
    const statements: { sql: string; args: Array<string | number | null> }[] = [{
      sql: `INSERT INTO entities
        (id,entity_type,title,slug,subtitle,description,date_start,date_display,country,continent,culture,
         image_url,image_license,open_image,source_url,tags,themes,materials,techniques,metadata,status,created_by,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        entityId,
        chosenType,
        artwork.title,
        `${slugify(artwork.title)}-${source.key}-${data.itemId}`.slice(0, 280),
        artwork.artist,
        artwork.description,
        dateStart,
        artwork.date,
        artwork.explicitBrazilian ? "Brasil" : null,
        artwork.explicitBrazilian ? "América do Sul" : null,
        artwork.culture,
        artwork.imageUrl,
        artwork.license,
        0,
        artwork.sourceUrl,
        JSON.stringify(tags),
        JSON.stringify(themeValues),
        JSON.stringify(materialValues),
        JSON.stringify(techniqueValues),
        JSON.stringify(metadata),
        "review",
        reviewer.id,
        now,
        now,
      ],
    }];

    const artistNames = chosenType === "artista" ? [] : artistNamesFromMetadata(artwork.metadata);
    for (const artistName of artistNames.slice(0, 8)) {
      const artistId = `tainacan:${source.key}:artist:${slugify(artistName)}`;
      const artistNationality = metadataValues(artwork.metadata, /nacionalidade do artista|artist nationality|nacionalidade/i).join(" ");
      const artistBrazilian = /\bbrasil\b|\bbrasileir[oa]s?\b|\bbrazil\b|\bbrazilian\b/i.test(normalizeEvidence(artistNationality));
      statements.push({
        sql: `INSERT OR IGNORE INTO entities
          (id,entity_type,title,slug,country,continent,source_url,tags,metadata,status,created_by,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          artistId,
          "artista",
          artistName,
          `${slugify(artistName)}-${source.key}`,
          artistBrazilian ? "Brasil" : null,
          artistBrazilian ? "América do Sul" : null,
          artwork.sourceUrl,
          JSON.stringify(["fonte:Tainacan", `instituição:${source.name}`, ...(artistBrazilian ? ["Brasil", "curadoria:brasil"] : [])]),
          JSON.stringify({
            source_provider: "Tainacan",
            source_key: source.key,
            source_repository: source.name,
            source_item_id: data.itemId,
            created_from_explicit_authorship: true,
            nationality_evidence: artistNationality || null,
          }),
          "review",
          reviewer.id,
          now,
          now,
        ],
      });
      statements.push({
        sql: `INSERT OR IGNORE INTO relations
          (id,source_id,target_id,relation_type,description,author,confidence,status,created_by,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          `rel:${artistId}:${entityId}:autoria`,
          artistId,
          entityId,
          "autoria",
          "Autoria indicada explicitamente nos metadados do repositório Tainacan de origem.",
          source.name,
          1,
          "review",
          reviewer.id,
          now,
          now,
        ],
      });
    }

    await batch(statements);
    return { ok: true, entityId, existed: false, status: "review", relatedArtists: artistNames.length };
  });

export const listTainacanCurationQueue = createServerFn({ method: "GET" }).handler(async () => {
  const { requireReviewer } = await import("@/lib/auth/session.server");
  const { query } = await import("@/lib/turso/client.server");
  await requireReviewer();
  return query<Record<string, unknown>>(
    `SELECT id,entity_type,title,subtitle,image_url,date_display,country,culture,source_url,status,metadata,updated_at
       FROM entities
      WHERE metadata LIKE '%\"source_provider\":\"Tainacan\"%'
      ORDER BY CASE status WHEN 'review' THEN 0 WHEN 'draft' THEN 1 WHEN 'published' THEN 2 ELSE 3 END,
               updated_at DESC
      LIMIT 240`,
  );
});
