import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getAcervoStats, searchAcervo } from "@/lib/data/acervo.functions";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EntityCard } from "@/components/EntityCard";
import { ExternalArtworkCard } from "@/components/ExternalArtworkCard";
import { searchOpenCollections } from "@/lib/data/federated.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { labelForEntityType } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/acervo/")({
  head: () => ({
    meta: [
      { title: "Acervo curado · Atlas Planetário da Cultura Visual" },
      {
        name: "description",
        content:
          "Navegue pelo acervo curado do Atlas Planetário e pesquise em acervos museológicos internacionais.",
      },
    ],
  }),
  component: AcervoPage,
});

const lenses = [
  { id: "traditional", label: "Tradicional" },
  { id: "women", label: "Mulheres e mães" },
  { id: "indigenous", label: "Indígenas" },
  { id: "black", label: "Negros e diásporas" },
  { id: "lgbtqia", label: "LGBTQIA+" },
  { id: "bioethics", label: "Bioética e animalidades" },
  { id: "beyond", label: "Além do Antropoceno" },
] as const;

type LensId = (typeof lenses)[number]["id"];

function AcervoPage() {
  const { t } = useI18n();
  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [lens, setLens] = useState<LensId | null>(null);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<Record<number, string | null>>({ 1: null });
  const pageSize = 48;
  const cursor = cursors[page] ?? null;

  useEffect(() => {
    setPage(1);
    setCursors({ 1: null });
  }, [type, lens]);

  const stats = useQuery({
    queryKey: ["acervo-stats"],
    queryFn: () => getAcervoStats(),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["acervo-page", q, type, lens, page, cursor],
    queryFn: () =>
      searchAcervo({
        data: { q: q || undefined, type, lens, page, pageSize, cursor },
      }),
    staleTime: 2 * 60_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const externalSearch = useMutation({
    mutationFn: async (searchTerm: string) =>
      await searchOpenCollections({ data: { query: searchTerm, limit: 36 } }),
  });

  function searchAll() {
    const searchTerm = term.trim();
    if (searchTerm.length < 2) return;
    setQ(searchTerm);
    setPage(1);
    setCursors({ 1: null });
    externalSearch.mutate(searchTerm);
  }

  const databaseEmpty =
    !isLoading && !isError && !q && !type && !lens && stats.data?.statsReady === true && stats.data.published === 0;

  const selectionTotal = data?.total ?? null;

  function goNextPage() {
    if (!data?.hasNext || !data.nextCursor || isFetching) return;
    setCursors((current) => ({ ...current, [page + 1]: data.nextCursor }));
    setPage((value) => value + 1);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <header className="mb-8">
            <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              {t("acervo.title")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Explore artistas, obras, movimentos, conceitos e visualidades em diferentes tempos, territórios e perspectivas.
            </p>
          </header>

          <div className="mb-8 space-y-4">
            <form
              className="flex max-w-2xl flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                searchAll();
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Busque artistas, obras, movimentos ou conceitos…"
                  className="pl-9"
                />
              </div>
              <Button
                type="submit"
                disabled={externalSearch.isPending || term.trim().length < 2}
              >
                <Search className="mr-2 h-4 w-4" />
                {externalSearch.isPending ? "Buscando…" : "Buscar"}
              </Button>
            </form>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Perspectivas curatoriais
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={lens === null}
                  onClick={() => setLens(null)}
                  label="Todas as perspectivas"
                />
                {lenses.map((item) => (
                  <FilterChip
                    key={item.id}
                    active={lens === item.id}
                    onClick={() => setLens(item.id)}
                    label={item.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tipos de registro
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={type === null} onClick={() => setType(null)} label={t("common.all")} />
                {(data?.types ?? []).map((entityType) => (
                  <FilterChip
                    key={entityType}
                    active={type === entityType}
                    onClick={() => setType(entityType)}
                    label={labelForEntityType(entityType)}
                  />
                ))}
              </div>
            </div>
          </div>

          {isError ? (
            <section className="mb-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
              <h2 className="font-display text-xl font-semibold">Não foi possível carregar o acervo</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Não foi possível concluir a busca agora. Tente novamente em instantes.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </section>
          ) : null}

          {databaseEmpty ? (
            <section className="mb-10 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
              <h2 className="font-display text-xl font-semibold">Acervo temporariamente indisponível</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Estamos preparando novamente as imagens e registros. Volte em breve.
              </p>
            </section>
          ) : null}

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[4/5] w-full rounded-lg" />
              ))}
            </div>
          ) : (data?.items.length ?? 0) === 0 && !databaseEmpty ? (
            <p className="py-16 text-center text-muted-foreground">{t("acervo.empty")}</p>
          ) : (
            <>
              <div
                className={cn(
                  "grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-3 lg:grid-cols-4",
                  isFetching && "opacity-60",
                )}
              >
                {(data?.items ?? []).map((entity) => (
                  <EntityCard key={entity.id} entity={entity} />
                ))}
              </div>

              {(page > 1 || data?.hasNext) && (
                <div className="mt-10 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    Página {data?.page ?? page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data?.hasNext || isFetching}
                    onClick={goNextPage}
                  >
                    Próxima
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {q && externalSearch.data?.results?.length ? (
            <section className="mt-14 border-t border-border pt-10">
              <h2 className="font-display text-2xl font-semibold">Outras descobertas</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Amplie a pesquisa em coleções internacionais relacionadas a “{q}”.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {externalSearch.data.results.map((artwork) => (
                  <ExternalArtworkCard key={artwork.id} artwork={artwork} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
