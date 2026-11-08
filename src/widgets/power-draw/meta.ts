// Power Draw's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "PowerDraw",
  name: "Power Draw",
  category: "Hardware",
  icon: "bolt",
  prefixes: [],
  defaultSize: [2, 1],
  minSize: [1, 1],
  blurb: "CPU and GPU watts with history",
  tags: "watts power energy",
  description: "CPU package + GPU package watts, split bar, total history and GPU board-power limit.",
};
