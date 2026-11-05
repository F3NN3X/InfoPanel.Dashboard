// A widget's views as presets (D-5): read without touching what is saved (G1), and picked as Add would add them.
import { describe, expect, it } from "vitest";
import { addCatalog, widgetRows } from "@/components/studio/add-catalog";
import { currentView, viewChange, viewHolds, viewKeyOf, viewsOf } from "@/components/studio/editor/view-presets";
import { modules } from "@/modules";
import type { DashboardModule } from "@/modules/types";

const mod = (views: DashboardModule["views"], rest: Partial<DashboardModule> = {}) => ({ id: "M", views, ...rest }) as DashboardModule;
const two = mod([
  { id: "full", name: "Full" },
  { id: "bare", name: "Bare", applies: { a: false, b: 2 } },
]);

describe("view presets", () => {
  it("offers none for a widget with no choice of view", () => {
    expect(viewsOf(mod(undefined))).toEqual([]);
    expect(viewsOf(mod([{ id: "one", name: "One" }]))).toEqual([]);
    expect(viewsOf(undefined)).toEqual([]);
  });

  it("reads the saved view, else the setting's default, else the first, and never a stale id", () => {
    expect(currentView(two, { view: "bare" })).toBe("bare");
    expect(currentView(two, { view: "gone" })).toBe("full");
    expect(currentView(mod(two.views, { settings: [{ key: "view", default: "bare" }] as DashboardModule["settings"] }), {})).toBe("bare");
    expect(currentView(mod(two.views, { viewKey: "layout" }), { layout: "bare", view: "full" })).toBe("bare");
  });

  it("clears another view's bundle only while it still holds that view's value", () => {
    expect(viewChange(two, "bare", {})).toEqual({ patch: { view: "bare", a: false, b: 2 }, clear: [] });
    expect(viewChange(two, "full", { view: "bare", a: false, b: 2 })).toEqual({ patch: { view: "full" }, clear: ["a", "b"] });
    expect(viewChange(two, "full", { view: "bare", a: true, b: 2 }).clear).toEqual(["b"]);
  });

  it("holds a view only while its toggles keep the bundle, a toggle never set reading as its default", () => {
    expect(viewHolds(two, "bare", { view: "bare", a: false, b: 2 })).toBe(true);
    expect(viewHolds(two, "bare", { view: "bare", a: true, b: 2 })).toBe(false);
    expect(viewHolds(two, "full", {})).toBe(true);
    const withDefaults = mod(two.views, { settings: [{ key: "a", default: false }, { key: "b", default: 2 }] as DashboardModule["settings"] });
    expect(viewHolds(withDefaults, "bare", { view: "bare" })).toBe(true);
  });

  it("writes what Add wrote for every view of every widget", () => {
    const rows = widgetRows(addCatalog().widget).filter((r) => r.drop.settings);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const m = modules.find((x) => x.id === row.drop.id) as DashboardModule;
      const id = row.drop.settings?.[viewKeyOf(m)] as string;
      expect(viewChange(m, id, {}).patch).toEqual(row.drop.settings);
    }
  });
  it("opens a fresh widget on a tile: Add's settings hold their view, and a view-bearing widget's first view holds with none", () => {
    for (const row of widgetRows(addCatalog().widget)) {
      const m = modules.find((x) => x.id === row.drop.id) as DashboardModule;
      if (viewsOf(m).length === 0) continue;
      const settings = row.drop.settings;
      expect(viewHolds(m, currentView(m, settings), settings), `${m.id} ${row.drop.settings?.[viewKeyOf(m)] ?? ""}`).toBe(true);
    }
  });
});
