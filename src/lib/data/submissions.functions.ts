import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const stringList = z.array(z.string().trim().min(1).max(120)).max(30).default([]);
const metadataRecord = z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({});

const submissionSchema = z.object({
  submissionType: z.enum(["obra","artista","projeto","movimento","conceito","objeto","arquitetura","design","performance","fotografia","filme","jogo","interface","outro"]),
  title: z.string().trim().min(2, "Informe um título com pelo menos 2 caracteres.").max(240),
  artistName: z.string().trim().max(240).optional().default(""),
  subtitle: z.string().trim().max(300).optional().default(""),
  description: z.string().trim().min(30, "A descrição curatorial precisa ter pelo menos 30 caracteres.").max(8000, "A descrição curatorial está muito longa."),
  dateDisplay: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().max(240).optional().default(""),
  country: z.string().trim().max(120).optional().default(""),
  continent: z.string().trim().max(120).optional().default(""),
  culture: z.string().trim().max(240).optional().default(""),
  imageUrl: z.string().url().max(2000).optional().or(z.literal("")),
  imageSourceUrl: z.string().url().max(2000).optional().or(z.literal("")),
  imageLicense: z.string().trim().max(160).optional().default(""),
  sourceUrls: z.array(z.string().url().max(2000)).max(10).default([]),
  tags: stringList,
  materials: stringList,
  techniques: stringList,
  sensitiveMetadata: metadataRecord,
  poeticMetadata: metadataRecord,
  submitterName: z.string().trim().min(2, "Informe seu nome com pelo menos 2 caracteres.").max(160),
  submitterEmail: z.string().email().max(240),
  submitterRelation: z.string().trim().max(500).optional().default(""),
  consentPublication: z.literal(true),
});

export const submitContribution = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const parsed = submissionSchema.safeParse(d);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new Error(first?.message ?? "Revise os campos obrigatórios do formulário.");
    }
    return parsed.data;
  })
  .handler(async ({ data }) => {
    const { execute, nowIso } = await import("@/lib/turso/client.server");
    const { getSessionUser } = await import("@/lib/auth/session.server");
    const user = await getSessionUser();
    const { queryOne } = await import("@/lib/turso/client.server");
    const duplicate = await queryOne<{ id: string }>(
      `SELECT id FROM submissions
        WHERE lower(trim(title)) = lower(trim(?))
          AND lower(trim(submitter_email)) = lower(trim(?))
          AND status IN ('pending','needs_changes')
        LIMIT 1`,
      [data.title, data.submitterEmail],
    );
    if (duplicate) {
      throw new Error("Esta contribuição já foi enviada e ainda está aguardando curadoria.");
    }
    const id = crypto.randomUUID();
    const now = nowIso();
    await execute(
      `INSERT INTO submissions (
        id, submission_type, title, artist_name, subtitle, description, date_display,
        location, country, continent, culture, image_url, image_source_url, image_license,
        source_urls, tags, materials, techniques, sensitive_metadata, poetic_metadata,
        submitter_name, submitter_email, submitter_relation, consent_publication,
        status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending', ?, ?, ?)`,
      [id, data.submissionType, data.title, data.artistName || null, data.subtitle || null,
       data.description, data.dateDisplay || null, data.location || null, data.country || null,
       data.continent || null, data.culture || null, data.imageUrl || null,
       data.imageSourceUrl || null, data.imageLicense || null, JSON.stringify(data.sourceUrls),
       JSON.stringify(data.tags), JSON.stringify(data.materials), JSON.stringify(data.techniques),
       JSON.stringify(data.sensitiveMetadata), JSON.stringify(data.poeticMetadata),
       data.submitterName, data.submitterEmail, data.submitterRelation || null,
       user?.id ?? null, now, now],
    );
    return { ok: true, id };
  });

export const listPendingSubmissions = createServerFn({ method: "GET" }).handler(async () => {
  const { requireReviewer } = await import("@/lib/auth/session.server");
  const { query } = await import("@/lib/turso/client.server");
  await requireReviewer();
  return query<Record<string, unknown>>(
    `SELECT * FROM submissions WHERE status IN ('pending','needs_changes') ORDER BY created_at ASC`,
  );
});

export const reviewSubmission = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    decision: z.enum(["approve","reject","needs_changes"]),
    notes: z.string().max(3000).optional().default(""),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, batch, nowIso } = await import("@/lib/turso/client.server");
    const { toArray, toRecord } = await import("@/lib/turso/rows");
    const reviewer = await requireReviewer();
    const row = await queryOne<Record<string, unknown>>("SELECT * FROM submissions WHERE id = ?", [data.id]);
    if (!row) throw new Error("Contribuição não encontrada.");
    const now = nowIso();

    if (data.decision !== "approve") {
      await batch([{ sql: `UPDATE submissions SET status = ?, reviewer_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`, args: [data.decision === "reject" ? "rejected" : "needs_changes", data.notes || null, reviewer.id, now, now, data.id] }]);
      return { ok: true };
    }

    const entityId = crypto.randomUUID();
    const sensitive = toRecord(row.sensitive_metadata);
    const poetic = toRecord(row.poetic_metadata);
    const metadata = {
      ...sensitive,
      poeticas: poetic,
      autoria_nome: row.artist_name ?? "",
      origem_cadastro: "contribuicao_publica_moderada",
      contribuicao_id: data.id,
      aprovado_por: reviewer.id,
      aprovado_em: now,
      fontes: toArray(row.source_urls),
    };
    await batch([
      { sql: `INSERT INTO entities (id, entity_type, title, subtitle, description, date_display, location, country, continent, culture, image_url, image_license, open_image, source_url, tags, materials, techniques, metadata, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`,
        args: [entityId, String(row.submission_type), String(row.title), row.subtitle ?? null, String(row.description), row.date_display ?? null, row.location ?? null, row.country ?? null, row.continent ?? null, row.culture ?? null, row.image_url ?? null, row.image_license ?? null, row.image_url ? 1 : 0, row.image_source_url ?? null, String(row.tags ?? "[]"), String(row.materials ?? "[]"), String(row.techniques ?? "[]"), JSON.stringify(metadata), reviewer.id, now, now] },
      { sql: `UPDATE submissions SET status = 'approved', reviewer_notes = ?, reviewed_by = ?, reviewed_at = ?, published_entity_id = ?, updated_at = ? WHERE id = ?`, args: [data.notes || null, reviewer.id, now, entityId, now, data.id] },
    ]);
    return { ok: true, entityId };
  });
