/**
 * Auditoria e revisão de integridade do Acervo.
 * Nenhuma heurística altera o acervo automaticamente: ela apenas cria filas para revisão.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type QualityStatus = "unreviewed" | "verified" | "needs_review" | "quarantined";
export type QualityIssue =
  | "suspect_image"
  | "missing_source"
  | "missing_attribution"
  | "missing_technique"
  | "missing_license";

export type CoverageCategory =
  | "women"
  | "indigenous"
  | "black"
  | "lgbtqia"
  | "animalities"
  | "beyond";

const COVERAGE = {
  women: {
    label: "Mulheres e mães",
    target: 1500,
    primaryFacet: "curadoria:mulheres-e-maes",
    facets: [
      "curadoria:mulheres-e-maes",
      "identidade:mulheres",
      "identidade:maes",
      "sensibilidade:maternidade",
      "sensibilidade:feminismos",
    ],
    terms: ["mulher", "mulheres", "women", "woman", "female", "mãe", "mães", "mother", "maternity", "maternidade", "feminist", "feminismo"],
  },
  indigenous: {
    label: "Indígenas",
    target: 1000,
    primaryFacet: "curadoria:indigenas",
    facets: [
      "curadoria:indigenas",
      "identidade:povos-indigenas",
      "sensibilidade:cosmovisao-indigena",
    ],
    terms: ["indígena", "indigena", "indigenous", "aboriginal", "first nations", "native american", "guarani", "yanomami", "mapuche", "quechua", "aymara", "inuit", "maori", "māori", "sámi", "sami"],
  },
  black: {
    label: "Negros e diásporas",
    target: 1000,
    primaryFacet: "curadoria:negros-e-diasporas",
    facets: [
      "curadoria:negros-e-diasporas",
      "identidade:pessoas-negras",
      "identidade:quilombolas",
      "cosmologia:ancestralidade-afro-diasporica",
      "sensibilidade:cosmovisao-africana",
    ],
    terms: ["negro", "negra", "black", "afro", "african diaspora", "afro-diaspora", "afrodiaspora", "quilombo", "quilombola", "yoruba", "iorubá", "bantu", "african-american"],
  },
  lgbtqia: {
    label: "LGBTQIA+",
    target: 600,
    primaryFacet: "curadoria:lgbtqia",
    facets: ["curadoria:lgbtqia", "identidade:lgbtqia"],
    terms: ["lgbt", "lgbtq", "lgbtqia", "queer", "transgender", "transgênero", "gay", "lesbian", "lésbica", "nonbinary", "não binár"],
  },
  animalities: {
    label: "Bioética e animalidades",
    target: 1200,
    primaryFacet: "curadoria:bioetica-e-animalidades",
    facets: [
      "curadoria:bioetica-e-animalidades",
      "sensibilidade:bioetica",
      "sensibilidade:direitos-animais",
      "sensibilidade:animalidades",
      "sensibilidade:mais-que-humano",
      "sensibilidade:multiespecies",
    ],
    terms: ["animal", "animals", "animalidade", "multiespéc", "multiespec", "more-than-human", "mais-que-humano", "umwelt", "gato", "cat", "cão", "dog", "cavalo", "horse", "ave", "bird", "peixe", "fish", "baleia", "whale", "inseto", "insect", "bioart", "bioética", "bioethic"],
  },
  beyond: {
    label: "Além do Antropoceno",
    target: 1200,
    primaryFacet: "curadoria:alem-do-antropoceno",
    facets: [
      "curadoria:alem-do-antropoceno",
      "sensibilidade:alem-do-antropoceno",
      "sensibilidade:antropoceno",
      "sensibilidade:pos-humanismo",
      "sensibilidade:ecologia",
      "sensibilidade:tecnodiversidade",
      "sensibilidade:mais-que-humano",
    ],
    terms: ["anthropocene", "antropoceno", "capitalocene", "plantationocene", "chthulucene", "posthuman", "pós-human", "ecology", "ecologia", "climate", "clima", "forest", "floresta", "ocean", "oceano", "water", "água", "plant", "planta", "fungi", "fungo", "soil", "solo", "pollution", "poluição", "extraction", "extrativ", "cosmotechn", "cosmotécn", "technodiversity", "tecnodiversidade"],
  },
} as const satisfies Record<CoverageCategory, {
  label: string;
  target: number;
  primaryFacet: string;
  facets: readonly string[];
  terms: readonly string[];
}>;

const ISSUE_LABELS: Record<QualityIssue, string> = {
  suspect_image: "Imagem precisa revisão",
  missing_source: "Sem fonte primária",
  missing_attribution: "Sem autoria / atribuição",
  missing_technique: "Sem técnica",
  missing_license: "Sem licença",
};

let qualitySchemaReady = false;

async function ensureQualitySchema() {
  if (qualitySchemaReady) return;
  const { batch } = await import("@/lib/turso/client.server");
  await batch([
    { sql: `CREATE TABLE IF NOT EXISTS facets (id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, summary TEXT)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_facets_kind ON facets(kind)` },
    { sql: `CREATE TABLE IF NOT EXISTS entity_facets (
        entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
        facet_id TEXT NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
        PRIMARY KEY (entity_id, facet_id)
      )` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_entity_facets_facet ON entity_facets(facet_id)` },
    { sql: `CREATE TABLE IF NOT EXISTS entity_quality (
        entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
        quality_status TEXT NOT NULL DEFAULT 'unreviewed'
          CHECK (quality_status IN ('unreviewed','verified','needs_review','quarantined')),
        issues TEXT NOT NULL DEFAULT '[]',
        canonical_entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
        original_status TEXT, reviewer_id TEXT, notes TEXT, reviewed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      )` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_entity_quality_status ON entity_quality(quality_status)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_entity_quality_canonical ON entity_quality(canonical_entity_id)` },
    { sql: `CREATE TABLE IF NOT EXISTS atlas_metrics (key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))` },
    { sql: `CREATE TABLE IF NOT EXISTS atlas_facet_stats (facet_id TEXT PRIMARY KEY, published_count INTEGER NOT NULL DEFAULT 0, with_image_count INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))` },
    { sql: `CREATE TABLE IF NOT EXISTS atlas_quality_issues (entity_id TEXT NOT NULL, issue TEXT NOT NULL, PRIMARY KEY(entity_id,issue))` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_atlas_quality_issues_issue ON atlas_quality_issues(issue,entity_id)` },
    { sql: `CREATE TABLE IF NOT EXISTS entity_facet_candidates (entity_id TEXT NOT NULL, facet_id TEXT NOT NULL, evidence TEXT NOT NULL DEFAULT '[]', PRIMARY KEY(entity_id,facet_id))` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_entity_facet_candidates_facet ON entity_facet_candidates(facet_id,entity_id)` },
    { sql: `CREATE TABLE IF NOT EXISTS entity_dedupe_index (entity_id TEXT PRIMARY KEY, image_key TEXT, signature_key TEXT, is_canonical INTEGER NOT NULL DEFAULT 1)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_entity_dedupe_image ON entity_dedupe_index(image_key,is_canonical,entity_id)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_entity_dedupe_signature ON entity_dedupe_index(signature_key,is_canonical,entity_id)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_entity_dedupe_noncanonical ON entity_dedupe_index(is_canonical,image_key,signature_key)` },
    { sql: `INSERT OR IGNORE INTO facets(id,kind,name,summary) VALUES
      ('curadoria:mulheres-e-maes','curadoria','Mulheres e mães','Lente curatorial documentada.'),
      ('curadoria:indigenas','curadoria','Indígenas','Lente curatorial documentada.'),
      ('curadoria:negros-e-diasporas','curadoria','Negros e diásporas','Lente curatorial documentada.'),
      ('curadoria:lgbtqia','curadoria','LGBTQIA+','Lente curatorial documentada.'),
      ('curadoria:bioetica-e-animalidades','curadoria','Bioética e animalidades','Lente curatorial documentada.'),
      ('curadoria:alem-do-antropoceno','curadoria','Além do Antropoceno','Lente curatorial documentada.'),
      ('sensibilidade:animalidades','sensibilidade','Animalidades','Relações e agências animais.'),
      ('sensibilidade:mais-que-humano','sensibilidade','Mais-que-humano','Agências e relações não humanas.'),
      ('sensibilidade:multiespecies','sensibilidade','Multiespécies','Relações entre espécies.'),
      ('sensibilidade:alem-do-antropoceno','sensibilidade','Além do Antropoceno','Ecologias e perspectivas pós-humanas.')` },
  ]);
  qualitySchemaReady = true;
}

function placeholders(values: readonly unknown[]) {
  return values.map(() => "?").join(",");
}

export const getQualityDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { requireReviewer } = await import("@/lib/auth/session.server");
  const { query } = await import("@/lib/turso/client.server");
  await requireReviewer();
  await ensureQualitySchema();

  const metricKeys = [
    "total_records", "published", "unique_images", "published_without_image",
    "aic_public_domain", "aic_with_image", "aic_without_image",
    "verified", "needs_review", "quarantined",
    "suspect_image", "missing_source", "missing_attribution", "missing_technique", "missing_license",
    "duplicate_groups",
    ...Object.values(COVERAGE).map((config) => `candidate:${config.primaryFacet}`),
  ];
  const metricPlaceholders = metricKeys.map(() => "?").join(",");
  const metricRows = await query<{ key: string; value: number }>(
    `SELECT key,value FROM atlas_metrics WHERE key IN (${metricPlaceholders})`,
    metricKeys,
  );
  const metrics = new Map(metricRows.map((row) => [row.key, Number(row.value ?? 0)]));

  const primaryFacets = (Object.values(COVERAGE) as Array<(typeof COVERAGE)[CoverageCategory]>).map((config) => config.primaryFacet);
  const facetRows = await query<{ facet_id: string; published_count: number; with_image_count: number }>(
    `SELECT facet_id,published_count,with_image_count
       FROM atlas_facet_stats
      WHERE facet_id IN (${primaryFacets.map(() => "?").join(",")})`,
    primaryFacets,
  );
  const facetStats = new Map(facetRows.map((row) => [row.facet_id, row]));

  const coverage = (Object.entries(COVERAGE) as Array<[CoverageCategory, (typeof COVERAGE)[CoverageCategory]]>).map(
    ([id, config]) => {
      const count = Number(facetStats.get(config.primaryFacet)?.published_count ?? 0);
      return {
        id,
        label: config.label,
        count,
        target: config.target,
        gap: Math.max(0, config.target - count),
        possibleCandidates: Number(metrics.get(`candidate:${config.primaryFacet}`) ?? 0),
      };
    },
  );

  return {
    totals: {
      total: Number(metrics.get("total_records") ?? 0),
      published: Number(metrics.get("published") ?? 0),
      unique_images: Number(metrics.get("unique_images") ?? 0),
      published_without_image: Number(metrics.get("published_without_image") ?? 0),
      aic_public_domain: Number(metrics.get("aic_public_domain") ?? 0),
      aic_with_image: Number(metrics.get("aic_with_image") ?? 0),
      aic_without_image: Number(metrics.get("aic_without_image") ?? 0),
      verified: Number(metrics.get("verified") ?? 0),
      needs_review: Number(metrics.get("needs_review") ?? 0),
      quarantined: Number(metrics.get("quarantined") ?? 0),
      suspect_image: Number(metrics.get("suspect_image") ?? 0),
      missing_source: Number(metrics.get("missing_source") ?? 0),
      missing_attribution: Number(metrics.get("missing_attribution") ?? 0),
      missing_technique: Number(metrics.get("missing_technique") ?? 0),
      missing_license: Number(metrics.get("missing_license") ?? 0),
      duplicate_groups: Number(metrics.get("duplicate_groups") ?? 0),
    },
    statsReady: metricRows.length > 0,
    issueLabels: ISSUE_LABELS,
    coverage,
  };
});

const IssueInput = z.object({ issue: z.enum(["suspect_image", "missing_source", "missing_attribution", "missing_technique", "missing_license"]), limit: z.number().int().min(1).max(100).default(40) });

export const listQualityIssues = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => IssueInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { query } = await import("@/lib/turso/client.server");
    await requireReviewer();
    await ensureQualitySchema();

    return query<{
      id: string;
      entity_type: string;
      title: string;
      subtitle: string | null;
      date_display: string | null;
      country: string | null;
      culture: string | null;
      image_url: string | null;
      source_url: string | null;
      image_license: string | null;
      techniques: string;
      metadata: string;
      quality_status: QualityStatus | null;
      quality_notes: string | null;
    }>(`SELECT e.id,e.entity_type,e.title,e.subtitle,e.date_display,e.country,e.culture,
               e.image_url,e.source_url,e.image_license,e.techniques,e.metadata,
               q.quality_status,q.notes AS quality_notes
          FROM atlas_quality_issues qi
          JOIN entities e ON e.id=qi.entity_id
          LEFT JOIN entity_quality q ON q.entity_id=e.id
         WHERE qi.issue=? AND e.status IN ('published','review')
           AND COALESCE(q.quality_status,'unreviewed') IN ('unreviewed','needs_review')
         ORDER BY CASE WHEN q.quality_status='needs_review' THEN 0 ELSE 1 END,e.updated_at DESC
         LIMIT ?`, [data.issue, data.limit]);
  });

const SearchQualityInput = z.object({
  query: z.string().trim().min(2).max(120),
  limit: z.number().int().min(1).max(50).default(24),
});

export const searchQualityEntities = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SearchQualityInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { query } = await import("@/lib/turso/client.server");
    await requireReviewer();
    await ensureQualitySchema();
    const term = `%${data.query.replace(/[%_]/g, "").toLowerCase()}%`;
    return query<{
      id: string; entity_type: string; title: string; subtitle: string | null;
      date_display: string | null; country: string | null; culture: string | null;
      image_url: string | null; source_url: string | null; image_license: string | null;
      techniques: string; metadata: string; quality_status: QualityStatus | null;
      quality_notes: string | null;
    }>(`SELECT e.id,e.entity_type,e.title,e.subtitle,e.date_display,e.country,e.culture,
               e.image_url,e.source_url,e.image_license,e.techniques,e.metadata,
               q.quality_status,q.notes AS quality_notes
          FROM entities e
          LEFT JOIN entity_quality q ON q.entity_id=e.id
         WHERE e.status IN ('published','review')
           AND (lower(e.title) LIKE ? OR lower(COALESCE(e.subtitle,'')) LIKE ?
             OR lower(COALESCE(e.culture,'')) LIKE ? OR lower(COALESCE(e.country,'')) LIKE ?)
         ORDER BY CASE WHEN lower(e.title)=lower(?) THEN 0 ELSE 1 END,
                  e.title COLLATE NOCASE ASC
         LIMIT ?`, [term, term, term, term, data.query, data.limit]);
  });

const SetEntityImageInput = z.object({
  entityId: z.string().min(1),
  imageUrl: z.string().trim().url("Cole uma URL de imagem válida.").refine(
    (value) => value.startsWith("https://") || value.startsWith("http://"),
    "A URL precisa começar com http:// ou https://.",
  ),
});

export const setEntityImageUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SetEntityImageInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { execute, queryOne, nowIso } = await import("@/lib/turso/client.server");
    const reviewer = await requireReviewer();
    await ensureQualitySchema();
    const entity = await queryOne<{ id: string }>("SELECT id FROM entities WHERE id=?", [data.entityId]);
    if (!entity) throw new Error("Registro não encontrado.");
    const now = nowIso();
    await execute(
      `UPDATE entities
          SET image_url=?, open_image=1, updated_at=?
        WHERE id=?`,
      [data.imageUrl, now, data.entityId],
    );
    await execute(
      `INSERT INTO entity_quality(entity_id,quality_status,reviewer_id,notes,reviewed_at,updated_at)
       VALUES (?,'needs_review',?,'Imagem inserida manualmente por URL; conferir fonte e licença.',?,?)
       ON CONFLICT(entity_id) DO UPDATE SET reviewer_id=excluded.reviewer_id,
         notes=excluded.notes,reviewed_at=excluded.reviewed_at,updated_at=excluded.updated_at`,
      [data.entityId, reviewer.id, now, now],
    );
    return { ok: true };
  });

export const listDuplicateGroups = createServerFn({ method: "GET" }).handler(async () => {
  const { requireReviewer } = await import("@/lib/auth/session.server");
  const { query } = await import("@/lib/turso/client.server");
  await requireReviewer();
  await ensureQualitySchema();

  type Row = {
    kind: "image" | "signature";
    signature: string;
    id: string;
    title: string;
    subtitle: string | null;
    date_display: string | null;
    image_url: string | null;
    source_url: string | null;
    country: string | null;
    entity_type: string;
    metadata: string;
  };

  const imageRows = await query<Row>(`WITH keys AS (
      SELECT DISTINCT image_key AS signature
        FROM entity_dedupe_index
       WHERE is_canonical=0 AND image_key IS NOT NULL AND image_key<>''
       LIMIT 30
    )
    SELECT 'image' AS kind,k.signature,e.id,e.title,e.subtitle,e.date_display,
           e.image_url,e.source_url,e.country,e.entity_type,e.metadata
      FROM keys k
      JOIN entity_dedupe_index di ON di.image_key=k.signature
      JOIN entities e ON e.id=di.entity_id
     ORDER BY k.signature,di.is_canonical DESC,e.id`);

  const signatureRows = await query<Row>(`WITH keys AS (
      SELECT DISTINCT signature_key AS signature
        FROM entity_dedupe_index
       WHERE is_canonical=0 AND (image_key IS NULL OR image_key='')
         AND signature_key IS NOT NULL AND signature_key<>''
       LIMIT 30
    )
    SELECT 'signature' AS kind,k.signature,e.id,e.title,e.subtitle,e.date_display,
           e.image_url,e.source_url,e.country,e.entity_type,e.metadata
      FROM keys k
      JOIN entity_dedupe_index di ON di.signature_key=k.signature
      JOIN entities e ON e.id=di.entity_id
     ORDER BY k.signature,di.is_canonical DESC,e.id`);

  const groups = new Map<string, { kind: "image" | "signature"; signature: string; entities: Row[] }>();
  for (const row of [...imageRows, ...signatureRows]) {
    const key = `${row.kind}:${row.signature}`;
    const group = groups.get(key) ?? { kind: row.kind, signature: row.signature, entities: [] };
    if (!group.entities.some((item) => item.id === row.id)) group.entities.push(row);
    groups.set(key, group);
  }
  return Array.from(groups.values()).filter((group) => group.entities.length > 1);
});

const SetStatusInput = z.object({ entityId: z.string().min(1), status: z.enum(["verified", "needs_review", "quarantined"]), notes: z.string().max(2000).optional() });

export const setEntityQualityStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SetStatusInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, batch, nowIso } = await import("@/lib/turso/client.server");
    const reviewer = await requireReviewer();
    await ensureQualitySchema();
    const entity = await queryOne<{ status: string }>("SELECT status FROM entities WHERE id=?", [data.entityId]);
    if (!entity) throw new Error("Registro não encontrado.");
    const previous = await queryOne<{ quality_status: QualityStatus; original_status: string | null }>("SELECT quality_status, original_status FROM entity_quality WHERE entity_id=?", [data.entityId]);
    const now = nowIso();
    const originalStatus = previous?.original_status ?? entity.status;
    const statements = [
      {
        sql: `INSERT INTO entity_quality (entity_id, quality_status, original_status, reviewer_id, notes, reviewed_at, updated_at)
              VALUES (?,?,?,?,?,?,?)
              ON CONFLICT(entity_id) DO UPDATE SET quality_status=excluded.quality_status,
                original_status=COALESCE(entity_quality.original_status, excluded.original_status),
                reviewer_id=excluded.reviewer_id, notes=excluded.notes,
                reviewed_at=excluded.reviewed_at, updated_at=excluded.updated_at`,
        args: [data.entityId, data.status, originalStatus, reviewer.id, data.notes ?? null, now, now],
      },
    ];
    if (data.status === "quarantined") {
      statements.push({ sql: "UPDATE entities SET status='review', updated_at=? WHERE id=?", args: [now, data.entityId] });
    } else if (previous?.quality_status === "quarantined") {
      statements.push({ sql: "UPDATE entities SET status=?, updated_at=? WHERE id=?", args: [previous.original_status ?? "published", now, data.entityId] });
    }
    if (previous?.quality_status && previous.quality_status !== data.status) {
      statements.push({ sql: "UPDATE atlas_metrics SET value=MAX(0,value-1),updated_at=? WHERE key=?", args: [now, previous.quality_status] });
    }
    if (previous?.quality_status !== data.status) {
      statements.push({ sql: `INSERT INTO atlas_metrics(key,value,updated_at) VALUES (?,1,?)
        ON CONFLICT(key) DO UPDATE SET value=atlas_metrics.value+1,updated_at=excluded.updated_at`, args: [data.status, now] });
    }
    await batch(statements);
    return { ok: true };
  });

const MergeInput = z.object({ canonicalId: z.string().min(1), duplicateId: z.string().min(1) }).refine((d) => d.canonicalId !== d.duplicateId, "Os registros devem ser diferentes.");

export const mergeDuplicateEntities = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MergeInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, batch, nowIso } = await import("@/lib/turso/client.server");
    const reviewer = await requireReviewer();
    await ensureQualitySchema();
    const canonical = await queryOne<{ id: string }>("SELECT id FROM entities WHERE id=?", [data.canonicalId]);
    const duplicate = await queryOne<{ id: string }>("SELECT id FROM entities WHERE id=?", [data.duplicateId]);
    if (!canonical || !duplicate) throw new Error("Um dos registros não existe mais.");
    const now = nowIso();

    await batch([
      { sql: `UPDATE entities SET
          subtitle=COALESCE(NULLIF(subtitle,''),(SELECT subtitle FROM entities WHERE id=?)),
          description=COALESCE(NULLIF(description,''),(SELECT description FROM entities WHERE id=?)),
          date_start=COALESCE(date_start,(SELECT date_start FROM entities WHERE id=?)),
          date_end=COALESCE(date_end,(SELECT date_end FROM entities WHERE id=?)),
          date_display=COALESCE(NULLIF(date_display,''),(SELECT date_display FROM entities WHERE id=?)),
          location=COALESCE(NULLIF(location,''),(SELECT location FROM entities WHERE id=?)),
          country=COALESCE(NULLIF(country,''),(SELECT country FROM entities WHERE id=?)),
          continent=COALESCE(NULLIF(continent,''),(SELECT continent FROM entities WHERE id=?)),
          culture=COALESCE(NULLIF(culture,''),(SELECT culture FROM entities WHERE id=?)),
          image_url=COALESCE(NULLIF(image_url,''),(SELECT image_url FROM entities WHERE id=?)),
          image_license=COALESCE(NULLIF(image_license,''),(SELECT image_license FROM entities WHERE id=?)),
          source_url=COALESCE(NULLIF(source_url,''),(SELECT source_url FROM entities WHERE id=?)),
          tags=CASE WHEN tags IS NULL OR trim(tags)='' OR trim(tags)='[]' THEN (SELECT tags FROM entities WHERE id=?) ELSE tags END,
          themes=CASE WHEN themes IS NULL OR trim(themes)='' OR trim(themes)='[]' THEN (SELECT themes FROM entities WHERE id=?) ELSE themes END,
          materials=CASE WHEN materials IS NULL OR trim(materials)='' OR trim(materials)='[]' THEN (SELECT materials FROM entities WHERE id=?) ELSE materials END,
          techniques=CASE WHEN techniques IS NULL OR trim(techniques)='' OR trim(techniques)='[]' THEN (SELECT techniques FROM entities WHERE id=?) ELSE techniques END,
          metadata=CASE WHEN metadata IS NULL OR trim(metadata)='' OR trim(metadata)='{}' THEN (SELECT metadata FROM entities WHERE id=?) ELSE metadata END,
          updated_at=? WHERE id=?`,
        args: Array(17).fill(data.duplicateId).concat([now, data.canonicalId]) },
      { sql: "INSERT OR IGNORE INTO entity_motifs(entity_id,motif_id) SELECT ?,motif_id FROM entity_motifs WHERE entity_id=?", args: [data.canonicalId, data.duplicateId] },
      { sql: "DELETE FROM entity_motifs WHERE entity_id=?", args: [data.duplicateId] },
      { sql: "INSERT OR IGNORE INTO entity_bibliography(entity_id,bibliography_id) SELECT ?,bibliography_id FROM entity_bibliography WHERE entity_id=?", args: [data.canonicalId, data.duplicateId] },
      { sql: "DELETE FROM entity_bibliography WHERE entity_id=?", args: [data.duplicateId] },
      { sql: "INSERT OR IGNORE INTO entity_facets(entity_id,facet_id) SELECT ?,facet_id FROM entity_facets WHERE entity_id=?", args: [data.canonicalId, data.duplicateId] },
      { sql: "DELETE FROM entity_facets WHERE entity_id=?", args: [data.duplicateId] },
      { sql: "UPDATE atlas_cards SET entity_id=? WHERE entity_id=?", args: [data.canonicalId, data.duplicateId] },
      { sql: "UPDATE image_suggestions SET entity_id=? WHERE entity_id=?", args: [data.canonicalId, data.duplicateId] },
      { sql: "UPDATE submissions SET published_entity_id=? WHERE published_entity_id=?", args: [data.canonicalId, data.duplicateId] },
      { sql: "UPDATE ai_proposals SET target_id=? WHERE target_id=? AND target_type IN ('entity','entidade','obra','artista')", args: [data.canonicalId, data.duplicateId] },
      { sql: "UPDATE relations SET source_id=? WHERE source_id=?", args: [data.canonicalId, data.duplicateId] },
      { sql: "UPDATE relations SET target_id=? WHERE target_id=?", args: [data.canonicalId, data.duplicateId] },
      { sql: "DELETE FROM relations WHERE source_id=target_id AND (source_id=? OR target_id=?)", args: [data.canonicalId, data.canonicalId] },
      { sql: `DELETE FROM relations
               WHERE (source_id=? OR target_id=?)
                 AND EXISTS (
                   SELECT 1 FROM relations keep
                    WHERE keep.rowid < relations.rowid
                      AND keep.source_id=relations.source_id
                      AND keep.target_id=relations.target_id
                      AND keep.relation_type=relations.relation_type
                      AND COALESCE(keep.description,'')=COALESCE(relations.description,'')
                 )`, args: [data.canonicalId, data.canonicalId] },
      { sql: "UPDATE entity_quality SET canonical_entity_id=? WHERE canonical_entity_id=?", args: [data.canonicalId, data.duplicateId] },
      { sql: "DELETE FROM entity_quality WHERE entity_id=?", args: [data.duplicateId] },
      { sql: "DELETE FROM entities WHERE id=?", args: [data.duplicateId] },
      { sql: `INSERT INTO entity_quality(entity_id,quality_status,canonical_entity_id,reviewer_id,notes,reviewed_at,updated_at)
              VALUES (?,'verified',?,?,'Registro canônico após fusão manual de duplicata.',?,?)
              ON CONFLICT(entity_id) DO UPDATE SET quality_status='verified', canonical_entity_id=excluded.canonical_entity_id,
                reviewer_id=excluded.reviewer_id, notes=excluded.notes, reviewed_at=excluded.reviewed_at, updated_at=excluded.updated_at`,
        args: [data.canonicalId, data.canonicalId, reviewer.id, now, now] },
    ]);
    return { ok: true };
  });

const CategoryInput = z.object({ category: z.enum(["women", "indigenous", "black", "lgbtqia", "animalities", "beyond"]), limit: z.number().int().min(1).max(100).default(40) });

export const listCategoryCandidates = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CategoryInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { query } = await import("@/lib/turso/client.server");
    await requireReviewer();
    await ensureQualitySchema();
    const config = COVERAGE[data.category];
    return query<{
      id: string; entity_type: string; title: string; subtitle: string | null; description: string | null;
      date_display: string | null; country: string | null; culture: string | null; image_url: string | null;
      source_url: string | null; tags: string; themes: string; metadata: string;
    }>(`SELECT e.id,e.entity_type,e.title,e.subtitle,e.description,e.date_display,e.country,e.culture,
               e.image_url,e.source_url,e.tags,e.themes,e.metadata
          FROM entity_facet_candidates c
          JOIN entities e ON e.id=c.entity_id
         WHERE c.facet_id=? AND e.status='published'
           AND e.image_url IS NOT NULL AND trim(e.image_url)<>''
         ORDER BY e.updated_at DESC
         LIMIT ?`, [config.primaryFacet, data.limit]);
  });

const ApproveCategoryInput = z.object({ entityId: z.string().min(1), category: z.enum(["women", "indigenous", "black", "lgbtqia", "animalities", "beyond"]) });

export const approveCategoryCandidate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ApproveCategoryInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { queryOne, batch, nowIso } = await import("@/lib/turso/client.server");
    const reviewer = await requireReviewer();
    await ensureQualitySchema();
    const config = COVERAGE[data.category];
    const now = nowIso();
    const existing = await queryOne<{ entity_id: string }>(
      "SELECT entity_id FROM entity_facets WHERE entity_id=? AND facet_id=?",
      [data.entityId, config.primaryFacet],
    );
    const entity = await queryOne<{ status: string; image_url: string | null }>(
      "SELECT status,image_url FROM entities WHERE id=?",
      [data.entityId],
    );
    if (!entity) throw new Error("Registro não encontrado.");
    const statements = [
      { sql: "INSERT OR IGNORE INTO facets(id,kind,name,summary) VALUES (?,?,?,?)", args: [config.primaryFacet, "curadoria", config.label, "Lente curatorial documentada e aprovada manualmente."] },
      { sql: "INSERT OR IGNORE INTO entity_facets(entity_id,facet_id) VALUES (?,?)", args: [data.entityId, config.primaryFacet] },
      { sql: "DELETE FROM entity_facet_candidates WHERE entity_id=? AND facet_id=?", args: [data.entityId, config.primaryFacet] },
      { sql: "UPDATE atlas_metrics SET value=MAX(0,value-1),updated_at=? WHERE key=?", args: [now, `candidate:${config.primaryFacet}`] },
      { sql: `INSERT INTO entity_quality(entity_id,quality_status,reviewer_id,notes,reviewed_at,updated_at)
              VALUES (?,'verified',?,'Pertinência à lente curatorial confirmada manualmente.',?,?)
              ON CONFLICT(entity_id) DO UPDATE SET reviewer_id=excluded.reviewer_id,
                notes=COALESCE(entity_quality.notes,'') || CASE WHEN entity_quality.notes IS NULL OR entity_quality.notes='' THEN '' ELSE ' · ' END || excluded.notes,
                reviewed_at=excluded.reviewed_at, updated_at=excluded.updated_at`, args: [data.entityId, reviewer.id, now, now] },
    ];
    if (!existing && entity.status === "published") {
      const hasImage = Boolean(entity.image_url?.trim());
      statements.push({
        sql: `INSERT INTO atlas_facet_stats(facet_id,published_count,with_image_count,updated_at) VALUES (?,?,?,?)
              ON CONFLICT(facet_id) DO UPDATE SET
                published_count=atlas_facet_stats.published_count+1,
                with_image_count=atlas_facet_stats.with_image_count+excluded.with_image_count,
                updated_at=excluded.updated_at`,
        args: [config.primaryFacet, 1, hasImage ? 1 : 0, now],
      });
    }
    await batch(statements);
    return { ok: true };
  });
