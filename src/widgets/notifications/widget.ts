// Notifications: the latest toast and the history list. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { notificationsIsland } from "../island/info";
import { boolOf, boolSetting, numberOf, numberSetting } from "../shared/settings-kit";
import { meta } from "./meta";
import type { NotificationsProps } from "./Notifications";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  settings: [
    boolSetting("showHistory", "History list", true, { group: "History list" }),
    numberSetting("maxLines", "Max history lines", 50, { min: 1, max: 200, step: 5, group: "History", tab: "behaviour" }),
  ],
  island: notificationsIsland,
  render: {
    load: () => import("./Notifications"),
    toProps: (s: ModuleSettings): Partial<NotificationsProps> => ({ showHistory: boolOf(s.showHistory), maxLines: numberOf(s.maxLines) }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
