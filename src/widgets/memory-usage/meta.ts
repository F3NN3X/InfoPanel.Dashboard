// Memory's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "MemoryUsage",
  name: "Memory",
  category: "Hardware",
  icon: "memory_alt",
  prefixes: [],
  defaultSize: [2, 1],
  minSize: [1, 1],
  blurb: "Physical and virtual memory in use",
  tags: "ram",
  description: "Physical + virtual memory load, used and available.",
};
