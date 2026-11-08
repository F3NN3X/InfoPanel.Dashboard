import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { groupOf, STREAM_IDS } from "./group-of";

// The stream groups' widgets are lazy like the others; vite.config.ts loads them in tests. Without that they draw empty
// markup, and the checks that walk every widget (shared-controls' Small zones) skip them without saying so.
describe("the stream groups' widgets draw in tests", () => {
  const modules = groupOf(STREAM_IDS);

  it("draws each one's own markup, not an empty lazy placeholder", () => {
    expect(modules.length).toBe(7);
    for (const mod of modules) {
      const html = renderToStaticMarkup(mod.render(fixtureSensors(), {}) as never);
      expect(html, mod.id).toMatch(/data-wp-/);
    }
  });
});
