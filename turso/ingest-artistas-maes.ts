/**
 * Dossiê "Artistas mães": mulheres artistas que também foram mães, do século XVI ao presente,
 * em escala planetária. Cria a faceta, insere as ausentes e etiqueta todas.
 * Uso: bun run turso/ingest-artistas-maes.ts
 */
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

type Mae = {
  nome: string;
  vida: string;
  nasc: number;
  morte: number | null;
  pais: string;
  continente: string;
  regiao: string;
  cultura: string;
  filhos: string;
  nota: string;
  imagem?: string;
};

const MAES: Mae[] = [
  { nome: "Sofonisba Anguissola", vida: "1532–1625", nasc: 1532, morte: 1625, pais: "Itália", continente: "Europa", regiao: "italia", cultura: "Renascimento lombardo", filhos: "Sem filhos biológicos; matriarca de uma oficina de irmãs pintoras", nota: "Formou as irmãs na pintura e sustentou a família com o ofício, invertendo a lógica da oficina paterna." },
  { nome: "Lavinia Fontana", vida: "1552–1614", nasc: 1552, morte: 1614, pais: "Itália", continente: "Europa", regiao: "italia", cultura: "Maneirismo bolonhês", filhos: "11 filhos", nota: "Primeira mulher a manter grande ateliê profissional com encomendas públicas enquanto gestava e criava onze filhos; o marido administrava a casa." },
  { nome: "Artemisia Gentileschi", vida: "1593–1656", nasc: 1593, morte: 1656, pais: "Itália", continente: "Europa", regiao: "italia", cultura: "Barroco caravaggista", filhos: "5 filhos (uma filha, Prudenzia, também pintora)", nota: "Chefe de família e de ateliê em Florença, Nápoles e Londres; ensinou a filha e negociava contratos em nome próprio." },
  { nome: "Elisabetta Sirani", vida: "1638–1665", nasc: 1638, morte: 1665, pais: "Itália", continente: "Europa", regiao: "italia", cultura: "Barroco bolonhês", filhos: "Sem filhos; criou escola de pintura para moças", nota: "Fundou em Bolonha uma escola que funcionou como maternidade simbólica de uma geração de pintoras." },
  { nome: "Maria Sibylla Merian", vida: "1647–1717", nasc: 1647, morte: 1717, pais: "Alemanha", continente: "Europa", regiao: "europa-central", cultura: "Barroco naturalista", filhos: "2 filhas, Johanna e Dorothea, ambas ilustradoras", nota: "Viajou ao Suriname aos 52 anos acompanhada da filha; a pesquisa de metamorfose dos insetos foi feita em família." },
  { nome: "Rachel Ruysch", vida: "1664–1750", nasc: 1664, morte: 1750, pais: "Países Baixos", continente: "Europa", regiao: "europa-central", cultura: "Idade de Ouro neerlandesa", filhos: "10 filhos", nota: "Pintou naturezas-mortas florais durante sessenta anos de carreira sem interrupção, com dez filhos e pintora de corte do Eleitor Palatino." },
  { nome: "Rosalba Carriera", vida: "1673–1757", nasc: 1673, morte: 1757, pais: "Itália", continente: "Europa", regiao: "italia", cultura: "Rococó veneziano", filhos: "Sem filhos; sustentou mãe e irmãs", nota: "Rede de cuidado feminina como base econômica do ateliê de pastéis mais requisitado da Europa." },
  { nome: "Élisabeth Vigée Le Brun", vida: "1755–1842", nasc: 1755, morte: 1842, pais: "França", continente: "Europa", regiao: "franca", cultura: "Neoclassicismo", filhos: "1 filha, Julie", nota: "Os autorretratos com a filha reinventaram a iconografia materna do fim do Antigo Regime; exilou-se com ela pela Europa." },
  { nome: "Marguerite Gérard", vida: "1761–1837", nasc: 1761, morte: 1837, pais: "França", continente: "Europa", regiao: "franca", cultura: "Neoclassicismo doméstico", filhos: "Sem filhos; pintou a maternidade burguesa", nota: "Construiu um repertório inteiro sobre amamentação, berço e infância como assunto sério da pintura." },
  { nome: "Berthe Morisot", vida: "1841–1895", nasc: 1841, morte: 1895, pais: "França", continente: "Europa", regiao: "franca", cultura: "Impressionismo", filhos: "1 filha, Julie Manet", nota: "Fez do quarto de criança e do jardim doméstico território legítimo do impressionismo." },
  { nome: "Mary Cassatt", vida: "1844–1926", nasc: 1844, morte: 1926, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Impressionismo", filhos: "Sem filhos; obra dedicada ao vínculo mãe-criança", nota: "Reescreveu a Madona cristã como cena secular de banho, colo e leitura." },
  { nome: "Käthe Kollwitz", vida: "1867–1945", nasc: 1867, morte: 1945, pais: "Alemanha", continente: "Europa", regiao: "europa-central", cultura: "Expressionismo", filhos: "2 filhos; Peter morto na Primeira Guerra", nota: "Do luto materno tirou a mais dura iconografia antiguerra do século XX." },
  { nome: "Paula Modersohn-Becker", vida: "1876–1907", nasc: 1876, morte: 1907, pais: "Alemanha", continente: "Europa", regiao: "europa-central", cultura: "Expressionismo precoce", filhos: "1 filha; morreu no pós-parto", nota: "Primeiro autorretrato de uma pintora grávida e nua da história da arte ocidental." },
  { nome: "Anna Ancher", vida: "1859–1935", nasc: 1859, morte: 1935, pais: "Dinamarca", continente: "Europa", regiao: "escandinavia", cultura: "Escola de Skagen", filhos: "1 filha, Helga", nota: "Luz interior doméstica como pesquisa cromática, feita entre tarefas de casa e ateliê." },
  { nome: "Suzanne Valadon", vida: "1865–1938", nasc: 1865, morte: 1938, pais: "França", continente: "Europa", regiao: "franca", cultura: "Pós-impressionismo", filhos: "1 filho, Maurice Utrillo", nota: "De modelo a pintora; criou o filho sozinha e o formou pintor, invertendo a genealogia mestre-discípulo." },
  { nome: "Gwen John", vida: "1876–1939", nasc: 1876, morte: 1939, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Modernismo britânico", filhos: "Sem filhos", nota: "Interiores de silêncio e cuidado de si como contraponto ao gênio masculino ruidoso." },
  { nome: "Sonia Delaunay", vida: "1885–1979", nasc: 1885, morte: 1979, pais: "Ucrânia/França", continente: "Europa", regiao: "franca", cultura: "Simultaneísmo", filhos: "1 filho, Charles", nota: "A primeira colcha simultânea foi feita para o berço do filho — origem doméstica da abstração." },
  { nome: "Anita Malfatti", vida: "1889–1964", nasc: 1889, morte: 1964, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Modernismo brasileiro", filhos: "Sem filhos; professora de gerações", nota: "Maternidade pedagógica: formou artistas no ensino de desenho infantil." },
  { nome: "Tarsila do Amaral", vida: "1886–1973", nasc: 1886, morte: 1973, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Antropofagia", filhos: "1 filha, Dulce", nota: "A antropofagia como devoração e gestação — matriz de um modernismo que come para gerar." },
  { nome: "Frida Kahlo", vida: "1907–1954", nasc: 1907, morte: 1954, pais: "México", continente: "América do Norte", regiao: "mesoamerica", cultura: "Modernismo mexicano", filhos: "Sem filhos; três gestações interrompidas", nota: "Fez da maternidade impossível — aborto, hospital, cordão umbilical — imagem central de sua obra." },
  { nome: "Amrita Sher-Gil", vida: "1913–1941", nasc: 1913, morte: 1941, pais: "Índia", continente: "Ásia", regiao: "sul-da-asia", cultura: "Modernismo indiano", filhos: "Sem filhos", nota: "Retratou mulheres rurais indianas fora do exotismo colonial, com atenção ao trabalho de cuidado." },
  { nome: "Uemura Shōen", vida: "1875–1949", nasc: 1875, morte: 1949, pais: "Japão", continente: "Ásia", regiao: "japao", cultura: "Nihonga", filhos: "2 filhos, um deles pintor", nota: "Mãe solteira em Kyoto, criou o bijin-ga como retrato da dignidade interior das mulheres." },
  { nome: "Pan Yuliang", vida: "1895–1977", nasc: 1895, morte: 1977, pais: "China", continente: "Ásia", regiao: "china", cultura: "Modernismo chinês", filhos: "Sem filhos biológicos; criou o enteado", nota: "Do bordel à academia de Paris; o nu feminino chinês moderno passa por sua biografia de cuidado." },
  { nome: "Georgia O'Keeffe", vida: "1887–1986", nasc: 1887, morte: 1986, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Modernismo americano", filhos: "Sem filhos, por decisão", nota: "Recusa deliberada da maternidade como condição declarada da carreira — o outro lado do dossiê." },
  { nome: "Alice Neel", vida: "1900–1984", nasc: 1900, morte: 1984, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Realismo expressivo", filhos: "4 filhos; uma filha morta na infância", nota: "Pintou grávidas nuas sentadas e frontais, quebrando o tabu do corpo gestante na pintura moderna." },
  { nome: "Louise Bourgeois", vida: "1911–2010", nasc: 1911, morte: 2010, pais: "França/Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Escultura moderna", filhos: "3 filhos", nota: "A série Maman transforma a aranha em figura de mãe tecelã, protetora e ameaçadora." },
  { nome: "Lygia Clark", vida: "1920–1988", nasc: 1920, morte: 1988, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Neoconcretismo", filhos: "3 filhos", nota: "Objetos relacionais e Baba antropofágica derivam de uma pesquisa sobre toque, cuidado e regressão." },
  { nome: "Maria Martins", vida: "1894–1973", nasc: 1894, morte: 1973, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Surrealismo brasileiro", filhos: "3 filhas", nota: "Esculpiu a floresta amazônica como corpo fértil e devorador, entre embaixadas e maternidade." },
  { nome: "Djanira da Motta e Silva", vida: "1914–1979", nasc: 1914, morte: 1979, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Modernismo popular", filhos: "Sem filhos; cuidou de familiares", nota: "Trabalho, religiosidade afro-indígena e cotidiano popular pintados de dentro." },
  { nome: "Remedios Varo", vida: "1908–1963", nasc: 1908, morte: 1963, pais: "Espanha/México", continente: "América do Norte", regiao: "mesoamerica", cultura: "Surrealismo", filhos: "Sem filhos; alquimia como gestação", nota: "A criação em suas telas é sempre incubação: torres, teares, úteros-laboratório." },
  { nome: "Leonora Carrington", vida: "1917–2011", nasc: 1917, morte: 2011, pais: "Reino Unido/México", continente: "América do Norte", regiao: "mesoamerica", cultura: "Surrealismo", filhos: "2 filhos", nota: "Cozinha, alquimia e mitologia céltico-mexicana como saberes maternos reinventados." },
  { nome: "Maria Auxiliadora da Silva", vida: "1935–1974", nasc: 1935, morte: 1974, pais: "Brasil", continente: "América do Sul", regiao: "afro-brasileiro", cultura: "Arte afro-brasileira", filhos: "1 filho", nota: "Pintura em relevo com cabelo humano; festas, candomblé e maternidade negra periférica." },
  { nome: "Rosana Paulino", vida: "1967–", nasc: 1967, morte: null, pais: "Brasil", continente: "América do Sul", regiao: "afro-brasileiro", cultura: "Arte contemporânea afro-brasileira", filhos: "Genealogias femininas negras como matéria", nota: "Bastidores e Assentamento costuram a memória de mães e avós negras brasileiras." },
  { nome: "Adriana Varejão", vida: "1964–", nasc: 1964, morte: null, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Arte contemporânea", filhos: "1 filho", nota: "Carne, azulejo e cicatriz colonial: o corpo que sangra e gera como superfície histórica." },
  { nome: "Cecilia Vicuña", vida: "1948–", nasc: 1948, morte: null, pais: "Chile", continente: "América do Sul", regiao: "andes", cultura: "Arte andina contemporânea", filhos: "Quipu como linhagem materna", nota: "Fios, água e memória: o quipu recuperado como cordão umbilical entre gerações andinas." },
  { nome: "Ana Mendieta", vida: "1948–1985", nasc: 1948, morte: 1985, pais: "Cuba/Estados Unidos", continente: "América do Norte", regiao: "caribe", cultura: "Body art e land art", filhos: "Sem filhos; a terra como mãe", nota: "A série Silueta funde corpo e solo, buscando a mãe-terra perdida no exílio." },
  { nome: "Faith Ringgold", vida: "1930–2024", nasc: 1930, morte: 2024, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Arte afro-americana", filhos: "2 filhas", nota: "Story quilts costurados com a mãe estilista: a colcha como arquivo de linhagem negra." },
  { nome: "Betye Saar", vida: "1926–", nasc: 1926, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Assemblage afro-americana", filhos: "3 filhas, duas delas artistas", nota: "Assemblages de objetos domésticos como altares de memória familiar negra." },
  { nome: "Yayoi Kusama", vida: "1929–", nasc: 1929, morte: null, pais: "Japão", continente: "Ásia", regiao: "japao", cultura: "Arte contemporânea japonesa", filhos: "Sem filhos", nota: "Proliferação infinita de pontos como reprodução obsessiva sem descendência." },
  { nome: "Shirin Neshat", vida: "1957–", nasc: 1957, morte: null, pais: "Irã", continente: "Ásia", regiao: "persia", cultura: "Arte contemporânea iraniana", filhos: "1 filho", nota: "Exílio, véu e caligrafia sobre a pele: transmissão materna interrompida pela fronteira." },
  { nome: "Mona Hatoum", vida: "1952–", nasc: 1952, morte: null, pais: "Palestina/Líbano", continente: "Ásia", regiao: "levante", cultura: "Arte contemporânea", filhos: "Sem filhos; correspondência com a mãe como obra", nota: "Em Measures of Distance, cartas da mãe sobre o corpo e a guerra viram videoinstalação." },
  { nome: "Emily Kame Kngwarreye", vida: "1910–1996", nasc: 1910, morte: 1996, pais: "Austrália", continente: "Oceania", regiao: "aborigene", cultura: "Anmatyerre", filhos: "Mãe cerimonial (kngwarreye) de sua comunidade", nota: "Começou a pintar em tela aos 78 anos; o awelye é conhecimento feminino transmitido entre mulheres." },
  { nome: "Sally Gabori", vida: "1924–2015", nasc: 1924, morte: 2015, pais: "Austrália", continente: "Oceania", regiao: "aborigene", cultura: "Kaiadilt", filhos: "11 filhos", nota: "Pintou aos 80 anos o território insular de Bentinck como memória transmitida aos filhos." },
  { nome: "Robin White", vida: "1946–", nasc: 1946, morte: null, pais: "Nova Zelândia", continente: "Oceania", regiao: "maori", cultura: "Aotearoa e Kiribati", filhos: "Colaborações coletivas com mulheres do Pacífico", nota: "Tapa e tecelagem feitos com grupos de mulheres: autoria coletiva de matriz materna." },
  { nome: "Esther Mahlangu", vida: "1935–", nasc: 1935, morte: null, pais: "África do Sul", continente: "África", regiao: "africa-do-sul", cultura: "Ndebele", filhos: "Transmissão mãe-filha da pintura mural", nota: "Aprendeu com a mãe e a avó a pintura de casas ndebele e a levou à tela e à escola que fundou." },
  { nome: "Sokari Douglas Camp", vida: "1958–", nasc: 1958, morte: null, pais: "Nigéria/Reino Unido", continente: "África", regiao: "nigeria", cultura: "Kalabari", filhos: "1 filha", nota: "Esculturas em aço sobre rituais kalabari, incluindo cerimônias femininas de passagem." },
  { nome: "Bertina Lopes", vida: "1924–2012", nasc: 1924, morte: 2012, pais: "Moçambique", continente: "África", regiao: "africa-austral", cultura: "Modernismo moçambicano", filhos: "Mãe simbólica do modernismo moçambicano", nota: "Professora e pintora no exílio, formou uma geração de artistas moçambicanos." },
  { nome: "Magdalena Abakanowicz", vida: "1930–2017", nasc: 1930, morte: 2017, pais: "Polônia", continente: "Europa", regiao: "europa-central", cultura: "Arte têxtil", filhos: "Sem filhos", nota: "Os Abakans em sisal são cavidades orgânicas: úteros habitáveis feitos de fibra." },
  { nome: "Maria Prymachenko", vida: "1909–1997", nasc: 1909, morte: 1997, pais: "Ucrânia", continente: "Europa", regiao: "europa-oriental", cultura: "Arte popular ucraniana", filhos: "1 filho, também pintor", nota: "Bestiário camponês pintado em casa; a linhagem seguiu pelo filho e pelos netos." },
  { nome: "Hilma af Klint", vida: "1862–1944", nasc: 1862, morte: 1944, pais: "Suécia", continente: "Europa", regiao: "escandinavia", cultura: "Abstração espiritual", filhos: "Sem filhos; grupo As Cinco", nota: "Coletivo de cinco mulheres em sessões mediúnicas gerou a abstração antes de Kandinsky." },
];

const FACET_MAES = "sensibilidade:artistas-maes";

async function main() {
  await db.execute({
    sql: "INSERT OR REPLACE INTO facets (id, kind, name, summary) VALUES (?,?,?,?)",
    args: [
      FACET_MAES,
      "sensibilidade",
      "Artistas mães",
      "Mulheres artistas atravessadas pela maternidade — vivida, recusada, impossível ou simbólica — como condição material e matéria de obra.",
    ],
  });

  const rows = (await db.execute("SELECT id, LOWER(title) t FROM entities WHERE entity_type = 'artista'"))
    .rows as unknown as { id: string; t: string }[];
  const byTitle = new Map(rows.map((r) => [r.t, r.id]));

  let created = 0;
  let tagged = 0;

  for (const m of MAES) {
    let id = byTitle.get(m.nome.toLowerCase());

    if (!id) {
      id = randomUUID();
      await db.execute({
        sql: `INSERT INTO entities (id, entity_type, title, subtitle, description, date_display, date_start, date_end,
                country, continent, culture, region_id, latitude, longitude, tags, themes, metadata, status)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,
                (SELECT latitude FROM regions WHERE id = ?),
                (SELECT longitude FROM regions WHERE id = ?),
                ?,?,?, 'published')`,
        args: [
          id,
          "artista",
          m.nome,
          `${m.cultura} · ${m.pais}`,
          `${m.nota} Maternidade: ${m.filhos}.`,
          m.vida,
          m.nasc,
          m.morte,
          m.pais,
          m.continente,
          m.cultura,
          m.regiao,
          m.regiao,
          m.regiao,
          JSON.stringify(["artista", "mulheres", "maternidade"]),
          JSON.stringify(["maternidade", "genealogias femininas"]),
          JSON.stringify({ maternidade: { filhos: m.filhos, nota: m.nota }, dossie: "artistas-maes" }),
        ],
      });
      created++;
    } else {
      await db.execute({
        sql: `UPDATE entities
                 SET metadata = json_set(COALESCE(NULLIF(metadata,''),'{}'), '$.maternidade',
                       json_object('filhos', ?, 'nota', ?), '$.dossie', 'artistas-maes'),
                     status = 'published'
               WHERE id = ?`,
        args: [m.filhos, m.nota, id],
      });
    }

    for (const f of [FACET_MAES, "sensibilidade:maternidade", "identidade:mulheres"]) {
      const r = await db.execute({
        sql: "INSERT OR IGNORE INTO entity_facets (entity_id, facet_id) VALUES (?,?)",
        args: [id, f],
      });
      tagged += r.rowsAffected;
    }
  }

  const total = await db.execute({
    sql: "SELECT COUNT(*) c FROM entity_facets WHERE facet_id = ?",
    args: [FACET_MAES],
  });
  console.log({ created, tagged, dossie: (total.rows[0] as unknown as { c: number }).c });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
