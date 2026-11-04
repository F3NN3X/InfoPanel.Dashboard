// The data-viz values widgets read at run time: colour ramps, rings, the glide time. The Classic Look's T3 table
// (src/looks/t3.ts) is built from these, so a widget and the contract cannot drift apart.

/** Where a ramp starts outside a widget card: the shell sets `--w-fill` from every card's material (looks/materials.ts). */
export const RAMP_START = "#18181c";
/** The coldest colour of a ramp: the material's fill (`--w-fill`), else `RAMP_START`. */
export const RAMP_BASE = `var(--w-fill, ${RAMP_START})`;

/** Colour ramps for heatmaps and visualisers: stop lists by name (`accent` is built from the accent and the material). */
export const RAMPS: Record<string, string[] | null> = {
  accent: null,
  thermal: ["#1e3a8a", "#0ea5e9", "#22c55e", "#facc15", "#f97316", "#ef4444"],
  viridis: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"],
  magma: ["#000004", "#3b0f70", "#8c2981", "#de4968", "#fe9f6d", "#fcfdbf"],
  ice: ["#0b1020", "#1e3a5f", "#2f7fb5", "#7dd3fc", "#f0f9ff"],
  synth: ["#12062a", "#6b1ea8", "#ff4fd8", "#ff9e5e", "#ffe66d"],
  mono: ["#18181b", "#52525b", "#a1a1aa", "#fafafa"],
};

/** How long a smooth bar or ring glides to a new reading: about one sample interval of the feed. */
export const GLIDE_MS = 1000;
/** The one ring spec, in % of the diameter (the svg is 100 wide): stroke 7.5, gap between stacked rings 2, an empty track that reads on every surface. */
export const RING_T = 7.5;
export const RING_GAP = 2;
export const RING_TRACK = "color-mix(in oklab, var(--w-fg) 12%, transparent)";
