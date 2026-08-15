import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Globe2, Search } from "lucide-react";
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
          "Navegue pelo acervo curado do Atlas Planetário e pesquise simultaneamente em acervos abertos internacionais.",
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
  const pageSize = 48;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(term.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [term]);

  useEffect(() => setPage(1), [type, lens]);

  const stats = useQuery({
    queryKey: ["acervo-stats"],
    queryFn: () => getAcervoStats(),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["acervo-page", q, type, lens, page],
    queryFn: () =>
      searchAcervo({
        data: { q: q || undefined, type, lens, page, pageSize },
      }),
    staleTime: 2 * 60_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });

  const externalSearch = useMutation({
    mutationFn: async (searchTerm: string) =>
      await searchOpenCollections({ data: { query: searchTerm, limit: 36 } }),
  });

  function searchPlanet() {
    const searchTerm = term.trim();
    if (searchTerm.length < 2) return;
    externalSearch.mutate(searchTerm);
  }

  const databaseEmpty =
    !isLoading && !isError && (data?.total ?? 0) === 0 && !q && !type && !lens;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <header className="mb-8">
            <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              {t("acervo.title")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {(data?.total ?? 0).toLocaleString("pt-BR")} {t("acervo.subtitle")} nesta seleção
            </p>
            {stats.data ? (
              <p className="mt-1 max-w-4xl text-xs leading-5 text-muted-foreground">
                Acervo geral: <strong>{stats.data.uniqueImages.toLocaleString("pt-BR")}</strong> imagens únicas · {" "}
                <strong>{stats.data.published.toLocaleString("pt-BR")}</strong> registros documentais publicados.
                {stats.data.aicPublicDomain > 0 ? (
                  <> AIC: <strong>{stats.data.aicPublicDomain.toLocaleString("pt-BR")}</strong> obras em domínio público sincronizadas, {" "}
                  <strong>{stats.data.aicWithImage.toLocaleString("pt-BR")}</strong> com imagem IIIF.</>
                ) : null}
              </p>
            ) : null}
          </header>

          <div className="mb-8 space-y-4">
            <div className="flex max-w-2xl flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && searchPlanet()}
                  placeholder="Pesquise no Atlas e nos acervos do planeta…"
                  className="pl-9"
                />
              </div>
              <Button
                onClick={searchPlanet}
                disabled={externalSearch.isPending || term.trim().length < 2}
              >
                <Globe2 className="mr-2 h-4 w-4" />
                {externalSearch.isPending ? "Buscando…" : "Buscar no planeta"}
              </Button>
            </div>
            <p className="max-w-2xl text-xs text-muted-foreground">
              A busca do Atlas é paginada no servidor para continuar rápida com dezenas de milhares de registros. Fichas sem imagem permanecem documentadas no banco, mas não ocupam cards no acervo visual. O botão também consulta acervos abertos externos.
            </p>

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
              <h2 className="font-display text-xl font-semibold">O banco não respondeu</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Confira TURSO_DATABASE_URL e TURSO_AUTH_TOKEN na Vercel e faça um novo deploy.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </section>
          ) : null}

          {databaseEmpty ? (
            <section className="mb-10 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
              <h2 className="font-display text-xl font-semibold">O banco está conectado, mas o acervo está vazio</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Execute a restauração do acervo ou a ação “Sincronizar acervo público completo do AIC” no GitHub Actions.
              </p>
            </section>
          ) : null}

          {externalSearch.data?.results?.length ? (
            <section className="mb-12 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-primary">
                <Globe2 className="h-5 w-5" />
                <h2 className="font-display text-2xl font-semibold">Resultados em acervos abertos</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                As imagens permanecem nas instituições de origem; o Atlas relaciona seus links, créditos e licenças.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {externalSearch.data.results.map((artwork) => (
                  <ExternalArtworkCard key={artwork.id} artwork={artwork} />
                ))}
              </div>
            </section>
          ) : externalSearch.isSuccess ? (
            <section className="mb-12 rounded-2xl border border-border p-6 text-sm text-muted-foreground">
              Nenhum resultado aberto foi encontrado para “{term}”.
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

              {(data?.pageCount ?? 1) > 1 && (
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
                    Página {data?.page ?? page} de {data?.pageCount ?? 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= (data?.pageCount ?? 1) || isFetching}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Próxima
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
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
