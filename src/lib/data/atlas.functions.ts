/**
 * Atlas pessoais: leitura e escrita autorizadas na camada de servidor
 * (sem RLS no Turso — a autorização é feita aqui).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const cardSchema = z.object({
  id: z.string().min(1),
  card_type: z.string().min(1),
  entity_id: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  media_url: z.string().nullable().optional(),
  link_url: z.string().nullable().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  z_index: z.number().default(0),
});

export const listMyAtlases = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUser } = await import("@/lib/auth/session.server");
  const { query } = await import("@/lib/turso/client.server");
  const { mapAtlas } = await import("@/lib/turso/rows");
  const user = await requireUser();
  const rows = await query<Record<string, unknown>>(
    "SELECT * FROM atlases WHERE owner_id = ? ORDER BY updated_at DESC",
    [user.id],
  );
  return rows.map(mapAtlas);
});

export const createAtlas = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/auth/session.server");
    const { execute, nowIso } = await import("@/lib/turso/client.server");
    const user = await requireUser();
    const id = crypto.randomUUID();
    const now = nowIso();
    await execute(
      `INSERT INTO atlases (id, owner_id, title, description, status, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'draft', 0, ?, ?)`,
      [id, user.id, data.title, data.description ?? null, now, now],
    );
    return { id };
  });

export const getAtlas = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ atlasId: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { requireUser, isReviewer } = await import("@/lib/auth/session.server");
    const { query, queryOne } = await import("@/lib/turso/client.server");
    const { mapAtlas, mapCard } = await import("@/lib/turso/rows");
    const user = await requireUser();

    const row = await queryOne<Record<string, unknown>>(
      "SELECT * FROM atlases WHERE id = ?",
      [data.atlasId],
    );
    if (!row) return null;
    const atlas = mapAtlas(row);
    const canEdit = atlas.owner_id === user.id || isReviewer(user);
    if (!canEdit && !atlas.is_public && atlas.status !== "published") return null;

    const cardRows = await query<Record<string, unknown>>(
      "SELECT * FROM atlas_cards WHERE atlas_id = ? ORDER BY z_index ASC",
      [data.atlasId],
    );

    const cards = cardRows.map(mapCard);
    const entityIds = Array.from(
      new Set(cards.map((c) => c.entity_id).filter((v): v is string => !!v)),
    );
    let entities: {
      id: string;
      title: string;
      image_url: string | null;
      entity_type: string;
    }[] = [];
    if (entityIds.length > 0) {
      const placeholders = entityIds.map(() => "?").join(",");
      entities = await query(
        `SELECT id, title, image_url, entity_type FROM entities WHERE id IN (${placeholders})`,
        entityIds,
      );
    }

    return { atlas, cards, entities, canEdit };
  });

export const saveAtlas = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        atlasId: z.string().min(1),
        title: z.string().trim().min(1).max(200),
        description: z.string().max(2000).nullable().optional(),
        cards: z.array(cardSchema),
        deletedCardIds: z.array(z.string()).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireUser, isReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, batch, nowIso } = await import("@/lib/turso/client.server");
    const user = await requireUser();

    const owner = await queryOne<{ owner_id: string }>(
      "SELECT owner_id FROM atlases WHERE id = ?",
      [data.atlasId],
    );
    if (!owner) throw new Error("Atlas não encontrado.");
    if (owner.owner_id !== user.id && !isReviewer(user)) {
      throw new Response("Forbidden", { status: 403 });
    }

    const now = nowIso();
    const statements: { sql: string; args: (string | number | null)[] }[] = [
      {
        sql: "UPDATE atlases SET title = ?, description = ?, updated_at = ? WHERE id = ?",
        args: [data.title, data.description ?? null, now, data.atlasId],
      },
    ];

    for (const id of data.deletedCardIds) {
      statements.push({
        sql: "DELETE FROM atlas_cards WHERE id = ? AND atlas_id = ?",
        args: [id, data.atlasId],
      });
    }

    for (const c of data.cards) {
      statements.push({
        sql: `INSERT INTO atlas_cards
                (id, atlas_id, card_type, entity_id, title, body, media_url, link_url,
                 x, y, width, height, rotation, z_index, created_at, updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET
                card_type = excluded.card_type,
                entity_id = excluded.entity_id,
                title = excluded.title,
                body = excluded.body,
                media_url = excluded.media_url,
                link_url = excluded.link_url,
                x = excluded.x, y = excluded.y,
                width = excluded.width, height = excluded.height,
                rotation = excluded.rotation, z_index = excluded.z_index,
                updated_at = excluded.updated_at`,
        args: [
          c.id,
          data.atlasId,
          c.card_type,
          c.entity_id ?? null,
          c.title ?? null,
          c.body ?? null,
          c.media_url ?? null,
          c.link_url ?? null,
          c.x,
          c.y,
          c.width,
          c.height,
          c.rotation ?? 0,
          c.z_index ?? 0,
          now,
          now,
        ],
      });
    }

    await batch(statements);
    const savedCards = await queryOne<{ total: number }>(
      "SELECT COUNT(*) AS total FROM atlas_cards WHERE atlas_id = ?",
      [data.atlasId],
    );

    return { savedAt: now, totalCards: Number(savedCards?.total ?? 0) };
  });

export const deleteAtlas = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ atlasId: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { requireUser, isReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, execute } = await import("@/lib/turso/client.server");
    const user = await requireUser();
    const owner = await queryOne<{ owner_id: string }>(
      "SELECT owner_id FROM atlases WHERE id = ?",
      [data.atlasId],
    );
    if (!owner) return { ok: true };
    if (owner.owner_id !== user.id && !isReviewer(user)) {
      throw new Response("Forbidden", { status: 403 });
    }
    await execute("DELETE FROM atlases WHERE id = ?", [data.atlasId]);
    return { ok: true };
  });

/**
 * Busca imagens do acervo para compor Atlas pessoais.
 *
 * Versão de baixo consumo: usa FTS/Tantivy quando disponível e o índice
 * materializado de deduplicação. O fallback é propositalmente restrito a
 * prefixos de título/subtítulo para não varrer dezenas de campos do acervo.
 */
