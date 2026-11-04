// Holo (P11): corner brackets (the card material's), 270-degree rings, a glow on the range-ring layer and elbow connectors from the page's core zone to the others (the stage reads the zones: hubLinks). The cockpit template is the radial cluster the connectors suit.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./holo/look.json";
import icons from "./holo/icons.json";
import meta from "./holo/pack.json";
import css from "./holo/pack.css?raw";
import templates from "./holo/template";

const files = packFiles(import.meta.glob<string>("./holo/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: { icons }, templates });
