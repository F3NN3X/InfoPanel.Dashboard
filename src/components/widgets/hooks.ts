import { useEffect, useRef, useState } from "react";

/** Re-render every `ms` (default 1s) — used by the clock widget. */
export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * Rolling history of a sensor's numeric value (last `size` samples),
 * appended whenever the value changes. Feeds the sparkline widget.
 */
export function useHistory(value: number | undefined, size = 40): number[] {
  const ref = useRef<number[]>([]);
  const last = useRef<number | undefined>(undefined);
  if (value !== undefined && value !== last.current) {
    last.current = value;
    ref.current = [...ref.current, value].slice(-size);
  }
  return ref.current;
}
