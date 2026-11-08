// GPU Rings' catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "GpuRings",
  name: "GPU Rings",
  category: "Hardware",
  icon: "donut_large",
  prefixes: [],
  defaultSize: [3, 2],
  minSize: [1, 1],
  blurb: "GPU load, VRAM and temperature as rings",
  tags: "graphics vram",
  description: "Stacked radial rings for bounded percentages only — VRAM outer, core load inner, temperature in the center — with a legend of clocks, power and fans.",
};
