// Thermals's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "Thermals",
  name: "Thermals",
  category: "Hardware",
  icon: "device_thermostat",
  prefixes: [],
  defaultSize: [2, 2],
  minSize: [1, 1],
  blurb: "Every temperature sensor, hottest first",
  tags: "temp temperature heat hotspot",
  description: "Every temperature sensor in one place — CPU, GPU core + hotspot, NVMe/SSD, VRM — hottest first.",
  views: [
    { id: "bars", name: "Bars" },
    { id: "gauges", name: "Temp gauges", blurb: "Hottest four as rings, fans under them", tags: "ring dial fan rpm" },
  ],
};
