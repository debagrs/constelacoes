/**
 * Dossiê "Artistas mães" — lote 2: mais 100 mulheres artistas, do século XVI ao presente,
 * em escala planetária. Reaproveita a faceta existente, insere as ausentes e etiqueta todas.
 * Uso: bun run turso/ingest-artistas-maes-2.ts
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
};

const MAES: Mae[] = [
  // ── Europa moderna ─────────────────────────────────────────────────────────
  { nome: "Fede Galizia", vida: "1578–1630", nasc: 1578, morte: 1630, pais: "Itália", continente: "Europa", regiao: "italia", cultura: "Barroco lombardo", filhos: "Sem filhos; sustentou a casa paterna", nota: "Inventou a natureza-morta italiana de frutas em ateliê próprio, sem tutela marital." },
  { nome: "Giovanna Garzoni", vida: "1600–1670", nasc: 1600, morte: 1670, pais: "Itália", continente: "Europa", regiao: "italia", cultura: "Barroco", filhos: "Sem filhos, por voto próprio", nota: "Recusou o casamento para manter a independência do ofício; miniaturas botânicas para os Médici." },
  { nome: "Judith Leyster", vida: "1609–1660", nasc: 1609, morte: 1660, pais: "Países Baixos", continente: "Europa", regiao: "europa-central", cultura: "Idade de Ouro neerlandesa", filhos: "5 filhos", nota: "Mestre da guilda de Haarlem; a produção diminui e se reorganiza em torno das gestações." },
  { nome: "Michaelina Wautier", vida: "1604–1689", nasc: 1604, morte: 1689, pais: "Flandres", continente: "Europa", regiao: "europa-central", cultura: "Barroco flamengo", filhos: "Sem filhos; viveu com o irmão pintor", nota: "Pintou o nu masculino em grande formato, tema proibido às mulheres de seu tempo." },
  { nome: "Clara Peeters", vida: "1594–1657", nasc: 1594, morte: 1657, pais: "Flandres", continente: "Europa", regiao: "europa-central", cultura: "Barroco flamengo", filhos: "Sem registro de filhos", nota: "Autorretratos escondidos nos reflexos das taças: assinatura de uma autoria que precisava se esconder." },
  { nome: "Louise Moillon", vida: "1610–1696", nasc: 1610, morte: 1696, pais: "França", continente: "Europa", regiao: "franca", cultura: "Barroco francês", filhos: "3 filhos", nota: "Interrompeu a pintura por décadas ao casar; retomou depois de criar os filhos." },
  { nome: "Mary Beale", vida: "1633–1699", nasc: 1633, morte: 1699, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Retrato inglês", filhos: "2 filhos, ambos assistentes de ateliê", nota: "Primeira profissional inglesa a sustentar a família com retratos; o marido moía as tintas." },
  { nome: "Maria van Oosterwijck", vida: "1630–1693", nasc: 1630, morte: 1693, pais: "Países Baixos", continente: "Europa", regiao: "europa-central", cultura: "Idade de Ouro neerlandesa", filhos: "Sem filhos; recusou pedidos de casamento", nota: "Vanitas florais vendidas a cortes europeias; a recusa do matrimônio como cálculo de carreira." },
  { nome: "Luisa Roldán", vida: "1652–1706", nasc: 1652, morte: 1706, pais: "Espanha", continente: "Europa", regiao: "iberia", cultura: "Barroco andaluz", filhos: "Vários filhos; apenas dois sobreviveram", nota: "Primeira escultora de câmara do rei da Espanha; morreu na miséria apesar do título." },
  { nome: "Giulia Lama", vida: "1681–1747", nasc: 1681, morte: 1747, pais: "Itália", continente: "Europa", regiao: "italia", cultura: "Barroco veneziano", filhos: "Sem filhos", nota: "Pintou retábulos monumentais em Veneza, com estudos de nu raros para uma mulher." },
  { nome: "Anna Dorothea Therbusch", vida: "1721–1782", nasc: 1721, morte: 1782, pais: "Alemanha", continente: "Europa", regiao: "europa-central", cultura: "Rococó prussiano", filhos: "3 filhos", nota: "Recomeçou a carreira aos 40 anos, depois de criar os filhos, e virou pintora de Frederico II." },
  { nome: "Angelica Kauffman", vida: "1741–1807", nasc: 1741, morte: 1807, pais: "Suíça", continente: "Europa", regiao: "europa-central", cultura: "Neoclassicismo", filhos: "Sem filhos", nota: "Cofundadora da Royal Academy; pintou heroínas antigas como mães políticas." },
  { nome: "Adélaïde Labille-Guiard", vida: "1749–1803", nasc: 1749, morte: 1803, pais: "França", continente: "Europa", regiao: "franca", cultura: "Neoclassicismo", filhos: "Sem filhos; formou nove alunas", nota: "Exigiu à Academia o fim da cota de quatro mulheres; maternidade pedagógica militante." },
  { nome: "Marie-Guillemine Benoist", vida: "1768–1826", nasc: 1768, morte: 1826, pais: "França", continente: "Europa", regiao: "franca", cultura: "Neoclassicismo", filhos: "3 filhos", nota: "O Retrato de Madeleine confronta a escravidão e a maternidade negra silenciada." },
  { nome: "Constance Mayer", vida: "1775–1821", nasc: 1775, morte: 1821, pais: "França", continente: "Europa", regiao: "franca", cultura: "Romantismo", filhos: "Sem filhos; criou os filhos de Prud'hon", nota: "Maternidade delegada e autoria absorvida pelo companheiro; suicidou-se aos 46 anos." },
  { nome: "Marie-Denise Villers", vida: "1774–1821", nasc: 1774, morte: 1821, pais: "França", continente: "Europa", regiao: "franca", cultura: "Neoclassicismo", filhos: "Filhos com o arquiteto Villers", nota: "Sua obra-prima foi atribuída a David por um século, até revisão de autoria feminina." },
  { nome: "Rosa Bonheur", vida: "1822–1899", nasc: 1822, morte: 1899, pais: "França", continente: "Europa", regiao: "franca", cultura: "Realismo animalista", filhos: "Sem filhos; parceria vitalícia com Nathalie Micas", nota: "Autorização policial para usar calças; casa e ateliê organizados por uma família de escolha." },
  { nome: "Marie Bracquemond", vida: "1840–1916", nasc: 1840, morte: 1916, pais: "França", continente: "Europa", regiao: "franca", cultura: "Impressionismo", filhos: "1 filho, Pierre", nota: "Abandonou a pintura sob pressão do marido; o filho reconstituiu sua obra póstuma." },
  { nome: "Eva Gonzalès", vida: "1849–1883", nasc: 1849, morte: 1883, pais: "França", continente: "Europa", regiao: "franca", cultura: "Impressionismo", filhos: "1 filho; morreu no pós-parto aos 34", nota: "Morte puerperal seis dias depois do parto — risco material da maternidade no século XIX." },
  { nome: "Elizabeth Butler", vida: "1846–1933", nasc: 1846, morte: 1933, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Pintura de batalha", filhos: "6 filhos", nota: "Pintou guerra em grande escala entre seis gestações; recusada na Royal Academy por um voto." },
  { nome: "Helene Schjerfbeck", vida: "1862–1946", nasc: 1862, morte: 1946, pais: "Finlândia", continente: "Europa", regiao: "escandinavia", cultura: "Modernismo nórdico", filhos: "Sem filhos; cuidou da mãe por décadas", nota: "Décadas de reclusão como cuidadora produziram a série de autorretratos mais radical do Norte." },
  { nome: "Harriet Backer", vida: "1845–1932", nasc: 1845, morte: 1932, pais: "Noruega", continente: "Europa", regiao: "escandinavia", cultura: "Naturalismo nórdico", filhos: "Sem filhos; mestra de uma escola de pintura", nota: "Interiores de luz e trabalho doméstico como laboratório cromático." },
  { nome: "Anna Boberg", vida: "1864–1935", nasc: 1864, morte: 1935, pais: "Suécia", continente: "Europa", regiao: "escandinavia", cultura: "Modernismo nórdico", filhos: "Filhos criados entre expedições ao Ártico", nota: "Trinta invernos em Lofoten pintando o Ártico, indo e voltando da vida familiar." },
  { nome: "Vanessa Bell", vida: "1879–1961", nasc: 1879, morte: 1961, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Bloomsbury", filhos: "3 filhos", nota: "Charleston: casa, filhos e pintura mural como obra total de uma família reinventada." },
  { nome: "Laura Knight", vida: "1877–1970", nasc: 1877, morte: 1970, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Realismo britânico", filhos: "Sem filhos", nota: "Primeira mulher eleita à Royal Academy em 168 anos; pintou circo, balé e Nuremberg." },
  { nome: "Gluck", vida: "1895–1978", nasc: 1895, morte: 1978, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Modernismo britânico", filhos: "Sem filhos; recusa do gênero binário", nota: "Rejeitou nome, gênero e a expectativa de maternidade como programa estético." },
  { nome: "Winifred Knights", vida: "1899–1947", nasc: 1899, morte: 1947, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Modernismo britânico", filhos: "1 filho", nota: "A produção rareia após o nascimento do filho, num arquivo exemplar da penalidade materna." },
  { nome: "Marianne Werefkin", vida: "1860–1938", nasc: 1860, morte: 1938, pais: "Rússia", continente: "Europa", regiao: "europa-oriental", cultura: "Expressionismo", filhos: "Sem filhos; criou o filho de Jawlensky com a empregada", nota: "Parou de pintar dez anos para sustentar o companheiro; voltou com uma obra própria e sombria." },
  { nome: "Natalia Goncharova", vida: "1881–1962", nasc: 1881, morte: 1962, pais: "Rússia", continente: "Europa", regiao: "europa-oriental", cultura: "Raionismo", filhos: "Sem filhos", nota: "Recolheu a iconografia camponesa das mulheres russas para fundar uma vanguarda própria." },
  { nome: "Liubov Popova", vida: "1889–1924", nasc: 1889, morte: 1924, pais: "Rússia", continente: "Europa", regiao: "europa-oriental", cultura: "Construtivismo", filhos: "1 filho", nota: "Morreu de escarlatina dois dias depois do filho; o construtivismo perdeu sua maior colorista." },
  { nome: "Varvara Stepanova", vida: "1894–1958", nasc: 1894, morte: 1958, pais: "Rússia", continente: "Europa", regiao: "europa-oriental", cultura: "Construtivismo", filhos: "1 filha", nota: "Desenhou roupas de trabalho e de criança como projeto político do corpo cotidiano." },
  { nome: "Alexandra Exter", vida: "1882–1949", nasc: 1882, morte: 1949, pais: "Ucrânia", continente: "Europa", regiao: "europa-oriental", cultura: "Cubofuturismo", filhos: "Sem filhos; formou gerações no exílio", nota: "Escola de cenografia em Paris como maternidade profissional da diáspora russa." },
  { nome: "Zinaida Serebriakova", vida: "1884–1967", nasc: 1884, morte: 1967, pais: "Rússia", continente: "Europa", regiao: "europa-oriental", cultura: "Neoclassicismo russo", filhos: "4 filhos, separados dela pelo exílio", nota: "Pintou os filhos à mesa e adormecidos; a revolução transformou esses retratos em luto." },
  { nome: "Marie Laurencin", vida: "1883–1956", nasc: 1883, morte: 1956, pais: "França", continente: "Europa", regiao: "franca", cultura: "Modernismo francês", filhos: "Adotou uma filha aos 70 anos", nota: "Filha ilegítima criada só pela mãe; adotou por sua vez, fechando um ciclo de filiação eletiva." },
  { nome: "Tamara de Lempicka", vida: "1898–1980", nasc: 1898, morte: 1980, pais: "Polônia", continente: "Europa", regiao: "europa-central", cultura: "Art déco", filhos: "1 filha, Kizette", nota: "Pintou a filha repetidas vezes, mas a apresentava como irmã para preservar a imagem pública." },
  { nome: "Meret Oppenheim", vida: "1913–1985", nasc: 1913, morte: 1985, pais: "Suíça", continente: "Europa", regiao: "europa-central", cultura: "Surrealismo", filhos: "Sem filhos", nota: "Depois de anos de crise, retomou a obra recusando o papel de musa e de mãe." },
  { nome: "Dora Maar", vida: "1907–1997", nasc: 1907, morte: 1997, pais: "França", continente: "Europa", regiao: "franca", cultura: "Surrealismo fotográfico", filhos: "Sem filhos", nota: "Fotógrafa apagada pela biografia de Picasso; documentou a gestação de Guernica." },
  { nome: "Lee Miller", vida: "1907–1977", nasc: 1907, morte: 1977, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Fotografia surrealista", filhos: "1 filho, Antony", nota: "O filho encontrou no sótão os negativos da guerra que a mãe nunca mencionara." },
  { nome: "Claude Cahun", vida: "1894–1954", nasc: 1894, morte: 1954, pais: "França", continente: "Europa", regiao: "franca", cultura: "Surrealismo", filhos: "Sem filhos; parceria com Marcel Moore", nota: "Recusou o gênero fixo e a reprodução; resistência antinazista em dupla artística e amorosa." },
  { nome: "Germaine Richier", vida: "1902–1959", nasc: 1902, morte: 1959, pais: "França", continente: "Europa", regiao: "franca", cultura: "Escultura moderna", filhos: "1 filho, nascido quando ela tinha 52 anos", nota: "Figuras híbridas de inseto e humano; gestou o filho no auge da carreira escultórica." },
  { nome: "Barbara Hepworth", vida: "1903–1975", nasc: 1903, morte: 1975, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Escultura moderna", filhos: "4 filhos, entre eles trigêmeos", nota: "As formas perfuradas nascem, por sua própria conta, da experiência do corpo que abriga outro." },
  { nome: "Eileen Agar", vida: "1899–1991", nasc: 1899, morte: 1991, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Surrealismo", filhos: "Sem filhos; dois abortos impostos", nota: "Escreveu sobre as interrupções forçadas de gravidez como parte da sua formação artística." },
  { nome: "Bridget Riley", vida: "1931–", nasc: 1931, morte: null, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Op art", filhos: "Sem filhos, por decisão", nota: "Decidiu não ter filhos para manter o regime de trabalho óptico de precisão total." },
  { nome: "Maria Helena Vieira da Silva", vida: "1908–1992", nasc: 1908, morte: 1992, pais: "Portugal", continente: "Europa", regiao: "iberia", cultura: "Abstração lírica", filhos: "Sem filhos", nota: "Labirintos urbanos pintados no exílio brasileiro e parisiense como casas impossíveis." },
  { nome: "Maruja Mallo", vida: "1902–1995", nasc: 1902, morte: 1995, pais: "Espanha", continente: "Europa", regiao: "iberia", cultura: "Surrealismo espanhol", filhos: "Sem filhos", nota: "As Sinsombrero: mulheres que tiraram o chapéu e recusaram o destino doméstico." },
  { nome: "Ángeles Santos", vida: "1911–2013", nasc: 1911, morte: 2013, pais: "Espanha", continente: "Europa", regiao: "iberia", cultura: "Vanguarda espanhola", filhos: "2 filhos", nota: "Pintou Un mundo aos 18 anos; internada pela família, retomou a pintura entre os filhos." },
  { nome: "Carla Accardi", vida: "1924–2014", nasc: 1924, morte: 2014, pais: "Itália", continente: "Europa", regiao: "italia", cultura: "Abstração italiana", filhos: "Sem filhos; militante feminista", nota: "Cofundou o Rivolta Femminile; signos abstratos como escrita não patriarcal." },
  { nome: "Marisa Merz", vida: "1926–2019", nasc: 1926, morte: 2019, pais: "Itália", continente: "Europa", regiao: "italia", cultura: "Arte povera", filhos: "1 filha, Beatrice", nota: "Fez esculturas de alumínio na sala de casa e sapatinhos de cobre para a filha." },
  { nome: "Maria Lassnig", vida: "1919–2014", nasc: 1919, morte: 2014, pais: "Áustria", continente: "Europa", regiao: "europa-central", cultura: "Body awareness", filhos: "Sem filhos; filha ilegítima de mãe solteira", nota: "Pintou a própria consciência corporal e a relação difícil com a mãe até os 94 anos." },
  { nome: "VALIE EXPORT", vida: "1940–", nasc: 1940, morte: null, pais: "Áustria", continente: "Europa", regiao: "europa-central", cultura: "Arte de ação feminista", filhos: "1 filha", nota: "Mãe solteira aos 20 anos; a performance como resposta ao confinamento doméstico." },
  { nome: "Rebecca Horn", vida: "1944–2024", nasc: 1944, morte: 2024, pais: "Alemanha", continente: "Europa", regiao: "europa-central", cultura: "Arte corporal", filhos: "Sem filhos", nota: "Próteses e extensões do corpo nascidas de um longo período de convalescença em sanatório." },
  { nome: "Katharina Fritsch", vida: "1956–", nasc: 1956, morte: null, pais: "Alemanha", continente: "Europa", regiao: "europa-central", cultura: "Escultura contemporânea", filhos: "1 filha", nota: "Figuras monocromáticas de escala inquietante extraídas do imaginário infantil e do conto." },
  { nome: "Rosemarie Trockel", vida: "1952–", nasc: 1952, morte: null, pais: "Alemanha", continente: "Europa", regiao: "europa-central", cultura: "Arte conceitual", filhos: "Sem filhos", nota: "Tricô industrial como crítica ao trabalho manual atribuído às mulheres." },
  { nome: "Isa Genzken", vida: "1948–", nasc: 1948, morte: null, pais: "Alemanha", continente: "Europa", regiao: "europa-central", cultura: "Escultura contemporânea", filhos: "Sem filhos", nota: "Assemblages urbanas de ruína e consumo; recusa do lar como matéria." },
  { nome: "Marina Abramović", vida: "1946–", nasc: 1946, morte: null, pais: "Sérvia", continente: "Europa", regiao: "balcas", cultura: "Performance", filhos: "Sem filhos, por decisão declarada", nota: "Declarou que a maternidade seria incompatível com sua entrega ao trabalho de performance." },
  { nome: "Marlene Dumas", vida: "1953–", nasc: 1953, morte: null, pais: "África do Sul/Países Baixos", continente: "Europa", regiao: "europa-central", cultura: "Pintura contemporânea", filhos: "1 filha, Helena", nota: "O nascimento da filha gerou a série de bebês e recém-nascidos que redefiniu sua pintura." },
  { nome: "Jenny Saville", vida: "1970–", nasc: 1970, morte: null, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Pintura contemporânea", filhos: "2 filhos", nota: "Depois dos partos, passou a pintar mães e crianças em emaranhados de linhas em movimento." },
  { nome: "Tracey Emin", vida: "1963–", nasc: 1963, morte: null, pais: "Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Arte confessional", filhos: "Sem filhos; dois abortos como tema de obra", nota: "Fez dos abortos, da cama e do corpo doente um arquivo autobiográfico exposto." },
  { nome: "Paula Rego", vida: "1935–2022", nasc: 1935, morte: 2022, pais: "Portugal", continente: "Europa", regiao: "iberia", cultura: "Figuração narrativa", filhos: "3 filhos", nota: "A série Abortion foi feita para a campanha do referendo português: maternidade como direito." },
  { nome: "Berlinde De Bruyckere", vida: "1964–", nasc: 1964, morte: null, pais: "Bélgica", continente: "Europa", regiao: "europa-central", cultura: "Escultura contemporânea", filhos: "2 filhos", nota: "Corpos de cera e crina como carne vulnerável; o cuidado e a ferida na mesma matéria." },
  { nome: "Chantal Akerman", vida: "1950–2015", nasc: 1950, morte: 2015, pais: "Bélgica", continente: "Europa", regiao: "europa-central", cultura: "Cinema e videoarte", filhos: "Sem filhos; obra centrada na mãe sobrevivente", nota: "Jeanne Dielman filma em tempo real o trabalho doméstico de uma mãe; a última obra é sobre a sua." },

  // ── Américas ───────────────────────────────────────────────────────────────
  { nome: "Harriet Powers", vida: "1837–1910", nasc: 1837, morte: 1910, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Story quilt afro-americana", filhos: "9 filhos", nota: "Nascida escravizada, costurou colchas cosmológicas enquanto criava nove filhos na Geórgia." },
  { nome: "Edmonia Lewis", vida: "1844–1907", nasc: 1844, morte: 1907, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Neoclassicismo", filhos: "Sem filhos", nota: "De mãe ojibwe e pai haitiano, esculpiu em Roma a maternidade negra livre em Forever Free." },
  { nome: "Harriet Hosmer", vida: "1830–1908", nasc: 1830, morte: 1908, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Neoclassicismo", filhos: "Sem filhos; comunidade de escultoras em Roma", nota: "Liderou uma casa coletiva de escultoras solteiras, alternativa explícita à família nuclear." },
  { nome: "Lilla Cabot Perry", vida: "1848–1933", nasc: 1848, morte: 1933, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Impressionismo", filhos: "3 filhas", nota: "Começou a pintar aos 36, depois das filhas; levou o impressionismo aos Estados Unidos e ao Japão." },
  { nome: "Cecilia Beaux", vida: "1855–1942", nasc: 1855, morte: 1942, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Retrato americano", filhos: "Sem filhos, por escolha declarada", nota: "Criada por tias após a morte da mãe; escreveu que a carreira exigia recusar o casamento." },
  { nome: "Augusta Savage", vida: "1892–1962", nasc: 1892, morte: 1962, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Renascimento do Harlem", filhos: "1 filha, criada em meio à pobreza", nota: "Mãe aos 15 anos; fundou escolas comunitárias que formaram uma geração de artistas negros." },
  { nome: "Lois Mailou Jones", vida: "1905–1998", nasc: 1905, morte: 1998, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Renascimento do Harlem", filhos: "Sem filhos; 47 anos de magistério", nota: "Professora em Howard por quase meio século: linhagem materna docente da arte negra americana." },
  { nome: "Elizabeth Catlett", vida: "1915–2012", nasc: 1915, morte: 2012, pais: "Estados Unidos/México", continente: "América do Norte", regiao: "mesoamerica", cultura: "Gravura social", filhos: "3 filhos", nota: "A série The Negro Woman e as mães monumentais em madeira feitas no exílio mexicano." },
  { nome: "Alma Thomas", vida: "1891–1978", nasc: 1891, morte: 1978, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Abstração cromática", filhos: "Sem filhos; 35 anos de professora", nota: "Só se tornou pintora em tempo integral aos 69, depois de décadas ensinando crianças." },
  { nome: "Ruth Asawa", vida: "1926–2013", nasc: 1926, morte: 2013, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Escultura em arame", filhos: "6 filhos", nota: "Fez das formas de arame um trabalho conciliável com a casa; militou por arte nas escolas públicas." },
  { nome: "Lee Krasner", vida: "1908–1984", nasc: 1908, morte: 1984, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Expressionismo abstrato", filhos: "Sem filhos", nota: "Curadora involuntária do espólio de Pollock; sua própria obra só foi revista tardiamente." },
  { nome: "Elaine de Kooning", vida: "1918–1989", nasc: 1918, morte: 1989, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Expressionismo abstrato", filhos: "Sem filhos", nota: "Sustentou o marido com retratos e crítica; assinava E. de K. para não ser lida como mulher." },
  { nome: "Grace Hartigan", vida: "1922–2008", nasc: 1922, morte: 2008, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Expressionismo abstrato", filhos: "1 filho, deixado com parentes", nota: "Escolheu a pintura e escreveu sobre a culpa de ter entregue a criação do filho." },
  { nome: "Joan Mitchell", vida: "1925–1992", nasc: 1925, morte: 1992, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Expressionismo abstrato", filhos: "Sem filhos; aborto declarado", nota: "Recusou explicitamente a maternidade para pintar; jardins e árvores como corpos vivos." },
  { nome: "Helen Frankenthaler", vida: "1928–2011", nasc: 1928, morte: 2011, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Color field", filhos: "Sem filhos", nota: "A técnica soak-stain deixa a tela absorver a tinta como um corpo poroso." },
  { nome: "Eva Hesse", vida: "1936–1970", nasc: 1936, morte: 1970, pais: "Alemanha/Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Pós-minimalismo", filhos: "Sem filhos; mãe suicida na infância", nota: "Refugiada do nazismo; látex e fibra como matérias que envelhecem, como corpos." },
  { nome: "Agnes Martin", vida: "1912–2004", nasc: 1912, morte: 2004, pais: "Canadá/Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Abstração minimalista", filhos: "Sem filhos; vida solitária no deserto", nota: "Grades desenhadas à mão como disciplina de silêncio e recusa da vida doméstica." },
  { nome: "Judy Chicago", vida: "1939–", nasc: 1939, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Arte feminista", filhos: "Sem filhos, por decisão", nota: "The Birth Project reuniu bordadeiras para representar o parto, ausente da história da arte." },
  { nome: "Miriam Schapiro", vida: "1923–2015", nasc: 1923, morte: 2015, pais: "Canadá/Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Pattern and Decoration", filhos: "1 filho", nota: "Criou o femmage: colagem com tecidos e rendas herdadas de mães e avós." },
  { nome: "Mierle Laderman Ukeles", vida: "1939–", nasc: 1939, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Arte de manutenção", filhos: "3 filhos", nota: "O Manifesto for Maintenance Art nasce do choque entre ser mãe e ser artista." },
  { nome: "Mary Kelly", vida: "1941–", nasc: 1941, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Arte conceitual feminista", filhos: "1 filho", nota: "Post-Partum Document arquiva seis anos de maternidade, incluindo fraldas sujas, como pesquisa." },
  { nome: "Carolee Schneemann", vida: "1939–2019", nasc: 1939, morte: 2019, pais: "Estados Unidos", continente: "América do Norte", regiao: "america-do-norte", cultura: "Performance", filhos: "Sem filhos", nota: "Interior Scroll extrai do corpo um texto: a autoridade retirada de dentro, não concedida." },
  { nome: "Adrian Piper", vida: "1948–", nasc: 1948, morte: null, pais: "Estados Unidos/Alemanha", continente: "América do Norte", regiao: "america-do-norte", cultura: "Arte conceitual", filhos: "Sem filhos", nota: "Investigou raça, passabilidade e herança familiar como sistemas de classificação." },
  { nome: "Howardena Pindell", vida: "1943–", nasc: 1943, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Abstração afro-americana", filhos: "Sem filhos", nota: "Telas costuradas e perfuradas reconstroem a memória perdida após um acidente." },
  { nome: "Emma Amos", vida: "1937–2020", nasc: 1937, morte: 2020, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Arte afro-americana", filhos: "2 filhos", nota: "Tecelagem e pintura combinadas; única mulher do coletivo Spiral, criando filhos em paralelo." },
  { nome: "Alison Saar", vida: "1956–", nasc: 1956, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Arte afro-americana", filhos: "2 filhos; filha de Betye Saar", nota: "Segunda geração de uma linhagem materna de artistas negras da Califórnia." },
  { nome: "Kara Walker", vida: "1969–", nasc: 1969, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Arte contemporânea", filhos: "1 filha", nota: "Silhuetas que expõem a violência sexual e reprodutiva da escravidão americana." },
  { nome: "Carrie Mae Weems", vida: "1953–", nasc: 1953, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Fotografia contemporânea", filhos: "1 filha", nota: "Kitchen Table Series encena a mesa da cozinha como palco da vida afetiva negra." },
  { nome: "Lorna Simpson", vida: "1960–", nasc: 1960, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "afro-americano", cultura: "Fotoconceitualismo", filhos: "1 filha", nota: "Texto e imagem sobre cabelo, costas e nuca: o corpo negro que se recusa ao retrato." },
  { nome: "Amalia Mesa-Bains", vida: "1943–", nasc: 1943, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "chicano", cultura: "Arte chicana", filhos: "Altares dedicados às mulheres da família", nota: "Ofrendas domésticas chicanas elevadas a instalação: a mesa da avó como arquivo." },
  { nome: "Yolanda López", vida: "1942–2021", nasc: 1942, morte: 2021, pais: "Estados Unidos", continente: "América do Norte", regiao: "chicano", cultura: "Arte chicana", filhos: "1 filho", nota: "Retratou a mãe e a avó como Virgem de Guadalupe: santidade da trabalhadora chicana." },
  { nome: "Ester Hernández", vida: "1944–", nasc: 1944, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "chicano", cultura: "Gravura chicana", filhos: "1 filha", nota: "Serigrafias sobre camponesas e pesticidas: maternidade sob risco químico no campo." },
  { nome: "Kay WalkingStick", vida: "1935–", nasc: 1935, morte: null, pais: "Estados Unidos", continente: "América do Norte", regiao: "primeiras-nacoes", cultura: "Cherokee", filhos: "2 filhos", nota: "Dípticos que unem paisagem e memória cherokee, pintados durante a criação dos filhos." },
  { nome: "Jaune Quick-to-See Smith", vida: "1940–2025", nasc: 1940, morte: 2025, pais: "Estados Unidos", continente: "América do Norte", regiao: "primeiras-nacoes", cultura: "Salish e Kootenai", filhos: "3 filhos, um deles artista", nota: "Mapas críticos dos Estados Unidos; formou o filho Neal Ambrose-Smith na mesma prática." },
  { nome: "Maria Martinez", vida: "1887–1980", nasc: 1887, morte: 1980, pais: "Estados Unidos", continente: "América do Norte", regiao: "primeiras-nacoes", cultura: "Pueblo San Ildefonso", filhos: "4 filhos; linhagem de ceramistas", nota: "Recriou a cerâmica preta polida e a transmitiu a filhos, noras e netos por três gerações." },
  { nome: "Nampeyo", vida: "1859–1942", nasc: 1859, morte: 1942, pais: "Estados Unidos", continente: "América do Norte", regiao: "primeiras-nacoes", cultura: "Hopi-Tewa", filhos: "5 filhos; matriarca ceramista", nota: "Reviveu a cerâmica Sikyátki e fundou uma dinastia matrilinear de ceramistas hopi." },
  { nome: "Pitseolak Ashoona", vida: "1904–1983", nasc: 1904, morte: 1983, pais: "Canadá", continente: "América do Norte", regiao: "inuit", cultura: "Inuit", filhos: "17 gestações, 6 filhos sobreviventes", nota: "Começou a desenhar viúva, para sustentar os filhos; vários se tornaram artistas em Kinngait." },
  { nome: "Kenojuak Ashevak", vida: "1927–2013", nasc: 1927, morte: 2013, pais: "Canadá", continente: "América do Norte", regiao: "inuit", cultura: "Inuit", filhos: "11 filhos, muitos perdidos ainda crianças", nota: "Desenhava em acampamentos de caça; a coruja encantada tornou-se emblema da arte inuit." },
  { nome: "Emily Carr", vida: "1871–1945", nasc: 1871, morte: 1945, pais: "Canadá", continente: "América do Norte", regiao: "america-do-norte", cultura: "Modernismo canadense", filhos: "Sem filhos", nota: "Pintou florestas e postes totêmicos da costa noroeste sustentando-se como senhoria." },
  { nome: "Amelia Peláez", vida: "1896–1968", nasc: 1896, morte: 1968, pais: "Cuba", continente: "América do Norte", regiao: "caribe", cultura: "Modernismo cubano", filhos: "Sem filhos; casa familiar como ateliê", nota: "Vitrais, grades e frutas da casa colonial cubana transformados em geometria tropical." },
  { nome: "Belkis Ayón", vida: "1967–1999", nasc: 1967, morte: 1999, pais: "Cuba", continente: "América do Norte", regiao: "caribe", cultura: "Colografia cubana", filhos: "Sem filhos", nota: "Reencenou Sikán, a mulher sacrificada do mito abakuá do qual as mulheres são excluídas." },
  { nome: "Ana Maria Maiolino", vida: "1942–", nasc: 1942, morte: null, pais: "Itália/Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Arte contemporânea brasileira", filhos: "2 filhos", nota: "Por um fio fotografa três gerações unidas por um cordão; a massa de argila como pão e corpo." },
  { nome: "Lygia Pape", vida: "1927–2004", nasc: 1927, morte: 2004, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Neoconcretismo", filhos: "2 filhas", nota: "Divisor: um tecido único atravessado por muitas cabeças, corpo coletivo e uterino." },
  { nome: "Mira Schendel", vida: "1919–1988", nasc: 1919, morte: 1988, pais: "Suíça/Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Arte concreta brasileira", filhos: "1 filha", nota: "Refugiada da guerra; monotipias em papel-arroz como respiração e escrita mínima." },
  { nome: "Anna Bella Geiger", vida: "1933–", nasc: 1933, morte: null, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Arte conceitual brasileira", filhos: "2 filhos", nota: "Mapas e Brasil nativo/Brasil alienígena: cartografia crítica feita em plena ditadura." },
  { nome: "Wanda Pimentel", vida: "1943–2019", nasc: 1943, morte: 2019, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Nova figuração", filhos: "Sem filhos", nota: "A série Envolvimento pinta o corpo feminino engolido pelos objetos da casa." },
  { nome: "Beatriz Milhazes", vida: "1960–", nasc: 1960, morte: null, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Pintura contemporânea", filhos: "1 filha", nota: "Renda, azulejo e carnaval em camadas de decalque: o ornamento como pesquisa séria." },
  { nome: "Rivane Neuenschwander", vida: "1967–", nasc: 1967, morte: null, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Arte contemporânea", filhos: "2 filhos", nota: "Obras feitas com crianças transformam medos infantis em capas e figuras coletivas." },
  { nome: "Sonia Gomes", vida: "1948–", nasc: 1948, morte: null, pais: "Brasil", continente: "América do Sul", regiao: "afro-brasileiro", cultura: "Arte afro-brasileira", filhos: "Neta de costureira e benzedeira", nota: "Torceu tecidos doados em corpos suspensos; começou a expor depois dos cinquenta anos." },
  { nome: "Rosângela Rennó", vida: "1962–", nasc: 1962, morte: null, pais: "Brasil", continente: "América do Sul", regiao: "brasil", cultura: "Fotografia contemporânea", filhos: "Arquivos familiares como matéria", nota: "Recolhe álbuns de família descartados: a memória materna anônima como acervo público." },
  { nome: "Cecilia Porras", vida: "1920–1971", nasc: 1920, morte: 1971, pais: "Colômbia", continente: "América do Sul", regiao: "america-do-sul", cultura: "Modernismo colombiano", filhos: "Sem filhos; rompeu com a família", nota: "Rompeu com a elite cartagenera para pintar; o divórcio custou-lhe o círculo social inteiro." },
  { nome: "Débora Arango", vida: "1907–2005", nasc: 1907, morte: 2005, pais: "Colômbia", continente: "América do Sul", regiao: "america-do-sul", cultura: "Expressionismo colombiano", filhos: "Sem filhos", nota: "Excomungada por pintar nus e partos; retratou prostitutas, freiras e ditadores." },
  { nome: "Doris Salcedo", vida: "1958–", nasc: 1958, morte: null, pais: "Colômbia", continente: "América do Sul", regiao: "america-do-sul", cultura: "Escultura contemporânea", filhos: "Sem filhos; obra feita com mães de desaparecidos", nota: "Móveis de casa preenchidos com concreto para as famílias que perderam filhos na guerra." },
  { nome: "Marta Minujín", vida: "1943–", nasc: 1943, morte: null, pais: "Argentina", continente: "América do Sul", regiao: "america-do-sul", cultura: "Happening", filhos: "2 filhos", nota: "Fez happenings monumentais grávida e com filhos pequenos, sem interromper a produção." },
  { nome: "Liliana Maresca", vida: "1951–1994", nasc: 1951, morte: 1994, pais: "Argentina", continente: "América do Sul", regiao: "america-do-sul", cultura: "Arte de ação", filhos: "1 filha", nota: "Corpo, lixo urbano e HIV; documentou o próprio adoecimento com a filha por perto." },
  { nome: "Graciela Sacco", vida: "1956–2017", nasc: 1956, morte: 2017, pais: "Argentina", continente: "América do Sul", regiao: "america-do-sul", cultura: "Arte política", filhos: "1 filha", nota: "Heliografias de bocas e olhos coladas na rua durante as crises argentinas." },
  { nome: "Roser Bru", vida: "1923–2021", nasc: 1923, morte: 2021, pais: "Espanha/Chile", continente: "América do Sul", regiao: "america-do-sul", cultura: "Gravura chilena", filhos: "3 filhos", nota: "Exilada da Guerra Civil no navio Winnipeg; gravou desaparecidos e mães em busca." },
  { nome: "Lotty Rosenfeld", vida: "1943–2020", nasc: 1943, morte: 2020, pais: "Chile", continente: "América do Sul", regiao: "america-do-sul", cultura: "Arte de ação", filhos: "2 filhos", nota: "Cruzes de fita adesiva no asfalto contra a ditadura: gesto mínimo, risco máximo." },
  { nome: "Teresa Burga", vida: "1935–2021", nasc: 1935, morte: 2021, pais: "Peru", continente: "América do Sul", regiao: "andes", cultura: "Arte conceitual peruana", filhos: "Sem filhos", nota: "Perfil de la mujer peruana: dados estatísticos sobre a vida das mulheres como obra." },
  { nome: "Julia Codesido", vida: "1883–1979", nasc: 1883, morte: 1979, pais: "Peru", continente: "América do Sul", regiao: "andes", cultura: "Indigenismo peruano", filhos: "Sem filhos", nota: "Pintou mulheres andinas e amazônicas fora do pitoresco, com atenção ao trabalho." },
  { nome: "Ana Maria Pacheco", vida: "1943–", nasc: 1943, morte: null, pais: "Brasil/Reino Unido", continente: "Europa", regiao: "britanicas", cultura: "Escultura contemporânea", filhos: "1 filha", nota: "Grupos escultóricos de madeira policromada sobre poder, medo e comunidade." },

  // ── Ásia ───────────────────────────────────────────────────────────────────
  { nome: "Chen Shu", vida: "1660–1736", nasc: 1660, morte: 1736, pais: "China", continente: "Ásia", regiao: "china", cultura: "Pintura Qing", filhos: "Filhos e netos formados por ela", nota: "Ensinou pintura ao filho, que levou sua obra à coleção imperial: transmissão matrilinear letrada." },
  { nome: "Ma Quan", vida: "1690–1750", nasc: 1690, morte: 1750, pais: "China", continente: "Ásia", regiao: "china", cultura: "Pintura Qing", filhos: "Sustentou a família com a pintura", nota: "Flores e pássaros vendidos para manter a casa após a ruína do marido." },
  { nome: "Ike no Gyokuran", vida: "1727–1784", nasc: 1727, morte: 1784, pais: "Japão", continente: "Ásia", regiao: "japao", cultura: "Bunjinga", filhos: "Sem filhos; linhagem de três gerações de poetisas", nota: "Neta, filha e ela mesma poetisas e pintoras: casa de chá como escola feminina em Kyoto." },
  { nome: "Katsushika Ōi", vida: "1800–1866", nasc: 1800, morte: 1866, pais: "Japão", continente: "Ásia", regiao: "japao", cultura: "Ukiyo-e", filhos: "Sem filhos; filha e assistente de Hokusai", nota: "Pintou parte da obra atribuída ao pai; mestra da luz noturna no ukiyo-e." },
  { nome: "Noguchi Shōhin", vida: "1847–1917", nasc: 1847, morte: 1917, pais: "Japão", continente: "Ásia", regiao: "japao", cultura: "Nanga", filhos: "1 filha; mãe viúva jovem", nota: "Viúva aos 30, sustentou a filha pintando paisagens letradas e ensinou na corte Meiji." },
  { nome: "Atsuko Tanaka", vida: "1932–2005", nasc: 1932, morte: 2005, pais: "Japão", continente: "Ásia", regiao: "japao", cultura: "Gutai", filhos: "Sem filhos", nota: "O Vestido Elétrico veste o corpo com um sistema nervoso de lâmpadas." },
  { nome: "Yuko Nasaka", vida: "1938–", nasc: 1938, morte: null, pais: "Japão", continente: "Ásia", regiao: "japao", cultura: "Gutai", filhos: "Filhos criados durante o afastamento do grupo", nota: "Afastou-se do Gutai ao casar e voltou décadas depois com os discos giratórios." },
  { nome: "Mariko Mori", vida: "1967–", nasc: 1967, morte: null, pais: "Japão", continente: "Ásia", regiao: "japao", cultura: "Arte contemporânea", filhos: "Sem filhos", nota: "Ciborgues xintoístas e útero-nave: cosmologia futurista de renascimento." },
  { nome: "Chiharu Shiota", vida: "1972–", nasc: 1972, morte: null, pais: "Japão", continente: "Ásia", regiao: "japao", cultura: "Instalação", filhos: "1 filha", nota: "Teias de fio vermelho ligando camas, chaves e vestidos: cordões umbilicais de memória." },
  { nome: "Yee I-Lann", vida: "1971–", nasc: 1971, morte: null, pais: "Malásia", continente: "Ásia", regiao: "sudeste-asiatico", cultura: "Arte contemporânea do Sudeste Asiático", filhos: "Colabora com tecelãs de Bornéu", nota: "Esteiras tecidas com mulheres dusun e bajau: autoria coletiva e matrilinear." },
  { nome: "Arahmaiani", vida: "1961–", nasc: 1961, morte: null, pais: "Indonésia", continente: "Ásia", regiao: "indonesia", cultura: "Performance indonésia", filhos: "Sem filhos", nota: "Performances sobre islã, corpo feminino e ecologia; projetos comunitários no Tibete." },
  { nome: "Nalini Malani", vida: "1946–", nasc: 1946, morte: null, pais: "Índia", continente: "Ásia", regiao: "sul-da-asia", cultura: "Arte contemporânea indiana", filhos: "Sem filhos; refugiada da Partição", nota: "Teatros de sombra sobre a violência contra mulheres na Partição da Índia." },
  { nome: "Zarina Hashmi", vida: "1937–2020", nasc: 1937, morte: 2020, pais: "Índia/Estados Unidos", continente: "Ásia", regiao: "sul-da-asia", cultura: "Gravura minimalista", filhos: "Sem filhos", nota: "Plantas de casas perdidas gravadas em madeira: a casa materna como mapa do exílio." },
  { nome: "Nasreen Mohamedi", vida: "1937–1990", nasc: 1937, morte: 1990, pais: "Índia", continente: "Ásia", regiao: "sul-da-asia", cultura: "Abstração indiana", filhos: "Sem filhos", nota: "Linhas a grafite feitas com mãos trêmulas pela doença degenerativa: disciplina do quase nada." },
  { nome: "Mrinalini Mukherjee", vida: "1949–2015", nasc: 1949, morte: 2015, pais: "Índia", continente: "Ásia", regiao: "sul-da-asia", cultura: "Escultura têxtil", filhos: "Sem filhos; filha de pintores", nota: "Nós de fibra de cânhamo que evocam deidades vegetais e órgãos fecundos." },
  { nome: "Bharti Kher", vida: "1969–", nasc: 1969, morte: null, pais: "Reino Unido/Índia", continente: "Ásia", regiao: "sul-da-asia", cultura: "Arte contemporânea indiana", filhos: "2 filhos", nota: "Bindis como espermatozoides sobre superfícies; moldes do corpo de mulheres reais." },
  { nome: "Shilpa Gupta", vida: "1976–", nasc: 1976, morte: null, pais: "Índia", continente: "Ásia", regiao: "sul-da-asia", cultura: "Arte contemporânea", filhos: "1 filha", nota: "Fronteiras, censura e vozes gravadas; o cuidado com a linguagem como território." },
  { nome: "Monir Farmanfarmaian", vida: "1922–2019", nasc: 1922, morte: 2019, pais: "Irã", continente: "Ásia", regiao: "persia", cultura: "Espelho e geometria persa", filhos: "2 filhas", nota: "Recomeçou do zero aos 70 anos após o exílio revolucionário; mosaicos de espelho infinitos." },
  { nome: "Farideh Lashai", vida: "1944–2013", nasc: 1944, morte: 2013, pais: "Irã", continente: "Ásia", regiao: "persia", cultura: "Arte contemporânea iraniana", filhos: "1 filha", nota: "Pintura, vídeo e literatura infantil produzidos entre prisão política e maternidade." },
  { nome: "Etel Adnan", vida: "1925–2021", nasc: 1925, morte: 2021, pais: "Líbano", continente: "Ásia", regiao: "levante", cultura: "Pintura e poesia", filhos: "Sem filhos; parceria com Simone Fattal", nota: "Leporellos que dobram poema e montanha; a língua materna perdida como tema." },
  { nome: "Saloua Raouda Choucair", vida: "1916–2017", nasc: 1916, morte: 2017, pais: "Líbano", continente: "Ásia", regiao: "levante", cultura: "Abstração modular", filhos: "1 filha, que preservou seu arquivo", nota: "Esculturas modulares baseadas na poesia árabe; a filha salvou a obra da guerra civil." },
  { nome: "Huguette Caland", vida: "1931–2019", nasc: 1931, morte: 2019, pais: "Líbano", continente: "Ásia", regiao: "levante", cultura: "Arte contemporânea libanesa", filhos: "3 filhos", nota: "Deixou marido e filhos aos 39 para pintar em Paris corpos sensuais em linhas mínimas." },
  { nome: "Mona Saudi", vida: "1945–2022", nasc: 1945, morte: 2022, pais: "Jordânia", continente: "Ásia", regiao: "levante", cultura: "Escultura árabe", filhos: "1 filha", nota: "Pedra esculpida em formas de mãe e criança; livro de desenhos de crianças palestinas." },
  { nome: "Inji Efflatoun", vida: "1924–1989", nasc: 1924, morte: 1989, pais: "Egito", continente: "África", regiao: "egito", cultura: "Realismo social egípcio", filhos: "Sem filhos; pintou presas e filhos delas", nota: "Presa política por quatro anos, pintou as companheiras de cela e suas crianças." },
  { nome: "Gazbia Sirry", vida: "1925–2021", nasc: 1925, morte: 2021, pais: "Egito", continente: "África", regiao: "egito", cultura: "Modernismo egípcio", filhos: "Sem filhos; professora por décadas", nota: "Mães e filhas do Cairo popular pintadas em cor plana e contorno firme." },
  { nome: "Baya Mahieddine", vida: "1931–1998", nasc: 1931, morte: 1998, pais: "Argélia", continente: "África", regiao: "norte-africa", cultura: "Modernismo argelino", filhos: "6 filhos", nota: "Órfã aos cinco anos, expôs em Paris aos 16; parou 10 anos para criar os filhos e voltou." },
  { nome: "Chaïbia Talal", vida: "1929–2004", nasc: 1929, morte: 2004, pais: "Marrocos", continente: "África", regiao: "norte-africa", cultura: "Arte popular marroquina", filhos: "1 filho, também pintor", nota: "Casada aos 13, viúva aos 15, empregada doméstica; começou a pintar após um sonho." },

  // ── África subsaariana e Oceania ───────────────────────────────────────────
  { nome: "Ladi Kwali", vida: "1925–1984", nasc: 1925, morte: 1984, pais: "Nigéria", continente: "África", regiao: "nigeria", cultura: "Cerâmica gwari", filhos: "Aprendeu com a tia; formou aprendizes", nota: "Cerâmica de bobina gwari levada ao mundo; transmissão feminina de tia para sobrinha." },
  { nome: "Nike Davies-Okundaye", vida: "1951–", nasc: 1951, morte: null, pais: "Nigéria", continente: "África", regiao: "nigeria", cultura: "Adire iorubá", filhos: "Filhos e centenas de aprendizes", nota: "Fundou centros de arte que formaram milhares de mulheres em adire e batique." },
  { nome: "Bisi Silva", vida: "1962–2019", nasc: 1962, morte: 2019, pais: "Nigéria", continente: "África", regiao: "nigeria", cultura: "Curadoria africana", filhos: "Mãe intelectual de uma geração de curadores", nota: "O CCA Lagos e o Àsìkò formaram a curadoria africana contemporânea." },
  { nome: "Peju Alatise", vida: "1975–", nasc: 1975, morte: null, pais: "Nigéria", continente: "África", regiao: "nigeria", cultura: "Arte contemporânea nigeriana", filhos: "Obra sobre meninas domésticas", nota: "Flying Girls denuncia o trabalho infantil doméstico de meninas nigerianas." },
  { nome: "Wangechi Mutu", vida: "1972–", nasc: 1972, morte: null, pais: "Quênia", continente: "África", regiao: "africa-oriental", cultura: "Arte contemporânea", filhos: "2 filhas", nota: "Colagens de corpos femininos híbridos; figuras-mãe de bronze na fachada do Met." },
  { nome: "Zanele Muholi", vida: "1972–", nasc: 1972, morte: null, pais: "África do Sul", continente: "África", regiao: "africa-do-sul", cultura: "Fotografia contemporânea", filhos: "Obra dedicada à mãe trabalhadora doméstica", nota: "Somnyama Ngonyama homenageia a mãe, empregada doméstica por 42 anos sob o apartheid." },
  { nome: "Noria Mabasa", vida: "1938–", nasc: 1938, morte: null, pais: "África do Sul", continente: "África", regiao: "africa-do-sul", cultura: "Escultura venda", filhos: "Filhos criados sozinha", nota: "Começou a esculpir madeira e argila após sonhos ancestrais, contra a proibição de gênero." },
  { nome: "Helen Sebidi", vida: "1943–", nasc: 1943, morte: null, pais: "África do Sul", continente: "África", regiao: "africa-do-sul", cultura: "Arte sul-africana", filhos: "Criada pela avó ceramista", nota: "Aprendeu com a avó a pintura mural; densas colagens sobre desagregação familiar negra." },
  { nome: "Billie Zangewa", vida: "1973–", nasc: 1973, morte: null, pais: "Malawi/África do Sul", continente: "África", regiao: "africa-austral", cultura: "Colagem em seda", filhos: "1 filho", nota: "Costura em seda cenas de banho, cozinha e cuidado do filho: feminismo doméstico diário." },
  { nome: "Georgina Maxim", vida: "1980–", nasc: 1980, morte: null, pais: "Zimbábue", continente: "África", regiao: "africa-austral", cultura: "Arte têxtil", filhos: "Roupas de mulheres da família", nota: "Costura roupas usadas por parentes até virarem massas de memória." },
  { nome: "Laeïla Adjovi", vida: "1982–", nasc: 1982, morte: null, pais: "Benim", continente: "África", regiao: "benim", cultura: "Arte contemporânea beninense", filhos: "Linhagem de mulheres do Benim", nota: "Fotografia e escultura sobre a mulher-guerreira do Daomé como ancestral." },
  { nome: "Otobong Nkanga", vida: "1974–", nasc: 1974, morte: null, pais: "Nigéria/Bélgica", continente: "África", regiao: "nigeria", cultura: "Arte contemporânea", filhos: "1 filho", nota: "Tapeçarias e performances sobre extração mineral e o cuidado com a terra ferida." },
  { nome: "Naiza Khan", vida: "1968–", nasc: 1968, morte: null, pais: "Paquistão", continente: "Ásia", regiao: "sul-da-asia", cultura: "Arte contemporânea paquistanesa", filhos: "2 filhos", nota: "Armaduras femininas de metal e mapas de ilhas: proteção e vulnerabilidade do corpo." },
  { nome: "Lisa Reihana", vida: "1964–", nasc: 1964, morte: null, pais: "Nova Zelândia", continente: "Oceania", regiao: "maori", cultura: "Māori (Ngā Puhi)", filhos: "Genealogia whakapapa como método", nota: "In Pursuit of Venus reencena o encontro colonial do Pacífico do ponto de vista indígena." },
  { nome: "Shigeyuki Kihara", vida: "1975–", nasc: 1975, morte: null, pais: "Samoa", continente: "Oceania", regiao: "polinesia", cultura: "Fa'afafine samoana", filhos: "Sem filhos; identidade fa'afafine", nota: "Reencena a Salomé colonial samoana desde um terceiro gênero reconhecido pela cultura." },
  { nome: "Yvonne Koolmatrie", vida: "1944–", nasc: 1944, morte: null, pais: "Austrália", continente: "Oceania", regiao: "aborigene", cultura: "Ngarrindjeri", filhos: "Filhos e netos; retomada do cesto", nota: "Reaprendeu num único workshop a cestaria ngarrindjeri quase extinta e a retransmitiu." },
  { nome: "Naata Nungurrayi", vida: "1932–2021", nasc: 1932, morte: 2021, pais: "Austrália", continente: "Oceania", regiao: "aborigene", cultura: "Pintjantjatjara", filhos: "Filhos pintores de Kintore", nota: "Pintou os sítios sagrados femininos de Marrapinti transmitidos pelas mulheres do deserto." },
  { nome: "Kitty Kantilla", vida: "1928–2003", nasc: 1928, morte: 2003, pais: "Austrália", continente: "Oceania", regiao: "aborigene", cultura: "Tiwi", filhos: "Filhos e netos artistas tiwi", nota: "Pintura corporal cerimonial tiwi transposta para papel e ocre em tela." },
  { nome: "Regina Pilawuk Wilson", vida: "1948–", nasc: 1948, morte: null, pais: "Austrália", continente: "Oceania", regiao: "aborigene", cultura: "Ngan'gikurunggurr", filhos: "Fundou centro de arte com as filhas", nota: "Traduziu a rede de pesca tecida pelas mulheres em pintura de linha fina." },
  { nome: "Rosalie Gascoigne", vida: "1917–1999", nasc: 1917, morte: 1999, pais: "Nova Zelândia/Austrália", continente: "Oceania", regiao: "aborigene", cultura: "Assemblage australiana", filhos: "3 filhos", nota: "Começou a expor aos 57, depois de criar três filhos; madeira encontrada como paisagem." },
];

const FACET_MAES = "sensibilidade:artistas-maes";

async function main() {
  const rows = (await db.execute("SELECT id, LOWER(title) t FROM entities")).rows as unknown as {
    id: string;
    t: string;
  }[];
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
      byTitle.set(m.nome.toLowerCase(), id);
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
