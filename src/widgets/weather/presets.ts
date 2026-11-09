// Weather's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "full", name: "Full", view: "full", settings: { showForecast: true, showStats: true, showFeels: true }, size: [3, 2], default: true },
  { id: "now", name: "Now", view: "now", blurb: "Current conditions with wind and humidity", tags: "current today", settings: { showForecast: false, showStats: true, showFeels: true }, size: [3, 2] },
  { id: "forecast", name: "Forecast", view: "forecast", blurb: "Conditions now and the days ahead", tags: "week days outlook multi-day highs lows", settings: { showForecast: true, showStats: false, showFeels: false }, size: [4, 1] },
  { id: "minimal", name: "Minimal", view: "minimal", blurb: "Temperature and conditions only", tags: "simple small", settings: { showForecast: false, showStats: false, showFeels: false }, size: [3, 2] },
  { id: "glance", name: "Glance", view: "glance", blurb: "Big icon, temperature and place", tags: "icon big", settings: { showForecast: false, showStats: false, showFeels: false }, size: [3, 2] },
  { id: "week", name: "Week", view: "week", blurb: "Today and the next days", tags: "days outlook forecast", settings: { showForecast: true, showStats: false, showFeels: false }, size: [5, 2] },
];

export default presets;
