import { useCallback, useRef, useState, type SetStateAction } from "react";

/** A stored "1" / "0"; anything else (nothing stored, unknown) = the default. */
export function parseFlag(raw: string | null, fallback: boolean): boolean {
  return raw === "1" ? true : raw === "0" ? false : fallback;
}

/** A boolean studio preference remembered across reloads (localStorage `key`). */
export function useStoredFlag(key: string, fallback: boolean) {
  const [value, setValue] = useState(() => {
    try {
      return parseFlag(localStorage.getItem(key), fallback);
    } catch {
      return fallback;
    }
  });
  const current = useRef(value);
  const set = useCallback(
    (next: SetStateAction<boolean>) => {
      const resolved = typeof next === "function" ? next(current.current) : next;
      current.current = resolved;
      setValue(resolved);
      try {
        localStorage.setItem(key, resolved ? "1" : "0");
      } catch {
        // Storage unavailable (private mode, quota): keep the session state.
      }
    },
    [key]
  );
  return [value, set] as const;
}
