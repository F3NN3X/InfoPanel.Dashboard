// Uptime's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "Uptime",
  name: "Uptime",
  category: "System",
  icon: "timer",
  prefixes: ["plugins.system-info-plugin.uptime."],
  defaultSize: [2, 1],
  minSize: [1, 1],
  blurb: "Time since boot",
  tags: "boot time",
  description: "Time since boot as days / hours / minutes / seconds.",
};
