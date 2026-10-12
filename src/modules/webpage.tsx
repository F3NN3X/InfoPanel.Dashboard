import { templateModule } from "@/widgets/module";
import { webPageOptions, WEBPAGE_SETTINGS } from "@/widgets/registry/e";

/**
 * Web Page module: the `WebPage` template under the legacy id. It keeps the reduced style set an
 * iframe allows (zoom, corner radius, accent, the frame's border and glow); no sensor data is read.
 */
export const webpageModule = templateModule({
  ...webPageOptions,
  alias: { id: "webpage", title: "Web Page", minCols: 4, minRows: 2, prefixes: [], settings: WEBPAGE_SETTINGS },
});
