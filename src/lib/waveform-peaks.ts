const BAR_COUNT = 96;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** FNV-1a string hash → 32-bit seed. */
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small fast PRNG (mulberry32). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, number[]>();

/**
 * A deterministic pseudo-peak shape for one track, for the Waveform
 * visualizer. The sensor stream carries no clip peaks, so the bar heights
 * are a *decorative* shape — but a stable one: seeded from the track/artist
 * text, built from a slow "phrase" envelope plus a faster wobble, then
 * smoothed so neighbouring bars do not jump. The playhead over it is the
 * real data (track progress / elapsed time).
 */
export function trackPeaks(track?: string, artist?: string): number[] {
  const key = `${track ?? "—"} • ${artist ?? "—"}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rand = mulberry32(hashSeed(key));
  // A handful of slow "phrases" of varying energy.
  const phrases = 6;
  const env: number[] = [];
  for (let p = 0; p < phrases; p++) env.push(0.3 + rand() * 0.7);

  const raw: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const pos = i / (BAR_COUNT - 1);
    const f = pos * (phrases - 1);
    const p = Math.min(phrases - 1, Math.floor(f));
    const t = f - p;
    const envelope = env[p] + (env[p + 1] - env[p]) * t;
    const wobble = 0.55 + 0.45 * Math.abs(Math.sin(pos * Math.PI * 2 * 11 + rand() * 0.6));
    raw.push(clamp01(envelope * wobble * (0.75 + rand() * 0.25)));
  }

  // Two smoothing passes over a 5-tap window.
  let out = raw;
  for (let pass = 0; pass < 2; pass++) {
    out = out.map((_v, i) => {
      let sum = 0;
      let n = 0;
      for (let k = -2; k <= 2; k++) {
        const j = i + k;
        if (j >= 0 && j < out.length) {
          sum += out[j];
          n++;
        }
      }
      return sum / n;
    });
  }

  const peaks = out.map(clamp01);
  cache.set(key, peaks);
  return peaks;
}
