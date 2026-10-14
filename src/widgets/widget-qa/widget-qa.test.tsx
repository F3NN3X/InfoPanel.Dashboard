import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { modules } from "@/modules";
import { TEMPLATE_MODULES } from "@/widgets/registry";
import { INSERT_CATEGORIES } from "@/components/studio/insert-panel";
import type { DashboardModule } from "@/modules/types";
import { DEFAULT_STATE, parseParams, parseSpans, placementSettings, serializeParams } from "./params";
import { filterModules, framePlan, groupByCategory, pickModules, spanSize } from "./plan";
import { GALLERIES, GalleryGrid } from "./Gallery";
import { WidgetSection } from "./Section";
import { PROBE_SELECTOR } from "./probe";

const mod = (id: string, title: string, category?: string, min: [number, number] = [1, 1]): DashboardModule =>
  ({ id, title, category, minCols: min[0], minRows: min[1], prefixes: [], render: () => null }) as DashboardModule;

describe("params", () => {
  it("defaults match the old page", () => {
    expect(parseParams("?widget-qa")).toEqual(DEFAULT_STATE);
    expect(serializeParams(DEFAULT_STATE)).toBe("?widget-qa");
  });
  it("round-trips every param", () => {
    const state = {
      ...DEFAULT_STATE,
      module: ["CpuMonitor", "vbz"],
      spans: "2x1,3x2",
      cell: 150,
      gap: 0,
      skin: "tui",
      variant: "studio",
      surface: "glass",
      graph: "line",
      meter: "pill",
      accent: "#4ade80",
      radius: "12",
      theme: "paper",
      settings: '{"scale":120}',
      data: "fixtures" as const,
      q: "cpu",
      eager: true,
    };
    expect(parseParams(serializeParams(state))).toEqual(state);
  });
  it("keeps module ids readable", () => {
    expect(serializeParams({ ...DEFAULT_STATE, module: ["a", "b"] })).toBe("?widget-qa&module=a,b");
  });
  it("merges look keys under the settings JSON", () => {
    const s = { ...DEFAULT_STATE, skin: "tui", accent: "#fff", settings: '{"skin":"ink","scale":90}' };
    expect(placementSettings(s)).toEqual({ skin: "ink", accent: "#fff", scale: 90 });
    expect(placementSettings({ ...DEFAULT_STATE, settings: "{nope" })).toEqual({});
  });
  it("parses spans and drops bad ones", () => {
    expect(parseSpans("1x1,0x2,3x2,x")).toEqual([[1, 1], [3, 2]]);
  });
});

describe("module selection", () => {
  it("shows only templates by default and exact ids when given", () => {
    expect(pickModules(modules, TEMPLATE_MODULES)).toBe(TEMPLATE_MODULES);
    const legacy = modules.find((m) => !TEMPLATE_MODULES.includes(m));
    if (!legacy) return; // legacy ids may be gone
    expect(pickModules(modules, TEMPLATE_MODULES).map((m) => m.id)).not.toContain(legacy.id);
    expect(pickModules(modules, TEMPLATE_MODULES, [legacy.id]).map((m) => m.id)).toEqual([legacy.id]);
  });
  it("filters by id or title", () => {
    const mods = [mod("CpuMonitor", "CPU"), mod("Clock", "Time")];
    expect(filterModules(mods, "time").map((m) => m.id)).toEqual(["Clock"]);
    expect(filterModules(mods, "cpum").map((m) => m.id)).toEqual(["CpuMonitor"]);
    expect(filterModules(mods, " ")).toBe(mods);
  });
});

describe("grouping", () => {
  const order = ["System", "Media", "Generic"];
  it("orders sections like the Library and sorts by title", () => {
    const sections = groupByCategory([mod("a", "Zed", "Media"), mod("b", "Beta", "System"), mod("c", "Alpha", "System"), mod("d", "Other", "Nope"), mod("e", "None")], order);
    expect(sections.map((s) => [s.category, s.id, s.mods.map((m) => m.title)])).toEqual([
      ["System", "cat-system", ["Alpha", "Beta"]],
      ["Media", "cat-media", ["Zed"]],
      ["Generic", "cat-generic", ["None", "Other"]],
    ]);
  });
  it("drops empty sections", () => {
    expect(groupByCategory([mod("a", "A", "Media")], order).map((s) => s.category)).toEqual(["Media"]);
  });
  it("places every template in a Library category", () => {
    const sections = groupByCategory(TEMPLATE_MODULES, INSERT_CATEGORIES.filter((c) => !["All", "Layouts", "My panels"].includes(c)));
    expect(sections.reduce((n, s) => n + s.mods.length, 0)).toBe(TEMPLATE_MODULES.length);
  });
});

describe("below-min frames", () => {
  const m = mod("W", "Wide", "System", [2, 2]);
  it("flags spans under the minimum", () => {
    expect(framePlan(m, [[1, 1], [2, 1], [2, 2], [4, 2]]).map((f) => f.below)).toEqual([true, true, false, false]);
  });
  it("sizes spans as n*cell+(n-1)*gap", () => {
    expect(spanSize(3, 110, 8)).toBe(346);
  });
  it("renders a dimmed placeholder, not a probe figure", () => {
    const html = renderToString(<WidgetSection mod={m} view={{ spans: [[1, 1], [2, 2]], cell: 110, gap: 8, live: false, eager: true, settings: {} }} />);
    expect(html).toMatch(/below min (<!-- -->)?2x2/);
    expect(html.match(/data-qa-below/g)).toHaveLength(1);
    expect(html.match(/<figure[^>]*data-qa-module="W"/g)).toHaveLength(1);
    expect(html).toContain('data-qa-span="2x2"');
    expect(html).toContain("width:228px;height:228px");
  });
});

describe("galleries", () => {
  it("never carry data-qa-module, so the probe skips them", () => {
    for (const def of GALLERIES) {
      const html = renderToString(<GalleryGrid def={{ ...def, variants: def.variants.slice(0, 2) }} base={{}} cell={110} gap={8} live={false} />);
      expect(html).not.toContain("data-qa-module");
      expect(html).toContain(`data-qa-gallery="${def.title}"`);
    }
    expect(PROBE_SELECTOR).toBe("figure[data-qa-module]");
  });
  it("cover every skin and surface", () => {
    expect(GALLERIES.map((g) => g.variants.length)).toEqual([14, expect.any(Number)]);
  });
});
