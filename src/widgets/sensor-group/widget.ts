// Sensor Group: any list of readings as rows or tiles, or every hardware reading discovered. What the registry needs; the
// component is its own chunk.
import { decimalsOf, tempUnitOf, thresholdsOf } from "@/modules/setting-readers";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { boolSetting, colorSetting, enumSetting, FINE_DECIMALS, formatSetting, itemsOf, numberOf, numberSetting, oneOf, pass, sensorSetting, splitKeys, valueThresholds, viewSetting } from "../shared/settings-kit";
import type { SensorGroupProps } from "./SensorGroup";
import { meta } from "./meta";

// The `sensors` are stored as ordered keys (labelled from the sensor display name); the bar range, decimals and thresholds are shared by every item, and `items` overrides them (and the label) per sensor.
/** Pick sensors (the list) or Auto-discover (every hardware reading); `mode` was the `auto` toggle until config v8. */
const discovered = (v: ModuleSettings): boolean => v.mode === "auto";
const listed = (v: ModuleSettings): boolean => !discovered(v);

const settings: ModuleSetting[] = [
  enumSetting("mode", "Readings", "pick", [{ value: "pick", label: "Pick sensors" }, { value: "auto", label: "Auto-discover" }], { group: "Readings" }),
  viewSetting(meta, { label: "Layout", group: "Readings", visibleIf: listed }),
  boolSetting("bars", "Bar per item", true, { group: "Readings", visibleIf: listed }),
  numberSetting("maxRows", "Max rows (0 = all)", 12, { min: 0, max: 100, step: 2, group: "Readings", visibleIf: discovered }),
  // The dots of the discovered list: the theme's Critical, Series 3 and Series 5 ("" = red, blue, amber).
  colorSetting("tempColor", "Temperature dot", { role: "crit", more: false, visibleIf: discovered }),
  colorSetting("fanColor", "Fan dot", { role: "s3", more: false, visibleIf: discovered }),
  colorSetting("powerColor", "Power dot", { role: "s5", more: false, visibleIf: discovered }),
  // `items` (per-sensor overrides, a JSON object string) is tuned inline on each listed sensor.
  sensorSetting("sensors", "Sensors", { keyY: "items", defaultY: "", group: "Sensors", tab: "data", multiple: true, hint: "Empty = CPU, GPU, memory and volume. Tune a row to override its label, bar maximum, thresholds or decimals.", visibleIf: listed }),
  numberSetting("groupMax", "Bar maximum", 0, { min: 0, max: 500, step: 10, group: "Bar scale", tab: "data", hint: "Every item; 0 = Auto (100 for % and °, else no bar)", visibleIf: listed }),
  // Discovered temperatures read in the unit too.
  formatSetting("tempUnit"),
  { ...FINE_DECIMALS, visibleIf: listed },
  valueThresholds({ visibleIf: listed }),
];

function sensorItems(s: ModuleSettings): SensorGroupProps["sensors"] {
  const keys = splitKeys(s.sensors);
  if (!keys.length) return undefined;
  // 0 / blank bar maximum = automatic (SensorGroup derives it from the unit); unset decimals / levels = per reading / none
  const max = numberOf(s.groupMax) || undefined;
  const decimals = decimalsOf(s, "groupDecimals");
  const shared = { ...(max !== undefined ? { max } : {}), ...(decimals !== undefined ? { decimals } : {}), ...thresholdsOf(s, "value", ["groupWarn", "groupCrit"]) };
  const items = itemsOf(s.items);
  return keys.map((key) => ({ key, ...shared, ...items[key] }));
}

export default defineWidget({
  meta,
  // A summary card and a dense view of its own; the temperature unit and decimals, the Value threshold.
  inspector: { header: "yes", compact: BOTH, fmt: ["tempUnit", "decimals"], thr: ["value"] },
  settings,
  render: {
    load: () => import("./SensorGroup"),
    toProps: (s: ModuleSettings): Partial<SensorGroupProps> => ({
      ...pass<Partial<SensorGroupProps>>("bars", "maxRows", "tempColor", "fanColor", "powerColor")(s),
      auto: discovered(s),
      layout: oneOf(s.groupLayout, ["auto", "rows", "grid"]),
      sensors: sensorItems(s),
      tempUnit: tempUnitOf(s),
    }),
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 Value levels and decimals and the v8
  // `auto` → `mode` and dot colour roles; the sample is src/widgets/__fixtures__/snapshot.json, with no widget-qa demo
  // settings.
});
