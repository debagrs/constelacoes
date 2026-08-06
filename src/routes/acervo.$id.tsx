import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { getEntityDetail } from "@/lib/data/acervo.functions";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { labelForEntityType, labelForRelationType } from "@/lib/constants";

export const Route = createFileRoute("/acervo/$id")({
  component: EntityDetail,
  errorComponent: DetailError,
  notFoundComponent: () => <ShellMessage title="Obra não encontrada" />,
});

type MetadataValue = string | number | boolean | null | MetadataValue[] | { [key: string]: MetadataValue };

interface RelatedItem {
  relationId: string;
  relationType: string;
  description: string | null;
  direction: "out" | "in";
  entity: { id: string; title: string; entity_type: string } | null;
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

const LABELS: Record<string, string> = {
  creator: "Autoria",
  artist: "Artista",
  author: "Autoria",
  institution: "Instituição",
  collection: "Coleção",
  accession_number: "Número de inventário",
  object_type: "Tipo de objeto",
  medium: "Meio",
  dimensions: "Dimensões",
  period: "Período",
  movement: "Movimento",
  genre: "Gênero",
  people: "Povo/comunidade",
  indigenous_people: "Povo indígena",
  language: "Idioma",
  latitude: "Latitude",
  longitude: "Longitude",
  provenance: "Proveniência",
  proveniencia: "Proveniência curatorial",
  revisao: "Última revisão",
  licenca_texto: "Licença",
  licenca_tipo: "Tipo de licença",
  status_metadados: "Status dos metadados",
  motherhood: "Maternidades e cuidado",
  bioethics: "Bioética",
  animal_relations: "Relações animais",
  more_than_human: "Mais-que-humano",
  decoloniality: "Perspectiva decolonial",
  sensory_keywords: "Sensorialidades",
  affective_keywords: "Afetos",
};

function humanize(key: string) {
  return LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function valueToText(value: MetadataValue): string | null {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, nested]) => {
        const text = valueToText(nested);
        return text ? `${humanize(key)}: ${text}` : null;
      })
      .filter(Boolean)
      .join(" · ");
  }
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

