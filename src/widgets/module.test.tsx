import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isClaimed, modules } from "@/modules";
import { STANDARD_SETTINGS } from "@/modules/standard-settings";
import { effectiveSettings, type ModuleSetting, type ModuleSettings } from "@/modules/types";
import type { ShellProps, WidgetMeta } from "./core/types";
import { shellProps, templateModule, withSkinSurface } from "./module";
import { TEMPLATE_MODULES } from "./registry";

const meta: WidgetMeta = {
  id: "demo",
  name: "Demo",
  category: "System",
  icon: "memory",
  prefixes: ["demo."],
  defaultSize: [4, 3],
  minSize: [3, 2],
  description: "A demo template",
};
const own: ModuleSetting = { key: "unit", label: "Unit", type: "text", default: "x" };

type DemoProps = ShellProps & { look?: ModuleSettings; unit?: string };
const calls: DemoProps[] = [];
const seen = () => calls[calls.length - 1];
const Demo = (p: DemoProps) => {
  calls.push(p);
  return null;
};
const build = () =>
  templateModule({ meta, Component: Demo, settings: [own], toProps: (s) => ({ unit: String(s.unit) }), prefixes: ["extra."] });

describe("templateModule", () => {
  const mod = build();

  it("maps the meta onto the module", () => {
    expect(mod).toMatchObject({
      id: "demo",
      title: "Demo",
      minCols: 3,
      minRows: 2,
      prefixes: ["demo."],
      reads: ["extra."],
      category: "System",
      icon: "memory",
      description: "A demo template",
      defaultSize: [4, 3],
    });
    expect(templateModule({ meta, Component: Demo, settings: [], toProps: () => ({}), title: "Other" }).title).toBe("Other");
  });

  it("puts the standard block before the template's own settings", () => {
    expect(mod.settings).toEqual([...STANDARD_SETTINGS, own]);
  });

  it("renders the component with flat data, the shell props and its own props", () => {
    const saved = { skin: "tui", label: "Hi", unit: "y", compactView: "off", radius: "12" };
    renderToStaticMarkup(mod.render({ "demo.a": { value: 5, unit: "W" } }, saved) as never);
    expect(seen().data).toEqual({ "demo.a": "5 W" });
    expect(seen()).toMatchObject({ skin: "tui", title: "Hi", unit: "y", compactView: "off", radius: 12 });
    expect(seen().look).toEqual({ ...effectiveSettings(mod, saved), surface: "tui" });
  });

  it("falls back to the defaults when nothing is saved", () => {
    renderToStaticMarkup(mod.render({ "demo.a": { value: 5, unit: "W" } }) as never);
    expect(seen()).toMatchObject({ unit: "x", skin: undefined, graph: undefined, meter: undefined, title: undefined });
  });
});

describe("templateModule alias", () => {
  const alias = { id: "demomodern", title: "Demo (modern)", minCols: 2, minRows: 1, prefixes: ["old."] };
  const isIdle = () => true;
  const aliased = (over: Partial<Parameters<typeof templateModule>[0]["alias"]> = {}) =>
    templateModule({ meta, Component: Demo, settings: [own], toProps: (s) => ({ unit: String(s.unit) }), isIdle, prefixes: ["extra."], alias: { ...alias, ...over } });

  it("serves the legacy id, title, size and prefixes, hidden from the Library without the template's Library fields", () => {
    const mod = aliased();
    expect(mod).toMatchObject({ id: "demomodern", title: "Demo (modern)", minCols: 2, minRows: 1, prefixes: ["old."], reads: ["extra."], libraryHidden: true, isIdle });
    expect(mod).toMatchObject({ category: undefined, icon: undefined, description: undefined, defaultSize: undefined });
  });

  it("keeps the standard block + own settings by default, or the legacy array as given", () => {
    expect(aliased().settings).toEqual([...STANDARD_SETTINGS, own]);
    expect(aliased({ settings: [own] }).settings).toEqual([own]);
  });

  it("takes the surface default from the legacy settings", () => {
    const surface: ModuleSetting = { key: "surface", label: "Surface", type: "select", default: "theme" };
    renderToStaticMarkup(aliased({ settings: [surface, own] }).render({ "old.a": { value: 1, unit: "" } }) as never);
    expect(seen().look?.surface).toBe("theme");
  });

  it("renders nothing while the hidden rule holds, judged on the resolved settings", () => {
    const mod = aliased({ hidden: (sensors, s) => !sensors["old.a"] && s.unit === "x" });
    expect(mod.render({ "old.b": { value: 1, unit: "" } })).toBeNull();
    expect(mod.render({ "old.b": { value: 1, unit: "" } }, { unit: "y" })).not.toBeNull();
    expect(mod.render({ "old.a": { value: 1, unit: "" } })).not.toBeNull();
  });
});

