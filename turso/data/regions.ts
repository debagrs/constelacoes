/** Taxonomia planetária de regiões: continente → região → sub-região/povo-território. */
export type RegionSeed = {
  id: string;
  parent?: string;
  name: string;
  continent: string;
  lat?: number;
  lon?: number;
  summary?: string;
};

const C = (id: string, name: string, lat: number, lon: number, summary: string): RegionSeed => ({
  id,
  name,
  continent: name,
  lat,
  lon,
  summary,
});

const R = (
  id: string,
  parent: string,
  name: string,
  continent: string,
  lat: number,
  lon: number,
  summary = "",
): RegionSeed => ({ id, parent, name, continent, lat, lon, summary });

export const REGIONS: RegionSeed[] = [
  C("africa", "África", 2, 20, "Berço de linhagens artísticas contínuas há mais de 100 mil anos."),
  R("africa-ocidental", "africa", "África Ocidental", "África", 9, -3, "Nok, Ifé, Benim, Akan, Bamana, Iorubá."),
  R("africa-oriental", "africa", "África Oriental", "África", 0, 37, "Swahili, Kikuyu, Maasai, costa do Índico."),
  R("africa-austral", "africa", "África Austral", "África", -25, 25, "San, Zimbábue, Ndebele, Zulu."),
  R("norte-africa", "africa", "Norte da África", "África", 30, 10, "Amazigh, Cartago, Magreb, Al-Andalus norte-africano."),
  R("sahel", "africa", "Sahel", "África", 15, 0, "Tichitt, Djenné, Tombuctu, Dogon."),
  R("etiopia", "africa", "Etiópia e Chifre", "África", 9, 39, "Aksum, Lalibela, iluminuras Ge'ez."),
  R("mali", "africa", "Mali", "África", 17, -4, "Djenné-Djenno, Império do Mali, Dogon."),
  R("nigeria", "africa", "Nigéria", "África", 9, 8, "Nok, Ifé, Igbo-Ukwu, Iorubá."),
  R("benim", "africa", "Reino do Benim", "África", 6.3, 5.6, "Bronzes e placas de latão da corte de Edo."),
  R("egito", "africa", "Egito", "África", 26, 30, "Nagada, Antigo Império, Amarna, Copta."),
  R("africa-do-sul", "africa", "África do Sul", "África", -30, 24, "Arte rupestre San, Ndebele, arte contemporânea."),
  R("congo", "africa", "Bacia do Congo", "África", -2, 21, "Kuba, Kongo, Luba, Songye."),

  C("america-do-sul", "América do Sul", -15, -60, "Amazônia, Andes, Cone Sul e diásporas afro-indígenas."),
  R("brasil", "america-do-sul", "Brasil", "América do Sul", -12, -50, "Serra da Capivara, barroco mineiro, modernismos, arte indígena contemporânea."),
  R("andes", "america-do-sul", "Andes", "América do Sul", -13, -73, "Chavín, Paracas, Nasca, Moche, Wari, Tiwanaku, Inca."),
  R("amazonia", "america-do-sul", "Amazônia", "América do Sul", -4, -60, "Marajoara, Santarém, cestaria, grafismos, plumária."),
  R("patagonia", "america-do-sul", "Patagônia", "América do Sul", -46, -70, "Cueva de las Manos, Selk'nam, Tehuelche."),
  R("guarani", "america-do-sul", "Território Guarani", "América do Sul", -25, -55, "Cosmologia, cerâmica, missões e resistência."),
  R("mapuche", "america-do-sul", "Território Mapuche", "América do Sul", -38, -72, "Ourivesaria, têxteis, rewe."),
  R("afro-brasileiro", "america-do-sul", "Territórios afro-brasileiros", "América do Sul", -13, -38, "Quilombos, candomblé, carnaval, arte popular."),

  C("america-central", "América Central", 15, -88, "Mesoamérica e Caribe."),
  R("mesoamerica", "america-central", "Mesoamérica", "América Central", 18, -97, "Olmeca, Maia, Teotihuacan, Zapoteca, Mexica."),
  R("caribe", "america-central", "Caribe", "América Central", 18, -70, "Taíno, diásporas africanas, arte popular."),

  C("america-do-norte", "América do Norte", 45, -100, "Primeiras Nações, Inuit e culturas diaspóricas."),
  R("primeiras-nacoes", "america-do-norte", "Primeiras Nações", "América do Norte", 50, -110, "Haida, Lakota, Navajo, Pueblo, Anishinaabe."),
  R("inuit", "america-do-norte", "Ártico e Inuit", "América do Norte", 68, -80, "Escultura em pedra-sabão, Dorset, Thule."),
  R("afro-americano", "america-do-norte", "Territórios afro-americanos", "América do Norte", 33, -85, "Quilts do Gee's Bend, Harlem, blues visual."),
  R("chicano", "america-do-norte", "Territórios latinos e chicanos", "América do Norte", 32, -110, "Muralismo, gráfica, fronteiras."),

  C("europa", "Europa", 50, 15, "Muito além do eixo França–Itália."),
  R("iberia", "europa", "Ibéria", "Europa", 40, -4, "Altamira, Al-Andalus, barroco ibérico."),
  R("italia", "europa", "Itália", "Europa", 42, 12, "Etruscos, Roma, Renascimento, Barroco."),
  R("franca", "europa", "França", "Europa", 47, 2, "Chauvet, Lascaux, gótico, modernismos."),
  R("balcas", "europa", "Bálcãs", "Europa", 43, 21, "Vinča, Bizâncio, afrescos sérvios e búlgaros."),
  R("escandinavia", "europa", "Escandinávia", "Europa", 62, 15, "Petróglifos, arte viking, Sámi."),
  R("europa-oriental", "europa", "Europa Oriental", "Europa", 52, 30, "Rus de Kiev, ícones, vanguardas."),
  R("caucaso", "europa", "Cáucaso", "Europa", 42, 44, "Armênia, Geórgia, esmaltes e iluminuras."),
  R("britanicas", "europa", "Ilhas Britânicas e Irlanda", "Europa", 54, -4, "Newgrange, Book of Kells, insular."),
  R("europa-central", "europa", "Europa Central", "Europa", 50, 17, "Gótico, Bauhaus, Boêmia."),

  C("oriente-medio", "Oriente Médio", 32, 43, "Mesopotâmia, Levante, Pérsia, Anatólia, Arábia."),
  R("mesopotamia", "oriente-medio", "Mesopotâmia", "Oriente Médio", 33, 44, "Uruk, Suméria, Acádia, Babilônia, Assíria."),
  R("persia", "oriente-medio", "Pérsia", "Oriente Médio", 32, 53, "Persépolis, miniatura, azulejaria."),
  R("anatolia", "oriente-medio", "Anatólia", "Oriente Médio", 39, 35, "Göbekli Tepe, Çatalhöyük, Bizâncio, otomanos."),
  R("levante", "oriente-medio", "Levante", "Oriente Médio", 33, 36, "Fenícios, Palmira, Omíadas."),
  R("arabia", "oriente-medio", "Península Arábica", "Oriente Médio", 24, 45, "Rupestre de Ḥaʼil, caligrafia, arquitetura."),

  C("sul-da-asia", "Sul da Ásia", 22, 78, "Índia, Paquistão, Nepal, Sri Lanka, Bangladesh."),
  R("bhimbetka", "sul-da-asia", "Índia Central", "Sul da Ásia", 22.9, 77.6, "Abrigos rupestres de Bhimbetka."),
  R("indus", "sul-da-asia", "Vale do Indo", "Sul da Ásia", 27, 68, "Harappa, Mohenjo-daro."),
  R("india-sul", "sul-da-asia", "Índia Meridional", "Sul da Ásia", 12, 78, "Chola, Vijayanagara, bronzes."),
  R("himalaia", "sul-da-asia", "Himalaia", "Sul da Ásia", 28, 85, "Thangkas, mandalas, Newar."),

  C("china", "China", 35, 105, "Neolítico Yangshao ao contemporâneo."),
  R("china-norte", "china", "Norte da China", "China", 39, 116, "Shang, Zhou, Han, Dunhuang."),
  R("china-sul", "china", "Sul da China", "China", 25, 113, "Cerâmica, pintura letrada, jardins."),

  C("japao", "Japão", 36, 138, "Jōmon ao contemporâneo."),
  R("japao-arquipelago", "japao", "Arquipélago japonês", "Japão", 36, 138, "Jōmon, Heian, Edo, Gutai."),
  R("ainu", "japao", "Território Ainu", "Japão", 43.2, 142.9, "Têxteis attus, cosmologia kamuy."),

  C("coreia", "Coreia", 37, 127.5, "Goguryeo, Goryeo, Joseon e contemporâneo."),
  R("coreia-peninsula", "coreia", "Península Coreana", "Coreia", 37, 127.5, "Celadon, pintura minhwa, Dansaekhwa."),

  C("sudeste-asiatico", "Sudeste Asiático", 5, 110, "Arquipélagos e continente."),
  R("indonesia", "sudeste-asiatico", "Indonésia", "Sudeste Asiático", -2, 118, "Sulawesi, Borobudur, batik, wayang."),
  R("indochina", "sudeste-asiatico", "Indochina", "Sudeste Asiático", 14, 104, "Angkor, Champa, Sukhothai."),
  R("filipinas", "sudeste-asiatico", "Filipinas", "Sudeste Asiático", 13, 122, "Tatuagem batok, ouro pré-colonial."),

  C("asia-central", "Ásia Central", 45, 68, "Estepes, Rota da Seda, nômades."),
  R("estepes", "asia-central", "Estepes eurasianas", "Ásia Central", 48, 70, "Citas, Pazyryk, arte animalista."),
  R("rota-da-seda", "asia-central", "Rota da Seda", "Ásia Central", 41, 65, "Samarcanda, Bukhara, Gandhara."),
  R("siberia", "asia-central", "Sibéria", "Ásia Central", 62, 100, "Xamanismo, Denisova, arte evenki."),

  C("oceania", "Oceania", -22, 145, "Austrália e Pacífico insular."),
  R("aborigene", "oceania", "Austrália aborígene", "Oceania", -25, 133, "Arnhem Land, Kimberley, Papunya."),
  R("maori", "oceania", "Aotearoa / Māori", "Oceania", -41, 174, "Whakairo, tā moko, tukutuku."),
  R("polinesia", "oceania", "Polinésia", "Oceania", -17, -149, "Tapa, tatuagem, Rapa Nui."),
  R("melanesia", "oceania", "Melanésia", "Oceania", -6, 147, "Sepik, malanggan, máscaras."),
  R("micronesia", "oceania", "Micronésia", "Oceania", 7, 150, "Navegação estelar, Nan Madol."),

  C("planetario", "Planetário", 0, 0, "Fenômenos transregionais: migrações, redes, arte-ciência, digital."),
  R("redes-digitais", "planetario", "Redes digitais", "Planetário", 0, 0, "Net art, software art, IA, arte generativa."),
  R("arte-ciencia", "planetario", "Arte, ciência e tecnologia", "Planetário", 0, 0, "Bioarte, arte espacial, dados, clima."),
];
