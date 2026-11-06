import { isTauri } from "@/lib/desktop";
import { WindowControls } from "./window-controls";

/**
 * The desktop window's title bar on a workspace page (Q2): a 32 px frameless strip beside the sidebar, like the editor's top bar, with the drag region and the caption
 * buttons; the editor's top bar is its own. A browser has its own window frame, so nothing renders there.
 */
export function WindowStrip() {
  if (!isTauri()) return null;
  return (
    // data-tauri-drag-region only acts on the element itself: the empty space is this strip.
    <div data-tauri-drag-region className="flex h-8 shrink-0 items-stretch justify-end border-b border-ui-subtle bg-ui-chrome">
      <WindowControls />
    </div>
  );
}
