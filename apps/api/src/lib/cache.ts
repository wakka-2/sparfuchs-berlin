import { Redis } from "ioredis";

let redis: Redis | null = null;
let connectionFailed = false;

/**
 * Lazily create the Redis client on first use.
 * If REDIS_URL is unset or the connection fails we degrade gracefully —
 * every cache operation becomes a no-op and the API continues serving
 * directly from the database.
 */
function getRedis(): Redis | null {
  if (connectionFailed) return null;
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redis.on("error", (err: Error) => {
      if (!connectionFailed) {
        console.warn(`[cache] Redis unavailable: ${err.message} — falling back to no-cache`);
        connectionFailed = true;
        redis = null;
      }
    });

    return redis;
  } catch {
    connectionFailed = true;
    return null;
  }
}

/** Fetch a JSON-serialised value from Redis. Returns null on miss or error. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Persist a JSON-serialisable value with a TTL (seconds). */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Swallow — cache is best-effort
  }
}

/** Delete one or more keys (e.g. on write operations). */
export async function cacheDel(...keys: string[]): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.del(...keys);
  } catch {
    // Swallow
  }
}

/**
 * Wrap a loader function with cache-aside logic.
 *
 * @example
 * const categories = await withCache("categories:de", 86400, () => listCategories("de"));
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

/** Close the Redis connection on graceful shutdown. */
export async function closeCache(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
    redis = null;
  }
}

/** Return true if a Redis connection is active (useful for /health). */
export function isCacheConnected(): boolean {
  return redis !== null && redis.status === "ready";
}
