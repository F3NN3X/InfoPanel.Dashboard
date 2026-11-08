// Status Bar: a one-row bar with a left, a center and a right slot. What the registry needs; the component is its own chunk.
import { clockOf, tempUnitOf } from "@/modules/setting-readers";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { DENSE, defineWidget } from "../define";
import { boolOf, boolSetting, enumSetting, formatSetting, iconsOf, numberOf, numberSetting, oneOf, rateUnitOf, rateUnitSetting, splitKeys, stringOf, textSetting, viewSetting } from "../shared/settings-kit";
import { ITEMS, ITEM_LABELS } from "./item-keys";
import { meta } from "./meta";
import type { StatusBarProps } from "./StatusBar";

/** A Status Bar slot: the stored comma-separated items that exist; undefined while unset (the bar's own). */
const slotOf = (v: unknown) => (v === undefined ? undefined : splitKeys(v).flatMap((k) => oneOf(k, ITEMS) ?? []));
const barUses = (...keys: (typeof ITEMS)[number][]) => (v: ModuleSettings) => [v.left ?? "logo", v.center ?? "date,time", v.right ?? "weather,network,volume,battery"].some((s) => splitKeys(s).some((k) => (keys as string[]).includes(k)));
const BAR_ITEMS = ITEMS.map((value) => ({ value, label: ITEM_LABELS[value] }));
const usesWeather = barUses("weather");
const settings: ModuleSetting[] = [
  // The presets set the slots when added; switching View in the inspector changes the frame only, so it is a plain select
  { ...viewSetting(meta, { group: "Layout" }), type: "select", options: (meta.views ?? []).map((v) => ({ value: v.id, label: v.name })) },
  enumSetting("left", "Left", "logo", BAR_ITEMS, { multiple: true, group: "Slots", hint: "Items show in the order picked; one with no data is left out" }),
  enumSetting("center", "Center", "date,time", BAR_ITEMS, { multiple: true, group: "Slots" }),
  enumSetting("right", "Right", "weather,network,volume,battery", BAR_ITEMS, { multiple: true, group: "Slots" }),
  enumSetting("display", "Show", "both", [{ value: "both", label: "Icon and value" }, { value: "value", label: "Value" }, { value: "icon", label: "Icon" }], { group: "Display", perWidget: true, hint: "Network, volume and battery show their icon only, unless set to Value" }),
  boolSetting("separators", "Dividers", true, { group: "Display", perWidget: true }),
  enumSetting("spacing", "Spacing", "normal", [{ value: "compact", label: "Compact" }, { value: "normal", label: "Normal" }, { value: "roomy", label: "Roomy" }], { group: "Display", perWidget: true }),
  { key: "logoIcon", label: "Logo icon", type: "icon", default: "monitor", group: "Logo", visibleIf: barUses("logo") },
  { key: "logoImage", label: "Logo image", type: "image", default: "", group: "Logo", perWidget: true, hint: "Replaces the icon", visibleIf: barUses("logo") },
  textSetting("text", "Text", "", { group: "Text", hint: "Empty = the item is left out", visibleIf: barUses("text") }),
  boolSetting("seconds", "Show seconds", false, { group: "Time", visibleIf: barUses("time", "datetime") }),
  { key: "iconSet", label: "Weather icon set", type: "select", default: "app", options: [{ value: "app", label: "App icons" }, { value: "meteocons", label: "Meteocons" }], group: "Icons", perWidget: true, visibleIf: usesWeather },
  { key: "iconStyle", label: "Icon style", type: "select", default: "line", options: [{ value: "fill", label: "Fill" }, { value: "flat", label: "Flat" }, { value: "line", label: "Line" }, { value: "monochrome", label: "Monochrome" }], group: "Icons", perWidget: true, visibleIf: (v) => usesWeather(v) && v.iconSet === "meteocons" },
  { key: "iconAnimated", label: "Animated icons", type: "boolean", default: false, group: "Icons", perWidget: true, hint: "Animated icons use more CPU and memory on the kiosk, and run outside the Max FPS cap.", visibleIf: (v) => usesWeather(v) && v.iconSet === "meteocons" },
  enumSetting("islandGap", "Gap for the island", "auto", [{ value: "auto", label: "Auto" }, { value: "off", label: "Off" }, { value: "custom", label: "Custom" }], { group: "Island", perWidget: true, hint: "Auto leaves room for the Dynamic Island at the page center while it is on; the center items split around it" }),
  numberSetting("islandGapPx", "Gap width (px)", 160, { min: 80, max: 400, step: 10, group: "Island", perWidget: true, visibleIf: (v) => v.islandGap === "custom" }),
  formatSetting("clock"),
  formatSetting("tempUnit"),
  rateUnitSetting(),
];

export default defineWidget({
  meta,
  // No header; a dense view of its own, no summary card; its time, temperatures and network rates follow Units & format.
  inspector: { header: "none", compact: DENSE, fmt: ["clock", "tempUnit", "rateUnit"] },
  settings,
  render: {
    load: () => import("./StatusBar"),
    toProps: (s: ModuleSettings): Partial<StatusBarProps> => ({
      view: oneOf(s.view, ["edge", "pill", "islands", "meters", "orbit", "ticker"]),
      left: slotOf(s.left),
      center: slotOf(s.center),
      right: slotOf(s.right),
      display: oneOf(s.display, ["both", "value", "icon"]),
      separators: boolOf(s.separators),
      spacing: oneOf(s.spacing, ["compact", "normal", "roomy"]),
      logoIcon: stringOf(s.logoIcon),
      logoImage: stringOf(s.logoImage),
      text: stringOf(s.text),
      seconds: boolOf(s.seconds),
      clock: clockOf(s),
      tempUnit: tempUnitOf(s),
      rateUnit: rateUnitOf(s.rateUnit),
      ...iconsOf(s),
      islandGap: oneOf(s.islandGap, ["auto", "off", "custom"]),
      islandGapPx: numberOf(s.islandGapPx),
    }),
  },
  // Migrations and sample stay central (the default): no migration steps of its own today; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
