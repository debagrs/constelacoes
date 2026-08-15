# Atlas Planetário — correção de baixo consumo do Turso

Esta atualização foi preparada diretamente sobre `constelacoes-main (6).zip`.

## IMPORTANTE: não execute as Actions enquanto a cota estiver em 100%

No estado atual da conta Turso, as consultas podem continuar retornando `BLOCKED` porque a franquia mensal de rows read já foi atingida. Subir estes arquivos para o GitHub/Vercel é correto, mas **não execute ainda**:

- `Preparar Atlas — baixo consumo`
- `Sincronizar acervo AIC — baixo consumo`

A preparação cria índices e, em banco que já contém dados, a própria criação de índices exige uma leitura inicial das linhas existentes. Por isso ela deve ser executada somente quando a cota voltar a estar disponível.

## O que causava consumo excessivo no projeto anterior

O código anterior fazia várias operações caras no acervo em requisições normais:

- `COUNT`, `COUNT(DISTINCT)`, `SUM` e `GROUP BY` repetidos na Curadoria;
- deduplicação com `NOT EXISTS` correlacionado contra a própria tabela `entities`;
- `ROW_NUMBER()` sobre grandes conjuntos;
- `ORDER BY random()` no banco;
- pesquisa com muitos `LIKE '%termo%'` em diversos campos;
- paginação com `OFFSET` em scripts de reclassificação;
- reclassificação completa antes e depois da mesma importação;
- leitura do conjunto inteiro da rede em cache frio.

Esses padrões foram removidos ou confinados a rotinas administrativas executadas uma única vez depois de cargas grandes.

## Nova arquitetura

### 1. Tabelas-resumo

A Home, o Acervo, o Mapa e a Curadoria deixam de recalcular estatísticas sobre `entities` a cada acesso. O script `turso/refresh-atlas-indexes.mjs` faz uma varredura linear controlada e materializa:

- `atlas_metrics`
- `atlas_type_stats`
- `atlas_facet_stats`
- `atlas_region_stats`
- `atlas_continent_stats`
- `atlas_region_timeline`
- `atlas_region_facet_stats`
- `atlas_quality_issues`
- `entity_facet_candidates`
- `entity_dedupe_index`

### 2. Paginação por cursor

Acervo e mapa não executam mais `COUNT + OFFSET` para cada página. O próximo lote continua a partir do último `id` recebido.

### 3. Deduplicação materializada

A aplicação pública consulta `entity_dedupe_index` em vez de comparar cada card com todas as outras entidades em tempo real.

### 4. Busca textual

O esquema tenta ativar o FTS nativo do Turso/Tantivy. Quando disponível, a pesquisa usa `fts_match(...)`. Se o recurso não estiver disponível, o fallback é deliberadamente restrito a prefixos de título/subtítulo para proteger a cota — não faz uma busca `%termo%` em dezenas de campos.

### 5. Home

Não existe mais `ORDER BY random()` em `entities`. A aplicação lê pequenos pools em cache e sorteia os cards em memória.

### 6. Rede

A Rede não carrega todo o futuro acervo de dezenas de milhares de entidades em uma consulta. A constelação inicial usa um corpus limitado e mantém a exploração progressiva.

### 7. AIC

A sincronização continua usando o dump do Art Institute of Chicago e URLs IIIF externas; os bytes das imagens não são armazenados no Turso. O cursor de importação é persistente: se o dump já terminou, outra execução com `reset_cursor=false` não reinicia tudo do zero.

A importação automática pode atribuir diretamente apenas lentes temáticas seguras, como animalidades/ecologias, e o núcleo de mães já documentadas. Possíveis pertencimentos indígenas, negros/diaspóricos e LGBTQIA+ entram como **candidatos para revisão**, não como identidade inferida.

## Ordem correta depois que a cota voltar

### Etapa A — preparar o banco uma única vez

GitHub → Actions → **Preparar Atlas — baixo consumo** → Run workflow

Essa Action:

1. aplica o esquema;
2. cria os índices necessários;
3. faz uma única varredura linear do acervo atual;
4. grava resumos, deduplicação e filas de qualidade;
5. mostra uma auditoria que lê apenas as tabelas-resumo.

Espere ficar verde.

### Etapa B — conferir o site

Abra:

- Home
- Acervo
- Mapa
- Curadoria → Qualidade do acervo

A Curadoria deve mostrar números provenientes das tabelas-resumo.

### Etapa C — só então sincronizar o AIC

GitHub → Actions → **Sincronizar acervo AIC — baixo consumo** → Run workflow

Use:

`reset_cursor = false`

A Action:

1. garante o esquema;
2. garante o núcleo documentado de mulheres e mães;
3. baixa o dump oficial do AIC;
4. faz upsert em lotes;
5. reconstrói os resumos uma única vez ao final;
6. otimiza o FTS;
7. audita pelas tabelas-resumo.

**Não use `reset_cursor=true`** a menos que exista uma razão explícita para reprocessar o dump desde o início.

## O que esta atualização não faz

- não apaga o acervo;
- não apaga Atlas pessoais;
- não apaga relações;
- não grava os arquivos das imagens no Turso;
- não transforma automaticamente indícios textuais em identidade sensível;
- não remove os bancos `metodologia5is`, `portfolio` ou outros da conta.

## Validações feitas antes da entrega

- `schema.sql` analisado e executado em SQLite local em memória;
- separador usado por `apply-schema.mjs` testado com todas as instruções do schema;
- todos os scripts `.mjs` verificados com `node --check`;
- todos os arquivos TS/TSX verificados por transpile sintático;
- workflows YAML analisados;
- `package.json` e `vercel.json` analisados como JSON;
- ZIPs testados depois da geração.

O build completo com instalação de todas as dependências não foi concluído no sandbox, portanto não é afirmado como teste realizado. O build real continuará sendo validado pela Vercel.
