import type { CSSProperties } from "react";
import { describe, expect, it } from "vitest";
import { normalizePanel, type PanelDef, type Widget } from "@/lib/panel-model";
import { chromeOf, STANDARD_DEFAULTS } from "@/modules/standard-settings";
import {
  panelCardStyle,
  panelLayoutStyle,
  panelScope,
  panelSurfaceOf,
  panelVars,
  widgetBoxStyle,
} from "./panel-layout";

/**
 * Resolve the `var(--panel-*, …)` / `var(--wp-*, …)` lookups the way the
 * browser would, with `vars` as the custom properties in scope (unset ones
 * take their fallback). Theme tokens (`var(--card)`) stay as written.
 */
function resolve(value: unknown, vars: CSSProperties = {}): string {
  let out = String(value);
  const scope = vars as Record<string, string>;
  for (;;) {
    const m = /var\((--(?:panel|wp)-[\w-]+),\s*([^()]*(?:\([^()]*\)[^()]*)*)\)/.exec(out);
    if (!m) return out;
    out = out.slice(0, m.index) + (scope[m[1]] ?? m[2]) + out.slice(m.index + m[0].length);
  }
}

/** Every property of a style, resolved. */
const resolved = (style: CSSProperties, vars: CSSProperties = {}) =>
  Object.fromEntries(
    Object.entries(style)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, resolve(v, vars)])
  );

const w = (kind: Widget["kind"], extra: Partial<Widget> = {}): Widget => ({
  id: kind,
  kind,
  visible: true,
  ...extra,
});

const legacy = (extra: Partial<PanelDef> = {}): PanelDef =>
  normalizePanel({
    id: "p",
    title: "P",
    titleVisible: false,
    visible: true,
    background: "panel",
    widgets: [],
    ...extra,
  });

