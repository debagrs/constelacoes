export type CuratorialCategory =
  | "Tradicional"
  | "Mulheres e mães"
  | "Indígenas"
  | "Negros e diásporas"
  | "LGBTQIA+"
  | "Bioética e animalidades"
  | "Além do Antropoceno";

export interface CuratorialReference {
  id: string;
  category: CuratorialCategory;
  citation: string;
  title: string;
  authors: string;
  year: number;
}

export interface CuratorialReferenceGroup {
  category: CuratorialCategory;
  references: CuratorialReference[];
}

const REFERENCES: Record<CuratorialCategory, CuratorialReference[]> = {
  Tradicional: [
    {
      id: "gombrich-story-art",
      category: "Tradicional",
      authors: "E. H. Gombrich",
      title: "The Story of Art",
      year: 1995,
      citation: "GOMBRICH, E. H. The Story of Art. 16. ed. London: Phaidon, 1995.",
    },
    {
      id: "argan-historia-cidade",
      category: "Tradicional",
      authors: "Giulio Carlo Argan",
      title: "História da arte como história da cidade",
      year: 1992,
      citation: "ARGAN, Giulio Carlo. História da arte como história da cidade. São Paulo: Martins Fontes, 1992.",
    },
  ],
  "Mulheres e mães": [
    {
      id: "nochlin-women-art-power",
      category: "Mulheres e mães",
      authors: "Linda Nochlin",
      title: "Women, Art, and Power and Other Essays",
      year: 1988,
      citation: "NOCHLIN, Linda. Women, Art, and Power and Other Essays. Boulder: Westview Press, 1988.",
    },
    {
      id: "pollock-vision-difference",
      category: "Mulheres e mães",
      authors: "Griselda Pollock",
      title: "Vision and Difference",
      year: 1988,
      citation: "POLLOCK, Griselda. Vision and Difference: Femininity, Feminism and Histories of Art. London: Routledge, 1988.",
    },
  ],
  Indígenas: [
    {
      id: "smith-decolonizing-methodologies",
      category: "Indígenas",
      authors: "Linda Tuhiwai Smith",
      title: "Decolonizing Methodologies",
      year: 1999,
      citation: "SMITH, Linda Tuhiwai. Decolonizing Methodologies: Research and Indigenous Peoples. London: Zed Books, 1999.",
    },
    {
      id: "demos-decolonizing-nature",
      category: "Indígenas",
      authors: "T. J. Demos",
      title: "Decolonizing Nature",
      year: 2016,
      citation: "DEMOS, T. J. Decolonizing Nature: Contemporary Art and the Politics of Ecology. Berlin: Sternberg Press, 2016.",
    },
  ],
  "Negros e diásporas": [
    {
      id: "hooks-art-on-my-mind",
      category: "Negros e diásporas",
      authors: "bell hooks",
      title: "Art on My Mind",
      year: 1995,
      citation: "HOOKS, bell. Art on My Mind: Visual Politics. New York: The New Press, 1995.",
    },
    {
      id: "mercer-welcome-jungle",
      category: "Negros e diásporas",
      authors: "Kobena Mercer",
      title: "Welcome to the Jungle",
      year: 1994,
      citation: "MERCER, Kobena. Welcome to the Jungle: New Positions in Black Cultural Studies. New York: Routledge, 1994.",
    },
  ],
  "LGBTQIA+": [
    {
      id: "jones-seeing-differently",
      category: "LGBTQIA+",
      authors: "Amelia Jones",
      title: "Seeing Differently",
      year: 2012,
      citation: "JONES, Amelia. Seeing Differently: A History and Theory of Identification and the Visual Arts. London: Routledge, 2012.",
    },
    {
      id: "katz-ward-hide-seek",
      category: "LGBTQIA+",
      authors: "Jonathan D. Katz; David C. Ward",
      title: "Hide/Seek",
      year: 2010,
      citation: "KATZ, Jonathan D.; WARD, David C. Hide/Seek: Difference and Desire in American Portraiture. Washington, DC: Smithsonian Books, 2010.",
    },
  ],
  "Bioética e animalidades": [
    {
      id: "haraway-when-species-meet",
      category: "Bioética e animalidades",
      authors: "Donna J. Haraway",
      title: "When Species Meet",
      year: 2008,
      citation: "HARAWAY, Donna J. When Species Meet. Minneapolis: University of Minnesota Press, 2008.",
    },
    {
      id: "aloi-art-animals",
      category: "Bioética e animalidades",
      authors: "Giovanni Aloi",
      title: "Art & Animals",
      year: 2011,
      citation: "ALOI, Giovanni. Art & Animals. London: I.B. Tauris, 2011.",
    },
  ],
  "Além do Antropoceno": [
    {
      id: "haraway-staying-trouble",
      category: "Além do Antropoceno",
      authors: "Donna J. Haraway",
      title: "Staying with the Trouble",
      year: 2016,
      citation: "HARAWAY, Donna J. Staying with the Trouble: Making Kin in the Chthulucene. Durham: Duke University Press, 2016.",
    },
    {
      id: "demos-against-anthropocene",
      category: "Além do Antropoceno",
      authors: "T. J. Demos",
      title: "Against the Anthropocene",
      year: 2017,
      citation: "DEMOS, T. J. Against the Anthropocene: Visual Culture and Environment Today. Berlin: Sternberg Press, 2017.",
    },
  ],
};

