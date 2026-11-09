// Template widgets, group B: storage, network, info, generic (see _docs/redesign/phase9/brief-9.3c-templates.md).
import { decimalsOf, thresholdsOf } from "@/modules/setting-readers";
import type { DashboardModule, ModuleSetting, ModuleSettings } from "@/modules/types";
import { templateModule } from "../module";
import { boolSetting, enumSetting, FINE_DECIMALS, numberOf, numberSetting, pass, sensorSetting, textSetting, valueThresholds } from "../shared/settings-kit";
import * as SensorValue from "../SensorValue";
import * as CustomGauge from "../CustomGauge";

/** A number where blank = the widget's own default. */
const optional = (key: string, label: string, group: string, hint?: string): ModuleSetting => textSetting(key, label, "", { group, hint });

/** The stored numbers among `keys`, as props of the same name (blank or non-numeric = left out). */
const numbersOf = <K extends string>(s: ModuleSettings, keys: readonly K[]): Partial<Record<K, number>> =>
  Object.fromEntries(keys.flatMap((k) => (numberOf(s[k]) === undefined ? [] : [[k, numberOf(s[k])]]))) as Partial<Record<K, number>>;

/** A stored number where 0 (and blank) = off / automatic. */
const positiveOf = (v: unknown): number | undefined => numberOf(v) || undefined;
const ranged = (v: ModuleSettings): boolean => v.display === "gauge" || v.display === "bar" || v.display === "line";

const SENSOR_VALUE_SETTINGS: ModuleSetting[] = [
  enumSetting("display", "Display", "value", [{ value: "value", label: "Value" }, { value: "gauge", label: "Gauge" }, { value: "bar", label: "Bar" }, { value: "spark", label: "Spark" }, { value: "line", label: "Line" }, { value: "figure", label: "Figure" }], { group: "Display" }),
  enumSetting("lineValue", "Value in the line", "meter", [{ value: "meter", label: "At the end, with a meter" }, { value: "end", label: "At the end" }, { value: "next", label: "Next to the label" }, { value: "only", label: "Value only" }, { value: "stack", label: "Label and value over a thin bar" }], { group: "Display", visibleIf: (v) => v.display === "line" }),
  boolSetting("labelInside", "Label inside the ring", false, { group: "Display", visibleIf: (v) => v.display === "gauge" }),
  boolSetting("smallUnit", "Small unit", false, { group: "Display", visibleIf: (v) => v.display === "figure" }),
  optional("unit", "Unit override", "Display", "Blank = the unit read from the value"),
  sensorSetting("sensor", "Sensor", { group: "Reading" }),
  numberSetting("min", "Minimum", 0, { group: "Bar scale", tab: "data", visibleIf: ranged }),
  numberSetting("max", "Maximum", 0, { group: "Bar scale", tab: "data", hint: "0 = automatic", visibleIf: ranged }),
  FINE_DECIMALS,
  valueThresholds(),
];

export const GROUP_B: DashboardModule[] = [
  templateModule({
    meta: SensorValue.meta,
    Component: SensorValue.default,
    settings: SENSOR_VALUE_SETTINGS,
    toProps: (s): Partial<SensorValue.SensorValueProps> => {
      const decimals = decimalsOf(s);
      return {
        ...pass<Partial<SensorValue.SensorValueProps>>("sensor", "label", "display", "unit", "lineValue", "smallUnit", "labelInside")(s),
        ...numbersOf(s, ["min"]),
        ...(decimals !== undefined ? { decimals } : {}),
        ...thresholdsOf(s, "value", ["warn", "crit"]),
        max: positiveOf(s.max),
      };
    },
  }),
  templateModule({
    meta: CustomGauge.meta,
    Component: CustomGauge.default,
    settings: [
      // The standard `label` is the title, as for Sensor.
      sensorSetting("sensor", "Sensor", { group: "Sensor" }),
      // The spec is edited in Gauges: the raw JSON never shows as a field.
      textSetting("gauge", "Gauge", JSON.stringify(CustomGauge.DEFAULT_GAUGE_SPEC), { hidden: true }),
      // Frames a library gauge arrived with (JSON): kept for an export, never shown or drawn.
      textSetting("frames", "Frames", "", { hidden: true }),
    ],
    toProps: (s): Partial<CustomGauge.CustomGaugeProps> => ({ ...pass<Partial<CustomGauge.CustomGaugeProps>>("sensor")(s), gauge: CustomGauge.parseGaugeSetting(s.gauge) }),
  }),
];
