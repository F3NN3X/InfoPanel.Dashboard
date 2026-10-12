import { describe, expect, it } from "vitest";
import {
  BLANK_MODULE,
  PANEL_ID,
  type MonitorProfile,
  type PanelDef,
  type Placement,
} from "@/lib/layout";
import { userPanelPreset, type PanelPreset } from "@/lib/panelPresets";
import {
  addBlankZone,
  addModuleAt,
  addPresetAt,
  canGrowTo,
  followGlobalStyle,
  pasteStyleToZones,
  withSampleZones,
  addModulePlacement,
  addPresetPlacement,
  assignModule,
  assignPreset,
  changeCols,
  changeRows,
  clearWidget,
  duplicatePlacement,
  duplicateZones,
  removePlacement,
  removeZones,
  setProfileStyle,
  setRowSpan,
  setSpan,
  setZoneRect,
  setZoneRects,
  toggleVisible,
  toggleZonesVisible,
  updatePlacement,
  zoneMinSize,
} from "./studio-actions";
import { ALL_MODULES } from "./studio-modules";

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

/** The preset's panel as a new zone gets it: normalized (a wrapping row stack). */
const normalized: PanelDef = { ...panel, layout: "stack", direction: "row", wrap: true };

/** A saved panel with its own look. */
const saved = userPanelPreset({
  id: "mine",
  name: "Mine",
  colSpan: 3,
  rowSpan: 2,
  panel: { ...panel, layout: "grid", columns: 2, widgets: [{ id: "w1", kind: "stat", sensor: "s", visible: true }] },
  settings: { label: "Mine", surface: "glass", accent: "#ff0000" },
});

