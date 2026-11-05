import { upgradeConfig } from "@/lib/config-upgrade";
import { describe, expect, it } from "vitest";
import { CONFIG_VERSION, type DashboardConfig } from "@/lib/layout";

// Saved data (G1): InfoPanel export is gone from the app, but the fields it wrote stay in the user's config.
// A config that has them loads and saves them unchanged, from the current shape and from older ones.
describe("fields the InfoPanel export left in a saved config", () => {
  const zone = { id: "z1", module: "CpuMonitor", colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2, visible: true, settings: { ipExport: '{"zone":"snapshot"}', $onInfoPanel: "leave" } };
  const stored = (version: number) => ({
    version,
    profiles: [{ id: "p", name: "P", width: 1920, height: 1080, cols: 12, rows: 6, fit: "fill", madeFor: "infopanel", pages: [{ id: "pg", name: "Main", placements: [zone] }] }],
  });

  it.each([CONFIG_VERSION, 12, 9])("v%i keeps Made for and a zone's saved export choices", (version) => {
    const loaded: DashboardConfig = upgradeConfig(JSON.parse(JSON.stringify(stored(version))));
    const again: DashboardConfig = upgradeConfig(JSON.parse(JSON.stringify(loaded)));
    for (const config of [loaded, again]) {
      expect(config.profiles[0].madeFor).toBe("infopanel");
      expect(config.profiles[0].pages[0].placements.find((p) => p.id === "z1")?.settings).toEqual(zone.settings);
    }
  });
});
