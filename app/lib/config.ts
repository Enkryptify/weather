import { connection } from "next/server";

/**
 * Reads the configurable application name at *runtime* (not build time).
 *
 * `connection()` opts the caller into dynamic rendering, which means
 * `process.env.APP_NAME` is evaluated when the request is served rather than
 * baked into the bundle. That lets you change `APP_NAME` on a redeploy without
 * rebuilding the app.
 */
export async function getAppName(): Promise<string> {
  await connection();
  return process.env.APP_NAME?.trim() || "Aurora";
}

export function getApiKey(): string {
  const key = process.env.OPENWEATHERMAP_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing OPENWEATHERMAP_API_KEY. Add it to your .env.local file.",
    );
  }
  return key;
}
