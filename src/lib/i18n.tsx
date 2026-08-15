import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Locale = "pt" | "en";

/**
 * i18n dictionary. Portuguese is the default; English is prepared for a
 * future international rollout. Add keys here and reference them via t("key").
 */
const dictionaries = {
  pt: {
    "app.name": "Atlas Planetário",
    "app.tagline": "da Cultura Visual",

    "nav.acervo": "Acervo",
    "nav.atlas": "Atlas Pessoais",
    "nav.about": "Sobre",
    "nav.curadoria": "Curadoria",
    "nav.turmas": "Turmas",
    "nav.painel": "Painel",
    "nav.signin": "Entrar",
    "nav.signout": "Sair",
    "nav.create_atlas": "Criar Atlas",
    "nav.my_atlases": "Meus Atlas",

    "common.loading": "Carregando…",
    "common.save": "Salvar",
    "common.saved": "Salvo",
    "common.saving": "Salvando…",
    "common.cancel": "Cancelar",
    "common.delete": "Excluir",
    "common.edit": "Editar",
    "common.create": "Criar",
    "common.close": "Fechar",
    "common.back": "Voltar",
    "common.search": "Pesquisar",
    "common.filter": "Filtros",
    "common.all": "Todos",
    "common.none": "Nenhum",
    "common.explore": "Explorar",
    "common.by": "por",
    "common.untitled": "Sem título",
    "common.optional": "opcional",

    "home.hero.title": "O pensamento por imagens.",
    "home.hero.subtitle":
      "Uma cartografia planetária da cultura visual dedicada ao estudo das sobrevivências e migrações da forma através do tempo e do espaço.",
    "home.hero.cta_explore": "Explorar o acervo",
    "home.hero.cta_atlas": "Criar seu Atlas",
    "home.featured": "Acervo em destaque",
    "home.featured.sub": "Fragmentos de uma rede em constante expansão",
    "home.method.eyebrow": "Método",
    "home.method.title": "Inspirado em Aby Warburg, ampliado para o presente",
    "home.method.body":
      "Imagens não existem isoladas. Cada imagem pertence a uma ecologia visual, e as relações entre elas são tão importantes quanto as próprias imagens. Aqui você constrói constelações, genealogias e sobrevivências — sem alterar o acervo curado.",
    "home.pillars.relations": "Relações",
    "home.pillars.relations.body":
      "Conecte obras, artistas, conceitos e tecnologias em uma rede sem hierarquia fixa.",
    "home.pillars.atlas": "Atlas pessoais",
    "home.pillars.atlas.body":
      "Um mural infinito onde estudantes montam suas próprias constelações visuais.",
    "home.pillars.curation": "Curadoria",
    "home.pillars.curation.body":
      "Do rascunho à publicação, um fluxo colaborativo entre estudantes e curadores.",

    "acervo.title": "Acervo curado",
    "acervo.subtitle": "obras catalogadas",
    "acervo.empty": "Nenhuma obra encontrada com estes filtros.",
    "acervo.search_placeholder": "Buscar por título, autor, cultura…",
    "acervo.filter.type": "Tipo",
    "acervo.filter.continent": "Continente",
    "acervo.filter.theme": "Temas",
    "acervo.detail.metadata": "Ficha da obra",
    "acervo.detail.relations": "Relações",
    "acervo.detail.relations_empty": "Ainda não há relações registradas.",
    "acervo.detail.bibliography": "Bibliografia",
    "acervo.detail.bibliography_empty": "Sem bibliografia associada.",
    "acervo.detail.motifs": "Motivos",
    "acervo.detail.author": "Autoria",
    "acervo.detail.date": "Datação",
    "acervo.detail.location": "Localização",
    "acervo.detail.culture": "Cultura",
    "acervo.detail.materials": "Materiais",
    "acervo.detail.techniques": "Técnicas",
    "acervo.detail.add_to_atlas": "Adicionar a um Atlas",
    "acervo.detail.source": "Fonte da imagem",

    "auth.title": "Atlas Planetário",
    "auth.subtitle": "Entre para construir seus Atlas visuais",
    "auth.tab.signin": "Entrar",
    "auth.tab.signup": "Criar conta",
    "auth.email": "E-mail",
    "auth.password": "Senha",
    "auth.name": "Nome de exibição",
    "auth.signin": "Entrar",
    "auth.signup": "Criar conta",
    "auth.google": "Continuar com Google",
    "auth.or": "ou",
    "auth.signin_success": "Bem-vindo de volta.",
    "auth.signup_success": "Conta criada. Bem-vindo ao Atlas.",
    "auth.error": "Não foi possível autenticar. Verifique seus dados.",

    "atlas.list.title": "Meus Atlas",
    "atlas.list.subtitle": "Seus murais visuais pessoais",
    "atlas.list.new": "Novo Atlas",
    "atlas.list.empty": "Você ainda não criou nenhum Atlas.",
    "atlas.list.open": "Abrir",
    "atlas.create.title": "Criar novo Atlas",
    "atlas.status.draft": "Rascunho",
    "atlas.status.submitted": "Submetido",
    "atlas.status.in_review": "Em revisão",
    "atlas.status.approved": "Aprovado",
    "atlas.status.published": "Publicado",

    "editor.add": "Adicionar",
    "editor.add_text": "Texto",
    "editor.add_image": "Imagem",
    "editor.add_link": "Link",
    "editor.add_from_collection": "Do acervo",
    "editor.connect": "Conectar",
    "editor.connect_hint": "Selecione dois cartões para conectar",
    "editor.zoom_reset": "Centralizar",
    "editor.submit": "Enviar para revisão",
    "editor.submitted": "Atlas enviado para revisão.",
    "editor.card.delete": "Remover cartão",
    "editor.connection.argument": "Argumento da relação",
    "editor.connection.type": "Tipo de relação",
    "editor.connection.save": "Salvar relação",
    "editor.empty": "Adicione cartões para começar sua constelação.",
    "editor.saving": "Salvando…",
    "editor.all_saved": "Tudo salvo",

    "curadoria.title": "Fila de curadoria",
    "curadoria.subtitle": "Atlas aguardando revisão",
    "curadoria.empty": "Nenhum Atlas na fila no momento.",
    "curadoria.approve": "Aprovar",
    "curadoria.publish": "Publicar",
    "curadoria.request_changes": "Solicitar alterações",
    "curadoria.comment": "Comentário para o autor",
    "curadoria.by": "Autor",

    "turmas.title": "Turmas",
    "turmas.subtitle": "Gerencie suas turmas e atividades",
    "turmas.new": "Nova turma",
    "turmas.empty": "Nenhuma turma ainda.",
    "turmas.only_professors":
      "Somente professores podem criar turmas. Solicite acesso a um administrador.",
    "turmas.students": "estudantes",
    "turmas.activities": "Atividades",

    "role.admin": "Administrador",
    "role.curador": "Curador",
    "role.professor": "Professor",
    "role.estudante": "Estudante",

    "footer.about":
      "Uma infraestrutura aberta para pensar por imagens. Ensino, pesquisa e curadoria em cultura visual.",
    "footer.rights":
      "Criado e desenvolvido pela Profa. Dra. Débora Aita Gasparetto- Desenho Industrial/UFSM",
  },
  en: {
    "app.name": "Planetary Atlas",
    "app.tagline": "of Visual Culture",
    "nav.acervo": "Collection",
    "nav.atlas": "Personal Atlases",
    "nav.about": "About",
    "nav.curadoria": "Curation",
    "nav.turmas": "Classes",
    "nav.painel": "Dashboard",
    "nav.signin": "Sign in",
    "nav.signout": "Sign out",
    "nav.create_atlas": "Create Atlas",
    "nav.my_atlases": "My Atlases",
    "common.loading": "Loading…",
    "common.save": "Save",
    "common.saved": "Saved",
    "common.saving": "Saving…",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.close": "Close",
    "common.back": "Back",
    "common.search": "Search",
    "common.filter": "Filters",
    "common.all": "All",
    "common.none": "None",
    "common.explore": "Explore",
    "common.by": "by",
    "common.untitled": "Untitled",
    "common.optional": "optional",
    "home.hero.title": "Thinking through images.",
    "home.hero.subtitle":
      "A planetary cartography of visual culture dedicated to the survivals and migrations of form across time and space.",
    "home.hero.cta_explore": "Explore the collection",
    "home.hero.cta_atlas": "Create your Atlas",
    "home.featured": "Featured works",
    "home.featured.sub": "Fragments of an ever-expanding network",
    "home.method.eyebrow": "Method",
    "home.method.title": "Inspired by Aby Warburg, extended to the present",
    "home.method.body":
      "Images never exist in isolation. Each belongs to a visual ecology, and the relations between them matter as much as the images themselves. Here you build constellations, genealogies and survivals — without altering the curated collection.",
    "home.pillars.relations": "Relations",
    "home.pillars.relations.body":
      "Connect works, artists, concepts and technologies in a network with no fixed hierarchy.",
    "home.pillars.atlas": "Personal atlases",
    "home.pillars.atlas.body":
      "An infinite board where students assemble their own visual constellations.",
    "home.pillars.curation": "Curation",
    "home.pillars.curation.body":
      "From draft to publication, a collaborative flow between students and curators.",
    "acervo.title": "Curated collection",
    "acervo.subtitle": "catalogued works",
    "acervo.empty": "No works match these filters.",
    "acervo.search_placeholder": "Search by title, author, culture…",
    "acervo.filter.type": "Type",
    "acervo.filter.continent": "Continent",
    "acervo.filter.theme": "Themes",
    "acervo.detail.metadata": "Work details",
    "acervo.detail.relations": "Relations",
    "acervo.detail.relations_empty": "No relations recorded yet.",
    "acervo.detail.bibliography": "Bibliography",
    "acervo.detail.bibliography_empty": "No bibliography attached.",
    "acervo.detail.motifs": "Motifs",
    "acervo.detail.author": "Author",
    "acervo.detail.date": "Date",
    "acervo.detail.location": "Location",
    "acervo.detail.culture": "Culture",
    "acervo.detail.materials": "Materials",
    "acervo.detail.techniques": "Techniques",
    "acervo.detail.add_to_atlas": "Add to an Atlas",
    "acervo.detail.source": "Image source",
    "auth.title": "Planetary Atlas",
    "auth.subtitle": "Sign in to build your visual Atlases",
    "auth.tab.signin": "Sign in",
    "auth.tab.signup": "Sign up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Display name",
    "auth.signin": "Sign in",
    "auth.signup": "Sign up",
    "auth.google": "Continue with Google",
    "auth.or": "or",
    "auth.signin_success": "Welcome back.",
    "auth.signup_success": "Account created. Welcome to the Atlas.",
    "auth.error": "Could not authenticate. Check your details.",
    "atlas.list.title": "My Atlases",
    "atlas.list.subtitle": "Your personal visual boards",
    "atlas.list.new": "New Atlas",
    "atlas.list.empty": "You haven't created any Atlas yet.",
    "atlas.list.open": "Open",
    "atlas.create.title": "Create new Atlas",
    "atlas.status.draft": "Draft",
    "atlas.status.submitted": "Submitted",
    "atlas.status.in_review": "In review",
    "atlas.status.approved": "Approved",
    "atlas.status.published": "Published",
    "editor.add": "Add",
    "editor.add_text": "Text",
    "editor.add_image": "Image",
    "editor.add_link": "Link",
    "editor.add_from_collection": "From collection",
    "editor.connect": "Connect",
    "editor.connect_hint": "Select two cards to connect",
    "editor.zoom_reset": "Recenter",
    "editor.submit": "Submit for review",
    "editor.submitted": "Atlas submitted for review.",
    "editor.card.delete": "Remove card",
    "editor.connection.argument": "Relation argument",
    "editor.connection.type": "Relation type",
    "editor.connection.save": "Save relation",
    "editor.empty": "Add cards to begin your constellation.",
    "editor.saving": "Saving…",
    "editor.all_saved": "All saved",
    "curadoria.title": "Curation queue",
    "curadoria.subtitle": "Atlases awaiting review",
    "curadoria.empty": "No Atlases in the queue right now.",
    "curadoria.approve": "Approve",
    "curadoria.publish": "Publish",
    "curadoria.request_changes": "Request changes",
    "curadoria.comment": "Comment for the author",
    "curadoria.by": "Author",
    "turmas.title": "Classes",
    "turmas.subtitle": "Manage your classes and activities",
    "turmas.new": "New class",
    "turmas.empty": "No classes yet.",
    "turmas.only_professors":
      "Only professors can create classes. Request access from an administrator.",
    "turmas.students": "students",
    "turmas.activities": "Activities",
    "role.admin": "Administrator",
    "role.curador": "Curator",
    "role.professor": "Professor",
    "role.estudante": "Student",
    "footer.about":
      "An open infrastructure for thinking through images. Teaching, research and curation in visual culture.",
    "footer.rights":
      "Created and developed by Prof. Dr. Débora Aita Gasparetto — Industrial Design/UFSM",
  },
} as const;

export type TranslationKey = keyof (typeof dictionaries)["pt"];

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);
const STORAGE_KEY = "atlas-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "pt" || stored === "en") setLocaleState(stored);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: TranslationKey) =>
    dictionaries[locale][key] ?? dictionaries.pt[key] ?? key;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
