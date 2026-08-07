/**
 * Cache efêmero para leituras públicas do Atlas.
 *
 * Objetivo: reduzir leituras repetidas no Turso dentro da mesma instância quente
 * da Vercel. Não substitui o banco e não guarda autenticação nem dados privados.
 * Em uma nova instância serverless o cache começa vazio, o que é esperado.
 */
type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const publicCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 320;

function prune(now: number) {
  for (const [key, entry] of publicCache) {
    if (entry.expiresAt <= now) publicCache.delete(key);
  }

  if (publicCache.size <= MAX_ENTRIES) return;
  const excess = publicCache.size - MAX_ENTRIES;
  let removed = 0;
  for (const key of publicCache.keys()) {
    publicCache.delete(key);
    removed += 1;
    if (removed >= excess) break;
  }
}

export async function cachedPublic<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = publicCache.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const promise = loader()
    .then((value) => {
      publicCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      prune(Date.now());
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise as Promise<unknown>);
  return promise;
}

export function cacheKey(prefix: string, input: unknown): string {
  return `${prefix}:${JSON.stringify(input)}`;
}
