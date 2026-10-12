/** Menu geometry (px), shared by the component and the clamping maths. */
export const MENU_WIDTH = 220;
export const MENU_ROW_H = 30;
export const MENU_SEPARATOR_H = 9;
export const MENU_PADDING = 4;
const EDGE = 8;

/** The menu's height for a number of rows and separators. */
export function menuHeight(rows: number, separators: number): number {
  return 2 * MENU_PADDING + rows * MENU_ROW_H + separators * MENU_SEPARATOR_H;
}

/**
 * Where to put a menu opened at (x, y) so it stays inside the viewport:
 * it shifts left / up when it would overflow the right / bottom edge.
 */
export function clampMenuPosition(
  x: number,
  y: number,
  menu: { width: number; height: number },
  viewport: { width: number; height: number }
): { left: number; top: number } {
  const left = Math.min(x, viewport.width - menu.width - EDGE);
  const top = Math.min(y, viewport.height - menu.height - EDGE);
  return { left: Math.max(EDGE, left), top: Math.max(EDGE, top) };
}
