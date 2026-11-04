// Black and Gold (P11b): pack.json, look.json and CSS for the type; no slot component.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./black-and-gold/look.json";
import meta from "./black-and-gold/pack.json";
import css from "./black-and-gold/pack.css?raw";

const files = packFiles(import.meta.glob<string>("./black-and-gold/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: {} });
