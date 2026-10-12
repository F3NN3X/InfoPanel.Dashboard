import { describe, expect, it } from "vitest";
import { appearanceOf, followsGlobal, isEnforced, resolveStyle, resolveWith } from "./style-resolve";

const dashboard = { accent: "#ff0000", surface: "theme", radius: "8" };
const profile = { accent: "#00ff00", textColor: "#ffffff" };
const own = { accent: "#0000ff", font: "mono", sensor: "libre.cpu", layout: "compact" };
const moduleDefaults = { surface: "bordered", padding: "4", label: "Legacy" };

describe("resolveStyle", () => {
  it("layers default → dashboard → profile → own when the mode is unset", () => {
    const { settings, source } = resolveStyle({ moduleDefaults, dashboard, profile, own });
    expect(settings).toEqual({
      surface: "theme",
      padding: "4",
      accent: "#0000ff",
      radius: "8",
      textColor: "#ffffff",
      font: "mono",
      sensor: "libre.cpu",
      layout: "compact",
    });
    expect(source).toEqual({
      surface: "dashboard",
      padding: "default",
      accent: "own",
      radius: "dashboard",
      textColor: "profile",
      font: "own",
    });
  });

  it("treats custom like the unset mode", () => {
    expect(resolveStyle({ dashboard, profile, own, mode: "custom" })).toEqual(
      resolveStyle({ dashboard, profile, own })
    );
  });

  it("ignores the widget's own look when it follows", () => {
    const { settings, source } = resolveStyle({ dashboard, profile, own, mode: "follow" });
    expect(settings.accent).toBe("#00ff00");
    expect(settings.font).toBeUndefined();
    expect(source.accent).toBe("profile");
    expect(Object.values(source)).not.toContain("own");
  });

  it("ignores every widget's own look while the style is forced", () => {
    for (const mode of [undefined, "custom", "follow"] as const) {
      const { settings, source } = resolveStyle({ dashboard, profile, own, mode, enforce: true });
      expect(settings.accent).toBe("#00ff00");
      expect(settings.font).toBeUndefined();
      expect(source.radius).toBe("dashboard");
    }
  });

  it("always keeps the content keys from the widget, never from a layer", () => {
    for (const enforce of [false, true]) {
      for (const mode of [undefined, "custom", "follow"] as const) {
        const { settings, source } = resolveStyle({ moduleDefaults, dashboard: { ...dashboard, sensor: "x" }, own, mode, enforce });
        expect(settings.sensor).toBe("libre.cpu");
        expect(settings.layout).toBe("compact");
        expect(settings.label).toBeUndefined();
        expect(source.sensor).toBeUndefined();
      }
    }
  });

  it("skips undefined values and empty layers", () => {
    expect(resolveStyle({})).toEqual({ settings: {}, source: {} });
    const { source } = resolveStyle({ dashboard: { accent: undefined as never }, own: { accent: "#123456" } });
    expect(source).toEqual({ accent: "own" });
  });
});

describe("resolveWith", () => {
  it("passes the own settings through without a global style", () => {
    expect(resolveWith(undefined, own, "follow")).toBe(own);
  });

  it("resolves under an appearance and returns undefined when empty", () => {
    const a = { dashboard, profile, enforce: false };
    expect(resolveWith(a, own, "follow")?.accent).toBe("#00ff00");
    expect(resolveWith({ enforce: false }, undefined, undefined)).toBeUndefined();
    expect(resolveWith({ enforce: false }, undefined, undefined, moduleDefaults)).toEqual({
      surface: "bordered",
      padding: "4",
    });
  });
});

describe("appearanceOf / isEnforced / followsGlobal", () => {
  it("takes the profile's force choice over the dashboard's", () => {
    expect(isEnforced({}, undefined)).toBe(false);
    expect(isEnforced({ styleEnforce: true }, {})).toBe(true);
    expect(isEnforced({ styleEnforce: true }, { styleEnforce: false })).toBe(false);
    expect(isEnforced({}, { styleEnforce: true })).toBe(true);
  });

  it("collects both style layers", () => {
    expect(appearanceOf({ style: dashboard, styleEnforce: true }, { style: profile })).toEqual({
      dashboard,
      profile,
      enforce: true,
    });
  });

  it("follows when set to follow or forced", () => {
    expect(followsGlobal(undefined, false)).toBe(false);
    expect(followsGlobal("custom", false)).toBe(false);
    expect(followsGlobal("follow", false)).toBe(true);
    expect(followsGlobal("custom", true)).toBe(true);
  });
});
