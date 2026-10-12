import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefCallback,
  type RefObject,
} from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBackground } from "@/components/page-background";
import type { PageBackground as Background } from "@/lib/appearance";
import type { Appearance } from "@/lib/style-resolve";
import { SCROLL_ROW_H, type MonitorProfile, type Placement } from "@/lib/layout";
import { fontStack } from "@/lib/general";
import {
  cellAt as gridCellAt,
  columnGuides,
  profileGap,
  profilePadding,
  trackSize,
  zoneBox,
} from "@/lib/profile-grid";
import { useGeneral } from "@/hooks/use-general";
import { cn } from "@/lib/utils";
import { PlacementFrame } from "./placement-frame";
import { LivePlacement } from "./placement-content";
import { RulerH, RulerV } from "./rulers";
import {
  ALL_MODULES,
  DND_MIME,
  DND_MIME_PANEL,
  placementTitle,
} from "./studio-modules";
import type { SelectMode } from "./selection";
import { zoneMinSize } from "./studio-actions";
import { enforceMinSize, fitZoneRect, moveZoneSet, type ZoneRect } from "./zone-geometry";
import { ZoneToolbarLayer } from "./zone-toolbar";

/** The canvas' dotted grid (also drawn over a page background). */
const DOTS = "radial-gradient(circle, hsl(var(--ring) / 0.22) 1px, transparent 1.25px)";
const DOT_PITCH = "24px 24px";

interface StudioCanvasProps {
  profile: MonitorProfile;
  /** The profile's resolved page background, drawn behind its grid. */
  background?: Background;
  /** The global style the zones render under (see `resolveStyle`). */
  appearance?: Appearance;
  /**
   * The profile's own theme as CSS variables (`themeVars`), scoped to the
   * canvas; unset = the dashboard theme the studio chrome uses.
   */
  themeScope?: CSSProperties;
  zoom: number;
  showGrid: boolean;
  /** Draw the rulers (default on). */
  showRulers?: boolean;
  /** The scroll container (shared with the zoom hook for wheel + fit). */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Callback ref that attaches the scroll container to the zoom hook. */
  attachScroll: RefCallback<HTMLDivElement>;
  /** The selected zones, the primary last. */
  selectedIds: string[];
  /** Select a zone (see `SelectMode`); null clears the selection. */
  onSelect: (id: string | null, mode?: SelectMode) => void;
  /** The primary panel zone's selected widget (outlined on the canvas). */
  selectedWidgetId: string | null;
  /** Select a panel zone's widget (null = the panel itself). */
  onSelectWidget: (zoneId: string, widgetId: string | null) => void;
  /** A zone was drawn on empty grid space (box already clamped). */
  onDrawZone: (rect: ZoneRect) => void;
  /** A zone is being moved/resized (box already clamped, fires per cell). */
  onZoneRect: (id: string, rect: ZoneRect) => void;
  /**
   * The selection is being moved by dragging its zone `id` (boxes already
   * checked: all in the grid, no overlap; fires per cell).
   */
  onZoneRects: (id: string, rects: Record<string, ZoneRect>) => void;
  /** Open the widget picker for a (blank) zone. */
  onPickWidget: (id: string) => void;
  /** A palette widget / panel was dropped on the canvas. */
  onAddModule: (module: string) => void;
  /** Add a panel preset (built in, starter or saved) by id. */
  onAddPreset: (presetId: string) => void;
  /** Open the Add drawer (the empty canvas card). */
  onOpenAdd: () => void;
  /** The selected zone's toolbar, kept next to its frame. */
  zoneToolbar?: ReactNode;
}

/**
 * The design canvas: rulers, the zoomable grid where zones are drawn,
 * moved and resized (biome-style, no overlap), drop target for the
 * palettes, and the move/resize ghosts.
 */
