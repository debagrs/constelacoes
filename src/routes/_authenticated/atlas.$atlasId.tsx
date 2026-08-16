name: Preparar Atlas — baixo consumo

on:
  workflow_dispatch:

concurrency:
  group: atlas-prepare-low-read
  cancel-in-progress: false

jobs:
  prepare:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Baixar repositório
        uses: actions/checkout@v4

      - name: Configurar Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Instalar dependências
        run: npm install --no-package-lock --no-audit --no-fund

      - name: Testar Turso e criar somente estruturas de baixo consumo
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
        run: node turso/migrate-low-read-safe.mjs

      - name: Reconstruir resumos e deduplicação uma única vez
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
          ATLAS_INDEX_PAGE_SIZE: "600"
        run: npm run db:refresh-indexes

      - name: Auditar pelos resumos materializados
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
        run: npm run db:audit
