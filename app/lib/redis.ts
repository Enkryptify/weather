import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// All of this degrades gracefully: if the Upstash env vars aren't present
// (e.g. a local dev run without Enkryptify injecting secrets), caching and
// rate limiting are simply skipped and the app keeps working.

let redis: Redis | null | undefined;
let ratelimit: Ratelimit | null;

// Ephemeral in-memory cache — lets a hot serverless instance short-circuit
// repeat offenders without a round-trip to Redis. Must live at module scope.
const ephemeralCache = new Map<string, number>();

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

export function getRatelimit(): Ratelimit | null {
  if (ratelimit !== undefined) return ratelimit;
  const r = getRedis();
  ratelimit = r
    ? new Ratelimit({
        redis: r,
        // 30 requests per minute per IP — comfortable for real browsing
        // (search + locate + unit toggles), hostile to scraping.
        limiter: Ratelimit.slidingWindow(30, "60 s"),
        prefix: "weather:rl",
        ephemeralCache,
        analytics: false,
      })
    : null;
  return ratelimit;
}

/** Cached read-through helper. Returns `null` on miss or when Redis is off. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get<T>(key);
  } catch {
    return null; // never let a cache hiccup take down the route
  }
}

/** Stores a value with a TTL (seconds). No-op when Redis is off. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, value, { ex: ttlSeconds });
  } catch {
    /* ignore */
  }
}

export const redisEnabled = () => getRedis() !== null;
