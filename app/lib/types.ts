// Normalized weather shapes shared between the API route and the client UI.
// All temperatures are in Celsius and wind is in km/h; the client converts for
// display when the user toggles units.

export interface CurrentWeather {
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  windSpeed: number; // km/h
  windDeg: number;
  visibility: number; // km
  condition: string; // e.g. "Clear", "Rain"
  description: string; // e.g. "scattered clouds"
  icon: string; // OWM icon code, e.g. "01d"
  isDay: boolean;
  dt: number; // unix seconds (utc)
  sunrise: number;
  sunset: number;
  timezone: number; // shift in seconds from UTC
}

export interface HourlyPoint {
  dt: number;
  temp: number;
  icon: string;
  condition: string;
  pop: number; // probability of precipitation 0..1
}

export interface DailyPoint {
  dt: number;
  min: number;
  max: number;
  icon: string;
  condition: string;
}

export interface WeatherPayload {
  location: { name: string; country: string };
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
}

export interface WeatherError {
  error: string;
}
