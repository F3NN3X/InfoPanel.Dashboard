// Bluetooth's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "full", name: "Status + devices", view: "full", settings: { showStatus: true, showDevices: true, showBattery: true }, size: [3, 2], default: true },
  { id: "devices", name: "Devices + battery", view: "devices", blurb: "Paired devices and battery, no status", tags: "headset mouse", settings: { showStatus: false, showDevices: true, showBattery: true }, size: [3, 2] },
  { id: "status", name: "Status only", view: "status", blurb: "Whether Bluetooth is on and connected", tags: "adapter on off", settings: { showStatus: true, showDevices: false, showBattery: false }, size: [3, 2] },
];

export default presets;
