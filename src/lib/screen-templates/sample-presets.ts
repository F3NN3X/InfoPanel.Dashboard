/**
 * The sample themes as built-in appearance presets, one group each, listed in the Theme view with the template looks
 * (`template-presets.ts`). A preset names its card by `look-<id>` and carries every colour itself, so the kiosk reads the
 * saved values; P5 turns them into Looks (docs/look-system/progress.md, ledger).
 */
import { registerSampleCards } from "@/looks/sample-materials";
import { SAMPLE_THEMES, type SampleTheme } from "@/looks/sample-themes";
import type { AppearancePreset } from "../appearance-presets";
import { theme } from "./designs/ports";
import type { TemplatePresetGroup } from "./template-presets";

// Listing the themes is what lets the Theme view draw their cards and apply them.
registerSampleCards();

export const samplePresetId = (t: Pick<SampleTheme, "id">): string => `builtin:look-${t.id}`;

/** The preset a sample theme is: its tokens and radius, and the widget style (card, accent, text, font) and page. */
export function samplePreset(t: SampleTheme): AppearancePreset {
  return {
    id: samplePresetId(t),
    name: t.name,
    description: t.blurb,
    theme: theme(t.colours),
    radius: t.radius,
    style: {
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
