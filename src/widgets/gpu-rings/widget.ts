// GPU Rings: VRAM, core load and temperature as stacked rings. What the registry needs; the component is its own chunk.
import { deviceOf } from "@/modules/setting-readers";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { DENSE, defineWidget } from "../define";
import { colorSetting, colorsOf, deviceSetting, enumSetting, oneOf, type ColorEntry } from "../shared/settings-kit";
import type { GpuRingsProps } from "./GpuRings";
import { meta } from "./meta";

const OUTER = ["vram", "load", "power"] as const;
const INNER = ["load", "vram", "fan"] as const;

const RING_COLORS: ColorEntry[] = [
  { entry: "outer", key: "outerColor", label: "Outer ring" },
  { entry: "inner", key: "innerColor", label: "Inner ring" },
];
/** The rings follow the theme's Series 1 and 2 ("" = the widget's own colours). */
const RING_ROLES = { outerColor: "s1", innerColor: "s2" } as const;

const settings: ModuleSetting[] = [
  enumSetting("outer", "Outer ring", "vram", [{ value: "vram", label: "VRAM" }, { value: "load", label: "Load" }, { value: "power", label: "Power" }], { group: "Rings" }),
  enumSetting("inner", "Inner ring", "load", [{ value: "load", label: "Load" }, { value: "vram", label: "VRAM" }, { value: "fan", label: "Fan" }], { group: "Rings" }),
  ...RING_COLORS.map((e) => colorSetting(e.key, e.label, { role: RING_ROLES[e.key as keyof typeof RING_ROLES], more: false })),
  deviceSetting("Graphics card", "gpu", { group: "Graphics card" }),
];

export default defineWidget({
  meta,
  // A dense view of its own, no summary card.
  inspector: { header: "yes", compact: DENSE },
  settings,
  render: {
    load: () => import("./GpuRings"),
    toProps: (s: ModuleSettings): Partial<GpuRingsProps> => ({
      gpu: deviceOf(s, "gpu"),
      outer: oneOf(s.outer, OUTER),
      inner: oneOf(s.inner, INNER),
      colors: colorsOf(s, RING_COLORS),
    }),
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has the v7 device key, the no-card set and the
  // v8 colour roles; the sample is src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
