// The inspector's Preset row reads the same presets Add does: which one a zone is on (or Custom), what applying one writes,
// and what Save as preset keeps.
import { describe, expect, it } from "vitest";
import { matchingPreset, presetChange, presetFromZone } from "@/components/studio/editor/preset-model";
import { builtinPresets, loadWidgetPresets, userPreset } from "@/components/studio/widget-presets";
import { ALL_MODULES } from "@/components/studio/studio-modules";
import { modules } from "@/modules";
import type { DashboardModule } from "@/modules/types";

const map = await loadWidgetPresets();
const weather = modules.find((m) => m.id === "Weather") as DashboardModule;
const meta = ALL_MODULES.find((m) => m.id === "Weather")!;
const builtin = builtinPresets(meta, map);
const clock = modules.find((m) => m.id === "Clock") as DashboardModule;

describe("the preset a zone is on", () => {
  it("is the built-in one whose view and settings the zone holds, the default for a fresh zone", () => {
    expect(matchingPreset(weather, builtin, undefined)?.id).toBe("full");
    expect(matchingPreset(weather, builtin, { view: "minimal", showForecast: false, showStats: false, showFeels: false })?.id).toBe("minimal");
    expect(matchingPreset(weather, builtin, { view: "glance", showForecast: false, showStats: false, showFeels: false })?.id).toBe("glance");
  });

  it("is none (Custom) once a toggle moved off the preset's bundle", () => {
    expect(matchingPreset(weather, builtin, { view: "minimal", showForecast: true, showStats: false, showFeels: false })).toBeUndefined();
  });

  it("prefers a saved preset that holds more than the built-in one it adds to, and the built-in one on a tie", () => {
    const zone = { view: "minimal", showForecast: false, showStats: false, showFeels: false, units: "imperial" };
    const mine = userPreset({ id: "my-1", widget: "Weather", name: "Mine", view: "minimal", settings: { ...zone, view: undefined } as never, size: [2, 1], created: "" });
    const withUnits = { ...mine, settings: { showForecast: false, showStats: false, showFeels: false, units: "imperial" } };
    expect(matchingPreset(weather, [...builtin, withUnits], zone)?.id).toBe("my-1");
    const copy = { ...withUnits, settings: { showForecast: false, showStats: false, showFeels: false } };
    expect(matchingPreset(weather, [...builtin, copy], zone)?.id).toBe("minimal");
  });

  it("is the one implicit default for a widget without views, whatever its settings", () => {
    const list = builtinPresets(ALL_MODULES.find((m) => m.id === "Clock")!, {});
    expect(matchingPreset(clock, list, { hour12: true })?.default).toBe(true);
  });
});

describe("applying a preset", () => {
  it("writes the view and the preset's settings, as Add does, and clears what only another preset set", () => {
    const now = builtin.find((p) => p.id === "now")!;
    expect(presetChange(weather, builtin, now, undefined)).toEqual({ patch: { view: "now", showForecast: false, showStats: true, showFeels: true }, clear: [] });
    const full = builtin.find((p) => p.id === "full")!;
    const zone = { view: "minimal", showForecast: false, showStats: false, showFeels: false };
    const { patch, clear } = presetChange(weather, builtin, full, zone);
    expect(patch).toEqual({ view: "full", showForecast: true, showStats: true, showFeels: true });
    expect(clear).toEqual([]);
  });

  it("never carries a size: that is the row's own switch", () => {
    for (const p of builtin) expect(presetChange(weather, builtin, p, undefined).patch).not.toHaveProperty("size");
  });
});

describe("Save as preset", () => {
  it("keeps the zone's view, its other settings and its size", () => {
    const saved = presetFromZone(weather, { view: "minimal", showStats: false, units: "imperial" }, [3, 2], "my-1", "Tiny", "2026-01-15T12:00:00.000Z");
    expect(saved).toEqual({ id: "my-1", widget: "Weather", name: "Tiny", view: "minimal", settings: { showStats: false, units: "imperial" }, size: [3, 2], created: "2026-01-15T12:00:00.000Z" });
  });

  it("takes the default view for a zone that never stored one, and no view for a widget without views", () => {
    expect(presetFromZone(weather, {}, [3, 2], "a", "A", "").view).toBe("full");
    expect(presetFromZone(clock, { hour12: true }, [2, 1], "b", "B", "")).not.toHaveProperty("view");
  });
});
