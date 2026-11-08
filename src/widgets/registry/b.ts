// Template widgets, group B: storage, network, info, generic (see _docs/redesign/phase9/brief-9.3c-templates.md).
import { clockOf, decimalsOf, deviceOf, tempUnitOf, thresholdsOf } from "@/modules/setting-readers";
import type { DashboardModule, ModuleSetting, ModuleSettings } from "@/modules/types";
import { templateModule } from "../module";
import { lazyWidget } from "../lazy-widget";
import * as M from "../meta";
import { boolOf, boolSetting, colorSetting, dateSetting, deviceSetting, enumSetting, FINE_DECIMALS, formatSetting, iconsOf, numberOf, numberSetting, oneOf, pass, rateUnitOf, rateUnitSetting, sensorSetting, stringOf, textSetting, thresholdSetting, timeSetting, valueThresholds, viewOnly, viewsExcept, viewSetting } from "../shared/settings-kit";
import { driveSpaceIsland, networkAdaptersIsland, networkThroughputIsland } from "../island/hardware";
import { weatherIsland } from "../island/info";
import { countdownIsland } from "../island/countdown";
import { timerIsland } from "../island/timer";
import type * as DriveSpace from "../DriveSpace";
import type * as NetworkThroughput from "../NetworkThroughput";
import type * as NetworkAdapters from "../NetworkAdapters";
import type * as Timer from "../Timer";
import type * as Countdown from "../Countdown";
import { isDate, isTime } from "@/lib/countdown";
import type * as Weather from "../Weather";
import type * as Forecast from "../Forecast";
import * as SensorValue from "../SensorValue";
import * as CustomGauge from "../CustomGauge";

/** "5, 15, 25" → [5, 15, 25]: whole minutes 1-1440, at most eight. */
export const presetsOf = (v: unknown): number[] | undefined => {
  const list = String(v ?? "")
    .split(",")
    .map((x) => Math.round(Number(x.trim())))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 1440)
    .slice(0, 8);
  return list.length ? list : undefined;
};
/** A number where blank = the widget's own default. */
const optional = (key: string, label: string, group: string, hint?: string): ModuleSetting => textSetting(key, label, "", { group, hint });

/** The stored numbers among `keys`, as props of the same name (blank or non-numeric = left out). */
const numbersOf = <K extends string>(s: ModuleSettings, keys: readonly K[]): Partial<Record<K, number>> =>
  Object.fromEntries(keys.flatMap((k) => (numberOf(s[k]) === undefined ? [] : [[k, numberOf(s[k])]]))) as Partial<Record<K, number>>;

const DRIVE_SETTINGS: ModuleSetting[] = [
  viewSetting(M.DriveSpace, { group: "Drive" }),
  deviceSetting("Drive", "drive", { group: "Drive", hint: "Pin one volume; Auto lists all" }),
  enumSetting("sort", "Sort", "usage", [{ value: "usage", label: "By usage" }, { value: "name", label: "By name" }], { group: "Sorting", tab: "behaviour" }),
  // Segments and Bars always colour by fullness.
  viewOnly(M.DriveSpace, "list")(boolSetting("neutral", "Neutral below thresholds", false, { tab: "style", perWidget: true })),
  thresholdSetting("full"),
  textSetting("icons", "Drive icons", "", { group: "Drive", driveIcons: true, keywords: ["emblem", "image", "logo"], hint: "Your own image or an icon for each drive" }),
];

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

/** NetworkThroughput's view and toggles, under the old Network widget's keys. */
// The old `view` select (speeds / totals) only bundled these two switches; a stored `view` is ignored.
const NETWORK_SETTINGS: ModuleSetting[] = [
  { key: "showTotals", label: "Session totals", type: "boolean", default: true, group: "Traffic" },
  { key: "sparkline", label: "Trend sparkline", type: "boolean", default: false, group: "Traffic" },
  // The speeds follow the theme's Series 1 and 2 ("" = the widget's own colours).
  colorSetting("downloadColor", "Download", { role: "s1", more: false }),
  colorSetting("uploadColor", "Upload", { role: "s2", more: false }),
  rateUnitSetting(),
];

