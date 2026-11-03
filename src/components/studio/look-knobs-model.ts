import { SURFACE_OPTIONS } from "@/modules/standard-settings";
import type { ModuleSettings, ModuleSettingValue } from "@/modules/types";
import type { LookValues } from "./inspector-model";

/**
 * The Look knobs (D15, investigation 7 F5): the few values a user changes on top of a Look, in the Theme view and the
 * widget inspector. Each knob writes cascade keys at the level (or widget) it edits and shows "Custom" while that holds
 * a value of its own that differs from the Look's; Reset clears the keys, so the Look's value shows again. Align and
 * Size are layout, not knobs. Mode waits for a Look with two modes (P6) and Variant for theme packs (P9). Pure.
 */

export type KnobId = "accent" | "surface" | "corners" | "density";

/** The keys each knob moves (Surface moves the card with its opacity and blur, D15). */
export const KNOB_KEYS: Readonly<Record<KnobId, readonly string[]>> = {
  accent: ["accent"],
  surface: ["surface", "surfaceOpacity", "blur"],
  corners: ["radius"],
  density: ["padding", "gap"],
};

/** The order and names the knob row shows. */
export const KNOBS: readonly { id: KnobId; label: string }[] = [
  { id: "accent", label: "Accent" },
  { id: "surface", label: "Surface" },
  { id: "corners", label: "Corners" },
  { id: "density", label: "Density" },
];

/** A value stored where the knob edits, if it applies there (a widget's own value of a following section does not). */
const ownValue = (values: LookValues, key: string): ModuleSettingValue | undefined =>
  values.applies && !values.applies(key) ? undefined : values.own?.[key];

/** The value a key shows: the own one where it applies, else what the level inherits (the Look's included). */
export const knobValue = (values: LookValues, key: string): ModuleSettingValue | undefined => ownValue(values, key) ?? values.inherited?.[key];

/**
 * Whether a knob is Custom: a key it moves holds an own value that is not the Look's (`look`: the Look's values; a
 * level that applied a theme before the Look layer stores them all, and those are not custom).
 */
export function knobCustom(values: LookValues, id: KnobId, look: ModuleSettings | undefined): boolean {
  return KNOB_KEYS[id].some((key) => {
    const own = ownValue(values, key);
    return own !== undefined && own !== look?.[key];
  });
}

/** The accent swatches: the six studio hues (the colour fields' own set); any other colour is the custom picker's. */
export const ACCENTS: readonly { value: string; name: string }[] = [
  { value: "#5fa7ff", name: "Blue" },
  { value: "#ac8ff8", name: "Violet" },
  { value: "#00c1b9", name: "Teal" },
  { value: "#53be70", name: "Green" },
  { value: "#da950b", name: "Amber" },
  { value: "#f37986", name: "Rose" },
];

/** The app materials' names in a chip (the Surface row's are longer). */
const SHORT: Readonly<Record<string, string>> = { "matte-light": "Light", "matte-dark": "Dark", theme: "Theme" };

/** The Surface chips: the Look's own card (no value stored) and the app's four materials; the rest stay in Advanced. */
export const SURFACES: readonly { value: string; label: string; name: string }[] = [
  { value: "", label: "Look", name: "The Look's own" },
  ...SURFACE_OPTIONS.slice(0, 4).map((o) => ({ value: o.value, label: SHORT[o.value] ?? o.label, name: o.label })),
];

/** The corner steps of the slider (px; "auto" is the Look's). */
export const CORNER_STEPS: readonly number[] = [0, 4, 8, 12, 16, 20, 28];

/** The nearest corner step to a stored radius ("auto" and unknown values: none). */
export function cornerStep(value: ModuleSettingValue | undefined): number | undefined {
  const px = Number(value);
  if (value === undefined || value === "auto" || value === "" || !Number.isFinite(px)) return undefined;
  return CORNER_STEPS.reduce((best, step, i) => (Math.abs(step - px) < Math.abs(CORNER_STEPS[best] - px) ? i : best), 0);
}

export type Density = "compact" | "normal" | "roomy";

/** Density sets the inner padding and the gap between items together; Normal is the Look's (no value stored). */
export const DENSITIES: readonly { id: Density; label: string; values: ModuleSettings }[] = [
  { id: "compact", label: "Compact", values: { padding: "4", gap: "4" } },
  { id: "normal", label: "Normal", values: {} },
  { id: "roomy", label: "Roomy", values: { padding: "16", gap: "16" } },
];

/** The density the values show; "custom" when padding and gap match none of the three. */
export function densityOf(values: LookValues): Density | "custom" {
  const pad = knobValue(values, "padding");
  const gap = knobValue(values, "gap");
  const at = (v: ModuleSettingValue | undefined) => (v === undefined || v === "auto" ? undefined : String(v));
  const hit = DENSITIES.find((d) => at(pad) === (d.values.padding as string | undefined) && at(gap) === (d.values.gap as string | undefined));
  return hit?.id ?? "custom";
}
