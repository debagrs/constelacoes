import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import {
  deleteAtlas as deleteAtlasFn,
  getAtlas,
  saveAtlas,
  searchAtlasEntities,
} from "@/lib/data/atlas.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/atlas/$atlasId")({
  component: AtlasEditor,
});

interface CardRow {
  id: string;
  atlas_id: string;
  card_type: string;
  entity_id: string | null;
  title: string | null;
  body: string | null;
  media_url: string | null;
  link_url: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
}

interface SearchEntity {
  id: string;
  title: string;
  subtitle: string | null;
  entity_type: string;
  image_url: string;
  date_display: string | null;
  continent: string | null;
  country: string | null;
  culture: string | null;
  source_url: string | null;
  image_license: string | null;
  metadata: string;
}

function AtlasEditor() {
  const { atlasId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: atlasData, isLoading } = useQuery({
    queryKey: ["atlas", atlasId],
    queryFn: () => getAtlas({ data: { atlasId } }),
    refetchOnWindowFocus: true,
  });

  const atlas = atlasData?.atlas ?? null;
  const cardsData = atlasData?.cards;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cards, setCards] = useState<CardRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (atlas) {
      setTitle(atlas.title ?? "");
      setDescription(atlas.description ?? "");
    }
  }, [atlas]);

  useEffect(() => {
    if (cardsData) setCards(cardsData as CardRow[]);
  }, [cardsData]);

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["atlas-entity-search", searchTerm],
    queryFn: () => searchAtlasEntities({ data: { query: searchTerm } }),
    enabled: showLibrary,
    staleTime: 30_000,
  });

  const deletedIdsRef = useRef<string[]>([]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const deletedCardIds = [...deletedIdsRef.current];
      return await saveAtlas({
        data: {
          atlasId,
          title,
          description,
          deletedCardIds,
          cards: cards.map((card) => ({
            id: card.id,
            card_type: card.card_type,
            entity_id: card.entity_id,
            title: card.title,
            body: card.body,
            media_url: card.media_url,
            link_url: card.link_url,
            x: card.x,
            y: card.y,
            width: card.width,
            height: card.height,
            rotation: card.rotation ?? 0,
            z_index: card.z_index ?? 0,
          })),
        },
      });
    },
    onSuccess: async (result) => {
      deletedIdsRef.current = [];
      setDirty(false);
      setLastSavedAt(new Date(result.savedAt));
      toast.success(`Atlas salvo com ${result.totalCards} ${result.totalCards === 1 ? "cartão" : "cartões"}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-atlases"] }),
        queryClient.invalidateQueries({ queryKey: ["atlas", atlasId] }),
      ]);
    },
    onError: (error: Error) => toast.error(`Falha ao salvar: ${error.message}`),
  });

  const saveRef = useRef(saveMutation);
  saveRef.current = saveMutation;
  useEffect(() => {
    if (!dirty || !atlas) return;
    const timer = setTimeout(() => {
      if (!saveRef.current.isPending) saveRef.current.mutate();
    }, 1200);
    return () => clearTimeout(timer);
  }, [dirty, atlas, title, description, cards]);

  const deleteMutation = useMutation({
    mutationFn: async () => deleteAtlasFn({ data: { atlasId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-atlases"] });
      navigate({ to: "/atlas" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const nextPosition = () => {
    const index = cards.length;
    return {
      x: 40 + (index % 5) * 42,
      y: 40 + (index % 7) * 38,
      z_index: index + 1,
    };
  };

  const addTextCard = () => {
    const position = nextPosition();
    const card: CardRow = {
      id: crypto.randomUUID(),
      atlas_id: atlasId,
      card_type: "text",
      entity_id: null,
      title: "Nova nota",
      body: "",
      media_url: null,
      link_url: null,
      x: position.x,
      y: position.y,
      width: 240,
      height: 180,
      rotation: 0,
      z_index: position.z_index,
    };
    setCards((previous) => [...previous, card]);
    setSelectedId(card.id);
    setDirty(true);
  };

  const addEntityCard = (entity: SearchEntity) => {
    const alreadyAdded = cards.some(
      (card) => card.entity_id === entity.id || card.media_url === entity.image_url,
    );
    if (alreadyAdded) {
      toast.info("Esta imagem já está neste Atlas.");
      return;
    }

    const position = nextPosition();
    const card: CardRow = {
      id: crypto.randomUUID(),
      atlas_id: atlasId,
      card_type: "entity",
      entity_id: entity.id,
      title: entity.title,
      body: [
        entity.subtitle,
        entity.date_display,
        entity.culture,
        entity.country ?? entity.continent,
        entity.image_license,
      ]
        .filter(Boolean)
        .join(" · "),
      media_url: entity.image_url,
      link_url: entity.source_url ?? `/acervo/${entity.id}`,
      x: position.x,
      y: position.y,
      width: 280,
      height: 390,
      rotation: 0,
      z_index: position.z_index,
    };
    setCards((previous) => [...previous, card]);
    setSelectedId(card.id);
    setDirty(true);
    toast.success("Imagem adicionada ao Atlas.");
  };

  const removeCard = (id: string) => {
    deletedIdsRef.current = [...deletedIdsRef.current, id];
    setCards((previous) => previous.filter((card) => card.id !== id));
    if (selectedId === id) setSelectedId(null);
    setDirty(true);
  };

  const updateCard = (id: string, patch: Partial<CardRow>) => {
    setCards((previous) =>
      previous.map((card) => (card.id === id ? { ...card, ...patch } : card)),
    );
    setDirty(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/atlas">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {saveMutation.isPending ? (
              <span className="text-xs text-muted-foreground">salvando…</span>
            ) : dirty ? (
              <span className="text-xs text-muted-foreground">alterações não salvas</span>
            ) : lastSavedAt ? (
              <span className="text-xs text-muted-foreground">
                salvo {lastSavedAt.toLocaleTimeString()}
              </span>
            ) : null}
            {atlas && (
              <Badge variant="secondary" className="text-[0.65rem] uppercase">
                {atlas.status}
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !atlas ? (
          <div className="mt-16 rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-muted-foreground">Atlas não encontrado.</p>
            <Button asChild className="mt-6" variant="outline">
              <Link to="/atlas">Voltar para meus Atlas</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Título</label>
              <Input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setDirty(true);
                }}
                className="mt-2 font-display text-2xl"
                placeholder="Título do Atlas"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</label>
              <Textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setDirty(true);
                }}
                className="mt-2 min-h-24"
                placeholder="Descreva o argumento visual deste Atlas…"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Mural visual</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Arraste imagens e notas livremente, como uma prancha do Atlas Mnemosyne.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={addTextCard}>
                  <StickyNote className="h-4 w-4" />
                  Nota
                </Button>
                <Button size="sm" onClick={() => setShowLibrary((value) => !value)}>
                  <ImagePlus className="h-4 w-4" />
                  {showLibrary ? "Fechar imagens" : "Adicionar imagens"}
                </Button>
              </div>
            </div>

            {showLibrary && (
              <section className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="pl-9"
                      placeholder="Busque artista, obra, território, tema ou cultura…"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {searching ? "buscando…" : `${searchResults.length} imagens`}
                  </span>
                </div>

                <div className="mt-4 grid max-h-[520px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                  {searchResults.map((entity) => {
                    const alreadyAdded = cards.some(
                      (card) =>
                        card.entity_id === entity.id || card.media_url === entity.image_url,
                    );
                    return (
                      <button
                        type="button"
                        key={entity.id}
                        onClick={() => addEntityCard(entity)}
                        disabled={alreadyAdded}
                        className="group overflow-hidden rounded-lg border border-border/60 bg-background text-left transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <div className="aspect-[4/5] overflow-hidden bg-muted">
                          <img
                            src={entity.image_url}
                            alt={entity.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-2">
                          <p className="line-clamp-2 text-xs font-medium">{entity.title}</p>
                          <p className="mt-1 text-[0.65rem] text-muted-foreground">
                            {alreadyAdded ? "Já está no Atlas" : "Adicionar ao mural"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <Mural
              cards={cards}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={updateCard}
              onRemove={removeCard}
            />

            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Excluir este Atlas?")) deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !atlas}
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Mural({
  cards,
  selectedId,
  onSelect,
  onChange,
  onRemove,
}: {
  cards: CardRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<CardRow>) => void;
  onRemove: (id: string) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null);

  const onPointerDown = (event: React.PointerEvent, card: CardRow) => {
    if ((event.target as HTMLElement).closest("[data-no-drag]")) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      id: card.id,
      offX: event.clientX - rect.left - card.x,
      offY: event.clientY - rect.top - card.y,
    };
    onSelect(card.id);
    onChange(card.id, {
      z_index: Math.max(...cards.map((item) => item.z_index), 0) + 1,
    });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const dragging = dragRef.current;
      const rect = boardRef.current?.getBoundingClientRect();
      if (!dragging || !rect) return;
      const card = cards.find((item) => item.id === dragging.id);
      if (!card) return;
      const x = Math.max(0, Math.min(1600 - card.width, event.clientX - rect.left - dragging.offX));
      const y = Math.max(0, Math.min(1050 - card.height, event.clientY - rect.top - dragging.offY));
      onChange(dragging.id, { x, y });
    },
    [cards, onChange],
  );

  const stopDragging = () => {
    dragRef.current = null;
  };

  return (
    <div className="overflow-auto rounded-xl border border-border/60 bg-muted/10">
      <div
        ref={boardRef}
        onPointerMove={onPointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onClick={(event) => {
          if (event.target === event.currentTarget) onSelect(null);
        }}
        className="relative h-[1050px] w-[1600px] min-w-full bg-[radial-gradient(circle_at_center,hsl(var(--border)/0.35)_1px,transparent_1px)] [background-size:28px_28px]"
      >
        {cards.length === 0 && (
          <div className="pointer-events-none absolute left-1/2 top-40 flex -translate-x-1/2 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
            <p className="max-w-sm text-sm">
              Adicione imagens do acervo e notas para começar sua constelação visual.
            </p>
          </div>
        )}

        {cards.map((card) => {
          const selected = card.id === selectedId;
          const isImage = card.card_type === "entity" && Boolean(card.media_url);

          return (
            <article
              key={card.id}
              onPointerDown={(event) => onPointerDown(event, card)}
              style={{
                left: card.x,
                top: card.y,
                width: card.width,
                height: card.height,
                transform: `rotate(${card.rotation}deg)`,
                zIndex: card.z_index,
                touchAction: "none",
              }}
              className={`absolute cursor-grab overflow-visible rounded-md border bg-card shadow-md active:cursor-grabbing ${
                selected ? "border-primary ring-2 ring-primary/30" : "border-border/60"
              }`}
            >
              {isImage ? (
                <div className="flex h-full flex-col overflow-hidden rounded-md">
                  <div className="min-h-0 flex-1 bg-muted">
                    <img
                      src={card.media_url ?? ""}
                      alt={card.title ?? "Imagem do Atlas"}
                      draggable={false}
                      className="h-full w-full select-none object-contain"
                    />
                  </div>
                  <div className="shrink-0 border-t border-border/60 bg-card p-3">
                    <Input
                      data-no-drag
                      value={card.title ?? ""}
                      onChange={(event) => onChange(card.id, { title: event.target.value })}
                      className="h-7 border-0 bg-transparent p-0 font-display text-sm focus-visible:ring-0"
                      placeholder="Título"
                    />
                    <Textarea
                      data-no-drag
                      value={card.body ?? ""}
                      onChange={(event) => onChange(card.id, { body: event.target.value })}
                      className="mt-1 h-12 resize-none border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                      placeholder="Nota curatorial…"
                    />
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {card.entity_id && (
                        <Link
                          data-no-drag
                          to="/acervo/$id"
                          params={{ id: card.entity_id }}
                          className="inline-block text-[0.65rem] text-primary underline-offset-2 hover:underline"
                        >
                          Abrir ficha completa
                        </Link>
                      )}
                      {card.link_url && /^https?:\/\//i.test(card.link_url) && (
                        <a
                          data-no-drag
                          href={card.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-[0.65rem] text-primary underline-offset-2 hover:underline"
                        >
                          Fonte original ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full p-3">
                  <Input
                    data-no-drag
                    value={card.title ?? ""}
                    onChange={(event) => onChange(card.id, { title: event.target.value })}
                    className="mb-2 h-7 border-0 bg-transparent p-0 font-display text-sm font-medium focus-visible:ring-0"
                    placeholder="Título"
                  />
                  <Textarea
                    data-no-drag
                    value={card.body ?? ""}
                    onChange={(event) => onChange(card.id, { body: event.target.value })}
                    className="h-[calc(100%-2.25rem)] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                    placeholder="Anotação…"
                  />
                </div>
              )}

              {selected && (
                <div
                  data-no-drag
                  className="absolute -top-11 left-0 flex items-center gap-1 rounded-md border border-border bg-background p-1 shadow-lg"
                >
                  <button
                    type="button"
                    title="Diminuir"
                    onClick={() =>
                      onChange(card.id, {
                        width: Math.max(180, card.width - 30),
                        height: Math.max(150, card.height - 30),
                      })
                    }
                    className="rounded p-1.5 hover:bg-muted"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Aumentar"
                    onClick={() =>
                      onChange(card.id, {
                        width: Math.min(620, card.width + 30),
                        height: Math.min(760, card.height + 30),
                      })
                    }
                    className="rounded p-1.5 hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Girar à esquerda"
                    onClick={() => onChange(card.id, { rotation: card.rotation - 2 })}
                    className="rounded p-1.5 hover:bg-muted"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Girar à direita"
                    onClick={() => onChange(card.id, { rotation: card.rotation + 2 })}
                    className="rounded p-1.5 hover:bg-muted"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Remover"
                    onClick={() => {
                      if (confirm("Remover este cartão do Atlas?")) onRemove(card.id);
                    }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
