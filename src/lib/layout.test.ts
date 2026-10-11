import { describe, expect, it } from "vitest";
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
    expect(panel.settings).toEqual({ label: "", surface: "panel" });
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

  it("unpins a profile that no longer exists", () => {
    expect(mergeConfig({ activeProfile: "gone", profiles: [userProfile()] }).activeProfile).toBe("auto");
    expect(mergeConfig({ activeProfile: "mine", profiles: [userProfile()] }).activeProfile).toBe("mine");
  });

  it("keeps stored style presets and drops a non-list", () => {
    const preset = { id: "s", name: "S", settings: { radius: "4" } };
    expect(mergeConfig({ stylePresets: [preset] }).stylePresets).toEqual([preset]);
    expect(mergeConfig({ stylePresets: "x" } as never).stylePresets).toBeUndefined();
  });
});
