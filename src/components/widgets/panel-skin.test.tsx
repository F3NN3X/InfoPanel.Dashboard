import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { newPanel, newWidget, type WidgetKind } from "@/lib/layout";
import { arcv2Profile } from "@/lib/__fixtures__/arcv2-profile";
import { sampleProfile } from "@/lib/__fixtures__/sample-profile";
import { allPlacements } from "@/lib/pages";
import { panelPresets } from "@/lib/panelPresets";
import type { PanelDef } from "@/lib/panel-model";
import type { ModuleSettings } from "@/modules/types";
import { PanelView } from "./PanelView";

const sensors = fixtureSensors();

const shipped: [string, PanelDef, ModuleSettings | undefined][] = [
  ...panelPresets.map((p) => [`preset ${p.id}`, p.make(), p.settings] as [string, PanelDef, ModuleSettings | undefined]),
  ...[sampleProfile(), arcv2Profile()].flatMap((prof) =>
    allPlacements(prof).filter((pl) => pl.panel).map((pl, i) => [`${prof.id} panel ${i}`, pl.panel!, pl.settings] as [string, PanelDef, ModuleSettings | undefined])
  ),
];

/** Ids are generated per run; everything else must stay byte-identical. */
const html = (panel: PanelDef, settings?: ModuleSettings) =>
  renderToString(createElement(PanelView, { panel, settings, sensors })).replace(/(data-(?:panel|widget)-id=")[^"]*"/g, '$1"');

describe("panel widgets with skin auto", () => {
  // The clock widget renders the current time.
  beforeAll(() => vi.useFakeTimers({ now: new Date(2026, 0, 5, 13, 45, 12), toFake: ["Date"] }));
  afterAll(() => vi.useRealTimers());

  it.each(shipped)("%s renders as before", (_name, panel, settings) => {
    expect(html(panel, settings)).toMatchSnapshot();
  });
  it("treats an explicit auto like an unset skin", () => {
    const [, panel, settings] = shipped[1];
    expect(html(panel, { ...settings, skin: "auto", graph: "auto", meter: "auto" })).toBe(html(panel, settings));
  });
});

/** One panel with a sensor-less widget of each kind, so the renderers draw their empty states. */
const kinds = (...list: WidgetKind[]): PanelDef => ({ ...newPanel("Skin"), widgets: list.map((k) => ({ ...newWidget(k), visible: true, label: k })) });
const draw = (kind: WidgetKind, settings: ModuleSettings) => html(kinds(kind), settings);

describe("panel widgets with a skin set", () => {
  it("draws a bar with the core meter in the chosen style", () => {
    expect(draw("bar", { skin: "default" })).toContain("rounded-full");
    expect(draw("bar", { skin: "default", meter: "blocks" })).toContain("rounded-[1px]");
    expect(draw("bar", { skin: "tui" })).not.toBe(draw("bar", {}));
  });
  it("draws a gauge with the core ring", () => {
    expect(draw("gauge", {})).not.toContain("viewBox=\"0 0 100 100\"");
    expect(draw("gauge", { skin: "default" })).toContain("viewBox=\"0 0 100 100\"");
  });
  it("draws a sparkline with the core graph", () => {
    expect(draw("sparkline", {})).toContain("wp-spark");
    expect(draw("sparkline", { skin: "default" })).toContain("wp-spark h-12");
  });
  it("sets the skin's numerals on stat, value and clock", () => {
    for (const kind of ["stat", "value", "clock"] as const) expect(draw(kind, { skin: "tui" })).not.toBe(draw(kind, {}));
  });
  it("maps the core text and track variables onto the panel", () => {
    expect(draw("stat", { skin: "default" })).toContain("--w-track");
    expect(draw("stat", {})).not.toContain("--w-track");
  });
});
