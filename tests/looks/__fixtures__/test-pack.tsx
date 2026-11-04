// A pack that exercises every slot P8 built, for tests only (never shipped): a gradient frame, an ornament, a tab band, an
// icon set, three stage layers and an overlay, and gradient numerals. `badPack` makes a copy with one thing wrong.
import classic from "@/looks/classic/look.json";
import type { Look } from "@/looks/look";
import type { Pack } from "@/looks/pack";

const CLASSIC = classic as unknown as Look;
export const FRAME_GRADIENT = "linear-gradient(90deg, #ff4fd8 0%, #4fd8ff 100%)";
export const NUMERAL_GRADIENT = "linear-gradient(90deg, #ffffff 0%, var(--w-accent) 100%)";

/** The ornament: a 10 px corner mark; the tab band: a 4 px strip along the top edge. Both sit inside the card's padding. */
export const Ornament = () => <i data-t="ornament" style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, background: "var(--w-accent)" }} />;
export const TabBand = () => <i data-t="tab-band" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "var(--w-accent)" }} />;
const Overlay = () => <i data-t="overlay" style={{ position: "absolute", inset: 0, background: "#00000008" }} />;

export const TEST_PACK: Pack = {
  id: "test-pack",
  look: { ...CLASSIC, id: "test-pack", name: "Test pack", modes: { supported: ["dark"] }, t3: { ...CLASSIC.t3, "border-fill": FRAME_GRADIENT, "num-fill": NUMERAL_GRADIENT, "ring-style": "arc270" } },
  base: "/packs/test-pack/",
  css: "[data-pack-layer] { opacity: 0.9; }",
  assets: ["bg.png", "fonts/body.woff2"],
  slots: { ornament: Ornament, tabBand: TabBand, icons: { memory: { viewBox: "0 0 24 24", d: "M2 2h20v20H2z" } } },
  stage: { layers: [{ fill: "linear-gradient(#101018, #181830)" }, { image: "bg.png", opacity: 0.5 }, { fill: "radial-gradient(#ffffff10, transparent)" }], overlay: Overlay },
};

/** The test pack with `patch` laid over it (a way to make it wrong). */
export const badPack = (patch: Partial<Pack>): Pack => ({ ...TEST_PACK, ...patch });
