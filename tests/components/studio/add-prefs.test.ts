import { describe, expect, it } from "vitest";
import { parseAddFilter, parseChip, startTab, parseDensity, parseLeftPanelWidth, widthFromPx } from "@/components/studio/add-prefs";

describe("Left panel width migration", () => {
  it("moves an old pixel width to the nearest option", () => {
    expect(widthFromPx("232")).toBe("narrow");
    expect(widthFromPx("319")).toBe("narrow");
    expect(widthFromPx("320")).toBe("default");
    expect(widthFromPx("359")).toBe("default");
    expect(widthFromPx("360")).toBe("wide");
    expect(widthFromPx("440")).toBe("wide");
  });

  it("is Narrow (272 px, B6) with nothing (or junk) stored", () => {
    expect(widthFromPx(null)).toBe("narrow");
    expect(widthFromPx("wide-ish")).toBe("narrow");
  });

  it("prefers a stored option over the old pixel width", () => {
    expect(parseLeftPanelWidth("wide", "240")).toBe("wide");
    expect(parseLeftPanelWidth("huge", "240")).toBe("narrow");
    expect(parseLeftPanelWidth(null, null)).toBe("narrow");
  });
});

describe("Widget list density", () => {
  it("is Comfortable unless Compact is stored", () => {
    expect(parseDensity("compact")).toBe("compact");
    expect(parseDensity(null)).toBe("comfortable");
    expect(parseDensity("dense")).toBe("comfortable");
  });
});

describe("Add's segment and chip", () => {
  it("keeps a stored segment and chip, else All", () => {
    expect([parseAddFilter("items"), parseAddFilter("junk"), parseAddFilter(null)]).toEqual(["items", "all", "all"]);
    expect([parseChip("Media"), parseChip(""), parseChip(null)]).toEqual(["Media", "All", "All"]);
  });
});

describe("The tab Add opens on", () => {
  const facts = { takesItems: true, storedChip: "All" };
  it("is Items on a start or an old chip that ask for it", () => {
    expect(startTab({ ...facts, segment: "items" })).toBe("items");
    expect(startTab({ ...facts, storedChip: "InfoPanel" })).toBe("items");
    expect(startTab(facts)).toBe("widget");
  });
  it("is Widgets where the page takes no items, and when a start asks for Widgets", () => {
    expect(startTab({ ...facts, takesItems: false })).toBe("widget");
    expect(startTab({ ...facts, segment: "widgets" })).toBe("widget");
  });
});
