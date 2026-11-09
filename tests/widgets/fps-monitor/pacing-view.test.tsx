// FPS Monitor's pacing view is the Frame Pacing widget (config v19, _docs/widgets/MERGES.md M4): a Frame Pacing zone, migrated,
// draws what the Frame Pacing widget drew. That widget's definition before the merge is frozen below (its meta, schema and
// props from registry/d.ts at 08de5de7) and drawn beside the registry's FPS Monitor in the pacing view.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { migratePlacementV19 } from "@/lib/settings-migrate.v19";
import { modules } from "@/modules";
import { settingKeys, type ModuleSettings, type SensorMap } from "@/modules/types";
import { fixtureSensors } from "@/widgets/__fixtures__";
import type { WidgetMeta } from "@/widgets/core/types";
import FramePacing, { type FramePacingProps } from "@/widgets/fps-monitor/FramePacing";
import { templateModule } from "@/widgets/module";
import { listOf, numberOf, numberSetting, splitKeys, textSetting } from "@/widgets/shared/settings-kit";

const PACING_META: WidgetMeta = {
  id: "FramePacing",
  name: "Frame Pacing",
  category: "Gaming",
  icon: "timeline",
  prefixes: [],
  defaultSize: [4, 2],
  minSize: [2, 1],
  blurb: "Frame-time graph with budget lines",
  tags: "stutter fps frametime",
  description: "Frame-time graph with refresh-rate and 60 Hz budget lines — average FPS hides stutter, frame-time spikes show it. Friendly empty state when no game runs.",
};
const hzList = (v: unknown): number[] | undefined => {
  const l = Array.isArray(v) ? listOf(v, numberOf) : splitKeys(v).map(numberOf).filter((n): n is number => n !== undefined);
  return l?.length ? l : undefined;
};
const PACING = templateModule<Pick<FramePacingProps, "budgets" | "window">>({
  meta: PACING_META,
  Component: FramePacing,
  settings: [
    textSetting("budgets", "Budget lines (Hz, comma-separated)", "", { group: "Budget lines", hint: "Empty = refresh rate and 60" }),
    numberSetting("window", "Samples", 120, { min: 30, max: 600, step: 10, group: "History", tab: "behaviour" }),
  ],
  toProps: (s) => ({ budgets: hzList(s.budgets), window: numberOf(s.window) }),
});
const FPS = modules.find((m) => m.id === "FpsMonitor")!;

const html = (node: unknown) => (node === null ? null : renderToStaticMarkup(node as never));
/** A Frame Pacing zone's settings drawn by that widget, and the same zone migrated (v19) drawn by the registry. */
function both(settings: ModuleSettings, sensors: SensorMap) {
  const migrated = migratePlacementV19({ module: "FramePacing", settings });
  expect(migrated.module).toBe("FpsMonitor");
  return { before: html(PACING.render(sensors, settings)), after: html(FPS.render(sensors, migrated.settings)) };
}

const ALL = fixtureSensors();
/** Sensors, but no game: RTSS reports no frame rate. */
const IDLE = Object.fromEntries(Object.entries(ALL).map(([k, v]) => [k, /RTSS\.rtss\.fps$/.test(k) ? { ...v, value: 0 } : v])) as SensorMap;
/** One unrelated sensor: no RTSS at all, Frame Pacing's "No game running" with any sensor present. */
const ONE_KEY = { "plugins.example.x": { value: 1, unit: "", name: "x" } } as SensorMap;

describe("FPS Monitor's pacing view draws a migrated Frame Pacing zone as that widget did", () => {
  it.each([
    ["the default", {}],
    ["its budget lines", { budgets: "144, 30" }],
    ["budget lines as a list", { budgets: [240, 60] }],
    ["its samples", { window: 60 }],
    ["both", { budgets: "144, 30", window: 300 }],
    ["the dense small-zone view", { compact: "dense" }],
    ["the summary card", { compact: "card" }],
    ["a title and accent", { label: "Pacing", accent: "#ff0000" }],
  ])("%s", (_name, settings) => {
    for (const sensors of [ALL, IDLE, ONE_KEY]) {
      const { before, after } = both(settings as ModuleSettings, sensors);
      expect(before).not.toBeNull();
      expect(after).toEqual(before);
    }
  });

  it("draws 'No game running' with any sensor present and no RTSS, as before; and nothing with no sensors at all", () => {
    const { before, after } = both({}, ONE_KEY);
    expect(after).toContain("No game running");
    expect(after).toEqual(before);
    expect(both({}, {})).toEqual({ before: null, after: null });
  });

  it("reads RTSS only, with no PresentMon fallback", () => {
    const presentmon = { "plugins.fps-plugin.fps.fps": { value: 144, unit: "", name: "fps" } } as SensorMap;
    const { before, after } = both({}, presentmon);
    expect(after).toEqual(before);
    expect(after).toContain("No game running");
  });

  it("keeps the Frame Pacing's size, minimum, category, header, small zones and gate", () => {
    const pacing = FPS.views?.find((v) => v.id === "pacing");
    expect(pacing).toMatchObject({ defaultSize: PACING_META.defaultSize, minSize: PACING_META.minSize, prefixes: [] });
    expect(FPS.category).toBe(PACING_META.category);
    expect(FPS.header).toBe("yes");
    expect(FPS.byView?.pacing).toEqual({ compact: { card: true, dense: true } });
  });

  it("reaches the Frame Pacing's props through FPS Monitor's settings, once each, and shows them only in the pacing view", () => {
    const keys = (FPS.settings ?? []).flatMap(settingKeys);
    for (const key of ["budgets", "window"]) {
      expect(keys.filter((k) => k === key), key).toHaveLength(1);
      const def = (FPS.settings ?? []).find((d) => d.key === key)!;
      expect(def.visibleIf?.({ view: "pacing" }), key).toBe(true);
      for (const view of [undefined, "gauge", "trend", "frametime"]) expect(def.visibleIf?.(view ? { view } : {}), `${key} ${view}`).toBe(false);
    }
    expect(FPS.settings?.find((d) => d.key === "window")).toMatchObject({ default: 120, min: 30, max: 600 });
  });
});

describe("FPS Monitor's own views keep their draw", () => {
  it("an existing FPS Monitor zone draws as before, and ignores the pacing view's settings", () => {
    for (const settings of [{}, { view: "gauge" }, { view: "trend", sparkline: true }, { target: 144 }] as ModuleSettings[]) {
      expect(html(FPS.render(ALL, { ...settings, budgets: "30", window: 30 })), JSON.stringify(settings)).toEqual(html(FPS.render(ALL, settings)));
    }
    expect(html(FPS.render(ALL, { view: "pacing" }))).not.toEqual(html(FPS.render(ALL, {})));
  });
});
