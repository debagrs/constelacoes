import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FederatedArtwork } from "@/lib/data/federated.functions";

function normalizeImageUrl(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("http://") ? `https://${trimmed.slice(7)}` : trimmed;
}

function ExternalImage({ artwork }: { artwork: FederatedArtwork }) {
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    return [artwork.thumbnailUrl, artwork.imageUrl]
      .map(normalizeImageUrl)
      .filter((url): url is string => Boolean(url))
      .filter((url) => {
        const key = url.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [artwork.thumbnailUrl, artwork.imageUrl]);

  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [candidates.join("|")]);
  const src = candidates[index] ?? null;

  if (!src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
        <ImageOff className="h-7 w-7 opacity-55" aria-hidden="true" />
        <span className="text-xs">Imagem indisponível no servidor da instituição</span>
        <span className="text-[0.65rem]">Abra a fonte para consultar a obra.</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={artwork.title}
      loading="lazy"
      onError={() => setIndex((value) => value + 1)}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

export function ExternalArtworkCard({ artwork }: { artwork: FederatedArtwork }) {
  return (
    <a
      href={artwork.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:border-primary/50 hover:shadow-lg"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <ExternalImage artwork={artwork} />
        <Badge className="absolute left-3 top-3 max-w-[80%] truncate bg-background/90 text-foreground backdrop-blur">
          {artwork.sourceName}
        </Badge>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-medium leading-tight text-foreground">{artwork.title}</h3>
          <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        {artwork.artist && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{artwork.artist}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          {[artwork.date, artwork.culture, artwork.objectType].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-2 text-[0.7rem] uppercase tracking-wide text-muted-foreground">{artwork.license}</p>
      </div>
    </a>
  );
}
