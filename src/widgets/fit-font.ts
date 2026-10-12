// Font size (px) at which `chars` average-width glyphs fit `avail` px, clamped to [min, max].
export const fitFontPx = (avail: number, chars: number, min: number, max: number, glyphW = 0.62): number =>
  Math.round(Math.max(min, Math.min(max, avail / (Math.max(1, chars) * glyphW))));
