// The built-in packs (P10, P11): each passes the loader whole, wears the Look its sample theme defines, keeps its marks inside the
// card's padding, carries only icon names and fonts it may, and says where its fonts come from.
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { loadLook } from "@/looks";
import { resolveT1 } from "@/looks/look";
import { PACK_IDS } from "@/looks/pack";
import { effectIssues, GLOW_MAX, planEffects } from "@/looks/effects";
import { registerSampleCards, SAMPLE_MATERIALS } from "@/looks/sample-materials";
import { loadPack, packIssues } from "@/looks/pack-load";
import { Widget } from "@/widgets/core/Widget";
import { t3Tokens } from "@/widgets/core/t3-tokens";
import fs from "node:fs";

const IDS = ["field-kit", "tape-86", "term", "neon-stripe", "overdrive", "swiss-mono", "holo"];
/** What each pack's header draws, as the shell writes it. */
const HEADER: Record<string, string> = { "field-kit": 'data-part="tab"', "tape-86": 'data-part="tab"', term: 'data-part="legend"', "swiss-mono": 'data-hdr="index"', "neon-stripe": '<span aria-hidden="true">[</span>', overdrive: 'data-part="tab"', holo: 'data-part="header"' };
/** The packs that carry a component slot (an ornament or a tab band); the others paint with their material, CSS and stage. */
const SLOTTED = ["field-kit", "tape-86"];

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
    expect(html).toContain(HEADER[id]);
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
    // a subset is a Modified Version: it may not carry a Reserved Font Name (Plex, Share, Orbitron)
    for (const font of meta.fonts) expect(`${font.family} ${font.file}`).not.toMatch(/plex|share|orbitron/i);
  });

  it("keeps its ornament within 10 px and every mark inside the card's padding", async () => {
    const pack = (await loadPack(id))!;
    // biome-ignore lint/correctness/noChildrenProp: the Widget takes a render function as children.
    const html = renderToString(h(Widget, { size: "lg", title: "T", icon: "memory", children: () => h("i"), t3: pack.look.t3, slots: pack.slots, packId: id }));
    const pad = Number(/--wp-pad:(\d+(?:\.\d+)?)px/.exec(html)?.[1]);
    // Only Field Kit and Tape '86 have an ornament or tab band (the others only read the padding); their marks are checked below
    expect(html.includes("data-wp-layer")).toBe(SLOTTED.includes(id));
    if (!SLOTTED.includes(id)) return;
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

describe("what the second-wave packs teach the contract (P11)", () => {
  it("Overdrive's chamfer is a clip on the card, at most 12 px (inside the 20 px cap) and at most 1.5 times the padding, cut on two corners", () => {
    const clip = String(SAMPLE_MATERIALS["look-overdrive"].s.clipPath);
    const cuts = [...clip.matchAll(/min\((\d+)px, calc\(var\(--wp-pad, (\d+)px\) \* 1\.5\)\)/g)];
    expect(cuts.length).toBe(4);
    for (const [, max, fallback] of cuts) {
      expect(Number(max)).toBeLessThanOrEqual(20);
      expect(Number(max)).toBe(12);
      expect(Number(fallback)).toBe(12);
    }
  });

  it("Overdrive's chromatic fringe is a static text shadow on the numerals: nothing moves, so lite mode and reduced motion change nothing", async () => {
    const pack = (await loadPack("overdrive"))!;
    expect(t3Tokens(pack.look.t3)).toMatchObject({ numChroma: true, header: "label-bar", ringMark: "segmented", meter: "segments" });
    expect(pack.stage?.effects ?? []).toEqual([]);
    expect(pack.css).not.toMatch(/animation/);
  });

  it("Neon Stripe's glow is an app effect inside the caps: a filter class, at most the cap, halved in lite mode, none animated", async () => {
    const pack = (await loadPack("neon-stripe"))!;
    const glow = pack.stage!.effects!.filter((e) => e.kind === "glow");
    expect(glow).toHaveLength(1);
    expect(effectIssues(pack.stage!.effects!)).toEqual([]);
    expect(glow[0].px).toBeLessThanOrEqual(GLOW_MAX);
    const env = { lite: false, reduceMotion: false, limitBlur: false, solidPage: false };
    expect(planEffects(glow, env)[0].px).toBe(10);
    expect(planEffects(glow, { ...env, lite: true })[0].px).toBe(5);
    expect(planEffects(glow, env)[0].animate).toBe(false);
    expect(t3Tokens(pack.look.t3)).toMatchObject({ header: "bracket-line", ringMark: "ticks" });
  });

  it("Holo draws 270-degree rings, glows its range rings and carries the radial cluster the connectors need", async () => {
    const pack = (await loadPack("holo"))!;
    expect(t3Tokens(pack.look.t3)).toMatchObject({ ringArc: 270, glow: true });
    expect(pack.connectors).toEqual({ style: "elbow", dot: true });
    expect(pack.stage!.effects!.some((e) => e.kind === "glow")).toBe(true);
    const [template] = pack.templates!;
    expect(template.id).toBe("holo-cockpit");
    // the core is the one largest zone, so the hub rule gives every other zone a spoke
    const zones = template.layouts.standard!.pages[0];
    const area = (z: { at: readonly number[] }) => z.at[2] * z.at[3];
    const [core, ...rest] = [...zones].sort((a, b) => area(b) - area(a));
    expect(area(core)).toBeGreaterThan(area(rest[0]));
    expect(core.module).toBe("FpsMonitor");
  });

  it("Swiss Mono has an index header, one light face for the numerals that cannot be faux-bolded, and an opaque card, so its circle never sits under card text (and its export colour stays solid)", async () => {
    const pack = (await loadPack("swiss-mono"))!;
    expect(t3Tokens(pack.look.t3)).toMatchObject({ header: "index" });
    const meta = (await import("@/looks/packs/swiss-mono/pack.json")).default;
    // a single static face registered over the whole weight range is drawn as it is whatever weight a widget asks for
    for (const f of meta.fonts) expect(f.weight).toBe("100 900");
    expect(pack.stage!.layers[1].fill).toMatch(/radial-gradient\(circle \d+px at/);
    registerSampleCards();
    expect(SAMPLE_MATERIALS["look-swiss-mono"].s.background).toBe("#141414");
  });

  it("every second-wave pack keeps to the stage's 3 layers and its own files", async () => {
    for (const id of ["neon-stripe", "overdrive", "swiss-mono", "holo"]) {
      const pack = (await loadPack(id))!;
      expect(pack.stage!.layers.length).toBeLessThanOrEqual(3);
      expect(pack.slots?.icons && Object.keys(pack.slots.icons).length).toBe(24);
    }
  });
});
