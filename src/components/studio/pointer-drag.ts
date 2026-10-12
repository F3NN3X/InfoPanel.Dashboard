/**
 * Follow a pointer drag from a press: `move` fires per pointer move, `end`
 * once when it is released (or the browser cancels it) with `cancelled`
 * false, or when Esc aborts it with `cancelled` true (Esc is swallowed so
 * it does not also clear the selection).
 */
export function trackPointer(move: (e: PointerEvent) => void, end: (cancelled: boolean) => void): void {
  const finish = (cancelled: boolean) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    document.removeEventListener("keydown", key, true);
    end(cancelled);
  };
  const up = () => finish(false);
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    finish(true);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  document.addEventListener("keydown", key, true);
}
