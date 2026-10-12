import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fitRows, useFitRows } from "./layout";
import { LegendRow } from "./primitives";

describe("fitRows", () => {
  it("counts rows with gaps between them", () => {
    expect(fitRows(100, 20, 5)).toBe(4); // 4 rows + 3 gaps = 95
    expect(fitRows(94, 20, 5)).toBe(3);
    expect(fitRows(100, 25)).toBe(4);
  });

  it("matches the inline formula it replaced", () => {
    for (const h of [0, 30, 77, 160, 333]) expect(fitRows(h, 34, 10)).toBe(Math.max(1, Math.floor((h + 10) / 44)));
  });

  it("always shows at least one row", () => {
    expect(fitRows(0, 40, 8)).toBe(1);
    expect(fitRows(-50, 40)).toBe(1);
  });

  it("is usable from a component body", () => {
    const Rows = ({ h }: { h: number }) => (
      <>
        {Array.from({ length: useFitRows(h, 20, 4) }, (_, i) => (
          <LegendRow key={i} label={`row${i}`} />
        ))}
      </>
    );
    const html = renderToString(<Rows h={72} />);
    expect(html.match(/row\d/g)).toHaveLength(3);
  });
});
