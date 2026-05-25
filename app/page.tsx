import { getAppName } from "./lib/config";
import WeatherApp from "./weather-app";

export default async function Home() {
  // No default city — the client greets the user and either auto-locates (when
  // location permission is already granted) or asks before doing anything.
  const appName = await getAppName();
  return <WeatherApp appName={appName} />;
}
