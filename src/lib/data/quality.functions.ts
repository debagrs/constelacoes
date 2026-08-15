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
  const { queryOne } = await import("@/lib/turso/client.server");
  await requireReviewer();
  await ensureQualitySchema();

  const totals = await queryOne<{
    total: number;
    published: number;
    unique_images: number;
    published_without_image: number;
    aic_public_domain: number;
    aic_with_image: number;
    aic_without_image: number;
    verified: number;
    needs_review: number;
    quarantined: number;
    suspect_image: number;
    missing_source: number;
    missing_attribution: number;
    missing_technique: number;
    missing_license: number;
  }>(`SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN e.status='published' THEN 1 ELSE 0 END) AS published,
      COUNT(DISTINCT CASE
        WHEN e.status='published' AND e.image_url IS NOT NULL AND trim(e.image_url)<>''
        THEN lower(trim(e.image_url))
      END) AS unique_images,
      SUM(CASE WHEN e.status='published' AND (e.image_url IS NULL OR trim(e.image_url)='') THEN 1 ELSE 0 END) AS published_without_image,
      SUM(CASE WHEN e.status='published' AND e.id LIKE 'aic-%' THEN 1 ELSE 0 END) AS aic_public_domain,
      SUM(CASE WHEN e.status='published' AND e.id LIKE 'aic-%' AND e.image_url IS NOT NULL AND trim(e.image_url)<>'' THEN 1 ELSE 0 END) AS aic_with_image,
      SUM(CASE WHEN e.status='published' AND e.id LIKE 'aic-%' AND (e.image_url IS NULL OR trim(e.image_url)='') THEN 1 ELSE 0 END) AS aic_without_image,
      SUM(CASE WHEN q.quality_status='verified' THEN 1 ELSE 0 END) AS verified,
      SUM(CASE WHEN q.quality_status='needs_review' THEN 1 ELSE 0 END) AS needs_review,
      SUM(CASE WHEN q.quality_status='quarantined' THEN 1 ELSE 0 END) AS quarantined,
      SUM(CASE WHEN e.image_url IS NOT NULL AND trim(e.image_url)<>'' AND (
          e.source_url IS NULL OR trim(e.source_url)='' OR e.open_image=0
          OR lower(COALESCE(e.image_license,'')) LIKE '%uso educacional%'
          OR lower(COALESCE(e.metadata,'')) LIKE '%expansao_%'
        ) THEN 1 ELSE 0 END) AS suspect_image,
      SUM(CASE WHEN e.source_url IS NULL OR trim(e.source_url)='' THEN 1 ELSE 0 END) AS missing_source,
      SUM(CASE WHEN e.entity_type IN ('obra','projeto','fotografia','design','arquitetura','filme','performance')
                AND (e.subtitle IS NULL OR trim(e.subtitle)='') THEN 1 ELSE 0 END) AS missing_attribution,
      SUM(CASE WHEN e.techniques IS NULL OR trim(e.techniques)='' OR trim(e.techniques)='[]' THEN 1 ELSE 0 END) AS missing_technique,
      SUM(CASE WHEN e.image_url IS NOT NULL AND trim(e.image_url)<>''
                AND (e.image_license IS NULL OR trim(e.image_license)='') THEN 1 ELSE 0 END) AS missing_license
    FROM entities e
    LEFT JOIN entity_quality q ON q.entity_id=e.id
    WHERE e.status IN ('published','review')`);

  const duplicateImage = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM (
    SELECT lower(trim(image_url)) image_key
      FROM entities
     WHERE status IN ('published','review') AND image_url IS NOT NULL AND trim(image_url)<>''
     GROUP BY lower(trim(image_url)) HAVING COUNT(*)>1
  )`);
  const duplicateSignature = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total FROM (
    SELECT lower(trim(title)) || '|' || lower(trim(COALESCE(subtitle,''))) || '|' || lower(trim(COALESCE(date_display,''))) signature
      FROM entities
     WHERE status IN ('published','review')
     GROUP BY signature HAVING COUNT(*)>1
  )`);

  const coverage = await Promise.all(
    (Object.entries(COVERAGE) as Array<[CoverageCategory, (typeof COVERAGE)[CoverageCategory]]>).map(
      async ([id, config]) => {
        const documented = await queryOne<{ total: number }>(
          `SELECT COUNT(DISTINCT e.id) AS total
             FROM entities e
             JOIN entity_facets ef ON ef.entity_id=e.id
            WHERE e.status='published' AND ef.facet_id IN (${placeholders(config.facets)})`,
          [...config.facets],
        );

        const searchable = [
          "lower(COALESCE(e.title,''))",
          "lower(COALESCE(e.subtitle,''))",
          "lower(COALESCE(e.description,''))",
          "lower(COALESCE(e.tags,''))",
          "lower(COALESCE(e.themes,''))",
          "lower(COALESCE(e.metadata,''))",
        ];
        const terms = config.terms.slice(0, 24);
        const clauses = terms.map(() => `(${searchable.map((field) => `${field} LIKE ?`).join(" OR ")})`);
        const termArgs: string[] = [];
        for (const term of terms) {
          const like = `%${term.toLowerCase()}%`;
          for (let i = 0; i < searchable.length; i += 1) termArgs.push(like);
        }
        const possible = await queryOne<{ total: number }>(
          `SELECT COUNT(DISTINCT e.id) AS total
             FROM entities e
            WHERE e.status='published'
              AND e.image_url IS NOT NULL AND trim(e.image_url)<>''
              AND (${clauses.join(" OR ")})
              AND NOT EXISTS (
                SELECT 1 FROM entity_facets ef
                 WHERE ef.entity_id=e.id AND ef.facet_id IN (${placeholders(config.facets)})
              )`,
          [...termArgs, ...config.facets],
        );
        const count = Number(documented?.total ?? 0);
        return {
          id,
          label: config.label,
          count,
          target: config.target,
          gap: Math.max(0, config.target - count),
          possibleCandidates: Number(possible?.total ?? 0),
        };
      },
    ),
  );

  return {
    totals: {
      ...totals,
      duplicate_groups: Number(duplicateImage?.total ?? 0) + Number(duplicateSignature?.total ?? 0),
    },
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

    const predicates: Record<QualityIssue, string> = {
      suspect_image: `e.image_url IS NOT NULL AND trim(e.image_url)<>'' AND (
        e.source_url IS NULL OR trim(e.source_url)='' OR e.open_image=0
        OR lower(COALESCE(e.image_license,'')) LIKE '%uso educacional%'
        OR lower(COALESCE(e.metadata,'')) LIKE '%expansao_%'
      )`,
      missing_source: `(e.source_url IS NULL OR trim(e.source_url)='')`,
      missing_attribution: `e.entity_type IN ('obra','projeto','fotografia','design','arquitetura','filme','performance') AND (e.subtitle IS NULL OR trim(e.subtitle)='')`,
      missing_technique: `(e.techniques IS NULL OR trim(e.techniques)='' OR trim(e.techniques)='[]')`,
      missing_license: `e.image_url IS NOT NULL AND trim(e.image_url)<>'' AND (e.image_license IS NULL OR trim(e.image_license)='')`,
    };

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
      quality_status: QualityStatus | null;
      quality_notes: string | null;
    }>(`SELECT e.id, e.entity_type, e.title, e.subtitle, e.date_display, e.country, e.culture,
               e.image_url, e.source_url, e.image_license, e.techniques,
               q.quality_status, q.notes AS quality_notes
          FROM entities e
          LEFT JOIN entity_quality q ON q.entity_id=e.id
         WHERE e.status IN ('published','review') AND ${predicates[data.issue]}
         ORDER BY CASE WHEN q.quality_status='needs_review' THEN 0 ELSE 1 END, e.updated_at DESC
         LIMIT ?`, [data.limit]);
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
  };

  const imageRows = await query<Row>(`WITH dup AS (
      SELECT lower(trim(image_url)) signature
        FROM entities
       WHERE status IN ('published','review') AND image_url IS NOT NULL AND trim(image_url)<>''
       GROUP BY lower(trim(image_url)) HAVING COUNT(*)>1
       LIMIT 30
    )
    SELECT 'image' AS kind, d.signature, e.id, e.title, e.subtitle, e.date_display,
           e.image_url, e.source_url, e.country, e.entity_type
      FROM dup d JOIN entities e ON lower(trim(e.image_url))=d.signature
     ORDER BY d.signature, e.created_at, e.id`);

  const signatureRows = await query<Row>(`WITH base AS (
      SELECT *, lower(trim(title)) || '|' || lower(trim(COALESCE(subtitle,''))) || '|' || lower(trim(COALESCE(date_display,''))) signature
        FROM entities WHERE status IN ('published','review')
    ), dup AS (
      SELECT signature FROM base GROUP BY signature HAVING COUNT(*)>1 LIMIT 30
    )
    SELECT 'signature' AS kind, b.signature, b.id, b.title, b.subtitle, b.date_display,
           b.image_url, b.source_url, b.country, b.entity_type
      FROM base b JOIN dup d ON d.signature=b.signature
     ORDER BY b.signature, b.created_at, b.id`);

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
      { sql: "DELETE FROM relations WHERE source_id=target_id" },
      { sql: `DELETE FROM relations WHERE rowid NOT IN (
          SELECT MIN(rowid) FROM relations
          GROUP BY source_id,target_id,relation_type,COALESCE(description,'')
        )` },
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
    const fields = ["lower(COALESCE(e.title,''))", "lower(COALESCE(e.subtitle,''))", "lower(COALESCE(e.description,''))", "lower(COALESCE(e.tags,''))", "lower(COALESCE(e.themes,''))", "lower(COALESCE(e.metadata,''))"];
    const terms = config.terms.slice(0, 28);
    const clauses = terms.map(() => `(${fields.map((f) => `${f} LIKE ?`).join(" OR ")})`);
    const args: string[] = [];
    for (const term of terms) {
      const like = `%${term.toLowerCase()}%`;
      for (let i = 0; i < fields.length; i += 1) args.push(like);
    }
    args.push(...config.facets);
    return query<{
      id: string; entity_type: string; title: string; subtitle: string | null; description: string | null;
      date_display: string | null; country: string | null; culture: string | null; image_url: string | null;
      source_url: string | null; tags: string; themes: string; metadata: string;
    }>(`SELECT e.id,e.entity_type,e.title,e.subtitle,e.description,e.date_display,e.country,e.culture,
               e.image_url,e.source_url,e.tags,e.themes,e.metadata
          FROM entities e
         WHERE e.status='published' AND e.image_url IS NOT NULL AND trim(e.image_url)<>''
           AND (${clauses.join(" OR ")})
           AND NOT EXISTS (SELECT 1 FROM entity_facets ef WHERE ef.entity_id=e.id AND ef.facet_id IN (${placeholders(config.facets)}))
         ORDER BY e.updated_at DESC LIMIT ?`, [...args, data.limit]);
  });

