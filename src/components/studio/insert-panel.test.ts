import { describe, expect, it, vi } from "vitest";
import type { DashboardModule } from "@/modules/types";
import { CARDS_ID } from "@/lib/layout";
import { INSERT_CATEGORIES, filterInsertables, insertDropSize, insertGroups, insertables, type Insertable } from "./insert-panel";

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
    expect(ids(filterInsertables(items, "", "Gaming"))).toEqual([]);
  });
});

describe("insertables", () => {
  const INSERTABLES = insertables();

  it("lists widgets (including Other sensors) and panel presets", () => {
    const cards = INSERTABLES.find((i) => i.id === CARDS_ID);
    expect(cards).toMatchObject({ kind: "module", title: "Other sensors", category: "Generic" });
    expect(INSERTABLES.some((i) => i.kind === "panel")).toBe(true);
  });

  it("files the legacy modules under the new chips", () => {
    const category = (id: string) => INSERTABLES.find((i) => i.kind === "module" && i.id === id)?.category;
    // Superseded by SystemOverview in the Library (phase 9.4); existing zones still load.
    expect(category("systemmodern")).toBeUndefined();
    expect(category("SystemOverview")).toBe("System");
    expect(category("hardwaremodern")).toBeUndefined();
    expect(category("Thermals")).toBe("Hardware");
    // Ported onto a template: the template's own entry stays, the legacy id is hidden from the Library.
    expect(category("networkmodern")).toBeUndefined();
    expect(category("NetworkThroughput")).toBe("Network");
    expect(category("spotifymodern")).toBe("Media");
    expect(category("mediamodern")).toBe("Media");
    expect(category("audiomodern")).toBeUndefined();
    expect(category("wavelinkmodern")).toBeUndefined();
    for (const id of ["AudioMeter", "MeterBridge", "VolumeMixer", "WaveLink"]) expect(category(id), id).toBe("Audio");
    expect(category("weathermodern")).toBeUndefined();
    for (const id of ["Weather", "Departures", "Notifications", "TextFile"]) expect(category(id), id).toBe("Info");
    // fpsmodern and steammodern are aliases of templates: hidden from the Library, the templates stay.
    for (const [alias, template] of [["fpsmodern", "FpsMonitor"], ["steammodern", "GameSpotlight"]]) {
      expect(INSERTABLES.some((i) => i.kind === "module" && i.id === alias), alias).toBe(false);
      expect(category(template), template).toBe("Gaming");
    }
    for (const id of ["vbz", "notifications", "textfile", "bluetoothmodern", "streamdeck", "webpage"]) expect(category(id), id).toBeUndefined();
    for (const id of ["Bluetooth", "StreamDeck", "WebPage", CARDS_ID]) expect(category(id), id).toBe("Generic");
  });

  it("has no Other chip", () => {
    expect(INSERT_CATEGORIES).toEqual([
      "All", "Layouts", "My panels", "System", "Hardware", "Storage", "Network", "Media", "Audio", "Info", "Gaming", "Generic",
    ]);
    expect(INSERTABLES.some((i) => (i.category as string) === "Other")).toBe(false);
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
    expect(titles).toEqual([
      "System", "Hardware", "Storage", "Network", "Media", "Audio", "Info", "Gaming", "Generic", "Layout starters", "Panel presets", "My panels",
    ]);
  });

  it("leads the starters with the blank zone and counts widgets, starters and presets", () => {
    const starters = groups.find((g) => g.title === "Layout starters")!;
    expect(starters.items.map((i) => i.title)[0]).toBe("Blank zone");
    expect(starters.items).toHaveLength(7);
    expect(groups.filter((g) => g.items.every((i) => i.kind === "module" && i.id !== "blank"))).toHaveLength(9);
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
    const big: Insertable = { ...item("a", "A", "Generic"), cols: 5, rows: 4 };
    expect(insertDropSize(big, grid)).toEqual({ cols: 5, rows: 4 });
    expect(insertDropSize(big, { cols: 4, rows: 3 })).toEqual({ cols: 4, rows: 3 });
  });

  it("drops a widget at its declared default size, never below its minimum", () => {
    const tpl: Insertable = { ...item("t", "T", "System"), cols: 3, rows: 2, defaultSize: [4, 3] };
    expect(insertDropSize(tpl, grid)).toEqual({ cols: 4, rows: 3 });
    expect(insertDropSize({ ...tpl, defaultSize: [2, 1] }, grid)).toEqual({ cols: 3, rows: 2 });
    expect(insertDropSize(tpl, { cols: 3, rows: 2 })).toEqual({ cols: 3, rows: 2 });
  });

  it("gives a panel its own size, clamped to the grid", () => {
    const panel = { ...item("p", "P", "Generic"), kind: "panel" as const, cols: 6, rows: 2, preset: {} as never };
    expect(insertDropSize(panel, grid)).toEqual({ cols: 6, rows: 2 });
    expect(insertDropSize(panel, { cols: 4, rows: 1 })).toEqual({ cols: 4, rows: 1 });
  });
});

describe("template modules in the Library", () => {
  const template: DashboardModule = {
    id: "tpl-test",
    title: "Template",
    minCols: 3,
    minRows: 2,
    prefixes: ["tpl."],
    render: () => null,
    category: "Storage",
    icon: "hard_drive",
    description: "A template widget",
    defaultSize: [5, 3],
  };
  const hidden: DashboardModule = { ...template, id: "tpl-hidden", libraryHidden: true };
  const unknown: DashboardModule = { ...template, id: "tpl-unknown", category: "Whatever" };

  async function libraryWith(mods: DashboardModule[]) {
    vi.resetModules();
    vi.doMock("@/modules", () => ({ modules: mods }));
    const lib = await import("./insert-panel");
    vi.doUnmock("@/modules");
    return lib;
  }

  it("reads category, icon, description and default size from the module", async () => {
    const lib = await libraryWith([template, unknown]);
    const list = lib.insertables();
    const item = list.find((i) => i.id === "tpl-test")!;
    expect(item).toMatchObject({
      category: "Storage",
      icon: "hard_drive",
      description: "A template widget",
      cols: 3,
      rows: 2,
      defaultSize: [5, 3],
    });
    expect(lib.insertDropSize(item, { cols: 12, rows: 6 })).toEqual({ cols: 5, rows: 3 });
    expect(list.find((i) => i.id === "tpl-unknown")?.category).toBe("Generic");
  });

  it("skips libraryHidden modules", async () => {
    const lib = await libraryWith([template, hidden]);
    const found = lib.insertables().map((i) => i.id);
    expect(found).toContain("tpl-test");
    expect(found).not.toContain("tpl-hidden");
  });
});
