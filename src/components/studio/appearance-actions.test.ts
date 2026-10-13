import { describe, expect, it } from "vitest";
import type { DashboardConfig, MonitorProfile, Placement } from "@/lib/layout";
import { mainPage, profileWithPage } from "@/lib/pages";
import { BUILTIN_APPEARANCE_PRESETS, presetTokens } from "@/lib/appearance-presets";
import {
  activePresetId,
  appliedMessage,
  enforceKey,
  followAll,
  styleKey,
  toggleEnforce,
  withScopeStyle,
  withStyleEnforce,
  withStyleMode,
} from "./appearance-actions";

const zone = (id: string, extra: Partial<Placement> = {}): Placement => ({
  id,
  module: "systemmodern",
  colStart: 1,
  rowStart: 1,
  colSpan: 1,
  rowSpan: 1,
  visible: true,
  ...extra,
});

const profile = (id: string, extra: Partial<MonitorProfile> = {}): MonitorProfile => ({
  id,
  name: id,
  width: 1920,
  height: 1080,
  cols: 12,
  rows: 6,
  fit: "scroll",
  pages: [mainPage([zone("a"), zone("b", { styleMode: "custom", settings: { accent: "#ff0000" } })])],
  ...extra,
});

const config = (extra: Partial<DashboardConfig> = {}): DashboardConfig =>
  ({ version: 3, activeProfile: "auto", profiles: [profile("p1"), profile("p2")], theme: {}, radius: 0.5, ...extra }) as DashboardConfig;

const ALL = { kind: "all" } as const;
const P1 = { kind: "profile", profileId: "p1" } as const;

describe("scope keys", () => {
  it("coalesce per scope", () => {
    expect(styleKey(ALL)).toBe("appearance-style:all");
    expect(styleKey(P1)).toBe("appearance-style:p1");
    expect(enforceKey(ALL)).toBe("style-enforce:all");
    expect(enforceKey(P1)).toBe("style-enforce:p1");
  });
});

describe("withScopeStyle", () => {
  it("edits the dashboard style and stores an empty one as none", () => {
    const set = withScopeStyle(config(), ALL, (s) => ({ ...s, accent: "#00ff00" }));
    expect(set.style).toEqual({ accent: "#00ff00" });
    expect(set.profiles[0].style).toBeUndefined();
    expect(withScopeStyle(set, ALL, () => ({})).style).toBeUndefined();
  });

  it("edits one profile's style only", () => {
    const set = withScopeStyle(config(), P1, (s) => ({ ...s, radius: "8" }));
    expect(set.style).toBeUndefined();
    expect(set.profiles.map((p) => p.style)).toEqual([{ radius: "8" }, undefined]);
  });
});

describe("withStyleEnforce / toggleEnforce", () => {
  it("sets the dashboard switch (off = unset) and a profile's (unset = the dashboard's)", () => {
    expect(withStyleEnforce(config(), ALL, true).styleEnforce).toBe(true);
    expect(withStyleEnforce(config({ styleEnforce: true }), ALL, false).styleEnforce).toBeUndefined();
    const off = withStyleEnforce(config(), P1, false);
    expect(off.profiles[0].styleEnforce).toBe(false);
    expect(withStyleEnforce(off, P1, undefined).profiles[0].styleEnforce).toBeUndefined();
  });

  it("toggles the profile's switch when it has one, else the dashboard's", () => {
    const c = config();
    expect(toggleEnforce(c, c.profiles[0]).styleEnforce).toBe(true);
    const own = withStyleEnforce(c, P1, true);
    const toggled = toggleEnforce(own, own.profiles[0]);
    expect(toggled.profiles[0].styleEnforce).toBe(false);
    expect(toggled.styleEnforce).toBeUndefined();
  });
});

describe("withStyleMode / followAll", () => {
  it("sets the mode and keeps the own look stored", () => {
    const z = withStyleMode(zone("b", { settings: { accent: "#ff0000" } }), "follow");
    expect(z).toMatchObject({ styleMode: "follow", settings: { accent: "#ff0000" } });
  });

  it("makes every widget of a profile follow, and is a no-op when they all do", () => {
    const p = followAll(profileWithPage(profile("p1")));
    expect(p.placements.map((z) => z.styleMode)).toEqual(["follow", "follow"]);
    expect(p.placements[1].settings).toEqual({ accent: "#ff0000" });
    expect(followAll(p)).toBe(p);
  });
});

describe("appliedMessage", () => {
  it("names the scope", () => {
    expect(appliedMessage("Glass", "all")).toBe("Applied Glass to all profiles");
    expect(appliedMessage("Glass", "profile")).toBe("Applied Glass to this profile");
  });
});

describe("activePresetId", () => {
  const glass = BUILTIN_APPEARANCE_PRESETS.find((p) => p.id === "builtin:glass")!;
  const dark = BUILTIN_APPEARANCE_PRESETS.find((p) => p.id === "builtin:dark")!;

  it("finds the preset whose theme, radius and style the look has", () => {
    const look = { tokens: presetTokens(glass), radius: glass.radius, style: { ...glass.style, accent: "#fff" } };
    expect(activePresetId(BUILTIN_APPEARANCE_PRESETS, look)).toBe("builtin:glass");
    expect(activePresetId(BUILTIN_APPEARANCE_PRESETS, { ...look, style: dark.style, radius: dark.radius })).toBe(
      "builtin:dark"
    );
  });

  it("is undefined for a look matching none", () => {
    expect(
      activePresetId(BUILTIN_APPEARANCE_PRESETS, { tokens: presetTokens(dark), radius: 0.1, style: dark.style })
    ).toBeUndefined();
  });
});
