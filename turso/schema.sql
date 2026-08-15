-- Atlas Planetário — esquema Turso (libSQL / SQLite)
-- Traduzido do Postgres: uuid -> TEXT, jsonb/arrays -> TEXT(JSON),
-- timestamptz -> TEXT (ISO 8601 UTC), boolean -> INTEGER (0/1).
-- Enums viram TEXT + CHECK. Sem RLS: autorização é feita nas server functions.

PRAGMA foreign_keys = ON;

------------------------------------------------------------------ auth
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  password_hash  TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id           TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio          TEXT,
  avatar_url   TEXT,
  institution  TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin','curador','professor','estudante')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, role)
);

------------------------------------------------------------------ acervo
CREATE TABLE IF NOT EXISTS entities (
  id            TEXT PRIMARY KEY,
  entity_type   TEXT NOT NULL,
  title         TEXT NOT NULL,
  slug          TEXT,
  subtitle      TEXT,
  description   TEXT,
  date_start    INTEGER,
  date_end      INTEGER,
  date_display  TEXT,
  location      TEXT,
  country       TEXT,
  continent     TEXT,
  culture       TEXT,
  image_url     TEXT,
  image_license TEXT,
  open_image    INTEGER NOT NULL DEFAULT 0,
  source_url    TEXT,
  tags          TEXT NOT NULL DEFAULT '[]',
  themes        TEXT NOT NULL DEFAULT '[]',
  colors        TEXT NOT NULL DEFAULT '[]',
  materials     TEXT NOT NULL DEFAULT '[]',
  techniques    TEXT NOT NULL DEFAULT '[]',
  metadata      TEXT NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  created_by    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);
CREATE INDEX IF NOT EXISTS idx_entities_date ON entities(date_start);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_slug ON entities(slug) WHERE slug IS NOT NULL;

-- Busca textual (PT) substituindo o full-text do Postgres.
CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
  title, subtitle, description, culture, country,
  content='entities', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS entities_fts_ai AFTER INSERT ON entities BEGIN
  INSERT INTO entities_fts(rowid, title, subtitle, description, culture, country)
  VALUES (new.rowid, new.title, coalesce(new.subtitle,''), coalesce(new.description,''), coalesce(new.culture,''), coalesce(new.country,''));
END;

CREATE TRIGGER IF NOT EXISTS entities_fts_ad AFTER DELETE ON entities BEGIN
  INSERT INTO entities_fts(entities_fts, rowid, title, subtitle, description, culture, country)
  VALUES ('delete', old.rowid, old.title, coalesce(old.subtitle,''), coalesce(old.description,''), coalesce(old.culture,''), coalesce(old.country,''));
END;

CREATE TRIGGER IF NOT EXISTS entities_fts_au AFTER UPDATE ON entities BEGIN
  INSERT INTO entities_fts(entities_fts, rowid, title, subtitle, description, culture, country)
  VALUES ('delete', old.rowid, old.title, coalesce(old.subtitle,''), coalesce(old.description,''), coalesce(old.culture,''), coalesce(old.country,''));
  INSERT INTO entities_fts(rowid, title, subtitle, description, culture, country)
  VALUES (new.rowid, new.title, coalesce(new.subtitle,''), coalesce(new.description,''), coalesce(new.culture,''), coalesce(new.country,''));
END;

