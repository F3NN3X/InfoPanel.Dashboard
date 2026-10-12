import { describe, expect, it } from "vitest";
import type { SheetGroup } from "../category-sheet";
import { cardsBySection, panelState } from "./panel-cards";

const card = (id: string) => ({ id, title: id, terms: [], node: null });

const visual: SheetGroup[] = [
  { heading: "Panel", cards: ["panel:main", "panel:layout", "panel:widgets"].map(card) },
  {
    heading: "Selected widget",
    cards: ["widget:data", "widget:layout", "widget:typography", "widget:colors", "widget:advanced"].map(card),
  },
];

describe("cardsBySection", () => {
  it("files every card under its special section, sharing where two cards make one", () => {
    const map = cardsBySection(visual);
    expect(map.get("panel")?.map((c) => c.id)).toEqual(["panel:main"]);
    expect(map.get("widgetColors")?.map((c) => c.id)).toEqual(["widget:typography", "widget:colors"]);
    expect(map.has("panelJson")).toBe(false);
  });
});

describe("panelState", () => {
  it("reads the code view and the selected widget off the cards", () => {
    expect(panelState(visual, "wrap")).toEqual({ layout: "stack", codeView: false, selectedWidget: true });
    const code: SheetGroup[] = [{ heading: "Panel", cards: [card("panel:main"), card("panel:code")] }];
    expect(panelState(code, "overlay")).toEqual({ layout: "overlay", codeView: true, selectedWidget: false });
  });
});
