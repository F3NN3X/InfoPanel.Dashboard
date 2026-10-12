import { describe, expect, it } from "vitest";
import { canvasMenu, menuAction, zoneMenu, type MenuItemId, type MenuSpec, type ZoneMenuState } from "./zone-menu";

const base: ZoneMenuState = { count: 1, panel: false, anyVisible: true, canPasteStyle: true, canStep: () => true };
const ids = (spec: MenuSpec) => spec.filter((e) => e !== "separator").map((e) => (e as { id: MenuItemId }).id);
const item = (spec: MenuSpec, id: MenuItemId) => spec.find((e) => e !== "separator" && e.id === id);

describe("zoneMenu", () => {
  it("keeps every old toolbar action in the single-zone menu", () => {
    expect(ids(zoneMenu(base))).toEqual([
      "pick",
      "edit-style",
      "bind-data",
      "duplicate",
      "visible",
      "narrower",
      "wider",
      "shorter",
      "taller",
      "copy-style",
      "paste-style",
      "follow-global",
      "global-all",
      "global-profile",
      "deselect",
      "remove",
    ]);
  });

  it("offers Save to My panels for panels only", () => {
    expect(ids(zoneMenu(base))).not.toContain("save-panel");
    expect(ids(zoneMenu({ ...base, panel: true }))).toContain("save-panel");
  });

  it("toggles the Hide / Show label", () => {
    expect(item(zoneMenu(base), "visible")).toMatchObject({ label: "Hide" });
    expect(item(zoneMenu({ ...base, anyVisible: false }), "visible")).toMatchObject({ label: "Show" });
  });

  it("disables blocked size steps and Paste without a copied style", () => {
    const spec = zoneMenu({ ...base, canPasteStyle: false, canStep: (cols) => cols > 0 });
    expect(item(spec, "narrower")).toMatchObject({ disabled: true });
    expect(item(spec, "wider")).toMatchObject({ disabled: false });
    expect(item(spec, "paste-style")).toMatchObject({ disabled: true });
  });

  it("marks Delete as danger", () => {
    expect(item(zoneMenu(base), "remove")).toMatchObject({ danger: true });
  });

  it("drops the single-zone rows for a multi-selection, without doubled separators", () => {
    const spec = zoneMenu({ ...base, count: 3, panel: true });
    expect(ids(spec)).toEqual(["edit-style", "duplicate", "visible", "copy-style", "paste-style", "follow-global", "deselect", "remove"]);
    expect(spec.every((e, i) => e !== "separator" || (i > 0 && spec[i - 1] !== "separator"))).toBe(true);
    expect(spec[0]).not.toBe("separator");
    expect(spec.at(-1)).not.toBe("separator");
  });
});

describe("canvasMenu", () => {
  it("lists the canvas rows", () => {
    expect(ids(canvasMenu())).toEqual(["add-widget", "select-all", "zoom-fit", "edit-theme", "shortcuts"]);
  });
});

describe("menuAction", () => {
  it("maps every row of both menus to a command", () => {
    const all = [...zoneMenu({ ...base, panel: true }), ...canvasMenu()];
    for (const id of ids(all)) expect(menuAction(id).type).toBeTruthy();
  });

  it("maps the size steps to resize-step deltas", () => {
    expect(menuAction("narrower")).toEqual({ type: "resize-step", cols: -1, rows: 0 });
    expect(menuAction("taller")).toEqual({ type: "resize-step", cols: 0, rows: 1 });
    expect(menuAction("global-profile")).toEqual({ type: "use-global", target: "profile" });
  });

  it("opens the Add drawer for Add widget", () => {
    expect(menuAction("add-widget")).toEqual({ type: "drawer", drawer: "add" });
  });
});
