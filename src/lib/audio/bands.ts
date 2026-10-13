import { clamp } from "@/lib/audio/decibels";

/** `AnalyserNode.minDecibels` default. */
export const SPECTRUM_MIN_DB = -100;
/** `AnalyserNode.maxDecibels` default. */
export const SPECTRUM_MAX_DB = -30;


/** `count + 1` band edges in Hz, spaced evenly on a log scale. */
export const logBandEdges = (
  count: number,
  minHz: number,
  maxHz: number
): Float32Array => {
  const edges = new Float32Array(count + 1);
  const ratio = maxHz / minHz;
  for (let index = 0; index <= count; index += 1) {
    edges[index] = minHz * ratio ** (index / count);
  }
  return edges;
};

export interface BandsFromSpectrumOptions {
  minDb?: number;
  maxDb?: number;
}

/**
 * Reduces analyser frequency data (dB per bin) to 0..1 bands between the given edges, the way the
 * AudioMeter plugin builds its `spectrum`, so capture and plugin agree on which band a tone lands in:
 * each bin belongs to the one band its centre frequency falls in, a band takes its loudest bin, and a
 * band narrower than a bin takes the bin nearest its centre. Writes into `out` and returns it.
 */
export const bandsFromSpectrum = (
  spectrumDb: Float32Array,
  sampleRate: number,
  edges: Float32Array,
  out: Float32Array,
  {
    minDb = SPECTRUM_MIN_DB,
    maxDb = SPECTRUM_MAX_DB,
  }: BandsFromSpectrumOptions = {}
): Float32Array => {
  const binCount = spectrumDb.length;
  const hzPerBin = sampleRate / 2 / binCount;
  const bandCount = Math.min(out.length, edges.length - 1);
  for (let band = 0; band < bandCount; band += 1) {
    const lowHz = edges[band] ?? 0;
    const highHz = edges[band + 1] ?? 0;
    // bins whose centre (bin * hzPerBin) lies in [lowHz, highHz)
    let first = Math.ceil(lowHz / hzPerBin);
    let last = Math.ceil(highHz / hzPerBin);
    if (last <= first) {
      first = Math.round(Math.sqrt(lowHz * highHz) / hzPerBin);
      last = first + 1;
    }
    first = clamp(first, 0, binCount - 1);
    last = clamp(last, first + 1, binCount);
    let loudest = -Infinity;
    for (let bin = first; bin < last; bin += 1) {
      loudest = Math.max(loudest, spectrumDb[bin] ?? minDb);
    }
    out[band] = clamp((loudest - minDb) / (maxDb - minDb), 0, 1);
  }
  return out;
};

/**
 * Fits `length` values from a ring buffer, starting at `start`, into
 * `out.length` values. Each output takes the loudest value in its span.
 */
export const resampleLevels = (
  source: ArrayLike<number>,
  start: number,
  length: number,
  out: Float32Array
): Float32Array => {
  const size = source.length;
  const count = out.length;

  if (size === 0 || length <= 0 || count === 0) {
    out.fill(0);
    return out;
  }

  for (let index = 0; index < count; index += 1) {
    const from = Math.floor((index * length) / count);
    const to = Math.max(from + 1, Math.floor(((index + 1) * length) / count));
    let loudest = 0;
    for (let offset = from; offset < to; offset += 1) {
      const value = source[(start + offset) % size] ?? 0;
      if (value > loudest) {
        loudest = value;
      }
    }
    out[index] = loudest;
  }
  return out;
};
