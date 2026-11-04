import { describe, expect, it } from "vitest";
import { lintPackCss, scopePackCss } from "@/looks/pack-css";

describe("scopePackCss", () => {
  it("puts the rules in @scope inside @layer look, and keyframes and font faces beside the scope", () => {
    const css = ".a { color: red } @keyframes k { from { opacity: 0 } to { opacity: 1 } } @media (min-width: 1px) { .b { color: blue } }";
    expect(lintPackCss(css)).toEqual([]);
    expect(scopePackCss("p", css)).toBe(
      '@layer look{@keyframes k{ from { opacity: 0 } to { opacity: 1 } }@scope ([data-look="p"]){.a{ color: red }@media (min-width: 1px){ .b { color: blue } }}}'
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
