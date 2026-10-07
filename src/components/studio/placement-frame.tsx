import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  Eye,
  EyeOff,
  GripVertical,
  Minus,
  Plus,
  X,
} from "lucide-react";
import type { MonitorProfile, Placement } from "@/lib/layout";
import { hexToHsl } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface PlacementFrameProps {
  placement: Placement;
  profile: MonitorProfile;
  studio: boolean;
  /** Whether the module currently has live data (kiosk hides empties). */
  hasData: boolean;
  title: string;
  /** Grid element width in px — used to convert pointer deltas to columns. */
  gridWidth?: number;
  /** Canvas zoom (screen px per design px) — pointer deltas are divided by it. */
  zoom?: number;
  /** CSS grid gap in design px (free-drag drop-cell math). */
  gap?: number;
  /** Grid row height in design px (free-drag drop-cell math). */
  rowHeight?: number;
  /** The grid element's bounding rect in screen px (drop-cell math). */
  getGridRect?: () => DOMRect | null;
  /** Live free-drag target cell — the studio shows a drop indicator. */
  onFreeDrag?: (
    id: string,
    pos: { col: number; row: number },
    pointer: { x: number; y: number }
  ) => void;
  /** Free-drag released; commit the last cell (null = plain click). */
  onFreeDragEnd?: (id: string, pos: { col: number; row: number } | null) => void;
  /** Dimmed while a free-drag is in flight (the drop indicator shows the target). */
  ghost?: boolean;
  onSpan?: (id: string, span: number) => void;
  onToggle?: (id: string) => void;
  onRemove?: (id: string) => void;
  /** Highlight + select (studio view). */
  selected?: boolean;
  onSelect?: () => void;
  children: ReactNode;
}

const clampSpan = (span: number, cols: number) =>
  Math.max(1, Math.min(cols, span));

/**
 * The studio chrome around a placement: drag-to-reorder (grip),
 * edge-drag resize (col span), hide and remove controls.
 * Renders plain content in kiosk mode.
 */
