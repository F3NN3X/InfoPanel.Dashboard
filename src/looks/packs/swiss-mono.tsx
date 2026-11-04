// Swiss Mono (P11): charcoal, one hairline per card, numbered headers, light numerals and one orange circle. Paint and type only: no slot component.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./swiss-mono/look.json";
import icons from "./swiss-mono/icons.json";
import meta from "./swiss-mono/pack.json";
import css from "./swiss-mono/pack.css?raw";

const files = packFiles(import.meta.glob<string>("./swiss-mono/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: { icons } });
