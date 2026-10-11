import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefCallback,
  type RefObject,
} from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCROLL_ROW_H, type MonitorProfile } from "@/lib/layout";
import { panelPresets, type PanelPreset } from "@/lib/panelPresets";
import { PlacementFrame } from "./placement-frame";
import { LivePlacement } from "./placement-content";
import { RulerH, RulerV } from "./rulers";
import {
  ALL_MODULES,
  DND_MIME,
  DND_MIME_PANEL,
  placementTitle,
} from "./studio-modules";
import { fitZoneRect, type ZoneRect } from "./zone-geometry";
import { ZoneToolbarLayer } from "./zone-toolbar";

const GRID_GAP = 12; // must match the canvas grid's gap-3

interface StudioCanvasProps {
  profile: MonitorProfile;
  zoom: number;
  showGrid: boolean;
  /** The scroll container (shared with the zoom hook for wheel + fit). */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Callback ref that attaches the scroll container to the zoom hook. */
  attachScroll: RefCallback<HTMLDivElement>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** A zone was drawn on empty grid space (box already clamped). */
  onDrawZone: (rect: ZoneRect) => void;
  /** A zone is being moved/resized (box already clamped, fires per cell). */
  onZoneRect: (id: string, rect: ZoneRect) => void;
  /** Open the widget picker for a (blank) zone. */
  onPickWidget: (id: string) => void;
  /** A palette widget / panel was dropped on the canvas. */
  onAddModule: (module: string) => void;
  onAddPreset: (preset: PanelPreset) => void;
  /** Open the Add drawer (the empty canvas card). */
  onOpenAdd: () => void;
  /** The selected zone's toolbar, kept next to its frame. */
  zoneToolbar?: ReactNode;
  /** Floating overlay over the canvas viewport (the zoom toolbar). */
  overlay?: ReactNode;
}

/**
 * The design canvas: rulers, the zoomable grid where zones are drawn,
 * moved and resized (biome-style, no overlap), drop target for the
 * palettes, and the move/resize ghosts.
 */
