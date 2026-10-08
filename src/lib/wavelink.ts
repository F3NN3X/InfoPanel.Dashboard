import { useSyncExternalStore, useMemo } from "react";

import { API_BASE } from "@/hooks/useSensors";
import { SILENCE_DB } from "@/lib/audio/decibels";
import { createFrameEmitter, type FrameEmitter } from "@/lib/audio/frame-source";
import type { MeterFrame } from "@/lib/audio/types";

/**
 * The bridge's Wave Link surface. Inventory (devices, channels, mixes)
 * arrives as a `state` SSE event on connect and on every change (1 s
 * poll); meters arrive as `meter` events at the app's own device pace —
 * the 1 Hz `/events` snapshot ceiling does not apply here.
 *
 * The client is a module-level singleton: every widget placement shares
 * one EventSource, and meter frames feed per-key FrameEmitters so the
 * AudioCN meters paint themselves without re-rendering React.
 */

/* ---------------- wire types (mirror the bridge's camelCase JSON) ---------------- */

export interface WlGain {
  value: number | null;
  min: number | null;
  max: number | null;
}

export interface WlInput {
  id: string;
  name: string;
  isMuted: boolean;
  gain: WlGain | null;
}

export interface WlDevice {
  id: string;
  name: string;
  deviceType: string;
  inputs: WlInput[];
}

export interface WlMixRoute {
  id: string;
  level: number | null;
  isMuted: boolean;
}

export interface WlApp {
  id: string;
  name: string;
}

export interface WlChannel {
  id: string;
  name: string;
  type: string;
  level: number | null;
  isMuted: boolean;
  mixes: WlMixRoute[];
  apps: WlApp[];
}

export interface WlMix {
  id: string;
  name: string;
  level: number | null;
  isMuted: boolean;
}

export interface WlState {
  status: "up" | "absent";
  appVersion: string;
  devices: WlDevice[];
  channels: WlChannel[];
  mixes: WlMix[];
}

/** One meter tick: the merged map, whole (keys are `meterKey.*`). */
export interface WlMeterFrame {
  at: number;
  meters: Record<string, { left: number; right: number }>;
}

/* ---------------- meter key namespacing (ported from the control room's catalog) ---------------- */

export const meterKey = {
  device: (id: string) => `device:${id}`,
  channel: (id: string) => `channel:${id}`,
};

/**
 * Wave Link percentages (0..100 of full scale) to dBFS, floored at −60 dB
 * (the control-room convention, matching the vendored meter defaults).
 */
export const pctToDb = (pct: number): number => {
  if (pct <= 0) return SILENCE_DB;
  return Math.max(-60, 20 * Math.log10(pct / 100));
};

const ABSENT: WlState = {
  status: "absent",
  appVersion: "",
  devices: [],
  channels: [],
  mixes: [],
};

/** A meter decayed to the floor — silence, not a held level. */
const SILENCE_FRAME: MeterFrame = {
  channels: [
    { peakDb: SILENCE_DB },
    { peakDb: SILENCE_DB },
  ],
};

const frameFor = (meter: { left: number; right: number }): MeterFrame => ({
  channels: [
    { peakDb: pctToDb(meter.left) },
    { peakDb: pctToDb(meter.right) },
  ],
});

/* ---------------- the shared client ---------------- */

type StateListener = (state: WlState) => void;

class WavelinkClient {
  /** Reference-swapped: readers always see a consistent snapshot. */
  private state: WlState = ABSENT;
  private lastFrame: WlMeterFrame | null = null;
  private readonly stateListeners = new Set<StateListener>();
  private readonly emitters = new Map<string, FrameEmitter<MeterFrame>>();
  private started = false;

  /** The current inventory snapshot (stable reference until it changes). */
  getState = (): WlState => this.state;

  subscribeState = (listener: StateListener): (() => void) => {
    this.ensure();
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  };

  /**
   * A stable per-meter-key frame emitter, fed by the live meter stream.
   * Meters subscribe to it directly (no React re-renders at device pace).
   */
  meterEmitter = (key: string): FrameEmitter<MeterFrame> => {
    this.ensure();
    let emitter = this.emitters.get(key);
    if (!emitter) {
      emitter = createFrameEmitter<MeterFrame>();
      this.emitters.set(key, emitter);
      // Seed a late subscriber with the last known levels so the meter
      // does not start from the floor.
      const meter = this.lastFrame?.meters[key];
      emitter.emit(meter ? frameFor(meter) : SILENCE_FRAME);
    }
    return emitter;
  };

  private ensure(): void {
    if (this.started) return;
    this.started = true;

    const es = new EventSource(`${API_BASE}/events/wavelink`);

    es.addEventListener("state", (event) => {
      const state = parseState(event);
      if (!state) return;
      this.state = state;
      for (const listener of this.stateListeners) listener(state);

      if (state.status === "absent") {
        // The honest absence state: meters decay to the floor instead of
        // holding the last level.
        this.silenceAll();
      }
    });

    es.addEventListener("meter", (event) => {
      const frame = parseMeterFrame(event);
      if (!frame) return;
      this.lastFrame = frame;
      this.feedMeters(frame);
    });

    // EventSource reconnects on its own; the server re-sends the current
    // state on every open, so a gap never leaves us on a stale inventory.
  }

  private feedMeters(frame: WlMeterFrame): void {
    for (const [key, emitter] of this.emitters) {
      const meter = frame.meters[key];
      // A key missing from the map (the app stopped metering it) decays to
      // silence — a meter that freezes on a stale level is a lying meter.
      emitter.emit(meter ? frameFor(meter) : SILENCE_FRAME);
    }
  }

  private silenceAll(): void {
    for (const emitter of this.emitters.values()) {
      emitter.emit(SILENCE_FRAME);
    }
  }
}

function parseState(event: MessageEvent<string>): WlState | null {
  try {
    const data = JSON.parse(event.data) as WlState;
    if (data.status !== "up" && data.status !== "absent") return null;
    return {
      status: data.status,
      appVersion: data.appVersion ?? "",
      devices: data.devices ?? [],
      channels: data.channels ?? [],
      mixes: data.mixes ?? [],
    };
  } catch {
    return null;
  }
}

function parseMeterFrame(event: MessageEvent<string>): WlMeterFrame | null {
  try {
    const data = JSON.parse(event.data) as WlMeterFrame;
    if (!data || typeof data.meters !== "object" || data.meters === null) return null;
    return data;
  } catch {
    return null;
  }
}

/** The one shared client for every Wave Link widget on the page. */
export const wavelink = new WavelinkClient();

/* ---------------- hooks ---------------- */

/**
 * The live inventory (status, devices, channels, mixes). Updates on every
 * state event — connect, absence, and 1 s-change-only inventory polls.
 */
export function useWavelinkState(): WlState {
  return useSyncExternalStore(wavelink.subscribeState, wavelink.getState);
}

/** A stable per-meter-key frame source for the AudioCN meters/readouts. */
export function useWavelinkMeter(key: string): FrameEmitter<MeterFrame> {
  return useMemo(() => wavelink.meterEmitter(key), [key]);
}
