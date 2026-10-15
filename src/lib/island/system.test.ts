import { describe, expect, it } from "vitest";
import { createIslandBus } from "./bus";
import { fakeClock } from "./test-clock";
import { createConnectionWatch, DISCONNECT_DEBOUNCE_MS } from "./system";

const setup = () => {
  const { clock, advance, pendingTimers } = fakeClock();
  const bus = createIslandBus(clock);
  return { bus, advance, pendingTimers, watch: createConnectionWatch(bus, clock) };
};
const ids = (bus: ReturnType<typeof createIslandBus>) => {
  const s = bus.getSnapshot();
  return [s.expanded, ...s.pending].filter(Boolean).map((i) => i!.id);
};

describe("connection watch", () => {
  it("ignores a drop shorter than the debounce", () => {
    const { bus, advance, watch, pendingTimers } = setup();
    watch.update(false);
    advance(DISCONNECT_DEBOUNCE_MS - 1);
    watch.update(true);
    advance(DISCONNECT_DEBOUNCE_MS);
    expect(ids(bus)).toEqual([]);
    expect(pendingTimers()).toBe(0);
  });

  it("raises a staying warning after the debounce, and a short notice when the API is back", () => {
    const { bus, advance, watch } = setup();
    watch.update(false);
    watch.update(false);
    advance(DISCONNECT_DEBOUNCE_MS);
    expect(bus.getSnapshot().expanded).toMatchObject({ id: "data-api", severity: "warning", badge: true });
    watch.update(true);
    expect(ids(bus)).toEqual(["data-api-back"]);
    advance(3000);
    expect(ids(bus)).toEqual([]);
  });

  it("ends a raised warning when it stops", () => {
    const { bus, advance, watch } = setup();
    watch.update(false);
    advance(DISCONNECT_DEBOUNCE_MS);
    watch.stop();
    expect(ids(bus)).toEqual([]);
  });
});
