import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { enumValues, settingRow } from "@/widgets/__fixtures__/legacy-parity";
import legacy from "@/widgets/__fixtures__/legacy-settings.json";
import { overlay, pickVariant } from "@/widgets/GameSpotlightComposite";
import { compositeProps } from "@/widgets/spotlight-settings";
import { steamModernModule } from "./steam-modern";
import type { ModuleSettings, SensorMap } from "./types";

const html = (sensors: SensorMap, saved?: ModuleSettings) => renderToString(steamModernModule.render(sensors, saved) as never);
const LAYOUT_FOR_TIER = { xs: "simple", sm: "compact", md: "standard", lg: "card" } as const;
const SESSION = "plugins.InfoPanel.SteamAPI.SteamAPI-Session.current-game";

describe("steammodern (alias of GameSpotlight composite)", () => {
  it("keeps its id, size, prefixes and every setting key and default", () => {
    expect(steamModernModule).toMatchObject({ id: "steammodern", title: "Steam (modern)", minCols: 2, minRows: 1, libraryHidden: true });
    expect(steamModernModule.prefixes).toEqual(legacy.steamKeys);
    expect((steamModernModule.settings ?? []).map(settingRow)).toEqual(legacy.steam);
  });

  it("is idle when no game is running", () => {
    const idle = steamModernModule.isIdle!;
    expect(idle({}, {})).toBe(true);
    expect(idle({ [SESSION]: { text: "ARC Raiders", unit: "" } }, {})).toBe(false);
    expect(idle(fixtureSensors(), {})).toBe(false);
  });

  it("hides the section without profile, game or library", () => {
    expect(steamModernModule.render({}, {})).toBeNull();
  });

  it.each(Object.entries(LAYOUT_FOR_TIER))("renders everything the old card showed at %s (layout %s)", (_tier, layout) => {
    for (const variant of ["default", "studio"]) expect(html(fixtureSensors(), { layout, variant })).toMatch(/\d/);
  });

  it("shows profile, level, playtime, session, library, achievements, friends and news in the card layout", () => {
    const out = html(fixtureSensors(), { layout: "card" });
    for (const text of ["Player One", "ARC Raiders", "Level 29", "263h", "78%", "Today You, Tomorrow Me"]) expect(out).toContain(text);
  });

  it("falls back to friends, then library total, when there is no latest unlock (card)", () => {
    const sensors = { ...fixtureSensors(), "plugins.InfoPanel.SteamAPI.SteamAPI-Achievements.latest-achievement": { text: "", unit: "" } };
    expect(html(sensors, { layout: "card" })).toContain("8/26 online");
  });

  it("shows library total, friends, achievements and the latest unlock in the standard layout", () => {
    const out = html(fixtureSensors(), { layout: "standard" });
    for (const text of ["313 games", "8/26 online", "78%", "latest: Today You, Tomorrow Me", "session 00:07", "263h"]) expect(out).toContain(text);
  });

  it.each(enumValues(steamModernModule))("renders %s = %s", (key, value) => {
    expect(html(fixtureSensors(), { [key]: value }).length).toBeGreaterThan(0);
  });

  it("showStats and showNews switch their parts off", () => {
    const sensors = fixtureSensors();
    expect(html(sensors, { layout: "card", showStats: true })).toContain("achievements");
    expect(html(sensors, { layout: "card", showStats: false })).not.toContain("achievements");
    expect(html(sensors, { layout: "card", showNews: true })).toContain("Селесты");
    expect(html(sensors, { layout: "card", showNews: false })).not.toContain("Селесты");
  });

  it("dimBanner off removes the scrim over the banner", () => {
    expect(html(fixtureSensors(), { layout: "standard", dimBanner: true })).toContain("rgba(3,6,16");
    expect(html(fixtureSensors(), { layout: "standard", dimBanner: false })).not.toContain("rgba(3,6,16");
  });
});

describe("composite helpers", () => {
  it.each([
    [640, 150, undefined, "standard"],
    [300, 420, undefined, "card"],
    [600, 60, undefined, "compact"],
    [200, 100, undefined, "simple"],
    [640, 150, "card", "card"],
    [640, 150, "auto", "standard"],
    [0, 0, undefined, "standard"],
  ])("picks %ix%i (%s) -> %s", (w, h, forced, variant) => {
    expect(pickVariant(w, h, forced)).toBe(variant);
  });

  it("scales the legacy gradients by the scrim and drops them at 0", () => {
    expect(overlay("simple", 0.6)).toBe("linear-gradient(180deg, rgba(3,6,16,0.50) 0%, rgba(3,6,16,0.88) 100%)");
    expect(overlay("simple", 1.2)).toBe("linear-gradient(180deg, rgba(3,6,16,1.00) 0%, rgba(3,6,16,1.00) 100%)");
    expect(overlay("card", 0)).toBeUndefined();
  });

  it.each([
    [{}, { showStats: undefined, showNews: undefined }],
    [{ showStats: false, showNews: true }, { showStats: false, showNews: true }],
  ])("compositeProps maps %j", (stored, props) => {
    expect(compositeProps(stored as ModuleSettings)).toEqual(props);
  });
});
