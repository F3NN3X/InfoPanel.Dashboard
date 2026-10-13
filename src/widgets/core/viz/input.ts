// The visualiser's frame stepper: picks the live source, shapes its bands with the dynamics, eases
// them by time and keeps the level history. Pure (no DOM, no clock of its own), so it is testable;
// `use-viz-input` runs it on the shared frame loop.
import { createGainState, easeBands, shapeBands, type GainState } from "./dynamics";
import type { VizInput, VizLook } from "./types";

/** The plugin's band count; the level path and capture use the same. */
export const BAND_COUNT = 32;
const HISTORY_LENGTH = 160;
/** One history sample per this many ms. */
export const HISTORY_INTERVAL_MS = 50;

/** What the sources hold right now. */
export interface RawInput {
  /** A live capture (status ready, a frame in): FFT bands as 0..1 of -80..0 dBFS, and the waveform. */
  capture: { bands: Float32Array; wave: Float32Array | null } | null;
  /** The plugin's spectrum (0..1), or null before v1.3.0 / with the spectrum off. */
  spectrum: Float32Array | null;
  /** The plugin's level (0..1), or null when the device reports none. */
  level: number | null;
}

/** Capture beats the plugin's spectrum, which beats the plain level. */
export function pickSource(raw: RawInput): VizInput["source"] {
  if (raw.capture && raw.capture.bands.length > 0) return "capture";
  if (raw.spectrum && raw.spectrum.length > 0) return "plugin";
  if (raw.level !== null) return "level";
  return "none";
}

export type Dynamics = Pick<VizLook, "floorDb" | "ceilDb" | "tiltDb" | "autoGain" | "attackMs" | "releaseMs" | "gain">;

export interface InputState {
  input: VizInput;
  target: Float32Array;
  gain: GainState;
  lastSampleMs: number;
}

export function createInputState(n = BAND_COUNT): InputState {
  return {
    input: { bands: new Float32Array(n), wave: null, history: { buf: new Float32Array(HISTORY_LENGTH), start: 0, length: 0 }, level: 0, source: "none" },
    target: new Float32Array(n),
    gain: createGainState(),
    lastSampleMs: -Infinity,
  };
}

const LEVEL_SCRATCH = new Float32Array(BAND_COUNT);

/**
 * One frame: the live source's bands shaped into the target (the level path fills every band with
 * the level, untilted), the bands eased toward it (`reduced` = jump), the level = the loudest eased
 * band, and a history sample every 50 ms. Mutates and returns `st.input`.
 */
export function stepInput(st: InputState, raw: RawInput, dyn: Dynamics, dtMs: number, nowMs: number, reduced = false): VizInput {
  const source = pickSource(raw);
  const src = source === "capture" ? raw.capture!.bands : source === "plugin" ? raw.spectrum! : null;
  const n = src ? src.length : BAND_COUNT;
  if (st.target.length !== n) {
    st.target = new Float32Array(n);
    st.input.bands = new Float32Array(n);
  }
  const shape = { floorDb: dyn.floorDb, ceilDb: dyn.ceilDb, tiltDb: dyn.tiltDb, autoGain: dyn.autoGain, state: st.gain, dtMs, gain: dyn.gain };
  if (src) shapeBands(src, st.target, shape);
  else if (source === "level") shapeBands(LEVEL_SCRATCH.fill(raw.level!), st.target, { ...shape, tilt: false });
  else st.target.fill(0);

  const cur = st.input.bands;
  easeBands(cur, st.target, dtMs, reduced ? 0 : dyn.attackMs, reduced ? 0 : dyn.releaseMs);
  let level = 0;
  for (let i = 0; i < cur.length; i++) if (cur[i] > level) level = cur[i];

  const h = st.input.history;
  if (nowMs - st.lastSampleMs >= HISTORY_INTERVAL_MS) {
    st.lastSampleMs = nowMs - st.lastSampleMs > HISTORY_INTERVAL_MS * 4 ? nowMs : st.lastSampleMs + HISTORY_INTERVAL_MS;
    const size = h.buf.length;
    if (h.length < size) h.buf[(h.start + h.length++) % size] = level;
    else {
      h.buf[h.start] = level;
      h.start = (h.start + 1) % size;
    }
  }

  st.input.level = level;
  st.input.source = source;
  st.input.wave = source === "capture" ? raw.capture!.wave : null;
  return st.input;
}
