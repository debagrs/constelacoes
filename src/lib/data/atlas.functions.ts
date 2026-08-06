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
    return { savedAt: now };
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
 * Remove duplicatas no resultado e retorna somente entidades publicadas com imagem.
 */
export const searchAtlasEntities = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ query: z.string().trim().max(120).default("") }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/auth/session.server");
    const { query } = await import("@/lib/turso/client.server");
    await requireUser();

    const term = data.query.trim();
    const like = `%${term}%`;
    return await query<{
      id: string;
      title: string;
      subtitle: string | null;
      entity_type: string;
      image_url: string;
      date_display: string | null;
      continent: string | null;
      country: string | null;
    }>(
      `WITH filtered AS (
         SELECT
           id, title, subtitle, entity_type, image_url, date_display,
           continent, country, created_at,
           ROW_NUMBER() OVER (
             PARTITION BY lower(trim(image_url))
             ORDER BY created_at ASC, id ASC
           ) AS duplicate_rank
         FROM entities
         WHERE status = 'published'
           AND image_url IS NOT NULL
           AND trim(image_url) <> ''
           AND (
             ?1 = ''
             OR title LIKE ?2 COLLATE NOCASE
             OR COALESCE(subtitle, '') LIKE ?2 COLLATE NOCASE
             OR COALESCE(tags, '') LIKE ?2 COLLATE NOCASE
             OR COALESCE(themes, '') LIKE ?2 COLLATE NOCASE
             OR COALESCE(culture, '') LIKE ?2 COLLATE NOCASE
             OR COALESCE(country, '') LIKE ?2 COLLATE NOCASE
           )
       )
       SELECT id, title, subtitle, entity_type, image_url,
              date_display, continent, country
       FROM filtered
       WHERE duplicate_rank = 1
       ORDER BY title COLLATE NOCASE ASC
       LIMIT 60`,
      [term, like],
    );
  });
