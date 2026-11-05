import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Whether the page a card sits on is light (the nearest `data-mode` above it: the kiosk's root, the studio canvas's theme scope),
 * read only while `on`, so a card that does not ask costs nothing. The theme's card takes its status colours from this (L56).
 */
export function usePageLight(card: RefObject<HTMLElement | null>, on: boolean): boolean {
  const [light, setLight] = useState(false);
  useLayoutEffect(() => {
    const el = on ? card.current?.parentElement?.closest("[data-mode]") : null;
    if (!el) return setLight(false);
    const read = () => setLight(el.getAttribute("data-mode") === "light");
    read();
    const watch = new MutationObserver(read);
    watch.observe(el, { attributes: true, attributeFilter: ["data-mode"] });
    return () => watch.disconnect();
  }, [card, on]);
  return light;
}
