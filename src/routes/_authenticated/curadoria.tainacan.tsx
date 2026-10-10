import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Database, ExternalLink, Loader2, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  listTainacanCurationQueue,
  searchTainacanBrazil,
  TAINACAN_SOURCES,
} from "@/lib/data/tainacan.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ExternalArtworkCard } from "@/components/ExternalArtworkCard";
import { CuratorialEntityEditor } from "@/components/CuratorialEntityEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/curadoria/tainacan")({
  component: CuradoriaTainacan,
});

function parseMetadata(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function CuradoriaTainacan() {
  const { isReviewer, loading } = useAuth();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");

  const queue = useQuery({
    queryKey: ["curadoria-tainacan"],
    queryFn: () => listTainacanCurationQueue(),
    enabled: isReviewer,
  });

  const search = useMutation({
    mutationFn: (query: string) => searchTainacanBrazil({ data: { query, limit: 32 } }),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["curadoria-tainacan"] }),
      queryClient.invalidateQueries({ queryKey: ["acervo"] }),
      queryClient.invalidateQueries({ queryKey: ["acervo-page"] }),
      queryClient.invalidateQueries({ queryKey: ["featured-entities"] }),
      queryClient.invalidateQueries({ queryKey: ["atlas-entity-search"] }),
    ]);
  };

  if (loading) return <Shell><Skeleton className="h-56 w-full" /></Shell>;
  if (!isReviewer) return <Restricted />;

  const rows = queue.data ?? [];
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const publishedCount = rows.filter((row) => row.status === "published").length;

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-primary">Interoperabilidade brasileira</p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">Tainacan · busca e curadoria</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Consulte acervos brasileiros que expõem a API Tainacan, envie itens para uma fila de revisão e só então decida o que entra no acervo público. A origem, coleção, item e endpoint da API permanecem registrados na ficha.
          </p>
        </div>
        <Button asChild variant="outline"><Link to="/curadoria">Voltar à Curadoria</Link></Button>
      </div>

      <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-5 w-5 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl font-semibold">APIs Tainacan ativas na busca</h2>
                <p className="mt-1 text-sm text-muted-foreground">A API fica visível: cada instituição abaixo abre diretamente o endpoint consultado pelo Constelações.</p>
              </div>
              <Badge variant="secondary">{TAINACAN_SOURCES.length} fontes</Badge>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TAINACAN_SOURCES.map((source) => (
                <a
                  key={source.key}
                  href={`${source.baseUrl.replace(/\/+$/, "")}/wp-json/tainacan/v2/items`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border/60 p-3 transition hover:border-primary/50 hover:bg-muted/30"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">{source.name}<ExternalLink className="h-3.5 w-3.5" /></span>
                  <span className="mt-1 block text-xs text-muted-foreground">{source.region} · {source.focus}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-eyebrow text-muted-foreground">Descoberta externa</p>
            <h2 className="font-display text-2xl font-semibold">Buscar artistas, obras e objetos</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pesquise por artista, título, técnica, assunto ou palavra-chave. Nada é publicado automaticamente.</p>
          </div>
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const query = searchText.trim();
            if (query.length >= 2) search.mutate(query);
          }}
        >
          <Input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Ex.: Vera Chaves Barcellos, fotografia, performance…" minLength={2} />
          <Button type="submit" disabled={search.isPending || searchText.trim().length < 2}>
            {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="hidden sm:inline">Buscar</span>
          </Button>
        </form>

        {search.isPending ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-[4/5] rounded-lg" />)}</div>
        ) : search.data ? (
          <>
            {search.data.results.length ? (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {search.data.results.map((artwork) => <ExternalArtworkCard key={artwork.id} artwork={artwork} />)}
              </div>
            ) : (
              <p className="mt-6 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Nenhum resultado retornado pelas fontes disponíveis para esta busca.</p>
            )}
            {search.data.errors.length ? (
              <details className="mt-4 rounded-xl border border-border/60 p-4 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium">Fontes temporariamente indisponíveis ({search.data.errors.length})</summary>
                <ul className="mt-2 space-y-1">{search.data.errors.map((error) => <li key={error}>{error}</li>)}</ul>
              </details>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-eyebrow text-muted-foreground">Registros incorporados</p>
            <h2 className="font-display text-2xl font-semibold">Fila Tainacan</h2>
            <p className="mt-1 text-sm text-muted-foreground">{reviewCount} em revisão · {publishedCount} publicados · {rows.length} registros Tainacan no total.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => queue.refetch()} disabled={queue.isFetching}>Atualizar fila</Button>
        </div>

        {queue.isLoading ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-44 rounded-xl" />)}</div>
        ) : queue.isError ? (
          <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{queue.error instanceof Error ? queue.error.message : "Não foi possível carregar a fila."}</p>
        ) : rows.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {rows.map((row) => {
              const metadata = parseMetadata(row.metadata);
              const repository = typeof metadata.source_repository === "string" ? metadata.source_repository : "Tainacan";
              const collection = typeof metadata.tainacan_collection_name === "string" ? metadata.tainacan_collection_name : null;
              const apiUrl = typeof metadata.tainacan_api_url === "string" ? metadata.tainacan_api_url : null;
              return (
                <article key={String(row.id)} className="flex gap-4 rounded-xl border bg-card p-4">
                  <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {row.image_url ? <img src={String(row.image_url)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">sem imagem</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={row.status === "published" ? "default" : row.status === "archived" ? "outline" : "secondary"}>{statusLabel(String(row.status))}</Badge>
                      <Badge variant="outline">{String(row.entity_type ?? "obra")}</Badge>
                    </div>
                    <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold">{String(row.title ?? "Sem título")}</h3>
                    {row.subtitle ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{String(row.subtitle)}</p> : null}
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{repository}{collection ? ` · ${collection}` : ""}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CuratorialEntityEditor entityId={String(row.id)} onSaved={() => void refresh()} />
                      {row.source_url ? <Button asChild size="sm" variant="ghost"><a href={String(row.source_url)} target="_blank" rel="noreferrer">Fonte <ExternalLink className="ml-1 h-3.5 w-3.5" /></a></Button> : null}
                      {apiUrl ? <Button asChild size="sm" variant="ghost"><a href={apiUrl} target="_blank" rel="noreferrer">API</a></Button> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">A fila ainda está vazia. Faça uma busca acima e use “Enviar à curadoria” em um item Tainacan.</p>
        )}
      </section>
    </Shell>
  );
}

function statusLabel(status: string) {
  if (status === "published") return "Publicado";
  if (status === "archived") return "Arquivado";
  if (status === "draft") return "Rascunho";
  return "Em revisão";
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main><SiteFooter /></div>;
}

function Restricted() {
  return (
    <Shell>
      <div className="rounded-2xl border bg-card p-10 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">A busca com ingestão e a fila Tainacan são exclusivas da curadoria.</p>
        <Button asChild className="mt-6"><Link to="/">Voltar</Link></Button>
      </div>
    </Shell>
  );
}
