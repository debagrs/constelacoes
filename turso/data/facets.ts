/** Vocabulários transversais: sensibilidades, identidades, povos, cosmologias. */
export type FacetSeed = { id: string; kind: string; name: string; summary?: string };

const mk = (kind: string) => (name: string, summary = ""): FacetSeed => ({
  id: `${kind}:${name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`,
  kind,
  name,
  summary,
});

const s = mk("sensibilidade");
const i = mk("identidade");
const p = mk("povo");
const c = mk("cosmologia");

export const SENSIBILIDADES = [
  s("Maternidade"), s("Infância"), s("Cuidado"), s("Afeto"), s("Memória"), s("Luto"),
  s("Espiritualidade"), s("Natureza"), s("Água"), s("Floresta"), s("Terra"), s("Cosmos"),
  s("Ancestralidade"), s("Colonização"), s("Decolonialidade"), s("Resistência"), s("Migração"),
  s("Identidade"), s("Corpo"), s("Silêncio"), s("Tempo"), s("Tecnologia"), s("Bioética"),
  s("Ecologia"), s("Direitos Animais"), s("Educação"), s("Design"), s("Interfaces"),
  s("Comunidade"), s("Hospitalidade"), s("Feminismos"), s("Cosmovisão indígena"),
  s("Cosmovisão africana"), s("Cosmovisão oriental"), s("Antropoceno"), s("Pós-humanismo"),
  s("Tecnodiversidade"), s("Ritual"), s("Trabalho"), s("Guerra"), s("Escravidão"), s("Festa"),
];

export const IDENTIDADES = [
  i("Mulheres"), i("Mães"), i("Pessoas negras"), i("Povos indígenas"), i("LGBTQIA+"),
  i("Pessoas com deficiência"), i("Artistas periféricos"), i("Migrantes"), i("Refugiados"),
  i("Autodidatas"), i("Coletivos"), i("Artesãs"), i("Mestres populares"), i("Xamãs"),
  i("Anciões"), i("Comunidades tradicionais"), i("Pessoas escravizadas"), i("Quilombolas"),
  i("Pessoas asiáticas"), i("Pessoas mestiças"),
];

export const POVOS = [
  p("Iorubá"), p("Edo"), p("Dogon"), p("Kuba"), p("San"), p("Amazigh"), p("Aksumita"),
  p("Nok"), p("Asante"), p("Bamana"), p("Zulu"), p("Ndebele"),
  p("Guarani"), p("Mapuche"), p("Quechua"), p("Aymara"), p("Marajoara"), p("Asurini"),
  p("Yanomami"), p("Kayapó"), p("Huni Kuin"), p("Wauja"), p("Selk'nam"),
  p("Maia"), p("Mexica"), p("Olmeca"), p("Zapoteca"), p("Taíno"),
  p("Haida"), p("Navajo"), p("Pueblo"), p("Lakota"), p("Anishinaabe"), p("Inuit"),
  p("Ainu"), p("Sámi"), p("Aborígene australiano"), p("Māori"), p("Rapa Nui"),
  p("Asmat"), p("Sepik"), p("Citas"), p("Newar"), p("Tibetano"),
];

export const COSMOLOGIAS = [
  c("Cosmovisão iorubá"), c("Cosmovisão bantu"), c("Cosmovisão andina"),
  c("Cosmovisão amazônica"), c("Cosmovisão mesoamericana"), c("Cosmovisão aborígene (Dreaming)"),
  c("Budismo"), c("Hinduísmo"), c("Taoísmo"), c("Xintoísmo"), c("Islã"), c("Cristianismo"),
  c("Judaísmo"), c("Xamanismo"), c("Animismo"), c("Ancestralidade afro-diaspórica"),
];

export const ALL_FACETS: FacetSeed[] = [
  ...SENSIBILIDADES,
  ...IDENTIDADES,
  ...POVOS,
  ...COSMOLOGIAS,
];

export const facetId = (kind: string, name: string) => mk(kind)(name).id;
