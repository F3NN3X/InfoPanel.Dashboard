// OSD Strip: an in-game overlay strip. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { targetOf, targetSetting } from "../fps-settings";
import { enumSetting, listOf, oneOf, splitKeys } from "../shared/settings-kit";
import { meta } from "./meta";
import type { OsdCell, OsdStripProps } from "./OsdStrip";

const OSD_CELLS = ["fps", "low", "ft", "gpu", "cpu", "vram", "display"] as const satisfies readonly OsdCell[];

export default defineWidget({
  meta,
  // No header; a summary card and a dense view of its own.
  inspector: { header: "none", compact: BOTH },
  settings: [
    enumSetting(
      "cells",
      "Cells",
      OSD_CELLS.join(","),
      [
        { value: "fps", label: "FPS" },
        { value: "low", label: "1% low" },
        { value: "ft", label: "Frame time" },
        { value: "gpu", label: "GPU" },
        { value: "cpu", label: "CPU" },
        { value: "vram", label: "VRAM" },
        { value: "display", label: "Display" },
      ],
      { multiple: true, group: "Cells" },
    ),
    targetSetting,
  ],
  render: {
    load: () => import("./OsdStrip"),
    toProps: (s: ModuleSettings): Partial<OsdStripProps> => {
      // A stored list (older configs) or the multi-select's comma-separated string; empty keeps every cell.
      const cells = Array.isArray(s.cells) ? listOf(s.cells, (x) => oneOf(x, OSD_CELLS)) : splitKeys(s.cells).flatMap((c) => oneOf(c, OSD_CELLS) ?? []);
      return { cells: cells?.length ? cells : undefined, target: targetOf(s.target) };
    },
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
