import { describe, expect, it } from "vitest";
import { timerIsland } from "@/widgets/island/timer";
import { clockOf, IDLE_TIMER, leftOf, reduce, type TimerState } from "./timer";

const MIN = 60_000;

describe("the timer", () => {
  it("counts down, pauses and resumes with the time left kept", () => {
    let s = reduce(IDLE_TIMER, { type: "start", minutes: 5, label: "Tea" }, 0);
    expect(leftOf(s, 60_000)).toBe(4 * MIN);
    s = reduce(s, { type: "pause" }, 60_000);
    expect(leftOf(s, 999_999)).toBe(4 * MIN);
    s = reduce(s, { type: "resume" }, 100_000);
    expect(s.endsAt).toBe(100_000 + 4 * MIN);
  });

  it("finishes once, counting each finish", () => {
    const s = reduce(IDLE_TIMER, { type: "start", minutes: 1 }, 0);
    expect(reduce(s, { type: "tick" }, 59_000).active).toBe(true);
    const done = reduce(s, { type: "tick" }, 60_000);
    expect(done).toMatchObject({ active: false, finished: { seq: 1, phase: "timer" } });
    expect(reduce(done, { type: "tick" }, 70_000).finished?.seq).toBe(1);
  });

  it("runs a pomodoro on: focus, break, focus", () => {
    let s = reduce(IDLE_TIMER, { type: "pomodoro", focusMin: 25, breakMin: 5 }, 0);
    s = reduce(s, { type: "tick" }, 25 * MIN);
    expect(s).toMatchObject({ active: true, phase: "break", finished: { seq: 1, phase: "focus" }, pomodoro: { round: 1 } });
    s = reduce(s, { type: "tick" }, 30 * MIN);
    expect(s).toMatchObject({ phase: "focus", finished: { seq: 2, phase: "break" } });
    expect(reduce(s, { type: "stop" }, 31 * MIN)).toMatchObject({ active: false, pomodoro: null });
  });

  it("formats the time left", () => {
    expect(clockOf(245_000)).toBe("4:05");
    expect(clockOf(3_723_000)).toBe("1:02:03");
    expect(clockOf(400)).toBe("0:01");
  });
});

describe("the timer on the island", () => {
  const at = (s: TimerState, now: number): TimerState => ({ ...s, now });

  it("shows the countdown as the activity and raises nothing on the baseline", () => {
    const s = at(reduce(IDLE_TIMER, { type: "start", minutes: 10, label: "Tea" }, 0), 4 * MIN);
    const u = timerIsland.derive(null, s, {});
    expect(u.notices).toEqual([]);
    expect(u.activity).toMatchObject({ title: "6:00", subtitle: "Tea", progress: 0.4 });
    expect(timerIsland.derive(null, IDLE_TIMER, {}).activity).toBeNull();
  });

  it("raises a notice when a countdown runs out", () => {
    const running = reduce(IDLE_TIMER, { type: "start", minutes: 1, label: "Tea" }, 0);
    const done = reduce(running, { type: "tick" }, MIN);
    expect(timerIsland.derive(running, done, {}).notices).toEqual([{ id: "done", severity: "warning", title: "Timer done", body: "Tea", ttl: 10_000 }]);
    expect(timerIsland.derive(done, done, {}).notices).toEqual([]);
  });

  it("names the pomodoro's switch", () => {
    const focus = reduce(IDLE_TIMER, { type: "pomodoro", focusMin: 25, breakMin: 5 }, 0);
    const brk = reduce(focus, { type: "tick" }, 25 * MIN);
    expect(timerIsland.derive(focus, brk, {}).notices?.[0].title).toBe("Break time");
    expect(timerIsland.derive(focus, brk, {}).activity).toMatchObject({ subtitle: "Break", color: "#22c55e" });
  });
});
