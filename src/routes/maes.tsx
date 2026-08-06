import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { listArtistasMaes, type ArtistaMae } from "@/lib/data/maes.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/maes")({
  head: () => ({
    meta: [
      { title: "Artistas mães · Atlas Planetário da Cultura Visual" },
      {
        name: "description",
        content:
          "Dossiê planetário de mulheres artistas atravessadas pela maternidade — vivida, recusada, impossível ou simbólica — do século XVI ao presente.",
      },
      { property: "og:title", content: "Artistas mães · Atlas Planetário" },
      {
        property: "og:description",
        content:
          "Mulheres artistas e a maternidade como condição material e matéria de obra, em cinco continentes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaesPage,
});

const SECULOS = [
  { label: "séc. XVI–XVII", from: -9999, to: 1699 },
  { label: "séc. XVIII", from: 1700, to: 1799 },
  { label: "séc. XIX", from: 1800, to: 1889 },
  { label: "modernas", from: 1890, to: 1929 },
  { label: "contemporâneas", from: 1930, to: 9999 },
] as const;

function MaeCard({ a }: { a: ArtistaMae }) {
  return (
    <Link
      to="/acervo/$id"
      params={{ id: a.id }}
      className="group flex gap-4 rounded-lg border border-border/60 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg"
    >
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded bg-muted sm:h-28 sm:w-24">
        {a.image_url ? (
          <img
            src={a.image_url}
            alt={`Retrato de ${a.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="font-display text-3xl text-muted-foreground/40">
              {a.title.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-lg leading-tight text-foreground">{a.title}</h3>
        <p className="mt-0.5 text-eyebrow text-muted-foreground">
          {[a.date_display, a.country].filter(Boolean).join(" · ")}
        </p>
        {a.filhos && (
          <Badge variant="secondary" className="mt-2 whitespace-normal text-left text-[0.7rem]">
            {a.filhos}
          </Badge>
        )}
        {a.nota && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {a.nota}
          </p>
        )}
      </div>
    </Link>
  );
}

const PAGE = 48;

function MaesPage() {
  const [q, setQ] = useState("");
  const [continente, setContinente] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [limite, setLimite] = useState(PAGE);

  const { data, isLoading } = useQuery({
    queryKey: ["artistas-maes"],
    queryFn: () => listArtistasMaes(),
    refetchInterval: 60_000,
  });

  const continentes = useMemo(
    () => Array.from(new Set((data ?? []).map((a) => a.continent).filter(Boolean) as string[])).sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const faixa = SECULOS.find((s) => s.label === periodo);
    return (data ?? []).filter((a) => {
      if (continente && a.continent !== continente) return false;
      if (faixa) {
        const y = a.date_start ?? 0;
        if (y < faixa.from || y > faixa.to) return false;
      }
      if (!term) return true;
      return [a.title, a.country, a.culture, a.nota, a.filhos]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [data, q, continente, periodo]);

  const visiveis = filtered.slice(0, limite);


  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs transition-colors",
      active
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border/60 text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
            <p className="text-eyebrow text-primary">Dossiê planetário</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-foreground sm:text-5xl">
              Artistas mães
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              A história da arte quase nunca pergunta quem cuidava das crianças enquanto a obra era
              feita. Este dossiê reúne mulheres artistas em cinco continentes e trata a maternidade —
              vivida, recusada, impossível, coletiva ou simbólica — como condição material do
              trabalho e como matéria da própria obra: do ateliê de onze filhos de Lavinia Fontana às
              genealogias negras costuradas por Rosana Paulino e ao awelye transmitido entre mulheres
              anmatyerre.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {isLoading ? "carregando…" : `${data?.length ?? 0} artistas no dossiê`}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimite(PAGE);
              }}
              placeholder="Buscar por nome, país, cultura ou tema"
              className="pl-9"
              aria-label="Buscar artistas mães"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={chip(!periodo)}
              onClick={() => {
                setPeriodo(null);
                setLimite(PAGE);
              }}
            >
              todos os períodos
            </button>
            {SECULOS.map((s) => (
              <button
                key={s.label}
                type="button"
                className={chip(periodo === s.label)}
                onClick={() => {
                  setPeriodo(periodo === s.label ? null : s.label);
                  setLimite(PAGE);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={chip(!continente)}
              onClick={() => {
                setContinente(null);
                setLimite(PAGE);
              }}
            >
              todo o planeta
            </button>
            {continentes.map((c) => (
              <button
                key={c}
                type="button"
                className={chip(continente === c)}
                onClick={() => {
                  setContinente(continente === c ? null : c);
                  setLimite(PAGE);
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {!isLoading && filtered.length > 0 && (
            <p className="mt-4 text-eyebrow text-muted-foreground">
              {filtered.length} artistas · exibindo {visiveis.length}
            </p>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 w-full rounded-lg" />
                ))
              : visiveis.map((a) => <MaeCard key={a.id} a={a} />)}
          </div>

          {!isLoading && filtered.length > visiveis.length && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setLimite((n) => n + PAGE)}
                className="rounded-full border border-border/60 px-5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
              >
                carregar mais
              </button>
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">
              Nenhuma artista encontrada com esses filtros.
            </p>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
