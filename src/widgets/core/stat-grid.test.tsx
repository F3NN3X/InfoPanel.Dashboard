import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatGrid } from "./primitives";

describe("StatGrid", () => {
  const items = [
    { label: "Budget", value: "300 W" },
    { label: "Headroom", value: "40 W" },
    { label: "Board", value: "12%" },
  ];

  it("renders each stat under a ruled footer with the requested columns", () => {
    const html = renderToString(<StatGrid items={items} cols={3} />);
    expect(html).toContain("grid-cols-3");
    expect(html).toContain("border-t");
    for (const x of items) expect(html).toContain(x.label as string);
    expect(html).toContain("300 W");
  });

  it("defaults to four columns", () => {
    expect(renderToString(<StatGrid items={items} />)).toContain("grid-cols-4");
  });
});
