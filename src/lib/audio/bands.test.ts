import { describe, expect, it } from "vitest";
import { bandsFromSpectrum, logBandEdges } from "./bands";

const SR = 48000;
const BINS = 1024; // fftSize 2048
const HZ = SR / 2 / BINS;

/** A spectrum at the floor with one tone's bin (and its nearest neighbour, as a window leaks) lit. */
function tone(hz: number): Float32Array {
  const s = new Float32Array(BINS).fill(-100);
  const bin = hz / HZ;
  s[Math.round(bin)] = -30;
  s[Math.round(bin) + (bin % 1 < 0.5 ? -1 : 1)] = -40;
  return s;
}

const peakBand = (bands: Float32Array) => bands.indexOf(Math.max(...bands));

describe("bandsFromSpectrum", () => {
  const edges = logBandEdges(32, 30, 16000);
  const out = () => new Float32Array(32);

  it("puts a tone in the same band as the AudioMeter plugin (its log edges, loudest bin)", () => {
    // the plugin's verified bands for these tones (self-test and live): 200 Hz → 9, 1 kHz → 17, 5 kHz → 26
    expect(peakBand(bandsFromSpectrum(tone(200), SR, edges, out()))).toBe(9);
    expect(peakBand(bandsFromSpectrum(tone(1000), SR, edges, out()))).toBe(17);
    expect(peakBand(bandsFromSpectrum(tone(5000), SR, edges, out()))).toBe(26);
  });

  it("counts every bin in exactly one band where bands are wider than a bin, so an edge bin never lights two", () => {
    // below ~200 Hz the log bands are narrower than a bin (23 Hz) and share their nearest bin, as in the plugin
    for (let bin = Math.ceil(200 / HZ); bin < BINS; bin++) {
      const s = new Float32Array(BINS).fill(-100);
      s[bin] = -30;
      const lit = [...bandsFromSpectrum(s, SR, edges, out())].filter((v) => v > 0).length;
      // bins above the top edge (16 kHz) belong to no band
      expect(lit, `bin ${bin}`).toBe(bin * HZ < 16000 ? 1 : 0);
    }
  });

  it("gives a band narrower than a bin its nearest bin, not nothing", () => {
    const b = bandsFromSpectrum(new Float32Array(BINS).fill(-65), SR, edges, out());
    for (const v of b) expect(v).toBeCloseTo(0.5, 5);
  });
});
