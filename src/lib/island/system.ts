import type { BusClock, IslandBus } from "./bus";

/** The bus source of the dashboard's own notices. */
export const SYSTEM_SOURCE = "system";
/** A drop shorter than this (a stream reconnecting) raises nothing. */
export const DISCONNECT_DEBOUNCE_MS = 5000;
const DOWN_ID = "data-api";
const BACK_ID = "data-api-back";

/**
 * Watches the Data API connection for the island: after `DISCONNECT_DEBOUNCE_MS` down it raises a
 * warning that stays (open until tapped or collapsed, then a badge); when the connection is back it
 * ends that warning and says so briefly. `update` takes every connection change.
 */
export function createConnectionWatch(bus: IslandBus, clock: BusClock) {
  let timer: unknown = null;
  let raised = false;
  const cancel = () => {
    if (timer !== null) clock.clearTimeout(timer);
    timer = null;
  };
  return {
    update(connected: boolean) {
      if (!connected) {
        if (timer !== null || raised) return;
        timer = clock.setTimeout(() => {
          timer = null;
          raised = true;
          bus.dismiss(SYSTEM_SOURCE, BACK_ID);
          bus.notify({
            source: SYSTEM_SOURCE,
            id: DOWN_ID,
            severity: "warning",
            title: "Data API disconnected",
            body: "Live values are paused",
            ttl: 0,
            badge: true,
          });
        }, DISCONNECT_DEBOUNCE_MS);
        return;
      }
      cancel();
      if (!raised) return;
      raised = false;
      bus.dismiss(SYSTEM_SOURCE, DOWN_ID);
      bus.notify({ source: SYSTEM_SOURCE, id: BACK_ID, severity: "info", title: "Data API reconnected", ttl: 3000 });
    },
    /** Stop watching: a pending timer is cancelled and a raised warning ends. */
    stop() {
      cancel();
      if (raised) bus.dismiss(SYSTEM_SOURCE, DOWN_ID);
      raised = false;
    },
  };
}
