import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Cpu, ExternalLink, ImageOff } from "lucide-react";
import { getEntityDetail } from "@/lib/data/acervo.functions";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { labelForEntityType, labelForRelationType } from "@/lib/constants";
import {
  getCuratorialReferenceGroups,
  getTechniqueTechnologyReferenceGroups,
  referenceSearchUrl,
  techniqueReferenceSearchUrl,
} from "@/lib/curatorial-bibliography";

export const Route = createFileRoute("/acervo/$id")({
  component: EntityDetail,
  errorComponent: DetailError,
  notFoundComponent: () => <ShellMessage title="Obra não encontrada" />,
});

type MetadataValue =
  | string
  | number
  | boolean
  | null
  | MetadataValue[]
  | { [key: string]: MetadataValue };

interface RelatedItem {
  relationId: string;
  relationType: string;
  description: string | null;
  direction: "out" | "in";
  entity: { id: string; title: string; entity_type: string } | null;
}

interface SourceLink {
  label: string;
  url: string;
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
  return {
    entity: result.entity,
    related,
    bibliography: result.bibliography,
    sameArtistWorks: result.sameArtistWorks ?? [],
  };
}

const LABELS: Record<string, string> = {
  creator: "Autoria",
  artist: "Artista",
  author: "Autoria",
  institution: "Instituição",
  museum: "Museu / instituição",
  repository: "Repositório",
  collection: "Coleção",
  accession_number: "Número de inventário",
  inventory_number: "Número de inventário",
  object_number: "Número do objeto",
  object_type: "Tipo de objeto",
  medium: "Meio",
  media: "Mídia / meio",
  technique: "Técnica",
  techniques: "Técnicas",
  technology: "Tecnologia",
  technologies: "Tecnologias",
  process: "Processo",
  processes: "Processos",
  support: "Suporte",
  substrate: "Substrato",
  software: "Software",
  hardware: "Hardware",
  equipment: "Equipamento",
  camera: "Câmera",
  format: "Formato",
  digital_format: "Formato digital",
  duration: "Duração",
  codec: "Codec",
  resolution: "Resolução",
  interaction: "Interação",
  interface: "Interface",
  sensor: "Sensor / dispositivo",
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
  care: "Cuidado",
  bioethics: "Bioética",
  animal_relations: "Relações animais",
  more_than_human: "Mais-que-humano",
  decoloniality: "Perspectiva decolonial",
  sensory_keywords: "Sensorialidades",
  affective_keywords: "Afetos",
  source: "Fonte",
  source_name: "Nome da fonte",
  source_url: "URL da fonte",
  object_url: "Página do objeto",
  wikidata_url: "Wikidata",
  commons_url: "Wikimedia Commons",
  image_source: "Fonte da imagem",
  image_page: "Página da imagem",
  rights: "Direitos",
  credit_line: "Crédito",
};

function humanize(key: string) {
  return (
    LABELS[key] ??
    key.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase())
  );
}

function valueToText(value: MetadataValue): string | null {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) {
    return value.map(valueToText).filter(Boolean).join(", ");
  }
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

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function collectMetadataUrls(
  value: unknown,
  path: string[] = [],
  results: SourceLink[] = [],
): SourceLink[] {
  if (isHttpUrl(value)) {
    const key = path[path.length - 1] ?? "fonte";
    const normalized = key.toLowerCase();
    const relevant = [
      "source",
      "fonte",
      "origin",
      "origem",
      "url",
      "page",
      "pagina",
      "página",
      "wikidata",
      "commons",
      "museum",
      "institution",
      "collection",
      "object",
      "record",
      "link",
      "provenance",
    ].some((token) => normalized.includes(token));
    if (relevant) results.push({ label: humanize(key), url: value.trim() });
    return results;
  }
  if (Array.isArray(value)) {
    value.forEach((nested, index) =>
      collectMetadataUrls(nested, [...path, String(index + 1)], results),
    );
    return results;
  }
  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) =>
      collectMetadataUrls(nested, [...path, key], results),
    );
  }
  return results;
}

