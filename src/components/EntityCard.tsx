import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import { labelForEntityType } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export interface AcervoEntity {
  id: string;
  title: string;
  subtitle: string | null;
  entity_type: string;
  image_url: string | null;
  date_display: string | null;
  continent: string | null;
}

function normalizeImageUrl(url: string | null): string | null {
  if (!url) return null;
  const value = url.trim();
  if (!value) return null;
  if (value.startsWith("http://")) return `https://${value.slice(7)}`;
  return value;
}

export function EntityCard({ entity }: { entity: AcervoEntity }) {
  const imageUrl = useMemo(() => normalizeImageUrl(entity.image_url), [entity.image_url]);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <Link
      to="/acervo/$id"
      params={{ id: entity.id }}
      className="group block overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:border-primary/50 hover:shadow-lg"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {showImage ? (
          <img
            src={imageUrl!}
            alt={entity.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 border-b border-border/50 bg-card px-4 text-center">
            <ImageOff className="h-7 w-7 text-muted-foreground/55" aria-hidden="true" />
            <span className="font-display text-5xl text-muted-foreground/35">
              {entity.title.trim().charAt(0) || "·"}
            </span>
            <span className="text-xs text-muted-foreground">Imagem indisponível na fonte</span>
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute left-3 top-3 bg-background/90 text-[0.65rem] uppercase tracking-wide backdrop-blur"
        >
          {labelForEntityType(entity.entity_type)}
        </Badge>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg font-medium leading-tight text-foreground">
          {entity.title}
        </h3>
        {entity.subtitle && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {entity.subtitle}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 text-eyebrow text-muted-foreground">
          {entity.date_display && <span>{entity.date_display}</span>}
          {entity.date_display && entity.continent && <span>·</span>}
          {entity.continent && <span>{entity.continent}</span>}
        </div>
      </div>
    </Link>
  );
}
