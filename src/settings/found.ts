import { createContext, useContext, useEffect, useRef } from "react";

/** The row search jumped to; `n` counts repeat jumps to the same row. */
export interface Found {
  row: string;
  n: number;
}

/** What the store provides; a page drawn without a store (the browser's Settings) has none, and nothing is found. */
export const FoundContext = createContext<Found | null>(null);

/** For a row search can jump to: scrolls it into view and outlines it for 1.5 s when it is the target. */
export function useFound(id: string | undefined): { ref: (el: HTMLElement | null) => void; className: string } {
  const found = useContext(FoundContext);
  const el = useRef<HTMLElement | null>(null);
  const hit = id !== undefined && found?.row === id;
  useEffect(() => {
    if (hit) el.current?.scrollIntoView?.({ block: "center" });
  }, [hit, found?.n]);
  return { ref: (node) => void (el.current = node), className: hit ? "row-found" : "" };
}