const CATEGORY_KEYWORDS: Record<Exclude<CuratorialCategory, "Tradicional">, string[]> = {
  "Mulheres e mães": [
    "mulher", "mulheres", "mae", "mãe", "maes", "mães", "maternidade", "motherhood",
    "feminismo", "feminista", "female", "women", "woman", "care", "cuidado",
  ],
  Indígenas: [
    "indigena", "indígena", "indigenas", "indígenas", "indigenous", "aborigene", "aborígene",
    "aboriginal", "povo originario", "povo originário", "amerindio", "ameríndio", "ancestralidade",
  ],
  "Negros e diásporas": [
    "negro", "negra", "negros", "negras", "black", "afro", "african", "africano", "africana",
    "diaspora", "diáspora", "afro-brasile", "afrobrasile", "quilombo", "quilombola",
  ],
  "LGBTQIA+": [
    "lgbt", "lgbtq", "lgbtqia", "queer", "trans", "travesti", "homossexual", "homosexual",
    "gay", "lesbica", "lésbica", "lesbian", "non-binary", "nao binar", "não binar",
  ],
  "Bioética e animalidades": [
    "bioetica", "bioética", "animal", "animalidade", "animalidades", "multiespec", "multiespéc",
    "interspec", "interespéc", "especismo", "species", "fauna", "mais-que-humano", "more-than-human",
    "senciência", "sentiencia", "sentience",
  ],
  "Além do Antropoceno": [
    "antropoceno", "anthropocene", "chthuluceno", "chthulucene", "simbioceno", "symbiocene",
    "plantationoceno", "plantationocene", "ecologia", "ecological", "clima", "climate", "fungo",
    "fungi", "vegetal", "planta", "planetario", "planetário", "more-than-human", "mais-que-humano",
  ],
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function stringifyUnknown(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(stringifyUnknown).join(" ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(stringifyUnknown).join(" ");
  return "";
}

export function getCuratorialReferenceGroups(entity: {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  entity_type?: string | null;
  culture?: string | null;
  country?: string | null;
  continent?: string | null;
  tags?: string[] | null;
  themes?: string[] | null;
  metadata?: unknown;
}): CuratorialReferenceGroup[] {
  const context = normalize(
    [
      entity.title,
      entity.subtitle,
      entity.description,
      entity.entity_type,
      entity.culture,
      entity.country,
      entity.continent,
      ...(entity.tags ?? []),
      ...(entity.themes ?? []),
      stringifyUnknown(entity.metadata),
    ]
      .filter(Boolean)
      .join(" "),
  );

  const groups: CuratorialReferenceGroup[] = [
    { category: "Tradicional", references: REFERENCES.Tradicional },
  ];

  (Object.keys(CATEGORY_KEYWORDS) as Array<Exclude<CuratorialCategory, "Tradicional">>).forEach(
    (category) => {
      const matched = CATEGORY_KEYWORDS[category].some((keyword) =>
        context.includes(normalize(keyword)),
      );
      if (matched) groups.push({ category, references: REFERENCES[category] });
    },
  );

  return groups;
}

export function referenceSearchUrl(reference: CuratorialReference) {
  const query = `${reference.authors} ${reference.title}`;
  return `https://search.worldcat.org/search?q=${encodeURIComponent(query)}`;
}

export type TechniqueTechnologyCategory =
  | "Arte digital e computacional"
  | "Webarte e redes"
  | "Vídeo e audiovisual"
  | "Fotografia"
  | "Pintura, pigmentos e óleo"
  | "Arte têxtil e fibras"
  | "Gravura e impressão"
  | "Instalação e espacialidades"
  | "Performance e corpo"
  | "IA e aprendizado de máquina"
  | "Interfaces, jogos e imersão"
  | "Som e arte sonora";

export interface TechniqueTechnologyReference {
  id: string;
  category: TechniqueTechnologyCategory;
  citation: string;
  title: string;
  authors: string;
  year: number;
}

export interface TechniqueTechnologyReferenceGroup {
  category: TechniqueTechnologyCategory;
  evidence: string[];
  references: TechniqueTechnologyReference[];
}

const TECHNIQUE_REFERENCES: Record<
  TechniqueTechnologyCategory,
  TechniqueTechnologyReference[]
> = {
  "Arte digital e computacional": [
    {
      id: "paul-digital-art",
      category: "Arte digital e computacional",
      authors: "Christiane Paul",
      title: "Digital Art",
      year: 2015,
      citation: "PAUL, Christiane. Digital Art. 3. ed. London: Thames & Hudson, 2015.",
    },
    {
      id: "manovich-language-new-media",
      category: "Arte digital e computacional",
      authors: "Lev Manovich",
      title: "The Language of New Media",
      year: 2001,
      citation: "MANOVICH, Lev. The Language of New Media. Cambridge, MA: MIT Press, 2001.",
    },
  ],
  "Webarte e redes": [
    {
      id: "greene-internet-art",
      category: "Webarte e redes",
      authors: "Rachel Greene",
      title: "Internet Art",
      year: 2004,
      citation: "GREENE, Rachel. Internet Art. London: Thames & Hudson, 2004.",
    },
    {
      id: "manovich-language-web",
      category: "Webarte e redes",
      authors: "Lev Manovich",
      title: "The Language of New Media",
      year: 2001,
      citation: "MANOVICH, Lev. The Language of New Media. Cambridge, MA: MIT Press, 2001.",
    },
  ],
  "Vídeo e audiovisual": [
    {
      id: "rush-video-art",
      category: "Vídeo e audiovisual",
      authors: "Michael Rush",
      title: "Video Art",
      year: 2003,
      citation: "RUSH, Michael. Video Art. London: Thames & Hudson, 2003.",
    },
    {
      id: "meigh-andrews-history-video-art",
      category: "Vídeo e audiovisual",
      authors: "Chris Meigh-Andrews",
      title: "A History of Video Art",
      year: 2013,
      citation: "MEIGH-ANDREWS, Chris. A History of Video Art. 2. ed. London: Bloomsbury, 2013.",
    },
  ],
  Fotografia: [
    {
      id: "batchen-burning-desire",
      category: "Fotografia",
      authors: "Geoffrey Batchen",
      title: "Burning with Desire",
      year: 1997,
      citation: "BATCHEN, Geoffrey. Burning with Desire: The Conception of Photography. Cambridge, MA: MIT Press, 1997.",
    },
    {
      id: "newhall-history-photography",
      category: "Fotografia",
      authors: "Beaumont Newhall",
      title: "The History of Photography",
      year: 1982,
      citation: "NEWHALL, Beaumont. The History of Photography. New York: Museum of Modern Art, 1982.",
    },
  ],
  "Pintura, pigmentos e óleo": [
    {
      id: "mayer-artist-handbook",
      category: "Pintura, pigmentos e óleo",
      authors: "Ralph Mayer",
      title: "The Artist's Handbook of Materials and Techniques",
      year: 1991,
      citation: "MAYER, Ralph. The Artist's Handbook of Materials and Techniques. 5. ed. New York: Viking, 1991.",
    },
    {
      id: "gettens-stout-painting-materials",
      category: "Pintura, pigmentos e óleo",
      authors: "Rutherford J. Gettens; George L. Stout",
      title: "Painting Materials: A Short Encyclopaedia",
      year: 1966,
      citation: "GETTENS, Rutherford J.; STOUT, George L. Painting Materials: A Short Encyclopaedia. New York: Dover, 1966.",
    },
  ],
  "Arte têxtil e fibras": [
    {
      id: "auther-string-felt-thread",
      category: "Arte têxtil e fibras",
      authors: "Elissa Auther",
      title: "String, Felt, Thread",
      year: 2010,
      citation: "AUTHER, Elissa. String, Felt, Thread: The Hierarchy of Art and Craft in American Art. Minneapolis: University of Minnesota Press, 2010.",
    },
    {
      id: "adamson-thinking-through-craft",
      category: "Arte têxtil e fibras",
      authors: "Glenn Adamson",
      title: "Thinking Through Craft",
      year: 2007,
      citation: "ADAMSON, Glenn. Thinking Through Craft. Oxford: Berg, 2007.",
    },
  ],
  "Gravura e impressão": [
    {
      id: "ivins-prints-visual-communication",
      category: "Gravura e impressão",
      authors: "William M. Ivins Jr.",
      title: "Prints and Visual Communication",
      year: 1969,
      citation: "IVINS JR., William M. Prints and Visual Communication. Cambridge, MA: MIT Press, 1969.",
    },
    {
      id: "griffiths-prints-printmaking",
      category: "Gravura e impressão",
      authors: "Antony Griffiths",
      title: "Prints and Printmaking",
      year: 1996,
      citation: "GRIFFITHS, Antony. Prints and Printmaking: An Introduction to the History and Techniques. 2. ed. London: British Museum Press, 1996.",
    },
  ],
  "Instalação e espacialidades": [
    {
      id: "bishop-installation-art",
      category: "Instalação e espacialidades",
      authors: "Claire Bishop",
      title: "Installation Art: A Critical History",
      year: 2005,
      citation: "BISHOP, Claire. Installation Art: A Critical History. London: Tate Publishing, 2005.",
    },
    {
      id: "kwon-one-place-another",
      category: "Instalação e espacialidades",
      authors: "Miwon Kwon",
      title: "One Place After Another",
      year: 2002,
      citation: "KWON, Miwon. One Place After Another: Site-Specific Art and Locational Identity. Cambridge, MA: MIT Press, 2002.",
    },
  ],
  "Performance e corpo": [
    {
      id: "goldberg-performance-art",
      category: "Performance e corpo",
      authors: "RoseLee Goldberg",
      title: "Performance Art: From Futurism to the Present",
      year: 2011,
      citation: "GOLDBERG, RoseLee. Performance Art: From Futurism to the Present. 3. ed. London: Thames & Hudson, 2011.",
    },
    {
      id: "jones-body-art",
      category: "Performance e corpo",
      authors: "Amelia Jones",
      title: "Body Art/Performing the Subject",
      year: 1998,
      citation: "JONES, Amelia. Body Art/Performing the Subject. Minneapolis: University of Minnesota Press, 1998.",
    },
  ],
  "IA e aprendizado de máquina": [
    {
      id: "zylinska-ai-art",
      category: "IA e aprendizado de máquina",
      authors: "Joanna Zylinska",
      title: "AI Art: Machine Visions and Warped Dreams",
      year: 2020,
      citation: "ZYLINSKA, Joanna. AI Art: Machine Visions and Warped Dreams. London: Open Humanities Press, 2020.",
    },
    {
      id: "manovich-ai-aesthetics",
      category: "IA e aprendizado de máquina",
      authors: "Lev Manovich",
      title: "AI Aesthetics",
      year: 2018,
      citation: "MANOVICH, Lev. AI Aesthetics. Moscow: Strelka Press, 2018.",
    },
  ],
  "Interfaces, jogos e imersão": [
    {
      id: "grau-virtual-art",
      category: "Interfaces, jogos e imersão",
      authors: "Oliver Grau",
      title: "Virtual Art: From Illusion to Immersion",
      year: 2003,
      citation: "GRAU, Oliver. Virtual Art: From Illusion to Immersion. Cambridge, MA: MIT Press, 2003.",
    },
    {
      id: "flanagan-critical-play",
      category: "Interfaces, jogos e imersão",
      authors: "Mary Flanagan",
      title: "Critical Play: Radical Game Design",
      year: 2009,
      citation: "FLANAGAN, Mary. Critical Play: Radical Game Design. Cambridge, MA: MIT Press, 2009.",
    },
  ],
  "Som e arte sonora": [
    {
      id: "licht-sound-art",
      category: "Som e arte sonora",
      authors: "Alan Licht",
      title: "Sound Art",
      year: 2007,
      citation: "LICHT, Alan. Sound Art: Beyond Music, Between Categories. New York: Rizzoli, 2007.",
    },
    {
      id: "labelle-background-noise",
      category: "Som e arte sonora",
      authors: "Brandon LaBelle",
      title: "Background Noise",
      year: 2006,
      citation: "LABELLE, Brandon. Background Noise: Perspectives on Sound Art. New York: Continuum, 2006.",
    },
  ],
};

const TECHNIQUE_KEYWORDS: Record<TechniqueTechnologyCategory, string[]> = {
  "Arte digital e computacional": [
    "arte digital", "digital art", "computer art", "computational art", "arte computacional",
    "software art", "algorithmic", "algoritmica", "algorítmica", "generative art", "arte generativa",
    "new media", "novas midias", "novas mídias", "multimedia", "multimidia", "multimídia",
  ],
  "Webarte e redes": [
    "webart", "web art", "net art", "net.art", "internet art", "arte na internet", "arte em rede",
    "website art", "browser art", "hypertext art", "hipertexto", "networked art",
  ],
  "Vídeo e audiovisual": [
    "videoarte", "vídeoarte", "video art", "video", "vídeo", "audiovisual", "moving image",
    "filme", "film", "cinema", "single-channel video", "multichannel video", "multicanal",
  ],
  Fotografia: [
    "fotografia", "photography", "photograph", "fotografico", "fotográfico", "photographic",
    "daguerreotype", "daguerreotipo", "gelatin silver", "gelatina de prata", "c-print", "chromogenic print",
  ],
  "Pintura, pigmentos e óleo": [
    "oleo sobre tela", "óleo sobre tela", "oil on canvas", "oil paint", "oil painting", "tinta a oleo", "tinta a óleo",
    "pintura", "painting", "acrylic", "acrilica", "acrílica", "aquarela", "watercolor", "tempera", "têmpera",
    "pigment", "pigmento", "canvas", "tela",
  ],
  "Arte têxtil e fibras": [
    "arte textil", "arte têxtil", "textile art", "textile", "têxtil", "fiber art", "fibre art", "fibra",
    "tecido", "fabric", "bordado", "embroidery", "tapeçaria", "tapestry", "croche", "crochê", "crochet",
    "trico", "tricô", "knit", "knitting", "tecelagem", "weaving", "fio", "thread", "feltro", "felt",
  ],
  "Gravura e impressão": [
    "gravura", "printmaking", "print", "xilogravura", "woodcut", "litografia", "lithograph", "lithography",
    "agua-forte", "água-forte", "etching", "engraving", "serigrafia", "screenprint", "silkscreen",
    "linoleogravura", "linocut", "monotipo", "monotype", "impressao", "impressão",
  ],
  "Instalação e espacialidades": [
    "instalacao", "instalação", "installation", "site-specific", "site specific", "environmental installation",
    "ambiente", "environment", "espacial", "spatial", "escultura ambiental",
  ],
  "Performance e corpo": [
    "performance", "performance art", "body art", "arte corporal", "happening", "acao", "ação", "live art",
  ],
  "IA e aprendizado de máquina": [
    "inteligencia artificial", "inteligência artificial", "artificial intelligence", "machine learning",
    "aprendizado de maquina", "aprendizado de máquina", "neural network", "rede neural", "gan", "diffusion model",
    "modelo de difusao", "modelo de difusão", "generative ai", "ia generativa", "deep learning",
  ],
  "Interfaces, jogos e imersão": [
    "interface", "interactive art", "arte interativa", "interativo", "interativa", "game art", "jogo", "game",
    "realidade virtual", "virtual reality", "vr", "realidade aumentada", "augmented reality", "immersive",
    "imersivo", "imersiva", "mixed reality", "realidade mista", "sensor", "touchscreen",
  ],
  "Som e arte sonora": [
    "arte sonora", "sound art", "sound installation", "instalacao sonora", "instalação sonora", "audio", "áudio",
    "som", "sonoro", "sonora", "sonic", "field recording", "gravacao de campo", "gravação de campo",
  ],
};

const TECHNIQUE_METADATA_KEYS = new Set([
  "medium", "media", "technique", "techniques", "technology", "technologies", "process", "processes",
  "material", "materials", "support", "substrate", "software", "hardware", "equipment", "camera", "format",
  "digital_format", "object_type", "genre", "artform", "fabrication", "printing_process", "duration", "codec",
  "resolution", "interaction", "interface", "sensor", "sound", "audio", "video",
]);

function collectTechnicalMetadata(value: unknown, key = ""): string[] {
  if (value == null) return [];
  const normalizedKey = normalize(key);
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    if (!key || TECHNIQUE_METADATA_KEYS.has(normalizedKey)) return [String(value)];
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTechnicalMetadata(item, key));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([nestedKey, nestedValue]) =>
      collectTechnicalMetadata(nestedValue, nestedKey),
    );
  }
  return [];
}

