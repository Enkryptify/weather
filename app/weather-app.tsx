"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { WeatherPayload } from "./lib/types";
import { skyTheme } from "./lib/theme";
import { WeatherGlyph } from "./components/weather-glyph";

/* ── formatting helpers ─────────────────────────────────────────────────── */

const toF = (c: number) => Math.round((c * 9) / 5 + 32);
const showTemp = (c: number, unit: "c" | "f") =>
  unit === "c" ? Math.round(c) : toF(c);

function localTime(dt: number, tz: number, opts: Intl.DateTimeFormatOptions) {
  // OWM gives UTC seconds + a timezone offset; shift then read in UTC.
  return new Date((dt + tz) * 1000).toLocaleString("en-US", {
    ...opts,
    timeZone: "UTC",
  });
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const windDir = (deg: number) => COMPASS[Math.round(deg / 45) % 8];
const cap = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());
const cssVars = (d: number) => ({ "--d": `${d}ms` }) as React.CSSProperties;

/* ── main app ───────────────────────────────────────────────────────────── */

export default function WeatherApp({
  appName,
  initial = null,
}: {
  appName: string;
  initial?: WeatherPayload | null;
}) {
  const [data, setData] = useState<WeatherPayload | null>(initial);
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState<"c" | "f">("c");
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!data) return;
    const { condition, isDay, dt, sunrise, sunset } = data.current;
    const theme = skyTheme(condition, isDay, dt, sunrise, sunset);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(theme)) root.style.setProperty(k, v);
  }, [data]);

  const load = useCallback(async (params: string) => {
    const res = await fetch(`/api/weather?${params}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return;
    }
    setError(null);
    setData(json as WeatherPayload);
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Location isn't available — search a city instead.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        startTransition(() =>
          load(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
        );
      },
      () => {
        setLocating(false);
        setError("Location access was declined — search a city instead.");
      },
      { timeout: 10000 },
    );
  }, [load]);

  // Auto-locate only if permission was already granted; otherwise we ask.
  useEffect(() => {
    if (data || !navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((res) => res.state === "granted" && locate())
      .catch(() => {});
  }, [data, locate]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const city = query.trim();
    if (!city) return;
    startTransition(async () => {
      await load(`city=${encodeURIComponent(city)}`);
      setQuery("");
    });
  }

  const c = data?.current;
  const weekMin = data ? Math.min(...data.daily.map((d) => d.min)) : 0;
  const weekMax = data ? Math.max(...data.daily.map((d) => d.max)) : 1;
  const span = Math.max(weekMax - weekMin, 1);

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[500px] flex-col">
      {/* Top bar over the sky */}
      <div
        className="reveal flex items-center justify-between px-7 pt-8"
        style={cssVars(0)}
      >
        <h1 className="text-on text-[12px] font-medium uppercase tracking-[0.42em]">
          {appName}
        </h1>
        <div className="text-on flex items-center gap-2 text-[12px] tracking-[0.12em]">
          {(["c", "f"] as const).map((u, i) => (
            <span key={u} className="flex items-center gap-2">
              {i > 0 && <span className="opacity-30">/</span>}
              <button
                onClick={() => setUnit(u)}
                className={unit === u ? "opacity-100" : "opacity-45 transition-opacity hover:opacity-80"}
                aria-pressed={unit === u}
              >
                °{u.toUpperCase()}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Search */}
      <form
        onSubmit={onSearch}
        className="reveal field-sky mx-7 mt-5 flex items-center gap-3 rounded-full px-5 py-3"
        style={cssVars(80)}
      >
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a city"
          className="text-on placeholder:text-on-soft w-full bg-transparent text-[14px] tracking-wide focus:outline-none"
        />
        <button
          type="button"
          onClick={locate}
          aria-label="Use my location"
          className="text-on opacity-70 transition-opacity hover:opacity-100"
        >
          <LocateIcon />
        </button>
      </form>

      {/* Welcome / ask-first */}
      {!data && (
        <section
          className="reveal flex flex-1 flex-col items-center justify-center px-7 pb-24 text-center"
          style={cssVars(200)}
        >
          <span className="text-on">
            <WeatherGlyph icon="02d" size={104} />
          </span>
          <p className="text-on mt-7 max-w-[17rem] text-[16px] leading-relaxed opacity-80">
            {error ?? "See your local sky — allow location, or search any city."}
          </p>
          <button
            onClick={locate}
            disabled={locating}
            className="btn mt-8 rounded-full px-8 py-3.5 text-[11px] uppercase tracking-[0.22em] disabled:opacity-50"
          >
            {locating ? "Locating…" : "Use my location"}
          </button>
        </section>
      )}

      {c && data && (
        <>
          {/* Hero — floats on the sky */}
          <section
            className="reveal flex flex-col items-center px-7 pb-14 pt-12 text-center"
            style={cssVars(160)}
          >
            <p className="text-on-soft text-[12px] uppercase tracking-[0.36em]">
              {data.location.name}
              {data.location.country && <span className="opacity-60">, {data.location.country}</span>}
            </p>
            <p className="text-on-soft mt-2 text-[11px] uppercase tracking-[0.2em] opacity-80">
              {localTime(c.dt, c.timezone, { weekday: "long", hour: "numeric", minute: "2-digit" })}
            </p>

            <div className="text-on my-4">
              <WeatherGlyph icon={c.icon} size={128} />
            </div>

            <div className="text-on flex items-start justify-center">
              <span className="font-display text-[168px] font-normal leading-[0.76] tracking-[-0.025em]">
                {showTemp(c.temp, unit)}
              </span>
              <span className="font-display text-on-soft mt-4 text-4xl font-light">°</span>
            </div>

            <p className="font-display text-on mt-5 text-[24px] italic">
              {cap(c.description)}
            </p>
            <p className="text-on-soft mt-2 text-[12px] uppercase tracking-[0.18em]">
              Feels {showTemp(c.feelsLike, unit)}° &nbsp;·&nbsp; H {showTemp(c.tempMax, unit)}° &nbsp;·&nbsp; L {showTemp(c.tempMin, unit)}°
            </p>
          </section>

          {/* The sheet rises over the sky and holds the detail */}
          <div className="sheet mt-auto flex flex-1 flex-col px-7 pb-10 pt-9">
            {data.hourly.length > 0 && (
              <Section title="By the hour" delay={60}>
                <div className="no-bar -mx-2 flex overflow-x-auto pt-2">
                  {data.hourly.map((h) => (
                    <div key={h.dt} className="flex min-w-[64px] flex-col items-center gap-2.5 px-2">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                        {localTime(h.dt, c.timezone, { hour: "numeric" })}
                      </span>
                      <WeatherGlyph icon={h.icon} size={30} />
                      <span className="font-display text-[19px] text-ink">{showTemp(h.temp, unit)}°</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Conditions" delay={140}>
              <div className="grid grid-cols-2">
                <Cell i={0} label="Feels Like" value={`${showTemp(c.feelsLike, unit)}°`} />
                <Cell i={1} label="Wind" value={`${c.windSpeed}`} note={`km/h ${windDir(c.windDeg)}`} />
                <Cell i={2} label="Humidity" value={`${c.humidity}`} note="%" />
                <Cell i={3} label="Visibility" value={`${c.visibility}`} note="km" />
                <Cell i={4} label="Sunrise" value={localTime(c.sunrise, c.timezone, { hour: "numeric", minute: "2-digit" })} />
                <Cell i={5} label="Sunset" value={localTime(c.sunset, c.timezone, { hour: "numeric", minute: "2-digit" })} />
              </div>
            </Section>

            {data.daily.length > 0 && (
              <Section title="Five days" delay={220}>
                {data.daily.map((d, i) => {
                  const lo = showTemp(d.min, unit);
                  const hi = showTemp(d.max, unit);
                  const left = ((d.min - weekMin) / span) * 100;
                  const width = ((d.max - d.min) / span) * 100;
                  return (
                    <div
                      key={d.dt}
                      className="flex items-center gap-4 py-3"
                      style={i > 0 ? { borderTop: "1px solid var(--color-line)" } : undefined}
                    >
                      <span className="w-10 text-[12px] uppercase tracking-[0.1em] text-ink">
                        {i === 0 ? "Now" : localTime(d.dt, c.timezone, { weekday: "short" })}
                      </span>
                      <WeatherGlyph icon={d.icon} size={26} />
                      <span className="ml-auto w-7 text-right font-display text-[15px] text-ink-soft tabular-nums">{lo}°</span>
                      <span className="relative h-px w-24 bg-[var(--color-line)]">
                        <span
                          className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-[var(--accent)]"
                          style={{ left: `${left}%`, width: `${Math.max(width, 6)}%` }}
                        />
                      </span>
                      <span className="w-7 font-display text-[15px] text-ink tabular-nums">{hi}°</span>
                    </div>
                  );
                })}
              </Section>
            )}

            {error && (
              <p className="mt-6 text-center text-[12px] text-[var(--accent)]">{error}</p>
            )}

            <footer className="mt-auto pt-10 text-center text-[10px] uppercase tracking-[0.22em] text-ink-soft/70">
              {pending ? "Updating" : `${appName} · OpenWeatherMap`}
            </footer>
          </div>
        </>
      )}

      {!data && (
        <footer
          className="reveal text-on-soft px-7 pb-8 text-center text-[10px] uppercase tracking-[0.22em]"
          style={cssVars(320)}
        >
          {appName} · OpenWeatherMap
        </footer>
      )}
    </main>
  );
}

/* ── presentational bits ────────────────────────────────────────────────── */

function Section({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <section className="reveal mt-9 first:mt-0" style={cssVars(delay)}>
      <div className="mb-1 flex items-center gap-4">
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">{title}</h2>
        <div className="rule flex-1" />
      </div>
      {children}
    </section>
  );
}

function Cell({
  i,
  label,
  value,
  note,
}: {
  i: number;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div
      className="py-4"
      style={{
        borderTop: i > 1 ? "1px solid var(--color-line)" : undefined,
        borderLeft: i % 2 === 1 ? "1px solid var(--color-line)" : undefined,
        paddingLeft: i % 2 === 1 ? "1.25rem" : undefined,
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-soft">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="font-display text-[26px] text-ink">{value}</span>
        {note && <span className="text-[12px] text-ink-soft">{note}</span>}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-on shrink-0 opacity-70">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LocateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
      <line x1="12" y1="2" x2="12" y2="4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="19.5" x2="12" y2="22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="2" y1="12" x2="4.5" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="19.5" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