function EntityDetail() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["entity", id],
    queryFn: () => fetchEntity(id),
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-[4/5] w-full rounded-lg" />
          <div className="space-y-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-32 w-full" /></div>
        </div>
      </Shell>
    );
  }
  if (!data) return <ShellMessage title={t("acervo.empty")} />;

  const { entity, related, bibliography } = data;
  const metadata = (entity.metadata ?? {}) as Record<string, MetadataValue>;
  const coreMetadata: Array<[string, string | null]> = [
    ["Autoria / atribuição", entity.subtitle],
    ["Datação", entity.date_display],
    ["Início", entity.date_start != null ? String(entity.date_start) : null],
    ["Fim", entity.date_end != null ? String(entity.date_end) : null],
    ["Localização", [entity.location, entity.country, entity.continent].filter(Boolean).join(", ") || null],
    ["Cultura", entity.culture],
    ["Materiais", entity.materials?.join(", ") || null],
    ["Técnicas", entity.techniques?.join(", ") || null],
    ["Cores", entity.colors?.join(", ") || null],
    ["Licença da imagem", entity.image_license],
    ["Imagem aberta", entity.open_image ? "Sim" : "Não"],
    ["Identificador", entity.id],
  ];
  const extraMetadata = Object.entries(metadata)
    .map(([key, value]) => [humanize(key), valueToText(value)] as [string, string | null])
    .filter(([, value]) => Boolean(value));
  const tags = Array.from(new Set([...(entity.tags ?? []), ...(entity.themes ?? [])])).filter(Boolean);

  return (
    <Shell>
      <Link to="/acervo" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("nav.acervo")}
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-lg border border-border/60 bg-muted">
            {entity.source_url ? (
              <a href={entity.source_url} target="_blank" rel="noreferrer" title="Abrir fonte original">
                {entity.image_url ? <img src={entity.image_url} alt={entity.title} className="w-full object-cover" /> : <Placeholder title={entity.title} />}
              </a>
            ) : entity.image_url ? <img src={entity.image_url} alt={entity.title} className="w-full object-cover" /> : <Placeholder title={entity.title} />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {entity.image_license && <span>Licença: {entity.image_license}</span>}
            {entity.source_url && (
              <a href={entity.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                Abrir fonte original <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        <div>
          <Badge variant="secondary" className="uppercase tracking-wide">{labelForEntityType(entity.entity_type)}</Badge>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{entity.title}</h1>
          {entity.subtitle && <p className="mt-1 text-lg text-muted-foreground">{entity.subtitle}</p>}
          {entity.description && <p className="mt-5 whitespace-pre-line leading-relaxed text-foreground/90">{entity.description}</p>}

          {tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link key={tag} to="/tag/$tag" params={{ tag }} className="rounded-full border border-border bg-card px-3 py-1 text-xs transition hover:border-primary hover:text-primary">
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-eyebrow text-muted-foreground">Ficha completa</h2>
            <MetadataList rows={[...coreMetadata, ...extraMetadata]} />
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-foreground">{t("acervo.detail.relations")}</h2>
        {related.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t("acervo.detail.relations_empty")}</p> : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {related.map((relation) => (
              <li key={relation.relationId}>
                <Link to="/acervo/$id" params={{ id: relation.entity?.id ?? "" }} disabled={!relation.entity} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-primary/50">
                  <ArrowRight className={`mt-1 h-4 w-4 shrink-0 text-primary ${relation.direction === "in" ? "rotate-180" : ""}`} />
                  <div className="min-w-0"><Badge variant="outline" className="text-[0.65rem]">{labelForRelationType(relation.relationType)}</Badge><p className="mt-1 font-display text-lg text-foreground">{relation.entity?.title ?? "—"}</p>{relation.description && <p className="mt-0.5 text-sm text-muted-foreground">{relation.description}</p>}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-foreground">Referências bibliográficas</h2>
        {bibliography.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Sem referências cadastradas.</p> : (
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {bibliography.map((item) => <li key={item.id} className="rounded-lg border border-border/60 bg-card p-4"><p className="font-display text-base">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{[item.authors, item.year].filter(Boolean).join(" · ")}</p>{item.url && <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">Abrir referência <ExternalLink className="h-3 w-3" /></a>}</li>)}
          </ul>
        )}
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild><Link to="/rede" search={{ focus: entity.id }}>Ver na rede</Link></Button>
        {entity.source_url && <Button asChild variant="outline"><a href={entity.source_url} target="_blank" rel="noreferrer">Fonte original <ExternalLink className="h-4 w-4" /></a></Button>}
        <Button asChild variant="outline"><Link to="/atlas">Adicionar a um Atlas</Link></Button>
      </div>
    </Shell>
  );
}

function MetadataList({ rows }: { rows: Array<[string, string | null]> }) {
  const visible = rows.filter(([, value]) => Boolean(value));
  return <dl className="mt-3 divide-y divide-border/60">{visible.map(([label, value], index) => <div key={`${label}-${index}`} className="grid grid-cols-3 gap-3 py-2.5 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="col-span-2 break-words text-foreground">{value}</dd></div>)}</dl>;
}

function Placeholder({ title }: { title: string }) {
  return <div className="flex aspect-[4/5] items-center justify-center bg-secondary"><span className="font-display text-6xl text-muted-foreground/40">{title.charAt(0)}</span></div>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main><SiteFooter /></div>;
}

function ShellMessage({ title }: { title: string }) {
  return <Shell><div className="flex flex-col items-center justify-center py-24 text-center"><h1 className="font-display text-2xl font-semibold">{title}</h1><Button asChild className="mt-6" variant="outline"><Link to="/acervo"><ArrowLeft className="h-4 w-4" />Voltar ao acervo</Link></Button></div></Shell>;
}

function DetailError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return <Shell><div className="flex flex-col items-center justify-center py-24 text-center"><h1 className="font-display text-2xl font-semibold">Não foi possível carregar esta ficha.</h1><Button className="mt-6" onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button></div></Shell>;
}
