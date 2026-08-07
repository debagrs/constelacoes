import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getEntityDetail } from "@/lib/data/acervo.functions";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  labelForEntityType,
  labelForRelationType,
} from "@/lib/constants";

export const Route = createFileRoute("/acervo/$id")({
  component: EntityDetail,
  errorComponent: DetailError,
  notFoundComponent: () => (
    <ShellMessage title="Obra não encontrada" />
  ),
});

interface RelatedItem {
  relationId: string;
  relationType: string;
  description: string | null;
  direction: "out" | "in";
  entity: {
    id: string;
    title: string;
    entity_type: string;
  } | null;
}

async function fetchEntity(id: string) {
  const result = await getEntityDetail({ data: { id } });
  if (!result) return null;
  const related: RelatedItem[] = result.related.map((r) => ({
    relationId: r.relationId,
    relationType: r.relationType,
    description: r.description,
    direction: r.direction,
    entity: { id: r.id, title: r.title, entity_type: r.entity_type },
  }));
  return { entity: result.entity, related, bibliography: result.bibliography };
}


function EntityDetail() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["entity", id],
    queryFn: () => fetchEntity(id),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-[4/5] w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </Shell>
    );
  }

  if (!data) {
    return <ShellMessage title={t("acervo.empty")} />;
  }

  const { entity, related, bibliography } = data;
  const meta5 = (entity.metadata ?? {}) as {
    proveniencia?: string;
    revisao?: string;
    licenca_texto?: string;
    licenca_tipo?: string;
    status_metadados?: string;
  };


  const meta: Array<[string, string | null]> = [
    [t("acervo.detail.author"), entity.subtitle],
    [t("acervo.detail.date"), entity.date_display],
    [
      t("acervo.detail.location"),
      [entity.location, entity.country].filter(Boolean).join(", ") || null,
    ],
    [t("acervo.detail.culture"), entity.culture],
    [t("acervo.detail.materials"), entity.materials?.join(", ") || null],
    [t("acervo.detail.techniques"), entity.techniques?.join(", ") || null],
  ];

  return (
    <Shell>
      <Link
        to="/acervo"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nav.acervo")}
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-lg border border-border/60 bg-muted">
            {entity.image_url ? (
              <img
                src={entity.image_url}
                alt={entity.title}
                className="w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-secondary">
                <span className="font-display text-6xl text-muted-foreground/40">
                  {entity.title.charAt(0)}
                </span>
              </div>
            )}
          </div>
          {entity.image_license && (
            <p className="mt-2 text-eyebrow text-muted-foreground">
              {t("acervo.detail.source")}: {entity.image_license}
            </p>
          )}
        </div>

        <div>
          <Badge variant="secondary" className="uppercase tracking-wide">
            {labelForEntityType(entity.entity_type)}
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {entity.title}
          </h1>
          {entity.subtitle && (
            <p className="mt-1 text-lg text-muted-foreground">
              {entity.subtitle}
            </p>
          )}
          {entity.description && (
            <p className="mt-5 leading-relaxed text-foreground/90">
              {entity.description}
            </p>
          )}

          {/* Metadata */}
          <div className="mt-8">
            <h2 className="text-eyebrow text-muted-foreground">
              {t("acervo.detail.metadata")}
            </h2>
            <dl className="mt-3 divide-y divide-border/60">
              {meta
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-3 gap-2 py-2 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="col-span-2 text-foreground">{v}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Relations */}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          {t("acervo.detail.relations")}
        </h2>
        {related.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("acervo.detail.relations_empty")}
          </p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.relationId}>
                <Link
                  to="/acervo/$id"
                  params={{ id: r.entity?.id ?? "" }}
                  disabled={!r.entity}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <ArrowRight
                    className={`mt-1 h-4 w-4 shrink-0 text-primary ${
                      r.direction === "in" ? "rotate-180" : ""
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[0.65rem]">
                        {labelForRelationType(r.relationType)}
                      </Badge>
                    </div>
                    <p className="mt-1 font-display text-lg text-foreground">
                      {r.entity?.title ?? "—"}
                    </p>
                    {r.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Bibliografia + Proveniência */}
      <section className="mt-14 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Referências bibliográficas
          </h2>
          {bibliography.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Sem referências cadastradas.
            </p>
          ) : (
            <ul className="mt-5 space-y-3 text-sm">
              {bibliography.map((b) => (
                <li
                  key={b.id}
                  className="rounded-lg border border-border/60 bg-card p-4"
                >
                  <p className="font-display text-base text-foreground">
                    {b.title}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {[b.authors, b.year].filter(Boolean).join(" · ")}
                  </p>
                  {b.url && (
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Fonte externa
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="rounded-lg border border-border/60 bg-card p-5">
          <h3 className="text-eyebrow text-muted-foreground">
            Proveniência
          </h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Curadoria</dt>
              <dd className="text-foreground">
                {meta5.proveniencia ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Última revisão</dt>
              <dd className="text-foreground">{meta5.revisao ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Licença da imagem</dt>
              <dd className="text-foreground">
                {meta5.licenca_texto ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status dos metadados</dt>
              <dd className="text-foreground capitalize">
                {meta5.status_metadados ?? "—"}
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">

        <Button asChild>
          <Link to="/rede" search={{ focus: entity.id }}>
            Ver na rede
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/auth">{t("acervo.detail.add_to_atlas")}</Link>
        </Button>
      </div>
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

function ShellMessage({ title }: { title: string }) {
  return (
    <Shell>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          {title}
        </h1>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/acervo">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao acervo
          </Link>
        </Button>
      </div>
    </Shell>
  );
}

function DetailError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <Shell>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Não foi possível carregar esta obra.
        </h1>
        <Button
          className="mt-6"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    </Shell>
  );
}
