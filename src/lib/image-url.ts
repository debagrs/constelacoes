export function normalizeExternalImageUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith("http://")) return `https://${raw.slice(7)}`;
  return raw;
}

export function isInlineImageUrl(value: string | null | undefined): boolean {
  return Boolean(value?.trim().startsWith("data:image/"));
}

export function isGooglePhotosUrl(value: string | null | undefined): boolean {
  const raw = value?.trim();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host === "photos.app.goo.gl" || host === "photos.google.com" || host.endsWith(".googleusercontent.com");
  } catch {
    return false;
  }
}

export function entityImageSrc(entityId: string, rawUrl: string | null | undefined): string | null {
  const value = normalizeExternalImageUrl(rawUrl);
  if (!value) return null;
  if (isInlineImageUrl(value) || isGooglePhotosUrl(value) || value === "__inline_image__") {
    return `/api/media?entityId=${encodeURIComponent(entityId)}`;
  }
  return value;
}

export function submissionImageSrc(submissionId: string, rawUrl: string | null | undefined): string | null {
  const value = normalizeExternalImageUrl(rawUrl);
  if (!value) return null;
  if (isInlineImageUrl(value) || isGooglePhotosUrl(value) || value === "__inline_image__") {
    return `/api/media?submissionId=${encodeURIComponent(submissionId)}`;
  }
  return value;
}

export function previewImageSrc(rawUrl: string | null | undefined): string | null {
  const value = normalizeExternalImageUrl(rawUrl);
  if (!value) return null;
  if (isInlineImageUrl(value)) return value;
  if (isGooglePhotosUrl(value)) return `/api/media?url=${encodeURIComponent(value)}`;
  return value;
}