/** Weather's view and toggles, under the old Weather widget's keys. */
const WEATHER_ROWS: ModuleSetting[] = [
  viewSetting(M.Weather, { label: "Preset", group: "Display", hint: "Sets the three toggles below. Change one and the preset reads Custom." }),
  { key: "showStats", label: "Stats row", type: "boolean", default: true, group: "Display" },
  { key: "showFeels", label: "Feels-like", type: "boolean", default: true, group: "Display" },
  { key: "showForecast", label: "Forecast strip", type: "boolean", default: true, group: "Display" },
  {
    key: "forecastDays",
    label: "Forecast days",
    type: "number",
    default: 5,
    min: 1,
    max: 7,
    step: 1,
    group: "Display",
    visibleIf: (v) => v.showForecast !== false,
  },
  { key: "tint", label: "Tint from conditions", type: "boolean", default: true, tab: "style", perWidget: true },
  {
    key: "iconSet",
    label: "Icon set",
    type: "select",
    default: "app",
    options: [
      { value: "app", label: "App icons" },
      { value: "meteocons", label: "Meteocons" },
    ],
    group: "Icons",
    perWidget: true,
  },
  {
    key: "iconStyle",
    label: "Icon style",
    type: "select",
    default: "line",
    options: [
      { value: "fill", label: "Fill" },
      { value: "flat", label: "Flat" },
      { value: "line", label: "Line" },
      { value: "monochrome", label: "Monochrome" },
    ],
    group: "Icons",
    perWidget: true,
    visibleIf: (v) => v.iconSet === "meteocons",
  },
  {
    key: "iconAnimated",
    label: "Animated icons",
    type: "boolean",
    default: false,
    group: "Icons",
    perWidget: true,
    hint: "Animated icons use more CPU and memory on the kiosk, and run outside the Max FPS cap.",
    visibleIf: (v) => v.iconSet === "meteocons",
  },
  {
    key: "fxOn",
    label: "Animated background",
    type: "boolean",
    default: false,
    group: "Background",
    perWidget: true,
    hint: "Animated backgrounds use more CPU, GPU and memory on the kiosk. They follow Max FPS and stop when reduced motion is on.",
  },
  { key: "fxIntensity", label: "Intensity", type: "number", default: 1, min: 0.25, max: 2, step: 0.25, group: "Background", perWidget: true, visibleIf: (v) => v.fxOn === true },
  { key: "fxDensity", label: "Particles", type: "number", default: 100, min: 25, max: 200, step: 25, group: "Background", perWidget: true, visibleIf: (v) => v.fxOn === true },
  { key: "fxSpeed", label: "Speed", type: "number", default: 1, min: 0.5, max: 2, step: 0.25, group: "Background", perWidget: true, visibleIf: (v) => v.fxOn === true },
  { key: "fxWind", label: "Wind", type: "select", default: "auto", options: [{ value: "auto", label: "Auto" }, { value: "none", label: "None" }, { value: "left", label: "Left" }, { value: "right", label: "Right" }], group: "Background", perWidget: true, visibleIf: (v) => v.fxOn === true },
  { key: "fxLightning", label: "Lightning", type: "boolean", default: true, group: "Background", perWidget: true, visibleIf: (v) => v.fxOn === true },
  { key: "fxClouds", label: "Clouds and fog", type: "boolean", default: true, group: "Background", perWidget: true, visibleIf: (v) => v.fxOn === true },
  { key: "fxOpacity", label: "Strength", type: "number", default: 100, min: 20, max: 100, step: 10, group: "Background", perWidget: true, visibleIf: (v) => v.fxOn === true },
  { key: "fxPreview", label: "Show", type: "select", default: "auto", options: [{ value: "auto", label: "Live condition" }, { value: "clear", label: "Clear" }, { value: "cloudy", label: "Cloudy" }, { value: "rain", label: "Rain" }, { value: "snow", label: "Snow" }, { value: "hail", label: "Hail" }, { value: "thunder", label: "Thunder" }, { value: "fog", label: "Fog" }], group: "Background", perWidget: true, visibleIf: (v) => v.fxOn === true },
];
/** The views that draw the stats, feels-like and forecast strip toggles (Glance and Week have their own layout). */
const togglesShown = viewOnly(M.Weather, "full", "now", "minimal");
/** The Forecast view is the Forecast widget: no tint, background or provider of its own. */
const notForecast = viewOnly(M.Weather, ...viewsExcept(M.Weather, "forecast"));
const WEATHER_GATE = (d: ModuleSetting): ModuleSetting =>
  ["showStats", "showFeels", "showForecast"].includes(d.key) ? togglesShown(d) : d.key === "tint" || d.key.startsWith("fx") ? notForecast(d) : d;
