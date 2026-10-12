import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import legacy from "@/widgets/__fixtures__/legacy-e.json";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { webPageOptions } from "@/widgets/registry/e";
import { toEmbeddable } from "@/widgets/WebPage";
import { textfileModule } from "./textfile";
import { webpageModule } from "./webpage";
import { effectiveSettings, type DashboardModule, type ModuleSettings } from "./types";

// The legacy ids that alias templates keep their settings, footprint and prefixes exactly: the
// `legacy-e.json` fixture was captured from the modules before they were ported.
interface Captured {
  title: string;
  minCols: number;
  minRows: number;
  prefixes: string[];
  settings: unknown[];
}
const MODULES: DashboardModule[] = [webpageModule, textfileModule];
const LAYOUTS = ["card", "standard", "compact", "simple"] as const; // forced tiers lg / md / sm / xs
const sensors = fixtureSensors();
const html = (mod: DashboardModule, s: ModuleSettings) => renderToString(mod.render(sensors, s) as never);

describe.each(MODULES)("legacy alias $id", (mod) => {
  const was = (legacy as unknown as Record<string, Captured>)[mod.id];

  it("keeps its identity and footprint", () => {
    expect({ title: mod.title, minCols: mod.minCols, minRows: mod.minRows, prefixes: mod.prefixes }).toEqual({
      title: was.title,
      minCols: was.minCols,
      minRows: was.minRows,
      prefixes: was.prefixes,
    });
    expect(mod.libraryHidden).toBe(true);
  });

  it("keeps every setting key, type, default, group and option", () => {
    const now = (mod.settings ?? []).map((s) => ({
      key: s.key,
      keyY: s.keyY ?? null,
      type: s.type,
      default: s.default,
      group: s.group ?? null,
      advanced: !!s.advanced,
      options: s.options?.map((o) => o.value) ?? null,
    }));
    expect(now).toEqual(was.settings);
  });

  for (const layout of LAYOUTS)
    for (const variant of ["default", "studio"])
      it(`renders at layout ${layout} / ${variant}`, () => {
        expect(html(mod, { layout, variant }).length).toBeGreaterThan(0);
      });

  for (const def of mod.settings ?? [])
    if (def.type === "select" && def.options && ["layout", "variant", "skin", "font", "preset"].every((k) => k !== def.key))
      for (const o of def.options.filter((x) => x.value !== def.default))
        it(`renders with ${def.key} = ${o.value}`, () => {
          expect(html(mod, { [def.key]: o.value }).length).toBeGreaterThan(0);
        });
});

describe("webpage", () => {
  it.each([
    ["url", "https://example.com/a", { url: "https://example.com/a" }],
    ["no url", undefined, { url: "" }],
  ])("maps %s", (_n, url, expected) => {
    const s = effectiveSettings(webpageModule, url ? { url } : undefined);
    expect(webPageOptions.toProps(s)).toEqual(expected);
  });

  it("rewrites YouTube links to the embed form and leaves other URLs alone", () => {
    expect(toEmbeddable("https://www.youtube.com/watch?v=abc123")).toBe("https://www.youtube.com/embed/abc123");
    expect(toEmbeddable("https://youtu.be/abc123")).toBe("https://www.youtube.com/embed/abc123");
    expect(toEmbeddable("https://www.youtube.com/shorts/xyz")).toBe("https://www.youtube.com/embed/xyz");
    expect(toEmbeddable("https://www.youtube.com/live/xyz")).toBe("https://www.youtube.com/embed/xyz");
    expect(toEmbeddable("https://www.youtube.com/")).toBe("https://www.youtube.com/");
    expect(toEmbeddable("https://example.com/x")).toBe("https://example.com/x");
    expect(toEmbeddable("  ")).toBe("");
    expect(toEmbeddable("not a url")).toBe("not a url");
  });

  it("frames the page when a URL is set and shows the placeholder otherwise", () => {
    expect(html(webpageModule, { url: "https://youtu.be/abc123" })).toContain('src="https://www.youtube.com/embed/abc123"');
    expect(html(webpageModule, {})).toContain("Enter a URL in the inspector");
  });

  it("keeps the reduced style set in the inspector", () => {
    expect(webpageModule.settings?.map((d) => d.key)).toEqual(["url", "scale", "radius", "accent", "borderWidth", "borderColor", "glow", "glowColor"]);
  });
});
