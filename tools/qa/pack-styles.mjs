// The widget-style values a built-in pack's Look sets (its sample theme's `sampleStyle`, src/looks/sample-themes.ts) plus its
// `lookId`: what a config that picked the Look hands each widget. The Widget QA page has no config to read them from, so the
// overflow runner and the pack visibility spec pass them as `settings`. tests/tools/qa/pack-styles.test.ts keeps them equal to the source.
export const PACK_STYLES = {
  "field-kit": { lookId: "field-kit", surface: "look-field-kit", accent: "#8A5C00", textColor: "#1A1C21", mutedColor: "#5E5A52", ok: "#146C34", warn: "#8A5A00", crit: "#A8340F", font: "sans" },
  "tape-86": { lookId: "tape-86", surface: "look-tape-86", accent: "#B83A08", textColor: "#2A2523", mutedColor: "#5C5248", ok: "#146C34", warn: "#8A5A00", font: "sans" },
  term: { lookId: "term", surface: "look-term", accent: "#8BE37A", textColor: "#8BE37A", mutedColor: "#6FA463", font: "mono", numGlow: "soft" },
};