describe("templateModule with no data", () => {
  it("renders nothing until a key under its prefixes or reads exists, aliases included", () => {
    const mod = build();
    expect(mod.render({})).toBeNull();
    expect(mod.render({ "other.a": { value: 1, unit: "" } })).toBeNull();
    expect(mod.render({ "demo.a": { value: 1, unit: "" } })).not.toBeNull();
    expect(mod.render({ "extra.a": { value: 1, unit: "" } })).not.toBeNull();
    const aliased = templateModule({ meta, Component: Demo, settings: [], toProps: () => ({}), alias: { id: "d", title: "D", minCols: 1, minRows: 1, prefixes: ["old."] } });
    expect(aliased.render({})).toBeNull();
    expect(aliased.render({ "old.a": { value: 1, unit: "" } })).not.toBeNull();
  });

  it("reads any key when the module has no prefixes, and always renders the sensorless ids", () => {
    const open = templateModule({ meta: { ...meta, prefixes: [] }, Component: Demo, settings: [], toProps: () => ({}) });
    expect(open.render({})).toBeNull();
    expect(open.render({ "any.key": { value: 1, unit: "" } })).not.toBeNull();
    const clock = templateModule({ meta: { ...meta, id: "Clock" }, Component: Demo, settings: [], toProps: () => ({}) });
    expect(clock.render({})).not.toBeNull();
  });
});

describe("shellProps", () => {
  it("turns auto and empty into undefined", () => {
    expect(
      shellProps({ accent: "", surface: "auto", radius: "auto", skin: "auto", variant: "default", graph: "auto", meter: "auto", compactView: "auto", label: "" })
    ).toEqual({
      accent: undefined,
      surface: undefined,
      radius: undefined,
      skin: undefined,
      variant: "default",
      graph: undefined,
      meter: undefined,
      compactView: undefined,
      title: undefined,
    });
  });

  it("passes chosen values through", () => {
    expect(
      shellProps({ accent: "#fff", surface: "glass", radius: "999", skin: "ink", variant: "studio", graph: "braille", meter: "wave", compactView: "off", label: "CPU" })
    ).toEqual({
      accent: "#fff",
      surface: "glass",
      radius: 999,
      skin: "ink",
      variant: "studio",
      graph: "braille",
      meter: "wave",
      compactView: "off",
      title: "CPU",
    });
  });
});

describe("registry", () => {
  const legacy = modules.slice(0, modules.length - TEMPLATE_MODULES.length);

  it("appends the template modules to the legacy ones", () => {
    expect(modules.slice(legacy.length)).toEqual(TEMPLATE_MODULES);
  });

  it("leaves the catch-all claiming only the legacy prefixes", () => {
    const legacyPrefixes = legacy.flatMap((m) => m.prefixes);
    for (const p of TEMPLATE_MODULES.flatMap((m) => m.prefixes).filter((p) => !legacyPrefixes.some((l) => p.startsWith(l))))
      expect(isClaimed(`${p}x`), p).toBe(false);
    expect(isClaimed("system.cpu.load")).toBe(true);
    expect(isClaimed("nothing.claims.this")).toBe(false);
  });
});

describe("withSkinSurface", () => {
  const look = (o: ModuleSettings): ModuleSettings => ({ surface: "glass", skin: "auto", ...o });
  it("keeps glass for skin auto and brings the skin's surface otherwise", () => {
    expect(withSkinSurface(look({}), {}).surface).toBe("glass");
    expect(withSkinSurface(look({ skin: "ink" }), undefined).surface).toBe("outline");
    expect(withSkinSurface(look({ skin: "default" }), {}).surface).toBe("glass");
  });
  it("lets a surface set at any level win", () => {
    expect(withSkinSurface(look({ skin: "ink", surface: "theme" }), { surface: "theme" }).surface).toBe("theme");
  });
});
