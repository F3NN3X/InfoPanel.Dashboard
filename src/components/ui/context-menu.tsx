import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import { clampMenuPosition, menuHeight, MENU_WIDTH } from "./context-menu-position";

export type ContextMenuEntry =
  | {
      id: string;
      label: string;
      icon?: ReactNode;
      /** Shortcut hint, shown in mono on the right. */
      hint?: string;
      /** Red row (delete). */
      danger?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    }
  | "separator";

interface ContextMenuProps {
  /** Viewport position of the pointer that opened the menu. */
  x: number;
  y: number;
  entries: ContextMenuEntry[];
  onClose: () => void;
}

/**
 * A 220 px right-click menu, clamped to the viewport; closes on pick, Esc or
 * outside click. Keyboard: focus lands on the first enabled item, arrows /
 * Home / End move between items, Enter / Space pick, and focus returns to
 * where it was when the menu closes.
 */
export function ContextMenu({ x, y, entries, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Focus in on open, back out on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
    return () => {
      // Only when focus is still nowhere (a pick may have opened a dialog that took it).
      if (opener?.isConnected && (!document.activeElement || document.activeElement === document.body)) opener.focus();
    };
  }, []);

  /** Arrow / Home / End between the enabled items (wrapping); Tab leaves the menu. */
  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Tab") return onClose();
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')];
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowDown" ? (at + 1) % items.length
      : e.key === "ArrowUp" ? (at <= 0 ? items.length - 1 : at - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? items.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    items[next].focus();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  const separators = entries.filter((e) => e === "separator").length;
  const { left, top } = clampMenuPosition(
    x,
    y,
    { width: MENU_WIDTH, height: menuHeight(entries.length - separators, separators) },
    { width: window.innerWidth, height: window.innerHeight }
  );

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ left, top, width: MENU_WIDTH }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onMenuKey}
      className="fixed z-[90] rounded-[9px] border border-ui-menu bg-ui-raised p-1 font-ui shadow-ui-menu"
    >
      {entries.map((e, i) =>
        e === "separator" ? (
          <div key={i} role="separator" className="mx-1 my-1 h-px bg-ui-subtle" />
        ) : (
          <button
            key={e.id}
            type="button"
            role="menuitem"
            disabled={e.disabled}
            onClick={() => {
              onClose();
              e.onSelect();
            }}
            className={cn(
              "flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] outline-none focus-visible:bg-ui-hover focus-visible:text-ui-1 disabled:opacity-40",
              e.danger ? "text-ui-danger hover:bg-ui-danger/15" : "text-ui-2 hover:bg-ui-hover hover:text-ui-1"
            )}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5">
              {e.icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{e.label}</span>
            {e.hint && <Kbd className="border-transparent bg-transparent">{e.hint}</Kbd>}
          </button>
        )
      )}
    </div>,
    document.body
  );
}
