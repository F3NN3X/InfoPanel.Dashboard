import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { GROUP_STREAM_AUDIO } from "@/widgets/registry/stream-audio";
import { GROUP_STREAM_CHAT } from "@/widgets/registry/stream-chat";
import { GROUP_STREAM_DECK } from "@/widgets/registry/stream-deck";
import { GROUP_STREAM_OBS } from "@/widgets/registry/stream-obs";

// The stream groups' widgets are lazy like the others; vite.config.ts loads them in tests. Without that they draw empty
// markup, and the checks that walk every widget (shared-controls' Small zones) skip them without saying so.
describe("the stream groups' widgets draw in tests", () => {
  const modules = [...GROUP_STREAM_AUDIO, ...GROUP_STREAM_CHAT, ...GROUP_STREAM_DECK, ...GROUP_STREAM_OBS];

  it("draws each one's own markup, not an empty lazy placeholder", () => {
    expect(modules.length).toBe(7);
    for (const mod of modules) {
      const html = renderToStaticMarkup(mod.render(fixtureSensors(), {}) as never);
      expect(html, mod.id).toMatch(/data-wp-/);
    }
  });
});
