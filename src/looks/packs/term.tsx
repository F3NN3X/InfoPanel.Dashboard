// Term (P10): phosphor green on black. The frame is the card's own green hairline and the header keeps its normal height (the
// prompt kind is 4 px taller, which moves the body), so the card keeps its padding: the tui skin's boxed padding is not reused.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./term/look.json";
import icons from "./term/icons.json";
import meta from "./term/pack.json";
import css from "./term/pack.css?raw";

const files = packFiles(import.meta.glob<string>("./term/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: { icons } });
