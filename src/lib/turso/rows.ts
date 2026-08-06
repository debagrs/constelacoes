/**
 * Helpers puros para converter linhas SQLite <-> tipos da aplicação.
 * Client-safe (sem acesso ao banco): pode ser importado de qualquer lugar.
 */

export const toBool = (v: unknown): boolean => v === 1 || v === true || v === "1";

export function toJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "object") return v as T;
  try {
    return JSON.parse(String(v)) as T;
  } catch {
    return fallback;
  }
}

export const toArray = (v: unknown): string[] => toJson<string[]>(v, []);

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export const toRecord = (v: unknown): Record<string, Json> =>
  toJson<Record<string, Json>>(v, {});

export const toNum = (v: unknown): number | null =>
  v == null ? null : Number(v);

export const toStr = (v: unknown): string | null =>
  v == null ? null : String(v);

export interface Entity {
  id: string;
  entity_type: string;
  title: string;
  slug: string | null;
  subtitle: string | null;
  description: string | null;
  date_start: number | null;
  date_end: number | null;
  date_display: string | null;
  location: string | null;
  country: string | null;
  continent: string | null;
  culture: string | null;
  image_url: string | null;
  image_license: string | null;
  open_image: boolean;
  source_url: string | null;
  tags: string[];
  themes: string[];
  colors: string[];
  materials: string[];
  techniques: string[];
  metadata: Record<string, Json>;
  status: string;
  created_at: string;
  updated_at: string;
}

export function mapEntity(r: Record<string, unknown>): Entity {
  return {
    id: String(r.id),
    entity_type: String(r.entity_type),
    title: String(r.title),
    slug: toStr(r.slug),
    subtitle: toStr(r.subtitle),
    description: toStr(r.description),
    date_start: toNum(r.date_start),
    date_end: toNum(r.date_end),
    date_display: toStr(r.date_display),
    location: toStr(r.location),
    country: toStr(r.country),
    continent: toStr(r.continent),
    culture: toStr(r.culture),
    image_url: toStr(r.image_url),
    image_license: toStr(r.image_license),
    open_image: toBool(r.open_image),
    source_url: toStr(r.source_url),
    tags: toArray(r.tags),
    themes: toArray(r.themes),
    colors: toArray(r.colors),
    materials: toArray(r.materials),
    techniques: toArray(r.techniques),
    metadata: toRecord(r.metadata),
    status: String(r.status),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export interface Atlas {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export function mapAtlas(r: Record<string, unknown>): Atlas {
  return {
    id: String(r.id),
    owner_id: String(r.owner_id),
    title: String(r.title),
    description: toStr(r.description),
    cover_url: toStr(r.cover_url),
    status: String(r.status),
    is_public: toBool(r.is_public),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export interface AtlasCard {
  id: string;
  atlas_id: string;
  card_type: string;
  entity_id: string | null;
  group_id: string | null;
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
  style: Record<string, Json>;
}

export function mapCard(r: Record<string, unknown>): AtlasCard {
  return {
    id: String(r.id),
    atlas_id: String(r.atlas_id),
    card_type: String(r.card_type),
    entity_id: toStr(r.entity_id),
    group_id: toStr(r.group_id),
    title: toStr(r.title),
    body: toStr(r.body),
    media_url: toStr(r.media_url),
    link_url: toStr(r.link_url),
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    width: Number(r.width ?? 240),
    height: Number(r.height ?? 300),
    rotation: Number(r.rotation ?? 0),
    z_index: Number(r.z_index ?? 0),
    style: toRecord(r.style),
  };
}
