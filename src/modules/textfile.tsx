import { findEntry, liveText } from "@/lib/sensors";
import { templateModule } from "@/widgets/module";
import { textFileOptions, TEXTFILE_SETTINGS } from "@/widgets/registry/e";
import { CARD_SETTINGS } from "./standard-settings";

const P = "plugins.InfoPanel.TextFile.";

/**
 * TextFile module: the `TextFile` template under the legacy id (card surface "Theme" by default).
 * Entries: content (multi-line text), status, file-size (bytes), line-count.
 */
export const textfileModule = templateModule({
  ...textFileOptions,
  alias: {
    id: "textfile",
    title: "Text File",
    minCols: 2,
    minRows: 1,
    prefixes: [P],
    settings: [...TEXTFILE_SETTINGS, ...CARD_SETTINGS],
    // Nothing from the plugin yet: no section.
    hidden: (sensors) =>
      liveText(findEntry(sensors, P, "content")?.sensor) === undefined &&
      liveText(findEntry(sensors, P, "status")?.sensor) === undefined &&
      findEntry(sensors, P, "file-size")?.sensor.value === undefined,
  },
});
