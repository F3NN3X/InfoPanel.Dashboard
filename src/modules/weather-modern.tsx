import { ModernWeather, type WeatherForecastDay } from "@/components/ModernWeather";
import { findEntry, liveText } from "@/lib/sensors";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
  type ModuleSettings,
} from "./types";

/**
 * Modern weather widget — the adaptive redesign of the classic weather
 * module (MET Norway / yr plugin + the DataBridge open-meteo forecast).
 *
 * One component (`ModernWeather`) picks card / standard / compact / simple
 * from the zone's measured size and tints the surface from the current
 * condition. The classic `weather` module stays untouched.
 */

const P = "plugins.yr-weather-plugin.";
/** The DataBridge's own open-meteo collector (multi-day forecast lines). */
const BRIDGE = "plugins.InfoPanel.DataBridge.weather.";

const WEATHER_MODERN_SETTINGS: ModuleSetting[] = [
  {
    key: "layout",
    label: "Layout",
    type: "select",
    default: "auto",
    options: [
      { value: "auto", label: "Auto (fit to zone)" },
      { value: "card", label: "Card" },
      { value: "standard", label: "Standard" },
      { value: "compact", label: "Compact bar" },
      { value: "simple", label: "Simple" },
    ],
  },
  {
    key: "surface",
    label: "Surface",
    type: "select",
    default: "glass",
    options: [
      { value: "glass", label: "Glass" },
      { value: "matte-light", label: "Matte (light)" },
      { value: "matte-dark", label: "Matte (dark)" },
    ],
  },
  { key: "tint", label: "Tint from conditions", type: "boolean", default: true },
  { key: "showStats", label: "Stats row", type: "boolean", default: true },
  { key: "showForecast", label: "Forecast strip", type: "boolean", default: true },
  {
    key: "forecastDays",
    label: "Forecast days",
    type: "number",
    default: 5,
    min: 1,
    max: 7,
    step: 1,
  },
];

function modernProps(mod: DashboardModule, s?: ModuleSettings) {
  const cfg = effectiveSettings(mod, s);
  return {
    layout: String(cfg.layout) as "auto" | "card" | "standard" | "compact" | "simple",
    surfaceStyle: String(cfg.surface) as "glass" | "matte-light" | "matte-dark",
    tint: Boolean(cfg.tint),
    showStats: Boolean(cfg.showStats),
    showForecast: Boolean(cfg.showForecast),
    forecastDays: Math.max(1, Math.min(7, Math.round(Number(cfg.forecastDays) || 5))),
  };
}

/** "Thu 8 Oct, Light rain, 12 °C / 4 °C, 8.1mm, 4.5 m/s N" → day object. */
function parseForecastLine(line: string): WeatherForecastDay {
  const parts = line.split(", ");
  const day: WeatherForecastDay = { date: parts[0] ?? line };
  if (parts[1]) day.desc = parts[1];
  const n = (s?: string) => {
    const m = s?.match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : undefined;
  };
  const temps = parts[2]?.split(/\s*\/\s*/);
  if (temps && temps.length >= 2) {
    day.high = n(temps[0]);
    day.low = n(temps[1]);
  }
  day.precip = n(parts[3]);
  if (parts[4]) day.wind = parts[4];
  return day;
}

export const weatherModernModule: DashboardModule = {
  id: "weathermodern",
  title: "Weather (modern)",
  minCols: 3,
  minRows: 1,
  matches: (key) => key.startsWith(P) || key.startsWith(BRIDGE),
  settings: WEATHER_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = modernProps(weatherModernModule, s);
    const find = (id: string) => findEntry(sensors, P, id)?.sensor;
    const text = (id: string) => liveText(find(id));
    const num = (id: string) => find(id)?.value;

    const location = text("name");
    const temp = num("temp");
    const feels = num("feels_like");
    const desc = text("weather_desc") ?? text("weather");
    const humidity = num("humidity");
    const pressure = num("pressure");
    const windSpeed = num("wind_speed");
    const windGust = num("wind_gust");
    const windDeg = num("wind_deg");
    const rain = num("rain");
    const snow = num("snow");
    const refreshed = text("last_refreshed");
    const icon = text("weather_icon");

    // Prefer the DataBridge's open-meteo multi-day table.
    const forecastRaw =
      sensors[BRIDGE + "forecast"]?.text?.trim() || text("forecast") || "";
    const forecast = forecastRaw
      .split("\n")
      .filter((l) => l.trim() !== "")
      .slice(0, cfg.forecastDays)
      .map(parseForecastLine);

    if (temp === undefined && !desc) return null;

    const compass =
      windDeg !== undefined
        ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
            Math.round(((windDeg % 360) + 360) / 45) % 8
          ]
        : undefined;

    return (
      <ModernWeather
        location={location}
        temp={temp}
        feelsLike={feels}
        desc={desc}
        humidity={humidity}
        pressure={pressure}
        windSpeed={windSpeed}
        windGust={windGust}
        windDir={compass}
        rain={rain}
        snow={snow}
        refreshed={refreshed}
        icon={icon}
        forecast={forecast}
        {...cfg}
      />
    );
  },
};
