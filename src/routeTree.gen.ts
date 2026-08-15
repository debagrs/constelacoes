/* eslint-disable */

// @ts-nocheck

// This file is generated/maintained for TanStack Router.

import { Route as rootRouteImport } from './routes/__root'
import { Route as AuthenticatedRouteRouteImport } from './routes/_authenticated/route'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AuthRouteImport } from './routes/auth'
import { Route as MaesRouteImport } from './routes/maes'
import { Route as MapaRouteImport } from './routes/mapa'
import { Route as RedeRouteImport } from './routes/rede'
import { Route as ColaboreRouteImport } from './routes/colabore'
import { Route as RecuperarSenhaRouteImport } from './routes/recuperar-senha'
import { Route as TagTagRouteImport } from './routes/tag.$tag'
import { Route as AcervoIndexRouteImport } from './routes/acervo.index'
import { Route as AcervoIdRouteImport } from './routes/acervo.$id'
import { Route as ApiAiHealthRouteImport } from './routes/api/ai/health'
import { Route as AuthenticatedAtlasIndexRouteImport } from './routes/_authenticated/atlas.index'
import { Route as AuthenticatedAtlasAtlasIdRouteImport } from './routes/_authenticated/atlas.$atlasId'
import { Route as AuthenticatedCuradoriaIndexRouteImport } from './routes/_authenticated/curadoria.index'
import { Route as AuthenticatedCuradoriaImagensRouteImport } from './routes/_authenticated/curadoria.imagens'
import { Route as AuthenticatedCuradoriaContribuicoesRouteImport } from './routes/_authenticated/curadoria.contribuicoes'
import { Route as AuthenticatedCuradoriaQualidadeRouteImport } from './routes/_authenticated/curadoria.qualidade'

const AuthenticatedRouteRoute = AuthenticatedRouteRouteImport.update({
  id: '/_authenticated',
  getParentRoute: () => rootRouteImport,
} as any)

const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)

const AuthRoute = AuthRouteImport.update({
  id: '/auth',
  path: '/auth',
  getParentRoute: () => rootRouteImport,
} as any)

const MaesRoute = MaesRouteImport.update({
  id: '/maes',
  path: '/maes',
  getParentRoute: () => rootRouteImport,
} as any)

const MapaRoute = MapaRouteImport.update({
  id: '/mapa',
  path: '/mapa',
  getParentRoute: () => rootRouteImport,
} as any)

const RedeRoute = RedeRouteImport.update({
  id: '/rede',
  path: '/rede',
  getParentRoute: () => rootRouteImport,
} as any)

const ColaboreRoute = ColaboreRouteImport.update({
  id: '/colabore',
  path: '/colabore',
  getParentRoute: () => rootRouteImport,
} as any)

const RecuperarSenhaRoute = RecuperarSenhaRouteImport.update({
  id: '/recuperar-senha',
  path: '/recuperar-senha',
  getParentRoute: () => rootRouteImport,
} as any)

const TagTagRoute = TagTagRouteImport.update({
  id: '/tag/$tag',
  path: '/tag/$tag',
  getParentRoute: () => rootRouteImport,
} as any)

const AcervoIndexRoute = AcervoIndexRouteImport.update({
  id: '/acervo/',
  path: '/acervo',
  getParentRoute: () => rootRouteImport,
} as any)

const AcervoIdRoute = AcervoIdRouteImport.update({
  id: '/acervo/$id',
  path: '/acervo/$id',
  getParentRoute: () => rootRouteImport,
} as any)

const ApiAiHealthRoute = ApiAiHealthRouteImport.update({
  id: '/api/ai/health',
  path: '/api/ai/health',
  getParentRoute: () => rootRouteImport,
} as any)

