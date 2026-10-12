import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import { clampDock } from "./studio-layout";

/** A release this close to the automatic height snaps back to automatic. */
const SNAP = 12;

interface DockSplitterProps {
  /** The dock's current height. */
  dockHeight: number;
  /** The studio body's height (the dock's upper bound). */
  bodyHeight: number;
  /** The height without a user override. */
  autoHeight: number;
  /** Commit a dragged height (null = back to automatic). */
  onCommit: (height: number | null) => void;
}

/**
 * The horizontal splitter between the canvas and the bottom dock. A drag only
 * moves a guide line; the new height is committed on release (so the canvas
 * does not re-lay out on every pointer move). Double-click resets to auto.
 */
export function DockSplitter({ dockHeight, bodyHeight, autoHeight, onCommit }: DockSplitterProps) {
  /** The pointer's offset from where the drag started (px, up = positive). */
  const [drag, setDrag] = useState<number | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    /** The dock height the pointer is at, clamped. */
    const target = (y: number) => clampDock(dockHeight + startY - y, bodyHeight);
    const move = (ev: PointerEvent) => setDrag(target(ev.clientY) - dockHeight);
    const up = (ev: PointerEvent) => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      setDrag(null);
      if (ev.type === "pointercancel") return;
      const next = target(ev.clientY);
      if (next === dockHeight) return;
      onCommit(Math.abs(next - autoHeight) <= SNAP ? null : next);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      title="Drag to resize the panel (double-click for automatic)"
      onPointerDown={onPointerDown}
      onDoubleClick={() => onCommit(null)}
      className="group relative z-20 h-1 shrink-0 cursor-row-resize touch-none border-t border-ui-subtle bg-ui-panel"
    >
      {/* A wider hit area than the 4px line. */}
      <div className="absolute inset-x-0 -top-1.5 h-4" />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-0.5 -translate-y-1/2 bg-ui-accent/0 transition-colors group-hover:bg-ui-accent/60",
          drag !== null && "bg-ui-accent"
        )}
        style={drag !== null ? { transform: `translateY(${-drag}px)` } : undefined}
      />
    </div>
  );
}
