import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { listAcervo } from "@/lib/data/acervo.functions";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EntityCard, type AcervoEntity } from "@/components/EntityCard";
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
          "Navegue pelo acervo curado do Atlas Planetário: obras, artistas, movimentos, conceitos e motivos da cultura visual planetária.",
      },
    ],
  }),
  component: AcervoPage,
});

async function fetchAcervo(): Promise<AcervoEntity[]> {
  return (await listAcervo()) as AcervoEntity[];
}

function AcervoPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["acervo"],
    queryFn: fetchAcervo,
    // Sem realtime no Turso: revalida periodicamente para refletir enriquecimentos.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const types = useMemo(() => {
    const set = new Set((data ?? []).map((e) => e.entity_type));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((e) => {
      if (type && e.entity_type !== type) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.subtitle ?? "").toLowerCase().includes(q) ||
        (e.continent ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, query, type]);

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

          {/* Controls */}
          <div className="mb-8 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("acervo.search_placeholder")}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={type === null}
                onClick={() => setType(null)}
                label={t("common.all")}
              />
              {types.map((tp) => (
                <FilterChip
                  key={tp}
                  active={type === tp}
                  onClick={() => setType(tp)}
                  label={labelForEntityType(tp)}
                />
              ))}
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              {t("acervo.empty")}
            </p>
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

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
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
