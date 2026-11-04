// Classy Black (P11b): pack.json, look.json and CSS for the type; no slot component.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./classy-black/look.json";
import meta from "./classy-black/pack.json";
import css from "./classy-black/pack.css?raw";

const files = packFiles(import.meta.glob<string>("./classy-black/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: {} });
