// Field Kit (P10): cream paper cards under a dark ink tab, on a dark scene with contour lines and a hazard strip. The yellow is
// for chips and strips only (1.37:1 on the cream); text and numerals use the ink and the dark amber accent.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./field-kit/look.json";
import icons from "./field-kit/icons.json";
import meta from "./field-kit/pack.json";
import css from "./field-kit/pack.css?raw";

const files = packFiles(import.meta.glob<string>("./field-kit/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

/** The rarity corner: a 10 px yellow wedge at the bottom right, inside the card's padding. */
const Ornament = () => <i style={{ position: "absolute", right: 0, bottom: 0, width: 10, height: 10, background: "linear-gradient(135deg, transparent 50%, #F2C230 50%)" }} />;
/** The ink tab's edge: a 4 px dark strip along the top. */
const TabBand = () => <i style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "#1A1C21" }} />;

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: { ornament: Ornament, tabBand: TabBand, icons } });
