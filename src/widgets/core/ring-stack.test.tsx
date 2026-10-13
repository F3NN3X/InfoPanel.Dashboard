import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RingStack } from "./primitives";

const radii = (html: string) => [...html.matchAll(/<circle[^>]* r="([\d.]+)"/g)].map((m) => Number(m[1]));

describe("RingStack", () => {
  it("draws a track and an arc per ring, outermost first, stepping by thickness + gap", () => {
    const html = renderToString(<RingStack rings={[{ v: 50, color: "red" }, { v: 20, color: "blue" }, { v: 80, color: "lime" }]} thickness={10} gap={3} />);
    expect(radii(html)).toEqual([45, 45, 32, 32, 19, 19]);
    expect(html).toContain('stroke="red"');
    expect(html).toContain('stroke="var(--w-track)"');
  });

  it("uses a ring's own track and renders centre children", () => {
    const html = renderToString(
      <RingStack rings={[{ v: 10, color: "red", track: "pink" }]}>
        <b>42</b>
      </RingStack>
    );
    expect(html).toContain('stroke="pink"');
    expect(html).toContain("<b>42</b>");
  });

  it("clamps the arc to 0–100 and treats NaN as empty", () => {
    const full = renderToString(<RingStack rings={[{ v: 150, color: "red" }]} thickness={10} />);
    const none = renderToString(<RingStack rings={[{ v: NaN, color: "red" }]} thickness={10} />);
    expect(full).toMatch(/stroke-dashoffset="0"/);
    expect(none).not.toMatch(/stroke-dashoffset="0"/);
  });
});
