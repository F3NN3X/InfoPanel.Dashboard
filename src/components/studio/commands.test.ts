import { describe, expect, it } from "vitest";
import type { Placement } from "@/lib/layout";
import type { ModuleSetting } from "@/modules/types";
import { buildCommands, matchScore, rankCommands, type CommandState } from "./commands";

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
