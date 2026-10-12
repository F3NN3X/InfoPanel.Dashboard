import SensorGroup, { meta, type SensorGroupProps } from "@/widgets/SensorGroup";
import Thermals, { type ThermalsProps } from "@/widgets/Thermals";
import { templateModule } from "@/widgets/module";
import type { ModuleSetting, ModuleSettings } from "./types";

/**
 * Modern hardware widget — key readings from the LibreHardwareMonitor /
 * HWiNFO exports (the `libre.*` and `hwinfo.*` sensor keys). The reading list is the
 * `SensorGroup` template in auto-discovery mode (kind-colored dots: temp / fan / power),
 * the Temp gauges view is the `Thermals` template; both render through the widget shell.
 */

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

const HARDWARE_MODERN_SETTINGS: ModuleSetting[] = [
  {
    key: "view",
    label: "View",
    type: "select",
    default: "list",
    options: [
      { value: "list", label: "Reading list" },
      { value: "temps", label: "Temp gauges", applies: { showFans: true } },
    ],
    group: "Content",
  },
  MAX_ROWS,
  SHOW_FANS,
  TEMP_COLOR,
  FAN_COLOR,
  POWER_COLOR,
];

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

type HardwareProps = SensorGroupProps & ThermalsProps & { gauges?: boolean };

/** The Temp gauges view is Thermals; the reading list is SensorGroup in auto mode. */
function Hardware({ gauges, ...p }: HardwareProps) {
  return gauges ? <Thermals {...p} view="gauges" discover /> : <SensorGroup {...p} auto />;
}

export const hardwareToProps = (s: ModuleSettings): Partial<HardwareProps> => ({
  gauges: s.view === "temps",
  maxRows: Math.max(0, Math.round(Number(s.maxRows) || 0)),
  showFans: Boolean(s.showFans),
  tempColor: String(s.tempColor ?? ""),
  fanColor: String(s.fanColor ?? ""),
  powerColor: String(s.powerColor ?? ""),
});

export const hardwareModernModule = templateModule({
  meta,
  Component: Hardware,
  settings: HARDWARE_MODERN_SETTINGS,
  toProps: hardwareToProps,
  title: "Hardware (modern)",
  legacy: { id: "hardwaremodern", minCols: 2, minRows: 1, prefixes: ["libre.", "hwinfo."], libraryHidden: true },
});
