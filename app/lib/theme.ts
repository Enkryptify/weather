// Translates conditions + local sun position into an atmospheric sky palette:
// three gradient stops, an accent, adaptive text colors, and a glow orb.
// The sky shifts through dawn → day → dusk → night and desaturates in poor
// weather, so the screen feels like the actual sky outside.

export interface Sky {
  "--g1": string;
  "--g2": string;
  "--g3": string;
  "--accent": string;
  "--on": string;
  "--on-soft": string;
  "--orb": string;
}

type Phase = "dawn" | "day" | "dusk" | "night";
type Family = "clear" | "clouds" | "rain" | "snow";

const INK = "#211f1a";
const CREAM = "#f3ede1";
const soft = (hex: string, a: number) => {
  // hex → rgba with the given alpha
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const PALETTE: Record<Family, Record<Phase, Sky>> = {
  clear: {
    dawn: mk("#aebde6", "#e6bda6", "#f1cf9e", "#c06f3e", INK, "#ffcf9e", 0.5),
    day: mk("#8cc2ee", "#aed8ef", "#cbe5ee", "#bb7f2e", INK, "#fff0c4", 0.55),
    dusk: mk("#7c84b4", "#cf8f7f", "#e6a96f", "#a85138", INK, "#ffba84", 0.5),
    night: mk("#283157", "#3a4068", "#534f72", "#d6ad79", CREAM, "#aebbe8", 0.55),
  },
  clouds: {
    dawn: mk("#bcc2d0", "#d4cbc6", "#e2d2c0", "#9c7a4e", INK, "#f4dcc0", 0.42),
    day: mk("#a7b7c9", "#c6d2dc", "#d8dedf", "#7c8694", INK, "#f4f6f8", 0.4),
    dusk: mk("#878aa0", "#ab9ea4", "#c5b1a8", "#8a6d76", INK, "#dcc6c4", 0.45),
    night: mk("#2f3346", "#41475c", "#52525f", "#b3adba", CREAM, "#9aa4c2", 0.5),
  },
  rain: {
    dawn: mk("#9aa3b2", "#b2b6bd", "#c3c1c2", "#5a6f84", INK, "#d6dde2", 0.4),
    day: mk("#849aab", "#a6b6c2", "#bdc9d1", "#4f6884", INK, "#e2edf2", 0.38),
    dusk: mk("#6b7188", "#8b8896", "#a89ea4", "#4e5e80", INK, "#c8c4d2", 0.45),
    night: mk("#262b3b", "#363b4c", "#454857", "#93a6c2", CREAM, "#8298c0", 0.5),
  },
  snow: {
    dawn: mk("#cdd6e4", "#e2e1e6", "#ece7e6", "#7f96ae", INK, "#ffffff", 0.45),
    day: mk("#bcd2e8", "#d8e6f0", "#e9f0f4", "#7f97ae", INK, "#ffffff", 0.55),
    dusk: mk("#aeb4c8", "#c5bcc6", "#d4c9cc", "#7e89a6", INK, "#e8e2ec", 0.45),
    night: mk("#363c50", "#474d61", "#545766", "#a6b8d0", CREAM, "#a0b2cc", 0.5),
  },
};

function mk(
  g1: string,
  g2: string,
  g3: string,
  accent: string,
  on: string,
  orbHex: string,
  orbA: number,
): Sky {
  return {
    "--g1": g1,
    "--g2": g2,
    "--g3": g3,
    "--accent": accent,
    "--on": on,
    "--on-soft": soft(on, 0.6),
    "--orb": soft(orbHex, orbA),
  };
}

function family(condition: string): Family {
  switch (condition) {
    case "Clear":
      return "clear";
    case "Rain":
    case "Drizzle":
    case "Thunderstorm":
      return "rain";
    case "Snow":
      return "snow";
    default:
      return "clouds"; // Clouds, Mist, Fog, Haze, …
  }
}

function phase(dt: number, sunrise: number, sunset: number): Phase {
  if (!sunrise || !sunset) return "day";
  const H = 3600;
  if (dt >= sunrise - H && dt <= sunrise + H * 1.5) return "dawn";
  if (dt >= sunset - H * 1.5 && dt <= sunset + H) return "dusk";
  return dt > sunrise && dt < sunset ? "day" : "night";
}

export function skyTheme(
  condition: string,
  _isDay: boolean,
  dt: number,
  sunrise: number,
  sunset: number,
): Sky {
  return PALETTE[family(condition)][phase(dt, sunrise, sunset)];
}
