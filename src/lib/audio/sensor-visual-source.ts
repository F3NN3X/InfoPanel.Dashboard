import { gainToDb } from "@/lib/audio/decibels";
import { resampleLevels } from "@/lib/audio/bands";
import type { FrameSource, VisualFrame } from "@/lib/audio/types";

export interface SensorVisualSourceOptions {
  /** Frequency bands per frame. Default 96. */
  bandCount?: number;
  /** History ring length, in frames. Default 128. */
  historyLength?: number;
  /** Frame interval in ms (also the history sample interval). Default 50. */
  intervalMs?: number;
  /** Ballistics attack time constant, ms. Default 80. */
  attackMs?: number;
  /** Ballistics release time constant, ms. Default 400. */
  releaseMs?: number;
}

export interface SensorVisualSource {
  /** Push this to `LiveWaveform` / `BarVisualizer` as their `source`. */
  readonly source: FrameSource<VisualFrame>;
  /** Set the current broadband level, 0..1. */
  setLevel: (level: number) => void;
  /**
   * Set the decorative per-track band shape (0..1 per band, resampled to the
   * band count). `null` restores a gentle default arch.
   */
  setShape: (shape: ArrayLike<number> | null) => void;
  /** Stop the timer and drop all listeners. */
  dispose: () => void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const defaultShape = (bandCount: number): Float32Array => {
  // A gentle arch: 0.3 at the edges, 1.0 in the middle.
  const out = new Float32Array(bandCount);
  for (let i = 0; i < bandCount; i += 1) {
    out[i] = 0.3 + 0.7 * Math.sin((Math.PI * i) / (bandCount - 1));
  }
  return out;
};

/**
 * A `FrameSource<VisualFrame>` for the live audiocn visualizers, fed from a
 * polled level (the audio-level sensors push ~1 Hz, far too slow to
 * animate). A 20 fps timer smooths the level with VU-style ballistics (fast
 * attack, slow release) and pushes a frame per tick:
 *
 * - `bands` — a decorative per-track shape scaled by the smoothed level, so
 *   the static variant / bar visualizer read as a live spectrum of the track;
 * - `history` — a ring of the smoothed broadband level, so the scrolling
 *   variant scrolls smoothly (each entry is one 50 ms sample, with
 *   `historyIntervalMs` + `historyUpdatedAt` for the playback delay).
 *
 * While audio plays (a non-zero level) the timer runs continuously, pushing a
 * history sample every `intervalMs` so the scrolling variant animates at a
 * steady cadence even between the sensor's ~1 Hz pushes. Once the level
 * settles to silence and the ring is full the timer sleeps; a new `setLevel`
 * wakes it. A settled, silent level therefore costs no frames.
 */
export function createSensorVisualSource(
  options: SensorVisualSourceOptions = {}
): SensorVisualSource {
  const bandCount = Math.max(4, options.bandCount ?? 96);
  const historyLength = Math.max(8, options.historyLength ?? 128);
  const intervalMs = Math.max(16, options.intervalMs ?? 50);
  const attackMs = Math.max(8, options.attackMs ?? 80);
  const releaseMs = Math.max(40, options.releaseMs ?? 400);

  const listeners = new Set<(frame: VisualFrame) => void>();

  let shape = defaultShape(bandCount);
  const bands = new Float32Array(bandCount);
  const history = new Float32Array(historyLength);
  let historyStart = 0;
  let historyFilled = 0;
  let historyPrevious: number | undefined;

  let target = 0;
  let smooth = 0;
  let lastTickMs = 0;
  let lastEmit = -1;
  let dirty = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastFrame: VisualFrame | null = null;

  const scaleBands = () => {
    for (let i = 0; i < bandCount; i += 1) {
      bands[i] = (shape[i] ?? 0) * smooth;
    }
  };

  const emit = () => {
    scaleBands();
    lastFrame = {
      bands,
      history,
      historyStart,
      historyLength: historyFilled,
      historyUpdatedAt: lastTickMs,
      historyIntervalMs: intervalMs,
      historyPreviousLevel:
        historyFilled >= historyLength ? historyPrevious : undefined,
      peakDb: gainToDb(smooth),
    };
    for (const listener of listeners) {
      listener(lastFrame);
    }
  };

  const stopTimer = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const tick = () => {
    const now = performance.now();
    const dt = Math.max(0, now - lastTickMs);
    lastTickMs = now;

    // Ballistics: fast toward a rising target, slow toward a falling one.
    const tau = smooth < target ? attackMs : releaseMs;
    const alpha = 1 - Math.exp(-dt / tau);
    smooth += (target - smooth) * alpha;
    if (Math.abs(target - smooth) < 0.001) {
      smooth = target;
    }

    // Push one history sample per tick.
    historyPrevious =
      historyFilled >= historyLength ? history[historyStart] : undefined;
    history[historyStart] = smooth;
    historyStart = (historyStart + 1) % historyLength;
    if (historyFilled < historyLength) {
      historyFilled += 1;
    }

    // While there is audio (smooth > threshold) emit every tick so the history
    // ring advances at `intervalMs` and the scrolling waveform animates
    // smoothly, even when the level is steady. A steady level would otherwise
    // settle after one push and the ring would only advance at the sensor's
    // ~1 Hz rate, making the scroll look frozen.
    const playing = smooth > 0.001;
    const changed =
      Math.abs(smooth - lastEmit) > 0.0005 ||
      historyFilled < historyLength ||
      playing;
    if (changed || dirty) {
      lastEmit = smooth;
      dirty = false;
      emit();
      // Settled and silent and the ring is full: sleep until the next level
      // change. While audio plays the timer keeps running so the scroll stays
      // smooth.
      if (smooth === target && historyFilled >= historyLength && !playing) {
        stopTimer();
      }
    }
  };

  const setLevel = (level: number) => {
    target = clamp01(level);
    dirty = true;
    if (timer === null) {
      timer = setInterval(tick, intervalMs);
      tick();
    }
  };

  const setShape = (next: ArrayLike<number> | null) => {
    shape = next && next.length > 0
      ? resampleLevels(next, 0, next.length, new Float32Array(bandCount))
      : defaultShape(bandCount);
    if (listeners.size > 0) {
      dirty = true;
      if (timer === null && (smooth > 0 || lastFrame)) {
        timer = setInterval(tick, intervalMs);
      }
      tick();
    }
  };

  const source: FrameSource<VisualFrame> = {
    subscribe: (listener) => {
      listeners.add(listener);
      if (lastFrame) {
        listener(lastFrame);
      }
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return {
    source,
    setLevel,
    setShape,
    dispose: () => {
      stopTimer();
      listeners.clear();
    },
  };
}
