const AIC_IIIF_BASE = "https://www.artic.edu/iiif/2";

function normalizedBase(value?: string | null): string {
  const clean = String(value ?? "").trim().replace(/\/$/, "");
  if (!clean) return AIC_IIIF_BASE;
  if (/^https?:\/\/(www\.)?artic\.edu\/iiif\/2$/i.test(clean)) return AIC_IIIF_BASE;
  return clean.replace(/^http:\/\//i, "https://");
}

export function aicArtworkNumericId(entityId?: string | null, sourceUrl?: string | null): string | null {
  const fromEntity = String(entityId ?? "").match(/^aic-(\d+)$/i)?.[1];
  if (fromEntity) return fromEntity;
  const fromSource = String(sourceUrl ?? "").match(/artic\.edu\/artworks\/(\d+)/i)?.[1];
  return fromSource ?? null;
}

function parseMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata) return null;
  let value: unknown = metadata;
  if (typeof metadata === "string") {
    try { value = JSON.parse(metadata); } catch { return null; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function aicImageIdFromMetadata(metadata: unknown): string | null {
  const value = parseMetadata(metadata);
  if (!value) return null;
  const primary = typeof value.image_id === "string" ? value.image_id.trim() : "";
  if (primary) return primary;
  const alt = Array.isArray(value.alt_image_ids) ? value.alt_image_ids : [];
  const firstAlt = alt.find((item) => typeof item === "string" && item.trim());
  return typeof firstAlt === "string" ? firstAlt.trim() : null;
}

export function buildAicIiifUrl(
  imageId: string | null | undefined,
  width = 843,
  iiifBase?: string | null,
): string | null {
  const clean = String(imageId ?? "").trim();
  if (!clean) return null;
  const safeWidth = Math.max(200, Math.min(width, 1686));
  return `${normalizedBase(iiifBase)}/${encodeURIComponent(clean)}/full/${safeWidth},/0/default.jpg`;
}

export function aicMetadataImageUrl(metadata: unknown, width = 843): string | null {
  const value = parseMetadata(metadata);
  if (!value) return null;
  const imageId = aicImageIdFromMetadata(value);
  const base = typeof value.iiif_base === "string" ? value.iiif_base : null;
  return buildAicIiifUrl(imageId, width, base);
}

export async function fetchCurrentAicImageUrl(
  entityId?: string | null,
  sourceUrl?: string | null,
  width = 843,
): Promise<string | null> {
  const artworkId = aicArtworkNumericId(entityId, sourceUrl);
  if (!artworkId) return null;
  try {
    const response = await fetch(
      `https://api.artic.edu/api/v1/artworks/${artworkId}?fields=id,image_id,alt_image_ids`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data?: { image_id?: string | null; alt_image_ids?: string[] | null };
      config?: { iiif_url?: string | null };
    };
    const imageId = payload.data?.image_id?.trim() || payload.data?.alt_image_ids?.find((item) => item?.trim()) || null;
    return buildAicIiifUrl(imageId, width, payload.config?.iiif_url ?? null);
  } catch {
    return null;
  }
}
