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
  /** How long the connection had been down when the link last changed (0 while it is up); `useDownMs` keeps it current. */
  downMs: number;
  /** When the current drop began (null while up): the card and popover count from it. */
  downSince: number | null;
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
 * `lib/data-api.ts` and `lib/sensor-store.ts` stay as they are. It renders its caller only when the link changes
 * (the blip and the grace elapse); the elapsed time for display is `useDownMs`, in the components that show it.
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
    const timers = [BLIP_MS, GRACE_MS].map((ms) => setTimeout(() => setNow(Math.max(clock(), at + ms)), ms)); // a timer can fire a hair early by this clock, and nothing else re-reads it
    return () => timers.forEach(clearTimeout);
  }, [up, clock]);
  const downMs = !up && drop.downSince !== null ? now - drop.downSince : 0;
  const open = drop.downSince !== null && downMs >= BLIP_MS ? { at: drop.downSince, backAfterMs: null } : null;
  return { link: linkOf(state, downMs), downMs, downSince: up ? null : drop.downSince, lastDrop: open ?? drop.lastDrop };
}

/** How often the elapsed time refreshes once the link is Offline (the card reads minutes). */
export const OFFLINE_TICK_MS = 30_000;

/**
 * How long the connection has been down, for display: ticks once a second in the grace and every 30 s once
 * Offline, and not while the page is hidden. Used by the card and the popover only, so a drop re-renders those two
 * and not the studio.
 */
export function useDownMs(health: ApiHealth, clock: () => number = Date.now): number {
  const { link, downMs, downSince } = health;
  const ticking = downSince !== null && (link === "reconnecting" || link === "offline");
  const [now, setNow] = useState(clock);
  useEffect(() => {
    if (!ticking) return;
    const refresh = () => {
      if (document.visibilityState === "visible") setNow(clock());
    };
    refresh();
    const timer = setInterval(refresh, link === "offline" ? OFFLINE_TICK_MS : 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [ticking, link, clock]);
  return ticking ? Math.max(downMs, now - downSince) : downMs;
}
