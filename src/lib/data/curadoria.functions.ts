/**
 * Fila curatorial de imagens (aprovação/rejeição) sobre o Turso.
 * As funções SQL do Postgres viraram lógica de servidor aqui.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listImageQueue = createServerFn({ method: "GET" }).handler(async () => {
  const { requireReviewer } = await import("@/lib/auth/session.server");
  const { query } = await import("@/lib/turso/client.server");
  await requireReviewer();

  const suggestions = await query<{
    id: string;
    entity_id: string;
    rank: number;
    image_url: string;
    thumbnail_url: string | null;
    source_url: string | null;
    wikidata_qid: string | null;
    candidate_title: string | null;
    candidate_description: string | null;
    status: string;
    title: string;
    subtitle: string | null;
    entity_type: string;
    date_display: string | null;
    culture: string | null;
  }>(
    `SELECT s.id, s.entity_id, s.rank, s.image_url, s.thumbnail_url, s.source_url,
            s.wikidata_qid, s.candidate_title, s.candidate_description, s.status,
            e.title, e.subtitle, e.entity_type, e.date_display, e.culture
       FROM image_suggestions s
       JOIN entities e ON e.id = s.entity_id
      WHERE s.status = 'pending'
      ORDER BY e.title COLLATE NOCASE ASC, s.rank ASC`,
  );

  const grouped = new Map<
    string,
    {
      entity: {
        id: string;
        title: string;
        subtitle: string | null;
        entity_type: string;
        date_display: string | null;
        culture: string | null;
      };
      suggestions: {
        id: string;
        entity_id: string;
        rank: number;
        image_url: string;
        thumbnail_url: string | null;
        source_url: string | null;
        wikidata_qid: string | null;
        candidate_title: string | null;
        candidate_description: string | null;
        status: string;
      }[];
    }
  >();

  for (const s of suggestions) {
    const g = grouped.get(s.entity_id) ?? {
      entity: {
        id: s.entity_id,
        title: s.title,
        subtitle: s.subtitle,
        entity_type: s.entity_type,
        date_display: s.date_display,
        culture: s.culture,
      },
      suggestions: [],
    };
    g.suggestions.push({
      id: s.id,
      entity_id: s.entity_id,
      rank: s.rank,
      image_url: s.image_url,
      thumbnail_url: s.thumbnail_url,
      source_url: s.source_url,
      wikidata_qid: s.wikidata_qid,
      candidate_title: s.candidate_title,
      candidate_description: s.candidate_description,
      status: s.status,
    });
    grouped.set(s.entity_id, g);
  }

  return Array.from(grouped.values());
});

export const approveImageSuggestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ suggestionId: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, batch, nowIso } = await import("@/lib/turso/client.server");
    const { toRecord } = await import("@/lib/turso/rows");
    const user = await requireReviewer();

    const s = await queryOne<{
      id: string;
      entity_id: string;
      image_url: string;
      source_url: string | null;
      license: string | null;
      wikidata_qid: string | null;
    }>(
      "SELECT id, entity_id, image_url, source_url, license, wikidata_qid FROM image_suggestions WHERE id = ?",
      [data.suggestionId],
    );
    if (!s) throw new Error("Sugestão não encontrada.");

    const ent = await queryOne<{ metadata: string | null }>(
      "SELECT metadata FROM entities WHERE id = ?",
      [s.entity_id],
    );
    const now = nowIso();
    const metadata = {
      ...toRecord(ent?.metadata),
      imagem_fonte: s.source_url ?? "",
      wikidata_qid: s.wikidata_qid ?? "",
      licenca_texto: s.license ?? "Domínio público",
      status_metadados: "completo",
      aprovado_por: user.id,
      aprovado_em: now,
    };

    await batch([
      {
        sql: `UPDATE entities
                 SET image_url = ?, source_url = COALESCE(?, source_url),
                     image_license = COALESCE(?, image_license, 'Domínio público'),
                     open_image = 1, metadata = ?, updated_at = ?
               WHERE id = ?`,
        args: [
          s.image_url,
          s.source_url,
          s.license,
          JSON.stringify(metadata),
          now,
          s.entity_id,
        ],
      },
      {
        sql: `UPDATE image_suggestions SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
        args: [user.id, now, s.id],
      },
      {
        sql: `UPDATE image_suggestions SET status = 'rejected', reviewed_by = ?, reviewed_at = ?
               WHERE entity_id = ? AND id <> ? AND status = 'pending'`,
        args: [user.id, now, s.entity_id, s.id],
      },
    ]);

    return { ok: true };
  });

export const rejectImageSuggestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        suggestionId: z.string().min(1),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { execute, nowIso } = await import("@/lib/turso/client.server");
    const user = await requireReviewer();
    await execute(
      `UPDATE image_suggestions
          SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, notes = COALESCE(?, notes)
        WHERE id = ?`,
      [user.id, nowIso(), data.notes ?? null, data.suggestionId],
    );
    return { ok: true };
  });