const AuthenticatedAtlasIndexRoute = AuthenticatedAtlasIndexRouteImport.update({
  id: '/atlas/',
  path: '/atlas',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)

const AuthenticatedAtlasAtlasIdRoute = AuthenticatedAtlasAtlasIdRouteImport.update({
  id: '/atlas/$atlasId',
  path: '/atlas/$atlasId',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)

const AuthenticatedCuradoriaIndexRoute = AuthenticatedCuradoriaIndexRouteImport.update({
  id: '/curadoria/',
  path: '/curadoria',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)

const AuthenticatedCuradoriaImagensRoute = AuthenticatedCuradoriaImagensRouteImport.update({
  id: '/curadoria/imagens',
  path: '/curadoria/imagens',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)

const AuthenticatedCuradoriaContribuicoesRoute = AuthenticatedCuradoriaContribuicoesRouteImport.update({
  id: '/curadoria/contribuicoes',
  path: '/curadoria/contribuicoes',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)

const AuthenticatedCuradoriaQualidadeRoute = AuthenticatedCuradoriaQualidadeRouteImport.update({
  id: '/curadoria/qualidade',
  path: '/curadoria/qualidade',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/auth': typeof AuthRoute
  '/maes': typeof MaesRoute
  '/mapa': typeof MapaRoute
  '/rede': typeof RedeRoute
  '/colabore': typeof ColaboreRoute
  '/recuperar-senha': typeof RecuperarSenhaRoute
  '/tag/$tag': typeof TagTagRoute
  '/acervo/': typeof AcervoIndexRoute
  '/acervo/$id': typeof AcervoIdRoute
  '/api/ai/health': typeof ApiAiHealthRoute
  '/atlas/': typeof AuthenticatedAtlasIndexRoute
  '/atlas/$atlasId': typeof AuthenticatedAtlasAtlasIdRoute
  '/curadoria/': typeof AuthenticatedCuradoriaIndexRoute
  '/curadoria/imagens': typeof AuthenticatedCuradoriaImagensRoute
  '/curadoria/contribuicoes': typeof AuthenticatedCuradoriaContribuicoesRoute
  '/curadoria/qualidade': typeof AuthenticatedCuradoriaQualidadeRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/auth': typeof AuthRoute
  '/maes': typeof MaesRoute
  '/mapa': typeof MapaRoute
  '/rede': typeof RedeRoute
  '/colabore': typeof ColaboreRoute
  '/recuperar-senha': typeof RecuperarSenhaRoute
  '/tag/$tag': typeof TagTagRoute
  '/acervo': typeof AcervoIndexRoute
  '/acervo/$id': typeof AcervoIdRoute
  '/api/ai/health': typeof ApiAiHealthRoute
  '/atlas': typeof AuthenticatedAtlasIndexRoute
  '/atlas/$atlasId': typeof AuthenticatedAtlasAtlasIdRoute
  '/curadoria': typeof AuthenticatedCuradoriaIndexRoute
  '/curadoria/imagens': typeof AuthenticatedCuradoriaImagensRoute
  '/curadoria/contribuicoes': typeof AuthenticatedCuradoriaContribuicoesRoute
  '/curadoria/qualidade': typeof AuthenticatedCuradoriaQualidadeRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/_authenticated': typeof AuthenticatedRouteRouteWithChildren
  '/': typeof IndexRoute
  '/auth': typeof AuthRoute
  '/maes': typeof MaesRoute
  '/mapa': typeof MapaRoute
  '/rede': typeof RedeRoute
  '/colabore': typeof ColaboreRoute
  '/recuperar-senha': typeof RecuperarSenhaRoute
  '/tag/$tag': typeof TagTagRoute
  '/acervo/': typeof AcervoIndexRoute
  '/acervo/$id': typeof AcervoIdRoute
  '/api/ai/health': typeof ApiAiHealthRoute
  '/_authenticated/atlas/': typeof AuthenticatedAtlasIndexRoute
  '/_authenticated/atlas/$atlasId': typeof AuthenticatedAtlasAtlasIdRoute
  '/_authenticated/curadoria/': typeof AuthenticatedCuradoriaIndexRoute
  '/_authenticated/curadoria/imagens': typeof AuthenticatedCuradoriaImagensRoute
  '/_authenticated/curadoria/contribuicoes': typeof AuthenticatedCuradoriaContribuicoesRoute
  '/_authenticated/curadoria/qualidade': typeof AuthenticatedCuradoriaQualidadeRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/auth'
    | '/maes'
    | '/mapa'
    | '/rede'
    | '/colabore'
    | '/recuperar-senha'
    | '/tag/$tag'
    | '/acervo/'
    | '/acervo/$id'
    | '/api/ai/health'
    | '/atlas/'
    | '/atlas/$atlasId'
    | '/curadoria/'
    | '/curadoria/imagens'
    | '/curadoria/contribuicoes'
    | '/curadoria/qualidade'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/auth'
    | '/maes'
    | '/mapa'
    | '/rede'
    | '/colabore'
    | '/recuperar-senha'
    | '/tag/$tag'
    | '/acervo'
    | '/acervo/$id'
    | '/api/ai/health'
    | '/atlas'
    | '/atlas/$atlasId'
    | '/curadoria'
    | '/curadoria/imagens'
    | '/curadoria/contribuicoes'
    | '/curadoria/qualidade'
  id:
    | '__root__'
    | '/_authenticated'
    | '/'
    | '/auth'
    | '/maes'
    | '/mapa'
    | '/rede'
    | '/colabore'
    | '/recuperar-senha'
    | '/tag/$tag'
    | '/acervo/'
    | '/acervo/$id'
    | '/api/ai/health'
    | '/_authenticated/atlas/'
    | '/_authenticated/atlas/$atlasId'
    | '/_authenticated/curadoria/'
    | '/_authenticated/curadoria/imagens'
    | '/_authenticated/curadoria/contribuicoes'
    | '/_authenticated/curadoria/qualidade'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  AuthenticatedRouteRoute: typeof AuthenticatedRouteRouteWithChildren
  IndexRoute: typeof IndexRoute
  AuthRoute: typeof AuthRoute
  MaesRoute: typeof MaesRoute
  MapaRoute: typeof MapaRoute
  RedeRoute: typeof RedeRoute
  ColaboreRoute: typeof ColaboreRoute
  RecuperarSenhaRoute: typeof RecuperarSenhaRoute
  TagTagRoute: typeof TagTagRoute
  AcervoIndexRoute: typeof AcervoIndexRoute
  AcervoIdRoute: typeof AcervoIdRoute
  ApiAiHealthRoute: typeof ApiAiHealthRoute
}
declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/_authenticated': {
      id: '/_authenticated'
      path: ''
      fullPath: '/'
      preLoaderRoute: typeof AuthenticatedRouteRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/': {
      id: '/'
      path: ''
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/auth': {
      id: '/auth'
      path: '/auth'
      fullPath: '/auth'
      preLoaderRoute: typeof AuthRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/maes': {
      id: '/maes'
      path: '/maes'
      fullPath: '/maes'
      preLoaderRoute: typeof MaesRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/mapa': {
      id: '/mapa'
      path: '/mapa'
      fullPath: '/mapa'
      preLoaderRoute: typeof MapaRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/rede': {
      id: '/rede'
      path: '/rede'
      fullPath: '/rede'
      preLoaderRoute: typeof RedeRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/colabore': {
      id: '/colabore'
      path: '/colabore'
      fullPath: '/colabore'
      preLoaderRoute: typeof ColaboreRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/recuperar-senha': {
      id: '/recuperar-senha'
      path: '/recuperar-senha'
      fullPath: '/recuperar-senha'
      preLoaderRoute: typeof RecuperarSenhaRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/tag/$tag': {
      id: '/tag/$tag'
      path: '/tag/$tag'
      fullPath: '/tag/$tag'
      preLoaderRoute: typeof TagTagRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/acervo/': {
      id: '/acervo/'
      path: '/acervo'
      fullPath: '/acervo/'
      preLoaderRoute: typeof AcervoIndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/acervo/$id': {
      id: '/acervo/$id'
      path: '/acervo/$id'
      fullPath: '/acervo/$id'
      preLoaderRoute: typeof AcervoIdRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/ai/health': {
      id: '/api/ai/health'
      path: '/api/ai/health'
      fullPath: '/api/ai/health'
      preLoaderRoute: typeof ApiAiHealthRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_authenticated/atlas/': {
      id: '/_authenticated/atlas/'
      path: '/atlas'
      fullPath: '/atlas/'
      preLoaderRoute: typeof AuthenticatedAtlasIndexRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/atlas/$atlasId': {
      id: '/_authenticated/atlas/$atlasId'
      path: '/atlas/$atlasId'
      fullPath: '/atlas/$atlasId'
      preLoaderRoute: typeof AuthenticatedAtlasAtlasIdRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/curadoria/': {
      id: '/_authenticated/curadoria/'
      path: '/curadoria'
      fullPath: '/curadoria/'
      preLoaderRoute: typeof AuthenticatedCuradoriaIndexRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/curadoria/imagens': {
      id: '/_authenticated/curadoria/imagens'
      path: '/curadoria/imagens'
      fullPath: '/curadoria/imagens'
      preLoaderRoute: typeof AuthenticatedCuradoriaImagensRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/curadoria/contribuicoes': {
      id: '/_authenticated/curadoria/contribuicoes'
      path: '/curadoria/contribuicoes'
      fullPath: '/curadoria/contribuicoes'
      preLoaderRoute: typeof AuthenticatedCuradoriaContribuicoesRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/curadoria/qualidade': {
      id: '/_authenticated/curadoria/qualidade'
      path: '/curadoria/qualidade'
      fullPath: '/curadoria/qualidade'
      preLoaderRoute: typeof AuthenticatedCuradoriaQualidadeRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
  }
}
interface AuthenticatedRouteRouteChildren {
  AuthenticatedAtlasIndexRoute: typeof AuthenticatedAtlasIndexRoute
  AuthenticatedAtlasAtlasIdRoute: typeof AuthenticatedAtlasAtlasIdRoute
  AuthenticatedCuradoriaIndexRoute: typeof AuthenticatedCuradoriaIndexRoute
  AuthenticatedCuradoriaImagensRoute: typeof AuthenticatedCuradoriaImagensRoute
  AuthenticatedCuradoriaContribuicoesRoute: typeof AuthenticatedCuradoriaContribuicoesRoute
  AuthenticatedCuradoriaQualidadeRoute: typeof AuthenticatedCuradoriaQualidadeRoute
}
const AuthenticatedRouteRouteChildren: AuthenticatedRouteRouteChildren = {
  AuthenticatedAtlasIndexRoute: AuthenticatedAtlasIndexRoute,
  AuthenticatedAtlasAtlasIdRoute: AuthenticatedAtlasAtlasIdRoute,
  AuthenticatedCuradoriaIndexRoute: AuthenticatedCuradoriaIndexRoute,
  AuthenticatedCuradoriaImagensRoute: AuthenticatedCuradoriaImagensRoute,
  AuthenticatedCuradoriaContribuicoesRoute: AuthenticatedCuradoriaContribuicoesRoute,
  AuthenticatedCuradoriaQualidadeRoute: AuthenticatedCuradoriaQualidadeRoute,
}

const AuthenticatedRouteRouteWithChildren =
  AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren)

const rootRouteChildren: RootRouteChildren = {
  AuthenticatedRouteRoute: AuthenticatedRouteRouteWithChildren,
  IndexRoute: IndexRoute,
  AuthRoute: AuthRoute,
  MaesRoute: MaesRoute,
  MapaRoute: MapaRoute,
  RedeRoute: RedeRoute,
  ColaboreRoute: ColaboreRoute,
  RecuperarSenhaRoute: RecuperarSenhaRoute,
  TagTagRoute: TagTagRoute,
  AcervoIndexRoute: AcervoIndexRoute,
  AcervoIdRoute: AcervoIdRoute,
  ApiAiHealthRoute: ApiAiHealthRoute,
}

export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { startInstance } from './start'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
    config: Awaited<ReturnType<typeof startInstance.getOptions>>
  }
}
