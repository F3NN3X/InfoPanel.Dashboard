// KPI Tiles' cards view is the Vitals widget (config v19, _docs/widgets/MERGES.md M5): a Vitals zone, migrated, draws what
// the Vitals widget drew. The Vitals widget's definition before the merge is frozen below (its meta, schema and props from
// registry/a.ts and a-settings.ts at ca49b21f) and drawn beside the registry's KPI Tiles in the cards view.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { migratePlacementV19 } from "@/lib/settings-migrate.v19";
import { modules } from "@/modules";
import type { ModuleSettings, SensorMap } from "@/modules/types";
import { fixtureSensors } from "@/widgets/__fixtures__";
import type { WidgetMeta } from "@/widgets/core/types";
import Vitals, { type VitalsProps } from "@/widgets/kpi-tiles/Vitals";
import { templateModule } from "@/widgets/module";
import { enumSetting, listPick, optionPairs as opts } from "@/widgets/shared/settings-kit";

const VITALS_META: WidgetMeta = {
  id: "Vitals",
  name: "Vitals",
  category: "System",
  icon: "vital_signs",
  prefixes: [],
  defaultSize: [4, 1],
  minSize: [1, 1],
  blurb: "CPU, GPU, RAM and network side by side",
  tags: "cpu gpu ram network",
  description: "CPU, GPU, RAM and network side-by-side. Reflows into a row, 2×2 grid or stack to suit its size.",
};
const VITALS_METRICS = ["cpu", "gpu", "ram", "net", "vram", "fps"] as const;
const VITALS = templateModule({
  meta: VITALS_META,
  Component: Vitals,
  settings: [enumSetting("metrics", "Metrics", "cpu,gpu,ram,net", opts(["cpu", "CPU"], ["gpu", "GPU"], ["ram", "RAM"], ["net", "Network"], ["vram", "VRAM"], ["fps", "FPS"]), { multiple: true, group: "Metrics" })],
  toProps: (s): Partial<VitalsProps> => ({ metrics: listPick(s.metrics, VITALS_METRICS) }),
});
const KPI = modules.find((m) => m.id === "KpiTiles")!;

const html = (node: unknown) => (node === null ? null : renderToStaticMarkup(node as never));
/** A Vitals zone's settings drawn by the Vitals widget, and the same zone migrated (v19) drawn by the registry. */
function both(settings: ModuleSettings, sensors: SensorMap) {
  const migrated = migratePlacementV19({ module: "Vitals", settings });
  expect(migrated.module).toBe("KpiTiles");
  return { before: html(VITALS.render(sensors, settings)), after: html(KPI.render(sensors, migrated.settings)) };
}

const ALL = fixtureSensors();
/** No RTSS: the FPS card has no reading. */
const NO_GAME = Object.fromEntries(Object.entries(ALL).filter(([k]) => !k.startsWith("plugins.InfoPanel.RTSS.")));
/** One unrelated sensor: every card is empty, as the Vitals widget drew it once any key existed. */
const ONE_KEY = { "plugins.example.x": { value: 1, unit: "", name: "x" } } as SensorMap;

describe("KPI Tiles' cards view draws a migrated Vitals zone as the Vitals widget did", () => {
  it.each([
    ["the default metrics", {}],
    ["its own metrics, FPS included", { metrics: "cpu,fps,net" }],
    ["every metric", { metrics: "cpu,gpu,ram,net,vram,fps" }],
    ["one metric", { metrics: "vram" }],
    ["the dense small-zone view", { compact: "dense" }],
    ["the summary card", { compact: "card" }],
    ["a title and accent", { label: "Box", accent: "#ff0000" }],
  ])("%s", (_name, settings) => {
    for (const sensors of [ALL, NO_GAME, ONE_KEY]) {
      const { before, after } = both(settings as ModuleSettings, sensors);
      expect(before).not.toBeNull();
      expect(after).toEqual(before);
    }
  });

  it("draws nothing with no sensors at all, as before", () => {
    expect(both({}, {})).toEqual({ before: null, after: null });
  });

  it("keeps the Vitals widget's size, minimum, category and no-header shape", () => {
    const cards = KPI.views?.find((v) => v.id === "cards");
    expect(cards?.defaultSize).toEqual(VITALS_META.defaultSize);
    expect([KPI.minCols, KPI.minRows]).toEqual(VITALS_META.minSize);
    expect(KPI.category).toBe(VITALS_META.category);
    expect({ header: KPI.header, compact: KPI.compact }).toEqual({ header: "none", compact: { card: true, dense: true } });
  });

  it("reaches the Vitals spec's one prop, metrics, through cardMetrics only", () => {
    const keys = (KPI.settings ?? []).map((d) => d.key);
    expect(keys.filter((k) => k === "cardMetrics")).toHaveLength(1);
    expect(KPI.settings?.find((d) => d.key === "cardMetrics")?.options?.map((o) => o.value)).toEqual([...VITALS_METRICS]);
  });
});

describe("KPI Tiles' own view keeps its tiles", () => {
  it("an existing KPI Tiles zone draws its tiles, with or without the View stored, and ignores the cards view's metrics", () => {
    const tiles = html(KPI.render(ALL, {}));
    expect(html(KPI.render(ALL, { view: "tiles" }))).toEqual(tiles);
    expect(html(KPI.render(ALL, { cardMetrics: "fps" }))).toEqual(tiles);
    expect(html(KPI.render(ALL, { view: "cards" }))).not.toEqual(tiles);
  });
});
