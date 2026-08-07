import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { labelForEntityType, labelForRelationType } from "@/lib/constants";

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  title: string;
  entity_type: string;
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  id: string;
  relation_type: string;
  source: string | GraphNode;
  target: string | GraphNode;
  description?: string | null;
  confidence?: number | null;
  provenance?: "registered" | "suggested";
  evidence?: string[];
}

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  focusId?: string | null;
  activeRelationTypes: Set<string>;
  onSelect?: (node: GraphNode) => void;
  height?: number;
}

/** Distinct hues for each relation type — palette-friendly with OKLCH accents. */
const RELATION_COLOR: Record<string, string> = {
  influencia: "oklch(0.72 0.15 45)",
  reacao: "oklch(0.72 0.15 15)",
  apropriacao: "oklch(0.72 0.15 90)",
  continuidade: "oklch(0.72 0.13 145)",
  ruptura: "oklch(0.68 0.18 25)",
  sobrevivencia: "oklch(0.75 0.14 195)",
  gesto: "oklch(0.72 0.13 300)",
  cor: "oklch(0.75 0.15 340)",
  material: "oklch(0.7 0.1 60)",
  ritual: "oklch(0.72 0.13 260)",
  tecnologia: "oklch(0.72 0.14 220)",
  politica: "oklch(0.68 0.16 10)",
  ecologia: "oklch(0.72 0.14 160)",
  colonialidade: "oklch(0.68 0.15 30)",
  cosmologia: "oklch(0.72 0.14 280)",
};

export function relationColor(type: string): string {
  return RELATION_COLOR[type] ?? "oklch(0.6 0.05 240)";
}

