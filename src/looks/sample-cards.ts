// The sample themes' cards by name. Empty until `registerSampleCards` (sample-materials.ts) runs: the cards are a chunk of
// their own, loaded when a config names one (`readConfig`) or the Theme view lists the sample themes, so the kiosk entry
// carries none of their paint.
import type { Material } from "./materials";

export const sampleCards: Record<string, Material> = {};

/** Whether a stored config picks a sample card anywhere (a widget, a screen's or page's theme values, a saved theme). */
export const usesSampleCards = (config: unknown): boolean => JSON.stringify(config).includes('"surface":"look-');
