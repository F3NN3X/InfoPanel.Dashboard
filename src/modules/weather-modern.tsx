import { ModernWeather } from "@/components/ModernWeather";
import { parseForecast } from "@/lib/forecast";
import { findEntry, liveText } from "@/lib/sensors";
import { chromeOf, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
  type ModuleSettings,
} from "./types";

/**
 * Modern weather widget — the adaptive redesign of the classic weather
 * module (MET Norway / yr plugin, including its multi-day forecast).
 *
 * One component (`ModernWeather`) picks card / standard / compact / simple
 * from the zone's measured size and tints the surface from the current
 * condition.
 */

const P = "plugins.yr-weather-plugin.";

const WEATHER_MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
  { key: "tint", label: "Tint from conditions", type: "boolean", default: true },
  { key: "showStats", label: "Stats row", type: "boolean", default: true },
  { key: "showForecast", label: "Forecast strip", type: "boolean", default: true },
  { key: "showFeels", label: "Feels-like", type: "boolean", default: true },
  {
    key: "forecastDays",
    label: "Forecast days",
    type: "number",
    default: 5,
    min: 1,
    max: 7,
    step: 1,
  },
  {
    key: "view",
    label: "View",
    type: "select",
    default: "full",
    options: [
      { value: "full", label: "Full" },
      {
        value: "now",
        label: "Now",
        applies: { showForecast: false, showStats: true, showFeels: true },
      },
      {
        value: "forecast",
        label: "Forecast",
        applies: { showForecast: true, showStats: false, forecastDays: 7 },
      },
      {
        value: "minimal",
        label: "Minimal",
        applies: { showStats: false, showForecast: false, showFeels: false },
      },
    ],
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
    showFeels: Boolean(cfg.showFeels),
    forecastDays: Math.max(1, Math.min(7, Math.round(Number(cfg.forecastDays) || 5))),
    chrome: chromeOf(cfg),
  };
}

/**
 * The yr plugin's `weather_icon` is an icon *name* (Makin-Things/weather-icons
 * asset id, e.g. "rainy-2"), not a glyph — map it to an emoji. Non-ASCII
 * values (already a glyph) pass through; unknown names fall back to the
 * condition-derived glyph in the component.
 */
const ICON_GLYPH: Record<string, string> = {
  clear: "☀️",
  "clear-night": "🌙",
  "partly-cloudy": "⛅",
  "partly-cloudy-night": "🌥️",
  cloudy: "☁️",
  fog: "🌫️",
  drizzle: "🌦️",
  "rainy-1": "🌦️",
  "rainy-2": "🌧️",
  "rainy-3": "🌧️",
  wintry: "🌨️",
  "wintry-1": "❄️",
  "wintry-2": "❄️",
  thunderstorms: "⛈️",
};

function iconGlyph(raw?: string): string | undefined {
  if (!raw) return undefined;
  // Already a glyph/emoji? Use it as-is.
  if (/[^\u0000-\u007F]/.test(raw)) return raw;
  return ICON_GLYPH[raw];
}

export const weatherModernModule: DashboardModule = {
  id: "weathermodern",
  title: "Weather (modern)",
  minCols: 3,
  minRows: 1,
  prefixes: [P],
  settings: WEATHER_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = modernProps(weatherModernModule, s);
    const find = (id: string) => findEntry(sensors, P, id)?.sensor;
    const text = (id: string) => liveText(find(id));
    // The yr plugin pushes temps as *text* sensors ("6.0 °C") with no numeric
    // value, so fall back to parsing the number out of the text.
    const num = (id: string) => {
      const v = find(id)?.value;
      if (v !== undefined) return v;
      const m = text(id)?.match(/-?\d+(\.\d+)?/);
      return m ? Number(m[0]) : undefined;
    };

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
    const icon = iconGlyph(text("weather_icon"));

    // The yr plugin's multi-day forecast, one line per day (starts tomorrow).
    const forecast = parseForecast(text("forecast"), cfg.forecastDays);

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
