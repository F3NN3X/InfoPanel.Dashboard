import { groupByContainer, liveText } from "@/lib/sensors";
import { templateModule } from "@/widgets/module";
import { bluetoothOptions, BLUETOOTH_SETTINGS } from "@/widgets/registry/e";
import { STANDARD_SETTINGS } from "./standard-settings";

const P = "plugins.bluetooth-battery-plugin.";

/**
 * Modern bluetooth widget: the `Bluetooth` template under the legacy id. The BTData plugin's main
 * container holds bt_status; each paired device gets its own container (name, status, battery).
 */
export const bluetoothModernModule = templateModule({
  ...bluetoothOptions,
  alias: {
    id: "bluetoothmodern",
    title: "Bluetooth (modern)",
    minCols: 2,
    minRows: 1,
    prefixes: [P],
    settings: [...STANDARD_SETTINGS, ...BLUETOOTH_SETTINGS],
    // No status and no device container: no section.
    hidden: (sensors) => {
      const groups = [...groupByContainer(sensors, P).values()];
      const isStatus = (items: { key: string }[]) => items.some((i) => i.key.endsWith(".bt_status"));
      const status = groups.filter(isStatus).some((items) => items.some((i) => liveText(i.sensor)));
      return !status && !groups.some((items) => items.length > 0 && !isStatus(items));
    },
  },
});
