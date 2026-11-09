// A device option's Kind (Phase A, G16): "Let people pick the CPU" turned into "… the GPU" in one go, which is how the GPU card is
// made from the CPU card. Each key that names the option (`libre.{cpu}_cpu_total`) reads a role of its device (load, temperature,
// clock, power); the new kind's key for the same role takes its place, where that kind has the role and, when the readings name a
// device of that kind, where that device has the key. A key with no such counterpart stays as it was and is listed, so the person
// can rebind it. Pure.
import type { Data } from "@/widgets/core/types";
import type { Recipe, RecipeDeviceKind } from "@/widgets/recipe/types";
import { DEVICE_LABEL, devicesIn, mapKeys } from "./builder-model";

/** The key suffix of each role a kind's device has, as the Data API names them (`libre.<device id>_<suffix>`). */
export const ROLES: Readonly<Record<RecipeDeviceKind, Readonly<Record<string, string>>>> = {
  cpu: { load: "cpu_total", temp: "core__tctl_tdie", clock: "cores__average", power: "package" },
  gpu: { load: "gpu_core_load", temp: "gpu_core", clock: "gpu_core_clock", power: "gpu_package" },
  disk: { load: "total_activity", temp: "temperature" },
  adapter: { download: "download_speed", upload: "upload_speed" },
};

/**
 * The recipe with device option `key` of kind `kind`: its label follows the kind where it was the old kind's name, and each key
 * naming it reads the new kind's key for its role. `unmapped` lists the keys left as they were (with the option's name in braces).
 */
export function changeDeviceKind(recipe: Recipe, key: string, kind: RecipeDeviceKind, data: Data = {}): { recipe: Recipe; unmapped: string[] } {
  const o = recipe.options.find((x) => x.key === key && x.type === "device");
  if (!o?.kind || o.kind === kind) return { recipe, unmapped: [] };
  const from = ROLES[o.kind];
  const to = ROLES[kind];
  const device = devicesIn(data)[kind]?.[0];
  const slot = `libre.{${key}}_`;
  const unmapped = new Set<string>();
  const mapped = mapKeys(recipe, (k) => {
    if (!k.startsWith(slot)) return k;
    const role = Object.keys(from).find((r) => from[r] === k.slice(slot.length));
    const suffix = role && to[role];
    if (!suffix || (device && data[`libre.${device}_${suffix}`] === undefined)) {
      unmapped.add(k);
      return k;
    }
    return `${slot}${suffix}`;
  });
  const label = o.label === DEVICE_LABEL[o.kind] ? DEVICE_LABEL[kind] : o.label;
  // a device picked of the old kind is no device of the new one: the option and the presets go back to Auto
  const options = mapped.options.map((x) => (x.key === key ? { ...x, kind, label, default: "auto" } : x));
  const presets = mapped.presets.map((p) => (key in p.settings ? { ...p, settings: Object.fromEntries(Object.entries(p.settings).filter(([k]) => k !== key)) } : p));
  return { recipe: { ...mapped, options, presets }, unmapped: [...unmapped] };
}
