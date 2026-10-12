// Template widgets, group B: storage, network, info, generic (see docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule, ModuleSetting, ModuleSettings } from "@/modules/types";
import { SENSOR_GROUP_SETTINGS } from "@/modules/hardware-modern";
import { NETWORK_SETTINGS } from "@/modules/network-modern";
import { WEATHER_SETTINGS, weatherToProps } from "@/modules/weather-modern";
import { templateModule } from "../module";
import { boolOf, boolSetting, deviceSetting, enumSetting, numberOf, numberSetting, oneOf, pass, sensorSetting, splitKeys, textSetting } from "./settings-kit";
import * as DriveSpace from "../DriveSpace";
import * as StorageHealth from "../StorageHealth";
import * as DiskIO from "../DiskIO";
import * as NetworkThroughput from "../NetworkThroughput";
import * as NetworkAdapters from "../NetworkAdapters";
import * as Clock from "../Clock";
import * as Calendar from "../Calendar";
import * as Weather from "../Weather";
import * as Forecast from "../Forecast";
import * as SensorValue from "../SensorValue";
import * as SensorGroup from "../SensorGroup";

const THRESHOLDS = "Thresholds";
/** A number where blank = the widget's own default. */
const optional = (key: string, label: string, group: string, hint?: string): ModuleSetting => textSetting(key, label, "", { group, hint });

/** The stored numbers among `keys`, as props of the same name (blank or non-numeric = left out). */
const numbersOf = <K extends string>(s: ModuleSettings, keys: readonly K[]): Partial<Record<K, number>> =>
  Object.fromEntries(keys.flatMap((k) => (numberOf(s[k]) === undefined ? [] : [[k, numberOf(s[k])]]))) as Partial<Record<K, number>>;

const DRIVE_SETTINGS: ModuleSetting[] = [
  deviceSetting("drive", "Drive", "drive", { group: "Drive space", hint: "Pin one volume; Auto lists all" }),
  enumSetting("sort", "Sort", "usage", [{ value: "usage", label: "By usage" }, { value: "name", label: "By name" }], { group: "Drive space" }),
  boolSetting("neutral", "Neutral below thresholds", true, { group: "Drive space" }),
  optional("warn", "Warn at %", THRESHOLDS, "Blank = 80"),
  optional("crit", "Critical at %", THRESHOLDS, "Blank = 92"),
];

const SENSOR_VALUE_SETTINGS: ModuleSetting[] = [
  sensorSetting("sensor", "Sensor", { group: "Sensor value" }),
  enumSetting("display", "Display", "value", [{ value: "value", label: "Value" }, { value: "gauge", label: "Gauge" }, { value: "bar", label: "Bar" }, { value: "spark", label: "Spark" }], { group: "Sensor value" }),
  optional("unit", "Unit override", "Sensor value", "Blank = the unit read from the value"),
  optional("decimals", "Decimals", "Sensor value", "Blank = automatic"),
  optional("min", "Minimum", "Sensor value", "Blank = 0"),
  optional("max", "Maximum", "Sensor value", "Blank = automatic"),
  optional("warn", "Warn at", THRESHOLDS),
  optional("crit", "Critical at", THRESHOLDS),
];

// SensorGroup's `sensors` are stored as ordered keys (labelled from the sensor display name); the bar range, decimals and thresholds are shared by every item.
const GROUP_SHARED = { groupMax: "max", groupDecimals: "decimals", groupWarn: "warn", groupCrit: "crit" } as const;
const SENSOR_GROUP_OWN: ModuleSetting[] = [
  sensorSetting("sensors", "Sensors", { group: "Sensor group", multiple: true, hint: "Empty = the sample list" }),
  enumSetting("groupLayout", "Layout", "auto", [{ value: "auto", label: "Auto" }, { value: "rows", label: "Rows" }, { value: "grid", label: "Grid" }], { group: "Sensor group" }),
  boolSetting("bars", "Bar per item", true, { group: "Sensor group" }),
  optional("groupMax", "Bar maximum", "Sensor group", "Every item; blank = no bar"),
  optional("groupDecimals", "Decimals", "Sensor group"),
  optional("groupWarn", "Warn at", THRESHOLDS),
  optional("groupCrit", "Critical at", THRESHOLDS),
];

function sensorItems(s: ModuleSettings): SensorGroup.SensorGroupProps["sensors"] {
  const keys = splitKeys(s.sensors);
  if (!keys.length) return undefined;
  const shared = Object.fromEntries(Object.entries(GROUP_SHARED).flatMap(([k, prop]) => (numberOf(s[k]) === undefined ? [] : [[prop, numberOf(s[k])]])));
  return keys.map((key) => ({ key, ...shared }));
}

const units = (group: string): ModuleSetting => enumSetting("units", "Units", "C", [{ value: "C", label: "°C" }, { value: "F", label: "°F" }], { group });
const yrLocation = (group: string): ModuleSetting => ({ key: "location", label: "Location", type: "select", default: "", optionsFrom: "sources", sourcePlugin: "plugins.yr-weather-plugin.", group, tab: "data", hint: "Blank = the first Yr location" });

