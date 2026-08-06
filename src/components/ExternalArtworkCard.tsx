import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FederatedArtwork } from "@/lib/data/federated.functions";

export function ExternalArtworkCard({ artwork }: { artwork: FederatedArtwork }) {
  return (
    <a
      href={artwork.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:border-primary/50 hover:shadow-lg"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {artwork.thumbnailUrl || artwork.imageUrl ? (
          <img
            src={artwork.thumbnailUrl || artwork.imageUrl || ""}
            alt={artwork.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
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
