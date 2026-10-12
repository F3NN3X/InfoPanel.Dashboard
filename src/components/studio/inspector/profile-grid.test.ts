import { describe, expect, it } from "vitest";
import type { MonitorProfile, Placement } from "@/lib/layout";
import { stepGrid } from "./profile-grid";

const zone = (id: string, extra: Partial<Placement>): Placement => ({
  id,
  module: "systemmodern",
  colStart: 1,
  rowStart: 1,
  colSpan: 1,
  rowSpan: 1,
  visible: true,
  ...extra,
});

const profile = (placements: Placement[], extra: Partial<MonitorProfile> = {}): MonitorProfile => ({
  id: "p",
  name: "p",
  width: 1920,
  height: 1080,
  cols: 12,
  rows: 6,
  fit: "scroll",
  placements,
  ...extra,
});

describe("stepGrid", () => {
  it("grows and shrinks when every zone fits", () => {
    const p = profile([zone("a", { colStart: 1, colSpan: 4 })]);
    expect(stepGrid(p, "cols", 1)?.cols).toBe(13);
    expect(stepGrid(p, "cols", -1)?.cols).toBe(11);
    expect(stepGrid(p, "rows", -1)?.rows).toBe(5);
  });

  it("refuses to shrink under a zone", () => {
    const p = profile([zone("a", { colStart: 10, colSpan: 3 }), zone("b", { rowStart: 5, rowSpan: 2 })]);
    expect(stepGrid(p, "cols", -1)).toBeNull();
    expect(stepGrid(p, "rows", -1)).toBeNull();
    expect(stepGrid(p, "cols", 1)?.cols).toBe(13);
  });

  it("allows shrinking to exactly the zone edge", () => {
    const p = profile([zone("a", { colStart: 10, colSpan: 2 })]);
    expect(stepGrid(p, "cols", -1)?.cols).toBe(11);
  });

  it("returns the profile unchanged at the limits", () => {
    const p = profile([], { cols: 2, rows: 24 });
    expect(stepGrid(p, "cols", -1)).toBe(p);
    expect(stepGrid(p, "rows", 1)).toBe(p);
  });
});
