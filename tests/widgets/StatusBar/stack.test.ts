import { describe, expect, it } from "vitest";
import type { ItemKey } from "@/widgets/StatusBar/item-keys";
import { stacksIn } from "@/widgets/core/layout";
import { stackShown, stackTiles } from "@/widgets/StatusBar/Stack";

describe("stacksIn", () => {
  it("stacks a zone that is not a strip and tall enough for tiles, and leaves strips and tiles alone", () => {
    expect(stacksIn(464, 464)).toBe(true); // 4x4
    expect(stacksIn(436, 190)).toBe(true); // 4x2 inside its padding
    expect(stacksIn(1400, 110)).toBe(false); // the edge view
    expect(stacksIn(200, 80)).toBe(false); // 2x1: too short for tiles
    expect(stacksIn(0, 0)).toBe(false); // not measured
  });
});

describe("stackTiles", () => {
  it("keeps each item once, in slot order, and skips the ones with no value (a logo, a card)", () => {
    const tiles = stackTiles(["logo", "time", "time", "network"], { logo: { icon: "monitor" }, time: { value: "14:05" }, network: { icon: "wifi", parts: ["a", "b"] } });
    expect(tiles.map((t) => [t.k, t.value])).toEqual([["time", "14:05"], ["network", "a b"]]);
  });
});

describe("stackShown", () => {
  it("drops the lowest priority first, the last on a tie, and keeps slot order", () => {
    const tiles = ["fps", "time", "cpuRing", "network", "gpuRing", "volume"].map((k) => ({ k: k as ItemKey }));
    expect(stackShown(tiles, 4, true).map((t) => t.k)).toEqual(["fps", "time", "cpuRing", "gpuRing"]);
    expect(stackShown(tiles, 4, false).map((t) => t.k)).toEqual(["fps", "time", "cpuRing", "network"]);
    expect(stackShown(tiles, 8, true)).toHaveLength(6);
  });
});
