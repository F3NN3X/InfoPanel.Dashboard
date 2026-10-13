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

/** The tip lines on the card; `?` marks where the shortcuts keycap goes. */
export const TIPS: string[] = [
  "Drag to move · corner to resize",
  "Shift-click to multi-select",
  "Right-click for more · ? for shortcuts",
];
