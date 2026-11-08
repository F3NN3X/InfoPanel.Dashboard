// Processes's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "ProcessList",
  name: "Processes",
  category: "System",
  icon: "list_alt",
  prefixes: ["plugins.system-info-plugin.processes."],
  defaultSize: [2, 2],
  minSize: [1, 1],
  blurb: "Top processes by CPU or memory",
  tags: "tasks threads",
  description: "Top processes by CPU or memory, plus process / thread / handle counts.",
};
