import { WIDGET_PRESETS } from "@/widgets/studio.generated";
import type { PresetMap } from "./widget-presets";

/** Every built-in preset list, loaded: the one lazy chunk the studio's Add panel and inspector read presets from. */
const all: Promise<PresetMap> = Promise.all(Object.entries(WIDGET_PRESETS).map(async ([id, load]) => [id, (await load()).default] as const)).then(Object.fromEntries);

export default all;
