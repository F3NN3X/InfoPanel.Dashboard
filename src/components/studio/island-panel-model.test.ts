import { describe, expect, it } from "vitest";
import type { AlertRule, AlertsConfig } from "@/lib/alerts";
import { defaultConfig, type DashboardConfig, type MonitorProfile, type Placement } from "@/lib/layout";
import { modules } from "@/modules";
import { allSections, widgetContext } from "./inspector-model";
import { islandRules, islandSectionId, islandWidgets, setZoneSetting, unplacedIslandWidgets } from "./island-panel-model";

const zone = (id: string, module: string, settings: Placement["settings"] = {}, visible = true): Placement => ({
  id,
  module,
  colStart: 1,
  rowStart: 1,
  colSpan: 2,
  rowSpan: 2,
  visible,
  settings,
});

function profileWith(pages: { id: string; name: string; placements: Placement[] }[]): MonitorProfile {
  return { ...defaultConfig().profiles[0], id: "p1", pages };
}

describe("islandWidgets", () => {
  const profile = profileWith([
    { id: "a", name: "Main", placements: [zone("z1", "FpsMonitor", { island: true }), zone("z2", "Clock"), zone("z3", "Timer")] },
    { id: "b", name: "Games", placements: [zone("z4", "FpsMonitor", { island: true }), zone("z5", "Weather", { island: true }, false)] },
  ]);

  it("lists the zones with an island source on every page, in order, and skips the rest", () => {
    expect(islandWidgets(profile, modules).map((r) => [r.zoneId, r.pageName, r.on])).toEqual([
      ["z1", "Main", true],
      ["z3", "Main", false],
      ["z4", "Games", true],
      ["z5", "Games", true],
    ]);
  });

  it("marks a second sending zone of the same widget, and a hidden one", () => {
    const rows = islandWidgets(profile, modules);
    expect(rows.find((r) => r.zoneId === "z1")?.shadowed).toBe(false);
    expect(rows.find((r) => r.zoneId === "z4")?.shadowed).toBe(true);
    expect(rows.find((r) => r.zoneId === "z5")).toMatchObject({ visible: false, shadowed: false });
  });

  it("names the island widgets the profile does not place", () => {
    const unplaced = unplacedIslandWidgets(profile, modules);
    expect(unplaced).toContain("Now Playing");
    expect(unplaced).not.toContain(modules.find((m) => m.id === "FpsMonitor")?.title);
    expect(unplaced).toEqual([...unplaced].sort((x, y) => x.localeCompare(y)));
  });
});

describe("setZoneSetting", () => {
  it("sets a zone's setting on another page and leaves everything else as it was", () => {
    const base = defaultConfig();
    const other = { ...base.profiles[0], id: "p2" };
    const config: DashboardConfig = {
      ...base,
      profiles: [profileWith([{ id: "a", name: "Main", placements: [zone("z1", "Clock")] }, { id: "b", name: "Two", placements: [zone("z2", "Timer", { presets: "5" })] }]), other],
    };
    const next = setZoneSetting(config, "p1", "z2", "island", true);
    expect(next.profiles[0].pages[1].placements[0].settings).toEqual({ presets: "5", island: true });
    expect(next.profiles[0].pages[0]).toBe(config.profiles[0].pages[0]);
    expect(next.profiles[1]).toBe(other);
    expect(config.profiles[0].pages[1].placements[0].settings).toEqual({ presets: "5" });
  });
});

describe("islandSectionId", () => {
  it("finds the section holding Send to island, and nothing for a widget without a source", () => {
    const fps = modules.find((m) => m.id === "FpsMonitor");
    const id = islandSectionId(fps);
    expect(id).toBeDefined();
    const section = allSections(widgetContext(fps!)).find((s) => s.id === id);
    expect(section?.settings.some((d) => d.key === "island")).toBe(true);
    expect(islandSectionId(modules.find((m) => m.id === "Clock"))).toBeUndefined();
  });
});

describe("islandRules", () => {
  const rule = (id: string, style: "island" | "toast" | undefined, profiles?: string[]): AlertRule => ({
    id,
    name: id,
    enabled: true,
    severity: "warning",
    source: { kind: "notification" },
    cooldownSeconds: 0,
    outputs: style ? { display: { style } } : {},
    ...(profiles ? { profiles } : {}),
  });
  const alerts = (defaultStyle: "island" | "toast", rules: AlertRule[]): AlertsConfig => ({
    enabled: true,
    rules,
    defaults: { style: defaultStyle, position: "center", backdrop: "none", size: "m", seconds: 0 },
  });

  it("keeps the rules shown as Island on this profile, own style first, then the default", () => {
    const rules = [rule("own", "island"), rule("toast", "toast"), rule("default", undefined), rule("other", "island", ["p2"]), rule("mine", "island", ["p1"])];
    expect(islandRules(alerts("toast", rules), "p1").map((r) => r.id)).toEqual(["own", "mine"]);
    expect(islandRules(alerts("island", rules), "p1").map((r) => r.id)).toEqual(["own", "default", "mine"]);
  });
});