CREATE TABLE IF NOT EXISTS motifs (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT,
  description TEXT,
  image_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS entity_motifs (
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  motif_id  TEXT NOT NULL REFERENCES motifs(id) ON DELETE CASCADE,
  PRIMARY KEY (entity_id, motif_id)
);

CREATE TABLE IF NOT EXISTS relations (
  id            TEXT PRIMARY KEY,
  source_id     TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_id     TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  description   TEXT,
  author        TEXT,
  confidence    REAL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  created_by    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);

CREATE TABLE IF NOT EXISTS bibliography (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  authors    TEXT,
  year       INTEGER,
  ref_type   TEXT,
  doi        TEXT,
  isbn       TEXT,
  url        TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS entity_bibliography (
  entity_id       TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  bibliography_id TEXT NOT NULL REFERENCES bibliography(id) ON DELETE CASCADE,
  PRIMARY KEY (entity_id, bibliography_id)
);

CREATE TABLE IF NOT EXISTS relation_bibliography (
  relation_id     TEXT NOT NULL REFERENCES relations(id) ON DELETE CASCADE,
  bibliography_id TEXT NOT NULL REFERENCES bibliography(id) ON DELETE CASCADE,
  PRIMARY KEY (relation_id, bibliography_id)
);

------------------------------------------------------------------ atlas
CREATE TABLE IF NOT EXISTS atlases (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT 'Novo Atlas',
  description TEXT,
  cover_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  is_public   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_atlases_owner ON atlases(owner_id);

CREATE TABLE IF NOT EXISTS atlas_groups (
  id         TEXT PRIMARY KEY,
  atlas_id   TEXT NOT NULL REFERENCES atlases(id) ON DELETE CASCADE,
  title      TEXT,
  color      TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS atlas_cards (
  id         TEXT PRIMARY KEY,
  atlas_id   TEXT NOT NULL REFERENCES atlases(id) ON DELETE CASCADE,
  card_type  TEXT NOT NULL,
  entity_id  TEXT REFERENCES entities(id) ON DELETE SET NULL,
  group_id   TEXT REFERENCES atlas_groups(id) ON DELETE SET NULL,
  title      TEXT,
  body       TEXT,
  media_url  TEXT,
  link_url   TEXT,
  x          REAL NOT NULL DEFAULT 0,
  y          REAL NOT NULL DEFAULT 0,
  width      REAL NOT NULL DEFAULT 240,
  height     REAL NOT NULL DEFAULT 300,
  rotation   REAL NOT NULL DEFAULT 0,
  z_index    INTEGER NOT NULL DEFAULT 0,
  style      TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_atlas_cards_atlas ON atlas_cards(atlas_id);

CREATE TABLE IF NOT EXISTS atlas_connections (
  id             TEXT PRIMARY KEY,
  atlas_id       TEXT NOT NULL REFERENCES atlases(id) ON DELETE CASCADE,
  source_card_id TEXT NOT NULL REFERENCES atlas_cards(id) ON DELETE CASCADE,
  target_card_id TEXT NOT NULL REFERENCES atlas_cards(id) ON DELETE CASCADE,
  relation_type  TEXT,
  argument       TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_atlas_connections_atlas ON atlas_connections(atlas_id);

------------------------------------------------------------------ curadoria
CREATE TABLE IF NOT EXISTS curation_reviews (
  id          TEXT PRIMARY KEY,
  atlas_id    TEXT REFERENCES atlases(id) ON DELETE CASCADE,
  reviewer_id TEXT,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  comment     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS image_suggestions (
  id                    TEXT PRIMARY KEY,
  entity_id             TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  rank                  INTEGER NOT NULL DEFAULT 1,
  image_url             TEXT NOT NULL,
  thumbnail_url         TEXT,
  source_url            TEXT,
  wikidata_qid          TEXT,
  candidate_title       TEXT,
  candidate_description TEXT,
  license               TEXT,
  score                 REAL,
  status                TEXT NOT NULL DEFAULT 'pending',
  reviewed_by           TEXT,
  reviewed_at           TEXT,
  notes                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_image_suggestions_status ON image_suggestions(status);

------------------------------------------------------------------ IA
CREATE TABLE IF NOT EXISTS ai_proposals (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  target_type   TEXT NOT NULL,
  target_id     TEXT NOT NULL,
  proposal_type TEXT NOT NULL,
  payload       TEXT NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'pending',
  review_notes  TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS ai_decisions (
  id          TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES ai_proposals(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  action      TEXT NOT NULL,
  diff        TEXT NOT NULL DEFAULT '{}',
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

------------------------------------------------------------------ educação
CREATE TABLE IF NOT EXISTS classes (
  id           TEXT PRIMARY KEY,
  professor_id TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  code         TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS class_enrollments (
  id         TEXT PRIMARY KEY,
  class_id   TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id         TEXT PRIMARY KEY,
  class_id   TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  prompt     TEXT,
  due_at     TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

------------------------------------------------------------------ contribuições públicas moderadas
CREATE TABLE IF NOT EXISTS submissions (
  id                 TEXT PRIMARY KEY,
  submission_type    TEXT NOT NULL CHECK (submission_type IN ('obra','artista','projeto','movimento','conceito','objeto','arquitetura','design','performance','fotografia','filme','jogo','interface','outro')),
  title              TEXT NOT NULL,
  artist_name        TEXT,
  subtitle           TEXT,
  description        TEXT NOT NULL,
  date_display       TEXT,
  location           TEXT,
  country            TEXT,
  continent          TEXT,
  culture            TEXT,
  image_url          TEXT,
  image_source_url   TEXT,
  image_license      TEXT,
  source_urls        TEXT NOT NULL DEFAULT '[]',
  tags               TEXT NOT NULL DEFAULT '[]',
  materials          TEXT NOT NULL DEFAULT '[]',
  techniques         TEXT NOT NULL DEFAULT '[]',
  sensitive_metadata TEXT NOT NULL DEFAULT '{}',
  poetic_metadata    TEXT NOT NULL DEFAULT '{}',
  submitter_name     TEXT NOT NULL,
  submitter_email    TEXT NOT NULL,
  submitter_relation TEXT,
  consent_publication INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','needs_changes')),
  reviewer_notes     TEXT,
  reviewed_by        TEXT,
  reviewed_at        TEXT,
  published_entity_id TEXT,
  created_by         TEXT,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(submitter_email);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at);

-- Índices de leitura para o acervo ampliado (não apagam nem alteram registros).
CREATE INDEX IF NOT EXISTS idx_entities_image_url ON entities(image_url);
CREATE INDEX IF NOT EXISTS idx_entities_status_type ON entities(status, entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_status_continent ON entities(status, continent);


------------------------------------------------------------------ integridade curatorial do acervo
-- Esta camada NÃO apaga registros automaticamente. Ela registra revisão humana,
-- permite quarentena reversível e sustenta as lentes curatoriais documentadas.
CREATE TABLE IF NOT EXISTS facets (
  id      TEXT PRIMARY KEY,
  kind    TEXT NOT NULL,
  name    TEXT NOT NULL,
  summary TEXT
);
CREATE INDEX IF NOT EXISTS idx_facets_kind ON facets(kind);

CREATE TABLE IF NOT EXISTS entity_facets (
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  facet_id  TEXT NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  PRIMARY KEY (entity_id, facet_id)
);
CREATE INDEX IF NOT EXISTS idx_entity_facets_facet ON entity_facets(facet_id);

CREATE TABLE IF NOT EXISTS entity_quality (
  entity_id           TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  quality_status      TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (quality_status IN ('unreviewed','verified','needs_review','quarantined')),
  issues              TEXT NOT NULL DEFAULT '[]',
  canonical_entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
  original_status     TEXT,
  reviewer_id         TEXT,
  notes               TEXT,
  reviewed_at         TEXT,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_entity_quality_status ON entity_quality(quality_status);
CREATE INDEX IF NOT EXISTS idx_entity_quality_canonical ON entity_quality(canonical_entity_id);

-- Lentes curatoriais: indicam pertinência ao recorte, não inferem identidade do artista.
INSERT OR IGNORE INTO facets (id, kind, name, summary) VALUES
  ('curadoria:mulheres-e-maes', 'curadoria', 'Mulheres e mães', 'Lente curatorial documentada para genealogias femininas, maternidades, cuidado e produção de mulheres.'),
  ('curadoria:indigenas', 'curadoria', 'Indígenas', 'Lente curatorial documentada para produções, povos, cosmologias, territórios e questões indígenas.'),
  ('curadoria:negros-e-diasporas', 'curadoria', 'Negros e diásporas', 'Lente curatorial documentada para produções negras, afro-diaspóricas, quilombolas e relações correlatas.'),
  ('curadoria:lgbtqia', 'curadoria', 'LGBTQIA+', 'Lente curatorial documentada para produções e questões LGBTQIA+.'),
  ('curadoria:bioetica-e-animalidades', 'curadoria', 'Bioética e animalidades', 'Lente para bioética, animalidades, relações multiespécies e mais-que-humano.'),
  ('curadoria:alem-do-antropoceno', 'curadoria', 'Além do Antropoceno', 'Lente para ecologias, pós-humanismos, plantas, fungos, clima, água, materialidades e cosmotécnicas.'),
  ('sensibilidade:animalidades', 'sensibilidade', 'Animalidades', 'Relações entre humanos e outros animais, representação, percepção e agência animal.'),
  ('sensibilidade:mais-que-humano', 'sensibilidade', 'Mais-que-humano', 'Relações multiespécies, ecologias e agências não humanas.'),
  ('sensibilidade:multiespecies', 'sensibilidade', 'Multiespécies', 'Coexistências e relações entre espécies.'),
  ('sensibilidade:alem-do-antropoceno', 'sensibilidade', 'Além do Antropoceno', 'Perspectivas ecológicas, pós-humanas e cosmotécnicas para além do excepcionalismo humano.');
