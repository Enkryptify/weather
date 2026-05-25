import { NextResponse } from "next/server";
import { getWeather, WeatherFetchError } from "@/app/lib/weather";

// Keep the OpenWeatherMap key server-side. The client calls this handler;
// the key is never shipped to the browser.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  try {
    const payload =
      lat && lon
        ? await getWeather({ lat: Number(lat), lon: Number(lon) })
        : city
          ? await getWeather({ city })
          : await getWeather({ city: "London" });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof WeatherFetchError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
