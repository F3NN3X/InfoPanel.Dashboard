// Bluetooth: the adapter state and the paired devices with their battery levels. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { boolOf, boolSetting, colorSetting, stringOf, viewSetting } from "../shared/settings-kit";
import type { BluetoothProps } from "./Bluetooth";
import { meta } from "./meta";

/** The battery colours draw only on listed devices with their levels on. */
const batteriesShown = (v: ModuleSettings) => v.showDevices !== false && v.showBattery !== false;

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  /** `view` is a preset: it sets the three toggles (each view sets all three), as the legacy widget did; changed afterwards, the row reads Custom. */
  settings: [
    viewSetting(meta, { label: "Preset", group: "Display", hint: "Sets the three toggles below. Change one and the preset reads Custom." }),
    boolSetting("showStatus", "Bluetooth status", true, { group: "Display" }),
    boolSetting("showDevices", "Paired devices", true, { group: "Display" }),
    boolSetting("showBattery", "Battery levels", true, { group: "Display" }),
    // The battery levels follow the theme's Warning and Critical ("" = the widget's own amber and red).
    colorSetting("batteryMidColor", "Battery medium", { role: "warn", more: false, visibleIf: batteriesShown }),
    colorSetting("batteryLowColor", "Battery low", { role: "crit", more: false, visibleIf: batteriesShown }),
  ],
  render: {
    load: () => import("./Bluetooth"),
    toProps: (s: ModuleSettings): Partial<BluetoothProps> => ({
      showStatus: boolOf(s.showStatus),
      showDevices: boolOf(s.showDevices),
      showBattery: boolOf(s.showBattery),
      batteryMidColor: stringOf(s.batteryMidColor),
      batteryLowColor: stringOf(s.batteryLowColor),
    }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
