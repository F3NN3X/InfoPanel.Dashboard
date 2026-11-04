// Night Glow (P11b): pack.json, look.json and CSS for the type; no slot component.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./night-glow/look.json";
import meta from "./night-glow/pack.json";
import css from "./night-glow/pack.css?raw";

const files = packFiles(import.meta.glob<string>("./night-glow/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: {} });
