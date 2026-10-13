// The audio visualiser engine's contracts: the styles, the look (Follow / Custom colours, shape,
// motion, dynamics) and the per-frame input (docs/redesign/visualizer/PLAN.md §3.3–3.5).

/** What the engine draws. `scroll` is the level history, newest on the right. */
export type VizStyle = "bars" | "mirror" | "wave" | "line" | "dots" | "radial" | "blob" | "scroll";
export const VIZ_STYLES: readonly VizStyle[] = ["bars", "mirror", "wave", "line", "dots", "radial", "blob", "scroll"];

/** `follow` takes the accent and the skin; the others are Custom. */
export type VizColorMode = "follow" | "solid" | "gradient" | "ramp";
export type VizGradient = "vertical" | "horizontal" | "radial";
export type VizGlow = "auto" | "on" | "off";
/** `auto` = from the skin's `meter` token. */
export type VizShape = "auto" | "round" | "square" | "segments" | "pill";
export type BarShape = Exclude<VizShape, "auto">;

export interface VizLook {
  /** Bars (or dots, spokes); 0 = sized to the canvas. */
  count: number;
  colorMode: VizColorMode;
  gradient: VizGradient;
  /** Colour 1: a CSS colour or a ramp name (`RAMPS`); "" = the accent. */
  color1: string;
  color2: string;
  color3: string;
  /** Peak-cap colour; "" = the accent lifted toward the text colour. */
  peakColor: string;
  /** 0.1..1 */
  opacity: number;
  glow: VizGlow;
  shape: VizShape;
  /** Gap between bars, 0..0.8 of the bar slot. */
  gap: number;
  /** Bars laid out in a row (`horizontal`, growing up) or a column (`vertical`, growing right). */
  orientation: "horizontal" | "vertical";
  /** Where bars grow from: start (top / left), center or end (bottom / right). */
  align: "start" | "center" | "end";
  /** Resting bar size, 0..1 of the bar's length. */
  minLevel: number;
  /** Smallest drawn bar, px. */
  minPx: number;
  peaks: boolean;
  /** Visual gain on the shaped bands (1 = as shaped). */
  gain: number;
  /** Stroke width of wave / line / scroll traces, px. */
  lineWidth: number;
  /** Fade the left and right edges this many px (0 = off). */
  fade: number;
  /** `scroll` draws the history as bars or as a filled trace. */
  scrollAs: "bars" | "line";
  floorDb: number;
  ceilDb: number;
  /** dB per octave around 1 kHz, so treble reads as loud as bass. */
  tiltDb: number;
  autoGain: boolean;
  attackMs: number;
  releaseMs: number;
}

export const DEFAULT_LOOK: VizLook = {
  count: 0,
  colorMode: "follow",
  gradient: "vertical",
  color1: "",
  color2: "",
  color3: "",
  peakColor: "",
  opacity: 1,
  glow: "auto",
  shape: "auto",
  gap: 0.3,
  orientation: "horizontal",
  align: "end",
  minLevel: 0,
  minPx: 0,
  peaks: false,
  gain: 1,
  lineWidth: 1.8,
  fade: 0,
  scrollAs: "bars",
  floorDb: -60,
  ceilDb: -12,
  tiltDb: 3,
  autoGain: true,
  attackMs: 60,
  releaseMs: 300,
};

/** A ring of recent broadband levels, 0..1, oldest at `start`. */
export interface VizHistory {
  buf: Float32Array;
  start: number;
  length: number;
}

/** One frame for the engine: everything it draws derives from these (plus easing). */
export interface VizInput {
  /** Shaped and eased bands, 0..1, lowest first. */
  bands: Float32Array;
  /** Time-domain samples, -1..1 (capture only). */
  wave: Float32Array | null;
  /** The eased broadband level, one sample per 50 ms, for `scroll`. */
  history: VizHistory;
  /** Eased broadband level, 0..1. */
  level: number;
  source: "capture" | "plugin" | "level" | "none";
}

/** The skin tokens the Follow look reads. */
export interface VizSkin {
  meter?: string;
  glow?: boolean;
}

/** The look with every unset (or undefined) option at its default. */
export const resolveLook = (look?: Partial<VizLook>): VizLook => ({
  ...DEFAULT_LOOK,
  ...(look ? Object.fromEntries(Object.entries(look).filter(([, v]) => v !== undefined)) : null),
});
