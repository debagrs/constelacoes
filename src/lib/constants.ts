export type ContentStatus =
  | "draft"
  | "submitted"
  | "review"
  | "in_review"
  | "approved"
  | "published"
  | "archived";
export type AppRole = "admin" | "curador" | "professor" | "estudante";

export const STATUS_FLOW: ContentStatus[] = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "published",
];

/** Status label i18n keys — pair with useI18n().t(). */
export const STATUS_LABEL_KEY: Record<ContentStatus, string> = {
  draft: "atlas.status.draft",
  submitted: "atlas.status.submitted",
  review: "atlas.status.in_review",
  in_review: "atlas.status.in_review",
  approved: "atlas.status.approved",
  published: "atlas.status.published",
  archived: "atlas.status.archived",
};

export const ROLE_LABEL_KEY: Record<AppRole, string> = {
  admin: "role.admin",
  curador: "role.curador",
  professor: "role.professor",
  estudante: "role.estudante",
};

/** Entity types (obras, artistas, movimentos, tecnologias, etc.). */
export const ENTITY_TYPES = [
  "obra",
  "artista",
  "movimento",
  "escola",
  "coletivo",
  "museu",
  "galeria",
  "exposicao",
  "bienal",
  "festival",
  "livro",
  "conceito",
  "tecnologia",
  "material",
  "tecnica",
  "software",
  "performance",
  "instalacao",
  "arquitetura",
  "fotografia",
  "cinema",
  "design",
  "videogame",
  "arte-digital",
  "bioarte",
  "ia",
  "net-art",
  "patrimonio",
] as const;

export const ENTITY_TYPE_LABEL: Record<string, string> = {
  obra: "Obra",
  artista: "Artista",
  movimento: "Movimento",
  escola: "Escola",
  coletivo: "Coletivo",
  museu: "Museu",
  galeria: "Galeria",
  exposicao: "Exposição",
  bienal: "Bienal",
  festival: "Festival",
  livro: "Livro",
  conceito: "Conceito",
  tecnologia: "Tecnologia",
  material: "Material",
  tecnica: "Técnica",
  software: "Software",
  performance: "Performance",
  instalacao: "Instalação",
  arquitetura: "Arquitetura",
  fotografia: "Fotografia",
  cinema: "Cinema",
  design: "Design",
  videogame: "Videogame",
  "arte-digital": "Arte digital",
  bioarte: "Bioarte",
  ia: "Inteligência artificial",
  "net-art": "Net art",
  patrimonio: "Patrimônio",
};

export const CONTINENTS = [
  "África",
  "América do Norte",
  "América do Sul",
  "Ásia",
  "Europa",
  "Oceania",
  "Planetário",
];

/** Relation vocabulary — the heart of the network. */
export const RELATION_TYPES = [
  "influencia",
  "reacao",
  "apropriacao",
  "continuidade",
  "ruptura",
  "sobrevivencia",
  "gesto",
  "cor",
  "material",
  "ritual",
  "tecnologia",
  "politica",
  "ecologia",
  "colonialidade",
  "cosmologia",
] as const;

export const RELATION_TYPE_LABEL: Record<string, string> = {
  influencia: "Influência",
  reacao: "Reação",
  apropriacao: "Apropriação",
  continuidade: "Continuidade",
  ruptura: "Ruptura",
  sobrevivencia: "Sobrevivência",
  gesto: "Gesto",
  cor: "Cor",
  material: "Material",
  ritual: "Ritual",
  tecnologia: "Tecnologia",
  politica: "Política",
  ecologia: "Ecologia",
  colonialidade: "Colonialidade",
  cosmologia: "Cosmologia",
};

export function labelForEntityType(type: string): string {
  return ENTITY_TYPE_LABEL[type] ?? type;
}

export function labelForRelationType(type: string | null): string {
  if (!type) return "—";
  return RELATION_TYPE_LABEL[type] ?? type;
}