function uniqueEvidence(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values
    .flatMap((value) => (value ? [String(value).trim()] : []))
    .filter(Boolean)
    .filter((value) => {
      const key = normalize(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function getTechniqueTechnologyReferenceGroups(entity: {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  entity_type?: string | null;
  materials?: string[] | null;
  techniques?: string[] | null;
  tags?: string[] | null;
  themes?: string[] | null;
  metadata?: unknown;
}): TechniqueTechnologyReferenceGroup[] {
  const explicitEvidence = uniqueEvidence([
    ...(entity.techniques ?? []),
    ...(entity.materials ?? []),
    ...(entity.tags ?? []),
    ...(entity.themes ?? []),
    ...collectTechnicalMetadata(entity.metadata),
  ]);

  const secondaryContext = uniqueEvidence([
    entity.entity_type,
    entity.subtitle,
    entity.description,
  ]);

  const allEvidence = [...explicitEvidence, ...secondaryContext];

  return (Object.keys(TECHNIQUE_KEYWORDS) as TechniqueTechnologyCategory[])
    .map((category) => {
      const keywords = TECHNIQUE_KEYWORDS[category].map(normalize);
      const evidence = allEvidence.filter((value) => {
        const normalizedValue = normalize(value);
        return keywords.some((keyword) => normalizedValue.includes(keyword));
      });
      return {
        category,
        evidence: uniqueEvidence(evidence).slice(0, 8),
        references: TECHNIQUE_REFERENCES[category],
      };
    })
    .filter((group) => group.evidence.length > 0);
}

export function techniqueReferenceSearchUrl(reference: TechniqueTechnologyReference) {
  const query = `${reference.authors} ${reference.title}`;
  return `https://search.worldcat.org/search?q=${encodeURIComponent(query)}`;
}

