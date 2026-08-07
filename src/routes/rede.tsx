import { useMemo, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getNetwork } from "@/lib/data/acervo.functions";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  NetworkGraph,
  relationColor,
  type GraphLink,
  type GraphNode,
} from "@/components/NetworkGraph";
import {
  RELATION_TYPES,
  labelForRelationType,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  focus: z.string().optional(),
});

export const Route = createFileRoute("/rede")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Rede de relações · Atlas Planetário da Cultura Visual" },
      {
        name: "description",
        content:
          "Visualize as sobrevivências, influências e continuidades entre obras, artistas e conceitos como uma constelação navegável.",
      },
    ],
  }),
  component: RedePage,
});

interface RedeData {
  nodes: GraphNode[];
  links: GraphLink[];
  availableTypes: string[];
}

async function fetchRede(): Promise<RedeData> {
  const { nodes: ents, links: rels } = await getNetwork();

  const nodes: GraphNode[] = ents.map((e) => ({
    id: e.id,
    title: e.title,
    entity_type: e.entity_type,
  }));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const links: GraphLink[] = rels
    .filter((r) => nodeIds.has(r.source_id) && nodeIds.has(r.target_id))
    .map((r) => ({
      id: r.id,
      source: r.source_id,
      target: r.target_id,
      relation_type: r.relation_type,
    }));
  const primary = ["continuidade", "influencia", "sobrevivencia"];
  const discovered = Array.from(new Set(links.map((l) => l.relation_type)));
  const availableTypes = [
    ...primary.filter((type) => discovered.includes(type)),
    ...discovered.filter((type) => !primary.includes(type)).sort(),
  ];
  return { nodes, links, availableTypes };
}

function RedePage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["rede"],
    queryFn: fetchRede,
  });

  const [active, setActive] = useState<Set<string> | null>(null);
  const activeSet = useMemo(() => {
    if (active) return active;
    return new Set(data?.availableTypes ?? (RELATION_TYPES as readonly string[]));
  }, [active, data?.availableTypes]);

  const relationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const link of data?.links ?? []) {
      counts.set(link.relation_type, (counts.get(link.relation_type) ?? 0) + 1);
    }
    return counts;
  }, [data?.links]);

  const toggle = (type: string) => {
    const next = new Set(activeSet);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setActive(next);
  };

  const allOn = () =>
    setActive(new Set(data?.availableTypes ?? (RELATION_TYPES as readonly string[])));
  const allOff = () => setActive(new Set());

  const handleSelect = (node: GraphNode) => {
    router.navigate({
      to: "/acervo/$id",
      params: { id: node.id },
    });
  };

  const clearFocus = () =>
    navigate({ to: "/rede", search: {}, replace: true });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <header className="mb-6">
          <p className="text-eyebrow text-muted-foreground">
            Constelação
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground sm:text-4xl">
            Rede de relações
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cada nó é uma entidade do acervo; cada linha é uma relação
            registrada. Filtre por tipo de relação, arraste, aproxime e clique
            em um nó para abrir sua ficha.
          </p>
        </header>

        {/* Legend + filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={allOn} className="h-7 px-2 text-xs">
            {t("common.all")}
          </Button>
          <Button size="sm" variant="ghost" onClick={allOff} className="h-7 px-2 text-xs">
            {t("common.none")}
          </Button>
          <span className="mx-1 h-4 w-px bg-border" />
          {(data?.availableTypes ?? RELATION_TYPES).map((type) => {
            const on = activeSet.has(type);
            return (
              <button
                key={type}
                onClick={() => toggle(type)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-border bg-background text-foreground"
                    : "border-border/40 bg-transparent text-muted-foreground opacity-60 hover:opacity-100",
                )}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: relationColor(type) }}
                />
                {labelForRelationType(type)}
                <span className="tabular-nums text-[0.65rem] text-muted-foreground">
                  {relationCounts.get(type) ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {data && data.links.length > 0 && (
          <p className="mb-4 text-xs text-muted-foreground">
            Os filtros estão ativos: clique em uma categoria para ocultar ou exibir suas linhas.
            A rede mostra somente entidades que possuem relações registradas, para que as
            continuidades, influências e sobrevivências permaneçam legíveis.
          </p>
        )}

        {search.focus && data && (
          <div className="mb-3 flex items-center justify-between rounded-md border border-border/60 bg-card px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              Foco em{" "}
              <span className="font-medium text-foreground">
                {data.nodes.find((n) => n.id === search.focus)?.title ??
                  "entidade"}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFocus}
              className="h-6 px-2 text-xs"
            >
              Limpar
            </Button>
          </div>
        )}

        {isLoading || !data ? (
          <Skeleton className="h-[640px] w-full rounded-lg" />
        ) : data.nodes.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            {t("acervo.empty")}
          </p>
        ) : (
          <NetworkGraph
            nodes={data.nodes}
            links={data.links}
            focusId={search.focus ?? null}
            activeRelationTypes={activeSet}
            onSelect={handleSelect}
          />
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          {data ? `${data.nodes.length} entidades · ${data.links.length} relações` : ""}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
