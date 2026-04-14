import type { MiddlewareHandler } from "hono";

interface RateLimitOptions {
  /** Maximum requests per window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Message returned to the client when limit is exceeded */
  message?: string;
  /** Key extractor — defaults to client IP */
  keyFn?: (c: Parameters<MiddlewareHandler>[0]) => string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory sliding window rate limiter.
 *
 * Suitable for single-instance deployments (Railway single service).
 * For multi-instance scale-out, replace the `store` Map with a Redis
 * counter (INCR + EXPIRE) using the cache module.
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const { max, windowMs, message = "Too many requests. Please try again later." } = options;
  const store = new Map<string, WindowEntry>();

  // Cleanup expired entries every 5 minutes to prevent memory leaks
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Allow GC to collect the interval when the process exits
  cleanup.unref?.();

  const defaultKeyFn = (c: Parameters<MiddlewareHandler>[0]) => {
    // Hono sets CF-Connecting-IP / X-Forwarded-For in production behind proxies
    const forwarded = c.req.header("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    return ip;
  };

  const keyFn = options.keyFn ?? defaultKeyFn;

  return async (c, next) => {
    const key = keyFn(c);
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
    } else {
      entry.count++;
    }

    const remaining = Math.max(0, max - entry.count);
    const resetSecs = Math.ceil((entry.resetAt - now) / 1000);

    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.floor(entry.resetAt / 1000)));

    if (entry.count > max) {
      c.header("Retry-After", String(resetSecs));
      return c.json(
        {
          success: false,
          error: { code: "RATE_LIMITED", message },
          meta: { timestamp: new Date().toISOString() },
        },
        429,
      );
    }

    await next();
  };
}
