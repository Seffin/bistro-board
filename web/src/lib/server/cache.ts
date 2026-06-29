import NodeCache from 'node-cache';

/**
 * In-memory TTL cache for expensive server-side computations.
 * In serverless environments (Vercel), this is per-instance; each cold start gets a fresh cache.
 * For production with persistent caching, swap with Redis.
 */

const DEFAULT_TTL = 300; // 5 minutes in seconds

const cache = new NodeCache({
	stdTTL: DEFAULT_TTL,
	checkperiod: 60, // Check for expired keys every 60 seconds
	useClones: false // Return references (faster, safe since we treat cached data as immutable)
});

/**
 * Get a cached value or compute it via the fetcher function.
 * The fetcher is only called on cache miss.
 *
 * @param key - Unique cache key
 * @param fetcher - Async function that computes the value on cache miss
 * @param ttl - Optional TTL override in seconds (default: 300s / 5 min)
 */
export async function getCached<T>(
	key: string,
	fetcher: () => Promise<T>,
	ttl?: number
): Promise<T> {
	const cached = cache.get<T>(key);
	if (cached !== undefined) {
		return cached;
	}

	const value = await fetcher();
	cache.set(key, value, ttl ?? DEFAULT_TTL);
	return value;
}

/**
 * Invalidate all cached entries.
 * Called after data sync to ensure fresh data is loaded.
 */
export function invalidateAll(): void {
	cache.flushAll();
}

/**
 * Invalidate all cache keys matching a prefix.
 *
 * @param prefix - Key prefix to match (e.g., "dashboard:" clears all dashboard cache entries)
 */
export function invalidateByPrefix(prefix: string): void {
	const keys = cache.keys();
	for (const key of keys) {
		if (key.startsWith(prefix)) {
			cache.del(key);
		}
	}
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats() {
	return cache.getStats();
}

/**
 * Exposed for testing only — get the raw cache size.
 */
export function getCacheSize(): number {
	return cache.keys().length;
}
