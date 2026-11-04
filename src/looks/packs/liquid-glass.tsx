// Liquid Glass (P11b): pack.json, look.json and CSS for the type; no slot component.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./liquid-glass/look.json";
import meta from "./liquid-glass/pack.json";
import css from "./liquid-glass/pack.css?raw";

const files = packFiles(import.meta.glob<string>("./liquid-glass/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: {} });
