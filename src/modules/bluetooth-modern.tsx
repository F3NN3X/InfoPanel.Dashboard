import { ModernBluetooth } from "@/components/ModernBluetooth";
import { byName, groupByContainer, liveText } from "@/lib/sensors";
import { chromeOf, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
} from "./types";

const P = "plugins.bluetooth-battery-plugin.";

/**
 * Modern bluetooth widget — the BTData plugin's paired devices with
 * battery levels (the main container holds bt_status; each device gets
 * its own container whose entries are looked up by display name). One
 * component (`ModernBluetooth`) picks card / standard / compact / simple
 * from the measured zone size.
 */

const BLUETOOTH_MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
  {
    key: "view",
    label: "View",
    type: "select",
    default: "full",
    options: [
      { value: "full", label: "Status + devices" },
      {
        value: "devices",
        label: "Devices + battery",
        applies: { showDevices: true, showBattery: true },
      },
      {
        value: "status",
        label: "Status only",
        applies: { showDevices: false, showBattery: false },
      },
    ],
    group: "Content",
  },
  { key: "showStatus", label: "Bluetooth status", type: "boolean", default: true, group: "Content" },
  { key: "showDevices", label: "Paired devices", type: "boolean", default: true, group: "Content" },
  { key: "showBattery", label: "Battery levels", type: "boolean", default: true, group: "Content" },
  { key: "batteryMidColor", label: "Battery medium color", type: "color", default: "", group: "Battery colors" },
  { key: "batteryLowColor", label: "Battery low color", type: "color", default: "", group: "Battery colors" },
];

export const bluetoothModernModule: DashboardModule = {
  id: "bluetoothmodern",
  title: "Bluetooth (modern)",
  minCols: 2,
  minRows: 1,
  prefixes: [P],
  settings: BLUETOOTH_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = effectiveSettings(bluetoothModernModule, s);
    const groups = groupByContainer(sensors, P);
    if (groups.size === 0) return null;

    const statusGroups = [...groups.values()].filter((items) =>
      items.some((i) => i.key.endsWith(".bt_status"))
    );
    const deviceGroups = [...groups.values()].filter(
      (items) => items.length > 0 && !items.some((i) => i.key.endsWith(".bt_status"))
    );

    const status =
      statusGroups
        .map((items) => liveText(byName(items, "Status") ?? items[0].sensor))
        .find(Boolean) ?? liveText(statusGroups[0]?.[0]?.sensor);

    const devices = deviceGroups.map((items, i) => ({
      name: liveText(byName(items, "Name")) ?? `Device ${i + 1}`,
      status: liveText(byName(items, "Status")),
      battery: byName(items, "Battery Level")?.value,
    }));

    if (!status && devices.length === 0) return null;

    return (
      <ModernBluetooth
        status={status}
        devices={devices}
        showStatus={Boolean(cfg.showStatus)}
        showDevices={Boolean(cfg.showDevices)}
        showBattery={Boolean(cfg.showBattery)}
        batteryColors={{
          mid: String(cfg.batteryMidColor ?? ""),
          low: String(cfg.batteryLowColor ?? ""),
        }}
        layout={String(cfg.layout) as
          | "auto"
          | "card"
          | "standard"
          | "compact"
          | "simple"}
        surfaceStyle={String(cfg.surface) as "glass" | "matte-light" | "matte-dark"}
        chrome={chromeOf(cfg)}
      />
    );
  },
};