const WEATHER_SETTINGS: ModuleSetting[] = WEATHER_ROWS.map(WEATHER_GATE);

/** The stored settings as the Weather template's props (`forecastDays` is its `days`). */
const weatherToProps = (s: ModuleSettings): Partial<Weather.WeatherProps> => ({
  view: s.view as Weather.WeatherProps["view"],
  tint: Boolean(s.tint),
  showStats: Boolean(s.showStats),
  showFeels: Boolean(s.showFeels),
  showForecast: Boolean(s.showForecast),
  days: Math.max(1, Math.min(7, Math.round(Number(s.forecastDays) || 5))),
  ...iconsOf(s),
  ...fxOf(s),
});

/** The animated-background settings as the Weather props, each clamped to its range. */
const fxOf = (s: ModuleSettings): Partial<Weather.WeatherProps> => {
  const range = (v: unknown, lo: number, hi: number) => {
    const n = numberOf(v);
    return n === undefined ? undefined : Math.min(hi, Math.max(lo, n));
  };
  return {
    fxOn: s.fxOn === true,
    fxWind: oneOf(s.fxWind, ["auto", "none", "left", "right"]),
    fxPreview: oneOf(s.fxPreview, ["auto", "clear", "cloudy", "rain", "snow", "hail", "thunder", "fog"]),
    fxOpts: {
      intensity: range(s.fxIntensity, 0.25, 2),
      density: range(s.fxDensity, 25, 200),
      speed: range(s.fxSpeed, 0.5, 2),
      lightning: s.fxLightning !== false,
      clouds: s.fxClouds !== false,
      opacity: range(s.fxOpacity, 20, 100),
    },
  };
};

/** The weather templates' `units` prop from the themed Temperature unit (config v7 moved `units` → `tempUnit`). */
const unitsOf = (s: ModuleSettings): "C" | "F" => (tempUnitOf(s) === "f" ? "F" : "C");
const yrLocation = (group: string): ModuleSetting => ({ key: "location", label: "Location", type: "select", default: "", optionsFrom: "sources", sourcePlugin: "plugins.yr-weather-plugin.", group, tab: "data", hint: "Blank = the first Yr location" });

