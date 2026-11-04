// Overdrive (P11): yellow chamfered cards (the cut is the card material's clip, 12 px, under the 20 px cap), an angled label bar, cyan numerals with the chromatic fringe and a red grid scene.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./overdrive/look.json";
import icons from "./overdrive/icons.json";
import meta from "./overdrive/pack.json";
import css from "./overdrive/pack.css?raw";

const files = packFiles(import.meta.glob<string>("./overdrive/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: { icons } });
