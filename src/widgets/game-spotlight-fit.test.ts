import { describe, expect, it } from "vitest";
import { shapeOf } from "./core/layout";
import { fitLayout, LAYOUT_MIN } from "./GameSpotlight";

// A 1920×550 strip profile with 12×12 cells (gap 4, padding 4): a cell is ~156×42px, so a 4-wide zone
// is ~635px wide at any height. The aspect-ratio "strip" rule used to turn 4x4 and 4x5 into the ticker.
const zone = (cols: number, rows: number) => {
  const w = cols * 155.7 + (cols - 1) * 4,
    h = rows * 41.5 + (rows - 1) * 4;
  return [w, h, shapeOf(w, h)] as const;
};

describe("Game Spotlight picks its layout by what fits", () => {
  it.each([
    [4, 4],
    [4, 5],
    [4, 6],
    [3, 4],
  ])("keeps the hero at %ix%i on a grid of short rows", (cols, rows) => {
    const [w, h, shape] = zone(cols, rows);
    expect(fitLayout("hero", w, h, shape)).toBe("hero");
  });

  it("falls back to the ticker only when the hero does not fit", () => {
    const [w, h, shape] = zone(4, 2);
    expect(h).toBeLessThan(LAYOUT_MIN.hero.h);
    expect(fitLayout("hero", w, h, shape)).toBe("ticker");
  });

  it("gives a chosen layout that needs more room the hero, not the ticker", () => {
    const [w, h, shape] = zone(4, 3);
    expect(fitLayout("poster", w, h, shape)).toBe("hero");
    expect(fitLayout("combo", w, h, shape)).toBe("hero");
    const [w5, h5, s5] = zone(4, 5);
    expect(fitLayout("combo", w5, h5, s5)).toBe("combo");
    expect(fitLayout("poster", w5, h5, s5)).toBe("poster");
  });

  it("honours an explicit ticker where it fits, and gives narrow tall boxes the tall poster", () => {
    expect(fitLayout("ticker", 900, 600, "box")).toBe("ticker");
    expect(fitLayout("ticker", 300, 300, "box")).toBe("hero");
    expect(fitLayout("ticker", 110, 230, "column")).toBe("poster-tall");
    expect(fitLayout("poster", 300, 300, "box")).toBe("poster-tall");
    expect(fitLayout("hero", 180, 272, "box")).toBe("poster-tall");
    expect(fitLayout("hero", 140, 300, "column")).toBe("poster-tall");
  });

  it("gives a box too small for the hero and too narrow for the ticker the mini card", () => {
    expect(fitLayout("hero", 110, 110, "tile")).toBe("mini");
    expect(fitLayout("hero", 180, 88, "box")).toBe("mini");
    expect(fitLayout("hero", 180, 180, "box")).toBe("mini");
  });

  it("keeps the chosen layout until the box is measured", () => {
    expect(fitLayout("poster", 0, 0, "box")).toBe("poster");
  });
});
