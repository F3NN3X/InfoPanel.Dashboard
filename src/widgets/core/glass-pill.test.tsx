import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlassPill } from "./primitives";

describe("GlassPill", () => {
  it("renders a frosted pill with its content and extra classes", () => {
    const html = renderToString(<GlassPill className="ml-auto">12:30</GlassPill>);
    expect(html).toContain("backdrop-blur-md");
    expect(html).toContain("rounded-full");
    expect(html).toContain("ml-auto");
    expect(html).toContain("12:30");
  });
});