export function StudioCanvas({
  profile,
  zoom,
  showGrid,
  scrollRef,
  attachScroll,
  selectedId,
  onSelect,
  onDrawZone,
  onZoneRect,
  onPickWidget,
  onAddModule,
  onAddPreset,
  onOpenAdd,
  zoneToolbar,
  overlay,
}: StudioCanvasProps) {
  const [zoneDrag, setZoneDrag] = useState<{
    id: string;
    rect: ZoneRect;
    x: number;
    y: number;
  } | null>(null);
  const [drawing, setDrawing] = useState<ZoneRect | null>(null);
  // A completed draw is followed by a click on the grid; it must not
  // deselect the zone just drawn (and selected).
  const drewRef = useRef(false);
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [scroll, setScroll] = useState({ left: 0, top: 0 });
  const [canvas, setCanvas] = useState({ w: 0, h: 0, viewW: 0, viewH: 0 });

  // Measure the grid for resize calculations and alignment guides.
  useLayoutEffect(() => {
    if (gridEl) setGridWidth(gridEl.clientWidth);
  }, [gridEl, profile.id, profile.cols]);
  useEffect(() => {
    const onResize = () => {
      if (gridEl) setGridWidth(gridEl.clientWidth);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [gridEl]);

  // Canvas measurements (design px) for the rulers.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanvas({
      w: el.clientWidth,
      h: el.scrollHeight / zoom,
      viewW: el.clientWidth,
      viewH: el.clientHeight,
    });
  }, [zoom, profile.id, profile.cols, scroll]);

  /**
   * Commit a zone move/resize: apply the clamped box. When it can't be
   * placed without overlapping, the zone keeps its current box.
   */
  const onZoneDrag = (
    id: string,
    rect: ZoneRect,
    pointer: { x: number; y: number }
  ) => {
    const zone = profile.placements.find((p) => p.id === id);
    if (!zone) return;
    const clamped = fitZoneRect(
      rect,
      profile.placements,
      profile.cols,
      profile.rows,
      id
    ) ?? { col: zone.colStart, row: zone.rowStart, cols: zone.colSpan, rows: zone.rowSpan };
    onZoneRect(id, clamped);
    setZoneDrag({ id, rect: clamped, x: pointer.x, y: pointer.y });
  };

  const onZoneDragEnd = () => setZoneDrag(null);

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
    const preset = panelPresets.find((p) => p.id === presetId);
    if (preset) onAddPreset(preset);
  };

  // Alignment guides: vertical lines at the column boundaries (gap-aware).
  const colW =
    gridWidth > 0
      ? (gridWidth - (profile.cols - 1) * GRID_GAP * zoom) / profile.cols
      : 0;
  const guides =
    colW > 0
      ? Array.from({ length: profile.cols - 1 }, (_, i) =>
          (i + 1) * (colW + GRID_GAP * zoom) - GRID_GAP * zoom * 0.5
        )
      : [];

  // Row geometry: fill mode → uniform rows over the profile height;
  // scroll mode → fixed SCROLL_ROW_H rows (the canvas scrolls).
  const rowH =
    profile.fit === "fill" && profile.height > 0
      ? Math.max(
          24,
          (profile.height - (profile.rows - 1) * GRID_GAP) / profile.rows
        )
      : SCROLL_ROW_H;
  const getGridRect = () => gridEl?.getBoundingClientRect() ?? null;

  /** The 1-based grid cell under a screen point (null outside the grid). */
  const cellAt = (x: number, y: number): { col: number; row: number } | null => {
    const rect = getGridRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    const pitchX = (rect.width + GRID_GAP * zoom) / profile.cols;
    const pitchY = (rect.height + GRID_GAP * zoom) / profile.rows;
    const col = Math.floor((x - rect.left) / pitchX) + 1;
    const row = Math.floor((y - rect.top) / pitchY) + 1;
    if (col < 1 || col > profile.cols || row < 1 || row > profile.rows)
      return null;
    return { col, row };
  };

  /** Grid-local display-px box for a ZoneRect (drawing / drag ghost). */
  const zoneBoxStyle = (r: ZoneRect) => {
    if (colW <= 0) return null;
    const g = GRID_GAP * zoom;
    const gridH =
      profile.fit === "fill" && profile.height > 0
        ? profile.height * zoom
        : profile.rows * SCROLL_ROW_H * zoom + (profile.rows - 1) * g;
    const rowHd =
      profile.fit === "fill" && profile.height > 0
        ? (gridH - (profile.rows - 1) * g) / profile.rows
        : SCROLL_ROW_H * zoom;
    const pitchY = (gridH + g) / profile.rows;
    return {
      left: (r.col - 1) * (colW + g),
      top: (r.row - 1) * pitchY,
      width: r.cols * colW + (r.cols - 1) * g,
      height: r.rows * rowHd + (r.rows - 1) * g,
    };
  };

  const dragged = zoneDrag
    ? profile.placements.find((x) => x.id === zoneDrag.id)
    : undefined;
  const selected = profile.placements.find((x) => x.id === selectedId);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Ruler row */}
      <div className="flex shrink-0">
        <div className="h-6 w-7 shrink-0 border-b border-r border-border bg-popover/60" />
        <div className="min-w-0 flex-1">
          <RulerH
            length={canvas.w}
            zoom={zoom}
            offset={scroll.left}
            view={canvas.viewW}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <RulerV
          length={canvas.h}
          zoom={zoom}
          offset={scroll.top}
          view={canvas.viewH}
        />

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
              if (e.dataTransfer.types.includes(DND_MIME)) e.preventDefault();
            }}
            onDrop={onCanvasDrop}
          >
            <div
              className="w-fit min-w-full p-4"
              style={{
                zoom,
                backgroundImage: showGrid
                  ? "radial-gradient(circle, hsl(var(--ring) / 0.22) 1px, transparent 1.25px)"
                  : undefined,
                backgroundSize: "24px 24px",
              }}
            >
              <div
                ref={setGridEl}
                className="relative grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${profile.cols}, minmax(0, 1fr))`,
                  // Explicit uniform rows: fill mode stretches over the
                  // profile height, scroll mode uses fixed cell heights.
                  gridTemplateRows:
                    profile.fit === "fill" && profile.height > 0
                      ? `repeat(${profile.rows}, minmax(0, 1fr))`
                      : `repeat(${profile.rows}, ${SCROLL_ROW_H}px)`,
                  // The canvas is exactly the profile's design size
                  // (the kiosk window renders the same profile 1:1).
                  ...(profile.width > 0 ? { width: profile.width } : {}),
                  ...(profile.fit === "fill" && profile.height > 0
                    ? { height: profile.height }
                    : {}),
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
                  <LivePlacement key={p.id} placement={p} profileStyle={profile.style}>
                    {({ content, hasData, title, idle }) => (
                      <PlacementFrame
                        placement={p}
                        profile={profile}
                        studio
                        hasData={hasData}
                        idle={idle}
                        title={title}
                        gridWidth={gridWidth}
                        zoom={zoom}
                        gap={GRID_GAP}
                        rowHeight={rowH}
                        ghost={zoneDrag?.id === p.id}
                        onZoneDrag={onZoneDrag}
                        onZoneDragEnd={onZoneDragEnd}
                        selected={selectedId === p.id}
                        onSelect={() => onSelect(p.id)}
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

          {overlay}
        </div>
      </div>

      {/* Zone-drag ghost: follows the pointer (outside the zoomed canvas)
          so the zone being moved/resized is always visibly tracked. */}
      {zoneDrag && dragged && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-ring bg-popover px-2 py-1 text-[11px] font-medium shadow-lg"
          style={{ left: zoneDrag.x + 14, top: zoneDrag.y + 14 }}
        >
          {placementTitle(dragged)}{" "}
          <span className="tabular-nums text-muted-foreground">
            → C{zoneDrag.rect.col} · R{zoneDrag.rect.row} · {zoneDrag.rect.cols}×{zoneDrag.rect.rows}
          </span>
        </div>
      )}
    </div>
  );
}
