import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import { land110m } from "@/lib/geo/land-110m";
import { cn } from "@/lib/utils";

export type MapMarker = {
  id: string;
  name: string;
  continent: string;
  latitude: number | null;
  longitude: number | null;
  total: number;
};

const WIDTH = 960;
const HEIGHT = 500;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

const projection = geoNaturalEarth1().fitExtent(
  [
    [8, 8],
    [WIDTH - 8, HEIGHT - 8],
  ],
  { type: "Sphere" },
);
const pathGen = geoPath(projection);

const landFeatures = feature(
  land110m as never,
  (land110m as never as { objects: { land: unknown } }).objects.land as never,
) as unknown as FeatureCollection<Geometry>;

const LAND_PATH = pathGen(landFeatures) ?? "";
const GRATICULE_PATH = pathGen(geoGraticule10()) ?? "";
const SPHERE_PATH = pathGen({ type: "Sphere" } as never) ?? "";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function WorldMap({
  markers,
  selectedId,
  onSelect,
  className,
}: {
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const points = useMemo(
    () =>
      markers
        .filter((m) => m.latitude != null && m.longitude != null && m.total > 0)
        .map((m) => {
          const p = projection([m.longitude as number, m.latitude as number]);
          return p ? { ...m, cx: p[0], cy: p[1] } : null;
        })
        .filter((m): m is MapMarker & { cx: number; cy: number } => m !== null),
    [markers],
  );

  const maxTotal = useMemo(
    () => points.reduce((a, p) => Math.max(a, p.total), 1),
    [points],
  );

  const zoomAt = useCallback((px: number, py: number, next: number) => {
    setZoom((prevZoom) => {
      const nz = clamp(next, MIN_ZOOM, MAX_ZOOM);
      const k = nz / prevZoom;
      setOffset((o) => ({ x: px - (px - o.x) * k, y: py - (py - o.y) * k }));
      return nz;
    });
  }, []);

  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scale = WIDTH / rect.width;
    const px = (e.clientX - rect.left) * scale;
    const py = (e.clientY - rect.top) * scale;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    zoomAt(px, py, zoom * Math.exp(-dy * 0.0018));
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const el = containerRef.current;
    if (!el) return;
    const scale = WIDTH / el.getBoundingClientRect().width;
    setOffset({
      x: d.ox + (e.clientX - d.x) * scale,
      y: d.oy + (e.clientY - d.y) * scale,
    });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative touch-none overflow-hidden rounded-lg border border-border/60 bg-card/40",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        role="img"
        aria-label="Mapa-múndi das regiões do acervo"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
          <path d={SPHERE_PATH} className="fill-background/60 stroke-border/50" />
          <path
            d={GRATICULE_PATH}
            fill="none"
            className="stroke-border/30"
            strokeWidth={0.4 / zoom}
          />
          <path d={LAND_PATH} className="fill-muted/60 stroke-border" strokeWidth={0.5 / zoom} />

          {points.map((p) => {
            const active = selectedId === p.id || hovered === p.id;
            const r = (3 + (p.total / maxTotal) * 9) / Math.sqrt(zoom);
            return (
              <g key={p.id}>
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={r}
                  className={cn(
                    "cursor-pointer transition-opacity",
                    active
                      ? "fill-primary opacity-100"
                      : "fill-primary/60 opacity-80 hover:opacity-100",
                  )}
                  stroke="currentColor"
                  strokeWidth={active ? 1.2 / zoom : 0}
                  onPointerEnter={() => setHovered(p.id)}
                  onPointerLeave={() => setHovered((h) => (h === p.id ? null : h))}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(p.id);
                  }}
                >
                  <title>{`${p.name} — ${p.total} itens`}</title>
                </circle>
                {(active || zoom > 2.2) && (
                  <text
                    x={p.cx}
                    y={p.cy - r - 3 / zoom}
                    textAnchor="middle"
                    className="pointer-events-none fill-foreground font-medium"
                    style={{ fontSize: `${11 / zoom}px` }}
                  >
                    {p.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          type="button"
          aria-label="Aproximar"
          className="h-8 w-8 rounded-md border border-border/60 bg-background/80 text-sm text-foreground backdrop-blur hover:bg-muted"
          onClick={() => zoomAt(WIDTH / 2, HEIGHT / 2, zoom * 1.4)}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Afastar"
          className="h-8 w-8 rounded-md border border-border/60 bg-background/80 text-sm text-foreground backdrop-blur hover:bg-muted"
          onClick={() => zoomAt(WIDTH / 2, HEIGHT / 2, zoom / 1.4)}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Restaurar visão"
          className="h-8 w-8 rounded-md border border-border/60 bg-background/80 text-[10px] uppercase text-muted-foreground backdrop-blur hover:bg-muted"
          onClick={reset}
        >
          Res
        </button>
      </div>
    </div>
  );
}
