// The pack validator (P12a, src/looks/pack-validate.ts): the twelve built-in packs pass with no error, and each rule fails a
// pack built to break it, by its rule id. Bad packs are Field Kit (cream card, fonts, SVG assets, CSS) with one thing changed.
import { describe, expect, it } from "vitest";
import { PACK_IDS } from "@/looks/pack";
import { PACK_CEILING_BYTES, type PackFile, type PackSource, validatePack } from "@/looks/pack-validate";
import budgets from "../../tools/perf/budgets.json";
import { readPackDir } from "../../tools/validate-pack.mjs";

// biome-ignore lint/suspicious/noExplicitAny: the fixtures edit parsed JSON of any shape.
type Json = any;
const dir = (id: string) => `src/looks/packs/${id}`;
const builtin = (id: string): PackSource => readPackDir(dir(id), /\.tsx?$/);
const BASE = builtin("field-kit");
const enc = (s: string) => new TextEncoder().encode(s);
const file = (path: string, content: string): PackFile => ({ path, size: content.length, bytes: enc(content) });

/** Field Kit with changes: `pack` and `look` are merged over the JSON, `files` are added or replace by path. */
function bad(change: { pack?: Record<string, unknown>; look?: (look: Json) => void; css?: string; icons?: unknown; files?: PackFile[]; drop?: string[] }): PackSource {
  const look = structuredClone(BASE.look) as Json;
  change.look?.(look);
  const added = new Set((change.files ?? []).map((f) => f.path));
  return {
    pack: { ...(BASE.pack as object), ...change.pack },
    look,
    css: change.css ?? BASE.css,
    icons: change.icons ?? BASE.icons,
    files: [...BASE.files.filter((f) => !added.has(f.path) && !change.drop?.includes(f.path)), ...(change.files ?? [])],
  };
}
const rules = (src: PackSource) => validatePack(src).filter((i) => i.severity === "error").map((i) => i.rule);
const stage = (layers: unknown[], rest: object = {}) => ({ stage: { ...(BASE.pack as Json).stage, layers, ...rest } });

describe("the built-in packs", () => {
  it.each([...PACK_IDS])("%s passes with no error and no warning", (id) => {
    expect(validatePack(builtin(id))).toEqual([]);
  });

  it("the size cap is the packs block's ceiling in budgets.json", () => {
    expect(PACK_CEILING_BYTES).toBe(budgets.packs.packCeilingBytes);
  });
});

