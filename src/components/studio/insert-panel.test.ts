import { describe, expect, it } from "vitest";
import { CARDS_ID } from "@/lib/layout";
import { filterInsertables, insertDropSize, insertGroups, insertables, type Insertable } from "./insert-panel";

const item = (
  id: string,
  title: string,
  category: Insertable["category"],
  description?: string
): Insertable => ({ kind: "module", id, title, description, cols: 2, rows: 1, category });

const items = [
  item("systemmodern", "System", "System"),
  item("spotifymodern", "Spotify", "Media"),
  item("networkmodern", "Network", "Network"),
  item("clock", "Clock", "Info", "Time and date with a system clock"),
];

const ids = (list: Insertable[]) => list.map((i) => i.id);

describe("filterInsertables", () => {
  it("returns everything for an empty query and All", () => {
    expect(ids(filterInsertables(items, "", "All"))).toEqual(ids(items));
    expect(ids(filterInsertables(items, "   ", "All"))).toEqual(ids(items));
  });

  it("matches title, id and description case-insensitively", () => {
    expect(ids(filterInsertables(items, "SYS", "All"))).toEqual(["systemmodern", "clock"]);
    expect(ids(filterInsertables(items, "spotifymod", "All"))).toEqual(["spotifymodern"]);
  });

  it("requires every word of the query", () => {
    expect(ids(filterInsertables(items, "clock time", "All"))).toEqual(["clock"]);
    expect(ids(filterInsertables(items, "clock spotify", "All"))).toEqual([]);
  });

  it("filters by category, combined with the query", () => {
    expect(ids(filterInsertables(items, "", "Media"))).toEqual(["spotifymodern"]);
    expect(ids(filterInsertables(items, "sys", "Info"))).toEqual(["clock"]);
    expect(ids(filterInsertables(items, "", "Other"))).toEqual([]);
  });
});

describe("insertables", () => {
  const INSERTABLES = insertables();

  it("lists widgets (including Other sensors) and panel presets", () => {
    const cards = INSERTABLES.find((i) => i.id === CARDS_ID);
    expect(cards).toMatchObject({ kind: "module", title: "Other sensors", category: "Other" });
    expect(INSERTABLES.some((i) => i.kind === "panel")).toBe(true);
  });

  it("files unmapped modules under Other", () => {
    expect(INSERTABLES.find((i) => i.kind === "module" && i.id === "streamdeck")?.category).toBe("Other");
    expect(INSERTABLES.find((i) => i.kind === "module" && i.id === "systemmodern")?.category).toBe("System");
  });
});

describe("insertables with saved panels", () => {
  const saved = {
    id: "panelpreset-1",
    name: "Desk stats",
    colSpan: 3,
    rowSpan: 2,
    panel: { id: "pd", title: "Stats", titleVisible: true, visible: true, background: "panel" as const, widgets: [] },
  };
  const list = insertables([saved]);

  it("files saved panels under My panels and the starters under Layouts", () => {
    expect(list.find((i) => i.id === "panelpreset-1")).toMatchObject({
      kind: "panel",
      title: "Desk stats",
      category: "My panels",
      cols: 3,
      rows: 2,
    });
    expect(list.filter((i) => i.category === "Layouts").map((i) => i.title)).toEqual([
      "Blank zone",
      "Row of stats",
      "2×2 stats",
      "Hero overlay",
      "Gauge row",
      "Clock + date",
      "Label / value list",
    ]);
    expect(list.find((i) => i.id === "cpu")?.category).toBe("System");
  });

  it("searches and filters saved panels like the rest", () => {
    expect(ids(filterInsertables(list, "desk", "All"))).toEqual(["panelpreset-1"]);
    expect(ids(filterInsertables(list, "", "My panels"))).toEqual(["panelpreset-1"]);
    expect(ids(filterInsertables(list, "desk", "System"))).toEqual([]);
    expect(ids(filterInsertables(list, "gauge", "Layouts"))).toEqual(["layout-gauge-row"]);
  });
});

describe("insertGroups", () => {
  const list = insertables([
    {
      id: "panelpreset-1",
      name: "Desk stats",
      colSpan: 3,
      rowSpan: 2,
      panel: { id: "pd", title: "Stats", titleVisible: true, visible: true, background: "panel" as const, widgets: [] },
    },
  ]);
  const groups = insertGroups(list);
  const titles = groups.map((g) => g.title);

  it("groups widgets by category, then starters, panel presets and My panels", () => {
    expect(titles).toEqual(["System", "Media", "Network", "Info", "Other", "Layout starters", "Panel presets", "My panels"]);
  });

  it("leads the starters with the blank zone and counts widgets, starters and presets", () => {
    const starters = groups.find((g) => g.title === "Layout starters")!;
    expect(starters.items.map((i) => i.title)[0]).toBe("Blank zone");
    expect(starters.items).toHaveLength(7);
    expect(groups.filter((g) => g.items.every((i) => i.kind === "module" && i.id !== "blank"))).toHaveLength(5);
    expect(groups.find((g) => g.title === "Panel presets")!.items).toHaveLength(10);
  });

  it("drops empty groups", () => {
    expect(insertGroups(filterInsertables(list, "", "Media")).map((g) => g.title)).toEqual(["Media"]);
    expect(insertGroups([])).toEqual([]);
  });
});

describe("insertDropSize", () => {
  const grid = { cols: 12, rows: 6 };

  it("drops a small widget at 3×2, not its 2×1 minimum", () => {
    expect(insertDropSize(item("systemmodern", "System", "System"), grid)).toEqual({ cols: 3, rows: 2 });
  });

  it("keeps a larger minimum and stays inside a small grid", () => {
    const big: Insertable = { ...item("a", "A", "Other"), cols: 5, rows: 4 };
    expect(insertDropSize(big, grid)).toEqual({ cols: 5, rows: 4 });
    expect(insertDropSize(big, { cols: 4, rows: 3 })).toEqual({ cols: 4, rows: 3 });
  });

  it("gives a panel its own size, clamped to the grid", () => {
    const panel = { ...item("p", "P", "Other"), kind: "panel" as const, cols: 6, rows: 2, preset: {} as never };
    expect(insertDropSize(panel, grid)).toEqual({ cols: 6, rows: 2 });
    expect(insertDropSize(panel, { cols: 4, rows: 1 })).toEqual({ cols: 4, rows: 1 });
  });
});
