// GpuMonitor's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "GpuMonitor",
  name: "GPU Monitor",
  category: "Hardware",
  icon: "developer_board",
  prefixes: [],
  defaultSize: [3, 2],
  minSize: [1, 1],
  blurb: "Load, temps, power, VRAM and clocks",
  tags: "graphics nvidia amd vram temp",
  description: "Load, temps, power, VRAM, clocks, fans, PCIe and D3D engines.",
  views: [
    { id: "monitor", name: "Monitor" },
    // The GPU Rings widget until config v19: added at its size and found by its words.
    { id: "rings", name: "Rings", blurb: "GPU load, VRAM and temperature as rings", tags: "donut radial legend", defaultSize: [3, 2] },
  ],
};
