import { templateModule } from "@/widgets/module";
import Weather, { meta, type WeatherProps } from "@/widgets/Weather";
import type { ModuleSetting, ModuleSettings } from "./types";

/**
 * Modern weather widget — the adaptive redesign of the classic weather
 * module (MET Norway / yr plugin, including its multi-day forecast).
 *
 * Rendered by the `Weather` template through the widget shell (its Forecast view
 * renders the `Forecast` template).
 */

const P = "plugins.yr-weather-plugin.";

export const WEATHER_SETTINGS: ModuleSetting[] = [
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
    group: "Display",
  },
  { key: "tint", label: "Tint from conditions", type: "boolean", default: true, group: "Display" },
  { key: "showStats", label: "Stats row", type: "boolean", default: true, group: "Current conditions" },
  { key: "showFeels", label: "Feels-like", type: "boolean", default: true, group: "Current conditions" },
  { key: "showForecast", label: "Forecast strip", type: "boolean", default: true, group: "Forecast" },
  {
    key: "forecastDays",
    label: "Forecast days",
    type: "number",
    default: 5,
    min: 1,
    max: 7,
    step: 1,
    group: "Forecast",
  },
];

/** The stored settings as the Weather template's props (`forecastDays` is its `days`). */
export const weatherToProps = (s: ModuleSettings): Partial<WeatherProps> => ({
  view: s.view as WeatherProps["view"],
  tint: Boolean(s.tint),
  showStats: Boolean(s.showStats),
  showFeels: Boolean(s.showFeels),
  showForecast: Boolean(s.showForecast),
  days: Math.max(1, Math.min(7, Math.round(Number(s.forecastDays) || 5))),
});

export const weatherModernModule = templateModule({
  meta,
  Component: Weather,
  settings: WEATHER_SETTINGS,
  toProps: weatherToProps,
  title: "Weather (modern)",
  legacy: { id: "weathermodern", minCols: 3, minRows: 1, prefixes: [P], libraryHidden: true },
});