describe("bad packs, one per rule", () => {
  it("a remote URL in the CSS", () => {
    expect(rules(bad({ css: '[data-part="card"] { background-image: url(https://x.test/a.png); }' }))).toContain("remote-url");
    expect(rules(bad({ css: '[data-part="card"] { background-image: url("//x.test/a.png"); }' }))).toContain("remote-url");
  });

  it("a remote page layer image or font file", () => {
    expect(rules(bad({ pack: stage([{ image: "https://x.test/a.svg" }]) }))).toContain("remote-url");
  });

  it("JavaScript and data: URLs", () => {
    expect(rules(bad({ css: '[data-part="card"] { background-image: url("javascript:alert(1)"); }' }))).toContain("script-url");
    expect(rules(bad({ css: '[data-part="card"] { background-image: url(javascript:alert); }' }))).toContain("script-url");
    expect(rules(bad({ pack: stage([{ image: "javascript:alert(1)" }]) }))).toContain("script-url");
    expect(rules(bad({ css: '[data-part="card"] { background-image: url("data:image/png;base64,AAAA"); }' }))).toContain("data-url");
  });

  it("@import", () => {
    expect(rules(bad({ css: '@import url("a.css"); [data-part="chip"] { color: #EFE8D8; }' }))).toContain("import");
  });

  it("layout CSS: display, size, position", () => {
    for (const decl of ["display: none", "width: 10px", "position: fixed", "margin: 0", "content: 'x'"]) expect(rules(bad({ css: `[data-part="card"] { ${decl}; }` })), decl).toContain("paint-only");
  });

  it("a missing asset, and an asset list that does not match the files", () => {
    expect(rules(bad({ pack: stage([{ image: "nope.svg" }]) }))).toContain("asset-missing");
    expect(rules(bad({ pack: { assets: [{ file: "ghost.svg", bytes: 1 }] } }))).toContain("asset-listed");
    const hazard = BASE.files.find((f) => f.path === "assets/hazard.svg")!;
    expect(rules(bad({ pack: { assets: [{ file: "hazard.svg", bytes: hazard.size + 1 }] } }))).toContain("asset-listed");
  });

  it("an asset list that names every file passes; a file it leaves out is refused", () => {
    const listed = BASE.files.filter((f) => f.path.startsWith("assets/")).map((f) => ({ file: f.path.slice(7), bytes: f.size }));
    expect(rules(bad({ pack: { assets: listed } }))).toEqual([]);
    expect(rules(bad({ pack: { assets: listed.slice(1) } }))).toContain("asset-listed");
  });

  it("a file that is not part of a pack, an unreferenced asset (a warning)", () => {
    expect(rules(bad({ files: [file("run.exe", "MZ")] }))).toContain("asset-extra");
    expect(rules(bad({ files: [file("assets/run.exe", "MZ")] }))).toContain("asset-type");
    const unused = validatePack(bad({ files: [file("assets/spare.png", "x")] }));
    expect(unused.filter((i) => i.severity === "warn").map((i) => i.rule)).toEqual(["asset-unused"]);
  });

  it("an SVG that carries script or a reference outside itself", () => {
    for (const svg of ['<svg onload="alert(1)"/>', "<svg><script>1</script></svg>", '<svg><image href="https://x.test/a.png"/></svg>', '<svg><rect style="fill:url(https://x.test/a)"/></svg>']) {
      expect(rules(bad({ files: [file("assets/hazard.svg", svg)] })), svg).toContain("svg-unsafe");
    }
    expect(rules(bad({ files: [file("assets/hazard.svg", '<svg><linearGradient id="g"/><rect fill="url(#g)"/></svg>')] }))).toEqual([]);
  });

  it("text under 4.5:1 on the card, per material the pack declares", () => {
    expect(rules(bad({ look: (l) => (l.t1.light.muted.value = "#E0D9C8") }))).toContain("contrast");
    // a second material with a darker card the dark ink fails on
    expect(rules(bad({ look: (l) => (l.t2.materials.night = { kind: "solid", tone: "dark", export: "#2A2D33" }) }))).toContain("contrast");
  });

  it("a gradient numeral stop under 3:1, or a colour name no one can check", () => {
    expect(rules(bad({ look: (l) => (l.t3["num-fill"] = "linear-gradient(90deg, #EFE8D0, #EFE8D8)") }))).toContain("contrast");
    expect(rules(bad({ look: (l) => (l.t3["num-fill"] = "linear-gradient(90deg, white, #1A1C21)") }))).toContain("contrast");
  });

  it("a chrome surface that is not an opaque literal (L93)", () => {
    expect(rules(bad({ look: (l) => (l.t1.light.surface.value = "rgba(239, 232, 216, 0.5)") }))).toContain("chrome-surface");
    expect(rules(bad({ look: (l) => (l.t1.light.surface.value = "#EFE8D8CC") }))).toContain("chrome-surface");
  });

  it("static-safe on bright static art (L74), and not on dark or non-static-safe packs", () => {
    expect(rules(bad({ pack: { burnIn: "static-safe" } }))).toEqual([]);
    expect(rules(bad({ pack: { burnIn: "static-safe", ...stage([{ fill: "#F4F1EC" }]) } }))).toContain("burn-in");
    expect(rules(bad({ pack: { burnIn: "static-safe", ...stage([{ fill: "linear-gradient(#FFFFFF, #EEEEEE)", opacity: 0.9 }]) } }))).toContain("burn-in");
    expect(rules(bad({ pack: { burnIn: "needs-dim", ...stage([{ fill: "#F4F1EC" }]) } }))).toEqual([]);
    expect(rules(bad({ pack: { burnIn: "static-safe", ...stage([{ fill: "#F4F1EC", opacity: 0.2 }]) } }))).toEqual([]);
  });

  it("an ornament over 10 px unless it bleeds on purpose", () => {
    expect(rules(bad({ pack: { ornament: { size: 11 } } }))).toContain("ornament");
    expect(rules(bad({ pack: { ornament: { size: 10 } } }))).toEqual([]);
    expect(rules(bad({ pack: { ornament: { size: 24, bleed: true } } }))).toEqual([]);
  });

  it("a chamfer over 20 px, or one with no cut", () => {
    expect(rules(bad({ pack: { edge: { kind: "chamfer", cut: 21 } } }))).toContain("chamfer");
    expect(rules(bad({ pack: { edge: { kind: "chamfer" } } }))).toContain("chamfer");
    expect(rules(bad({ pack: { edge: { kind: "chamfer", cut: 20 } } }))).toEqual([]);
  });

  it("!important, on a fill or anywhere", () => {
    expect(rules(bad({ css: '[data-part="num"] { color: #1A1C21 !important; }' }))).toContain("no-important");
    expect(rules(bad({ css: '[data-part="card"] { background-color: #EFE8D8 ! important; }' }))).toContain("no-important");
  });

  it("card rotation and any other transform", () => {
    for (const decl of ["transform: rotate(3deg)", "rotate: 2deg", "transform: skewX(4deg)", "scale: 1.1", "translate: 4px"]) expect(rules(bad({ css: `[data-part="card"] { ${decl}; }` })), decl).toContain("no-rotation");
    expect(rules(bad({ css: "@keyframes pack-spin { to { transform: rotate(1turn); } }" }))).toContain("no-rotation");
  });

  it("an icon key outside the fixed list, and path data that is not path data", () => {
    const glyph = { viewBox: "0 0 24 24", d: "M0 0L24 24" };
    expect(rules(bad({ icons: { memory: glyph } }))).toEqual([]);
    expect(rules(bad({ icons: { "not-an-icon": glyph } }))).toContain("icon-key");
    expect(rules(bad({ icons: { memory: { viewBox: "0 0 24 24", d: "<script>" } } }))).toContain("icons");
  });

  it("a pack over the size cap", () => {
    expect(rules(bad({ files: [{ path: "assets/big.png", size: PACK_CEILING_BYTES, bytes: undefined }], pack: stage([{ image: "big.png" }]) }))).toContain("size");
  });

  it("the layer budget and effects", () => {
    const layer = { fill: "#101010" };
    expect(rules(bad({ pack: stage([layer, layer, layer, layer]) }))).toContain("layers");
    expect(rules(bad({ pack: stage([layer], { effects: [{ kind: "glow", cost: "static", px: 4 }] }) }))).toContain("effects");
    expect(rules(bad({ pack: stage([layer], { effects: [{ kind: "blur", cost: "filter" }, { kind: "glow", cost: "filter" }, { kind: "vignette", cost: "mask" }, { kind: "grain", cost: "mask" }, { kind: "scanlines", cost: "mask" }] }) }))).toContain("effects");
  });

  it("an overlay stronger than the cap", () => {
    expect(rules(bad({ pack: stage([{ fill: "#101010" }], { effects: [{ kind: "vignette", cost: "static", opacity: 0.9 }] }) }))).toContain("overlay-alpha");
    expect(rules(bad({ pack: stage([{ fill: "#101010" }], { effects: [{ kind: "vignette", cost: "static", opacity: 0.4 }] }) }))).toEqual([]);
  });

  it("text that is transparent or the colour of its card (L68, L71)", () => {
    for (const css of ['[data-part="num"] { -webkit-text-fill-color: transparent; }', '[data-part="num"] { color: transparent; }', '[data-part="num"] { color: rgba(0, 0, 0, 0); }', '[data-part="num"] { color: #0000; }', '[data-part="num"] { color: #EFE8D8; }', '[data-part="num"] { color: #efe8d9; }']) {
      expect(rules(bad({ css })), css).toContain("hidden-text");
    }
    expect(rules(bad({ css: '[data-part="num"] { color: #1A1C21; }' }))).toEqual([]);
  });

  it("a gauge painted away: fill and stroke none, or transparent", () => {
    for (const css of ['[data-part="ring"] { stroke: none; }', '[data-part="bar"] { fill: transparent; }', '[data-part="meter"] * { fill: none; }', "svg path { stroke: rgba(0, 0, 0, 0.1); }"]) expect(rules(bad({ css })), css).toContain("hidden-gauge");
  });

  it("opacity: under the floor, compounding down a * selector, or multiplying across rules", () => {
    expect(rules(bad({ css: '[data-part="card"] { opacity: 0.2; }' }))).toContain("hides-content");
    expect(rules(bad({ css: '[data-part="card"] * { opacity: 0.9; }' }))).toEqual(expect.arrayContaining(["universal", "opacity-compound"]));
    expect(rules(bad({ css: '[data-part="card"] { opacity: 0.7; } [data-part="num"] { opacity: 0.7; }' }))).toContain("opacity-compound");
    expect(rules(bad({ css: '[data-part="card"] { filter: opacity(0.1); }' }))).toContain("hides-content");
  });

  it("a * rule that paints more than text", () => {
    for (const decl of ["background-color: #000000", "box-shadow: 0 0 4px #000000", "filter: blur(2px)", "mix-blend-mode: multiply"]) expect(rules(bad({ css: `[data-part="card"] * { ${decl}; }` })), decl).toContain("universal");
    expect(rules(bad({ css: '[data-part="card"] * { font-family: pack-field-kit; color: #1A1C21; }' }))).toEqual([]);
  });

  it("selectors that reach the page, and an at-rule that is not paint", () => {
    expect(rules(bad({ css: "body { color: #1A1C21; }" }))).toContain("selector");
    expect(rules(bad({ css: ":root { color: #1A1C21; }" }))).toContain("selector");
    expect(rules(bad({ css: "@page { margin: 0; }" }))).toContain("paint-only");
  });

  it("fonts: not woff2, wrong signature, no licence file, not OFL, an @font-face outside the pack's names", () => {
    const fonts = (BASE.pack as Json).fonts as Json[];
    expect(rules(bad({ pack: { fonts: [{ ...fonts[0], file: "barlow.ttf" }] } }))).toEqual(expect.arrayContaining(["font-type"]));
    expect(rules(bad({ files: [{ path: "assets/barlow-condensed-600.woff2", size: 4, bytes: enc("OTTO") }] }))).toContain("font-type");
    expect(rules(bad({ drop: ["OFL.txt"] }))).toContain("font-licence");
    expect(rules(bad({ files: [file("OFL.txt", "All rights reserved.")] }))).toContain("font-licence");
    expect(rules(bad({ pack: { fonts: [{ ...fonts[0], licence: "proprietary" }, fonts[1]] } }))).toContain("font-licence");
    expect(rules(bad({ css: "@font-face { font-family: Arial; src: url(barlow-condensed-600.woff2); }" }))).toContain("font-face");
  });

  it("schema, a Look that is not the pack's, modes that differ", () => {
    expect(rules(bad({ pack: { id: "Field Kit" } }))).toContain("schema");
    expect(rules(bad({ pack: { burnIn: "sometimes" } }))).toContain("schema");
    expect(rules(bad({ pack: { surprise: 1 } }))).toContain("schema");
    expect(rules(bad({ look: (l) => (l.id = "other") }))).toContain("id");
    expect(rules(bad({ pack: { modes: ["dark"] } }))).toContain("modes");
    expect(rules({ ...BASE, look: undefined })).toContain("schema");
  });
});