export const GROUP_B: DashboardModule[] = [
  templateModule({
    meta: M.DriveSpace,
    Component: lazyWidget(() => import("../DriveSpace")),
    settings: DRIVE_SETTINGS,
    toProps: (s): Partial<DriveSpace.DriveSpaceProps> => ({ view: oneOf(s.view, ["list", "segments", "bars"]), drive: deviceOf(s, "drive"), sort: oneOf(s.sort, ["usage", "name"]), ...thresholdsOf(s, "full", ["warn", "crit"]), neutral: boolOf(s.neutral), icons: stringOf(s.icons) }),
    island: driveSpaceIsland,
  }),
  templateModule({
    meta: M.NetworkThroughput,
    Component: lazyWidget(() => import("../NetworkThroughput")),
    settings: [
      ...NETWORK_SETTINGS,
      deviceSetting("Adapter", "adapter", { group: "Adapter" }),
      enumSetting("chart", "Chart", "overlay", [{ value: "overlay", label: "Overlay" }, { value: "mirrored", label: "Mirrored" }], { group: "Traffic", visibleIf: (v) => Boolean(v.sparkline) }),
    ],
    toProps: (s) => ({
      ...pass<Partial<NetworkThroughput.NetworkThroughputProps>>("chart", "showTotals", "sparkline", "downloadColor", "uploadColor")(s),
      adapter: deviceOf(s, "adapter"),
      rateUnit: rateUnitOf(s.rateUnit),
    }),
    island: networkThroughputIsland,
  }),
  templateModule({
    meta: M.NetworkAdapters,
    Component: lazyWidget(() => import("../NetworkAdapters")),
    settings: [
      boolSetting("showDown", "Show adapters that are down", false, { group: "Adapters" }),
      enumSetting("showIpv6", "IPv6 count", "auto", [{ value: "auto", label: "Large sizes" }, { value: "show", label: "Show" }, { value: "hide", label: "Hide" }], { group: "Addresses" }),
      boolSetting("hideIp", "Blur addresses", false, { group: "Addresses", hint: "Privacy: addresses stay blurred" }),
    ],
    toProps: (s): Partial<NetworkAdapters.NetworkAdaptersProps> => ({ ...pass<Partial<NetworkAdapters.NetworkAdaptersProps>>("showDown", "hideIp")(s), showIpv6: s.showIpv6 === "show" ? true : s.showIpv6 === "hide" ? false : undefined }),
    island: networkAdaptersIsland,
  }),
  templateModule({
    meta: M.Timer,
    Component: lazyWidget(() => import("../Timer")),
    settings: [
      textSetting("presets", "Presets (minutes)", "5, 15, 25", { group: "Presets", hint: "The buttons, comma separated" }),
      boolSetting("pomodoro", "Pomodoro button", false, { group: "Pomodoro", hint: "Focus and break rounds until stopped" }),
      numberSetting("focusMin", "Focus (min)", 25, { min: 5, max: 90, step: 5, group: "Pomodoro", visibleIf: (v) => v.pomodoro === true }),
      numberSetting("breakMin", "Break (min)", 5, { min: 1, max: 30, step: 1, group: "Pomodoro", visibleIf: (v) => v.pomodoro === true }),
    ],
    toProps: (s): Partial<Timer.TimerProps> => ({
      presets: presetsOf(s.presets),
      pomodoro: boolOf(s.pomodoro),
      focusMin: numberOf(s.focusMin),
      breakMin: numberOf(s.breakMin),
    }),
    island: timerIsland,
  }),
  templateModule({
    meta: M.Countdown,
    Component: lazyWidget(() => import("../Countdown")),
    settings: [
      viewSetting(M.Countdown, { group: "Event" }),
      textSetting("eventName", "Event name", "", { group: "Event", hint: "Empty = no title line" }),
      dateSetting("date", "Date", "", { group: "Event", tab: "data" }),
      timeSetting("time", "Time of day", "", { group: "Event", tab: "data", hint: "Empty = an all-day event" }),
      enumSetting("count", "Count", "auto", [{ value: "auto", label: "Auto" }, { value: "until", label: "Until" }, { value: "since", label: "Since" }], { group: "Counting", tab: "data", hint: "Auto counts up an hour after the start (the rest of the day when all-day)" }),
      enumSetting("breakdown", "Breakdown", "auto", [{ value: "auto", label: "Auto" }, { value: "days", label: "Days" }, { value: "years", label: "Years" }, { value: "live", label: "Live" }], { group: "Counting", tab: "data", hint: "Live adds seconds" }),
      boolSetting("showDate", "Show the date", true, { group: "Event" }),
      formatSetting("clock"),
    ],
    // A malformed date or time reads as unset.
    toProps: (s): Partial<Countdown.CountdownProps> => ({
      view: oneOf(s.view, ["inline", "tiles", "big"]),
      eventName: stringOf(s.eventName),
      date: isDate(s.date) ? s.date : undefined,
      time: isTime(s.time) ? s.time : undefined,
      count: oneOf(s.count, ["auto", "until", "since"]),
      breakdown: oneOf(s.breakdown, ["auto", "days", "years", "live"]),
      showDate: boolOf(s.showDate),
      clock: clockOf(s),
    }),
    island: countdownIsland,
  }),
  templateModule({
    meta: M.Weather,
    Component: lazyWidget(() => import("../Weather")),
    settings: [
      ...WEATHER_SETTINGS,
      notForecast(enumSetting("provider", "Provider", "auto", [{ value: "auto", label: "Auto" }, { value: "yr", label: "Yr" }, { value: "owm", label: "OpenWeatherMap" }], { group: "Source", tab: "data" })),
      // The Forecast view reads Yr whatever the provider.
      { ...yrLocation("Source"), visibleIf: (v) => v.view === "forecast" || v.provider !== "owm" },
      formatSetting("tempUnit"),
    ],
    toProps: (s) => ({ ...pass<Partial<Weather.WeatherProps>>("location")(s), units: unitsOf(s), provider: oneOf(s.provider, ["yr", "owm"]), ...weatherToProps(s) }),
    island: weatherIsland,
  }),
  templateModule({
    meta: M.Forecast,
    Component: lazyWidget(() => import("../Forecast")),
    settings: [numberSetting("days", "Days", 0, { min: 0, max: 7, step: 1, group: "Days", hint: "0 = as many as fit" }), yrLocation("Location"), formatSetting("tempUnit")],
    toProps: (s): Partial<Forecast.ForecastProps> => ({ ...pass<Partial<Forecast.ForecastProps>>("location")(s), units: unitsOf(s), days: numberOf(s.days) || undefined }),
  }),
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
