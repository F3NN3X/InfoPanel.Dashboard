// Web Page: a web page or video in a frame. What the registry needs; the component is its own chunk.
import { styleSubsetSettings } from "@/modules/standard-settings";
import type { ModuleSettings } from "@/modules/types";
import { NONE, defineWidget, type WidgetDefinition } from "../define";
import { textSetting } from "../shared/settings-kit";
import { meta } from "./meta";
import type { WebPageProps } from "./WebPage";

/** No header, no small-zone views; its declared look subset (size and corners, an accent, the frame's edge; the page covers any surface). Nothing to read, so the Data tab is empty. */
const inspector: WidgetDefinition["inspector"] = { header: "none", compact: NONE, styleSubset: ["colors:accent", "spacing:scale,radius", "border"], noData: true };

export default defineWidget({
  meta,
  inspector,
  /** A web page has no layout of its own: a URL and the look subset. */
  settings: [textSetting("url", "URL", "", { group: "Page" }), ...styleSubsetSettings(inspector.styleSubset ?? [])],
  render: {
    load: () => import("./WebPage"),
    toProps: (s: ModuleSettings): Partial<WebPageProps> => ({ url: String(s.url ?? "") }),
    base: [],
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, and
  // widget-qa/demo-settings.ts gives it the demo page. It draws without sensor keys (module.tsx SENSORLESS).
});
