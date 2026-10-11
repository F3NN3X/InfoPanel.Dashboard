import { describe, expect, it } from "vitest";
import {
  BLANK_MODULE,
  PANEL_ID,
  type MonitorProfile,
  type PanelDef,
  type Placement,
} from "@/lib/layout";
import type { PanelPreset } from "@/lib/panelPresets";
import {
  addBlankZone,
  addModulePlacement,
  addPresetPlacement,
  assignModule,
  assignPreset,
  changeCols,
  changeRows,
  clearWidget,
  duplicatePlacement,
  removePlacement,
  setProfileStyle,
  setRowSpan,
  setSpan,
  setZoneRect,
  toggleVisible,
  updatePlacement,
} from "./studio-actions";

const zone = (
  id: string,
  colStart: number,
  rowStart: number,
  colSpan: number,
  rowSpan: number,
  extra: Partial<Placement> = {}
): Placement => ({
  id,
  module: "mod",
  colStart,
  rowStart,
  colSpan,
  rowSpan,
  visible: true,
  ...extra,
});

const profile = (placements: Placement[], cols = 12, rows = 6): MonitorProfile => ({
  id: "prof",
  name: "Test",
  width: 1920,
  height: 1080,
  cols,
  rows,
  fit: "scroll",
  placements,
});

const panel: PanelDef = {
  id: "panel",
  title: "Preset panel",
  titleVisible: true,
  visible: true,
  background: "panel",
  widgets: [],
};

const preset = (colSpan: number, rowSpan: number): PanelPreset => ({
  id: "pp",
  title: "Preset",
  colSpan,
  rowSpan,
  make: () => ({ ...panel }),
});

describe("updatePlacement", () => {
  it("maps only the matching placement and leaves the input untouched", () => {
    const before = profile([zone("a", 1, 1, 2, 1), zone("b", 3, 1, 2, 1)]);
    const after = updatePlacement(before, "b", (p) => ({ ...p, module: "x" }));
    expect(after.placements.map((p) => p.module)).toEqual(["mod", "x"]);
    expect(after.placements[0]).toBe(before.placements[0]);
    expect(before.placements[1].module).toBe("mod");
  });
});

describe("addModulePlacement", () => {
  it("appends at the first free slot, visible, with the given id", () => {
    const after = addModulePlacement(profile([zone("a", 1, 1, 4, 1)]), "new", "cpu", {
      cols: 3,
      rows: 2,
    });
    expect(after.placements).toHaveLength(2);
    expect(after.placements[1]).toEqual({
      id: "new",
      module: "cpu",
      colStart: 5,
      rowStart: 1,
      colSpan: 3,
      rowSpan: 2,
      visible: true,
    });
  });

  it("clamps the size to the grid and falls back to the top-left when full", () => {
    const full = profile([zone("a", 1, 1, 4, 2)], 4, 2);
    const after = addModulePlacement(full, "new", "cpu", { cols: 9, rows: 9 });
    expect(after.placements[1]).toMatchObject({
      colStart: 1,
      rowStart: 1,
      colSpan: 4,
      rowSpan: 2,
    });
  });
});

describe("addPresetPlacement", () => {
  it("appends a panel placement built by the preset", () => {
    const after = addPresetPlacement(profile([]), "pnl", preset(6, 3));
    expect(after.placements[0]).toEqual({
      id: "pnl",
      module: PANEL_ID,
      colStart: 1,
      rowStart: 1,
      colSpan: 6,
      rowSpan: 3,
      visible: true,
      panel,
    });
  });
});

describe("addBlankZone / setZoneRect", () => {
  it("adds a blank zone at the given box", () => {
    const after = addBlankZone(profile([]), "z", { col: 2, row: 3, cols: 4, rows: 2 });
    expect(after.placements[0]).toEqual({
      id: "z",
      module: BLANK_MODULE,
      colStart: 2,
      rowStart: 3,
      colSpan: 4,
      rowSpan: 2,
      visible: true,
    });
  });

  it("writes a zone's box as given", () => {
    const after = setZoneRect(profile([zone("a", 1, 1, 2, 1)]), "a", {
      col: 5,
      row: 2,
      cols: 3,
      rows: 4,
    });
    expect(after.placements[0]).toMatchObject({
      colStart: 5,
      rowStart: 2,
      colSpan: 3,
      rowSpan: 4,
    });
  });
});

