import { STORAGE_KEYS, CACHE_TTL_MS } from '../../shared/constants';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  orgId: string;
}

// Namespace enum to prevent key collisions between different data types
export const CacheNamespace = {
  OBJECT_LIST: 'ol',
  PROFILES: 'pr',
  PERM_SETS: 'ps',
  MATRIX: 'mx',
  ACCORDION: 'ac',
} as const;

function getCacheKey(namespace: string, key: string): string {
  return `${STORAGE_KEYS.CACHE_PREFIX}${namespace}:${key}`;
}

export async function getCached<T>(
  namespace: string,
  key: string,
  orgId: string,
): Promise<T | null> {
  try {
    const cacheKey = getCacheKey(namespace, key);
    const result = await chrome.storage.session.get(cacheKey);
    const entry = result[cacheKey] as CacheEntry<T> | undefined;

    if (!entry) return null;
    if (entry.orgId !== orgId) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      await chrome.storage.session.remove(cacheKey);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export async function setCache<T>(
  namespace: string,
  key: string,
  data: T,
  orgId: string,
): Promise<void> {
  try {
    const cacheKey = getCacheKey(namespace, key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      orgId,
    };
    await chrome.storage.session.set({ [cacheKey]: entry });
  } catch {
    // Storage quota exceeded — silently fail
  }
}

export async function clearCache(): Promise<void> {
  try {
    const all = await chrome.storage.session.get(null);
    const cacheKeys = Object.keys(all).filter((k) => k.startsWith(STORAGE_KEYS.CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await chrome.storage.session.remove(cacheKeys);
    }
  } catch {
    // Ignore cleanup errors
  }
}
