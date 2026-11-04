// Neon Stripe (P11): four glowing stripes behind translucent near-black cards, bracket-line headers in red, mono type and yellow numerals. The glow is the app's capped glow effect on the stripe layer, not pack CSS.
import type { Look } from "../look";
import { builtPack, packFiles, type PackMeta } from "../pack-assets";
import look from "./neon-stripe/look.json";
import icons from "./neon-stripe/icons.json";
import meta from "./neon-stripe/pack.json";
import css from "./neon-stripe/pack.css?raw";

const files = packFiles(import.meta.glob<string>("./neon-stripe/assets/*", { query: "?url&no-inline", import: "default", eager: true }));

export default builtPack(meta as PackMeta, look as unknown as Look, files, { css, slots: { icons } });
