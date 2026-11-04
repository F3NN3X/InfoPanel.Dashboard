// The sample themes' cards by name, and the sample Looks' values. Empty until `registerSampleCards` (sample-materials.ts)
// runs: both are a chunk of their own, loaded when a config names a card or a sample Look (`readConfig`) or the Theme
// view lists them, so the kiosk entry carries none of their paint.
import type { ModuleSettings } from "@/modules/types";
import type { Material } from "./materials";
import { LOOK_IDS, SAMPLE_LOOK_IDS } from "./ids";

export const sampleCards: Record<string, Material> = {};

/** The widget-style values each loaded Look sets under its level's own values (the Look layer, L40); Classic and the skins set none. */
export const lookLayers: Record<string, ModuleSettings> = {};

const SAMPLE_LOOK = new RegExp(`"lookId":"(${SAMPLE_LOOK_IDS.join("|")})"`);

/** The Look ids a stored config names that this build does not have: the user packs it may wear (P12b), for `registerUserPacks` to look for. */
export const userLookIds = (config: unknown): string[] =>
  [...new Set([...JSON.stringify(config).matchAll(/"lookId":"([a-z0-9][a-z0-9-]{0,47})"/g)].map((m) => m[1]))].filter((id) => !LOOK_IDS.includes(id)).slice(0, 16);

/** Whether a stored config picks a sample card or a sample Look anywhere (a widget, a screen's or page's theme values, a saved theme). */
export const usesSampleCards = (config: unknown): boolean => {
  const text = JSON.stringify(config);
  return text.includes('"surface":"look-') || SAMPLE_LOOK.test(text);
};
