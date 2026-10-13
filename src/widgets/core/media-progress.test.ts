import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MediaProgress } from "./media-progress";

describe("MediaProgress", () => {
  it("draws a bar at the track progress", () => {
    const html = renderToString(h(MediaProgress, { mode: "bar", pct: 42 }));
    expect(html).toContain("width:42%");
    expect(html).toContain("h-1");
  });

  it("draws the wave meter", () => {
    const html = renderToString(h(MediaProgress, { mode: "wave", pct: 42, barClassName: "h-2" }));
    expect(html).toContain("<svg");
    expect(html).toContain("h-2");
  });

  it("draws the inline visualiser at the given height", () => {
    const html = renderToString(h(MediaProgress, { mode: "visualizer", pct: 42, data: { "plugins.audio-level-meter.default-audio.audio-level": "60" }, className: "h-9" }));
    expect(html).toContain("<canvas");
    expect(html).toContain("h-9");
  });
});
