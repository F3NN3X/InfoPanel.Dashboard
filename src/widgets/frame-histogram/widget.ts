// Frame Histogram: frame-time bins with the 1% and 0.1% lows. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { numberOf, numberSetting } from "../shared/settings-kit";
import type { FrameHistogramProps } from "./FrameHistogram";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card; the dense view falls back to it.
  inspector: { header: "yes", compact: CARD },
  settings: [numberSetting("window", "Window (s)", 60, { min: 10, max: 600, step: 10, group: "History", tab: "behaviour", hint: "Frames counted; one reading a second" })],
  render: {
    load: () => import("./FrameHistogram"),
    toProps: (s: ModuleSettings): Partial<FrameHistogramProps> => ({ window: numberOf(s.window) }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
