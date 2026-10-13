// The AudioMeter plugin's `spectrum` entry (v1.3.0+): log-spaced bands, lowest first, as
// comma-separated integers 0..100; all zeros when silent, "" when disabled or the device failed.

/** The entry id under each `plugins.audio-level-meter.<device>.` container. */
export const SPECTRUM_ENTRY = "spectrum";

/** The bands as 0..1, or null when the entry is missing, empty or malformed. */
export function parseSpectrum(raw: unknown): Float32Array | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const parts = raw.split(",");
  const out = new Float32Array(parts.length);
  for (let i = 0; i < parts.length; i++) {
    const v = Number(parts[i]);
    if (!Number.isFinite(v)) return null;
    out[i] = Math.min(1, Math.max(0, v / 100));
  }
  return out;
}

/**
 * `src` resampled to `n` bands into `out`: the loudest source band of each group when shrinking (so
 * a peak never disappears), linear interpolation when stretching.
 */
export function resampleBands(src: ArrayLike<number>, n: number, out: Float32Array = new Float32Array(n)): Float32Array {
  const m = src.length;
  if (m === 0) return out.fill(0);
  if (m >= n) {
    for (let i = 0; i < n; i++) {
      const a = Math.floor((i * m) / n);
      const b = Math.max(a + 1, Math.floor(((i + 1) * m) / n));
      let peak = 0;
      for (let j = a; j < b; j++) peak = Math.max(peak, src[j]);
      out[i] = peak;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : (i * (m - 1)) / (n - 1);
      const j = Math.floor(x);
      const f = x - j;
      out[i] = j + 1 < m ? src[j] * (1 - f) + src[j + 1] * f : src[m - 1];
    }
  }
  return out;
}
