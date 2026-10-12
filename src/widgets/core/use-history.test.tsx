import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { easeHistory, useHistory } from "./layout";

describe("history", () => {
  it("keeps raw values with ease 1 and caps the length", () => {
    let h: number[] = [];
    for (const v of [1, 5, 2, 8]) h = easeHistory(h, v, 3, 1);
    expect(h).toEqual([5, 2, 8]);
  });

  it("skips non-finite samples", () => {
    const h = easeHistory([1, 2], NaN, 5, 1);
    expect(h).toEqual([1, 2]);
  });

  it("seeds a first sample with two points so a graph has a line", () => {
    expect(easeHistory([], 4, 5, 1)).toEqual([4, 4]);
  });

  it("is usable in a component with undefined-safe input", () => {
    const C = ({ v }: { v?: number }) => <i>{useHistory(v ?? NaN, 10, 1).join(",")}</i>;
    expect(renderToString(<C />)).toContain("<i></i>");
    expect(renderToString(<C v={3} />)).toContain("3,3");
  });
});
