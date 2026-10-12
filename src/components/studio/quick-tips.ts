/** Browser preference: the first-run tips card was dismissed. */
export const TIPS_KEY = "studio.tipDismissed";

type TipStorage = Pick<Storage, "getItem" | "setItem">;

/** Whether the tips card was dismissed (storage that throws counts as not dismissed). */
export function tipsDismissed(storage?: TipStorage): boolean {
  try {
    return (storage ?? localStorage).getItem(TIPS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Remember the dismissal (best effort). */
export function dismissTips(storage?: TipStorage): void {
  try {
    (storage ?? localStorage).setItem(TIPS_KEY, "1");
  } catch {
    // Private mode / blocked storage: the card just comes back next time.
  }
}

/** The tips on the card. */
export const TIPS: { title: string; body: string }[] = [
  { title: "Add a widget", body: "Drag one from Add onto the canvas, or click it to place it." },
  { title: "Move and resize", body: "Drag a tile, or its corner handle. Arrow keys nudge, Shift+arrows resize." },
  { title: "Select several", body: "Shift- or Ctrl-click to select more, then move or style them together." },
  { title: "Right-click", body: "Tiles and the canvas have menus. Press ? for every shortcut." },
];
