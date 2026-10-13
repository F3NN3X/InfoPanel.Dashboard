import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegendRow } from "./primitives";

describe("LegendRow", () => {
  it("renders swatch, label and value in one grid row", () => {
    const html = renderToString(<LegendRow color="red" label="VRAM" value="8 GB" />);
    expect(html).toContain("background:red");
    expect(html).toContain("VRAM");
    expect(html).toContain("8 GB");
    expect(html).toContain("grid-cols-[10px_minmax(0,1fr)_auto]");
  });

  it("keeps the swatch column but draws nothing for a null colour", () => {
    expect(renderToString(<LegendRow color={null} label="Fans" value="1" />)).toContain("background:transparent");
  });

  it("takes a size class", () => {
    expect(renderToString(<LegendRow label="a" className="text-[10px]" />)).toContain("text-[10px]");
  });
});
