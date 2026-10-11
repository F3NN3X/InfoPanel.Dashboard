import { describe, expect, it } from "vitest";
import { PANEL_ID, type Placement, type Widget } from "@/lib/layout";
import type { ModuleSetting } from "@/modules/types";
import { buildCommands, matchScore, rankCommands, type CommandState } from "./commands";
import { insertables } from "./insert-panel";

const zone = (id: string, colStart: number, rowStart: number, visible = true): Placement => ({
  id,
  module: "blank",
  colStart,
  rowStart,
  colSpan: 1,
  rowSpan: 1,
  visible,
});

const setting = (key: string, label: string, group?: string): ModuleSetting => ({
  key,
  label,
  type: "number",
  default: 0,
  group,
});

const base: CommandState = {
  insertables: [
    { kind: "module", id: "systemmodern", title: "System (modern)" },
    { kind: "panel", id: "cpu", title: "CPU" },
  ],
  profiles: [{ id: "p1", name: "Desk", width: 1920, height: 1080 }],
  placements: [zone("b", 3, 2), zone("a", 1, 1)],
  selected: null,
  settings: [],
  widget: null,
  canPasteWidget: false,
  canUndo: false,
  canRedo: false,
  showGrid: true,
  showSources: false,
};

const ids = (state: CommandState) => buildCommands(state).map((c) => c.id);

describe("buildCommands", () => {
  it("offers adding every widget and panel, profiles with Auto, and zones in reading order", () => {
    const list = ids(base);
    expect(list).toContain("add:module:systemmodern");
    expect(list).toContain("add:panel:cpu");
    expect(list).toContain("profile:auto");
    expect(list).toContain("profile:p1");
    expect(list.filter((id) => id.startsWith("select:"))).toEqual(["select:a", "select:b"]);
    for (const id of ["save", "export", "import", "copy-profile", "shortcuts", "grid", "zoom-fit"]) {
      expect(list).toContain(id);
    }
    expect(list).toContain("drawer:add");
    expect(list).toContain("sources");
  });

  it("lists undo / redo only when there is something to undo / redo", () => {
    expect(ids(base)).not.toContain("undo");
    expect(ids(base)).not.toContain("redo");
    const list = ids({ ...base, canUndo: true, canRedo: true });
    expect(list).toContain("undo");
    expect(list).toContain("redo");
  });

  it("adds the selected zone's actions and its settings, routed to the right tab", () => {
    const glow = setting("glow", "Glow", "Border, glow & CSS");
    const threshold = setting("warnAt", "Warn at", "Thresholds");
    const commands = buildCommands({
      ...base,
      selected: zone("a", 1, 1, false),
      settings: [glow, threshold],
    });
    const byId = new Map(commands.map((c) => [c.id, c]));
    expect(byId.get("zone:visible")?.label).toBe("Show zone");
    expect(byId.has("zone:duplicate")).toBe(true);
    expect(byId.has("zone:remove")).toBe(true);
    expect(byId.has("zone:pick")).toBe(true);
    expect(byId.get("setting:glow")?.action).toEqual({ type: "goto-setting", tab: "style", label: "Glow" });
    expect(byId.get("setting:warnAt")?.action).toEqual({
      type: "goto-setting",
      tab: "content",
      label: "Warn at",
    });
    expect(byId.get("setting:warnAt")?.hint).toBe("Content › Thresholds");
  });

  it("has no zone commands without a selection", () => {
    expect(ids(base).some((id) => id.startsWith("zone:") || id.startsWith("setting:"))).toBe(false);
  });
});

