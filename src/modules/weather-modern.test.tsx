import { describe, expect, it } from "vitest";
import { expectRendersEverywhere, renderModule, settingPairs } from "./port-helpers";
import { weatherModernModule, weatherToProps } from "./weather-modern";

// The settings (key, default) as they were before the module moved onto the widget shell.
const BEFORE: [string, unknown][] = [
  ["preset", "default"],
  ["layout", "auto"],
  ["surface", "glass"],
  ["label", ""],
  ["icon", ""],
  ["accent", ""],
  ["background", ""],
  ["backgroundOn", false],
  ["skin", "auto"],
  ["variant", "default"],
  ["graph", "auto"],
  ["meter", "auto"],
  ["compactView", "auto"],
  ["autoScale", true],
  ["scale", 100],
  ["alignX", "auto"],
  ["padding", "auto"],
  ["gap", "auto"],
  ["radius", "auto"],
  ["textColor", ""],
  ["mutedColor", ""],
  ["font", "auto"],
  ["fontWeight", "auto"],
  ["labelCase", "auto"],
  ["stroke", 100],
  ["customCss", ""],
  ["borderWidth", "auto"],
  ["borderColor", ""],
  ["glow", "none"],
  ["glowColor", ""],
  ["surfaceOpacity", 100],
  ["blur", "auto"],
  ["view", "full"],
  ["tint", true],
  ["showStats", true],
  ["showFeels", true],
  ["showForecast", true],
  ["forecastDays", 5],
];

const STORED = { view: "full", tint: true, showStats: true, showFeels: true, showForecast: true, forecastDays: 5 };

describe("weathermodern", () => {
  it("keeps its id, size, prefixes and every setting key and default", () => {
    expect(weatherModernModule).toMatchObject({ id: "weathermodern", title: "Weather (modern)", minCols: 3, minRows: 1, prefixes: ["plugins.yr-weather-plugin."], libraryHidden: true });
    expect(weatherModernModule.isIdle).toBeUndefined();
    expect(settingPairs(weatherModernModule)).toEqual(BEFORE);
  });

  it.each([
    [{ view: "now" }, { view: "now" }],
    [{ view: "forecast" }, { view: "forecast" }],
    [{ view: "minimal" }, { view: "minimal" }],
    [{ tint: false }, { tint: false }],
    [{ showStats: false }, { showStats: false }],
    [{ showFeels: false }, { showFeels: false }],
    [{ showForecast: false }, { showForecast: false }],
    [{ forecastDays: 3 }, { days: 3 }],
    [{ forecastDays: 99 }, { days: 7 }],
    [{ forecastDays: 0 }, { days: 5 }],
  ])("maps %j to the template props", (stored, props) => {
    expect(weatherToProps({ ...STORED, ...stored })).toMatchObject(props);
  });

  it("renders at every forced size and both variants", () => {
    expectRendersEverywhere(weatherModernModule, /\d/);
  });

  it("renders the non-default values", () => {
    const at = (s: object) => renderModule(weatherModernModule, { layout: "card", ...s });
    expect(at({})).toContain("feels");
    expect(at({ showFeels: false })).not.toContain("feels");
    expect(at({})).toContain("Humidity");
    expect(at({ showStats: false })).not.toContain("Humidity");
    expect(at({})).toContain("Tmrw");
    expect(at({ showForecast: false })).not.toContain("Tmrw");
    // The View options store their bundle of flags with them.
    expect(at({ view: "minimal", showStats: false, showForecast: false, showFeels: false })).not.toMatch(/Humidity|Tmrw|feels/);
    expect(at({ view: "now", showForecast: false })).not.toContain("Tmrw");
    expect(at({ view: "forecast" })).toContain("Tmrw");
    expect(at({ tint: false })).not.toBe(at({}));
    const days = (n: number) => (at({ forecastDays: n }).match(/class="relative h-10 w-1 /g) ?? []).length;
    expect(days(2)).toBe(2);
    expect(days(4)).toBe(4);
  });
});
