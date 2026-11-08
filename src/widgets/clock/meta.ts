// Clock's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "Clock",
  name: "Clock",
  category: "Info",
  icon: "schedule",
  prefixes: ["plugins.clock-plugin."],
  defaultSize: [2, 1],
  minSize: [1, 1],
  blurb: "Digital or analog clock with date",
  tags: "time",
  description: "Digital or analog clock with date, 12/24h and seconds.",
};
