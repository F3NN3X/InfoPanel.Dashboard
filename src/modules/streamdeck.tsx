import { groupByContainer } from "@/lib/sensors";
import { templateModule } from "@/widgets/module";
import { streamDeckOptions, STREAMDECK_SETTINGS } from "@/widgets/registry/e";
import { CARD_SETTINGS } from "./standard-settings";

const P = "plugins.InfoPanel.StreamDeck.";

/**
 * StreamDeck module: the `StreamDeck` template under the legacy id (card surface "Theme" by default).
 * One container per connected device (serial); each button has a label entry and an icon entry.
 */
export const streamdeckModule = templateModule({
  ...streamDeckOptions,
  alias: {
    id: "streamdeck",
    title: "Stream Deck",
    minCols: 3,
    minRows: 2,
    prefixes: [P],
    settings: [...STREAMDECK_SETTINGS, ...CARD_SETTINGS],
    // No connected device: no section.
    hidden: (sensors) => groupByContainer(sensors, P).size === 0,
  },
});
