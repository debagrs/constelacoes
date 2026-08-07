import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Search } from "lucide-react";
import {
  listRegions,
  getRegionOverview,
  searchRegionItems,
} from "@/lib/data/planetario.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WorldMap } from "@/components/WorldMap";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labelForEntityType } from "@/lib/constants";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ regiao: z.string().optional() });

export const Route = createFileRoute("/mapa")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Mapa planetário · Atlas Planetário da Cultura Visual" },
      {
        name: "description",
        content:
          "Navegue pelo mapa-múndi do Atlas Planetário: cada região abre sua própria linha do tempo, sensibilidades e obras.",
      },
      { property: "og:title", content: "Mapa planetário · Atlas Planetário da Cultura Visual" },
      {
        property: "og:description",
        content:
          "Um mapa-múndi navegável de culturas visuais: regiões, territórios e obras da pré-história ao contemporâneo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapaPage,
});

function MapaPage() {
  const { regiao } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [continent, setContinent] = useState<string | null>(null);
  const [selectedFacet, setSelectedFacet] = useState<{ id: string; name: string } | null>(null);
  const galleryRef = useRef<HTMLElement>(null);

  const { data: regions, isLoading } = useQuery({
    queryKey: ["regions"],
    queryFn: () => listRegions(),
    staleTime: 5 * 60_000,
  });

  const selectedId = regiao ?? null;

  const { data: overview, isFetching: loadingOverview } = useQuery({
    queryKey: ["region-overview", selectedId],
    queryFn: () => getRegionOverview({ data: { id: selectedId as string } }),
    enabled: !!selectedId,
  });

  const continents = useMemo(
    () => Array.from(new Set((regions ?? []).map((r) => r.continent).filter(Boolean))).sort(),
    [regions],
  );

  const markers = useMemo(
    () => (regions ?? []).filter((r) => !continent || r.continent === continent),
    [regions, continent],
  );

  const select = (id: string) => {
    setSelectedFacet(null);
    navigate({ search: (prev: { regiao?: string }) => ({ ...prev, regiao: id }) });
  };

  const selectContinent = (value: string | null) => {
    setSelectedFacet(null);
    setContinent(value);
    // Evita a situação em que "África" está selecionada mas o painel ainda mostra
    // a última região europeia. O chip passa a ser uma seleção de acervo por si só.
    navigate({ search: () => ({}) });
  };

  // Ao tocar em um continente, a galeria correspondente já aparece e recebe foco.
  useEffect(() => {
    if (!continent || selectedId) return;
    const timer = window.setTimeout(() => {
      galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [continent, selectedId]);

  // O mesmo vale para as camadas/tag da região: um toque deve mostrar os itens,
  // sem exigir novo clique no mapa.
  useEffect(() => {
    if (!selectedFacet) return;
    const timer = window.setTimeout(() => {
      galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [selectedFacet]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <header className="mb-6">
          <p className="text-eyebrow text-muted-foreground">Camada planetária</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Mapa-múndi das culturas visuais
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Cada ponto é uma região do acervo, dimensionada pela quantidade de itens
            publicados. Você também pode tocar diretamente nos territórios abaixo para
            abrir a galeria correspondente.
          </p>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectContinent(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              !continent
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            Todos
          </button>
          {continents.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => selectContinent(c === continent ? null : c)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                continent === c
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {isLoading ? (
            <Skeleton className="aspect-[960/500] w-full rounded-lg" />
          ) : (
            <WorldMap
              markers={markers}
              selectedId={selectedId}
              onSelect={select}
              className="aspect-[960/500] w-full"
            />
          )}

          <aside className="min-w-0">
            {!selectedId ? (
              <div className="rounded-lg border border-border/60 bg-card/40 p-6">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <h2 className="mt-3 font-display text-lg text-foreground">
                  {continent ? `Explorando ${continent}` : "Escolha uma região"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {continent
                    ? `A galeria de ${continent} já está aberta abaixo. Se quiser, escolha um ponto para restringir a uma região específica.`
                    : "Selecione um território acima ou um ponto do mapa."}
                </p>
                <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto pr-1">
                  {markers.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => select(r.id)}
                        className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      >
                        <span className="truncate">{r.name}</span>
                        <span className="text-xs tabular-nums">{r.total}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : loadingOverview && !overview ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : !overview ? (
              <p className="text-sm text-muted-foreground">Região não encontrada.</p>
            ) : (
              <RegionOverview
                overview={overview}
                onSelectRegion={select}
                onClear={() => {
                  setSelectedFacet(null);
                  navigate({ search: () => ({}) });
                }}
                selectedFacet={selectedFacet}
                onSelectFacet={(facet) =>
                  setSelectedFacet((current) =>
                    current?.id === facet.id ? null : facet,
                  )
                }
              />
            )}
          </aside>
        </div>

        {(overview && selectedId) || continent ? (
          <section ref={galleryRef} className="mt-8 scroll-mt-24 border-t border-border/60 pt-8">
            <MapItems
              regionId={overview && selectedId ? overview.region.id : undefined}
              continent={!selectedId ? continent ?? undefined : undefined}
              fallback={overview && selectedId ? overview.items : []}
              facet={selectedId ? selectedFacet : null}
            />
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

type Overview = NonNullable<Awaited<ReturnType<typeof getRegionOverview>>>;

function formatYear(y: number) {
  return y < 0 ? `${Math.abs(y)} a.C.` : `${y}`;
}

function RegionOverview({
  overview,
  onSelectRegion,
  onClear,
  selectedFacet,
  onSelectFacet,
}: {
  overview: Overview;
  onSelectRegion: (id: string) => void;
  onClear: () => void;
  selectedFacet: { id: string; name: string } | null;
  onSelectFacet: (facet: { id: string; name: string }) => void;
}) {
  const { region, timeline, facets, children } = overview;
  const maxBucket = Math.max(1, ...timeline.map((t) => t.total));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-eyebrow text-muted-foreground">{region.continent}</p>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          {region.name}
        </h2>
        {region.summary && (
          <p className="mt-2 text-sm text-muted-foreground">{region.summary}</p>
        )}
        <button
          type="button"
          onClick={onClear}
          className="mt-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Limpar seleção
        </button>
      </div>

      {timeline.length > 0 && (
        <div>
          <h3 className="text-eyebrow text-muted-foreground">Linha do tempo</h3>
          <div className="mt-2 flex h-20 items-end gap-1">
            {timeline.map((t) => (
              <div
                key={t.bucket}
                className="group flex-1 rounded-t bg-primary/40 transition-colors hover:bg-primary"
                style={{ height: `${(t.total / maxBucket) * 100}%` }}
                title={`${formatYear(t.bucket)} — ${t.total} itens`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{formatYear(timeline[0]!.bucket)}</span>
            <span>{formatYear(timeline[timeline.length - 1]!.bucket)}</span>
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div>
          <h3 className="text-eyebrow text-muted-foreground">Sub-regiões</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {children.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectRegion(c.id)}
                className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
              >
                {c.name} <span className="tabular-nums opacity-60">{c.total}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {facets.length > 0 && (
        <div>
          <h3 className="text-eyebrow text-muted-foreground">Camadas presentes</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {facets.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectFacet({ id: f.id, name: f.name })}
                aria-pressed={selectedFacet?.id === f.id}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  selectedFacet?.id === f.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-transparent bg-muted/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {f.name} <span className="tabular-nums opacity-60">{f.total}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MapItems({
  regionId,
  continent,
  fallback,
  facet,
}: {
  regionId?: string;
  continent?: string;
  fallback: Overview["items"];
  facet: { id: string; name: string } | null;
}) {
  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(term.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [term]);

  useEffect(() => {
    setTerm("");
    setQ("");
    setPage(1);
  }, [regionId, continent, facet?.id]);

  const { data, isFetching } = useQuery({
    queryKey: ["map-items", regionId ?? null, continent ?? null, facet?.id ?? null, q, page],
    queryFn: () =>
      searchRegionItems({
        data: {
          id: regionId,
          continent,
          q,
          facets: facet ? [facet.id] : undefined,
          page,
          pageSize,
        },
      }),
    enabled: Boolean(regionId || continent),
    placeholderData: (prev) => prev,
  });

  const list = data?.items ?? (q || facet || continent ? [] : fallback.slice(0, pageSize));
  const pageCount = data?.pageCount ?? 1;
  const total = data?.total ?? fallback.length;
  const heading = facet
    ? `Camada: ${facet.name}`
    : continent && !regionId
      ? `Acervo visual: ${continent}`
      : "Acervo visual da região";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-eyebrow text-muted-foreground">Itens do acervo</h3>
          <h2 className="mt-1 font-display text-2xl text-foreground">{heading}</h2>
        </div>
        <div className="flex items-center gap-3">
          {facet && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
              {facet.name}
            </span>
          )}
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {total} {total === 1 ? "item" : "itens"}
          </span>
        </div>
      </div>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar obras, artistas, culturas..."
          className="h-9 pl-8 text-sm"
        />
      </div>

      {list.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {isFetching ? "Buscando..." : "Nenhum item encontrado para este recorte."}
        </p>
      ) : (
        <ul
          className={cn(
            "mt-5 grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
            isFetching && "opacity-60",
          )}
        >
          {list.map((it) => (
            <li key={it.id}>
              <Link
                to="/acervo/$id"
                params={{ id: it.id }}
                className="group block overflow-hidden rounded-md border border-border/60 bg-card/40"
              >
                {it.image_url ? (
                  <img
                    src={it.image_url}
                    alt={it.title}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      const fallbackNode = event.currentTarget.nextElementSibling as HTMLElement | null;
                      fallbackNode?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div
                  className={cn(
                    "aspect-[4/3] items-center justify-center bg-muted/40 px-3 text-center text-[10px] uppercase text-muted-foreground",
                    it.image_url ? "hidden" : "flex",
                  )}
                >
                  Imagem indisponível · {labelForEntityType(it.entity_type)}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs text-foreground">{it.title}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {it.date_display ?? labelForEntityType(it.entity_type)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </Button>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
        <Link to="/acervo" search={{}}>
          Ver mais no acervo <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