const ApproveCategoryInput = z.object({ entityId: z.string().min(1), category: z.enum(["women", "indigenous", "black", "lgbtqia", "animalities", "beyond"]) });

export const approveCategoryCandidate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ApproveCategoryInput.parse(d))
  .handler(async ({ data }) => {
    const { requireReviewer } = await import("@/lib/auth/session.server");
    const { batch, nowIso } = await import("@/lib/turso/client.server");
    const reviewer = await requireReviewer();
    await ensureQualitySchema();
    const config = COVERAGE[data.category];
    const now = nowIso();
    await batch([
      { sql: "INSERT OR IGNORE INTO facets(id,kind,name,summary) VALUES (?,?,?,?)", args: [config.primaryFacet, "curadoria", config.label, "Lente curatorial documentada e aprovada manualmente."] },
      { sql: "INSERT OR IGNORE INTO entity_facets(entity_id,facet_id) VALUES (?,?)", args: [data.entityId, config.primaryFacet] },
      { sql: `INSERT INTO entity_quality(entity_id,quality_status,reviewer_id,notes,reviewed_at,updated_at)
              VALUES (?,'verified',?,'Pertinência à lente curatorial confirmada manualmente.',?,?)
              ON CONFLICT(entity_id) DO UPDATE SET reviewer_id=excluded.reviewer_id,
                notes=COALESCE(entity_quality.notes,'') || CASE WHEN entity_quality.notes IS NULL OR entity_quality.notes='' THEN '' ELSE ' · ' END || excluded.notes,
                reviewed_at=excluded.reviewed_at, updated_at=excluded.updated_at`, args: [data.entityId, reviewer.id, now, now] },
    ]);
    return { ok: true };
  });
