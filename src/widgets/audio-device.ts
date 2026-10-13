// Which AudioMeter plugin container an audio widget reads, and its real spectrum.
import { parseSpectrum, SPECTRUM_ENTRY } from "@/lib/audio/spectrum";
import { get, has, num } from "./core/data";
import type { Data } from "./core/types";

/** The AudioMeter plugin's namespace (`plugins.audio-level-meter.<device>.<entry>`). */
export const AUDIO = "plugins.audio-level-meter.";

/**
 * The audio-level-meter container to read: unset = `default-audio`; a pinned one while it reports a
 * level; else ("" or a device gone quiet) the loudest live one, so music routed to a virtual or
 * secondary device still drives the visualiser. A level is the `audio-level` entry, or one the
 * plugin names "Level" (`names`).
 */
export function levelDevice(d: Data, wanted: string | undefined, names?: Record<string, string>): string {
  if (wanted === undefined) return "default-audio";
  if (wanted && has(get(d, `${AUDIO}${wanted}.audio-level`))) return wanted;
  let best = wanted;
  let top = -Infinity;
  for (const key of Object.keys(d)) {
    if (!key.startsWith(AUDIO) || !(key.endsWith(".audio-level") || names?.[key] === "Level")) continue;
    const v = num(get(d, key));
    if (v > top) {
      top = v;
      best = key.slice(AUDIO.length).split(".")[0];
    }
  }
  return best;
}

/** The device's spectrum bands (0..1), or null before plugin v1.3.0 / with the spectrum off. */
export const spectrumOf = (d: Data, device: string): Float32Array | null => parseSpectrum(get(d, `${AUDIO}${device}.${SPECTRUM_ENTRY}`));