describe("path traversal in an asset path", () => {
  const paths = ["../secret.png", "a/../../secret.png", "%2e%2e/secret.png", "%2E%2E%2Fsecret.png", "%252e%252e/secret.png", "a\\..\\secret.png", "..\\secret.png", "/etc/passwd", "\\\\host\\share\\a.png", "C:\\Windows\\a.png", "C:/Windows/a.png", "C%3a%5cWindows%5ca.png", "a%00.png", "a%zz.png"];

  it.each(paths)("a page layer image %j is refused as a path", (image) => {
    expect(rules(bad({ pack: stage([{ image }]) }))).toContain("path");
  });

  it.each(paths)("a font file %j is refused as a path", (name) => {
    const fonts = (BASE.pack as Json).fonts as Json[];
    expect(rules(bad({ pack: { fonts: [{ ...fonts[0], file: name }] } }))).toContain("path");
  });

  it.each(["../x.png", "%2e%2e/x.png", "a\\b.png", "C:/x.png"])("a CSS url %j", (url) => {
    expect(rules(bad({ css: `[data-part="card"] { background-image: url("${url}"); }` }))).toContain("path");
  });

  it("a file in the folder whose own path escapes it", () => {
    expect(rules(bad({ files: [file("assets/../../x.png", "x")] }))).toContain("path");
    expect(rules(bad({ files: [file("assets\\x.png", "x")] }))).toContain("path");
  });
});

