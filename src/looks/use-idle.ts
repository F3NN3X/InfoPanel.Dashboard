// Idle by input only (ledger L9): `minutes` without a pointer, touch, key or wheel event. A display with no input device is
// therefore idle that long after it loads and stays so, which is what the setting is for (static art on an always-on panel).
import { useEffect, useState } from "react";

const EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

export function useIdle(minutes: number): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!(minutes > 0)) return setIdle(false);
    let timer: ReturnType<typeof setTimeout>;
    let last = 0;
    const arm = () => {
      const now = Date.now();
      if (now - last < 1000) return;
      last = now;
      clearTimeout(timer);
      setIdle(false);
      timer = setTimeout(() => setIdle(true), minutes * 60_000);
    };
    arm();
    for (const e of EVENTS) window.addEventListener(e, arm, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const e of EVENTS) window.removeEventListener(e, arm);
    };
  }, [minutes]);
  return idle;
}
