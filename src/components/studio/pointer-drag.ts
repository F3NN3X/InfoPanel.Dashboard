/**
 * Follow a pointer drag from a press: `move` fires per pointer move, `end`
 * once when it is released (or the browser cancels it) with `cancelled`
 * false, or when Esc aborts it with `cancelled` true (Esc is swallowed so
 * it does not also clear the selection). A move with no button held counts
 * as the release (it was lost off-window), and losing window focus aborts.
 * Returns a stop function that aborts a drag still in flight (call it when
 * the owner unmounts); once the drag has ended it does nothing.
 */
export function trackPointer(
  move: (e: PointerEvent) => void,
  end: (cancelled: boolean) => void
): () => void {
  let done = false;
  const finish = (cancelled: boolean) => {
    if (done) return;
    done = true;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    window.removeEventListener("blur", lost);
    document.removeEventListener("keydown", key, true);
    end(cancelled);
  };
  const onMove = (e: PointerEvent) => (e.buttons === 0 ? finish(false) : move(e));
  const up = () => finish(false);
  const lost = () => finish(true);
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    finish(true);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  window.addEventListener("blur", lost);
  document.addEventListener("keydown", key, true);
  return lost;
}
