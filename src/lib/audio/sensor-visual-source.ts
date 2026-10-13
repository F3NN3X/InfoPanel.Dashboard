import { gainToDb } from "@/lib/audio/decibels";
import { resampleBands } from "@/lib/audio/spectrum";
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
   * Set the real spectrum (the AudioMeter plugin's bands, 0..1, resampled to
   * the band count). `null` (no spectrum) makes every band follow the level.
   */
  setSpectrum: (spectrum: ArrayLike<number> | null) => void;
  /** Stop the timer and drop all listeners. */
  dispose: () => void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * A `FrameSource<VisualFrame>` for the live audiocn visualizers, fed from the
 * AudioMeter plugin's sensors (10 Hz on the fast stream). A 20 fps timer
 * smooths them with VU-style ballistics (fast attack, slow release) and pushes
 * a frame per tick. Nothing is synthesised:
 *
 * - `bands` — the plugin's spectrum, each band eased on its own; without a
 *   spectrum (plugin before v1.3.0, spectrum off) every band is the level;
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

  let spectrum: Float32Array | null = null;
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

  const emit = () => {
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
    const ease = (from: number, to: number) => {
      const alpha = 1 - Math.exp(-dt / (from < to ? attackMs : releaseMs));
      const next = from + (to - from) * alpha;
      return Math.abs(to - next) < 0.001 ? to : next;
    };
    smooth = ease(smooth, target);
    let bandsMoving = false;
    for (let i = 0; i < bandCount; i += 1) {
      const next = ease(bands[i], spectrum ? spectrum[i] : smooth);
      if (next !== bands[i]) bandsMoving = true;
      bands[i] = next;
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
      playing ||
      bandsMoving;
    if (changed || dirty) {
      lastEmit = smooth;
      dirty = false;
      emit();
      // Settled and silent and the ring is full: sleep until the next level
      // change. While audio plays the timer keeps running so the scroll stays
      // smooth.
      if (smooth === target && !bandsMoving && historyFilled >= historyLength && !playing) {
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

  const setSpectrum = (next: ArrayLike<number> | null) => {
    spectrum = next && next.length > 0 ? resampleBands(next, bandCount, spectrum ?? new Float32Array(bandCount)) : null;
    dirty = true;
    if (timer === null) {
      timer = setInterval(tick, intervalMs);
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
    setSpectrum,
    dispose: () => {
      stopTimer();
      listeners.clear();
    },
  };
}
