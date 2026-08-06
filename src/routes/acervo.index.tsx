import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Globe2, Search } from "lucide-react";
import { listAcervo } from "@/lib/data/acervo.functions";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EntityCard, type AcervoEntity } from "@/components/EntityCard";
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

type RichAcervoEntity = AcervoEntity & {
  country?: string | null;
  culture?: string | null;
  tags?: string;
  themes?: string;
  metadata?: string;
};

const lenses = [
  { id: "traditional", label: "Tradicional", terms: ["traditional", "história da arte", "classico", "clássico"] },
  { id: "women", label: "Mulheres e mães", terms: ["women", "mulher", "mãe", "mae", "maternidade"] },
  { id: "indigenous", label: "Indígenas", terms: ["indigenous", "indígena", "indigena", "povos originários"] },
  { id: "black", label: "Negros e diásporas", terms: ["black", "negro", "african", "africano", "diáspora"] },
  { id: "lgbtqia", label: "LGBTQIA+", terms: ["lgbt", "queer", "trans", "não-binár"] },
  { id: "bioethics", label: "Bioética e animalidades", terms: ["bioética", "bioetica", "animal", "multiespéc", "multiespec"] },
  { id: "beyond", label: "Além do Antropoceno", terms: ["beyond_anthropocene", "antropoceno", "chthuluceno", "simbioceno", "plantationoceno"] },
];

async function fetchAcervo(): Promise<RichAcervoEntity[]> {
  return (await listAcervo()) as RichAcervoEntity[];
}

function AcervoPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [lens, setLens] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["acervo"],
    queryFn: fetchAcervo,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const externalSearch = useMutation({
    mutationFn: async (term: string) =>
      await searchOpenCollections({ data: { query: term, limit: 36 } }),
  });

  function searchPlanet() {
    const term = query.trim();
    if (term.length < 2) return;
    externalSearch.mutate(term);
  }

  const types = useMemo(() => {
    const set = new Set((data ?? []).map((e) => e.entity_type));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((e) => {
      if (type && e.entity_type !== type) return false;
      const haystack = [e.title, e.subtitle, e.continent, e.country, e.culture, e.tags, e.themes, e.metadata]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (lens) {
        const selected = lenses.find((item) => item.id === lens);
        if (selected && !selected.terms.some((term) => haystack.includes(term))) return false;
      }
      return !q || haystack.includes(q);
    });
  }, [data, query, type, lens]);

  const databaseEmpty = !isLoading && !isError && (data?.length ?? 0) === 0;

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
              {(data?.length ?? 0)} {t("acervo.subtitle")}
            </p>
          </header>

          <div className="mb-8 space-y-4">
            <div className="flex max-w-2xl flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && searchPlanet()}
                  placeholder="Pesquise no Atlas e nos acervos do planeta…"
                  className="pl-9"
                />
              </div>
              <Button onClick={searchPlanet} disabled={externalSearch.isPending || query.trim().length < 2}>
                <Globe2 className="mr-2 h-4 w-4" />
                {externalSearch.isPending ? "Buscando…" : "Buscar no planeta"}
              </Button>
            </div>
            <p className="max-w-2xl text-xs text-muted-foreground">
              A digitação filtra imediatamente o acervo curado. O botão também consulta Metropolitan Museum, Art Institute of Chicago e Wikimedia Commons.
            </p>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perspectivas curatoriais</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={lens === null} onClick={() => setLens(null)} label="Todas as perspectivas" />
                {lenses.map((item) => (
                  <FilterChip key={item.id} active={lens === item.id} onClick={() => setLens(item.id)} label={item.label} />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipos de registro</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={type === null} onClick={() => setType(null)} label={t("common.all")} />
                {types.map((tp) => (
                  <FilterChip key={tp} active={type === tp} onClick={() => setType(tp)} label={labelForEntityType(tp)} />
                ))}
              </div>
            </div>
          </div>

          {isError ? (
            <section className="mb-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
              <h2 className="font-display text-xl font-semibold">O banco não respondeu</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Confira as variáveis TURSO_DATABASE_URL e TURSO_AUTH_TOKEN na Vercel e faça um novo deploy.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
            </section>
          ) : null}

          {databaseEmpty ? (
            <section className="mb-10 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
              <h2 className="font-display text-xl font-semibold">O banco está conectado, mas o acervo ainda não foi restaurado</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Execute a ação “Restaurar acervo do Atlas” na aba Actions do GitHub. Ela colocará de volta os 3.331 registros do arquivo de exportação, sem apagar nem duplicar os dados existentes.
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
              {externalSearch.data.errors?.length ? (
                <p className="mt-3 text-xs text-muted-foreground">Algumas fontes não responderam agora, mas as demais foram exibidas.</p>
              ) : null}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {externalSearch.data.results.map((artwork) => (
                  <ExternalArtworkCard key={artwork.id} artwork={artwork} />
                ))}
              </div>
            </section>
          ) : externalSearch.isSuccess ? (
            <section className="mb-12 rounded-2xl border border-border p-6 text-sm text-muted-foreground">
              Nenhum resultado aberto foi encontrado para “{query}”.
            </section>
          ) : null}

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 && !databaseEmpty ? (
            <p className="py-16 text-center text-muted-foreground">{t("acervo.empty")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((e) => (
                <EntityCard key={e.id} entity={e} />
              ))}
            </div>
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
