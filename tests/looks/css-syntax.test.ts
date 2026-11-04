import { describe, expect, it } from "vitest";
import { parseCss, tokenize, writeRules } from "@/looks/css-syntax";
import { TEST_PACK } from "./__fixtures__/test-pack";

describe("css-syntax", () => {
  it("reads back what it writes: the test pack's CSS and a mixed sheet parse to the same rules", () => {
    for (const css of [TEST_PACK.css as string, '.a/**/b, .c>d:not([x="y\\\\"]){background:url(a.png) 0/1px;fill:#1a2b3c}@media (min-width:1px){:scope{color:red}}']) {
      const rules = parseCss(css, []);
      expect(rules.length).toBeGreaterThan(0);
      expect(parseCss(writeRules(rules), [])).toEqual(rules);
    }
  });
  it("reads escapes, bad strings and url tokens as CSS Syntax 3 does", () => {
    expect(tokenize(String.raw`"a\"b" 'c` + "\nd")).toEqual([
      { t: "string", v: 'a"b' },
      { t: "ws", v: " " },
      { t: "error", v: "unterminated string" },
      { t: "ws", v: " " },
      { t: "ident", v: "d" },
    ]);
    expect(tokenize("url( a.png )")).toEqual([{ t: "url", v: "a.png" }]);
    expect(tokenize(String.raw`u\72l(x)`)[0]).toEqual({ t: "error", v: "css escape" });
  });
  it("refuses a stray closer, a nested rule and a statement", () => {
    for (const [css, issue] of [["a{}}", "unbalanced }"], ["a{b{color:red}}", "nested rule or a declaration without a colon at b"], ["a{color:f(})}", "unbalanced }"], ["@import 'x';", "statement @import \"x\""]]) {
      const issues: string[] = [];
      expect(parseCss(css, issues)).toEqual([]);
      expect(issues).toEqual([issue]);
    }
  });
});
