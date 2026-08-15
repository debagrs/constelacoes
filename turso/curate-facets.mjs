/**
 * Compatibilidade com comandos antigos.
 * A classificação agora é feita pela reconstrução linear de índices/resumos,
 * sem paginação OFFSET e sem repetir varreduras do acervo.
 */
await import('./refresh-atlas-indexes.mjs');