export function NetworkGraph({
  nodes,
  links,
  focusId,
  activeRelationTypes,
  onSelect,
  height = 640,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: height });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const draggingRef = useRef<{ x: number; y: number } | null>(null);
  const nodeDraggingRef = useRef<GraphNode | null>(null);
  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const [, forceRender] = useState(0);

  // Clone data so d3 can mutate x/y without touching props
  const simNodes = useMemo(
    () => nodes.map((n) => ({ ...n })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes.map((n) => n.id).join("|")],
  );
  const simLinks = useMemo(
    () =>
      links.map((l) => ({
        ...l,
        source: typeof l.source === "string" ? l.source : l.source.id,
        target: typeof l.target === "string" ? l.target : l.target.id,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [links.map((l) => l.id).join("|")],
  );

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth || 800, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  // Build & run simulation
  useEffect(() => {
    const sim = forceSimulation<GraphNode>(simNodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(simLinks)
          .id((d) => d.id)
          .distance(90)
          .strength(0.4),
      )
      .force("charge", forceManyBody().strength(-260))
      .force("center", forceCenter(size.w / 2, size.h / 2))
      .force("collide", forceCollide(28))
      .alpha(1)
      .alphaDecay(0.03);
    simRef.current = sim;
    sim.on("tick", () => forceRender((n) => n + 1));
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [simNodes, simLinks, size.w, size.h]);

  // Focus: re-heat and drift focus node to center
  useEffect(() => {
    if (!focusId || !simRef.current) return;
    const node = simNodes.find((n) => n.id === focusId);
    if (!node) return;
    node.fx = size.w / 2;
    node.fy = size.h / 2;
    simRef.current.alpha(0.9).restart();
    const timer = setTimeout(() => {
      node.fx = null;
      node.fy = null;
    }, 1200);
    return () => clearTimeout(timer);
  }, [focusId, simNodes, size.w, size.h]);

  const endId = (v: string | GraphNode | number | undefined): string => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    return (v as GraphNode).id;
  };

  const visibleLinks = simLinks.filter((l) =>
    activeRelationTypes.has(l.relation_type),
  );
  const connectedIds = new Set<string>();
  visibleLinks.forEach((l) => {
    connectedIds.add(endId(l.source));
    connectedIds.add(endId(l.target));
  });

  const neighborsOfHover = new Set<string>();
  if (hoverId) {
    neighborsOfHover.add(hoverId);
    visibleLinks.forEach((l) => {
      const s = endId(l.source);
      const t = endId(l.target);
      if (s === hoverId) neighborsOfHover.add(t);
      if (t === hoverId) neighborsOfHover.add(s);
    });
  }

  // Pan / zoom handlers on the SVG (in screen coordinates)
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = -e.deltaY * 0.0015;
    const nextK = Math.min(3, Math.max(0.3, transform.k * (1 + delta)));
    // Zoom around cursor
    const scale = nextK / transform.k;
    setTransform({
      k: nextK,
      x: mx - (mx - transform.x) * scale,
      y: my - (my - transform.y) * scale,
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    draggingRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (nodeDraggingRef.current && simRef.current) {
      const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
      const gx = (e.clientX - rect.left - transform.x) / transform.k;
      const gy = (e.clientY - rect.top - transform.y) / transform.k;
      nodeDraggingRef.current.fx = gx;
      nodeDraggingRef.current.fy = gy;
      simRef.current.alphaTarget(0.3).restart();
      return;
    }
    if (!draggingRef.current) return;
    setTransform((t) => ({
      ...t,
      x: e.clientX - draggingRef.current!.x,
      y: e.clientY - draggingRef.current!.y,
    }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
    draggingRef.current = null;
    if (nodeDraggingRef.current && simRef.current) {
      nodeDraggingRef.current.fx = null;
      nodeDraggingRef.current.fy = null;
      simRef.current.alphaTarget(0);
      nodeDraggingRef.current = null;
    }
  };

  const reset = () => setTransform({ x: 0, y: 0, k: 1 });

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border border-border/60 bg-secondary/40"
      style={{ height }}
    >
      <svg
        width={size.w}
        height={size.h}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="block cursor-grab touch-none select-none active:cursor-grabbing"
        role="img"
        aria-label="Rede de relações entre entidades"
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {/* Links */}
          {visibleLinks.map((l) => {
            const s = l.source as unknown as GraphNode;
            const t = l.target as unknown as GraphNode;
            if (s?.x == null || s?.y == null || t?.x == null || t?.y == null) return null;
            const dim =
              hoverId && !(neighborsOfHover.has(s.id) && neighborsOfHover.has(t.id));
            return (
              <line
                key={l.id}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={relationColor(l.relation_type)}
                strokeWidth={(l.provenance === "suggested" ? 1.5 : 2.5) / transform.k}
                strokeOpacity={dim ? 0.08 : l.provenance === "suggested" ? 0.46 : 0.9}
                strokeDasharray={l.provenance === "suggested" ? `${5 / transform.k} ${4 / transform.k}` : undefined}
              >
                <title>
                  {`${labelForRelationType(l.relation_type)} · ${l.provenance === "suggested" ? "sugestão curatorial" : "relação registrada"}${l.description ? `
${l.description}` : ""}${l.evidence?.length ? `
Evidências: ${l.evidence.join("; ")}` : ""}`}
                </title>
              </line>
            );
          })}
          {/* Nodes */}
          {simNodes.map((n) => {
            if (n.x == null || n.y == null) return null;
            const isFocus = n.id === focusId;
            const isolated = !connectedIds.has(n.id) && visibleLinks.length > 0;
            const dim = hoverId && !neighborsOfHover.has(n.id);
            const r = isFocus ? 10 : 6;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  nodeDraggingRef.current = n;
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(n);
                }}
                onPointerEnter={() => setHoverId(n.id)}
                onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
                style={{ cursor: "pointer" }}
              >
                <circle
                  r={r}
                  fill={isFocus ? "oklch(0.72 0.18 40)" : "oklch(0.85 0.02 60)"}
                  stroke="oklch(0.2 0.02 60)"
                  strokeWidth={1.4 / transform.k}
                  opacity={isolated ? 0.35 : dim ? 0.3 : 1}
                />
                <text
                  x={r + 4}
                  y={4}
                  fontSize={11 / transform.k}
                  fill="currentColor"
                  className="pointer-events-none fill-foreground font-display"
                  opacity={dim ? 0.3 : 1}
                >
                  {n.title.length > 34 ? n.title.slice(0, 32) + "…" : n.title}
                </text>
                <text
                  x={r + 4}
                  y={16}
                  fontSize={9 / transform.k}
                  className="pointer-events-none fill-muted-foreground"
                  opacity={dim ? 0.2 : 0.7}
                >
                  {labelForEntityType(n.entity_type)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Overlay controls */}
      <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col gap-1">
        <div className="pointer-events-auto flex overflow-hidden rounded-md border border-border/60 bg-background/90 text-xs shadow-sm backdrop-blur">
          <button
            className="px-2 py-1 hover:bg-muted"
            onClick={() =>
              setTransform((t) => ({ ...t, k: Math.min(3, t.k * 1.2) }))
            }
            aria-label="Aproximar"
          >
            +
          </button>
          <button
            className="border-l border-border/60 px-2 py-1 hover:bg-muted"
            onClick={() =>
              setTransform((t) => ({ ...t, k: Math.max(0.3, t.k / 1.2) }))
            }
            aria-label="Afastar"
          >
            −
          </button>
          <button
            className="border-l border-border/60 px-2 py-1 hover:bg-muted"
            onClick={reset}
            aria-label="Centralizar"
          >
            ⟳
          </button>
        </div>
      </div>

      {/* Hovered node label */}
      {hoverId &&
        (() => {
          const n = simNodes.find((x) => x.id === hoverId);
          if (!n) return null;
          const rels = visibleLinks
            .filter((l) => {
              const s = endId(l.source);
              const t = endId(l.target);
              return s === hoverId || t === hoverId;
            })
            .map((l) => labelForRelationType(l.relation_type));
          const uniq = Array.from(new Set(rels)).slice(0, 4);
          return (
            <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-md border border-border/60 bg-background/95 p-3 text-xs shadow-md backdrop-blur">
              <div className="font-display text-sm text-foreground">{n.title}</div>
              <div className="text-muted-foreground">
                {labelForEntityType(n.entity_type)}
              </div>
              {uniq.length > 0 && (
                <div className="mt-1 text-muted-foreground">
                  {uniq.join(" · ")}
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