export const searchAtlasEntities = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ query: z.string().trim().max(160).default("") }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/auth/session.server");
    const { query, queryOne } = await import("@/lib/turso/client.server");
    const { expandSearchTerms } = await import("@/lib/search-dictionary");
    await requireUser();

    const term = data.query.trim();
    const where = [
      "e.status='published'",
      "e.image_url IS NOT NULL",
      "trim(e.image_url)<>''",
      "(di.entity_id IS NULL OR di.is_canonical=1)",
    ];
    const args: string[] = [];

    let ftsEnabled = false;
    try {
      const capability = await queryOne<{ enabled: number }>(
        "SELECT enabled FROM atlas_capabilities WHERE key='fts' LIMIT 1",
      );
      ftsEnabled = Number(capability?.enabled ?? 0) === 1;
    } catch {
      ftsEnabled = false;
    }

    if (term) {
      const terms = expandSearchTerms(term, 8);
      if (ftsEnabled) {
        const ftsQuery = terms
          .map((value) => value.replace(/["'():^*]/g, " ").replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join(" ")
          .slice(0, 700);
        where.push(`fts_match(
          e.title,e.subtitle,e.description,e.culture,e.country,e.tags,e.themes,e.materials,e.techniques,?
        )`);
        args.push(ftsQuery || term);
      } else {
        const termsForFallback = terms.slice(0, 4);
        const groups: string[] = [];
        for (const value of termsForFallback) {
          const prefix = `${value}%`;
          groups.push("(e.title LIKE ? COLLATE NOCASE OR e.subtitle LIKE ? COLLATE NOCASE)");
          args.push(prefix, prefix);
        }
        if (groups.length) where.push(`(${groups.join(" OR ")})`);
      }
    }

    const orderSql = term
      ? `CASE
           WHEN lower(e.title)=lower(?) THEN 0
           WHEN e.title LIKE ? COLLATE NOCASE THEN 1
           ELSE 2
         END, e.title COLLATE NOCASE ASC, e.id ASC`
      : `e.updated_at DESC, e.id ASC`;
    const orderArgs = term ? [term, `${term}%`] : [];

    return query<{
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
    }>(
      `SELECT e.id,e.title,e.subtitle,e.entity_type,e.image_url,e.date_display,
              e.continent,e.country,e.culture,e.source_url,e.image_license,e.metadata
         FROM entities e
         LEFT JOIN entity_dedupe_index di ON di.entity_id=e.id
        WHERE ${where.join(" AND ")}
        ORDER BY ${orderSql}
        LIMIT 120`,
      [...args, ...orderArgs],
    );
  });
