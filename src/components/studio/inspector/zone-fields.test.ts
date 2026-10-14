import { describe, expect, it } from "vitest";
import type { Placement } from "@/lib/layout";
import { PANEL_SETTINGS } from "@/modules/standard-settings";
import type { ModuleSetting } from "@/modules/types";
import { shownValue, shownValues, withoutSettings, withSettings, zoneDefs, zoneLookValues } from "./zone-fields";

const zone = (patch: Partial<Placement>): Placement => ({
  id: "z",
  module: "SystemOverview",
  colStart: 1,
  rowStart: 1,
  colSpan: 2,
  rowSpan: 1,
  visible: true,
  ...patch,
});

const accent: ModuleSetting = { key: "accent", label: "Accent", type: "color", default: "" };
const title: ModuleSetting = { key: "label", label: "Title", type: "text", default: "" };

describe("withSettings", () => {
  it("switches a following zone to Custom on a look edit, in the same change", () => {
    const next = withSettings(zone({ styleMode: "follow" }), { accent: "#ff0000" }, false);
    expect(next.settings).toEqual({ accent: "#ff0000" });
    expect(next.styleMode).toBe("custom");
  });

  it("leaves the mode alone for content edits and while forced", () => {
    expect(withSettings(zone({ styleMode: "follow" }), { label: "CPU" }, false).styleMode).toBe("follow");
    expect(withSettings(zone({ styleMode: "follow" }), { accent: "#fff" }, true).styleMode).toBe("follow");
  });

  it("drops settings", () => {
    expect(withoutSettings(zone({ settings: { accent: "#fff", label: "x" } }), ["accent"]).settings).toEqual({ label: "x" });
  });
});

describe("shownValue", () => {
  const appearance = { dashboard: { accent: "#00ff00" }, enforce: false };

  it("shows the own value over the inherited one, unless the zone follows", () => {
    const own = zone({ settings: { accent: "#ff0000", label: "CPU" } });
    expect(shownValue(zoneLookValues(own, appearance), "accent", accent)).toBe("#ff0000");
    const following = zoneLookValues({ ...own, styleMode: "follow" }, appearance);
    expect(shownValue(following, "accent", accent)).toBe("#00ff00");
    // Content settings are never ignored.
    expect(shownValue(following, "label", title)).toBe("CPU");
  });

  it("falls back to the default and collects every key", () => {
    const values = zoneLookValues(zone({}), { enforce: false });
    expect(shownValues(values, [accent, title])).toEqual({ accent: "", label: "" });
  });
});

describe("zoneDefs", () => {
  it("gives a panel the panel schema and an unknown module none", () => {
    expect(zoneDefs(zone({ module: "panel", panel: { title: "P", widgets: [] } as unknown as Placement["panel"] }))).toBe(
      PANEL_SETTINGS
    );
    expect(zoneDefs(zone({ module: "blank" }))).toEqual([]);
  });
});
