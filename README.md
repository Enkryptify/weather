# Aurora — a calm, premium weather app

A light-mode forecast built with Next.js 16 (App Router) and Tailwind v4. The
palette, hero gradient, and animated glyph react to the current conditions and
time of day. Typeset in **Fraunces** (display) and **Hanken Grotesk** (UI).

## Setup

```bash
cp .env.example .env.local   # then fill in the values
pnpm install
pnpm dev
```

## Environment variables

| Variable                 | Required | Notes                                                                                                  |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| `OPENWEATHERMAP_API_KEY` | yes      | Server-only — used in the `/api/weather` route and never sent to the browser. Get one at openweathermap.org. |
| `APP_NAME`               | no       | Display name (header + browser tab). Read at **runtime**, so you can change it on redeploy without rebuilding. Defaults to `Aurora`. |

## How it works

- **`app/api/weather/route.ts`** — the only place the API key is touched. The
  client fetches this handler; the key stays on the server.
- **`app/page.tsx`** — server component. Reads `APP_NAME` via `connection()`
  (forcing runtime evaluation) and does the initial forecast fetch.
- **`app/weather-app.tsx`** — the client UI: search, geolocation, °C/°F toggle,
  hourly + 5-day forecast.
- Temperatures travel in Celsius and are converted client-side for the toggle.
