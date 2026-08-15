# Favicon e Open Graph

Os arquivos visuais já estão em `public/` e as metatags já estão configuradas em `src/routes/__root.tsx`.

## Única configuração necessária na Vercel

Crie a variável de ambiente:

```text
VITE_SITE_URL=https://ENDERECO-REAL-DO-SEU-PROJETO.vercel.app
```

Use o endereço público real, sem barra no final. Depois faça um novo deploy.

## Arquivos incluídos

- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/favicon-48x48.png`
- `public/favicon-144x144.png`
- `public/favicon-180x180.png`
- `public/favicon-192x192.png`
- `public/favicon-512x512.png`
- `public/apple-touch-icon.png`
- `public/android-chrome-192x192.png`
- `public/android-chrome-512x512.png`
- `public/site.webmanifest`
- `public/og-image.jpg` (1200 × 630 px)

O navegador pode manter o favicon antigo em cache. Depois do deploy, abra o site em janela anônima ou limpe o cache para conferir.
