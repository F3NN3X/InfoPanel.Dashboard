// Storage Health: one drive's life, temperature, space and traffic. What the registry needs; the component is its own
// chunk.
import { deviceOf } from "@/modules/setting-readers";
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { deviceSetting } from "../shared/settings-kit";
import type { StorageHealthProps } from "./StorageHealth";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card.
  inspector: { header: "yes", compact: CARD },
  settings: [deviceSetting("Disk", "disk", { group: "Disk" })],
  render: {
    load: () => import("./StorageHealth"),
    toProps: (s: ModuleSettings): Partial<StorageHealthProps> => ({ disk: deviceOf(s, "disk") }),
    // Any vendor's drive: the keys are read, not owned (the fallback grid keeps the rest of `libre.`).
    reads: ["libre."],
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 device key `disk`; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
