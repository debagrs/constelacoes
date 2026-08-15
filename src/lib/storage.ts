import { useEffect, useState } from "react";

export const ATLAS_BUCKET = "atlas-uploads";
export const ACERVO_BUCKET = "acervo";

/**
 * Resolve a stored value to a displayable URL.
 * External URLs (public-domain / IIIF / OpenGLAM sources) are returned as-is.
 * Storage paths are turned into short-lived signed URLs (buckets are private).
 */
export async function resolveStorageUrl(
  value: string | null | undefined,
  bucket: string = ATLAS_BUCKET,
): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  // Sem provedor de arquivos configurado após a migração para o Turso:
  // apenas URLs externas (domínio público / IIIF) são resolvidas.
  void bucket;
  return null;
}

/** React hook wrapper around resolveStorageUrl. */
export function useStorageUrl(
  value: string | null | undefined,
  bucket: string = ATLAS_BUCKET,
): string | null {
  const [url, setUrl] = useState<string | null>(
    value && value.startsWith("http") ? value : null,
  );
  useEffect(() => {
    let active = true;
    resolveStorageUrl(value, bucket).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [value, bucket]);
  return url;
}

/**
 * Upload de imagem pessoal. Requer um provedor de arquivos (ex.: Cloudflare R2 / S3),
 * que ainda não está configurado após a migração para o Turso.
 */
export async function uploadAtlasImage(
  _userId: string,
  _file: File,
): Promise<string> {
  throw new Error(
    "Upload de arquivos indisponível: configure um provedor de armazenamento (R2/S3).",
  );
}
