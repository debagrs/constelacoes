# Atlas Planetário — acervos abertos e Blob

## Por que o Blob da Metodologia 5I's apareceu no projeto Constelações?

O Blob não entrou pelo código do Atlas. Ele foi **conectado ao projeto Constelações dentro do painel da Vercel**. Quando um Blob Store é conectado, a Vercel cria automaticamente as variáveis `BLOB_STORE_ID` e `BLOB_WEBHOOK_PUBLIC_KEY` naquele projeto.

Isso não significa que os arquivos da Metodologia foram copiados para o Atlas. Significa apenas que os dois projetos foram ligados ao mesmo armazenamento.

## O que fazer sem quebrar a Metodologia 5I's

1. Abra o projeto `constelacoes` na Vercel.
2. Entre em **Storage**.
3. No cartão `metodologia5-is-labinterfac-blob`, abra o menu de opções.
4. Escolha **Disconnect from project** / **Desconectar do projeto**.
5. **Não escolha Delete Store**, pois isso poderia apagar o armazenamento usado pela Metodologia 5I's.
6. Depois abra **Environment Variables** e confirme que `BLOB_STORE_ID` e `BLOB_WEBHOOK_PUBLIC_KEY` desapareceram. Se continuarem, remova somente essas duas variáveis do projeto Constelações.
7. Faça um novo deploy.

O Atlas atual não utiliza Blob. Portanto, essas duas variáveis podem ser removidas do projeto Constelações.

## Como as imagens externas funcionam agora

A página `/acervo` ganhou a seção **Acervos abertos do planeta**. A busca consulta ao vivo:

- The Metropolitan Museum of Art;
- Art Institute of Chicago;
- Wikimedia Commons.

O Atlas não baixa nem duplica os arquivos. Ele exibe miniaturas e mantém cada obra ligada à página original, com instituição e licença quando disponibilizadas pela fonte.

## O que continua no Turso

O Turso permanece responsável por:

- acervo próprio e curado;
- cadastros enviados pela comunidade;
- aprovação ou recusa pela curadora;
- usuários e papéis;
- relações, atlas e metadados poéticos;
- obras que forem efetivamente incorporadas ao acervo autoral.

Essa separação evita encher o banco com milhões de registros externos e preserva a moderação do Atlas.

## Importador antigo de 20 mil registros

O workflow automático que gravava milhares de itens no Turso foi removido desta versão. A consulta federada é mais segura para o plano gratuito e evita inserir obras no banco errado. Os scripts históricos permanecem na pasta `turso/` apenas como referência técnica, mas não são executados automaticamente.
