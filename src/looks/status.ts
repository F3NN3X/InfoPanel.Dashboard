// The status colours: one source for the widgets' STATE and TONES, their light and theme text variants, the gauge
// export, the audiocn fallbacks and the other places that paint a good, warning or critical reading.
export const STATUS = {
  ok: "#3CC97F",
  warn: "#EDB232",
  crit: "#F2665E",
  /** The track behind a status colour. */
  none: "rgba(255,255,255,0.07)",
} as const;

/** Warn and crit text on a light surface, darkened to keep contrast. */
export const STATUS_LIGHT = { warn: "#a15c07", crit: "#c4261d" } as const;
