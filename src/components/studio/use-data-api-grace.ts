import { useEffect, useState } from "react";
import type { DataApiState } from "@/lib/data-api";

/** How long a drop reads Reconnecting, the last values held, before it reads Offline. */
export const GRACE_MS = 10_000;
/** Shorter than this is no drop at all: the streams opening after a page load, or reconnecting for a new key. */
export const BLIP_MS = 1_000;

/** The Data API as the studio shows it: `slow` is a note on a working connection. */
export type ApiLink = "connected" | "slow" | "reconnecting" | "offline";

/** The last drop: when it started, and how long it lasted (null while it lasts). */
export interface ApiDrop {
  at: number;
  backAfterMs: number | null;
}

export interface DropState {
  downSince: number | null;
  lastDrop: ApiDrop | null;
}

export interface ApiHealth {
  link: ApiLink;
  /** How long the connection has been down (0 while it is up). */
  downMs: number;
  lastDrop: ApiDrop | null;
}

/** The record after the connection reads `up` at `now`. */
export function stepDrop(state: DropState, up: boolean, now: number): DropState {
  if (!up) return state.downSince === null ? { ...state, downSince: now } : state;
  if (state.downSince === null) return state;
  const backAfterMs = now - state.downSince;
  return { downSince: null, lastDrop: backAfterMs < BLIP_MS ? state.lastDrop : { at: state.downSince, backAfterMs } };
}

/** The word for a raw state that has been down for `downMs`. A short blip never shows, and only the end of the grace is red. */
export function linkOf(state: DataApiState, downMs: number): ApiLink {
  if (state !== "unreachable") return state;
  if (downMs < BLIP_MS) return "connected";
  return downMs < GRACE_MS ? "reconnecting" : "offline";
}

/**
 * The grace on the Data API's raw state (B4): studio only, so the kiosk entry and the shared
 * `lib/data-api.ts` and `lib/sensor-store.ts` stay as they are. Ticks once a second while the connection is down.
 */
export function useDataApiGrace(state: DataApiState, clock: () => number = Date.now): ApiHealth {
  const up = state !== "unreachable";
  const [drop, setDrop] = useState<DropState>({ downSince: null, lastDrop: null });
  const [now, setNow] = useState(clock);
  useEffect(() => {
    const at = clock();
    setNow(at);
    setDrop((s) => stepDrop(s, up, at));
    if (up) return;
    const timer = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(timer);
  }, [up, clock]);
  const downMs = !up && drop.downSince !== null ? now - drop.downSince : 0;
  const open = drop.downSince !== null && downMs >= BLIP_MS ? { at: drop.downSince, backAfterMs: null } : null;
  return { link: linkOf(state, downMs), downMs, lastDrop: open ?? drop.lastDrop };
}
