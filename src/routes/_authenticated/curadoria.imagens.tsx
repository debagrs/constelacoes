import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X, ExternalLink, ImageOff } from "lucide-react";
import {
  listImageQueue,
  approveImageSuggestion,
  rejectImageSuggestion,
} from "@/lib/data/curadoria.functions";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { labelForEntityType } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/curadoria/imagens")({
  component: CuradoriaImagens,
});

interface Suggestion {
  id: string;
  entity_id: string;
  rank: number;
  image_url: string;
  thumbnail_url: string | null;
  source_url: string | null;
  wikidata_qid: string | null;
  candidate_title: string | null;
  candidate_description: string | null;
  status: string;
}

interface EntityRow {
  id: string;
  title: string;
  subtitle: string | null;
  entity_type: string;
  date_display: string | null;
  culture: string | null;
}

interface Group {
  entity: EntityRow;
  suggestions: Suggestion[];
}

async function fetchQueue(): Promise<Group[]> {
  return (await listImageQueue()) as Group[];
}

function CuradoriaImagens() {
  const { isReviewer, loading } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["curadoria-imagens"],
    queryFn: fetchQueue,
    enabled: isReviewer,
  });
  const [busy, setBusy] = useState<string | null>(null);

  const approve = useMutation({
    mutationFn: async (id: string) => {
      await approveImageSuggestion({ data: { suggestionId: id } });
    },
    onSuccess: () => {
      toast.success("Imagem aprovada e vinculada à obra.");
      queryClient.invalidateQueries({ queryKey: ["curadoria-imagens"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(null),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      await rejectImageSuggestion({ data: { suggestionId: id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curadoria-imagens"] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(null),
  });

  if (loading) return <Shell><Skeleton className="h-32 w-full" /></Shell>;

  if (!isReviewer) {
    return (
      <Shell>
        <div className="rounded-lg border border-border/60 bg-card p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">
            Acesso restrito
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A fila de curadoria é reservada a curadores e administradores.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-muted-foreground">Curadoria</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">
            Fila de imagens
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Aprove ou rejeite as três melhores sugestões do Wikidata para cada
            obra sem imagem. A imagem aprovada é vinculada à ficha e as demais
            são descartadas automaticamente.
          </p>
        </div>
        <Badge variant="secondary">
          {data?.length ?? 0} obras aguardando revisão
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-card p-10 text-center">
          <ImageOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma sugestão pendente no momento.
          </p>
        </div>
      ) : (
        <ul className="space-y-8">
          {data.map((g) => (
            <li
              key={g.entity.id}
              className="rounded-lg border border-border/60 bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge variant="outline" className="text-[0.65rem] uppercase">
                    {labelForEntityType(g.entity.entity_type)}
                  </Badge>
                  <h2 className="mt-2 font-display text-xl font-semibold text-foreground">
                    <Link
                      to="/acervo/$id"
                      params={{ id: g.entity.id }}
                      className="hover:underline"
                    >
                      {g.entity.title}
                    </Link>
                  </h2>
                  {g.entity.subtitle && (
                    <p className="text-sm text-muted-foreground">
                      {g.entity.subtitle}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[g.entity.date_display, g.entity.culture]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col overflow-hidden rounded-md border border-border/60 bg-background"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                      <img
                        src={s.thumbnail_url ?? s.image_url}
                        alt={s.candidate_title ?? ""}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <p className="line-clamp-2 font-display text-sm text-foreground">
                        {s.candidate_title ?? "Sem título"}
                      </p>
                      {s.candidate_description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {s.candidate_description}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        {s.source_url && (
                          <a
                            href={s.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {s.wikidata_qid ?? "fonte"}
                          </a>
                        )}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === s.id}
                            onClick={() => {
                              setBusy(s.id);
                              reject.mutate(s.id);
                            }}
                            aria-label="Rejeitar"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy === s.id}
                            onClick={() => {
                              setBusy(s.id);
                              approve.mutate(s.id);
                            }}
                            aria-label="Aprovar"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
