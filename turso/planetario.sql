-- Atlas Planetário — camada planetária (regiões, sensibilidades, identidades, povos)
-- Executada por turso/seed-planetario.ts

CREATE TABLE IF NOT EXISTS regions (
  id         TEXT PRIMARY KEY,
  parent_id  TEXT REFERENCES regions(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  continent  TEXT NOT NULL,
  latitude   REAL,
  longitude  REAL,
  summary    TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_id);

CREATE TABLE IF NOT EXISTS facets (
  id       TEXT PRIMARY KEY,
  kind     TEXT NOT NULL, -- 'sensibilidade' | 'identidade' | 'povo' | 'cosmologia' | 'material' | 'linguagem'
  name     TEXT NOT NULL,
  summary  TEXT
);
CREATE INDEX IF NOT EXISTS idx_facets_kind ON facets(kind);

CREATE TABLE IF NOT EXISTS entity_facets (
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  facet_id  TEXT NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  PRIMARY KEY (entity_id, facet_id)
);
CREATE INDEX IF NOT EXISTS idx_entity_facets_facet ON entity_facets(facet_id);
