import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Plus } from "lucide-react";
import { BLANK_MODULE, type MonitorProfile, type Placement } from "@/lib/layout";
import { hexToHsl } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { ZoneRect } from "./zone-geometry";

/** Zone resize handles. */
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: { id: Handle; cursor: string; pos: string }[] = [
  { id: "nw", cursor: "nwse-resize", pos: "-left-1 -top-1 h-3 w-3" },
  { id: "n", cursor: "ns-resize", pos: "left-1/2 -top-1 h-3 w-4 -translate-x-1/2" },
  { id: "ne", cursor: "nwse-resize", pos: "-right-1 -top-1 h-3 w-3" },
  { id: "e", cursor: "ew-resize", pos: "-right-1 top-1/2 h-4 w-3 -translate-y-1/2" },
  { id: "se", cursor: "nwse-resize", pos: "-right-1 -bottom-1 h-3 w-3" },
  { id: "s", cursor: "ns-resize", pos: "left-1/2 -bottom-1 h-3 w-4 -translate-x-1/2" },
  { id: "sw", cursor: "nwse-resize", pos: "-left-1 -bottom-1 h-3 w-3" },
  { id: "w", cursor: "ew-resize", pos: "-left-1 top-1/2 h-4 w-3 -translate-y-1/2" },
];

interface PlacementFrameProps {
  placement: Placement;
  profile: MonitorProfile;
  studio: boolean;
  /** Whether the module currently has live data (kiosk hides empties). */
  hasData: boolean;
  /** Idle and set to hide: the studio badges it (the kiosk hides it). */
  idle?: boolean;
  title: string;
  /** Grid element width in display px (zoom applied) — cell pitch math. */
  gridWidth?: number;
  /** Canvas zoom (screen px per design px). */
  zoom?: number;
  /** CSS grid gap in design px. */
  gap?: number;
  /** Grid row height in design px (fill: 1fr over the height, scroll: fixed). */
  rowHeight?: number;
  /**
   * Live zone box while a move/resize is in flight — the studio clamps it
   * (bounds + no overlap) and applies it; release commits (null = plain click).
   */
  onZoneDrag?: (
    id: string,
    rect: ZoneRect,
    pointer: { x: number; y: number }
  ) => void;
  onZoneDragEnd?: (id: string, rect: ZoneRect | null) => void;
  /** Dimmed while a zone drag is in flight (the indicator shows the target). */
  ghost?: boolean;
  /** Open the widget picker (the blank zone's "Pick a widget"). */
  onPickWidget?: () => void;
  /** Highlight + select (studio view). */
  selected?: boolean;
  onSelect?: () => void;
  children: ReactNode;
}

const clampSpan = (span: number, cols: number) =>
  Math.max(1, Math.min(cols, span));

/**
 * The studio chrome around a zone: drag the body to move it, drag the
 * handles to resize it (the studio clamps to the grid + no overlap), and
 * a size chip on hover (the selected zone's actions live in its floating
 * toolbar). Renders plain content in kiosk mode.
 */
