import { describe, expect, it } from "vitest";
import { CARDS_ID } from "@/lib/layout";
import { INSERTABLES, filterInsertables, type Insertable } from "./insert-panel";

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

describe("INSERTABLES", () => {
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
