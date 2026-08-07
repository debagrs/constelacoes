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

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;
const TAP_TOLERANCE = 9;

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

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
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
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: height });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    transformX: number;
    transformY: number;
  } | null>(null);
  const pinchRef = useRef<{
    startDistance: number;
    worldX: number;
    worldY: number;
    startK: number;
  } | null>(null);
  const nodeDragRef = useRef<{
    pointerId: number;
    node: GraphNode;
    startClientX: number;
    startClientY: number;
    moved: boolean;
  } | null>(null);

  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const [, forceRender] = useState(0);

  // Clone data so d3 can mutate x/y without touching props.
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

  // Track the actual container dimensions, including expanded/mobile mode.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () =>
      setSize({
        w: el.clientWidth || 800,
        h: el.clientHeight || height,
      });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height, isExpanded]);

  // Escape exits the expanded graph.
  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded]);

  // Build & run simulation.
  useEffect(() => {
    const sim = forceSimulation<GraphNode>(simNodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(simLinks)
          .id((d) => d.id)
          .distance(size.w < 640 ? 74 : 94)
          .strength(0.38),
      )
      .force("charge", forceManyBody().strength(size.w < 640 ? -210 : -270))
      .force("center", forceCenter(size.w / 2, size.h / 2))
      .force("collide", forceCollide(size.w < 640 ? 22 : 29))
      .alpha(1)
      .alphaDecay(0.03);
    simRef.current = sim;
    sim.on("tick", () => forceRender((n) => n + 1));
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [simNodes, simLinks, size.w, size.h]);

  // Focus: re-heat and drift focus node to center.
  useEffect(() => {
    if (!focusId || !simRef.current) return;
    const node = simNodes.find((n) => n.id === focusId);
    if (!node) return;
    node.fx = size.w / 2;
    node.fy = size.h / 2;
    simRef.current.alpha(0.9).restart();
    setTransform({ x: 0, y: 0, k: 1 });
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

  const pointerCenterAndDistance = () => {
    const points = Array.from(pointersRef.current.values());
    if (points.length < 2) return null;
    const [a, b] = points;
    return {
      centerX: (a.x + b.x) / 2,
      centerY: (a.y + b.y) / 2,
      distance: Math.hypot(b.x - a.x, b.y - a.y),
    };
  };

  // Desktop wheel zoom.
  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0014);
    const nextK = clampZoom(transform.k * factor);
    const scale = nextK / transform.k;
    setTransform({
      k: nextK,
      x: mx - (mx - transform.x) * scale,
      y: my - (my - transform.y) * scale,
    });
  };

  // Background: one pointer pans; two pointers pinch-zoom.
  const onBackgroundPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    pointersRef.current.set(e.pointerId, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    if (pointersRef.current.size === 1) {
      panRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        transformX: transform.x,
        transformY: transform.y,
      };
      pinchRef.current = null;
      return;
    }

    if (pointersRef.current.size === 2) {
      const pinch = pointerCenterAndDistance();
      if (!pinch || pinch.distance <= 0) return;
      pinchRef.current = {
        startDistance: pinch.distance,
        worldX: (pinch.centerX - transform.x) / transform.k,
        worldY: (pinch.centerY - transform.y) / transform.k,
        startK: transform.k,
      };
      panRef.current = null;
    }
  };

  const onBackgroundPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointersRef.current.set(e.pointerId, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pinch = pointerCenterAndDistance();
      if (!pinch || pinch.distance <= 0) return;
      const nextK = clampZoom(
        pinchRef.current.startK *
          (pinch.distance / pinchRef.current.startDistance),
      );
      setTransform({
        k: nextK,
        x: pinch.centerX - pinchRef.current.worldX * nextK,
        y: pinch.centerY - pinchRef.current.worldY * nextK,
      });
      return;
    }

    if (pointersRef.current.size === 1 && panRef.current) {
      setTransform((current) => ({
        ...current,
        x: panRef.current!.transformX + (e.clientX - panRef.current!.startX),
        y: panRef.current!.transformY + (e.clientY - panRef.current!.startY),
      }));
    }
  };

  const onBackgroundPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size === 0) {
      panRef.current = null;
      pinchRef.current = null;
      return;
    }

    // If one finger remains after a pinch, continue panning from its current point.
    if (pointersRef.current.size === 1) {
      const [remainingId, point] = Array.from(pointersRef.current.entries())[0];
      const rect = e.currentTarget.getBoundingClientRect();
      panRef.current = {
        pointerId: remainingId,
        startX: point.x + rect.left,
        startY: point.y + rect.top,
        transformX: transform.x,
        transformY: transform.y,
      };
      pinchRef.current = null;
    }
  };

  const clientToGraph = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (clientX - rect.left - transform.x) / transform.k,
      y: (clientY - rect.top - transform.y) / transform.k,
    };
  };

  // Node gestures: tap opens the entity; drag repositions the node.
  const onNodePointerDown = (
    e: React.PointerEvent<SVGGElement>,
    node: GraphNode,
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    nodeDragRef.current = {
      pointerId: e.pointerId,
      node,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
    };
    node.fx = node.x ?? null;
    node.fy = node.y ?? null;
    simRef.current?.alphaTarget(0.2).restart();
  };

  const onNodePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    const drag = nodeDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    if (
      Math.hypot(
        e.clientX - drag.startClientX,
        e.clientY - drag.startClientY,
      ) > TAP_TOLERANCE
    ) {
      drag.moved = true;
    }
    const graphPoint = clientToGraph(e.clientX, e.clientY);
    if (!graphPoint) return;
    drag.node.fx = graphPoint.x;
    drag.node.fy = graphPoint.y;
  };

  const onNodePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    const drag = nodeDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    drag.node.fx = null;
    drag.node.fy = null;
    simRef.current?.alphaTarget(0);
    nodeDragRef.current = null;
    if (!drag.moved) onSelect?.(drag.node);
  };

  const zoomAtCenter = (factor: number) => {
    setTransform((current) => {
      const nextK = clampZoom(current.k * factor);
      const centerX = size.w / 2;
      const centerY = size.h / 2;
      const scale = nextK / current.k;
      return {
        k: nextK,
        x: centerX - (centerX - current.x) * scale,
        y: centerY - (centerY - current.y) * scale,
      };
    });
  };

  const fitToGraph = () => {
    const positioned = simNodes.filter(
      (node) => Number.isFinite(node.x) && Number.isFinite(node.y),
    );
    if (positioned.length === 0) {
      setTransform({ x: 0, y: 0, k: 1 });
      return;
    }
    const xs = positioned.map((node) => node.x as number);
    const ys = positioned.map((node) => node.y as number);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const graphW = Math.max(1, maxX - minX);
    const graphH = Math.max(1, maxY - minY);
    const padding = size.w < 640 ? 52 : 80;
    const nextK = clampZoom(
      Math.min(
        (size.w - padding * 2) / graphW,
        (size.h - padding * 2) / graphH,
        1.5,
      ),
    );
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;
    setTransform({
      k: nextK,
      x: size.w / 2 - graphCenterX * nextK,
      y: size.h / 2 - graphCenterY * nextK,
    });
  };

  const isMobile = size.w < 640;

  return (
    <div
      ref={containerRef}
      className={
        isExpanded
          ? "fixed inset-0 z-[100] w-screen overflow-hidden bg-background"
          : "relative w-full overflow-hidden rounded-lg border border-border/60 bg-secondary/40"
      }
      style={{ height: isExpanded ? "100dvh" : height }}
    >
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onWheel={onWheel}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onBackgroundPointerMove}
        onPointerUp={onBackgroundPointerUp}
        onPointerCancel={onBackgroundPointerUp}
        className="block cursor-grab select-none active:cursor-grabbing"
        style={{ touchAction: "none" }}
        role="img"
        aria-label="Rede de relações entre entidades. Arraste para mover, use dois dedos para ampliar e toque em um nó para abrir sua ficha."
      >
        <g
          transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}
        >
          {/* Links */}
          {visibleLinks.map((l) => {
            const s = l.source as unknown as GraphNode;
            const t = l.target as unknown as GraphNode;
            if (
              s?.x == null ||
              s?.y == null ||
              t?.x == null ||
              t?.y == null
            )
              return null;
            const dim =
              hoverId &&
              !(neighborsOfHover.has(s.id) && neighborsOfHover.has(t.id));
            return (
              <line
                key={l.id}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={relationColor(l.relation_type)}
                strokeWidth={
                  (l.provenance === "suggested" ? 1.5 : 2.5) / transform.k
                }
                strokeOpacity={
                  dim ? 0.08 : l.provenance === "suggested" ? 0.46 : 0.9
                }
                strokeDasharray={
                  l.provenance === "suggested"
                    ? `${5 / transform.k} ${4 / transform.k}`
                    : undefined
                }
              >
                <title>
                  {`${labelForRelationType(l.relation_type)} · ${
                    l.provenance === "suggested"
                      ? "sugestão curatorial"
                      : "relação registrada"
                  }${l.description ? `\n${l.description}` : ""}${
                    l.evidence?.length
                      ? `\nEvidências: ${l.evidence.join("; ")}`
                      : ""
                  }`}
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
            const r = isFocus ? 10 : 6.5;
            const showLabel =
              !isMobile ||
              transform.k >= 1.18 ||
              isFocus ||
              hoverId === n.id;

            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                onPointerDown={(e) => onNodePointerDown(e, n)}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onPointerCancel={onNodePointerUp}
                onPointerEnter={() => setHoverId(n.id)}
                onPointerLeave={() =>
                  setHoverId((current) => (current === n.id ? null : current))
                }
                style={{ cursor: "pointer", touchAction: "none" }}
              >
                {/* Invisible touch target: much easier to tap on phones. */}
                <circle r={isMobile ? 19 : 13} fill="transparent" />
                <circle
                  r={r}
                  fill={
                    isFocus
                      ? "oklch(0.72 0.18 40)"
                      : "oklch(0.85 0.02 60)"
                  }
                  stroke="oklch(0.2 0.02 60)"
                  strokeWidth={1.4 / transform.k}
                  opacity={isolated ? 0.35 : dim ? 0.3 : 1}
                />
                {showLabel && (
                  <>
                    <text
                      x={r + 4}
                      y={4}
                      fontSize={11 / transform.k}
                      fill="currentColor"
                      className="pointer-events-none fill-foreground font-display"
                      opacity={dim ? 0.3 : 1}
                    >
                      {n.title.length > 34
                        ? n.title.slice(0, 32) + "…"
                        : n.title}
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
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Interaction hint, especially useful on touch screens. */}
      <div className="pointer-events-none absolute bottom-3 left-3 max-w-[62%] rounded-md border border-border/60 bg-background/90 px-2.5 py-1.5 text-[10px] leading-snug text-muted-foreground shadow-sm backdrop-blur sm:text-xs">
        {isMobile
          ? "1 dedo: mover · 2 dedos: zoom · toque: abrir · arraste um nó: reposicionar"
          : "Roda: zoom · arraste: mover · clique: abrir · arraste um nó: reposicionar"}
      </div>

      {/* Overlay controls */}
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-2">
        <div className="pointer-events-auto flex overflow-hidden rounded-lg border border-border/60 bg-background/95 text-sm shadow-md backdrop-blur">
          <button
            className="min-h-10 min-w-10 px-3 hover:bg-muted"
            onClick={() => zoomAtCenter(1.35)}
            aria-label="Aproximar"
          >
            +
          </button>
          <button
            className="min-h-10 min-w-10 border-l border-border/60 px-3 hover:bg-muted"
            onClick={() => zoomAtCenter(1 / 1.35)}
            aria-label="Afastar"
          >
            −
          </button>
          <button
            className="min-h-10 min-w-10 border-l border-border/60 px-3 hover:bg-muted"
            onClick={fitToGraph}
            aria-label="Enquadrar toda a rede"
            title="Enquadrar toda a rede"
          >
            ◎
          </button>
          <button
            className="min-h-10 min-w-10 border-l border-border/60 px-3 hover:bg-muted"
            onClick={() => setIsExpanded((value) => !value)}
            aria-label={isExpanded ? "Sair da tela cheia" : "Abrir em tela cheia"}
            title={isExpanded ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isExpanded ? "×" : "⛶"}
          </button>
        </div>
      </div>

      {/* Hovered node label (desktop) */}
      {hoverId && !isMobile &&
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
