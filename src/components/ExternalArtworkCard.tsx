import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, ImageOff, Loader2, SendToBack } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { FederatedArtwork } from "@/lib/data/federated.functions";
import {
  importTainacanItemToCuration,
  type TainacanArtwork,
} from "@/lib/data/tainacan.functions";

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
        <span className="text-[0.65rem]">Abra a fonte para consultar o item.</span>
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

function isTainacanArtwork(artwork: FederatedArtwork): artwork is TainacanArtwork {
  return "provider" in artwork && (artwork as { provider?: string }).provider === "tainacan";
}

export function ExternalArtworkCard({ artwork }: { artwork: FederatedArtwork }) {
  const { isReviewer } = useAuth();
  const queryClient = useQueryClient();
  const importItem = useServerFn(importTainacanItemToCuration);
  const [sent, setSent] = useState(false);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!isTainacanArtwork(artwork)) throw new Error("Este item não é do Tainacan.");
      const itemId = artwork.id.replace(`tainacan-${artwork.sourceKey}-`, "");
      return await importItem({ data: { sourceKey: artwork.sourceKey, itemId } });
    },
    onSuccess: async (result) => {
      setSent(true);
      toast.success(result.existed ? "Este item já está na curadoria." : "Item enviado para revisão curatorial.");
      await queryClient.invalidateQueries({ queryKey: ["curadoria-tainacan"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const tainacan = isTainacanArtwork(artwork) ? artwork : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:border-primary/50 hover:shadow-lg">
      <a href={artwork.sourceUrl} target="_blank" rel="noreferrer" className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <ExternalImage artwork={artwork} />
          <Badge className="absolute left-3 top-3 max-w-[84%] truncate bg-background/90 text-foreground backdrop-blur">
            {artwork.sourceName}
          </Badge>
          {tainacan?.explicitBrazilian && (
            <Badge variant="secondary" className="absolute bottom-3 left-3 bg-background/90 backdrop-blur">Brasil explícito nos metadados</Badge>
          )}
        </div>
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-medium leading-tight text-foreground">{artwork.title}</h3>
            <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          {artwork.artist && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{artwork.artist}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {[artwork.date, artwork.culture, artwork.objectType].filter(Boolean).join(" · ")}
          </p>
          {tainacan?.collectionName && <p className="mt-2 text-[0.7rem] text-muted-foreground">Coleção: {tainacan.collectionName}</p>}
          <p className="mt-2 text-[0.7rem] uppercase tracking-wide text-muted-foreground">{artwork.license}</p>
        </div>
      </a>

      {tainacan && isReviewer && (
        <div className="mt-auto border-t border-border/60 p-3">
          <Button
            type="button"
            size="sm"
            variant={sent ? "secondary" : "outline"}
            className="w-full"
            disabled={sent || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendToBack className="mr-2 h-4 w-4" />}
            {sent ? "Na curadoria" : "Enviar à curadoria"}
          </Button>
        </div>
      )}
    </article>
  );
}