describe("panelLayoutStyle (legacy panels render as before)", () => {
  it("flow panel: wrapping row, items at the start, gap 20 × 12", () => {
    const p = legacy({ layout: "wrap" });
    expect(resolved(panelLayoutStyle(p), panelVars(p))).toEqual({
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
      alignItems: "flex-start",
      columnGap: "20px",
      rowGap: "12px",
    });
  });

  it("grid panel: equal columns, equal rows, gap 16 × 12", () => {
    const p = legacy({ layout: "grid", columns: 4 });
    expect(resolved(panelLayoutStyle(p), panelVars(p))).toEqual({
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gridAutoRows: "minmax(0, 1fr)",
      columnGap: "16px",
      rowGap: "12px",
      justifyItems: "stretch",
      alignItems: "stretch",
    });
    expect(panelLayoutStyle(legacy({ layout: "grid" })).gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(panelLayoutStyle(legacy({ layout: "grid", gridCols: "14px 1fr 14px" })).gridTemplateColumns).toBe(
      "14px 1fr 14px"
    );
  });

  it("writes nothing for fields a legacy panel doesn't set", () => {
    expect(panelVars(legacy({ layout: "grid" }))).toEqual({});
  });
});

describe("panelVars", () => {
  it("writes the panel's own layout fields as --panel-* variables", () => {
    const p = legacy({ layout: "stack", direction: "column", wrap: false, gap: 6, padding: 2, justify: "between", align: "center" });
    expect(panelVars(p)).toEqual({
      "--panel-gap": "6px",
      "--panel-pad": "2px",
      "--panel-direction": "column",
      "--panel-wrap": "nowrap",
      "--panel-justify": "space-between",
      "--panel-align": "safe center",
    });
    expect(resolved(panelLayoutStyle(p), panelVars(p))).toMatchObject({
      flexDirection: "column",
      flexWrap: "nowrap",
      justifyContent: "space-between",
      alignItems: "safe center",
      columnGap: "6px",
      rowGap: "6px",
    });
  });

  it("places within the cell in a grid", () => {
    expect(panelVars(legacy({ layout: "grid", justify: "end", align: "stretch" }))).toEqual({
      "--panel-justify": "safe flex-end",
      "--panel-align": "stretch",
    });
  });

  it("the Style tab's gap applies when the panel sets none, the panel's wins", () => {
    const style = { "--wp-gap": "4px" } as CSSProperties;
    expect(resolve(panelLayoutStyle(legacy()).columnGap, style)).toBe("4px");
    const own = legacy({ gap: 9 });
    expect(resolve(panelLayoutStyle(own).columnGap, { ...style, ...panelVars(own) })).toBe("9px");
  });
});

describe("widgetBoxStyle", () => {
  const flow = legacy({ layout: "wrap" });

  it("legacy flow: full-row kinds take a line, the rest hug", () => {
    const n = normalizePanel({ ...flow, widgets: [w("bar"), w("stat")] });
    expect(widgetBoxStyle(n.widgets[0], n)).toEqual({ flex: "1 1 100%" });
    expect(widgetBoxStyle(n.widgets[1], n)).toEqual({ flex: "0 0 auto" });
    // Not normalized yet (a kind switched in the editor): same default.
    expect(widgetBoxStyle(w("table"), flow)).toEqual({ flex: "1 1 100%" });
  });

  it("fill shares the line without wrap; px is fixed; cross axis and self", () => {
    const row = legacy({ layout: "stack", wrap: false });
    expect(widgetBoxStyle(w("stat", { box: { w: "fill" } }), row)).toEqual({ flex: "1 1 0%" });
    expect(widgetBoxStyle(w("stat", { box: { w: 80, h: 40, self: "end" } }), row)).toEqual({
      flex: "0 0 80px",
      height: 40,
      alignSelf: "safe flex-end",
    });
    expect(widgetBoxStyle(w("stat", { box: { h: "fill" } }), row)).toEqual({ flex: "0 0 auto", alignSelf: "stretch" });
  });

  it("column stack: height is the main axis, width the cross axis", () => {
    const col = legacy({ layout: "stack", direction: "column", wrap: false });
    expect(widgetBoxStyle(w("bar"), col)).toEqual({ flex: "0 0 auto", alignSelf: "stretch" });
    expect(widgetBoxStyle(w("stat", { box: { h: "fill", w: 50 } }), col)).toEqual({ flex: "1 1 0%", width: 50 });
  });

  it("grid: spans (capped at the columns) and explicit positions", () => {
    const grid = legacy({ layout: "grid", columns: 3 });
    expect(widgetBoxStyle(w("stat"), grid)).toEqual({});
    expect(widgetBoxStyle(w("stat", { span: 5, rowSpan: 2 }), grid)).toEqual({
      gridColumn: "span 3",
      gridRow: "span 2",
    });
    expect(widgetBoxStyle(w("stat", { span: 2, box: { col: 2, row: 1, self: "center" } }), grid)).toEqual({
      gridColumn: "2 / span 2",
      gridRow: "1 / span 1",
      alignSelf: "safe center",
    });
  });
});

describe("panelCardStyle", () => {
  const plain = chromeOf(STANDARD_DEFAULTS);

  it("theme cards keep the old padding and radius", () => {
    expect(resolved(panelCardStyle("panel", plain))).toMatchObject({
      background: "hsl(var(--card) / 0.5)",
      padding: "12px",
      borderRadius: "var(--radius)",
    });
    expect(resolved(panelCardStyle("none", plain))).toMatchObject({
      background: "transparent",
      padding: "4px",
      borderRadius: "0px",
    });
    expect(panelCardStyle("bordered", plain).boxShadow).toBe("inset 0 0 0 1px hsl(var(--border))");
  });

  it("applies the style options: opacity, glow, radius and padding", () => {
    const style = panelCardStyle("panel", { ...plain, surfaceOpacity: 0.5, glow: "soft", accent: "#ff0000" });
    expect(style.background).toBe("hsl(var(--card) / 0.25)");
    expect(style.boxShadow).toContain("inset 0 0 14px #ff0000");
    expect(resolve(style.borderRadius, { "--wp-radius": "20px" } as CSSProperties)).toBe("20px");
    expect(resolve(style.padding, { "--wp-pad": "2px" } as CSSProperties)).toBe("2px");
    expect(resolve(style.padding, { "--wp-pad": "2px", "--panel-pad": "7px" } as CSSProperties)).toBe("7px");
  });

  it("module surfaces use the module colors", () => {
    expect(String(panelCardStyle("matte-dark", plain).background)).toBe("rgb(24, 24, 27)");
  });
});

describe("panelSurfaceOf / panelScope", () => {
  it("falls back to the card for unknown surfaces", () => {
    expect(panelSurfaceOf("bordered")).toBe("bordered");
    expect(panelSurfaceOf("glass")).toBe("glass");
    expect(panelSurfaceOf("nope")).toBe("panel");
    expect(panelSurfaceOf(undefined)).toBe("panel");
  });

  it("re-scopes the theme tokens to the panel's hex colors", () => {
    expect(panelScope(undefined)).toBeUndefined();
    expect(panelScope({ accent: "", textColor: "red" })).toBeUndefined();
    expect(panelScope({ accent: "#ffffff", textColor: "#000000", mutedColor: "#ff0000" })).toEqual({
      "--accent": "0 0% 100%",
      "--foreground": "0 0% 0%",
      "--muted-foreground": "0 100% 50%",
    });
  });
});
