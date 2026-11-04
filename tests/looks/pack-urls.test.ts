import { describe, expect, it } from "vitest";
import { isPackRelativeUrl, packCssIssues } from "@/looks/pack-urls";

describe("isPackRelativeUrl", () => {
  it.each(["a.png", "img/a.svg", "./a.woff2", "a.png?v=2#x", "dir/..name/a.png"])("accepts %s", (u) => expect(isPackRelativeUrl(u)).toBe(true));

  it.each([
    "https://example.com/a.png",
    "HTTP://x/a.png",
    "//example.com/a.png",
    "/etc/a.png",
    "data:image/png;base64,AAAA",
    "javascript:alert(1)",
    "../a.png",
    "img/../../a.png",
    "img/%2e%2e/a.png",
    "a\\b.png",
    "a%zz.png",
    "",
    "  ",
    "a\n.png",
  ])("refuses %j", (u) => expect(isPackRelativeUrl(u)).toBe(false));
});

describe("packCssIssues", () => {
  it("passes CSS with pack-relative urls and none", () => {
    expect(packCssIssues(`:scope { background: url("bg/a.png"); } @font-face { src: url(f.woff2) }`)).toEqual([]);
    expect(packCssIssues(".a { color: red }")).toEqual([]);
  });

  it("refuses @import in any case and an escaped at-rule name (any backslash outside a string)", () => {
    expect(packCssIssues(`@import url("a.css");`)).toContain("@import");
    expect(packCssIssues(`@IMPORT "a.css";`)).toContain("@import");
    expect(packCssIssues(String.raw`@\69mport "a.css";`)).toContain("css escape");
  });

  it("refuses a url that leaves the folder, quoted or bare", () => {
    expect(packCssIssues(`a { background: url(https://x.test/a.png) }`)).toEqual(["url https://x.test/a.png"]);
    expect(packCssIssues(`a { background: url( '//x.test/a.png' ) }`)).toEqual(["url //x.test/a.png"]);
    expect(packCssIssues(`a { background: url("../a.png") }`)).toEqual(["url ../a.png"]);
  });

  it("refuses a file named in image-set() or src() without url()", () => {
    expect(packCssIssues(`a { background: image-set("https://x.test/a.png" 1x) }`)).toEqual(["url https://x.test/a.png"]);
    expect(packCssIssues(`a { background: image-set("a.png" 1x) }`)).toEqual([]);
  });

  it("does not read a comment as CSS", () => {
    expect(packCssIssues(`/* @import url(https://x.test/a.css) */ a { color: red }`)).toEqual([]);
  });

  it("refuses a CSS escape that spells url( or @import", () => {
    expect(packCssIssues(String.raw`a { background: u\72l(https://x.test/a.png) }`)).toContain("css escape");
    expect(packCssIssues(String.raw`\@import "a.css";`)).toContain("css escape");
    expect(packCssIssues(String.raw`a { background: ur\l(https://x.test/a.png) }`)).toContain("css escape");
  });

  it("does not let a string open or close a comment", () => {
    const css = `a { content: "/*"; background: url(https://x.test/a.png); } b { content: "*/" }`;
    expect(packCssIssues(css)).toEqual(["url https://x.test/a.png"]);
  });

  it("reads every string of an image-set() with nested functions", () => {
    const css = `a { background: image-set(url("a.png") type("image/png"), "https://x.test/b.png" 2x) }`;
    expect(packCssIssues(css)).toEqual(["url https://x.test/b.png"]);
  });

  it("fails closed on a url(), image-set() or src() that never closes", () => {
    expect(packCssIssues("a { background: url(https://x.test/a.png")).toContain("unterminated url(");
    expect(packCssIssues(`a { background: url("a.png"`)).toContain("unterminated url(");
    expect(packCssIssues(`a { background: image-set("a.png" 1x`)).toContain("unterminated image-set(");
    expect(packCssIssues(`@font-face { src: src("f.woff2"`)).toContain("unterminated src(");
  });

  it("ends a string at a raw newline, so the next declaration is still read", () => {
    const css = 'a { content: "x\n; background: image-set("https://x.test/a.png" 1x) }';
    const issues = packCssIssues(css);
    expect(issues).toContain("unterminated string");
    expect(issues).toContain("url https://x.test/a.png");
    // an escaped newline continues the string
    expect(packCssIssues('a { content: "x\\\ny" }')).toEqual([]);
  });

  it("reads vendor-prefixed URL functions like the plain ones", () => {
    expect(packCssIssues(`a { background: -webkit-image-set("https://x.test/a.png" 1x) }`)).toEqual(["url https://x.test/a.png"]);
    expect(packCssIssues(`a { background: -webkit-cross-fade("https://x.test/a.png", "b.png", 50%) }`)).toEqual(["url https://x.test/a.png"]);
    expect(packCssIssues(`a { background: -webkit-image-set(var(--u) 1x) }`)).toContain("var() in a url function");
    expect(packCssIssues(`a { background: -webkit-image-set("a.png" 1x) }`)).toEqual([]);
  });

  it("keeps a bare parenthesis from closing the function around it", () => {
    const css = `a { background: image-set(calc((1) * 1x) "https://x.test/a.png" 1x) }`;
    expect(packCssIssues(css)).toEqual(["url https://x.test/a.png"]);
  });

  it("refuses var(), env() and attr() inside a URL function, and a url token that is not plain", () => {
    expect(packCssIssues(`:scope { --u: "https://x.test/a.png"; background: image-set(var(--u) 1x) }`)).toContain("var() in a url function");
    expect(packCssIssues(`a { background: image-set(env(x) 1x) }`)).toContain("env() in a url function");
    expect(packCssIssues(`a { background: url(var(--u)) }`)).toContain("bad url var(--u");
    expect(packCssIssues(`a { background: url(a b.png) }`)).toContain("bad url a b.png");
    expect(packCssIssues(`a { color: var(--c); font-family: "Geist Mono" }`)).toEqual([]);
  });
});
