import { describe, expect, it } from "vitest";
import { lintPackCss, scopePackCss } from "@/looks/pack-css";

describe("scopePackCss", () => {
  it("writes the parsed rules in @scope inside @layer look, and keyframes and font faces beside the scope", () => {
    const css = ".a { color: red } @keyframes pack-k { from { opacity: 0.5 } to { opacity: 1 } } @media (min-width: 1px) { .b { color: blue } }";
    expect(lintPackCss(css)).toEqual([]);
    expect(scopePackCss("p", css)).toBe(
      '@layer look{@keyframes pack-k{from{opacity:0.5;}to{opacity:1;}}@scope ([data-look="p"]){.a{color:red;}@media (min-width: 1px){.b{color:blue;}}}}'
    );
  });
  it("writes strings and comments as it read them, never the pack's own text", () => {
    expect(scopePackCss("p", String.raw`:scope{--pack-a:"/*\"}";color/**/:red;--pack-b:"*/"}`)).toBe(
      String.raw`@layer look{@scope ([data-look="p"]){:scope{--pack-a:"/*\"}";color:red;--pack-b:"*/";}}}`
    );
  });
});

describe("lintPackCss", () => {
  it("names each unpainted property and each selector that leaves the pack", () => {
    expect(lintPackCss("body { display: none }")).toEqual(["selector body reaches outside the pack", "rule body: property display is not a paint property"]);
    expect(lintPackCss(".a { margin: 0; color: red }")).toEqual(["rule .a: property margin is not a paint property"]);
  });
  it("does not take a word inside a class, an id or a string for the page", () => {
    expect(lintPackCss('.body-x, #html, [data-x="body"] { color: red }')).toEqual([]);
  });
  it("refuses unbalanced braces and a statement outside a rule", () => {
    expect(lintPackCss(".a { color: red }}").join()).toMatch(/unbalanced/);
    expect(lintPackCss(".a { color: red").join()).toMatch(/unbalanced/);
    expect(lintPackCss("color: red;").join()).toMatch(/statement/);
  });
});

describe("lintPackCss reads strings, comments and escapes as the browser does", () => {
  it("does not take a comment opener inside a string for a comment (B1)", () => {
    expect(lintPackCss(':scope{--pack-a:"/*";display:none;--pack-b:"*/"}')).toContain("rule :scope: property display is not a paint property");
  });
  it("ends a string at its closing quote after an escaped quote (B2)", () => {
    expect(lintPackCss(':scope{--pack-q:"\\"";display:none\n}')).toContain("rule :scope: property display is not a paint property");
  });
  it("refuses a stray } that would close the scope and the layer (B3)", () => {
    const css = '[a="\\""]{color:red}}}\nheader{color:red}';
    expect(lintPackCss(css)).toContain("unbalanced }");
    expect(scopePackCss("p", css)).toBe("");
  });
});

describe("lintPackCss keeps widgets on screen and in place (M4)", () => {
  it("refuses an opacity under the floor, and one it cannot read", () => {
    expect(lintPackCss(":scope{opacity:0}")).toEqual(["rule :scope: opacity 0 is under 0.5 or not a plain number"]);
    expect(lintPackCss(":scope{opacity:var(--pack-o)}")).toEqual(["rule :scope: opacity var(--pack-o) is under 0.5 or not a plain number"]);
    expect(lintPackCss(":scope{opacity:0.5;fill-opacity:60%}")).toEqual([]);
  });
  it("allows filter functions that keep content readable, with capped values", () => {
    expect(lintPackCss(":scope{filter:saturate(1.2) drop-shadow(0 0 4px var(--w-accent)) hue-rotate(30deg)}")).toEqual([]);
    for (const f of ["opacity(0)", "blur(2px)", "brightness(0.2)", "invert(1)", "url(f.svg#x)", "var(--pack-f)"]) {
      expect(lintPackCss(`:scope{filter:${f}}`)).toEqual([`rule :scope: filter ${f} hides or blurs content`]);
    }
    expect(lintPackCss(":scope{backdrop-filter:blur(24px)}")).toEqual([]);
    expect(lintPackCss(":scope{backdrop-filter:blur(200px)}")).toEqual(["rule :scope: backdrop-filter blur(200px) hides or blurs content"]);
  });
  it("refuses content, border styles, masks, dashes and custom properties outside --pack-*", () => {
    expect(lintPackCss(':scope::before{content:"xxxxxxxx"}')).toEqual(["rule :scope::before: property content is not a paint property"]);
    for (const p of ["border-style:solid", "mask-image:none", "stroke-dashoffset:0", "--wp-pad:90px"]) {
      expect(lintPackCss(`:scope{${p}}`)).toEqual([`rule :scope: property ${p.split(":")[0]} is not a paint property`]);
    }
  });
  it("animates only with the pack's own keyframes, named pack-*", () => {
    expect(lintPackCss("@keyframes pack-glow{from{opacity:0.6}to{opacity:1}} :scope{animation:pack-glow 2s ease-in-out infinite alternate}")).toEqual([]);
    expect(lintPackCss(":scope{animation:alert-in-left 1s}")).toEqual(["rule :scope: animation alert-in-left is not a keyframes of this pack"]);
    expect(lintPackCss("@keyframes glow{to{opacity:1}}")).toEqual(["@keyframes glow: name must start with pack-"]);
    expect(lintPackCss("@keyframes pack-k{to{opacity:0}}")).toEqual(["keyframe to: opacity 0 is under 0.5 or not a plain number"]);
  });
  it("names an @font-face family pack-*, so it cannot replace a font the app uses", () => {
    expect(lintPackCss('@font-face{font-family:"pack-body";src:url(f.woff2)}')).toEqual([]);
    expect(lintPackCss('@font-face{font-family:"Segoe UI";src:url(f.woff2)}')).toEqual(['@font-face: font-family "Segoe UI" must start with pack-']);
  });
});
