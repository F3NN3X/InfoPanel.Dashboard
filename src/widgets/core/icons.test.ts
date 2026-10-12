import { describe, expect, it } from "vitest";
import { WIDGET_ICONS } from "@/lib/widget-icons";
import { FALLBACK_ICON, MATERIAL_ICONS, iconFor } from "./icons";
import { weatherIcon } from "./primitives";

const TEMPLATE_NAMES =
  "account_circle album bolt calendar_month calendar_today dashboard developer_board device_thermostat donut_large equalizer graphic_eq grid_on group hard_drive health_and_safety health_metrics image lan library_books list_alt location_on lock_open memory memory_alt mic mic_off mode_fan monitor_heart more_horiz music_note newspaper partly_cloudy_day person public query_stats schedule sensors south speed sports_esports stacked_bar_chart stadia_controller swap_horiz swap_vert timeline timer trophy tune videogame_asset view_list view_week vital_signs".split(
    " "
  );

const WEATHER_TEXTS = ["Thunderstorm", "light snow", "sleet", "rain showers", "drizzle", "fog", "mist", "partly cloudy", "fair_night", "cloudy", "clear sky", "clearsky_night", "sunny", ""];

describe("icon map", () => {
  it("covers every name the templates use", () => {
    for (const name of TEMPLATE_NAMES) expect(MATERIAL_ICONS[name], name).toBeDefined();
  });

  it("covers every weatherIcon() output", () => {
    const outputs = new Set(WEATHER_TEXTS.map(weatherIcon));
    expect(outputs.size).toBe(9);
    for (const name of outputs) expect(MATERIAL_ICONS[name], name).toBeDefined();
  });

  it("accepts the legacy widget-icon names", () => {
    expect(Object.keys(WIDGET_ICONS)).toHaveLength(18);
    for (const [name, icon] of Object.entries(WIDGET_ICONS)) expect(iconFor(name)).toBe(icon);
  });

  it("falls back for unknown and empty names", () => {
    expect(iconFor("no_such_icon")).toBe(FALLBACK_ICON);
    expect(iconFor("")).toBe(FALLBACK_ICON);
    expect(iconFor(undefined)).toBe(FALLBACK_ICON);
    expect(iconFor("memory")).not.toBe(FALLBACK_ICON);
  });
});
