import { INSPECTOR_SCROLL } from "./inspector-layout";

/**
 * The element that scrolls the inspector: the aside itself beside the canvas,
 * the body under the header in the dock.
 */
function scroller(aside: HTMLElement): HTMLElement {
  return aside.querySelector<HTMLElement>(`[${INSPECTOR_SCROLL}]`) ?? aside;
}

/** Scroll the inspector back to its top. */
export function scrollInspectorToTop(aside: HTMLElement | null) {
  if (aside) scroller(aside).scrollTo({ top: 0 });
}

/** Scroll the inspector so the widget editor shows (below a sticky header, if any). */
export function revealWidgetEditor(aside: HTMLElement | null) {
  const editor = aside?.querySelector<HTMLElement>("[data-widget-editor]");
  if (!aside || !editor) return;
  const box = scroller(aside);
  // Only the aside's own sticky header covers its content; the dock's does not.
  const header =
    box === aside ? (aside.querySelector<HTMLElement>("[data-inspector-header]")?.offsetHeight ?? 0) : 0;
  const top = editor.getBoundingClientRect().top - box.getBoundingClientRect().top;
  if (top >= header && top < box.clientHeight - 64) return; // already in view
  box.scrollTo({ top: box.scrollTop + top - header - 8, behavior: "smooth" });
}
