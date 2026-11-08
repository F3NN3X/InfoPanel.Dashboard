// Menu Bar's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "MenuBar",
  name: "Menu Bar",
  category: "System",
  icon: "more_horiz",
  prefixes: [],
  defaultSize: [6, 1],
  minSize: [2, 1],
  blurb: "Glance strip of labels and values",
  tags: "strip istat bar top",
  description: "Always-visible glance strip (iStat Menus style): label stacked over value, mini bars, click an item (or pick an active one) to open its detail.",
};
