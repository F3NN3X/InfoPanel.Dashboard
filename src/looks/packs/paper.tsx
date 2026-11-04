// Paper (P11b): pack.json, look.json and CSS for the type; no slot component.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./paper/look.json";
import meta from "./paper/pack.json";
import css from "./paper/pack.css?raw";

const files = packFiles(import.meta.glob<string>("./paper/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: {} });
