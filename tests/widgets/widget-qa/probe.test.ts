// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { probeBox } from "@/widgets/widget-qa/probe";

const rect = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top }) as DOMRect;
function leaf(parent: Element, text: string, bounds: DOMRect, lines: DOMRect[]) {
  const el = parent.appendChild(document.createElement("span"));
  el.textContent = text;
  el.getBoundingClientRect = () => bounds;
  el.getClientRects = () => lines as unknown as DOMRectList;
  return el;
}
function zone() {
  const root = document.createElement("div");
  root.getBoundingClientRect = () => rect(0, 0, 400, 100);
  return root;
}

describe("probeBox overlaps", () => {
  it("does not flag a wrapped run whose bounding box spans the line of the text before it", () => {
    const root = zone();
    leaf(root, "name", rect(0, 0, 40, 16), [rect(0, 0, 40, 16)]);
    // wraps onto a second line: the bounding box covers the first line's right side, the painted boxes do not touch the name
    leaf(root, "a long message", rect(0, 0, 300, 32), [rect(44, 0, 300, 16), rect(0, 16, 120, 32)]);
    expect(probeBox(root).filter((i) => i.kind === "overlaps")).toEqual([]);
  });

  it("still flags text that is painted over other text", () => {
    const root = zone();
    leaf(root, "name", rect(0, 0, 40, 16), [rect(0, 0, 40, 16)]);
    leaf(root, "message", rect(20, 0, 120, 16), [rect(20, 0, 120, 16)]);
    expect(probeBox(root).filter((i) => i.kind === "overlaps")).toHaveLength(1);
  });

  it("flags two wrapped runs whose painted lines overlap", () => {
    const root = zone();
    leaf(root, "first message", rect(0, 0, 200, 32), [rect(0, 0, 200, 16), rect(0, 16, 120, 32)]);
    leaf(root, "second message", rect(0, 8, 200, 24), [rect(0, 8, 200, 24)]);
    expect(probeBox(root).filter((i) => i.kind === "overlaps")).toHaveLength(1);
  });
});
