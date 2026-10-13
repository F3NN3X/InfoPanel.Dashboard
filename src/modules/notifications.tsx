import { findEntry, liveText } from "@/lib/sensors";
import { templateModule } from "@/widgets/module";
import { notificationsOptions, NOTIFICATIONS_SETTINGS } from "@/widgets/registry/e";
import { CARD_SETTINGS } from "./standard-settings";

const P = "plugins.InfoPanel.Notifications.";

/**
 * Notifications module: the `Notifications` template under the legacy id (card surface "Theme" by
 * default). The history table is flattened to "time, type, message" lines.
 */
export const notificationsModule = templateModule({
  ...notificationsOptions,
  alias: {
    id: "notifications",
    title: "Notifications",
    minCols: 2,
    minRows: 1,
    prefixes: [P],
    settings: [...NOTIFICATIONS_SETTINGS, ...CARD_SETTINGS],
    // Nothing from the plugin yet: no section.
    hidden: (sensors) =>
      liveText(findEntry(sensors, P, "last-notification")?.sensor) === undefined &&
      findEntry(sensors, P, "notification-count")?.sensor.value === undefined &&
      !liveText(findEntry(sensors, P, "status")?.sensor),
  },
});
