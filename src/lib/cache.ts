/**
 * Unified Multi-Tier Caching & Request Deduplication Layer (v2)
 * 
 * Provides:
 * 1. In-memory hot cache for instant component transitions
 * 2. Persistent localStorage backing across page refreshes
 * 3. In-flight request deduplication to prevent duplicate concurrent network calls
 * 4. Tagged / key-prefix invalidation on mutations (add/edit/delete project, edit profile)
 * 5. Safe handling to prevent caching empty error fallbacks permanently
 */

export interface CacheOptions {
  ttlMs?: number;
  skipCache?: boolean;
  persistLocal?: boolean;
  cacheEmpty?: boolean;
}

// Default Cache TTLs (Time-To-Live)
export const CACHE_TTL = {
  STATIC: 1000 * 60 * 60 * 24,       // 24 hours: Degree programs, static configurations
  PUBLIC_DATA: 1000 * 60 * 10,       // 10 minutes: Explore directory, public student showcases, GitHub stats
  USER_SESSION: 1000 * 60 * 5,       // 5 minutes: Authenticated student profile & showcased projects
  CONTRIBUTIONS: 1000 * 60 * 15,     // 15 minutes: GitHub contribution calendars
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

// 1. Hot in-memory cache
const memoryCache = new Map<string, CacheEntry<any>>();

// 2. In-flight promise tracker for request deduplication
const inFlightRequests = new Map<string, Promise<any>>();

const LOCAL_STORAGE_CACHE_PREFIX = 'gitshowcase_cache_v2_';

// Clean legacy v1 poisoned cache keys once on boot
if (typeof window !== 'undefined') {
  try {
    const legacyKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('gitshowcase_cache_') && !k.startsWith(LOCAL_STORAGE_CACHE_PREFIX)) {
        legacyKeys.push(k);
      }
    }
    legacyKeys.forEach(k => localStorage.removeItem(k));
  } catch {
    // Non-fatal
  }
}

/**
 * Read from memory cache or localStorage
 */
export function getFromCache<T>(key: string): T | null {
  const now = Date.now();

  // Check in-memory first
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry) {
    if (now - memoryEntry.timestamp < memoryEntry.ttlMs) {
      return memoryEntry.data as T;
    }
    memoryCache.delete(key);
  }

  // Check localStorage if in browser
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_CACHE_PREFIX}${key}`);
      if (raw) {
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (now - entry.timestamp < entry.ttlMs) {
          // Re-populate memory cache
          memoryCache.set(key, entry);
          return entry.data;
        } else {
          localStorage.removeItem(`${LOCAL_STORAGE_CACHE_PREFIX}${key}`);
        }
      }
    } catch {
      // LocalStorage errors are non-fatal
    }
  }

  return null;
}

/**
 * Store value in memory cache and optionally localStorage
 */
export function setInCache<T>(
  key: string, 
  data: T, 
  ttlMs = CACHE_TTL.PUBLIC_DATA, 
  persistLocal = true
): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttlMs,
  };

  memoryCache.set(key, entry);

  if (persistLocal && typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // Ignore quota exceeded errors
    }
  }
}

/**
 * Remove specific key or all keys matching prefix from memory & localStorage
 */
export function invalidateCache(keyOrPrefix: string): void {
  // Clear memory cache keys
  for (const key of memoryCache.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      memoryCache.delete(key);
    }
  }

  // Clear localStorage keys
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey && storageKey.startsWith(`${LOCAL_STORAGE_CACHE_PREFIX}${keyOrPrefix}`)) {
          keysToRemove.push(storageKey);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Deduplicate concurrent network requests for the same key.
 * If a request for `key` is already in flight, returns the existing promise.
 */
export async function dedupeRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await fetcher();
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * High-level helper: Retrieve from cache, or deduplicate and execute fetcher, then cache result.
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const ttlMs = options?.ttlMs ?? CACHE_TTL.PUBLIC_DATA;
  const skipCache = options?.skipCache ?? false;
  const persistLocal = options?.persistLocal ?? true;
  const cacheEmpty = options?.cacheEmpty ?? false;

  if (!skipCache) {
    const cached = getFromCache<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  }

  return await dedupeRequest(key, async () => {
    const result = await fetcher();
    if (result !== null && result !== undefined) {
      // Do not store empty arrays into persistent localStorage unless explicitly enabled
      const isEmptyArray = Array.isArray(result) && result.length === 0;
      const shouldPersist = persistLocal && (!isEmptyArray || cacheEmpty);
      setInCache(key, result, isEmptyArray ? Math.min(ttlMs, 1000 * 15) : ttlMs, shouldPersist);
    }
    return result;
  });
}
