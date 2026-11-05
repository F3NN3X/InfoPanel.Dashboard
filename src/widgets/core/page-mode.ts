import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Whether the page a card sits on is light (the nearest `data-mode` above it: the kiosk's root, the studio canvas's theme scope),
 * read only while `on`, so a card that does not ask costs nothing. The theme's card takes its status colours from this (L56).
 */
export function usePageLight(card: RefObject<HTMLElement | null>, on: boolean): boolean {
  const [light, setLight] = useState(false);
  useLayoutEffect(() => {
    if (!on) return setLight(false);
    // looked up again on every change anywhere: the mode may be set after this card mounts, or on an element nearer than the one first found
    const read = () => setLight(card.current?.parentElement?.closest("[data-mode]")?.getAttribute("data-mode") === "light");
    read();
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"], subtree: true });
    return () => watch.disconnect();
  }, [card, on]);
  return light;
}
