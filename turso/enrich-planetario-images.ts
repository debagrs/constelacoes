/** Busca imagens de domínio público na Wikipédia para itens sem imagem. */
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const UA = "AtlasPlanetario/1.0 (curadoria academica)";

async function commonsFor(term: string): Promise<string | null> {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=5&gsrsearch=${encodeURIComponent(term)}&prop=imageinfo&iiprop=url&iiurlwidth=1200`;
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    query?: { pages?: Record<string, { imageinfo?: { url?: string; thumburl?: string }[] }> };
  };
  for (const page of Object.values(json.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    const url = (info?.thumburl ?? info?.url ?? "").split("?")[0];
    if (url && /\.(jpe?g|png|gif|webp)$/i.test(url)) return url;
  }
  return null;
}

async function imageFor(title: string): Promise<{ url: string; src: string } | null> {
  const api = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&titles=${encodeURIComponent(title)}&redirects=1&origin=*`;
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    query?: { pages?: Record<string, { original?: { source?: string }; title?: string }> };
  };
  const page = Object.values(json.query?.pages ?? {})[0];
  const raw = page?.original?.source;
  if (!raw) return null;
  const url = raw.split("?")[0]!;
  if (!/\.(jpe?g|png|gif|webp)$/i.test(url)) return null;
  return { url, src: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}` };
}

const rows = (
  await db.execute(
    `SELECT id, title, metadata FROM entities
      WHERE (image_url IS NULL OR image_url = '') AND metadata LIKE '%"wiki"%'`,
  )
).rows as unknown as { id: string; title: string; metadata: string }[];

console.log(`sem imagem: ${rows.length}`);
let ok = 0;
for (const r of rows) {
  let wiki = "";
  try {
    wiki = JSON.parse(r.metadata).wiki ?? "";
  } catch {
    /* ignore */
  }
  if (!wiki) continue;
  try {
    let url = (await imageFor(wiki))?.url ?? null;
    if (!url) url = await commonsFor(wiki);
    if (!url) url = await commonsFor(r.title);
    if (url) {
      await db.execute({
        sql: `UPDATE entities SET image_url=?, image_license='Domínio público / uso educacional (Wikimedia)',
                open_image=1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`,
        args: [url, r.id],
      });
      ok++;
    }
  } catch (e) {
    console.warn(r.title, String(e));
  }
  await new Promise((s) => setTimeout(s, 120));
}
console.log(`imagens aplicadas: ${ok}/${rows.length}`);
