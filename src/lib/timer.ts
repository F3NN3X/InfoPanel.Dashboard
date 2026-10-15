/**
 * The kiosk's timer: one countdown (or a pomodoro cycle) shared by every Timer widget on the page
 * and the island (`src/widgets/island/timer.ts`). Started from a Timer widget; it lives in this
 * page only and survives a reload through localStorage. `reduce` is pure; `timer` is the store.
 */

export type TimerPhase = "timer" | "focus" | "break";

export interface TimerState {
  /** A countdown is set (running or paused). */
  active: boolean;
  paused: boolean;
  phase: TimerPhase;
  label: string;
  durationMs: number;
  /** When it ends (running). */
  endsAt: number;
  /** What is left (paused). */
  leftMs: number;
  /** Pomodoro: the focus and break lengths and the focus rounds finished. */
  pomodoro: { focusMin: number; breakMin: number; round: number } | null;
  /** The last countdown that ran out; `seq` goes up with each one (the island's notice). */
  finished: { seq: number; phase: TimerPhase; label: string } | null;
  /** The time of the last tick, ms. */
  now: number;
}

export type TimerAction =
  | { type: "start"; minutes: number; label?: string }
  | { type: "pomodoro"; focusMin: number; breakMin: number }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "tick" };

export const IDLE_TIMER: TimerState = { active: false, paused: false, phase: "timer", label: "", durationMs: 0, endsAt: 0, leftMs: 0, pomodoro: null, finished: null, now: 0 };

const MIN = 60_000;
/** Longest countdown, minutes. */
export const TIMER_MAX_MIN = 24 * 60;

const run = (s: TimerState, phase: TimerPhase, minutes: number, label: string, now: number): TimerState => {
  const durationMs = Math.round(Math.max(1 / 60, Math.min(TIMER_MAX_MIN, minutes)) * MIN);
  return { ...s, active: true, paused: false, phase, label, durationMs, endsAt: now + durationMs, leftMs: durationMs, now };
};

/** The time left, ms (0 when idle). */
export const leftOf = (s: TimerState, now = s.now): number => (!s.active ? 0 : s.paused ? s.leftMs : Math.max(0, s.endsAt - now));

export function reduce(s: TimerState, a: TimerAction, now: number): TimerState {
  switch (a.type) {
    case "start":
      return run({ ...s, pomodoro: null }, "timer", a.minutes, a.label ?? "", now);
    case "pomodoro":
      return run({ ...s, pomodoro: { focusMin: a.focusMin, breakMin: a.breakMin, round: 0 } }, "focus", a.focusMin, "Focus", now);
    case "pause":
      return s.active && !s.paused ? { ...s, paused: true, leftMs: leftOf(s, now), now } : s;
    case "resume":
      return s.active && s.paused ? { ...s, paused: false, endsAt: now + s.leftMs, now } : s;
    case "stop":
      return { ...IDLE_TIMER, finished: s.finished, now };
    case "tick": {
      if (!s.active || s.paused || now < s.endsAt) return { ...s, now };
      const finished = { seq: (s.finished?.seq ?? 0) + 1, phase: s.phase, label: s.label };
      const p = s.pomodoro;
      if (!p) return { ...IDLE_TIMER, finished, now };
      // A pomodoro runs on: focus, break, focus, ... until stopped.
      return s.phase === "focus"
        ? run({ ...s, finished, pomodoro: { ...p, round: p.round + 1 } }, "break", p.breakMin, "Break", now)
        : run({ ...s, finished }, "focus", p.focusMin, "Focus", now);
    }
  }
}

/** "4:05", "1:02:03". */
export function clockOf(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

const STORAGE_KEY = "dashboard.timer";

function load(): TimerState {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<TimerState> | null;
    return raw && typeof raw === "object" ? { ...IDLE_TIMER, ...raw, finished: null } : IDLE_TIMER;
  } catch {
    return IDLE_TIMER;
  }
}

function persist(s: TimerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Private mode or blocked storage: the timer still runs, it just does not survive a reload.
  }
}

/** The store: `dispatch` changes it, a 1 s tick runs while a countdown is active. */
function createTimer() {
  let state = IDLE_TIMER;
  let loaded = false;
  let ticker: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<(s: TimerState) => void>();
  const ensure = () => {
    if (loaded) return;
    loaded = true;
    state = reduce(load(), { type: "tick" }, Date.now());
    sync();
  };
  const sync = () => {
    if (state.active && !state.paused && !ticker) ticker = setInterval(() => set(reduce(state, { type: "tick" }, Date.now())), 1000);
    if ((!state.active || state.paused) && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };
  const set = (next: TimerState) => {
    const changed = next.active !== state.active || next.paused !== state.paused || next.phase !== state.phase || next.endsAt !== state.endsAt || next.finished?.seq !== state.finished?.seq;
    state = next;
    if (changed) persist(state);
    sync();
    for (const l of listeners) l(state);
  };
  return {
    getState: (): TimerState => {
      ensure();
      return state;
    },
    subscribe(fn: (s: TimerState) => void): () => void {
      ensure();
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispatch(a: TimerAction): void {
      ensure();
      set(reduce(state, a, Date.now()));
    },
  };
}

export const timer = createTimer();
