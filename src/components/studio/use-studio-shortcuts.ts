import { useEffect, useRef } from "react";

/** What a studio keyboard shortcut does. */
export type ShortcutAction =
  | { type: "remove" }
  | { type: "duplicate" }
  | { type: "toggle-visible" }
  | { type: "escape" }
  | { type: "nudge"; cols: number; rows: number }
  | { type: "resize"; cols: number; rows: number }
  | { type: "save" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "zoom-fit" }
  | { type: "zoom-in" }
  | { type: "zoom-out" }
  | { type: "palette" }
  | { type: "cheatsheet" };

/** The parts of a keydown event the mapping reads. */
export interface KeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface ShortcutContext {
  /** Focus is in a text field, select or contenteditable. */
  typing: boolean;
  /** A dialog or menu is open (it handles its own keys). */
  overlay: boolean;
}

const ARROWS: Record<string, { cols: number; rows: number }> = {
  ArrowLeft: { cols: -1, rows: 0 },
  ArrowRight: { cols: 1, rows: 0 },
  ArrowUp: { cols: 0, rows: -1 },
  ArrowDown: { cols: 0, rows: 1 },
};

/** Ctrl/cmd shortcuts (meta counts as ctrl). */
function commandAction(e: KeyInput): ShortcutAction | null {
  const key = e.key.toLowerCase();
  if (key === "s") return { type: "save" };
  if (key === "z") return e.shiftKey ? { type: "redo" } : { type: "undo" };
  if (key === "y") return { type: "redo" };
  if (key === "k") return { type: "palette" };
  if (key === "d") return { type: "duplicate" };
  if (key === "0") return { type: "zoom-fit" };
  if (key === "=" || key === "+") return { type: "zoom-in" };
  if (key === "-" || key === "_") return { type: "zoom-out" };
  return null;
}

/** Ctrl/cmd shortcuts that stay live in text fields and dialogs. */
const ALWAYS_LIVE = new Set<ShortcutAction["type"]>(["save", "undo", "redo"]);

/**
 * Map a key press to a studio action, or null to leave it alone. Plain
 * keys are ignored while typing or while a dialog/menu is open; Esc,
 * Ctrl+S, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y and Ctrl+K work while typing,
 * and Ctrl+S / undo / redo even with a dialog open (Esc is the dialog's).
 */
export function shortcutAction(e: KeyInput, ctx: ShortcutContext): ShortcutAction | null {
  if (e.altKey) return null;
  if (e.ctrlKey || e.metaKey) {
    const action = commandAction(e);
    if (!action) return null;
    if (ALWAYS_LIVE.has(action.type)) return action;
    if (action.type === "palette") return ctx.overlay ? null : action;
    return ctx.typing || ctx.overlay ? null : action;
  }
  if (e.key === "Escape") return ctx.overlay ? null : { type: "escape" };
  if (ctx.typing || ctx.overlay) return null;
  if (e.key === "Delete" || e.key === "Backspace") return { type: "remove" };
  if (e.key === "h" || e.key === "H") return e.shiftKey ? null : { type: "toggle-visible" };
  if (e.key === "?") return { type: "cheatsheet" };
  const arrow = ARROWS[e.key];
  if (arrow) return { type: e.shiftKey ? "resize" : "nudge", ...arrow };
  return null;
}

/** Shortcut hints for tooltips and the cheat sheet. */
export const KEYS = {
  undo: "Ctrl+Z",
  redo: "Ctrl+Shift+Z",
  save: "Ctrl+S",
  palette: "Ctrl+K",
  duplicate: "Ctrl+D",
  remove: "Del",
  hide: "H",
  deselect: "Esc",
  fit: "Ctrl+0",
  zoomIn: "Ctrl+=",
  zoomOut: "Ctrl+-",
  cheatsheet: "?",
} as const;

/** Every shortcut, grouped, for the cheat-sheet dialog. */
export const SHORTCUT_GROUPS: { title: string; items: { keys: string; label: string }[] }[] = [
  {
    title: "General",
    items: [
      { keys: KEYS.palette, label: "Command palette" },
      { keys: KEYS.save, label: "Save" },
      { keys: KEYS.undo, label: "Undo" },
      { keys: `${KEYS.redo} / Ctrl+Y`, label: "Redo" },
      { keys: KEYS.cheatsheet, label: "Keyboard shortcuts" },
      { keys: KEYS.deselect, label: "Clear search, deselect, or close the drawer" },
    ],
  },
  {
    title: "Selected zone",
    items: [
      { keys: "← ↑ → ↓", label: "Move one cell" },
      { keys: "Shift+← / →", label: "Narrower / wider" },
      { keys: "Shift+↑ / ↓", label: "Shorter / taller" },
      { keys: KEYS.duplicate, label: "Duplicate" },
      { keys: KEYS.hide, label: "Hide / show" },
      { keys: `${KEYS.remove} / Backspace`, label: "Remove" },
    ],
  },
  {
    title: "Canvas",
    items: [
      { keys: KEYS.fit, label: "Fit to width" },
      { keys: KEYS.zoomIn, label: "Zoom in" },
      { keys: KEYS.zoomOut, label: "Zoom out" },
      { keys: "Ctrl+wheel", label: "Zoom" },
    ],
  },
];

/** Whether keys typed now go to a form field. */
function isTyping(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
}

/** Whether a dialog or menu is open over the studio. */
function hasOverlay(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]') !== null;
}

/**
 * Studio keyboard shortcuts on the window (see `shortcutAction`). The
 * handler always sees the latest `onAction`.
 */
export function useStudioShortcuts(onAction: (action: ShortcutAction) => void) {
  const handler = useRef(onAction);
  handler.current = onAction;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const action = shortcutAction(e, {
        typing: isTyping(document.activeElement),
        overlay: hasOverlay(),
      });
      if (!action) return;
      e.preventDefault();
      handler.current(action);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
