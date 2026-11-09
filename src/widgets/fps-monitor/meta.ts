// FpsMonitor's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "FpsMonitor",
  name: "FPS Monitor",
  category: "Gaming",
  icon: "speed",
  prefixes: ["plugins.InfoPanel.RTSS.", "plugins.fps-plugin."],
  defaultSize: [3, 2],
  minSize: [1, 1],
  blurb: "Frame rate, 1% low and frame time",
  tags: "rtss framerate",
  description: "RTSS or PresentMon frame rate, 1% low, frame time graph, game and display info.",
  views: [
    // The frame-time graph draws none of the toggles, so any of their values suits it.
    { id: "frametime", name: "Frame-time graph", applies: {} },
    { id: "gauge", name: "Gauge", blurb: "Frame rate on a ring with 1% low", tags: "ring dial", applies: { sparkline: false } },
    { id: "trend", name: "Trend", blurb: "Frame rate ring with a trend sparkline", tags: "ring sparkline history", applies: { sparkline: true } },
    // The Frame Pacing widget until config v19: added at its size and found by its words. It draws "No game running" with any
    // sensor present (no prefixes of its own), as that widget did, and reads RTSS only.
    {
      id: "pacing",
      name: "Frame pacing",
      blurb: "Frame-time graph with budget lines",
      tags: "stutter fps frametime budget",
      defaultSize: [4, 2],
      minSize: [2, 1],
      applies: {},
      prefixes: [],
    },
  ],
};
