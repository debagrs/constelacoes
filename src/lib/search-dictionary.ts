/**
 * Vocabulário expandido do Atlas Planetário.
 *
 * Objetivo: tornar a busca tolerante a singular/plural, acentos e termos equivalentes
 * em português, inglês e espanhol sem transformar o sistema em um classificador de
 * identidades. Os aliases apenas ampliam a consulta textual sobre metadados já existentes.
 */

type SearchConcept = {
  aliases: string[];
  external?: string;
};

const CONCEPTS: SearchConcept[] = [
  // animais / animalidades
  { aliases: ["gato", "gatos", "felino", "felinos", "cat", "cats", "feline", "felidae", "gato domestico", "gato doméstico", "felino domestico", "felino doméstico"], external: "cats" },
  { aliases: ["cachorro", "cachorros", "cao", "cão", "caes", "cães", "dog", "dogs", "canino", "caninos", "perro", "perros"], external: "dogs" },
  { aliases: ["passaro", "pássaro", "passaros", "pássaros", "ave", "aves", "bird", "birds", "avian", "pajaro", "pájaro", "pajaros", "pájaros"], external: "birds" },
  { aliases: ["peixe", "peixes", "fish", "fishes", "pisciforme"], external: "fish" },
  { aliases: ["cavalo", "cavalos", "horse", "horses", "equino", "equinos"], external: "horses" },
  { aliases: ["vaca", "vacas", "boi", "bois", "cow", "cows", "cattle", "bovine", "bovino"], external: "cattle" },
  { aliases: ["porco", "porcos", "porca", "suino", "suíno", "pig", "pigs", "swine"], external: "pigs" },
  { aliases: ["galinha", "galinhas", "galo", "frango", "chicken", "chickens", "hen", "rooster"], external: "chickens" },
  { aliases: ["pato", "patos", "duck", "ducks"], external: "ducks" },
  { aliases: ["inseto", "insetos", "insect", "insects", "entomologia"], external: "insects" },
  { aliases: ["borboleta", "borboletas", "butterfly", "butterflies", "lepidoptera"], external: "butterflies" },
  { aliases: ["cobra", "cobras", "serpente", "serpentes", "snake", "snakes", "serpent"], external: "snakes" },
  { aliases: ["onca", "onça", "oncas", "onças", "jaguar", "jaguars", "panthera onca"], external: "jaguar" },
  { aliases: ["lobo", "lobos", "wolf", "wolves"], external: "wolves" },
  { aliases: ["baleia", "baleias", "whale", "whales", "cetaceo", "cetáceo"], external: "whales" },
  { aliases: ["elefante", "elefantes", "elephant", "elephants"], external: "elephants" },
  { aliases: ["macaco", "macacos", "primata", "primatas", "monkey", "ape", "primate"], external: "primates" },
  { aliases: ["animal", "animais", "animalidade", "animalidades", "animal", "animals", "fauna", "multiespecie", "multiespécie", "multispecies", "interspecies", "interespecies", "interespécies"], external: "animals" },

  // vegetal / ecologia / planeta
  { aliases: ["planta", "plantas", "vegetal", "vegetais", "plant", "plants", "botanica", "botânica", "botany"], external: "plants" },
  { aliases: ["arvore", "árvore", "arvores", "árvores", "tree", "trees", "arboreo", "arbóreo", "arbol", "árbol", "arboles", "árboles"], external: "trees" },
  { aliases: ["flor", "flores", "flower", "flowers", "floral"], external: "flowers" },
  { aliases: ["floresta", "florestas", "forest", "forests", "mata", "matas", "selva", "selvas", "bosque", "bosques", "jungle"], external: "forest" },
  { aliases: ["fungo", "fungos", "fungi", "fungus", "cogumelo", "cogumelos", "mushroom", "mycelium", "micelio", "micélio"], external: "fungi" },
  { aliases: ["agua", "água", "water", "aquatico", "aquático"], external: "water" },
  { aliases: ["mar", "oceano", "ocean", "sea", "marine", "marinho", "marinha"], external: "sea" },
  { aliases: ["rio", "rios", "river", "rivers"], external: "river" },
  { aliases: ["montanha", "montanhas", "mountain", "mountains", "serra"], external: "mountain" },
  { aliases: ["paisagem", "paisagens", "landscape", "landscapes", "landscape painting"], external: "landscape" },
  { aliases: ["ecologia", "ecologico", "ecológica", "ecological", "ecology", "environment", "ambiental", "meio ambiente"], external: "ecology" },
  { aliases: ["clima", "climatico", "climático", "climate", "climate change", "mudanca climatica", "mudança climática"], external: "climate" },
  { aliases: ["antropoceno", "anthropocene", "chthuluceno", "chthulucene", "plantationoceno", "plantationocene", "pos-antropoceno", "pós-antropoceno"], external: "Anthropocene" },

  // corpo, relações, identidade e cuidado
  { aliases: ["corpo", "corpos", "body", "bodies", "corporeidade", "embodiment"], external: "body" },
  { aliases: ["retrato", "retratos", "portrait", "portraits", "portraiture"], external: "portrait" },
  { aliases: ["mulher", "mulheres", "woman", "women", "female", "feminino", "feminina", "mujer", "mujeres"], external: "women" },
  { aliases: ["mae", "mãe", "maes", "mães", "mother", "mothers", "maternidade", "motherhood", "maternal", "madre", "madres", "maternidad"], external: "mother" },
  { aliases: ["crianca", "criança", "criancas", "crianças", "child", "children", "infancia", "infância", "childhood", "niño", "niña", "niños", "niñas"], external: "children" },
  { aliases: ["familia", "família", "family", "families", "parentesco", "kinship"], external: "family" },
  { aliases: ["cuidado", "care", "cuidar", "caregiving", "reproductive labor", "trabalho reprodutivo"], external: "care" },
  { aliases: ["trabalho", "labor", "labour", "work", "trabalhador", "worker"], external: "labor" },
  { aliases: ["migracao", "migração", "migration", "diaspora", "diáspora", "exilio", "exílio", "exile"], external: "migration" },
  { aliases: ["morte", "death", "morto", "mortos", "funerario", "funerário", "funerary", "luto", "mourning"], external: "death" },
  { aliases: ["queer", "lgbt", "lgbtq", "lgbtqia", "gay", "lesbica", "lésbica", "lesbian", "trans", "travesti", "nao binario", "não binário", "nonbinary", "non-binary"], external: "queer" },
  { aliases: ["feminismo", "feminismos", "feminista", "feminist", "feminism", "genero", "gênero", "gender"], external: "feminism" },
  { aliases: ["indigena", "indígena", "indigenas", "indígenas", "indigenous", "indigena", "indígena", "aborigene", "aborígene", "aboriginal", "povos originarios", "povos originários", "amerindio", "ameríndio"], external: "indigenous" },
  { aliases: ["negro", "negra", "negros", "negras", "black", "afro", "africano", "africana", "african", "afrodiaspora", "afrodiáspora", "quilombola"], external: "Black art" },
  { aliases: ["decolonial", "decolonialidade", "decolonization", "decolonisation", "descolonial", "descolonizacao", "descolonização", "colonialidade", "coloniality"], external: "decolonial art" },
  { aliases: ["bioetica", "bioética", "bioethics", "etica animal", "ética animal", "animal ethics", "antiespecismo", "antispeciesism", "especismo", "speciesism"], external: "bioethics" },
  { aliases: ["pos-humanismo", "pós-humanismo", "posthumanism", "posthuman", "mais que humano", "mais-que-humano", "more-than-human", "transhumanismo", "transhumanism"], external: "posthumanism" },
  { aliases: ["umwelt", "mundo proprio", "mundo próprio", "percepcao animal", "percepção animal", "animal perception", "semiose animal"], external: "animal perception" },

  // técnicas, mídias e tecnologias
  { aliases: ["pintura", "painting", "paint", "pinturas"], external: "painting" },
  { aliases: ["oleo", "óleo", "oleo sobre tela", "óleo sobre tela", "oil", "oil painting", "oil on canvas"], external: "oil painting" },
  { aliases: ["aquarela", "watercolor", "watercolour", "aguarela"], external: "watercolor" },
  { aliases: ["desenho", "drawing", "drawings", "grafite", "graphite", "charcoal", "carvao", "carvão"], external: "drawing" },
  { aliases: ["escultura", "sculpture", "sculptures", "estatua", "estátua", "statue"], external: "sculpture" },
  { aliases: ["ceramica", "cerâmica", "ceramic", "ceramics", "pottery", "terracota", "terracotta"], external: "ceramics" },
  { aliases: ["textil", "têxtil", "textile", "textiles", "fibra", "fiber", "fibre", "tecido", "fabric"], external: "textile" },
  { aliases: ["bordado", "embroidery", "embroidered"], external: "embroidery" },
  { aliases: ["tecelagem", "weaving", "woven", "tapeçaria", "tapestry"], external: "weaving" },
  { aliases: ["fotografia", "fotografias", "foto", "photo", "photograph", "photography", "photographic", "fotografia", "fotográfico"], external: "photography" },
  { aliases: ["video", "vídeo", "videoarte", "vídeoarte", "video art", "moving image", "audiovisual"], external: "video art" },
  { aliases: ["filme", "film", "cinema", "movie", "motion picture"], external: "film" },
  { aliases: ["performance", "performance art", "happening", "body art", "arte corporal", "live art"], external: "performance art" },
  { aliases: ["instalacao", "instalação", "installation", "installation art", "instalación", "instalacion", "site specific", "site-specific"], external: "installation art" },
  { aliases: ["gravura", "print", "printmaking", "engraving", "etching", "xilogravura", "woodcut", "litografia", "lithograph", "serigrafia", "screenprint"], external: "printmaking" },
  { aliases: ["som", "arte sonora", "sound art", "sound", "audio", "áudio", "sonoro", "sonic"], external: "sound art" },
  { aliases: ["arte digital", "digital art", "computer art", "arte computacional", "computational art", "software art", "new media art", "novas midias", "novas mídias"], external: "digital art" },
  { aliases: ["webarte", "web art", "net art", "net.art", "internet art", "browser art", "arte em rede", "networked art"], external: "internet art" },
  { aliases: ["algoritmo", "algoritmos", "algorithm", "algorithmic", "arte algoritmica", "arte algorítmica", "algorithmic art", "generative art", "arte generativa"], external: "algorithmic art" },
  { aliases: ["inteligencia artificial", "inteligência artificial", "ia", "ai", "artificial intelligence", "machine learning", "aprendizado de maquina", "aprendizado de máquina", "rede neural", "neural network", "generative ai", "ia generativa"], external: "artificial intelligence art" },
  { aliases: ["interface", "interfaces", "interactive", "interativo", "interativa", "arte interativa", "interactive art", "human computer interaction", "hci"], external: "interactive art" },
  { aliases: ["jogo", "jogos", "game", "games", "game art", "videogame", "video game", "game design"], external: "game art" },
  { aliases: ["realidade virtual", "virtual reality", "vr", "realidade aumentada", "augmented reality", "ar", "realidade mista", "mixed reality", "imersivo", "immersive"], external: "virtual reality art" },
  { aliases: ["arquitetura", "architecture", "architectural", "edificio", "edifício", "building"], external: "architecture" },
  { aliases: ["design", "desenho industrial", "industrial design", "graphic design", "design grafico", "design gráfico", "interface design", "design de interfaces"], external: "design" },

  // períodos e movimentos
  { aliases: ["pre-historia", "pré-história", "prehistoria", "prehistory", "prehistoric", "paleolitico", "paleolítico", "paleolithic", "neolitico", "neolítico", "neolithic"], external: "prehistoric art" },
  { aliases: ["antiguidade", "ancient", "ancient art", "classico", "clássico", "classical", "grecia", "grécia", "greece", "roma", "rome"], external: "ancient art" },
  { aliases: ["medieval", "idade media", "idade média", "middle ages", "gotico", "gótico", "gothic", "romanico", "românico", "romanesque"], external: "medieval art" },
  { aliases: ["renascimento", "renaissance", "renascentista"], external: "Renaissance" },
  { aliases: ["barroco", "baroque"], external: "Baroque" },
  { aliases: ["rococo", "rococó", "rococo art"], external: "Rococo" },
  { aliases: ["neoclassicismo", "neoclassical", "neoclassicism"], external: "Neoclassicism" },
  { aliases: ["romantismo", "romanticism", "romantic"], external: "Romanticism" },
  { aliases: ["realismo", "realism", "realist"], external: "Realism" },
  { aliases: ["impressionismo", "impressionism", "impressionist"], external: "Impressionism" },
  { aliases: ["expressionismo", "expressionism", "expressionist"], external: "Expressionism" },
  { aliases: ["cubismo", "cubism", "cubist"], external: "Cubism" },
  { aliases: ["surrealismo", "surrealism", "surrealist"], external: "Surrealism" },
  { aliases: ["dada", "dadaismo", "dadaísmo", "dadaism"], external: "Dada" },
  { aliases: ["modernismo", "modernism", "modern art", "arte moderna"], external: "modern art" },
  { aliases: ["contemporaneo", "contemporâneo", "contemporary", "arte contemporanea", "arte contemporânea", "contemporary art"], external: "contemporary art" },

  // política da imagem / filosofia / curadoria
  { aliases: ["warburg", "aby warburg", "atlas mnemosyne", "mnemosyne", "pathosformel", "sobrevivencia", "sobrevivência", "nachleben"], external: "Aby Warburg" },
  { aliases: ["ranciere", "rancière", "espectador emancipado", "emancipated spectator", "partilha do sensivel", "partilha do sensível", "aesthetic regime", "regime estetico", "regime estético"], external: "Jacques Ranciere" },
  { aliases: ["benjamin", "walter benjamin", "reprodutibilidade", "reproducao tecnica", "reprodução técnica", "technical reproducibility", "aura"], external: "Walter Benjamin" },
  { aliases: ["visualidade", "visuality", "modos de ver", "ways of seeing", "john berger", "regime visual", "visual regime"], external: "visual culture" },
  { aliases: ["historia potencial", "história potencial", "potential history", "azoulay", "ariella azoulay", "imperial shutter"], external: "Ariella Azoulay" },
  { aliases: ["culturas hibridas", "culturas híbridas", "hybrid cultures", "canclini", "garcia canclini", "garcía canclini", "sociedade sem relato"], external: "hybrid cultures" },
  { aliases: ["curadoria", "curatorial", "curating", "exposicao", "exposição", "exhibition", "display", "expografia"], external: "curating contemporary art" },
  { aliases: ["tecnodiversidade", "technodiversity", "cosmotecnica", "cosmotécnica", "cosmotechnics", "yuk hui"], external: "technodiversity" },
  { aliases: ["sociotecnico", "sociotécnico", "sociotechnical", "simondon", "latour", "stengers", "individuacao", "individuação", "technical object"], external: "philosophy of technology" },
  { aliases: ["infraestrutura", "infraestruturas", "infrastructure", "stack", "cloud", "algoritmic governance", "governanca algoritmica", "governança algorítmica", "surveillance", "vigilancia", "vigilância", "dataset", "datasets"], external: "infrastructure art technology" },
  { aliases: ["materialismo", "materialisms", "novo materialismo", "new materialism", "materia vibrante", "matéria vibrante", "vibrant matter", "agencia", "agência", "agency", "barad", "bennett"], external: "new materialism art" },
];

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’'`´]/g, "")
    .replace(/[^a-z0-9+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIAS_INDEX = new Map<string, SearchConcept>();
for (const concept of CONCEPTS) {
  for (const alias of concept.aliases) ALIAS_INDEX.set(fold(alias), concept);
}

function basicVariants(value: string) {
  const normalized = fold(value);
  const variants = new Set<string>([value.trim(), normalized]);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    variants.add(token);
    if (token.length > 4 && token.endsWith("s")) variants.add(token.slice(0, -1));
    if (token.endsWith("oes") && token.length > 5) variants.add(`${token.slice(0, -3)}ao`);
    if (token.endsWith("aes") && token.length > 5) variants.add(`${token.slice(0, -3)}ao`);
    if (token.endsWith("is") && token.length > 4) variants.add(`${token.slice(0, -2)}l`);
  }
  return Array.from(variants).filter(Boolean);
}

export function expandSearchTerms(input: string, maxTerms = 24): string[] {
  const seeds = basicVariants(input);
  const expanded = new Set<string>();

  for (const seed of seeds) {
    if (!seed) continue;
    expanded.add(seed);
    const concept = ALIAS_INDEX.get(fold(seed));
    if (concept) concept.aliases.forEach((alias) => expanded.add(alias));
  }

  const foldedInput = fold(input);
  for (const concept of CONCEPTS) {
    if (
      concept.aliases.some((alias) => {
        const foldedAlias = fold(alias);
        return foldedAlias === foldedInput || (foldedInput.length >= 4 && foldedAlias.includes(foldedInput));
      })
    ) {
      concept.aliases.forEach((alias) => expanded.add(alias));
    }
  }

  return Array.from(expanded)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .slice(0, Math.max(1, maxTerms));
}

export function toExternalSearchQuery(input: string): string {
  const normalized = fold(input);
  const direct = ALIAS_INDEX.get(normalized);
  if (direct?.external) return direct.external;

  for (const concept of CONCEPTS) {
    if (concept.external && concept.aliases.some((alias) => fold(alias) === normalized)) {
      return concept.external;
    }
  }

  return input.trim();
}
