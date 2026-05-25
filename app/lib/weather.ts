import { getApiKey } from "./config";
import type {
  WeatherPayload,
  HourlyPoint,
  DailyPoint,
} from "./types";

const BASE = "https://api.openweathermap.org/data/2.5";

interface OwmList {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: { main: string; description: string; icon: string }[];
  pop?: number;
}

type Query =
  | { city: string }
  | { lat: number; lon: number };

function buildQuery(q: Query): string {
  return "city" in q
    ? `q=${encodeURIComponent(q.city)}`
    : `lat=${q.lat}&lon=${q.lon}`;
}

export class WeatherFetchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Aggregates the 3-hour forecast list into per-day min/max with a midday icon. */
function toDaily(list: OwmList[], timezone: number): DailyPoint[] {
  const byDay = new Map<string, OwmList[]>();
  for (const item of list) {
    const local = new Date((item.dt + timezone) * 1000);
    const key = local.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(item);
    else byDay.set(key, [item]);
  }

  return [...byDay.values()].slice(0, 5).map((items) => {
    let min = Infinity;
    let max = -Infinity;
    for (const it of items) {
      min = Math.min(min, it.main.temp_min);
      max = Math.max(max, it.main.temp_max);
    }
    // Pick the entry closest to local noon to represent the day's look.
    const noon = items.reduce((best, it) => {
      const hour = new Date((it.dt + timezone) * 1000).getUTCHours();
      const bestHour = new Date((best.dt + timezone) * 1000).getUTCHours();
      return Math.abs(hour - 12) < Math.abs(bestHour - 12) ? it : best;
    });
    return {
      dt: items[0].dt,
      min: Math.round(min),
      max: Math.round(max),
      icon: noon.weather[0].icon,
      condition: noon.weather[0].main,
    };
  });
}

export async function getWeather(q: Query): Promise<WeatherPayload> {
  const key = getApiKey();
  const qs = buildQuery(q);
  const common = `${qs}&units=metric&appid=${key}`;

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${BASE}/weather?${common}`, { cache: "no-store" }),
    fetch(`${BASE}/forecast?${common}`, { cache: "no-store" }),
  ]);

  if (!currentRes.ok) {
    const status = currentRes.status === 404 ? 404 : currentRes.status;
    throw new WeatherFetchError(
      status === 404 ? "We couldn't find that place." : "Weather service error.",
      status,
    );
  }

  const cur = await currentRes.json();
  const forecast = forecastRes.ok ? await forecastRes.json() : { list: [] };

  const timezone: number = cur.timezone ?? 0;
  const list: OwmList[] = forecast.list ?? [];

  const hourly: HourlyPoint[] = list.slice(0, 8).map((it) => ({
    dt: it.dt,
    temp: Math.round(it.main.temp),
    icon: it.weather[0].icon,
    condition: it.weather[0].main,
    pop: it.pop ?? 0,
  }));

  return {
    location: { name: cur.name, country: cur.sys?.country ?? "" },
    current: {
      temp: Math.round(cur.main.temp),
      feelsLike: Math.round(cur.main.feels_like),
      tempMin: Math.round(cur.main.temp_min),
      tempMax: Math.round(cur.main.temp_max),
      humidity: cur.main.humidity,
      pressure: cur.main.pressure,
      windSpeed: Math.round(cur.wind.speed * 3.6),
      windDeg: cur.wind.deg ?? 0,
      visibility: Math.round((cur.visibility ?? 0) / 1000),
      condition: cur.weather[0].main,
      description: cur.weather[0].description,
      icon: cur.weather[0].icon,
      isDay: cur.weather[0].icon.endsWith("d"),
      dt: cur.dt,
      sunrise: cur.sys?.sunrise ?? 0,
      sunset: cur.sys?.sunset ?? 0,
      timezone,
    },
    hourly,
    daily: toDaily(list, timezone),
  };
}
