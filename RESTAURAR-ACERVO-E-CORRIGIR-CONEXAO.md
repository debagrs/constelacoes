# Restaurar o acervo e confirmar a conexão

O front exibindo **0 obras catalogadas** significa que a aplicação conseguiu consultar a tabela `entities`, mas não encontrou registros publicados nela. O arquivo `acervo-export.zip` contém 3.331 entidades publicadas e foi incorporado a este projeto em `data/acervo-export`.

## 1. Não use o Blob do 5I's

O Atlas não precisa do Vercel Blob para mostrar as imagens de museus e Wikimedia. No projeto `constelacoes`, desconecte o Blob `metodologia5-is-labinterfac-blob`, sem apagar o armazenamento original.

## 2. Adicione os segredos no GitHub

No repositório do Atlas:

1. Abra **Settings**.
2. Abra **Secrets and variables** → **Actions**.
3. Crie `TURSO_DATABASE_URL` com a URL do banco `constelacoes`.
4. Crie `TURSO_AUTH_TOKEN` com um token válido desse mesmo banco.

Não use a URL nem o token do banco `metodologia5is`.

## 3. Restaure o acervo

1. Abra a aba **Actions**.
2. Selecione **Restaurar acervo do Atlas**.
3. Clique em **Run workflow**.
4. Espere o sinal verde.

A operação usa `INSERT OR IGNORE`: não apaga nada e não duplica IDs já existentes.

## 4. Atualize a Vercel

Abra **Deployments** no projeto `constelacoes` e faça **Redeploy** sem reaproveitar o cache.

## 5. Teste

Abra `/acervo`. O contador deve indicar aproximadamente 3.331 registros. Digite `Frida Kahlo` e clique em **Buscar no planeta**. A mesma busca filtrará o acervo local e consultará os acervos externos.

## Autenticação

A tela de autenticação agora mostra a mensagem real. Caso apareça “Já existe uma conta com este e-mail”, use a aba **Entrar**, em vez de **Criar conta**.