export const GROUP_B: DashboardModule[] = [
  templateModule({
    meta: DriveSpace.meta,
    Component: DriveSpace.default,
    settings: DRIVE_SETTINGS,
    toProps: (s): Partial<DriveSpace.DriveSpaceProps> => ({ ...pass<Partial<DriveSpace.DriveSpaceProps>>("drive")(s), sort: oneOf(s.sort, ["usage", "name"]), ...numbersOf(s, ["warn", "crit"]), neutral: boolOf(s.neutral) }),
  }),
  templateModule({ meta: StorageHealth.meta, Component: StorageHealth.default, settings: [deviceSetting("disk", "Disk", "disk", { group: "Storage health", hint: "Auto = the first detected drive" })], toProps: pass<Partial<StorageHealth.StorageHealthProps>>("disk") }),
  templateModule({ meta: DiskIO.meta, Component: DiskIO.default, settings: [], toProps: () => ({}) }),
  templateModule({
    meta: NetworkThroughput.meta,
    Component: NetworkThroughput.default,
    settings: [
      ...NETWORK_SETTINGS,
      deviceSetting("adapter", "Adapter", "adapter", { group: "Content", hint: "Auto = the busiest adapter" }),
      enumSetting("chart", "Chart", "overlay", [{ value: "overlay", label: "Overlay" }, { value: "mirrored", label: "Mirrored" }], { group: "Content" }),
    ],
    toProps: pass<Partial<NetworkThroughput.NetworkThroughputProps>>("adapter", "chart", "view", "showTotals", "sparkline", "downloadColor", "uploadColor"),
  }),
  templateModule({
    meta: NetworkAdapters.meta,
    Component: NetworkAdapters.default,
    settings: [
      boolSetting("showDown", "Show adapters that are down", false, { group: "Network adapters" }),
      enumSetting("showIpv6", "IPv6 count", "auto", [{ value: "auto", label: "Large zones" }, { value: "show", label: "Show" }, { value: "hide", label: "Hide" }], { group: "Network adapters" }),
      boolSetting("hideIp", "Blur addresses", false, { group: "Network adapters", hint: "Privacy: addresses stay blurred" }),
    ],
    toProps: (s): Partial<NetworkAdapters.NetworkAdaptersProps> => ({ ...pass<Partial<NetworkAdapters.NetworkAdaptersProps>>("showDown", "hideIp")(s), showIpv6: s.showIpv6 === "show" ? true : s.showIpv6 === "hide" ? false : undefined }),
  }),
  templateModule({
    meta: Clock.meta,
    Component: Clock.default,
    settings: [
      enumSetting("face", "Face", "digital", [{ value: "digital", label: "Digital" }, { value: "analog", label: "Analog" }], { group: "Clock" }),
      enumSetting("format", "Hours", "24h", [{ value: "24h", label: "24-hour" }, { value: "12h", label: "12-hour" }], { group: "Clock" }),
      boolSetting("showSeconds", "Seconds", true, { group: "Clock" }),
      boolSetting("showDate", "Date", true, { group: "Clock" }),
    ],
    toProps: pass<Partial<Clock.ClockProps>>("format", "showSeconds", "showDate", "face"),
  }),
  templateModule({
    meta: Calendar.meta,
    Component: Calendar.default,
    settings: [enumSetting("weekStart", "Week starts on", "1", [{ value: "1", label: "Monday" }, { value: "0", label: "Sunday" }], { group: "Calendar" })],
    toProps: (s): Partial<Calendar.CalendarProps> => ({ weekStart: numberOf(oneOf(String(s.weekStart), ["0", "1"])) }),
  }),
  templateModule({
    meta: Weather.meta,
    Component: Weather.default,
    settings: [
      ...WEATHER_SETTINGS,
      enumSetting("provider", "Provider", "auto", [{ value: "auto", label: "Auto" }, { value: "yr", label: "Yr" }, { value: "owm", label: "OpenWeatherMap" }], { group: "Source", tab: "data" }),
      yrLocation("Source"),
      units("Display"),
    ],
    toProps: (s) => ({ ...pass<Partial<Weather.WeatherProps>>("location", "units")(s), provider: oneOf(s.provider, ["yr", "owm"]), ...weatherToProps(s) }),
  }),
  templateModule({
    meta: Forecast.meta,
    Component: Forecast.default,
    settings: [yrLocation("Weather"), numberSetting("days", "Days", 0, { min: 0, max: 7, step: 1, group: "Weather", hint: "0 = as many as fit" }), units("Weather")],
    toProps: (s): Partial<Forecast.ForecastProps> => ({ ...pass<Partial<Forecast.ForecastProps>>("location", "units")(s), days: numberOf(s.days) || undefined }),
  }),
  templateModule({
    meta: SensorValue.meta,
    Component: SensorValue.default,
    settings: SENSOR_VALUE_SETTINGS,
    toProps: (s): Partial<SensorValue.SensorValueProps> => ({ ...pass<Partial<SensorValue.SensorValueProps>>("sensor", "label", "display", "unit")(s), ...numbersOf(s, ["min", "max", "warn", "crit", "decimals"]) }),
  }),
  templateModule({
    meta: SensorGroup.meta,
    Component: SensorGroup.default,
    settings: [...SENSOR_GROUP_SETTINGS, ...SENSOR_GROUP_OWN],
    toProps: (s): Partial<SensorGroup.SensorGroupProps> => ({
      ...pass<Partial<SensorGroup.SensorGroupProps>>("bars", "auto", "maxRows", "tempColor", "fanColor", "powerColor")(s),
      layout: oneOf(s.groupLayout, ["auto", "rows", "grid"]),
      sensors: sensorItems(s),
    }),
  }),
];
