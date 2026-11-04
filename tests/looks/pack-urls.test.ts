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

  it("refuses @import in any case and an escaped at-rule name", () => {
    expect(packCssIssues(`@import url("a.css");`)).toContain("@import");
    expect(packCssIssues(`@IMPORT "a.css";`)).toContain("@import");
    expect(packCssIssues(String.raw`@\69mport "a.css";`)).toContain("escaped at-rule");
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
});
