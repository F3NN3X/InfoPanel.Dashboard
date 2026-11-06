import { describe, expect, it } from "vitest";
import { parseDisplayItemsXml, parseProfileXml } from "@/lib/infopanel/parse.ts";
import { STARTERS } from "@/lib/infopanel/gauges/presets.ts";
import { readStored, toStored } from "@/lib/infopanel/import/stored.ts";
import { buildScene, type ImageSource } from "@/lib/infopanel/render/scene.ts";
import type { DisplayItem } from "@/lib/infopanel/schema.ts";

// Baking is gone, but a canvas saved with baked frames, and an imported image-sequence gauge, keep rendering from what
// is stored: frames by value, a vector spec live.
const profile = parseProfileXml("<Profile><Name>P</Name><Width>800</Width></Profile>").profile;
const frames = ["f0", "f1", "f2"].map((f) => `<ImageDisplayItem><FilePath>${f}.png</FilePath><RelativePath>true</RelativePath></ImageDisplayItem>`).join("");
const gauge = (name: string) =>
  parseDisplayItemsXml(`<ArrayOfDisplayItem xmlns:xsi="x"><DisplayItem xsi:type="GaugeDisplayItem"><Name>${name}</Name><MaxValue>100</MaxValue><Images>${frames}</Images></DisplayItem></ArrayOfDisplayItem>`).items[0];

function load(items: DisplayItem[]): DisplayItem[] {
  const stored = toStored({
    name: "P", origin: "file", dataApi: null, defaultMode: "infopanel", profile, items, assets: new Map(), keyOf: () => null, fonts: [],
    now: new Date("2026-10-16T12:00:00Z"),
  });
  return readStored(JSON.parse(JSON.stringify(stored))).items;
}

function draw(items: DisplayItem[], value: number, seen: ImageSource[] = []) {
  return buildScene({
    profile,
    items,
    sensor: () => ({ reading: { now: value, min: value, max: value, avg: value, unit: "" }, history: [] }),
    image: (s) => (seen.push(s), { url: "u", width: 40, height: 30 }),
    now: new Date(2026, 9, 16, 15, 4, 5),
    elapsedMs: 0,
  });
}

describe("stored gauges", () => {
  it("an image-sequence gauge picks its frame by value after a save and reload", () => {
    const seen: ImageSource[] = [];
    const [node] = draw(load([gauge("Ring")]), 80, seen);
    expect(node).toMatchObject({ kind: "image" });
    expect(seen).toEqual([{ kind: "asset", name: "f2.png" }]);
  });

  it("a vector gauge that still holds its baked frames draws live from the spec and keeps both", () => {
    const spec = STARTERS.find((s) => s.gauge.shape !== "svg")!.gauge;
    const [back] = load([{ ...gauge("Ring"), vector: spec, vectorBaked: "sig" } as unknown as DisplayItem]);
    expect(back).toMatchObject({ vector: spec, vectorBaked: "sig" });
    expect((back as unknown as { Images: unknown[] }).Images).toHaveLength(3);
    const seen: ImageSource[] = [];
    const [node] = draw([back], 50, seen);
    expect(node).toMatchObject({ kind: "vector", gauge: { shape: spec.shape } });
    expect(seen).toEqual([]);
  });
});