function uniqueSourceLinks(
  sourceUrl: string | null | undefined,
  metadata: unknown,
): SourceLink[] {
  const links: SourceLink[] = [];
  if (sourceUrl) links.push({ label: "Fonte original / ficha institucional", url: sourceUrl });
  links.push(...collectMetadataUrls(metadata));
  const seen = new Set<string>();
  return links.filter((item) => {
    const normalized = item.url.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
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

  if (!data) return <ShellMessage title={t("acervo.empty")} />;

  const { entity, related, bibliography, sameArtistWorks } = data;
  const metadata = (entity.metadata ?? {}) as Record<string, MetadataValue>;

  const coreMetadata: Array<[string, string | null]> = [
    ["Tipo de registro", labelForEntityType(entity.entity_type)],
    ["Autoria / atribuição", entity.subtitle],
    ["Datação", entity.date_display],
    ["Início", entity.date_start != null ? String(entity.date_start) : null],
    ["Fim", entity.date_end != null ? String(entity.date_end) : null],
    [
      "Localização",
      [entity.location, entity.country, entity.continent].filter(Boolean).join(", ") || null,
    ],
    ["Cultura", entity.culture],
    ["Materiais", entity.materials?.join(", ") || null],
    ["Técnicas", entity.techniques?.join(", ") || null],
    ["Cores", entity.colors?.join(", ") || null],
    ["Licença da imagem", entity.image_license],
    ["Imagem aberta", entity.open_image ? "Sim" : "Não"],
    ["Identificador do Atlas", entity.id],
  ];

  const extraMetadata = Object.entries(metadata)
    .map(
      ([key, value]) =>
        [humanize(key), valueToText(value)] as [string, string | null],
    )
    .filter(([, value]) => Boolean(value));

  const tags = Array.from(
    new Set([...(entity.tags ?? []), ...(entity.themes ?? [])]),
  ).filter(Boolean);

  const sourceLinks = uniqueSourceLinks(entity.source_url, metadata);
  const curatorialReferences = getCuratorialReferenceGroups(entity);
  const techniqueTechnologyReferences = getTechniqueTechnologyReferenceGroups(entity);

  return (
    <Shell>
      <Link
        to="/acervo"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("nav.acervo")}
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <ArtworkImage
            title={entity.title}
            imageUrl={entity.image_url}
            sourceUrl={sourceLinks[0]?.url ?? null}
          />

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {entity.image_license && <span>Licença: {entity.image_license}</span>}
            {sourceLinks[0] && (
              <a
                href={sourceLinks[0].url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              >
                Abrir fonte original <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        <div>
          <Badge variant="secondary" className="uppercase tracking-wide">
            {labelForEntityType(entity.entity_type)}
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {entity.title}
          </h1>
          {entity.subtitle && (
            <p className="mt-1 text-lg text-muted-foreground">{entity.subtitle}</p>
          )}
          {entity.description && (
            <p className="mt-5 whitespace-pre-line leading-relaxed text-foreground/90">
              {entity.description}
            </p>
          )}

          {tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  to="/tag/$tag"
                  params={{ tag }}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs transition hover:border-primary hover:text-primary"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {techniqueTechnologyReferences.length > 0 && (
            <div className="mt-8 rounded-xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                <p className="text-eyebrow text-muted-foreground">Técnicas e tecnologias</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Classificação técnico-midiática derivada somente de materiais, técnicas, meios, processos e metadados documentados na ficha.
              </p>
              <div className="mt-4 space-y-4">
                {techniqueTechnologyReferences.map((group) => (
                  <div key={group.category}>
                    <Badge variant="outline" className="font-medium">
                      {group.category}
                    </Badge>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.evidence.map((evidence) => (
                        <span
                          key={`${group.category}-${evidence}`}
                          className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {evidence}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-eyebrow text-muted-foreground">Ficha completa</h2>
            <MetadataList rows={[...coreMetadata, ...extraMetadata]} />
          </div>
        </div>
      </div>

      {sourceLinks.length > 0 && (
        <section className="mt-12 rounded-xl border border-border/60 bg-card p-5 sm:p-6">
          <p className="text-eyebrow text-muted-foreground">Rastreabilidade</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
            Fontes, acervos e páginas de origem
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Estes links vêm da ficha e dos metadados cadastrados. Use a fonte institucional para conferir atribuição, datação, licença e proveniência.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {sourceLinks.map((source) => (
              <a
                key={`${source.label}-${source.url}`}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background p-4 text-sm transition hover:border-primary/60"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{source.label}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {source.url}
                  </span>
                </span>
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              </a>
            ))}
          </div>
        </section>
      )}

      {sameArtistWorks.length > 0 && (
        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-eyebrow text-muted-foreground">Constelação autoral</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
                {entity.entity_type.toLowerCase() === "artista"
                  ? `Obras de ${entity.title}`
                  : "Mais obras do mesmo artista"}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {sameArtistWorks.length}{" "}
              {sameArtistWorks.length === 1 ? "registro" : "registros"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sameArtistWorks.map((work) => (
              <article
                key={work.id}
                className="group overflow-hidden rounded-xl border border-border/60 bg-card"
              >
                <Link to="/acervo/$id" params={{ id: work.id }} className="block">
                  <div className="aspect-[4/3] overflow-hidden bg-secondary">
                    {work.image_url ? (
                      <img
                        src={work.image_url}
                        alt={work.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <Placeholder title={work.title} />
                    )}
                  </div>
                  <div className="p-4">
                    <Badge variant="secondary" className="text-[0.65rem] uppercase">
                      {labelForEntityType(work.entity_type)}
                    </Badge>
                    <h3 className="mt-2 font-display text-lg leading-tight text-foreground">
                      {work.title}
                    </h3>
                    {work.subtitle && (
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {work.subtitle}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {[work.date_display, work.country, work.culture]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

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
            {related.map((relation) => (
              <li key={relation.relationId}>
                <Link
                  to="/acervo/$id"
                  params={{ id: relation.entity?.id ?? "" }}
                  disabled={!relation.entity}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <ArrowRight
                    className={`mt-1 h-4 w-4 shrink-0 text-primary ${
                      relation.direction === "in" ? "rotate-180" : ""
                    }`}
                  />
                  <div className="min-w-0">
                    <Badge variant="outline" className="text-[0.65rem]">
                      {labelForRelationType(relation.relationType)}
                    </Badge>
                    <p className="mt-1 font-display text-lg text-foreground">
                      {relation.entity?.title ?? "—"}
                    </p>
                    {relation.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {relation.description}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <p className="text-eyebrow text-muted-foreground">Bibliografia cadastrada</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
            Referências vinculadas diretamente à ficha
          </h2>
          {bibliography.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Ainda não há referências específicas cadastradas para esta entidade.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {bibliography.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border/60 bg-card p-4"
                >
                  <p className="font-display text-base text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[item.authors, item.year].filter(Boolean).join(" · ")}
                  </p>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Abrir referência <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-eyebrow text-muted-foreground">Leituras de contexto</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
            História da arte e perspectivas curatoriais
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A seleção abaixo parte exclusivamente das tags e dos metadados já cadastrados. Ela oferece caminhos de leitura e não atribui identidade, pertencimento ou posição política ao artista pela aparência da imagem.
          </p>

          <div className="mt-5 space-y-5">
            {curatorialReferences.map((group) => (
              <div key={group.category}>
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{group.category}</h3>
                </div>
                <ul className="space-y-2">
                  {group.references.map((reference) => (
                    <li
                      key={reference.id}
                      className="rounded-lg border border-border/60 bg-card p-4"
                    >
                      <p className="text-sm leading-relaxed text-foreground">
                        {reference.citation}
                      </p>
                      <a
                        href={referenceSearchUrl(reference)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                      >
                        Localizar referência <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {techniqueTechnologyReferences.length > 0 && (
        <section className="mt-14 rounded-xl border border-border/60 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <div>
              <p className="text-eyebrow text-muted-foreground">Leituras técnico-midiáticas</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
                Técnicas, meios e tecnologias relacionadas
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted-foreground">
            Estas referências são acionadas por técnicas, materiais e tecnologias já documentados no Atlas — como fotografia, vídeo, webarte, arte digital, pintura a óleo, têxtil, impressão, instalação, interfaces, IA ou arte sonora. Elas contextualizam os meios de produção sem substituir a fonte primária da obra.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {techniqueTechnologyReferences.map((group) => (
              <div key={group.category} className="rounded-lg border border-border/60 bg-background p-4">
                <h3 className="font-display text-lg text-foreground">{group.category}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Evidências na ficha: {group.evidence.join(" · ")}
                </p>
                <ul className="mt-4 space-y-3">
                  {group.references.map((reference) => (
                    <li key={reference.id} className="border-t border-border/50 pt-3 first:border-t-0 first:pt-0">
                      <p className="text-sm leading-relaxed text-foreground">
                        {reference.citation}
                      </p>
                      <a
                        href={techniqueReferenceSearchUrl(reference)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                      >
                        Localizar referência <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/rede" search={{ focus: entity.id }}>
            Ver na rede
          </Link>
        </Button>
        {sourceLinks[0] && (
          <Button asChild variant="outline">
            <a href={sourceLinks[0].url} target="_blank" rel="noreferrer">
              Fonte original <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/atlas">Adicionar a um Atlas</Link>
        </Button>
      </div>
    </Shell>
  );
}

function MetadataList({ rows }: { rows: Array<[string, string | null]> }) {
  const visible = rows.filter(([, value]) => Boolean(value));
  const seen = new Set<string>();
  const unique = visible.filter(([label, value]) => {
    const key = `${label.trim().toLowerCase()}|${String(value).trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <dl className="mt-3 divide-y divide-border/60">
      {unique.map(([label, value], index) => (
        <div
          key={`${label}-${index}`}
          className="grid grid-cols-3 gap-3 py-2.5 text-sm"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="col-span-2 break-words text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ArtworkImage({
  title,
  imageUrl,
  sourceUrl,
}: {
  title: string;
  imageUrl: string | null;
  sourceUrl: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const image = imageUrl && !failed ? (
    <img
      src={imageUrl}
      alt={title}
      className="w-full object-cover"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="flex aspect-[4/5] flex-col items-center justify-center gap-3 bg-secondary px-6 text-center">
      <ImageOff className="h-8 w-8 text-muted-foreground/50" />
      <span className="text-sm text-muted-foreground">Imagem indisponível na fonte</span>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-muted">
      {sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noreferrer" title="Abrir fonte original">
          {image}
        </a>
      ) : (
        image
      )}
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-44 items-center justify-center bg-secondary">
      <span className="font-display text-5xl text-muted-foreground/40">
        {title.charAt(0)}
      </span>
    </div>
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
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/acervo">
            <ArrowLeft className="h-4 w-4" /> Voltar ao acervo
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
        <h1 className="font-display text-2xl font-semibold">
          Não foi possível carregar esta ficha.
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
