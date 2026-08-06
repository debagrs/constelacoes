import { Link } from "@tanstack/react-router";
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

export function EntityCard({ entity }: { entity: AcervoEntity }) {
  return (
    <Link
      to="/acervo/$id"
      params={{ id: entity.id }}
      className="group block overflow-hidden rounded-lg border border-border/60 bg-card transition-all hover:border-primary/50 hover:shadow-lg"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {entity.image_url ? (
          <img
            src={entity.image_url}
            alt={entity.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="font-display text-4xl text-muted-foreground/40">
              {entity.title.charAt(0)}
            </span>
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute left-3 top-3 bg-background/85 text-[0.65rem] uppercase tracking-wide backdrop-blur"
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