describe("buildCommands with a panel", () => {
  const w = (id: string, label?: string, visible = true): Widget => ({ id, kind: "stat", label, visible });
  const widgets = [w("a", "CPU"), w("b", "GPU", false), w("c")];
  const panelZone: Placement = {
    ...zone("p", 1, 1),
    module: PANEL_ID,
    panel: { id: "pd", title: "Stats", titleVisible: true, visible: true, background: "panel", widgets },
  };

  it("offers selecting each widget of the selected panel by name", () => {
    const commands = buildCommands({ ...base, placements: [panelZone], selected: panelZone });
    const select = commands.filter((c) => c.id.startsWith("select-widget:"));
    expect(select.map((c) => c.label)).toEqual(["Select widget: CPU", "Select widget: GPU", "Select widget: Stat"]);
    expect(select[1]).toMatchObject({ hint: "#2 · hidden", action: { type: "select-widget", id: "b" } });
    expect(ids(base).some((id) => id.startsWith("widget:") || id.startsWith("select-widget:"))).toBe(false);
  });

  it("adds the selected widget's actions, moves only where possible, paste only with a copy", () => {
    const first = ids({ ...base, selected: panelZone, widget: widgets[0] });
    expect(first).toEqual(expect.arrayContaining(["widget:duplicate", "widget:copy", "widget:down", "widget:remove"]));
    expect(first).not.toContain("widget:up");
    expect(first).not.toContain("widget:paste");
    const last = ids({ ...base, selected: panelZone, widget: widgets[2], canPasteWidget: true });
    expect(last).toContain("widget:up");
    expect(last).not.toContain("widget:down");
    expect(last).toContain("widget:paste");
  });

  it("gives Ctrl+D / Del to the widget, not the zone, while one is selected", () => {
    const byId = new Map(buildCommands({ ...base, selected: panelZone, widget: widgets[0] }).map((c) => [c.id, c]));
    expect(byId.get("widget:duplicate")?.hint).toBe("Ctrl+D");
    expect(byId.get("zone:duplicate")?.hint).toBeUndefined();
    expect(byId.get("zone:remove")?.hint).toBeUndefined();
    expect(byId.get("widget:remove")?.action).toEqual({ type: "widget-remove" });
  });
});

describe("buildCommands with saved panels", () => {
  const saved = {
    id: "mine-1",
    name: "My stats",
    panel: { id: "pd", title: "Stats", titleVisible: true, visible: true, background: "panel" as const, widgets: [] },
  };

  it("offers adding the user's saved panels and the layout starters like built-in presets", () => {
    const byId = new Map(buildCommands({ ...base, insertables: insertables([saved]) }).map((c) => [c.id, c]));
    expect(byId.get("add:panel:mine-1")).toMatchObject({
      label: "Add panel: My stats",
      action: { type: "add-preset", id: "mine-1" },
    });
    expect(byId.get("add:panel:layout-stat-row")?.label).toBe("Add panel: Row of stats");
  });

  it("offers saving the selected zone as a preset only for panels", () => {
    const panelZone: Placement = { ...zone("p", 1, 1), module: PANEL_ID, panel: saved.panel };
    expect(ids({ ...base, selected: panelZone })).toContain("zone:save-preset");
    expect(ids({ ...base, selected: zone("a", 1, 1) })).not.toContain("zone:save-preset");
  });

  it("names unlabeled widgets by their sensor, not the full key", () => {
    const widget: Widget = { id: "g", kind: "gauge", sensor: "plugins.InfoPanel.RTSS.rtss.avg-fps", visible: true };
    const panelZone: Placement = { ...zone("p", 1, 1), module: PANEL_ID, panel: { ...saved.panel, widgets: [widget] } };
    const labels = buildCommands({ ...base, selected: panelZone }).map((c) => c.label);
    expect(labels).toContain("Select widget: avg fps");
  });
});

describe("matchScore / rankCommands", () => {
  it("ranks prefix over word start over substring", () => {
    expect(matchScore("System", "sys")).toBe(3);
    expect(matchScore("Add widget: System", "sys")).toBe(2);
    expect(matchScore("Filesystem", "sys")).toBe(1);
    expect(matchScore("Add widget: System", "add sys")).toBe(0.5);
    expect(matchScore("Zoom in", "sys")).toBe(0);
  });

  it("filters and orders commands, keeping the original order for ties", () => {
    const commands = buildCommands(base);
    const ranked = rankCommands(commands, "sys");
    expect(ranked[0].id).toBe("add:module:systemmodern");
    expect(ranked.every((c) => matchScore(c.label, "sys") > 0)).toBe(true);
    expect(rankCommands(commands, "  ")).toEqual(commands);
    expect(rankCommands(commands, "zoom").map((c) => c.id)).toEqual(["zoom-fit", "zoom-in", "zoom-out"]);
  });

  it("ignores case and diacritics", () => {
    expect(matchScore("Écran", "ecr")).toBe(3);
  });
});
