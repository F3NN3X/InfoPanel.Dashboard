import { describe, expect, it } from "vitest";
import type { Placement } from "@/lib/layout";
import {
  clampZoneRect,
  firstFreeRect,
  fitZoneRect,
  nudgeZone,
  rectsOverlap,
  resizeZone,
  sortZones,
  zoneFits,
} from "./zone-geometry";

const zone = (
  id: string,
  colStart: number,
  rowStart: number,
  colSpan: number,
  rowSpan: number,
  visible = true
): Placement => ({ id, module: "m", colStart, rowStart, colSpan, rowSpan, visible });

describe("rectsOverlap", () => {
  it("detects shared cells and ignores edge-touching boxes", () => {
    const o = zone("a", 3, 3, 2, 2);
    expect(rectsOverlap({ col: 4, row: 4, cols: 2, rows: 2 }, o)).toBe(true);
    expect(rectsOverlap({ col: 1, row: 3, cols: 2, rows: 2 }, o)).toBe(false);
    expect(rectsOverlap({ col: 3, row: 5, cols: 2, rows: 1 }, o)).toBe(false);
  });
});

describe("clampZoneRect", () => {
  it("clamps position and size into the grid", () => {
    expect(clampZoneRect({ col: 0, row: -2, cols: 3, rows: 2 }, [], 12, 6)).toEqual({
      col: 1,
      row: 1,
      cols: 3,
      rows: 2,
    });
    expect(clampZoneRect({ col: 11, row: 6, cols: 4, rows: 3 }, [], 12, 6)).toEqual({
      col: 9,
      row: 4,
      cols: 4,
      rows: 3,
    });
    expect(clampZoneRect({ col: 1, row: 1, cols: 40, rows: 0 }, [], 12, 6)).toEqual({
      col: 1,
      row: 1,
      cols: 12,
      rows: 1,
    });
  });

  it("pushes the box out of an overlapped zone", () => {
    const others = [zone("a", 5, 1, 2, 1)];
    const r = clampZoneRect({ col: 4, row: 1, cols: 2, rows: 1 }, others, 12, 6);
    expect(r).toEqual({ col: 3, row: 1, cols: 2, rows: 1 });
    expect(rectsOverlap(r, others[0])).toBe(false);
  });

  it("pushes away from the zone it overlaps, not into it", () => {
    const others = [zone("a", 1, 1, 4, 2)];
    const r = clampZoneRect({ col: 4, row: 1, cols: 2, rows: 2 }, others, 12, 6);
    expect(r).toEqual({ col: 5, row: 1, cols: 2, rows: 2 });
    const up = clampZoneRect({ col: 1, row: 2, cols: 4, rows: 2 }, [zone("b", 1, 3, 4, 2)], 12, 6);
    expect(up).toEqual({ col: 1, row: 1, cols: 4, rows: 2 });
  });

  it("ignores the zone being moved and hidden zones", () => {
    const others = [zone("self", 1, 1, 4, 2), zone("hidden", 5, 1, 2, 2, false)];
    const rect = { col: 2, row: 1, cols: 5, rows: 2 };
    expect(clampZoneRect(rect, others, 12, 6, "self")).toEqual(rect);
  });

  it("gives up after a bounded number of pushes when boxed in", () => {
    const others = [zone("a", 1, 1, 2, 1), zone("b", 3, 1, 2, 1)];
    // A 4-wide, 1-row grid fully occupied: the result stays inside the grid.
    const r = clampZoneRect({ col: 2, row: 1, cols: 2, rows: 1 }, others, 4, 1);
    expect(r.col).toBeGreaterThanOrEqual(1);
    expect(r.col + r.cols - 1).toBeLessThanOrEqual(4);
    expect(r.row).toBe(1);
  });

  it("finds the nearest free spot when the push-out hits the grid edge", () => {
    // Pushing up from row 1 is clamped back to row 1 forever; the old loop
    // returned a box still on top of "a".
    const others = [zone("a", 3, 1, 2, 1)];
    const r = clampZoneRect({ col: 4, row: 1, cols: 2, rows: 1 }, others, 4, 2);
    expect(r).toEqual({ col: 3, row: 2, cols: 2, rows: 1 });
    expect(rectsOverlap(r, others[0])).toBe(false);
  });

  it("never overlaps when any free spot exists", () => {
    const others = [zone("a", 1, 1, 3, 1), zone("b", 1, 2, 1, 2), zone("c", 3, 2, 1, 2)];
    const r = clampZoneRect({ col: 2, row: 1, cols: 1, rows: 1 }, others, 3, 3);
    expect(r).toEqual({ col: 2, row: 2, cols: 1, rows: 1 });
    expect(others.some((o) => rectsOverlap(r, o))).toBe(false);
  });
});

describe("fitZoneRect", () => {
  it("returns the clamped box when it fits", () => {
    expect(fitZoneRect({ col: 4, row: 1, cols: 2, rows: 1 }, [zone("a", 3, 1, 2, 1)], 4, 2)).toEqual({
      col: 3,
      row: 2,
      cols: 2,
      rows: 1,
    });
  });

  it("signals failure when no free spot of that size exists", () => {
    const others = [zone("a", 1, 1, 2, 1), zone("b", 3, 1, 2, 1)];
    expect(fitZoneRect({ col: 2, row: 1, cols: 2, rows: 1 }, others, 4, 1)).toBeNull();
    // The zone being moved doesn't block itself.
    expect(fitZoneRect({ col: 2, row: 1, cols: 2, rows: 1 }, others, 4, 1, "a")).toEqual({
      col: 1,
      row: 1,
      cols: 2,
      rows: 1,
    });
  });
});

