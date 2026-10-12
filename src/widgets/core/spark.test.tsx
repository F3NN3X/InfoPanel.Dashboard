import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Spark } from "./primitives";

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
