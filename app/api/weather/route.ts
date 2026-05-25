import { NextResponse } from "next/server";
import { getWeather, WeatherFetchError } from "@/app/lib/weather";
import type { WeatherPayload } from "@/app/lib/types";
import { cacheGet, cacheSet, getRatelimit } from "@/app/lib/redis";

const CACHE_TTL = 600;

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "anonymous";
}

// Build a stable cache key. Coordinates are rounded so nearby lookups collapse
// onto the same key, which lifts the hit rate without hurting accuracy.
function cacheKey(city: string | null, lat: string | null, lon: string | null) {
  if (lat && lon) {
    return `weather:geo:${Number(lat).toFixed(2)}:${Number(lon).toFixed(2)}`;
  }
  if (city) return `weather:city:${city.toLowerCase()}`;
  return "weather:city:london";
}

export async function GET(request: Request) {
  // ── Rate limit per IP (skipped when Redis isn't configured) ──────────────
  const ratelimit = getRatelimit();
  if (ratelimit) {
    const { success, limit, remaining, reset } = await ratelimit.limit(
      clientIp(request),
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests — please slow down for a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
          },
        },
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim() || null;
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const key = cacheKey(city, lat, lon);

  // ── Cache read-through ───────────────────────────────────────────────────
  const cached = await cacheGet<WeatherPayload>(key);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const payload =
      lat && lon
        ? await getWeather({ lat: Number(lat), lon: Number(lon) })
        : await getWeather({ city: city ?? "London" });

    await cacheSet(key, payload, CACHE_TTL);

    return NextResponse.json(payload, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    if (err instanceof WeatherFetchError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
