import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Spark, brailleCols } from "./primitives";

const gradientId = (html: string) => html.match(/<linearGradient[^>]*id="([^"]+)"/)?.[1];

describe("Spark", () => {
  const html = () => renderToString(createElement("div", null, createElement(Spark, { values: [1, 2, 3, 2] }), createElement(Spark, { values: [3, 2, 1, 2] })));

  it("gives each chart its own gradient id, referenced by its fill", () => {
    const out = html();
    const ids = [...out.matchAll(/<linearGradient[^>]*id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(out).toContain(`url(#${id})`);
  });

  it("renders the same ids every time (stable across server and client)", () => {
    const one = renderToString(createElement(Spark, { values: [1, 2, 3] }));
    expect(gradientId(one)).toBe(gradientId(renderToString(createElement(Spark, { values: [1, 2, 3] }))));
  });
});

describe("brailleCols", () => {
  it("never lets the row outgrow the box, whatever the glyph advance", () => {
    for (const [w, adv] of [[100, 6], [100, 7.3], [53, 8.1], [3, 6]] as const) expect(brailleCols(w, adv) * adv).toBeLessThanOrEqual(Math.max(w, adv));
  });
  it("falls back to the nominal advance and keeps one column", () => {
    expect(brailleCols(60.2, 0)).toBe(10);
    expect(brailleCols(2, 6)).toBe(1);
  });
});
