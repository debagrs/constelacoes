import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Save, Trash2, Plus, StickyNote } from "lucide-react";
import {
  getAtlas,
  saveAtlas,
  deleteAtlas as deleteAtlasFn,
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
  title: string | null;
  body: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
}

function AtlasEditor() {
  const { atlasId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: atlasData, isLoading } = useQuery({
    queryKey: ["atlas", atlasId],
    queryFn: () => getAtlas({ data: { atlasId } }),
    // Sem realtime no Turso: revalida ao focar a aba.
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

  useEffect(() => {
    if (atlas) {
      setTitle(atlas.title ?? "");
      setDescription(atlas.description ?? "");
    }
  }, [atlas]);

  useEffect(() => {
    if (cardsData) setCards(cardsData);
  }, [cardsData]);

  const markDirty = () => setDirty(true);

  const deletedIdsRef = useRef<string[]>([]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const deletedCardIds = deletedIdsRef.current;
      deletedIdsRef.current = [];
      await saveAtlas({
        data: {
          atlasId,
          title,
          description,
          deletedCardIds,
          cards: cards.map((c) => ({
            id: c.id,
            card_type: c.card_type,
            title: c.title,
            body: c.body,
            x: c.x,
            y: c.y,
            width: c.width,
            height: c.height,
            rotation: c.rotation ?? 0,
            z_index: c.z_index ?? 0,
          })),
        },
      });
    },
    onSuccess: () => {
      setDirty(false);
      setLastSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ["my-atlases"] });
    },
    onError: (e: Error) => toast.error(`Falha ao salvar: ${e.message}`),
  });

  // Autosave (debounced) — persistence permanent
  const saveRef = useRef(saveMutation);
  saveRef.current = saveMutation;
  useEffect(() => {
    if (!dirty || !atlas) return;
    const t = setTimeout(() => {
      if (!saveRef.current.isPending) saveRef.current.mutate();
    }, 1200);
    return () => clearTimeout(t);
  }, [dirty, atlas, title, description, cards]);


  const deleteMutation = useMutation({
    mutationFn: async () => {
      await deleteAtlasFn({ data: { atlasId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-atlases"] });
      navigate({ to: "/atlas" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addTextCard = () => {
    const card: CardRow = {
      id: crypto.randomUUID(),
      atlas_id: atlasId,
      card_type: "text",
      title: "Nova nota",
      body: "",
      x: 40 + cards.length * 24,
      y: 40 + cards.length * 24,
      width: 220,
      height: 160,
      rotation: 0,
      z_index: cards.length + 1,
    };
    setCards((prev) => [...prev, card]);
    setSelectedId(card.id);
    setDirty(true);
  };

  const removeCard = (id: string) => {
    deletedIdsRef.current = [...deletedIdsRef.current, id];
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
    setDirty(true);
  };

  const updateCard = (id: string, patch: Partial<CardRow>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    markDirty();
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
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
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                className="mt-2 font-display text-2xl"
                placeholder="Título do Atlas"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</label>
              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  markDirty();
                }}
                className="mt-2 min-h-24"
                placeholder="Descreva o argumento visual deste Atlas…"
              />
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Mural</h2>
              <Button size="sm" variant="outline" onClick={addTextCard}>
                <Plus className="h-4 w-4" />
                Nota
              </Button>
            </div>

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
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !dirty}>
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

  const onPointerDown = (e: React.PointerEvent, card: CardRow) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    const rect = boardRef.current!.getBoundingClientRect();
    dragRef.current = {
      id: card.id,
      offX: e.clientX - rect.left - card.x,
      offY: e.clientY - rect.top - card.y,
    };
    onSelect(card.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const rect = boardRef.current!.getBoundingClientRect();
      const x = Math.max(0, e.clientX - rect.left - d.offX);
      const y = Math.max(0, e.clientY - rect.top - d.offY);
      onChange(d.id, { x, y });
    },
    [onChange],
  );

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      ref={boardRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
      className="relative h-[520px] w-full overflow-hidden rounded-lg border border-border/60 bg-muted/20"
    >
      {cards.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <StickyNote className="h-6 w-6" />
          <p className="text-sm">Adicione uma nota para começar seu argumento visual.</p>
        </div>
      )}
      {cards.map((c) => {
        const selected = c.id === selectedId;
        return (
          <div
            key={c.id}
            onPointerDown={(e) => onPointerDown(e, c)}
            style={{
              left: c.x,
              top: c.y,
              width: c.width,
              height: c.height,
              transform: `rotate(${c.rotation}deg)`,
              zIndex: c.z_index,
            }}
            className={`absolute cursor-grab rounded-md border bg-card p-3 shadow-sm transition-colors active:cursor-grabbing ${
              selected ? "border-accent ring-1 ring-accent" : "border-border/60"
            }`}
          >
            <Input
              data-no-drag
              value={c.title ?? ""}
              onChange={(e) => onChange(c.id, { title: e.target.value })}
              className="mb-2 h-7 border-0 bg-transparent p-0 text-sm font-medium focus-visible:ring-0"
              placeholder="Título"
            />
            <Textarea
              data-no-drag
              value={c.body ?? ""}
              onChange={(e) => onChange(c.id, { body: e.target.value })}
              className="h-[calc(100%-2.75rem)] resize-none border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
              placeholder="Anotação…"
            />
            {selected && (
              <button
                data-no-drag
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Remover esta nota?")) onRemove(c.id);
                }}
                className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-1 text-muted-foreground hover:text-destructive"
                aria-label="Remover"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
