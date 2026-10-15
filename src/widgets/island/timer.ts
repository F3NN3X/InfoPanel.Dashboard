// What the Timer widget sends to the Dynamic Island (`src/lib/island/sources.ts`): the countdown
// beside the time and a notice when it runs out (for a pomodoro, at each switch). `derive` is pure;
// `prev` null is the baseline and raises nothing.
import { storeSource, type SourceNotice } from "@/lib/island/sources";
import { clockOf, leftOf, timer, type TimerState } from "@/lib/timer";

const DONE: Record<TimerState["phase"], string> = { timer: "Timer done", focus: "Break time", break: "Back to focus" };

export const timerIsland = storeSource<TimerState>({
  store: timer,
  hint: "The countdown beside the time, and a notice when it runs out",
  defaultOn: false,
  group: "Timer",
  derive(prev, next) {
    const left = leftOf(next);
    const activity = next.active
      ? {
          id: "timer",
          title: clockOf(left),
          subtitle: next.paused ? "Paused" : next.label || "Timer",
          progress: next.durationMs > 0 ? Math.max(0, Math.min(1, 1 - left / next.durationMs)) : 0,
          color: next.phase === "break" ? "#22c55e" : "#f59e0b",
          priority: 1,
        }
      : null;
    const done = next.finished;
    const notices: SourceNotice[] =
      prev && done && done.seq !== prev.finished?.seq
        ? [{ id: "done", severity: "warning", title: DONE[done.phase], ...(done.phase === "timer" && done.label ? { body: done.label } : {}), ttl: 10_000 }]
        : [];
    return { notices, activity };
  },
});