export function PlacementFrame({
  placement,
  profile,
  studio,
  hasData,
  idle,
  title,
  gridWidth = 0,
  zoom = 1,
  gap = 12,
  rowHeight,
  onZoneDrag,
  onZoneDragEnd,
  ghost,
  onPickWidget,
  selected,
  onSelect,
  children,
}: PlacementFrameProps) {
  const span = clampSpan(placement.colSpan, profile.cols);
  const rowSpan = Math.max(1, placement.rowSpan);
  const design = placement.design;
  const blank = placement.module === BLANK_MODULE;

  // Cell pitch in display px (the grid renders at profile size × zoom,
  // gaps included, so the track pitch is the full width divided over the
  // column/row count).
  const pitchX =
    gridWidth > 0 ? (gridWidth + gap * zoom) / profile.cols : 0;
  const pitchY = rowHeight !== undefined ? (rowHeight + gap) * zoom : 0;

  // Hide empty modules (and blank zones) in kiosk mode (they claim no space).
  if (!studio && (!hasData || blank)) return null;

  /**
   * Move: press anywhere on the frame (except controls/handles) and drag.
   * The top-left cell follows the pointer delta; the studio clamps.
   */
  function startMove(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, a, [data-no-drag]")) return;
    e.preventDefault();
    // preventDefault() suppresses the click event in Chromium, so the
    // frame's onClick={onSelect} never fires — select on the press itself.
    onSelect?.();
    const startX = e.clientX;
    const startY = e.clientY;
    const startCol = placement.colStart;
    const startRow = placement.rowStart;
    let active = false;
    let last: ZoneRect | null = null;

    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) {
        active = true;
      }
      if (!active || pitchX <= 0) return;
      const dc = Math.round((ev.clientX - startX) / pitchX);
      const dr = pitchY > 0 ? Math.round((ev.clientY - startY) / pitchY) : 0;
      last = { col: startCol + dc, row: startRow + dr, cols: span, rows: rowSpan };
      onZoneDrag?.(placement.id, last, { x: ev.clientX, y: ev.clientY });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onZoneDragEnd?.(placement.id, last);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /** Resize: drag a handle; the opposite edge stays put. */
  function startResize(e: ReactPointerEvent, h: Handle) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    let last: ZoneRect | null = null;

    const move = (ev: PointerEvent) => {
      const dc = pitchX > 0 ? Math.round((ev.clientX - startX) / pitchX) : 0;
      const dr = pitchY > 0 ? Math.round((ev.clientY - startY) / pitchY) : 0;
      let col = placement.colStart;
      let row = placement.rowStart;
      let cols = span;
      let rows = rowSpan;
      if (h === "w" || h === "nw" || h === "sw") {
        col = placement.colStart + dc;
        cols = span - dc;
      }
      if (h === "e" || h === "ne" || h === "se") cols = span + dc;
      if (h === "n" || h === "nw" || h === "ne") {
        row = placement.rowStart + dr;
        rows = rowSpan - dr;
      }
      if (h === "s" || h === "se" || h === "sw") rows = rowSpan + dr;
      // Keep the box at least one cell: shrink-past-zero pushes the start.
      if (cols < 1) {
        col += 1 - cols;
        cols = 1;
      }
      if (rows < 1) {
        row += 1 - rows;
        rows = 1;
      }
      last = { col, row, cols, rows };
      onZoneDrag?.(placement.id, last, { x: ev.clientX, y: ev.clientY });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onZoneDragEnd?.(placement.id, last);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      className={cn(
        "group relative min-w-0",
        studio &&
          (selected
            ? "ring-2 ring-ring"
            : "outline-dashed outline-1 outline-ring/40"),
        studio && ghost && "opacity-40"
      )}
      style={{
        gridColumn: `${placement.colStart} / span ${span}`,
        gridRow: `${placement.rowStart} / span ${rowSpan}`,
        // Per-placement accent override: scopes the theme's --accent token to
        // this frame's subtree (rings, gauges, highlights recolor with it).
        ...(design?.accent
          ? ({ "--accent": hexToHsl(design.accent) } as CSSProperties)
          : {}),
      }}
      data-zone-id={studio ? placement.id : undefined}
      onClick={onSelect}
      onPointerDown={studio ? startMove : undefined}
    >
      {studio && (
        <>
          {/* Size chip on hover (the selected zone shows its toolbar) */}
          {!selected && (
            <span className="pointer-events-none absolute right-1.5 top-1.5 z-20 rounded-md bg-popover/90 px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {span}×{rowSpan}
            </span>
          )}

          {/* Resize handles (the studio clamps to the grid + no overlap) */}
          {HANDLES.map((h) => (
            <div
              key={h.id}
              data-no-drag
              onPointerDown={(e) => startResize(e, h.id)}
              className={cn(
                "absolute z-10 rounded-sm bg-ring/0 transition-colors hover:bg-ring/60",
                h.pos
              )}
              style={{ cursor: h.cursor }}
              title="Drag to resize"
            />
          ))}
        </>
      )}

      {/* The zone box is the truth: the widget content fills it (fluid),
          never its natural size, so the widget area always matches the zone. */}
      <div className="h-full min-w-0 w-full overflow-hidden">
        {studio && idle && (
          <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-30 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-muted-foreground">
            idle · hidden in kiosk
          </div>
        )}
        <div className="flex h-full w-full flex-col">
          {studio && blank ? (
            <div className="flex h-full min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/70 bg-card/20 p-3">
              <div className="text-sm font-medium text-muted-foreground">
                Blank zone
              </div>
              {onPickWidget && (
                <button
                  type="button"
                  onClick={onPickWidget}
                  className="flex items-center gap-1 rounded-md border border-border bg-popover/90 px-2 py-1 text-xs text-foreground transition-colors hover:border-ring hover:bg-accent"
                >
                  <Plus className="h-3 w-3" /> Pick a widget
                </button>
              )}
            </div>
          ) : studio && !hasData ? (
            <div className="flex h-full min-h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-card/40 p-4">
              <div className="text-sm font-medium text-muted-foreground">
                {title}
              </div>
              <div className="text-xs text-muted-foreground/60">
                no live data yet — appears when the plugin sends data
              </div>
            </div>
          ) : (
            <>
              {design?.header && (
                <div className="mb-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {title}
                </div>
              )}
              {design?.background === "panel" ? (
                <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-card/50 p-2">
                  {children}
                </div>
              ) : design?.background === "bordered" ? (
                <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card/30 p-2">
                  {children}
                </div>
              ) : (
                <div className="min-h-0 flex-1">{children}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