export function StudioCanvas({
  profile,
  background,
  appearance,
  themeScope,
  zoom,
  showGrid,
  showRulers = true,
  scrollRef,
  attachScroll,
  selectedIds,
  onSelect,
  selectedWidgetId,
  onSelectWidget,
  onDrawZone,
  onZoneRect,
  onZoneRects,
  onPickWidget,
  onAddModule,
  onAddPreset,
  onOpenAdd,
  zoneToolbar,
}: StudioCanvasProps) {
  const [zoneDrag, setZoneDrag] = useState<{
    id: string;
    /** The zones moving with it (just `id` unless a selection moves). */
    ids: string[];
    rect: ZoneRect;
    x: number;
    y: number;
  } | null>(null);
  /** The zones' boxes when the drag in flight started. */
  const dragOrigin = useRef<Placement[] | null>(null);
  const [drawing, setDrawing] = useState<ZoneRect | null>(null);
  // A completed draw is followed by a click on the grid; it must not
  // deselect the zone just drawn (and selected).
  const drewRef = useRef(false);
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [scroll, setScroll] = useState({ left: 0, top: 0 });
  const [pageEl, setPageEl] = useState<HTMLDivElement | null>(null);
  // Page size (design px), viewport (screen px) and the page's origin in the
  // scrolled content (screen px; the page is centered when it is smaller).
  const [canvas, setCanvas] = useState({ w: 0, h: 0, viewW: 0, viewH: 0, ox: 0, oy: 0 });

  // Measure the grid for resize calculations and alignment guides, in
  // design px: the on-screen width over the zoom (clientWidth inside a CSS
  // zoom is reported in different units by different Chromium versions).
  useLayoutEffect(() => {
    if (gridEl && zoom > 0) setGridWidth(gridEl.getBoundingClientRect().width / zoom);
  }, [gridEl, zoom, profile.id, profile.cols, profile.width, profile.padding, profile.fit]);
  useEffect(() => {
    const onResize = () => {
      if (gridEl && zoom > 0) setGridWidth(gridEl.getBoundingClientRect().width / zoom);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [gridEl, zoom]);

  // Canvas measurements for the rulers: they start at the page's corner.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !pageEl) return;
    const measure = () => {
      const s = el.getBoundingClientRect();
      const p = pageEl.getBoundingClientRect();
      setCanvas({
        w: p.width / zoom,
        h: p.height / zoom,
        viewW: el.clientWidth,
        viewH: el.clientHeight,
        ox: p.left - s.left + el.scrollLeft,
        oy: p.top - s.top + el.scrollTop,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRef, pageEl, zoom, profile.id, profile.cols, profile.width, profile.height, profile.padding, scroll]);

  /**
   * Commit a zone move/resize: apply the clamped box (a resize keeps the
   * widget's minimum size). When it can't be placed without overlapping,
   * the zone keeps its current box. Dragging a zone of a multi-zone
   * selection moves them all from where they started, or (when any would
   * leave the grid or overlap another zone) leaves them where they are.
   */
  const onZoneDrag = (
    id: string,
    rect: ZoneRect,
    pointer: { x: number; y: number },
    kind: "move" | "resize"
  ) => {
    const origin = (dragOrigin.current ??= profile.placements);
    const zone = origin.find((p) => p.id === id);
    if (!zone) return;
    const current = { col: zone.colStart, row: zone.rowStart, cols: zone.colSpan, rows: zone.rowSpan };
    if (kind === "move" && selectedIds.length > 1 && selectedIds.includes(id)) {
      const delta = { cols: rect.col - zone.colStart, rows: rect.row - zone.rowStart };
      const rects = moveZoneSet(origin, selectedIds, delta, profile.cols, profile.rows);
      if (rects) onZoneRects(id, rects);
      setZoneDrag((d) => ({
        id,
        ids: selectedIds,
        rect: rects?.[id] ?? d?.rect ?? current,
        x: pointer.x,
        y: pointer.y,
      }));
      return;
    }
    const box = kind === "resize" ? enforceMinSize(rect, zone, zoneMinSize(zone)) : rect;
    const clamped = fitZoneRect(box, origin, profile.cols, profile.rows, id) ?? current;
    onZoneRect(id, clamped);
    setZoneDrag({ id, ids: [id], rect: clamped, x: pointer.x, y: pointer.y });
  };

  const onZoneDragEnd = () => {
    dragOrigin.current = null;
    setZoneDrag(null);
  };

  /**
   * Draw a new zone: press on an empty grid cell and drag out a box; on
   * release a blank zone is created (the user then assigns a widget).
   */
  const startDraw = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    if (e.target !== e.currentTarget) return; // only empty grid space starts a draw
    const start = cellAt(e.clientX, e.clientY);
    if (!start) return;
    e.preventDefault();
    let rect: ZoneRect = { col: start.col, row: start.row, cols: 1, rows: 1 };
    setDrawing(rect);
    const move = (ev: PointerEvent) => {
      const c = cellAt(ev.clientX, ev.clientY);
      if (!c) return;
      rect = {
        col: Math.min(start.col, c.col),
        row: Math.min(start.row, c.row),
        cols: Math.abs(c.col - start.col) + 1,
        rows: Math.abs(c.row - start.row) + 1,
      };
      setDrawing(rect);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrawing(null);
      drewRef.current = true;
      setTimeout(() => (drewRef.current = false), 0);
      // No room for the drawn box (the grid is full there): nothing is added.
      const fitted = fitZoneRect(rect, profile.placements, profile.cols, profile.rows);
      if (fitted) onDrawZone(fitted);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onCanvasDrop = (e: DragEvent) => {
    e.preventDefault();
    const module = e.dataTransfer.getData(DND_MIME);
    if (module && ALL_MODULES.some((m) => m.id === module)) {
      onAddModule(module);
      return;
    }
    const presetId = e.dataTransfer.getData(DND_MIME_PANEL);
    if (presetId) onAddPreset(presetId);
  };

  // The profile's spacing (as the kiosk page shows it): the gap between
  // zones and the padding around the grid, inside the profile's size.
  const gap = profileGap(profile);
  const padding = profilePadding(profile, true);
  const fill = profile.fit === "fill" && profile.height > 0;
  /** Gap in display px. */
  const g = gap * zoom;

  // Alignment guides: vertical lines at the column boundaries (gap-aware).
  // Design px: these sit inside the zoomed page (CSS zoom scales them).
  const colW = gridWidth > 0 ? trackSize(gridWidth, profile.cols, gap) : 0;
  const guides = colW > 0 ? columnGuides(gridWidth, profile.cols, gap) : [];

  // Row geometry: fill mode → uniform rows over the profile height;
  // scroll mode → fixed SCROLL_ROW_H rows (the canvas scrolls).
  const rowH = fill
    ? Math.max(24, trackSize(profile.height - 2 * padding, profile.rows, gap))
    : SCROLL_ROW_H;
  const getGridRect = () => gridEl?.getBoundingClientRect() ?? null;

  /** The 1-based grid cell under a screen point (null outside the grid). */
  const cellAt = (x: number, y: number): { col: number; row: number } | null => {
    const rect = getGridRect();
    if (!rect) return null;
    return gridCellAt(x - rect.left, y - rect.top, rect, profile.cols, profile.rows, g);
  };

  /** Grid-local display-px box for a ZoneRect (drawing / drag ghost). */
  const zoneBoxStyle = (r: ZoneRect) => {
    if (colW <= 0) return null;
    // The ghost sits inside the zoomed page, so its box is in design px
    // (CSS zoom scales it); display px here would apply the zoom twice.
    const rowHd = fill
      ? trackSize(profile.height - 2 * padding, profile.rows, gap)
      : SCROLL_ROW_H;
    return zoneBox(r, { width: colW, height: rowHd }, gap);
  };

  // The canvas paints the profile's page (its background, or its own
  // theme's page color) with the dots kept over it.
  const paintsPage = Boolean(background || themeScope);
  const font = fontStack(useGeneral().font);

  const dragged = zoneDrag
    ? profile.placements.find((x) => x.id === zoneDrag.id)
    : undefined;
  const primaryId = selectedIds.at(-1) ?? null;
  const selected = profile.placements.find((x) => x.id === primaryId);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Ruler row */}
      {showRulers && (
        <div className="flex shrink-0">
          <div className="h-6 w-7 shrink-0 border-b border-r border-ui-subtle bg-ui-chrome" />
          <div className="min-w-0 flex-1">
            <RulerH
              length={canvas.w}
              zoom={zoom}
              offset={scroll.left - canvas.ox}
              view={canvas.viewW}
            />
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {showRulers && (
          <RulerV
            length={canvas.h}
            zoom={zoom}
            offset={scroll.top - canvas.oy}
            view={canvas.viewH}
          />
        )}

        <div className="relative min-w-0 flex-1">
          <div
            ref={attachScroll}
            className="h-full w-full overflow-auto"
            onScroll={(e) =>
              setScroll({
                left: e.currentTarget.scrollLeft,
                top: e.currentTarget.scrollTop,
              })
            }
            onDragOver={(e) => {
              const { types } = e.dataTransfer;
              if (types.includes(DND_MIME) || types.includes(DND_MIME_PANEL)) e.preventDefault();
            }}
            onDrop={onCanvasDrop}
            onClick={(e) => {
              if (e.target === e.currentTarget) onSelect(null);
            }}
          >
            {/* A click on the empty canvas around the page deselects. */}
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) onSelect(null);
              }}
              className="flex min-h-full w-fit min-w-full p-4"
              style={{
                zoom,
                backgroundImage: showGrid ? DOTS : undefined,
                backgroundSize: DOT_PITCH,
              }}
            >
              {/* The page: exactly the profile's design size (the kiosk
                  window renders the same profile 1:1), its padding around
                  the grid, and its own theme / font scoped here. */}
              <div
                ref={setPageEl}
                data-theme-scope={themeScope ? "" : undefined}
                className={cn(
                  "relative isolate",
                  // Centered while smaller than the view (both axes).
                  profile.width > 0 ? "m-auto shrink-0" : "flex-1",
                  themeScope && !background && "bg-background",
                  themeScope && "text-foreground"
                )}
                style={{
                  ...themeScope,
                  padding,
                  fontFamily: font,
                  ...(profile.width > 0 ? { width: profile.width } : {}),
                  ...(fill ? { height: profile.height } : {}),
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) onSelect(null);
                }}
              >
                {/* Page background (as in the kiosk), the dots kept over it,
                    in line with the canvas' own (offset by its p-4) */}
                {background && <PageBackground background={background} className="absolute inset-0 -z-20" />}
                {paintsPage && showGrid && (
                  <div
                    className="pointer-events-none absolute inset-0 -z-10"
                    style={{ backgroundImage: DOTS, backgroundSize: DOT_PITCH, backgroundPosition: "-16px -16px" }}
                  />
                )}
                <div
                  ref={setGridEl}
                  className={cn("relative isolate grid", fill && "h-full")}
                  style={{
                    gap,
                    gridTemplateColumns: `repeat(${profile.cols}, minmax(0, 1fr))`,
                    // Explicit uniform rows: fill mode stretches over the
                    // profile height, scroll mode uses fixed cell heights.
                    gridTemplateRows: fill
                      ? `repeat(${profile.rows}, minmax(0, 1fr))`
                      : `repeat(${profile.rows}, ${SCROLL_ROW_H}px)`,
                  }}
                  onPointerDown={startDraw}
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !drewRef.current) onSelect(null);
                  }}
                >
                  {/* Column alignment guides */}
                  {showGrid &&
                    guides.map((x, i) => (
                      <div
                        key={i}
                        className="pointer-events-none absolute bottom-0 top-0 w-px bg-ring/15"
                        style={{ left: x }}
                      />
                    ))}

                  {/* Drawing / move-resize ghost */}
                  {(drawing || zoneDrag) &&
                    (() => {
                      const r = drawing ?? zoneDrag!.rect;
                      const style = zoneBoxStyle(r);
                      if (!style) return null;
                      return (
                        <div
                          className="pointer-events-none absolute z-30 rounded-lg border-2 border-dashed border-ring bg-ring/10"
                          style={style}
                        >
                          <span className="absolute left-1.5 top-0.5 text-[10px] font-semibold tabular-nums text-ring">
                            C{r.col} · R{r.row} · {r.cols}×{r.rows}
                          </span>
                        </div>
                      );
                    })()}

                  {profile.placements.map((p) => (
                    <LivePlacement
                      key={p.id}
                      placement={p}
                      appearance={appearance}
                      studio
                      selection={primaryId === p.id && p.panel ? { selectedWidgetId } : undefined}
                    >
                      {({ content, hasData, title, idle, scope }) => (
                        <PlacementFrame
                          placement={p}
                          profile={profile}
                          studio
                          hasData={hasData}
                          idle={idle}
                          title={title}
                          scope={scope}
                          gridWidth={gridWidth}
                          zoom={zoom}
                          rowHeight={rowH}
                          ghost={zoneDrag?.ids.includes(p.id)}
                          onZoneDrag={onZoneDrag}
                          onZoneDragEnd={onZoneDragEnd}
                          selected={selectedIds.includes(p.id)}
                          primary={primaryId === p.id}
                          onSelect={(mode) => onSelect(p.id, mode)}
                          onSelectWidget={p.panel ? (widgetId) => onSelectWidget(p.id, widgetId) : undefined}
                          onPickWidget={() => onPickWidget(p.id)}
                        >
                          {content}
                        </PlacementFrame>
                      )}
                    </LivePlacement>
                  ))}

                </div>
              </div>
            </div>
          </div>

          {selected && zoneToolbar && !zoneDrag && !drawing && (
            <ZoneToolbarLayer
              scrollRef={scrollRef}
              zoneId={selected.id}
              layoutKey={[
                zoom,
                selected.colStart,
                selected.rowStart,
                selected.colSpan,
                selected.rowSpan,
                profile.cols,
                profile.rows,
                profile.fit,
                profile.width,
                profile.height,
                gap,
                padding,
                gridWidth,
              ].join("|")}
            >
              {zoneToolbar}
            </ZoneToolbarLayer>
          )}

          {profile.placements.length === 0 && !drawing && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-lg border border-border bg-popover/95 px-6 py-5 text-center shadow-lg">
                <div className="text-sm font-medium text-foreground">
                  Draw a zone, or drag a widget from Add
                </div>
                <p className="max-w-64 text-xs text-muted-foreground">
                  Drag across the empty grid to draw a zone, then pick a
                  widget for it.
                </p>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onOpenAdd}>
                  <Plus className="h-3.5 w-3.5" /> Open Add
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Zone-drag ghost: follows the pointer (outside the zoomed canvas)
          so the zone being moved/resized is always visibly tracked. */}
      {zoneDrag && dragged && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-ring bg-popover px-2 py-1 text-[11px] font-medium shadow-lg"
          style={{ left: zoneDrag.x + 14, top: zoneDrag.y + 14 }}
        >
          {zoneDrag.ids.length > 1 ? `${zoneDrag.ids.length} zones` : placementTitle(dragged)}{" "}
          <span className="tabular-nums text-muted-foreground">
            → C{zoneDrag.rect.col} · R{zoneDrag.rect.row} · {zoneDrag.rect.cols}×{zoneDrag.rect.rows}
          </span>
        </div>
      )}
    </div>
  );
}
