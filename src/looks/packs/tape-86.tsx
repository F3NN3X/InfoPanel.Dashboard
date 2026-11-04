// Tape '86 (P10): warm paper cards with a hard ink edge and an offset shadow (the stamped frame, flat: no rotation), a stripe
// band along the top, chunky Archivo Black numerals, mono labels, and grain over the page.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./tape-86/look.json";
import icons from "./tape-86/icons.json";
import meta from "./tape-86/pack.json";
import css from "./tape-86/pack.css?raw";

const files = packFiles(import.meta.glob<string>("./tape-86/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

/** The five stripe colours of the tape label, a 5 px band along the top edge. */
const TabBand = () => (
  <i style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "linear-gradient(to bottom, #F4A21C 0 20%, #EE6A2A 20% 40%, #C8273A 40% 60%, #8E2A4C 60% 80%, #4E1F3B 80% 100%)" }} />
);

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: { tabBand: TabBand, icons } });
