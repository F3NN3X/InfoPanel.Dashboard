// Weather's forecast view is the Forecast widget (config v19, _docs/widgets/MERGES.md M1): a Forecast zone, migrated, draws
// what the Forecast widget drew. The Forecast widget's definition before the merge is frozen below (its meta, schema and
// props from registry/b.ts at ca49b21f) and drawn beside the registry's Weather in the forecast view.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { migratePlacementV19 } from "@/lib/settings-migrate.v19";
import { modules } from "@/modules";
import { tempUnitOf } from "@/modules/setting-readers";
import type { ModuleSettings, SensorMap } from "@/modules/types";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { WeatherGlyph } from "@/widgets/core/weather-icon";
import type { WidgetMeta } from "@/widgets/core/types";
import { templateModule } from "@/widgets/module";
import { toFlat } from "@/widgets/shared/data-adapter";
import { formatSetting, numberOf, numberSetting, pass } from "@/widgets/shared/settings-kit";
import Forecast, { type ForecastProps } from "@/widgets/weather/Forecast";

const FORECAST_META: WidgetMeta = {
  id: "Forecast",
  name: "Forecast",
  category: "Info",
  icon: "calendar_month",
  prefixes: [],
  defaultSize: [4, 1],
  minSize: [1, 1],
  blurb: "Multi-day forecast with highs and lows",
  tags: "weather",
  description: "Multi-day MET/Yr forecast — horizontal when wide, a vertical list when tall, with hi/lo range bars.",
};
const FORECAST = templateModule({
  meta: FORECAST_META,
  Component: Forecast,
  settings: [
    numberSetting("days", "Days", 0, { min: 0, max: 7, step: 1, group: "Days", hint: "0 = as many as fit" }),
    { key: "location", label: "Location", type: "select", default: "", optionsFrom: "sources", sourcePlugin: "plugins.yr-weather-plugin.", group: "Location", tab: "data", hint: "Blank = the first Yr location" },
    formatSetting("tempUnit"),
  ],
  toProps: (s): Partial<ForecastProps> => ({ ...pass<Partial<ForecastProps>>("location")(s), units: tempUnitOf(s) === "f" ? "F" : "C", days: numberOf(s.days) || undefined }),
});
const WEATHER = modules.find((m) => m.id === "Weather")!;

const html = (node: unknown) => (node === null ? null : renderToStaticMarkup(node as never));
/** A Forecast zone's settings drawn by the Forecast widget, and the same zone migrated (v19) drawn by the registry. */
function both(settings: ModuleSettings, sensors: SensorMap) {
  const migrated = migratePlacementV19({ module: "Forecast", settings });
  expect(migrated.module).toBe("Weather");
  return { before: html(FORECAST.render(sensors, settings)), after: html(WEATHER.render(sensors, migrated.settings)) };
}

const ALL = fixtureSensors();
/** Other sensors, but no weather plugin: the Forecast widget drew its empty card. */
const NO_WEATHER = Object.fromEntries(Object.entries(ALL).filter(([k]) => !k.startsWith("plugins.yr-weather-plugin.") && !k.startsWith("plugins.weather-plugin.")));

describe("Weather's forecast view draws a migrated Forecast zone as the Forecast widget did", () => {
  it.each([
    ["the default (as many as fit)", {}],
    ["its own days and unit", { days: 3, tempUnit: "f" }],
    ["days 0", { days: 0 }],
    ["a location", { location: "brevik-norway" }],
    ["the dense small-zone view", { compact: "dense" }],
    ["the summary card", { compact: "card" }],
    ["a title and accent", { label: "Week", accent: "#ff0000" }],
  ])("%s", (_name, settings) => {
    for (const sensors of [ALL, NO_WEATHER]) {
      const { before, after } = both(settings as ModuleSettings, sensors);
      expect(before).not.toBeNull();
      expect(after).toEqual(before);
    }
  });

  it("draws nothing with no sensors at all, as before", () => {
    expect(both({}, {})).toEqual({ before: null, after: null });
  });

  it("offers the Forecast widget's dense small-zone view in the inspector's data (byView), where Weather's other views keep the card", () => {
    expect(WEATHER.byView?.forecast?.compact).toEqual({ card: true, dense: true });
    expect(WEATHER.compact).toEqual({ card: true, dense: "fallback" });
  });

  it("reaches the Forecast spec's props through Weather's own settings: location, days (forecastDays) and units (tempUnit)", () => {
    const keys = (WEATHER.settings ?? []).map((d) => d.key);
    for (const key of ["location", "forecastDays", "tempUnit"]) expect(keys.filter((k) => k === key), key).toHaveLength(1);
    expect(WEATHER.settings?.find((d) => d.key === "forecastDays")).toMatchObject({ default: 5, min: 0, max: 7 });
  });
});

describe("Weather's own views keep their days", () => {
  it("an existing Weather zone in any view still shows 5 days unless it stores another count", () => {
    const html5 = html(WEATHER.render(ALL, { view: "full" }));
    expect(html(WEATHER.render(ALL, { view: "full", forecastDays: 5 }))).toEqual(html5);
    // 0 is the Forecast view's Auto only: elsewhere it is the old default, 5
    expect(html(WEATHER.render(ALL, { view: "full", forecastDays: 0 }))).toEqual(html5);
    expect(html(WEATHER.render(ALL, { view: "forecast", forecastDays: 5 }))).not.toEqual(html(WEATHER.render(ALL, { view: "forecast", forecastDays: 0 })));
  });
});

describe("the icon set Weather's rows default to (MERGES.md M1, unverified there)", () => {
  it("draws as the Forecast widget's unset icons: app, line, not animated", () => {
    for (const kind of ["clear", "rain", "snow", "thunder", "fog", "cloudy"] as const) {
      const unset = renderToStaticMarkup(createElement(WeatherGlyph, { kind, night: false, className: "x" }));
      expect(renderToStaticMarkup(createElement(WeatherGlyph, { kind, night: false, className: "x", set: "app", style: "line", animated: false })), kind).toEqual(unset);
    }
  });
});

describe("the Forecast component (the Forecast widget's render check, kept for the view)", () => {
  it("renders a live value, the extremes and the empty state without throwing", () => {
    const flat = toFlat(ALL);
    const draw = (data: object, size: string, variant: string, skin: string) => renderToStaticMarkup(createElement(Forecast as never, { data, size, variant, skin }));
    expect(draw(flat, "md", "default", "default")).toMatch(/\d/);
    expect(draw(flat, "xs", "studio", "tui").length).toBeGreaterThan(0);
    expect(draw({}, "md", "default", "default").length).toBeGreaterThan(0);
  });
});
