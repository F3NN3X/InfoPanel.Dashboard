import { describe, expect, it } from "vitest";
import { ISLAND_DEFAULTS, normalizeIsland, withIsland, type IslandConfig } from "./config";

describe("normalizeIsland", () => {
  it("keeps an absent or malformed island absent", () => {
    expect(normalizeIsland(undefined)).toBeUndefined();
    expect(normalizeIsland("on")).toBeUndefined();
    expect(normalizeIsland([])).toBeUndefined();
  });

  it("falls back to the defaults for bad values and clamps numbers", () => {
    expect(normalizeIsland({})).toEqual(ISLAND_DEFAULTS);
    expect(
      normalizeIsland({ enabled: false, idle: "clock", size: "xl", offsetY: 500, collapseAfter: -3, sensorKey: 4, sensorLabel: "A very long label", reserve: "yes", tint: "red" })
    ).toEqual({
      ...ISLAND_DEFAULTS,
      enabled: false,
      offsetY: 64,
      collapseAfter: 0,
      sensorLabel: "A very long ",
    });
  });

  it("round-trips a full island", () => {
    const island: IslandConfig = {
      enabled: true,
      idle: "sensor",
      sensorKey: "libre.gpu.temp",
      sensorLabel: "GPU",
      size: "l",
      offsetY: 12,
      collapseAfter: 30,
      reserve: true,
      tint: "theme",
    };
    expect(normalizeIsland(JSON.parse(JSON.stringify(island)))).toEqual(island);
  });
});

describe("withIsland", () => {
  it("starts a profile without an island from the defaults, switched off", () => {
    const profile: { name: string; island?: IslandConfig } = { name: "p" };
    expect(withIsland(profile, { size: "s" })).toEqual({ name: "p", island: { ...ISLAND_DEFAULTS, enabled: false, size: "s" } });
  });

  it("patches an existing island", () => {
    const p = { island: { ...ISLAND_DEFAULTS, offsetY: 20 } };
    expect(withIsland(p, { idle: "hidden" }).island).toEqual({ ...ISLAND_DEFAULTS, offsetY: 20, idle: "hidden" });
  });
});