export function PlacementFrame({
  placement,
  profile,
  studio,
  hasData,
  title,
  gridWidth = 0,
  zoom = 1,
  gap = 12,
  rowHeight,
  getGridRect,
  onFreeDrag,
  onFreeDragEnd,
  ghost,
  onSpan,
  onToggle,
  onRemove,
  selected,
  onSelect,
  children,
}: PlacementFrameProps) {
  const fill = profile.fit === "fill";
  const span = clampSpan(placement.colSpan, profile.cols);
  const colWidth = gridWidth > 0 ? gridWidth / profile.cols : 0;
  // Gap-aware track width — the grid's real column size, matching the
  // studio's indicator math (simple colWidth keeps the resize feel).
  const trackW =
    gridWidth > 0 ? (gridWidth - (profile.cols - 1) * gap) / profile.cols : 0;
  const design = placement.design;

  // Hide empty modules in kiosk mode (they claim no space).
  if (!studio && !hasData) return null;

  /**
   * Free placement: press anywhere on the frame (except controls) and drag to
   * a grid cell. Live target is reported via onFreeDrag; release commits.
   */
  function startFreeDrag(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, a, [data-no-drag]")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let active = false;
    let last: { col: number; row: number } | null = null;

    const compute = (x: number, y: number) => {
      const rect = getGridRect?.();
      if (!rect || trackW <= 0 || rowHeight === undefined) return null;
      const cellW = (trackW + gap) * zoom;
      const cellH = (rowHeight + gap) * zoom;
      const col = Math.max(
        1,
        Math.min(
          profile.cols - span + 1,
          Math.floor((x - rect.left) / cellW) + 1
        )
      );
      const row = Math.max(1, Math.min(24, Math.floor((y - rect.top) / cellH) + 1));
      return { col, row };
    };

    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) {
        active = true;
      }
      if (!active) return;
      const cell = compute(ev.clientX, ev.clientY);
      if (cell) {
        last = cell;
        onFreeDrag?.(placement.id, cell, { x: ev.clientX, y: ev.clientY });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onFreeDragEnd?.(placement.id, active ? last : null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startResize(
    e: ReactPointerEvent,
    side: "left" | "right"
  ) {
    e.preventDefault();
    const startX = e.clientX;
    const startSpan = clampSpan(placement.colSpan, profile.cols);
    if (colWidth <= 0) return;

    const move = (ev: PointerEvent) => {
      const deltaCols = Math.round((ev.clientX - startX) / (colWidth * zoom));
      const next =
        side === "right"
          ? clampSpan(startSpan + deltaCols, profile.cols)
          : clampSpan(startSpan - deltaCols, profile.cols);
      if (next !== placement.colSpan) onSpan?.(placement.id, next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
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
        gridColumn: placement.colStart
          ? `${placement.colStart} / span ${span}`
          : `span ${span}`,
        gridRow: placement.rowStart
          ? `${placement.rowStart} / span ${placement.rowSpan ?? 1}`
          : placement.rowSpan
            ? `span ${placement.rowSpan}`
            : undefined,
        // Per-placement accent override: scopes the theme's --accent token to
        // this frame's subtree (rings, gauges, highlights recolor with it).
        ...(design?.accent
          ? ({ "--accent": hexToHsl(design.accent) } as CSSProperties)
          : {}),
      }}
      onClick={onSelect}
      onPointerDown={studio ? startFreeDrag : undefined}
    >
      {studio && (
        <>
          {/* Controls */}
          <div className="absolute right-1.5 top-1.5 z-20 flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
            <span className="rounded-md bg-popover/90 px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
              {span}/{profile.cols}
              {placement.rowSpan ? ` ×${placement.rowSpan}` : ""}
            </span>
            <button
              className="rounded-md bg-popover/90 p-1 text-muted-foreground hover:text-foreground"
              onClick={() =>
                onSpan?.(
                  placement.id,
                  clampSpan(placement.colSpan - 1, profile.cols)
                )
              }
              title="Narrower"
            >
              <Minus className="h-3 w-3" />
            </button>
            <button
              className="rounded-md bg-popover/90 p-1 text-muted-foreground hover:text-foreground"
              onClick={() =>
                onSpan?.(
                  placement.id,
                  clampSpan(placement.colSpan + 1, profile.cols)
                )
              }
              title="Wider"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              className="rounded-md bg-popover/90 p-1 text-muted-foreground hover:text-foreground"
              onClick={() => onToggle?.(placement.id)}
              title={placement.visible ? "Hide" : "Show"}
            >
              {placement.visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </button>
            <button
              className="rounded-md bg-popover/90 p-1 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove?.(placement.id)}
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Grip — drag anywhere on the frame to place it in a cell */}
          <div
            className="absolute left-1.5 top-1.5 z-20 cursor-grab rounded-md bg-popover/90 p-1 text-muted-foreground active:cursor-grabbing"
            title="Drag to move"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          {/* Resize handles */}
          <div
            className="absolute -left-1 top-0 z-10 h-full w-2 cursor-col-resize"
            data-no-drag
            onPointerDown={(e) => startResize(e, "left")}
            title="Drag to resize"
          >
            <div className="mx-auto h-full w-0.5 bg-ring/0 transition-colors hover:bg-ring/60" />
          </div>
          <div
            className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize"
            data-no-drag
            onPointerDown={(e) => startResize(e, "right")}
            title="Drag to resize"
          >
            <div className="mx-auto h-full w-0.5 bg-ring/0 transition-colors hover:bg-ring/60" />
          </div>
        </>
      )}

      <div className={cn(fill && "h-full overflow-auto")}>
        {studio && !hasData ? (
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
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {title}
              </div>
            )}
            {design?.background === "panel" ? (
              <div className="rounded-lg bg-card/50 p-2">{children}</div>
            ) : design?.background === "bordered" ? (
              <div className="rounded-lg border border-border bg-card/30 p-2">
                {children}
              </div>
            ) : (
              children
            )}
          </>
        )}
      </div>
    </div>
  );
}
