import fs from "node:fs";
import { describe, expect, it } from "vitest";
import type { DashboardConfig, Placement } from "@/lib/layout";
import type { LibraryItem } from "@/lib/library";
import { openCanvas } from "@/lib/infopanel/canvas";
import { tableOf } from "@/lib/infopanel/assets/assets";
import { insertVectorGauge, vectorOf } from "@/lib/infopanel/gauges/frames";
import { DEFAULT_GAUGE } from "@/lib/infopanel/gauges/vector";
import { toStored } from "@/lib/infopanel/import/stored";
import { parseProfileXml } from "@/lib/infopanel/parse";
import { defaultItem } from "@/lib/infopanel/schema";
import {
  CUSTOM_GAUGE_ID, configGauges, gaugeDataOf, gaugeEntryOf, libraryGauges, presetGauges, previewScale, profileGauges, sourceKey, widgetGauge, withGauge, withGaugeName, withGaugeSpeed,
} from "@/lib/gauge-studio/model";

const profile = parseProfileXml("<Profile><Name>Rig</Name><Width>800</Width><Height>480</Height></Profile>").profile;
const group = { ...defaultItem("Group"), DisplayItems: [insertVectorGauge([], { ...DEFAULT_GAUGE, sweep: 200 }, "Inner").items[0]] };
const items = [{ ...defaultItem("Gauge"), Name: "Frames", MinValue: 10, MaxValue: 90, AnimationSpeed: 4 }, group];
const canvas = toStored({ name: "Rig", origin: "file", dataApi: null, defaultMode: "infopanel", profile, items, fonts: [], assets: tableOf([]), keyOf: () => null });
const widget: Placement = { id: "w1", module: CUSTOM_GAUGE_ID, colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 1, visible: true, settings: { gauge: JSON.stringify({ ...DEFAULT_GAUGE, shape: "bar" }), label: "CPU" } };
const zone: Placement = { id: "c1", module: "infopanel", colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1, visible: true, canvas };
const config = { profiles: [{ id: "p", name: "Rig", pages: [{ id: "pg", placements: [zone, widget] }] }] } as unknown as DashboardConfig;

