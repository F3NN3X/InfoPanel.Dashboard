import { useEffect, useMemo, useRef } from "react";
import { useSensors, useSensorsConnected } from "@/hooks/useSensors";
import { wavelink, type WlState } from "@/lib/wavelink";
import { toFlat } from "@/widgets/data-adapter";
import type { Data } from "@/widgets/core/types";
import type { BusClock, IslandBus } from "./bus";
import { applyUpdate, readsOf, runDataFeeds, type IslandFeed } from "./sources";
import { createConnectionWatch } from "./system";

const realClock: BusClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>),
};

const NO_PREFIXES: readonly string[] = [];

/**
 * Runs the widgets' island sources on the kiosk: one `useSensors` over the prefixes of every data
 * source (the shared streams; no stream per widget) and the shared Wave Link client for the Wave
 * Link source. `feeds` empty or `enabled` false runs nothing and opens nothing.
 */
export function useIslandSources(bus: IslandBus, feeds: readonly IslandFeed[], enabled: boolean): void {
  const data = enabled ? feeds.filter((f) => f.module.island.from === "data") : [];
  const prefixes = useMemo(
    () => [...new Set(data.flatMap((f) => readsOf(f.module)))].sort(),
    // Keyed by the widget ids: a new feeds array with the same widgets keeps the subscription.
    [data.map((f) => f.module.id).join()]
  );
  const sensors = useSensors(prefixes.length > 0 ? prefixes : NO_PREFIXES);
  const prev = useRef(new Map<string, Data>());

  // Every render with new data: derive is transition-based, so a pass over unchanged data raises nothing.
  useEffect(() => runDataFeeds(bus, data, toFlat(sensors), prev.current));

  const ids = data.map((f) => f.module.id).join();
  useEffect(() => {
    const seen = prev.current;
    return () => {
      for (const id of ids.split(",").filter(Boolean)) {
        bus.clearActivity(id);
        seen.delete(id);
      }
    };
  }, [bus, ids]);

  const wl = enabled ? feeds.find((f) => f.module.island.from === "wavelink") : undefined;
  const wlSettings = useRef(wl?.settings);
  wlSettings.current = wl?.settings;
  const wlId = wl?.module.id;
  const wlDerive = wl?.module.island.from === "wavelink" ? wl.module.island.derive : undefined;
  useEffect(() => {
    if (!wlId || !wlDerive) return;
    let before: WlState | null = null;
    const run = (state: WlState) => {
      applyUpdate(bus, wlId, wlDerive(before, state, wlSettings.current ?? {}));
      before = state;
    };
    const unsubscribe = wavelink.subscribeState(run);
    run(wavelink.getState());
    return () => {
      unsubscribe();
      bus.clearActivity(wlId);
    };
  }, [bus, wlId, wlDerive]);
}

/** The Data API disconnect warning on the island (`system.ts`), while `enabled`. */
export function useConnectionNotice(bus: IslandBus, enabled: boolean): void {
  const connected = useSensorsConnected();
  const watch = useRef<ReturnType<typeof createConnectionWatch> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const w = createConnectionWatch(bus, realClock);
    watch.current = w;
    return () => {
      w.stop();
      watch.current = null;
    };
  }, [bus, enabled]);
  useEffect(() => watch.current?.update(connected), [connected, enabled]);
}