describe("addPresetPlacement", () => {
  it("appends a panel placement built by the preset, migrated (title → label; the card stays a render-time layer)", () => {
    const after = addPresetPlacement(profile([]), "pnl", preset(6, 3));
    expect(after.placements[0]).toEqual({
      id: "pnl",
      module: PANEL_ID,
      colStart: 1,
      rowStart: 1,
      colSpan: 6,
      rowSpan: 3,
      visible: true,
      panel: normalized,
      settings: { label: "Preset panel" },
    });
  });

  it("adds a saved panel as a fresh copy with its own look", () => {
    const after = addPresetPlacement(profile([]), "pnl", saved).placements[0];
    expect(after).toMatchObject({ colSpan: 3, rowSpan: 2, settings: { label: "Mine", surface: "glass", accent: "#ff0000" } });
    expect(after.panel).toMatchObject({ layout: "grid", columns: 2 });
    expect(after.panel!.id).not.toBe("panel");
    expect(after.panel!.widgets).toHaveLength(1);
    expect(after.panel!.widgets[0]).toMatchObject({ kind: "stat", sensor: "s" });
    expect(after.panel!.widgets[0].id).not.toBe("w1");
    // Two uses never share ids.
    const again = addPresetPlacement(profile([]), "pnl", saved).placements[0];
    expect(again.panel!.widgets[0].id).not.toBe(after.panel!.widgets[0].id);
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

  it("keeps the zone's box when growing would cover a neighbour", () => {
    const before = profile([zone("a", 1, 1, 2, 1), zone("b", 3, 1, 2, 1)]);
    expect(assignModule(before, "a", "cpu", { cols: 3, rows: 1 }).placements[0]).toMatchObject({
      colStart: 1,
      rowStart: 1,
      colSpan: 2,
      rowSpan: 1,
    });
    expect(assignPreset(before, "a", preset(3, 2)).placements[0]).toMatchObject({
      colSpan: 2,
      rowSpan: 1,
    });
  });

  it("never shrinks a zone and caps growth at the grid size", () => {
    const before = profile([zone("a", 1, 1, 5, 3)], 4, 2);
    expect(assignModule(before, "a", "cpu", { cols: 2, rows: 1 }).placements[0]).toMatchObject({
      colSpan: 4,
      rowSpan: 2,
    });
  });

  it("assigns a preset panel and grows to its footprint, replacing the zone's settings with the panel's", () => {
    const before = profile([zone("a", 2, 2, 1, 1, { settings: { x: 1 } })]);
    expect(assignPreset(before, "a", preset(4, 2)).placements[0]).toEqual({
      id: "a",
      module: PANEL_ID,
      panel: normalized,
      settings: { label: "Preset panel" },
      colStart: 2,
      rowStart: 2,
      colSpan: 4,
      rowSpan: 2,
      visible: true,
    });
  });

  it("assigns a saved panel with its settings", () => {
    const before = profile([zone("a", 1, 1, 1, 1, { settings: { x: 1 } })]);
    const after = assignPreset(before, "a", saved).placements[0];
    expect(after.settings).toEqual({ label: "Mine", surface: "glass", accent: "#ff0000" });
    expect(after).toMatchObject({ colSpan: 3, rowSpan: 2, panel: { layout: "grid" } });
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

describe("setZoneRects", () => {
  it("sets the listed zones' boxes and leaves the rest", () => {
    const before = profile([zone("a", 1, 1, 2, 1), zone("b", 3, 1, 2, 1), zone("c", 5, 1, 1, 1)]);
    const after = setZoneRects(before, {
      a: { col: 1, row: 2, cols: 2, rows: 1 },
      b: { col: 3, row: 2, cols: 3, rows: 2 },
    });
    expect(after.placements.map((p) => [p.id, p.colStart, p.rowStart, p.colSpan, p.rowSpan])).toEqual([
      ["a", 1, 2, 2, 1],
      ["b", 3, 2, 3, 2],
      ["c", 5, 1, 1, 1],
    ]);
    expect(after.placements[2]).toBe(before.placements[2]);
  });
});

describe("removeZones", () => {
  it("removes every listed zone", () => {
    const before = profile([zone("a", 1, 1, 1, 1), zone("b", 2, 1, 1, 1), zone("c", 3, 1, 1, 1)]);
    expect(removeZones(before, ["a", "c", "x"]).placements.map((p) => p.id)).toEqual(["b"]);
  });
});

describe("toggleZonesVisible", () => {
  it("hides the whole set while any member shows", () => {
    const before = profile([
      zone("a", 1, 1, 1, 1, { visible: false }),
      zone("b", 2, 1, 1, 1),
      zone("c", 3, 1, 1, 1),
    ]);
    const after = toggleZonesVisible(before, ["a", "b"]);
    expect(after.placements.map((p) => p.visible)).toEqual([false, false, true]);
  });

  it("shows the whole set when every member is hidden", () => {
    const before = profile([zone("a", 1, 1, 1, 1, { visible: false }), zone("b", 2, 1, 1, 1, { visible: false })]);
    expect(toggleZonesVisible(before, ["a", "b"]).placements.map((p) => p.visible)).toEqual([true, true]);
  });
});

describe("duplicateZones", () => {
  it("copies each zone to the first free spot of its size, rows first", () => {
    const before = profile([zone("a", 1, 1, 2, 1, { settings: { x: 1 } }), zone("b", 3, 1, 4, 2)], 6, 4);
    const { profile: after, copies } = duplicateZones(before, ["a", "b"]);
    expect(copies).toHaveLength(2);
    const [ca, cb] = copies.map((id) => after.placements.find((p) => p.id === id)!);
    expect([ca.colStart, ca.rowStart, ca.colSpan, ca.rowSpan]).toEqual([1, 2, 2, 1]);
    // b's copy can't sit beside it; the earlier copy counts as taken.
    expect([cb.colStart, cb.rowStart, cb.colSpan, cb.rowSpan]).toEqual([1, 3, 4, 2]);
    expect(ca.settings).toEqual({ x: 1 });
    expect(ca.settings).not.toBe(before.placements[0].settings);
  });

  it("skips a zone with no free spot and keeps the profile when nothing fits", () => {
    const full = profile([zone("a", 1, 1, 2, 2)], 2, 2);
    const result = duplicateZones(full, ["a"]);
    expect(result.copies).toEqual([]);
    expect(result.profile).toBe(full);
  });
});

describe("zoneMinSize", () => {
  it("uses the widget's minimum, and 1×1 for blank zones and panels", () => {
    const m = ALL_MODULES[0];
    expect(zoneMinSize(zone("a", 1, 1, 1, 1, { module: m.id }))).toEqual({ cols: m.minCols, rows: m.minRows });
    expect(zoneMinSize(zone("b", 1, 1, 1, 1, { module: BLANK_MODULE }))).toEqual({ cols: 1, rows: 1 });
    expect(zoneMinSize(zone("c", 1, 1, 1, 1, { module: PANEL_ID }))).toEqual({ cols: 1, rows: 1 });
  });
});

describe("addModuleAt / addPresetAt", () => {
  it("adds at the exact box", () => {
    const after = addModuleAt(profile([]), "n", "cpu", { col: 5, row: 2, cols: 3, rows: 2 });
    expect(after.placements[0]).toMatchObject({ id: "n", module: "cpu", colStart: 5, rowStart: 2, colSpan: 3, rowSpan: 2 });
    const p = addPresetAt(profile([]), "n", preset(2, 1), { col: 3, row: 3, cols: 2, rows: 1 });
    expect(p.placements[0]).toMatchObject({ id: "n", module: PANEL_ID, colStart: 3, rowStart: 3 });
    expect(p.placements[0].panel).toBeDefined();
  });
});

describe("canGrowTo", () => {
  const blank = (id: string, c: number, r: number, w: number, h: number) =>
    zone(id, c, r, w, h, { module: BLANK_MODULE });

  it("is true when the zone has the room", () => {
    const p = profile([blank("b", 1, 1, 3, 2)]);
    expect(canGrowTo(p, "b", { cols: 3, rows: 2 })).toBe(true);
    expect(canGrowTo(p, "b", { cols: 5, rows: 2 })).toBe(true);
  });

  it("is false when growing would cover another zone", () => {
    const p = profile([blank("b", 1, 1, 1, 1), zone("o", 2, 1, 2, 1)], 4, 2);
    expect(canGrowTo(p, "b", { cols: 2, rows: 1 })).toBe(false);
  });

  it("is false for an unknown zone", () => {
    expect(canGrowTo(profile([]), "x", { cols: 1, rows: 1 })).toBe(false);
  });
});

describe("pasteStyleToZones", () => {
  it("replaces the look of the set, skipping blanks and other zones", () => {
    const p = profile([
      zone("a", 1, 1, 2, 1, { module: "fpsmodern", settings: { accent: "#f00" } }),
      zone("b", 3, 1, 2, 1, { module: BLANK_MODULE }),
      zone("c", 5, 1, 2, 1, { module: "fpsmodern", settings: { accent: "#0f0" } }),
    ]);
    const out = pasteStyleToZones(p, ["a", "b"], { accent: "#00f" });
    expect(out.placements[0].settings?.accent).toBe("#00f");
    expect(out.placements[1]).toBe(p.placements[1]);
    expect(out.placements[2]).toBe(p.placements[2]);
  });

  it("switches a following zone to custom", () => {
    const p = profile([zone("a", 1, 1, 2, 1, { module: "fpsmodern", styleMode: "follow" })]);
    expect(pasteStyleToZones(p, ["a"], { accent: "#00f" }).placements[0].styleMode).toBe("custom");
  });
});

describe("followGlobalStyle", () => {
  it("sets follow and drops the look keys, keeping content settings", () => {
    const p = profile([zone("a", 1, 1, 2, 1, { module: "cpu", settings: { accent: "#f00", sensor: "x" } })]);
    const out = followGlobalStyle(p, ["a"]).placements[0];
    expect(out.styleMode).toBe("follow");
    expect(out.settings).toEqual({ sensor: "x" });
  });

  it("leaves no settings when nothing is left", () => {
    const p = profile([zone("a", 1, 1, 2, 1, { module: "cpu", settings: { accent: "#f00" } })]);
    expect(followGlobalStyle(p, ["a"]).placements[0].settings).toBeUndefined();
  });
});

describe("withSampleZones", () => {
  it("takes the sample's grid and fresh copies of its zones", () => {
    const sample = profile([zone("s1", 1, 1, 2, 1), zone("s2", 3, 1, 2, 1)], 8, 3);
    const out = withSampleZones(profile([]), sample);
    expect(out).toMatchObject({ id: "prof", cols: 8, rows: 3 });
    expect(out.placements).toHaveLength(2);
    expect(out.placements.map((p) => p.id)).not.toContain("s1");
  });
});
