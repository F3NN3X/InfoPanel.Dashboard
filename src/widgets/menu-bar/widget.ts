// Menu Bar: a glance strip of labels and values. What the registry needs; the component is its own chunk.
import { deviceOf } from "@/modules/setting-readers";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { defineWidget } from "../define";
import { boolOf, boolSetting, deviceSetting, enumSetting, listPick, oneOf, optionPairs as opts, rateUnitOf, rateUnitSetting, splitKeys } from "../shared/settings-kit";
import type { MenuBarProps } from "./MenuBar";
import { meta } from "./meta";

const MENU_ITEMS = ["cpu", "gpu", "temp", "mem", "down", "up", "nvme"] as const;
const MENU_LABELS: [string, string][] = [["cpu", "CPU"], ["gpu", "GPU"], ["temp", "Temperature"], ["mem", "Memory"], ["down", "Download"], ["up", "Upload"], ["nvme", "NVMe"]];
/** Download or Upload is in the bar: the network settings apply. */
const showsNet = (v: ModuleSettings): boolean => splitKeys(v.items ?? MENU_ITEMS.join(",")).some((k) => k === "down" || k === "up");

const settings: ModuleSetting[] = [
  enumSetting("items", "Items", MENU_ITEMS.join(","), opts(...MENU_LABELS), { multiple: true, group: "Items" }),
  enumSetting("active", "Active item", "", opts(["", "None"], ...MENU_LABELS), { group: "Items", hint: "Shown selected, with its detail when the widget is tall enough: for screens nobody clicks" }),
  enumSetting("stacked", "Label placement", "auto", opts(["auto", "Auto"], ["stacked", "Stacked"], ["inline", "Inline"]), { group: "Items" }),
  deviceSetting("Network adapter", "adapter", { group: "Network adapter", visibleIf: showsNet }),
  boolSetting("dropdown", "Detail dropdown on click", true, { group: "Interaction", tab: "behaviour" }),
  rateUnitSetting({ visibleIf: showsNet }),
];

export default defineWidget({
  meta,
  // No header; a summary card and a dense view of its own; the speed unit of its network rates.
  inspector: { header: "none", compact: { card: true, dense: true }, fmt: ["rateUnit"] },
  settings,
  render: {
    load: () => import("./MenuBar"),
    toProps: (s: ModuleSettings): Partial<MenuBarProps> => ({
      items: listPick(s.items, MENU_ITEMS),
      active: oneOf(s.active, MENU_ITEMS),
      stacked: s.stacked === "stacked" ? true : s.stacked === "inline" ? false : undefined,
      dropdown: boolOf(s.dropdown),
      adapter: deviceOf(s, "adapter"),
      rateUnit: rateUnitOf(s.rateUnit),
    }),
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 device key and old speed-unit
  // default; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
