// The hardware readings' settings: SensorGroup's auto-discovered list and the Thermals gauges, under the
// keys and defaults the old Hardware widget stored (LibreHardwareMonitor / HWiNFO, `libre.*` / `hwinfo.*`).
import type { ModuleSetting } from "@/modules/types";

const MAX_ROWS: ModuleSetting = {
  key: "maxRows",
  label: "Max rows (0 = all)",
  type: "number",
  default: 12,
  min: 0,
  max: 100,
  step: 2,
  group: "Content",
};
const SHOW_FANS: ModuleSetting = { key: "showFans", label: "Fan readings", type: "boolean", default: true, group: "Content" };
const TEMP_COLOR: ModuleSetting = { key: "tempColor", label: "Temperature dot color", type: "color", default: "", group: "Dot colors" };
const FAN_COLOR: ModuleSetting = { key: "fanColor", label: "Fan dot color", type: "color", default: "", group: "Dot colors" };
const POWER_COLOR: ModuleSetting = { key: "powerColor", label: "Power dot color", type: "color", default: "", group: "Dot colors" };

/** The SensorGroup template's own settings: the auto-discovered list. */
export const SENSOR_GROUP_SETTINGS: ModuleSetting[] = [
  { key: "auto", label: "Auto-discover hardware readings", type: "boolean", default: false, group: "Content" },
  { ...MAX_ROWS, visibleIf: (v) => Boolean(v.auto) },
  { ...TEMP_COLOR, visibleIf: (v) => Boolean(v.auto) },
  { ...FAN_COLOR, visibleIf: (v) => Boolean(v.auto) },
  { ...POWER_COLOR, visibleIf: (v) => Boolean(v.auto) },
];

/** The Thermals template's own settings: gauges, every sensor, the fan row. */
export const THERMALS_SETTINGS: ModuleSetting[] = [
  {
    key: "view",
    label: "View",
    type: "select",
    default: "bars",
    options: [
      { value: "bars", label: "Bars" },
      { value: "gauges", label: "Temp gauges" },
    ],
    group: "Content",
  },
  { key: "discover", label: "All temperature sensors", type: "boolean", default: false, group: "Content" },
  { ...SHOW_FANS, visibleIf: (v) => v.view === "gauges" },
  { ...FAN_COLOR, group: "Content", visibleIf: (v) => v.view === "gauges" },
];
