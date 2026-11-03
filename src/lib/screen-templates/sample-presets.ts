/**
 * The sample themes as built-in appearance presets, one group each, listed in the Theme view with the template looks
 * (`template-presets.ts`). Each is a Look of the registry (`src/looks/samples.ts`): applying one sets the level's
 * `lookId` and writes the Look's card (`look-<id>`) and colours as the level's values, so the kiosk reads saved values
 * and never loads a Look.
 */
import { registerSampleCards } from "@/looks/sample-materials";
import { SAMPLE_THEMES, type SampleTheme } from "@/looks/sample-themes";
import type { AppearancePreset } from "../appearance-presets";
import { theme } from "./designs/ports";
import type { TemplatePresetGroup } from "./template-presets";

// Listing the themes is what lets the Theme view draw their cards and apply them.
registerSampleCards();

export const samplePresetId = (t: Pick<SampleTheme, "id">): string => `builtin:look-${t.id}`;

/** The preset a sample theme is: its tokens and radius, and the widget style (its Look, card, accent, text, font) and page. */
export function samplePreset(t: SampleTheme): AppearancePreset {
  return {
    id: samplePresetId(t),
    name: t.name,
    description: t.blurb,
    theme: theme(t.colours),
    radius: t.radius,
    style: {
      lookId: t.id,
      surface: `look-${t.id}`,
      accent: t.accent,
      textColor: t.text ?? t.colours.fg,
      mutedColor: t.muted ?? t.colours.sub,
      font: t.font,
      ...t.extra,
    },
    background: { ...t.page },
  };
}

export const SAMPLE_PRESET_GROUPS: readonly TemplatePresetGroup[] = SAMPLE_THEMES.map((t) => ({ id: `look-${t.id}`, name: t.name, presets: [samplePreset(t)] }));
