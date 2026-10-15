import type { BusClock } from "./bus";

/** A clock the test moves by hand; timers fire in `advance`. */
export function fakeClock() {
  let now = 0;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let next = 1;
  const clock: BusClock = {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = next++;
      timers.push({ at: now + ms, fn, id });
      return id;
    },
    clearTimeout: (id) => {
      timers = timers.filter((t) => t.id !== id);
    },
  };
  const advance = (ms: number) => {
    now += ms;
    for (const t of timers.filter((t) => t.at <= now)) {
      timers = timers.filter((x) => x !== t);
      t.fn();
    }
  };
  return { clock, advance, pendingTimers: () => timers.length };
}
