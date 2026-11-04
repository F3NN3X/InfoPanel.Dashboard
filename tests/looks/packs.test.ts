// The first-wave packs (P10): each passes the loader whole, wears the Look its sample theme defines, keeps its marks inside the
// card's padding, carries only icon names and fonts it may, and says where its fonts come from.
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { loadLook } from "@/looks";
import { resolveT1 } from "@/looks/look";
import { PACK_IDS } from "@/looks/pack";
import { loadPack, packIssues } from "@/looks/pack-load";
import { Widget } from "@/widgets/core/Widget";

const IDS = ["field-kit", "tape-86", "term"];

describe.each(IDS)("pack %s", (id) => {
  it("loads without a refusal", async () => {
    const pack = await loadPack(id);
    expect(pack?.id).toBe(id);
    expect(packIssues(pack!)).toEqual([]);
    expect(PACK_IDS.has(id)).toBe(true);
  });

  it("wears the colours of its sample theme, in the one mode it supports", async () => {
    const pack = (await loadPack(id))!;
    const sample = (await loadLook(id))!;
    expect(pack.look.modes.supported).toEqual(sample.modes.supported);
    const mode = sample.modes.supported[0];
    expect(resolveT1(pack.look, mode)).toEqual(resolveT1(sample, mode));
  });

  it("serves every file it names from one folder, and each font file has a licence", async () => {
    const pack = (await loadPack(id))!;
    expect(pack.base).toMatch(/^\/.*\/$/);
    for (const layer of pack.stage?.layers ?? []) if (layer.image) expect(pack.assets).toContain(layer.image);
    const meta = (await import(`@/looks/packs/${id}/pack.json`)).default;
    for (const font of meta.fonts) {
      expect(font.licence).toBe("OFL-1.1");
      expect(font.copyright).toMatch(/^Copyright/);
      expect(pack.assets?.some((a: string) => a.startsWith(font.file.replace(".woff2", "")))).toBe(true);
    }
  });

  it("keeps its ornament within 10 px and every mark inside the card's padding", async () => {
    const pack = (await loadPack(id))!;
    // biome-ignore lint/correctness/noChildrenProp: the Widget takes a render function as children.
    const html = renderToString(h(Widget, { size: "lg", title: "T", icon: "memory", children: () => h("i"), t3: pack.look.t3, slots: pack.slots, packId: id }));
    const pad = Number(/--wp-pad:(\d+(?:\.\d+)?)px/.exec(html)?.[1]);
    if (!html.includes("data-wp-layer")) return; // no ornament or tab band, so no padding to keep
    expect(pad).toBeGreaterThanOrEqual(10);
    for (const part of ["ornament", "tab-band"]) {
      if (!html.includes(`data-wp-layer="${part}"`)) continue;
      const layer = html.split(`data-wp-layer="${part}"`)[1].split(/data-wp-layer|data-wp-body/)[0];
      for (const [, style] of layer.matchAll(/<i style="([^"]*)"/g)) {
        const px = (name: string) => Number(new RegExp("(?:^|;)" + name + ":(-?[0-9.]+)").exec(style)?.[1]);
        for (const side of ["top", "left", "right", "bottom"]) expect(px(side) || 0).toBeGreaterThanOrEqual(0);
        const size = part === "ornament" ? Math.max(px("width"), px("height")) : px("height");
        expect(size).toBeLessThanOrEqual(part === "ornament" ? 10 : pad);
      }
    }
  });
});

describe("what each pack teaches the contract", () => {
  it("Term keeps the normal card padding and header height: its frame is the card's hairline, and no header kind that is taller (prompt) or boxed (tui) is used", async () => {
    const pack = (await loadPack("term"))!;
    expect(pack.look.t3).toMatchObject({ "meter-style": "blocks", "cell-radius": "0px" });
    expect(pack.look.t3?.["header-style"]).toBeUndefined();
    expect(pack.look.t3?.["border-fill"]).toBeUndefined();
  });

  it("Tape '86 has a stamped look and no rotation: the pack CSS sets no transform", async () => {
    const pack = (await loadPack("tape-86"))!;
    expect(pack.css).not.toMatch(/transform|rotate/i);
  });

  it("Field Kit's yellow is on its strips and corner only, never in its CSS text colours", async () => {
    const pack = (await loadPack("field-kit"))!;
    expect(pack.css).not.toMatch(/(^|[;{\s])color:\s*#F2C230/i);
  });
});
