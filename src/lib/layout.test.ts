import { describe, expect, it } from "vitest";
import { panelLegacyLook } from "./panel-model";
import {
  ARCV2_PROFILE_ID,
  ARCV2_PROFILE_VERSION,
  PANEL_ID,
  SAMPLE_PROFILE_ID,
  arcv2Profile,
  mergeConfig,
  type MonitorProfile,
  type PanelDef,
} from "./layout";

const legacyPanel: PanelDef = {
  id: "p",
  title: "Net",
  titleVisible: false,
  visible: true,
  background: "panel",
  layout: "wrap",
  widgets: [{ id: "w", kind: "bar", visible: true }],
};

const userProfile = (extra: Partial<MonitorProfile> = {}): MonitorProfile => ({
  id: "mine",
  name: "Mine",
  width: 1920,
  height: 550,
  cols: 12,
  rows: 2,
  fit: "fill",
  placements: [
    { id: "a", module: PANEL_ID, colStart: 1, rowStart: 1, colSpan: 4, rowSpan: 1, visible: true, panel: legacyPanel },
    { id: "b", module: "systemmodern", colStart: 5, rowStart: 1, colSpan: 4, rowSpan: 1, visible: true },
  ],
  ...extra,
});

describe("mergeConfig", () => {
  it("fills a missing config with the defaults (shipped profiles included)", () => {
    const c = mergeConfig({});
    expect(c.version).toBe(2);
    expect(c.activeProfile).toBe("auto");
    const ids = c.profiles.map((p) => p.id);
    expect(ids).toContain(SAMPLE_PROFILE_ID);
    expect(ids).toContain(ARCV2_PROFILE_ID);
    expect(c.stylePresets).toBeUndefined();
    expect(c.panelPresets).toBeUndefined();
  });

  it("keeps user profiles and re-injects the shipped ones", () => {
    const ids = mergeConfig({ profiles: [userProfile()] }).profiles.map((p) => p.id);
    expect(ids).toEqual(["mine", SAMPLE_PROFILE_ID, ARCV2_PROFILE_ID]);
  });

  it("normalizes panel placements and leaves module placements alone", () => {
    const [mine] = mergeConfig({ profiles: [userProfile()] }).profiles;
    const [panel, module] = mine.placements;
    expect(panel.panel).toMatchObject({ layout: "stack", direction: "row", wrap: true, title: "Net" });
    expect(panel.panel?.widgets[0].box).toEqual({ w: "fill" });
    expect(panel.settings).toEqual({ label: "" });
    expect(panelLegacyLook(panel)).toEqual({ surface: "panel" });
    expect(module.settings).toBeUndefined();
    expect(module.panel).toBeUndefined();
  });

  it("is stable when a loaded config is merged again", () => {
    const once = mergeConfig({ profiles: [userProfile()] });
    expect(mergeConfig(JSON.parse(JSON.stringify(once)))).toEqual(JSON.parse(JSON.stringify(once)));
  });

  it("replaces an outdated shipped profile with the current version", () => {
    const old = { ...arcv2Profile(), sampleVersion: ARCV2_PROFILE_VERSION - 1, placements: [] };
    const arc = mergeConfig({ profiles: [old] }).profiles.find((p) => p.id === ARCV2_PROFILE_ID)!;
    expect(arc.sampleVersion).toBe(ARCV2_PROFILE_VERSION);
    expect(arc.placements.length).toBeGreaterThan(0);
  });

  it("keeps the dashboard style and its force switch, dropping malformed ones", () => {
    const merged = mergeConfig({ profiles: [userProfile()], style: { accent: "#ff0000" }, styleEnforce: true });
    expect(merged.style).toEqual({ accent: "#ff0000" });
    expect(merged.styleEnforce).toBe(true);
    const bad = mergeConfig({ profiles: [userProfile()], style: ["x"], styleEnforce: "yes" } as never);
    expect(bad.style).toBeUndefined();
    expect(bad.styleEnforce).toBeUndefined();
  });

  it("unpins a profile that no longer exists", () => {
    expect(mergeConfig({ activeProfile: "gone", profiles: [userProfile()] }).activeProfile).toBe("auto");
    expect(mergeConfig({ activeProfile: "mine", profiles: [userProfile()] }).activeProfile).toBe("mine");
  });

  it("keeps stored style presets and drops a non-list", () => {
    const preset = { id: "s", name: "S", settings: { radius: "4" } };
    expect(mergeConfig({ stylePresets: [preset] }).stylePresets).toEqual([preset]);
    expect(mergeConfig({ stylePresets: "x" } as never).stylePresets).toBeUndefined();
  });

  it("keeps the user's appearance presets, guarding each field", () => {
    const good = { id: "a", name: " Mine ", description: "d", theme: "paper", radius: 0.75, style: { surface: "theme" } };
    const c = mergeConfig({
      appearancePresets: [
        good,
        { id: "b", name: "Bad bits", theme: { card: "0 0% 50%", bogus: "x" }, radius: 9, style: { surface: "neon", padding: "8", label: "x" }, background: { type: "image", src: "javascript:alert(1)" } },
        { id: "builtin:dark", name: "Fake builtin", theme: "zinc", radius: 0.5, style: {} },
        { id: "c", name: "", theme: "zinc" },
        { id: "d", name: "No theme", theme: "sepia" },
        "x",
      ],
    } as never);
    expect(c.appearancePresets?.map((p) => p.id)).toEqual(["a", "b"]);
    expect(c.appearancePresets?.[0]).toEqual({ ...good, name: "Mine" });
    const bad = c.appearancePresets![1];
    expect(bad.style).toEqual({ padding: "8" });
    expect(bad.radius).toBe(2);
    expect(bad.background).toEqual({ type: "image" });
    expect(typeof bad.theme === "object" && bad.theme.card).toBe("0 0% 50%");
    expect(bad.theme).not.toHaveProperty("bogus");
    expect(mergeConfig({ appearancePresets: "x" } as never).appearancePresets).toBeUndefined();
    expect(mergeConfig({ appearancePresets: [] }).appearancePresets).toBeUndefined();
    expect(mergeConfig(JSON.parse(JSON.stringify(c))).appearancePresets).toEqual(c.appearancePresets);
  });

  it("passes the dashboard and profile backgrounds through, normalized", () => {
    const c = mergeConfig({
      background: { type: "image", src: "/bg.png", dim: 140 },
      profiles: [userProfile({ background: { type: "none" } }), { ...userProfile(), id: "other" }],
    });
    expect(c.background).toEqual({ type: "image", src: "/bg.png", dim: 100 });
    expect(c.profiles.find((p) => p.id === "mine")?.background).toEqual({ type: "none" });
    expect(c.profiles.find((p) => p.id === "other")?.background).toBeUndefined();
    expect(mergeConfig(JSON.parse(JSON.stringify(c)))).toEqual(JSON.parse(JSON.stringify(c)));
  });

  it("drops an unusable background", () => {
    const c = mergeConfig({
      background: { type: "pattern" } as never,
      profiles: [userProfile({ background: "red" as never })],
    });
    expect(c.background).toBeUndefined();
    expect(c.profiles[0].background).toBeUndefined();
  });

  it("guards the general settings", () => {
    expect(mergeConfig({}).general).toBeUndefined();
    const c = mergeConfig({ general: { font: "serif", locale: "de-DE", motion: "warp" } as never });
    expect(c.general).toEqual({ font: "serif", locale: "de-DE" });
  });

  it("guards a profile's gap, padding, theme and radius", () => {
    const [mine] = mergeConfig({
      profiles: [
        userProfile({
          gap: 24.6,
          padding: -5,
          theme: { background: "0 0% 100%", nonsense: 1 } as never,
          radius: 1,
        }),
      ],
    }).profiles;
    expect(mine).toMatchObject({ gap: 25, padding: 0, theme: { background: "0 0% 100%" }, radius: 1 });
    expect(mine.theme).not.toHaveProperty("nonsense");
    const [bad] = mergeConfig({
      profiles: [userProfile({ gap: "wide" as never, theme: "paper" as never, radius: Number.NaN })],
    }).profiles;
    expect(bad.gap).toBeUndefined();
    expect(bad.theme).toBeUndefined();
    expect(bad.radius).toBeUndefined();
  });
});