describe("gauge sources", () => {
  it("lists presets read-only, with their kind", () => {
    const presets = presetGauges();
    expect(presets.length).toBeGreaterThan(3);
    expect(presets.find((p) => p.gauge?.shape === "svg")?.kind).toBe("svg");
    expect(presets[0].where).toBe("Preset");
  });

  it("finds canvas gauges (inside groups too) and Custom gauge widgets on the page", () => {
    const found = profileGauges({ name: "Rig", placements: [zone, widget] });
    expect(found.map((g) => [g.key, g.kind, g.name])).toEqual([
      ["canvas:c1:0", "frames", "Frames"],
      ["canvas:c1:1.0", "vector", "Inner"],
      ["widget:w1", "vector", "CPU"],
    ]);
    expect(found[0]).toMatchObject({ min: 10, max: 90, animationSpeed: 4, frames: [], stale: false });
    expect(found[1].stale).toBe(true);
  });

  it("lists the gauges of every screen and page, not only the one on the canvas (B3)", () => {
    const second: Placement = { ...widget, id: "w9", settings: { label: "VRAM" } };
    const many = {
      profiles: [
        { id: "p", name: "Rig", pages: [{ id: "pg", name: "Main", placements: [zone, widget] }, { id: "pg2", name: "Extra", placements: [] }] },
        { id: "q", name: "Desk", pages: [{ id: "pg3", name: "Gaming", placements: [second] }] },
      ],
    } as unknown as DashboardConfig;
    const found = configGauges(many);
    expect(found.map((g) => [g.key, g.on?.screen, g.on?.page])).toEqual([
      ["canvas:c1:0", "Rig", "Main"],
      ["canvas:c1:1.0", "Rig", "Main"],
      ["widget:w1", "Rig", "Main"],
      ["widget:w9", "Desk", "Gaming"],
    ]);
    expect(found[3].on).toMatchObject({ profileId: "q", pageId: "pg3" });
    // The canvas is opened once for the same stored form.
    expect(configGauges(many)[0]).toBe(found[0]);
  });

  describe("a Gauge item placed on a page", () => {
    const fixture = JSON.parse(fs.readFileSync("tests/fixtures/perf/data/config.json", "utf8")) as DashboardConfig;
    const source = { kind: "item", zoneId: "perf-gauge-cpu" } as const;

    it("is listed with its screen, page and sensor, and the item that is not a gauge is not", () => {
      const found = configGauges(fixture);
      expect(found.map((g) => g.key)).toEqual(["item:perf-gauge-cpu"]);
      expect(found[0]).toMatchObject({ name: "CPU gauge", kind: "vector", reads: "CPU Total", where: "Main", on: { screen: "Perf heavy", page: "Main", pageId: "main" } });
    });

    it("writes its spec and name back into the item, leaving its box and binding as they were", () => {
      const spec = { ...configGauges(fixture)[0].gauge!, sweep: 90 };
      const next = withGauge(fixture, source, spec)!;
      const named = withGaugeName(next, source, "Renamed")!;
      const [entry] = configGauges(named);
      expect(entry).toMatchObject({ name: "Renamed", gauge: { sweep: 90 } });
      const zone = named.profiles[0].pages[0].placements.find((z) => z.id === "perf-gauge-cpu")!;
      const before = fixture.profiles[0].pages[0].placements.find((z) => z.id === "perf-gauge-cpu")!;
      expect(zone.item).toMatchObject({ kind: "Gauge", X: before.item!.X, Y: before.item!.Y, SensorName: "CPU Total", $: { key: "libre.amd_ryzen_9_9950x3d_cpu_total" } });
      expect(zone.px).toEqual(before.px);
      expect(named.profiles[0].pages[0].placements.find((z) => z.id === "perf-gauge-gpu")).toBe(fixture.profiles[0].pages[0].placements.find((z) => z.id === "perf-gauge-gpu"));
    });
  });

  it("lists a Custom gauge widget with no spec of its own as the default spec it draws", () => {
    const blank: Placement = { ...widget, id: "w2", settings: { label: "GPU" } };
    const bad: Placement = { ...widget, id: "w3", settings: { gauge: "{nope" } };
    const found = profileGauges({ name: "Rig", placements: [blank, bad] });
    expect(found.map((g) => [g.key, g.name, g.gauge?.shape])).toEqual([["widget:w2", "GPU", "arc"], ["widget:w3", "Custom gauge", "arc"]]);
    expect(widgetGauge(blank).text).toBeDefined();
  });

  it("reads library gauge data defensively", () => {
    expect(gaugeDataOf(null)).toBeNull();
    expect(gaugeDataOf({ frames: [{ id: "../x", name: "a" }] })).toBeNull();
    const ok = gaugeDataOf({ frames: [{ id: `${"a".repeat(64)}.png`, name: "f0.png" }], min: 0, max: 50, animationSpeed: 2 });
    expect(ok).toMatchObject({ min: 0, max: 50, animationSpeed: 2 });
    const item = { id: "lib_1", kind: "gauge", name: "Mine", data: ok } as LibraryItem;
    expect(libraryGauges([item, { ...item, id: "lib_2", kind: "image" }])).toMatchObject([{ key: "library:lib_1", kind: "frames", frames: [`/api/assets/${"a".repeat(64)}.png`], files: [{ id: `${"a".repeat(64)}.png`, name: "f0.png" }] }]);
  });

  it("sets a canvas gauge's frame rate in one change, leaving other sources alone", () => {
    const next = withGaugeSpeed(config, { kind: "canvas", zoneId: "c1", path: "0" }, 24);
    const open = openCanvas(JSON.parse(JSON.stringify(next.profiles[0].pages[0].placements[0].canvas)));
    expect(open.items[0]).toMatchObject({ Name: "Frames", AnimationSpeed: 24, MinValue: 10 });
    expect(next.profiles[0].pages[0].placements[1]).toBe(widget);
    expect(withGaugeSpeed(config, { kind: "widget", zoneId: "w1" }, 5)).toBe(config);
    expect(profileGauges({ name: "Rig", placements: [next.profiles[0].pages[0].placements[0]] })[0].animationSpeed).toBe(24);
  });

  it("renames a canvas gauge's Name or a widget's label in one change, leaving other sources alone", () => {
    const next = withGaugeName(config, { kind: "canvas", zoneId: "c1", path: "0" }, "Renamed")!;
    expect(profileGauges({ name: "Rig", placements: [next.profiles[0].pages[0].placements[0]] })[0]).toMatchObject({ name: "Renamed", min: 10 });
    expect(next.profiles[0].pages[0].placements[1]).toBe(widget);
    const labelled = withGaugeName(config, { kind: "widget", zoneId: "w1" }, "GPU")!;
    expect(profileGauges({ name: "Rig", placements: [labelled.profiles[0].pages[0].placements[1]] })[0].name).toBe("GPU");
    expect(withGaugeName(config, { kind: "library", itemId: "x" }, "n")).toBeNull();
  });

  it("writes a canvas gauge's spec back in one change, keeping the rest", () => {
    const next = withGauge(config, { kind: "canvas", zoneId: "c1", path: "1.0" }, { ...DEFAULT_GAUGE, sweep: 90 })!;
    const stored = next.profiles[0].pages[0].placements[0].canvas!;
    const open = openCanvas(JSON.parse(JSON.stringify(stored)));
    expect(vectorOf((open.items[1] as Extract<(typeof open.items)[number], { kind: "Group" }>).DisplayItems[0])?.sweep).toBe(90);
    expect(open.items[0]).toMatchObject({ Name: "Frames", MinValue: 10 });
    expect(next.profiles[0].pages[0].placements[1]).toBe(widget);
  });

  it("writes a widget's spec to its gauge setting; presets and library aren't in the config", () => {
    const next = withGauge(config, { kind: "widget", zoneId: "w1" }, { ...DEFAULT_GAUGE, sweep: 120 })!;
    expect(widgetGauge(next.profiles[0].pages[0].placements[1])?.sweep).toBe(120);
    expect(withGauge(config, { kind: "preset", index: 0 }, DEFAULT_GAUGE)).toBeNull();
    expect(sourceKey({ kind: "library", itemId: "x" })).toBe("library:x");
  });

  it("builds an entry for an unlisted spec: the range from its scale, else the previous data", () => {
    const scaled = { ...DEFAULT_GAUGE, scale: { min: 5, max: 50, unit: "", decimals: null } };
    expect(gaugeEntryOf({ kind: "library", itemId: "a" }, "Mine", scaled, "My library", { min: 0, max: 100, animationSpeed: 3 })).toMatchObject({ key: "library:a", min: 5, max: 50, animationSpeed: 3, kind: "vector" });
    expect(gaugeEntryOf({ kind: "preset", index: -1 }, "New", DEFAULT_GAUGE, "Preset")).toMatchObject({ min: 0, max: 100, animationSpeed: 0, where: "Preset" });
  });

  it("scales a thin bar's browse preview up and leaves a ring and an image sequence alone", () => {
    expect(previewScale({ ...DEFAULT_GAUGE, shape: "bar" })).toBeGreaterThan(1);
    expect(previewScale({ ...DEFAULT_GAUGE, shape: "arc" })).toBe(1);
    expect(previewScale(null)).toBe(1);
  });
});
