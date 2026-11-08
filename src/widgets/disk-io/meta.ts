// DiskIO's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "DiskIO",
  name: "Disk I/O",
  category: "Storage",
  icon: "swap_horiz",
  prefixes: [],
  defaultSize: [2, 2],
  minSize: [1, 1],
  blurb: "Read and write speed per disk",
  tags: "disk throughput io",
  description: "Read / write throughput and activity for every physical disk, plus combined history.",
};
