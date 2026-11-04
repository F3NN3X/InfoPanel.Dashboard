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
import { t3Tokens } from "@/widgets/core/t3-tokens";
import fs from "node:fs";

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

  it("draws its header variant on the shell, with the card's normal padding and no tui box", async () => {
    const pack = (await loadPack(id))!;
    // biome-ignore lint/correctness/noChildrenProp: the Widget takes a render function as children.
    const html = renderToString(h(Widget, { size: "lg", title: "Title", icon: "memory", children: () => h("i"), t3: pack.look.t3, slots: pack.slots, packId: id }));
    expect(html).toContain(`data-part="${id === "term" ? "legend" : "tab"}"`);
    expect(html).not.toContain("pt-[16px]");
    expect(html).toContain(id === "term" ? "inset-[6px]" : "data-wp-body");
  });

  it("ships the OFL text with its fonts and every copyright line it declares", async () => {
    const meta = (await import(`@/looks/packs/${id}/pack.json`)).default;
    const text = fs.readFileSync(`src/looks/packs/${id}/OFL.txt`, "utf8");
    const shipped = fs.readFileSync("public/licences/pack-fonts-OFL.txt", "utf8");
    expect(text).toContain("SIL OPEN FONT LICENSE Version 1.1");
    for (const font of meta.fonts) {
      expect(text).toContain(font.copyright.replace(/^Copyright \d+,? /, "").replace(/\s*\(.*$/, ""));
      expect(shipped).toContain(font.copyright);
    }
    // a subset is a Modified Version: it may not carry a Reserved Font Name (Plex)
    for (const font of meta.fonts) expect(`${font.family} ${font.file}`).not.toMatch(/plex/i);
  });

  it("keeps its ornament within 10 px and every mark inside the card's padding", async () => {
    const pack = (await loadPack(id))!;
    // biome-ignore lint/correctness/noChildrenProp: the Widget takes a render function as children.
    const html = renderToString(h(Widget, { size: "lg", title: "T", icon: "memory", children: () => h("i"), t3: pack.look.t3, slots: pack.slots, packId: id }));
    const pad = Number(/--wp-pad:(\d+(?:\.\d+)?)px/.exec(html)?.[1]);
    // Term has no ornament or tab band (its legend only reads the padding); the other two do, and their marks are checked below
    expect(html.includes("data-wp-layer")).toBe(id !== "term");
    if (id === "term") return;
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
  it("Term's header is the box-legend variant, not tui's boxed one: the card keeps its normal padding and header height (the overflow runner compares the body rects with Classic)", async () => {
    const pack = (await loadPack("term"))!;
    expect(pack.look.t3).toMatchObject({ "meter-style": "blocks", "cell-radius": "0px", "header-style": "box-legend" });
    expect(t3Tokens(pack.look.t3)).toMatchObject({ header: "box-legend", frame: "legend" });
    expect(t3Tokens(pack.look.t3).boxed).toBeUndefined();
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
