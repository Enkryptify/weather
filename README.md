# Aurora — a calm, premium weather app

A light-mode forecast built with Next.js 16 (App Router) and Tailwind v4. The
sky gradient shifts with the conditions and the local sun position (dawn → day
→ dusk → night), and the forecast rides on a sheet that rises over it. Typeset
in **Bodoni Moda** (display) and **Hanken Grotesk** (UI).

## Setup

Secrets live in [Enkryptify](https://enkryptify.com) and are injected at runtime:

```bash
pnpm install
pnpm run dev
```

## Secrets

| Variable                  | Required | Notes                                                                                                       |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `OPENWEATHERMAP_API_KEY`  | yes      | Server-only — used by `/api/weather`, never sent to the browser.                                            |
| `APP_NAME`                | no       | Display name (header + tab). Read at **runtime**, so you can change it on a redeploy without rebuilding.     |
| `UPSTASH_REDIS_REST_URL`  | no       | Upstash Redis REST URL. Enables response caching + rate limiting.                                           |
| `UPSTASH_REDIS_REST_TOKEN`| no       | Upstash Redis REST token.                                                                                   |

## How it works

- **`app/api/weather/route.ts`** — the only place the API key is touched.
  Each request is rate limited per IP (30/min) and served from a 10-minute
  Redis cache when possible, so most traffic never reaches OpenWeatherMap.
- **`app/lib/redis.ts`** — lazy Upstash client + sliding-window limiter, both
  no-ops when the Upstash env vars are missing.
- **`app/page.tsx`** — server component; reads `APP_NAME` via `connection()`
  (runtime evaluation). It does **not** pick a default city — the client asks to
  use your location, or you search.
- **`app/lib/theme.ts`** — maps conditions + sun position to the sky palette.
- Temperatures travel in Celsius and convert client-side for the °C/°F toggle.

## Abuse protection

- **Caching** — normalized responses are cached in Redis for 10 minutes;
  coordinates are rounded so nearby lookups share a key.
- **Rate limiting** — a sliding window of 30 requests/minute per IP, with an
  in-memory ephemeral cache to short-circuit repeat offenders. Over-limit
  requests get `429` with a `Retry-After` header.