describe("bypass tries from the P8a and P9a rounds", () => {
  it("escapes that spell url( or @import are refused whatever they spell", () => {
    expect(rules(bad({ css: String.raw`[data-part="card"] { background: u\72l(https://x.test/a.png); }` }))).toContain("css-syntax");
    expect(rules(bad({ css: String.raw`@\69mport "a.css";` }))).toContain("css-syntax");
    expect(rules(bad({ css: String.raw`[data-part="card"] { background: url("htt\70s://x.test/a.png"); }` }))).toContain("remote-url");
  });

  it("case does not hide a scheme or an at-rule", () => {
    expect(rules(bad({ css: '@IMPORT "a.css";' }))).toContain("import");
    expect(rules(bad({ css: '[data-part="card"] { background: URL(HTTPS://X.TEST/a.png); }' }))).toContain("remote-url");
    expect(rules(bad({ css: '[data-part="card"] { background: url("JaVaScRiPt:alert(1)"); }' }))).toContain("script-url");
    expect(rules(bad({ pack: stage([{ image: " HTTP://x.test/a.svg" }]) }))).toContain("remote-url");
  });

  it("a comment hides nothing and is not read as code", () => {
    expect(rules(bad({ css: '/* @import url(https://x.test/a.css) */ [data-part="chip"] { color: #EFE8D8; background-color: #1A1C21; }' }))).toEqual([]);
    expect(rules(bad({ css: '[data-part="card"] { background: url(/**/https://x.test/a.png); }' }))).not.toEqual([]);
    expect(rules(bad({ css: '[data-part="card"] { background: url(https://x.test/a.png /* ) */ ); }' }))).not.toEqual([]);
  });

  it("image-set(), src() and a var() inside a URL function are read as URLs", () => {
    expect(rules(bad({ css: '[data-part="card"] { background-image: image-set("https://x.test/a.png" 1x); }' }))).toContain("remote-url");
    expect(rules(bad({ css: '[data-part="card"] { background-image: url(var(--x)); }' }))).not.toEqual([]);
  });

  it("@font-face with a remote src or a unicode-range does not get past the URL and name rules", () => {
    const face = (src: string, family = "pack-field-kit") => `@font-face { font-family: ${family}; src: ${src}; unicode-range: U+0000-10FFFF; }`;
    expect(rules(bad({ css: face("url(https://x.test/f.woff2)") }))).toContain("remote-url");
    expect(rules(bad({ css: face("url(//x.test/f.woff2)", "Arial") }))).toEqual(expect.arrayContaining(["remote-url", "font-face"]));
    expect(rules(bad({ css: face("url(barlow-condensed-600.woff2)") }))).toEqual([]);
  });

  it("unicode-range and property tricks do not turn a layout property into paint", () => {
    expect(rules(bad({ css: '[data-part="card"] { DISPLAY: none; }' }))).toContain("paint-only");
    expect(rules(bad({ css: '[data-part="card"] { --pack-x: 1; width: 1px; }' }))).toContain("paint-only");
    expect(rules(bad({ css: String.raw`[data-part="card"] { dis\70lay: none; }` }))).toContain("css-syntax");
  });
});
