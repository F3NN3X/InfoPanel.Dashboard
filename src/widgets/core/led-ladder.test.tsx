import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LedLadder } from "./primitives";

const html = (props: Parameters<typeof LedLadder>[0]) => renderToStaticMarkup(createElement(LedLadder, props));
const segments = (h: string) => [...h.matchAll(/<span class="min-h-0[^"]*" style="([^"]*)"/g)].map((m) => m[1]);

describe("LedLadder", () => {
  it("lights the segments whose centre is at or below the value", () => {
    const lit = segments(html({ value: 50, n: 10 })).filter((s) => s.includes("opacity:1"));
    expect(lit).toHaveLength(5);
  });
  it("colours the zones accent, amber, red", () => {
    const s = segments(html({ value: 100, n: 10, zones: [50, 80] }));
    expect(s[0]).toContain("var(--accent)");
    expect(s[6]).toContain("#EDB232");
    expect(s[9]).toContain("#F2665E");
  });
  it("lets the colours be overridden", () => {
    const s = segments(html({ value: 100, n: 10, color: "#111111", hotColor: "#222222" }));
    expect(s[0]).toContain("#111111");
    expect(s[9]).toContain("#222222");
  });
  it("stacks vertical ladders bottom-up and mirrors on reverse", () => {
    expect(html({ value: 0, vertical: true })).toContain("flex-col-reverse");
    expect(html({ value: 0, reverse: true })).toContain("flex-row-reverse");
  });
  it("draws the hold marker only when given", () => {
    expect(html({ value: 10, hold: 40 })).toContain("left:calc(40% - 1px)");
    expect(html({ value: 10, hold: 40, vertical: true })).toContain("bottom:calc(40% - 1px)");
    expect(html({ value: 10 })).not.toContain("calc(");
  });
});