describe("zoneFits / nudgeZone", () => {
  const self = zone("s", 2, 2, 2, 1);

  it("checks the grid bounds and other visible zones", () => {
    expect(zoneFits({ col: 0, row: 1, cols: 1, rows: 1 }, [], 4, 4)).toBe(false);
    expect(zoneFits({ col: 4, row: 4, cols: 1, rows: 1 }, [], 4, 4)).toBe(true);
    expect(zoneFits({ col: 4, row: 4, cols: 2, rows: 1 }, [], 4, 4)).toBe(false);
    expect(zoneFits({ col: 1, row: 1, cols: 2, rows: 2 }, [self], 4, 4)).toBe(false);
    expect(zoneFits({ col: 1, row: 1, cols: 2, rows: 2 }, [self], 4, 4, "s")).toBe(true);
  });

  it("moves a zone by whole cells", () => {
    expect(nudgeZone(self, { cols: 1, rows: 0 }, [self], 4, 4)).toEqual({ col: 3, row: 2, cols: 2, rows: 1 });
    expect(nudgeZone(self, { cols: 0, rows: -1 }, [self], 4, 4)).toEqual({ col: 2, row: 1, cols: 2, rows: 1 });
  });

  it("is blocked by a neighbour or the grid edge (no push elsewhere)", () => {
    const placements = [self, zone("n", 4, 1, 1, 4)];
    expect(nudgeZone(self, { cols: 1, rows: 0 }, placements, 4, 4)).toBeNull();
    expect(nudgeZone(self, { cols: -2, rows: 0 }, [self], 4, 4)).toBeNull();
    // A hidden neighbour doesn't block.
    expect(nudgeZone(self, { cols: 1, rows: 0 }, [self, zone("h", 4, 1, 1, 4, false)], 4, 4)).not.toBeNull();
  });
});

describe("firstFreeRect", () => {
  it("returns the first row-major slot where the box fits", () => {
    const placements = [zone("a", 1, 1, 3, 1)];
    expect(firstFreeRect(4, 2, { cols: 2, rows: 1 }, placements)).toEqual({
      col: 1,
      row: 2,
      cols: 2,
      rows: 1,
    });
    expect(firstFreeRect(4, 2, { cols: 1, rows: 1 }, placements)).toEqual({
      col: 4,
      row: 1,
      cols: 1,
      rows: 1,
    });
  });

  it("treats hidden zones as free space", () => {
    const placements = [zone("a", 1, 1, 4, 2, false)];
    expect(firstFreeRect(4, 2, { cols: 4, rows: 2 }, placements)).toEqual({
      col: 1,
      row: 1,
      cols: 4,
      rows: 2,
    });
  });

  it("returns null when the grid is full", () => {
    const placements = [zone("a", 1, 1, 4, 2)];
    expect(firstFreeRect(4, 2, { cols: 1, rows: 1 }, placements)).toBeNull();
  });
});

describe("sortZones", () => {
  it("orders by row, then column", () => {
    const placements = [zone("c", 1, 3, 1, 1), zone("b", 5, 1, 1, 1), zone("a", 1, 1, 2, 2)];
    expect(sortZones(placements).map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps the input order for zones in the same cell and leaves the input alone", () => {
    const placements = [zone("x", 2, 2, 1, 1), zone("y", 2, 2, 1, 1, false), zone("z", 1, 1, 1, 1)];
    expect(sortZones(placements).map((p) => p.id)).toEqual(["z", "x", "y"]);
    expect(placements.map((p) => p.id)).toEqual(["x", "y", "z"]);
  });
});

describe("resizeZone", () => {
  const self = zone("s", 1, 1, 2, 2);

  it("grows from the top-left corner into free cells", () => {
    expect(resizeZone(self, { cols: 3, rows: 2 }, [self], 12, 6)).toEqual({
      col: 1,
      row: 1,
      cols: 3,
      rows: 2,
    });
  });

  it("blocks a grow into a neighbour or past the grid", () => {
    const placements = [self, zone("n", 3, 1, 2, 2)];
    expect(resizeZone(self, { cols: 3, rows: 2 }, placements, 12, 6)).toBeNull();
    expect(resizeZone(self, { cols: 2, rows: 3 }, [self], 12, 2)).toBeNull();
  });

  it("ignores hidden neighbours and always allows shrinking", () => {
    const placements = [self, zone("h", 3, 1, 2, 2, false)];
    expect(resizeZone(self, { cols: 3, rows: 2 }, placements, 12, 6)).not.toBeNull();
    expect(resizeZone(self, { cols: 1, rows: 1 }, [self, zone("n", 3, 1, 2, 2)], 12, 6)).toEqual({
      col: 1,
      row: 1,
      cols: 1,
      rows: 1,
    });
  });
});
