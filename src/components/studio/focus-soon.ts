/** Focus what takes the place of a control that just unmounted (a panel swapped for its strip, a closed rename), once it has rendered. */
export function focusSoon(selector: string): void {
  requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());
}

/** The left panel's tab that is selected, and the strip's toggle: where focus goes as the panel opens and closes. */
export const LEFT_TAB = '[role="tablist"][aria-label="Left panel"] [role="tab"][aria-selected="true"]';
export const LEFT_STRIP_TOGGLE = 'button[aria-label="Show the left panel"]';
