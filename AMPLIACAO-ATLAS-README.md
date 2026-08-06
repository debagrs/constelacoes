# Ampliação do Atlas Planetário

Esta versão preserva integralmente o acervo tradicional e acrescenta uma camada curatorial ampliada, situada e moderada.

## O que foi acrescentado

- filtros curatoriais para tradição, mulheres e mães, povos indígenas, pessoas negras e diásporas, LGBTQIA+, bioética/animalidades e além do Antropoceno;
- metadados sensíveis tratados como contextuais e, sempre que possível, autodeclarados;
- metadados poéticos: sensorialidades, afetos e temporalidades;
- página pública `/colabore` para cadastrar obra, artista, projeto, movimento, conceito ou prática;
- fila privada `/curadoria/contribuicoes`, visível apenas para `admin` e `curador`;
- aprovação transforma a contribuição em registro publicado; recusa e pedido de ajustes não publicam nada;
- script incremental para incorporar até 20.000 registros com imagem do Wikidata/Wikimedia Commons sem apagar os registros existentes.

## Passo 1 — Subir os arquivos no GitHub

Substitua o projeto pelos arquivos desta pasta. As novas rotas serão geradas automaticamente no primeiro build pelo TanStack Router.

## Passo 2 — Atualizar o banco Turso

No terminal do projeto, com `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` configurados, execute:

```bash
npm run db:schema
```

Isso aplica somente o esquema e cria a tabela `submissions` sem apagar ou migrar novamente o acervo existente.

## Passo 3 — Confirmar seu papel de curadora

Sua conta precisa ter `admin` ou `curador` na tabela `user_roles`. Exemplo pelo Turso CLI:

```sql
INSERT OR IGNORE INTO user_roles (id, user_id, role)
SELECT lower(hex(randomblob(16))), id, 'admin'
FROM users
WHERE email = 'SEU_EMAIL_AQUI';
```

## Passo 4 — Ampliar para mais de 20 mil imagens

O script faz inserção incremental e usa `INSERT OR IGNORE`, portanto não apaga nem duplica IDs já existentes.

```bash
npm run ingest:20000
```

Para testar primeiro com 100 registros:

```bash
ATLAS_TARGET=100 npm run ingest:20000
```

A quantidade final do site será o acervo atual mais os novos registros efetivamente inéditos. Como o Wikidata pode limitar consultas ou conter itens repetidos entre perspectivas, talvez seja necessário rodar novamente ou aumentar `ATLAS_TARGET` para ultrapassar 20 mil registros totais.

## Cuidados curatoriais indispensáveis

O script automático não atribui identidades sensíveis como fato. Ele registra apenas a lente de busca e marca os metadados sensíveis como pendentes de confirmação. Antes de usar publicamente categorias como raça, gênero, sexualidade, maternidade, pertencimento indígena ou deficiência, confirme em fonte confiável ou autodeclaração.

Toda imagem mantém a URL de origem. A licença específica deve ser conferida na página do Wikimedia Commons antes de usos editoriais, impressos ou comerciais.

## Fluxo de contribuição

1. A pessoa entra em `/colabore` e envia os dados.
2. A contribuição fica com status `pending` e não aparece no acervo.
3. Você entra em `/curadoria/contribuicoes`.
4. Ao clicar em **Aprovar e publicar**, o sistema cria uma entidade pública no acervo.
5. **Pedir ajustes** mantém a contribuição fora do ar.
6. **Recusar** arquiva a contribuição sem publicá-la.

## Importação automática pelo GitHub

A pasta `.github/workflows` contém **Importar imagens para o Atlas**. Esse fluxo executa a importação dentro do GitHub e grava diretamente no Turso.

No repositório, abra **Settings → Secrets and variables → Actions** e crie estes dois segredos:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Depois abra **Actions → Importar imagens para o Atlas → Run workflow**. Para evitar bloqueios do Wikidata, recomenda-se importar lotes de 2.000 registros. Execute novamente até ultrapassar 20 mil.

O fluxo também roda semanalmente para acrescentar novos registros. Como usa `INSERT OR IGNORE`, não apaga o acervo existente e não repete um mesmo QID.

### Como as imagens ficam relacionadas

O projeto não baixa milhares de arquivos para o GitHub. Cada registro guarda:

- `image_url`: endereço direto da imagem no Wikimedia Commons;
- `source_url`: página original do arquivo;
- `image_license`: indicação para consultar licença e atribuição na fonte;
- `metadata.wikidata_url`: página do item no Wikidata;
- `metadata.image_linked_not_copied`: confirma que a imagem está vinculada, não copiada.

Isso mantém o repositório leve e permite exibir mais de 20 mil imagens no site.
