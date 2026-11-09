// GPU Monitor's rings view is the GPU Rings widget (config v19, _docs/widgets/MERGES.md M2): a GPU Rings zone, migrated, draws
// what the GPU Rings widget drew. That widget's definition before the merge is frozen below (its meta, schema and props from
// gpu-rings/ at 08de5de7) and drawn beside the registry's GPU Monitor in the rings view.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { migratePlacementV19 } from "@/lib/settings-migrate.v19";
import { modules } from "@/modules";
import { deviceOf } from "@/modules/setting-readers";
import { settingKeys, type ModuleSetting, type ModuleSettings, type SensorMap } from "@/modules/types";
import { fixtureSensors } from "@/widgets/__fixtures__";
import type { WidgetMeta } from "@/widgets/core/types";
import GpuRings, { type GpuRingsProps } from "@/widgets/gpu-monitor/GpuRings";
import { templateModule } from "@/widgets/module";
import { colorSetting, colorsOf, deviceSetting, enumSetting, oneOf, type ColorEntry } from "@/widgets/shared/settings-kit";

const RINGS_META: WidgetMeta = {
  id: "GpuRings",
  name: "GPU Rings",
  category: "Hardware",
  icon: "donut_large",
  prefixes: [],
  defaultSize: [3, 2],
  minSize: [1, 1],
  blurb: "GPU load, VRAM and temperature as rings",
  tags: "graphics vram",
  description: "Stacked radial rings for bounded percentages only — VRAM outer, core load inner, temperature in the center — with a legend of clocks, power and fans.",
};
const OUTER = ["vram", "load", "power"] as const;
const INNER = ["load", "vram", "fan"] as const;
const RING_COLORS: ColorEntry[] = [
  { entry: "outer", key: "outerColor", label: "Outer ring" },
  { entry: "inner", key: "innerColor", label: "Inner ring" },
];
const RING_ROLES = { outerColor: "s1", innerColor: "s2" } as const;
const RINGS_SETTINGS: ModuleSetting[] = [
  enumSetting("outer", "Outer ring", "vram", [{ value: "vram", label: "VRAM" }, { value: "load", label: "Load" }, { value: "power", label: "Power" }], { group: "Rings" }),
  enumSetting("inner", "Inner ring", "load", [{ value: "load", label: "Load" }, { value: "vram", label: "VRAM" }, { value: "fan", label: "Fan" }], { group: "Rings" }),
  ...RING_COLORS.map((e) => colorSetting(e.key, e.label, { role: RING_ROLES[e.key as keyof typeof RING_ROLES], more: false })),
  deviceSetting("Graphics card", "gpu", { group: "Graphics card" }),
];
const RINGS = templateModule<Pick<GpuRingsProps, "gpu" | "outer" | "inner" | "colors">>({
  meta: RINGS_META,
  Component: GpuRings,
  settings: RINGS_SETTINGS,
  toProps: (s) => ({ gpu: deviceOf(s, "gpu"), outer: oneOf(s.outer, OUTER), inner: oneOf(s.inner, INNER), colors: colorsOf(s, RING_COLORS) }),
});
const GPU = modules.find((m) => m.id === "GpuMonitor")!;

const html = (node: unknown) => (node === null ? null : renderToStaticMarkup(node as never));
/** A GPU Rings zone's settings drawn by that widget, and the same zone migrated (v19) drawn by the registry. */
function both(settings: ModuleSettings, sensors: SensorMap) {
  const migrated = migratePlacementV19({ module: "GpuRings", settings });
  expect(migrated.module).toBe("GpuMonitor");
  return { before: html(RINGS.render(sensors, settings)), after: html(GPU.render(sensors, migrated.settings)) };
}

const ALL = fixtureSensors();
/** One unrelated sensor: no card resolves, so the rings draw empty, as the widget drew them once any key existed. */
const ONE_KEY = { "plugins.example.x": { value: 1, unit: "", name: "x" } } as SensorMap;

describe("GPU Monitor's rings view draws a migrated GPU Rings zone as that widget did", () => {
  it.each([
    ["the default (VRAM outside, load inside)", {}],
    ["its rings", { outer: "load", inner: "fan" }],
    ["the power ring", { outer: "power", inner: "vram" }],
    ["its colours", { outerColor: "#ff0000", innerColor: "#00ff00" }],
    ["a card that is not there", { device: "no_such_card" }],
    ["the dense small-zone view", { compact: "dense" }],
    ["a stored summary card (it has none)", { compact: "card" }],
    ["a title and accent", { label: "Card", accent: "#ff0000" }],
  ])("%s", (_name, settings) => {
    for (const sensors of [ALL, ONE_KEY]) {
      const { before, after } = both(settings as ModuleSettings, sensors);
      expect(before).not.toBeNull();
      expect(after).toEqual(before);
    }
  });

  it("draws nothing with no sensors at all, as before", () => {
    expect(both({}, {})).toEqual({ before: null, after: null });
  });

  it("keeps the GPU Rings' size, minimum, category, header and dense-only small zones", () => {
    const rings = GPU.views?.find((v) => v.id === "rings");
    expect(rings?.defaultSize).toEqual(RINGS_META.defaultSize);
    expect([GPU.minCols, GPU.minRows]).toEqual(RINGS_META.minSize);
    expect(GPU.category).toBe(RINGS_META.category);
    expect(GPU.header).toBe("yes");
    expect(GPU.byView?.rings).toEqual({ compact: { card: false, dense: true } });
  });

  it("reaches the GPU Rings' props through GPU Monitor's settings, once each, and shows them only in the rings view", () => {
    const keys = (GPU.settings ?? []).flatMap(settingKeys);
    for (const key of ["outer", "inner", "outerColor", "innerColor", "device"]) expect(keys.filter((k) => k === key), key).toHaveLength(1);
    for (const key of ["outer", "inner", "outerColor", "innerColor"]) {
      const def = (GPU.settings ?? []).find((d) => d.key === key)!;
      expect(def.visibleIf?.({ view: "rings" }), key).toBe(true);
      expect(def.visibleIf?.({}), key).toBe(false);
    }
    for (const key of ["outer", "inner"]) expect(GPU.settings?.find((d) => d.key === key)).toMatchObject({ default: RINGS_SETTINGS.find((d) => d.key === key)?.default });
    expect(GPU.settings?.find((d) => d.key === "outerColor")).toMatchObject({ role: "s1" });
    expect(GPU.settings?.find((d) => d.key === "innerColor")).toMatchObject({ role: "s2" });
  });
});

describe("GPU Monitor's own view keeps its card", () => {
  it("an existing GPU Monitor zone draws its card, with or without the View stored, and ignores the rings view's settings", () => {
    const card = html(GPU.render(ALL, {}));
    expect(html(GPU.render(ALL, { view: "monitor" }))).toEqual(card);
    expect(html(GPU.render(ALL, { outer: "power", outerColor: "#ff0000" }))).toEqual(card);
    expect(html(GPU.render(ALL, { view: "rings" }))).not.toEqual(card);
  });
});