describe("placement toggles", () => {
  it("sets the column span", () => {
    expect(setSpan(profile([zone("a", 1, 1, 2, 1)]), "a", 5).placements[0].colSpan).toBe(5);
  });

  it("sets the row span", () => {
    const after = setRowSpan(profile([zone("a", 1, 1, 2, 1), zone("b", 3, 1, 2, 1)]), "a", 3);
    expect(after.placements.map((p) => p.rowSpan)).toEqual([3, 1]);
  });

  it("toggles visibility", () => {
    const p = profile([zone("a", 1, 1, 2, 1)]);
    expect(toggleVisible(p, "a").placements[0].visible).toBe(false);
    expect(toggleVisible(toggleVisible(p, "a"), "a").placements[0].visible).toBe(true);
  });

  it("removes by id", () => {
    const after = removePlacement(profile([zone("a", 1, 1, 2, 1), zone("b", 3, 1, 2, 1)]), "a");
    expect(after.placements.map((p) => p.id)).toEqual(["b"]);
  });
});

describe("duplicatePlacement", () => {
  it("inserts a copy with a new id right after the original", () => {
    const before = profile([
      zone("a", 1, 1, 2, 1, { settings: { x: 1 } }),
      zone("b", 3, 1, 2, 1),
    ]);
    const after = duplicatePlacement(before, "a");
    expect(after.placements).toHaveLength(3);
    expect(after.placements[0].id).toBe("a");
    expect(after.placements[2].id).toBe("b");
    const copy = after.placements[1];
    expect(copy.id).not.toBe("a");
    expect(copy.id.startsWith("mod-")).toBe(true);
    expect(copy.settings).toEqual({ x: 1 });
    expect(copy.settings).not.toBe(before.placements[0].settings);
  });

  it("returns the same profile for an unknown id", () => {
    const before = profile([zone("a", 1, 1, 2, 1)]);
    expect(duplicatePlacement(before, "nope")).toBe(before);
  });
});

describe("widget assignment", () => {
  it("clears a zone back to blank", () => {
    const before = profile([zone("a", 1, 1, 2, 1, { panel, settings: { x: 1 } })]);
    expect(clearWidget(before, "a").placements[0]).toMatchObject({
      module: BLANK_MODULE,
      panel: undefined,
      settings: undefined,
    });
  });

  it("grows a zone to the module's minimum, shifting it back inside the grid", () => {
    const before = profile([zone("a", 11, 6, 1, 1, { settings: { x: 1 } })], 12, 6);
    expect(assignModule(before, "a", "cpu", { cols: 3, rows: 2 }).placements[0]).toEqual({
      id: "a",
      module: "cpu",
      colStart: 10,
      rowStart: 5,
      colSpan: 3,
      rowSpan: 2,
      visible: true,
      panel: undefined,
      settings: undefined,
    });
  });

  it("never shrinks a zone and caps growth at the grid size", () => {
    const before = profile([zone("a", 1, 1, 5, 3)], 4, 2);
    expect(assignModule(before, "a", "cpu", { cols: 2, rows: 1 }).placements[0]).toMatchObject({
      colSpan: 4,
      rowSpan: 2,
    });
  });

  it("assigns a preset panel and grows to its footprint", () => {
    const before = profile([zone("a", 2, 2, 1, 1)]);
    expect(assignPreset(before, "a", preset(4, 2)).placements[0]).toMatchObject({
      module: PANEL_ID,
      panel,
      settings: undefined,
      colStart: 2,
      rowStart: 2,
      colSpan: 4,
      rowSpan: 2,
    });
  });
});

describe("changeCols / changeRows", () => {
  it("clamps the column count to 2–24 and pulls zones inside", () => {
    const before = profile([zone("a", 10, 1, 3, 1), zone("b", 12, 1, 1, 1)], 12, 6);
    const after = changeCols(before, -4);
    expect(after.cols).toBe(8);
    expect(after.placements[0]).toMatchObject({ colStart: 8, colSpan: 1 });
    expect(after.placements[1]).toMatchObject({ colStart: 8, colSpan: 1 });
    expect(changeCols(profile([], 2), -1).cols).toBe(2);
    expect(changeCols(profile([], 24), 1).cols).toBe(24);
  });

  it("clamps the row count to 1–24 and pulls zones inside", () => {
    const before = profile([zone("a", 1, 3, 1, 4)], 12, 6);
    const after = changeRows(before, -2);
    expect(after.rows).toBe(4);
    expect(after.placements[0]).toMatchObject({ rowStart: 3, rowSpan: 2 });
    expect(changeRows(profile([], 12, 1), -1).rows).toBe(1);
    expect(changeRows(profile([], 12, 24), 1).rows).toBe(24);
  });
});

describe("setProfileStyle", () => {
  it("stores the style, or undefined when it is empty", () => {
    const styled = setProfileStyle(profile([]), (s) => ({ ...s, surface: "glass" }));
    expect(styled.style).toEqual({ surface: "glass" });
    expect(setProfileStyle(styled, () => ({})).style).toBeUndefined();
  });
});
