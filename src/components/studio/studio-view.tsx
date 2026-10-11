import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import {
  Check,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  Maximize2,
  Minus,
  Monitor,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { PlacementFrame } from "./placement-frame";
import { placementContent } from "./placement-content";
import { RulerH, RulerV } from "./rulers";
import { SettingsPanel } from "./settings-panel";
import { ThemePanel } from "./theme-panel";
import { PanelInspector } from "./panel-inspector";
import { SourcesPanel } from "./sources-panel";
import { modules, claimedKeys, type SensorMap } from "@/modules";
import {
  BLANK_MODULE,
  CARDS_ID,
  PANEL_ID,
  SCROLL_ROW_H,
  clonePlacement,
  defaultConfig,
  mergeConfig,
  newProfile,
  uid,
  type DashboardConfig,
  type MonitorProfile,
  type Placement,
  type PlacementDesign,
} from "@/lib/layout";
import { panelPresets, type PanelPreset } from "@/lib/panelPresets";
import { hslToHex, THEME_PRESETS, type ThemeTokens } from "@/lib/theme";
import { BUILD_ID } from "@/lib/buildInfo";
import { cn } from "@/lib/utils";

const ALL_MODULES = [
  ...modules.map((m) => ({
    id: m.id,
    title: m.title,
    minCols: m.minCols ?? 2,
    minRows: m.minRows ?? 1,
  })),
  { id: CARDS_ID, title: "Other sensors", minCols: 4, minRows: 2 },
];

const DND_MIME = "text/infopanel-module";
const DND_MIME_PANEL = "text/infopanel-panel";
const GRID_GAP = 12; // must match the canvas grid's gap-3

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

/** A zone box in 1-based grid cells. */
interface ZoneRect {
  col: number;
  row: number;
  cols: number;
  rows: number;
}

/** Anything that occupies grid cells (a placement's box). */
interface ZoneLike {
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
}

function rectsOverlap(r: ZoneRect, o: ZoneLike): boolean {
  return (
    r.col < o.colStart + o.colSpan &&
    o.colStart < r.col + r.cols &&
    r.row < o.rowStart + o.rowSpan &&
    o.rowStart < r.row + r.rows
  );
}

/**
 * Clamp a proposed zone box to the grid, then push it out of any other
 * zones along the axis of least penetration (biome-style: zones never
 * overlap). `ignore` is the id of the zone being moved/resized.
 */
function clampZoneRect(
  rect: ZoneRect,
  others: Placement[],
  cols: number,
  rows: number,
  ignore?: string
): ZoneRect {
  let r: ZoneRect = {
    col: Math.max(1, Math.min(cols, rect.col)),
    row: Math.max(1, Math.min(rows, rect.row)),
    cols: Math.max(1, Math.min(cols, rect.cols)),
    rows: Math.max(1, Math.min(rows, rect.rows)),
  };
  r.col = Math.min(r.col, cols - r.cols + 1);
  r.row = Math.min(r.row, rows - r.rows + 1);
  for (let i = 0; i < 8; i++) {
    const hit = others.find(
      (o) =>
        o.id !== ignore &&
        o.visible !== false &&
        rectsOverlap(r, o)
    );
    if (!hit) break;
    const hcol = hit.colStart;
    const hrow = hit.rowStart;
    const hcols = hit.colSpan;
    const hrows = hit.rowSpan;
    const penRight = r.col + r.cols - hcol; // r fully right of hit
    const penLeft = hcol + hcols - r.col; // r fully left of hit
    const penDown = r.row + r.rows - hrow; // r fully below hit
    const penUp = hrow + hrows - r.row; // r fully above hit
    const m = Math.min(penRight, penLeft, penDown, penUp);
    if (m === penRight) r.col += penRight;
    else if (m === penLeft) r.col -= penLeft;
    else if (m === penDown) r.row += penDown;
    else r.row -= penUp;
    r.col = Math.max(1, Math.min(cols - r.cols + 1, r.col));
    r.row = Math.max(1, Math.min(rows - r.rows + 1, r.row));
  }
  return r;
}

/**
 * First empty grid cell where a cols×rows box fits (row-major scan),
 * used to place palette widgets. Returns null when the grid is full.
 */
function firstFreeRect(
  cols: number,
  rows: number,
  size: { cols: number; rows: number },
  placements: Placement[]
): ZoneRect | null {
  for (let row = 1; row + size.rows - 1 <= rows; row++) {
    for (let col = 1; col + size.cols - 1 <= cols; col++) {
      const probe: ZoneRect = { col, row, cols: size.cols, rows: size.rows };
      if (placements.some((p) => p.visible !== false && rectsOverlap(probe, p)))
        continue;
      return probe;
    }
  }
  return null;
}

interface StudioViewProps {
  sensors: SensorMap;
  config: DashboardConfig;
  /** The resolved (active) grid profile being edited. */
  profile: MonitorProfile;
  setConfig: Dispatch<SetStateAction<DashboardConfig>>;
  windowWidth: number;
  windowHeight: number;
  onExitStudio: () => void;
  /** Flush the config to the bridge and force the kiosk view to refresh. */
  onSave: (config: DashboardConfig) => void;
}

/**
 * The studio: left panel (profiles + widget palette), a center grid canvas
 * where zones are drawn, moved and resized (biome-style, no overlap), and
 * a right panel (zone inspector, or the theme editor). A bottom bar holds
 * theme presets and config export/import.
 */
export function StudioView({
  sensors,
  config,
  profile,
  setConfig,
  windowWidth,
  windowHeight,
  onExitStudio,
  onSave,
}: StudioViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoneDrag, setZoneDrag] = useState<{
    id: string;
    rect: ZoneRect;
    x: number;
    y: number;
  } | null>(null);
  const [drawing, setDrawing] = useState<ZoneRect | null>(null);
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showSources, setShowSources] = useState(false);
  const [scroll, setScroll] = useState({ left: 0, top: 0 });
  const [canvas, setCanvas] = useState({ w: 0, h: 0, viewW: 0, viewH: 0 });
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    onSave(config);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 1500);
  };

  // Deselect when switching profiles.
  useEffect(() => setSelectedId(null), [profile.id]);

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

  // Ctrl/cmd + wheel zooms the canvas.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom((z) => {
        const i = ZOOM_STEPS.indexOf(z);
        const dir = e.deltaY < 0 ? 1 : -1;
        return ZOOM_STEPS[
          Math.max(0, Math.min(ZOOM_STEPS.length - 1, (i === -1 ? 3 : i) + dir))
        ];
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomStep = (dir: 1 | -1) =>
    setZoom((z) => {
      const i = ZOOM_STEPS.indexOf(z);
      return ZOOM_STEPS[
        Math.max(0, Math.min(ZOOM_STEPS.length - 1, (i === -1 ? 3 : i) + dir))
      ];
    });

  /** Zoom so the profile's design width fits the canvas viewport. */
  const fitZoom = () => {
    const el = scrollRef.current;
    if (!el || profile.width <= 0) return;
    const z = (el.clientWidth - 32) / profile.width;
    setZoom(Math.max(0.25, Math.min(2, Math.round(z * 100) / 100)));
  };

  const copyProfile = () => {
    navigator.clipboard
      .writeText(JSON.stringify(profile, null, 2))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {});
  };

  const unclaimed = (() => {
    const claimed = claimedKeys(sensors);
    return Object.entries(sensors).filter(([key]) => !claimed.has(key));
  })();

  const selected = profile.placements.find((p) => p.id === selectedId) ?? null;

  /* ---------------- profile + placement mutations ---------------- */

  const updateProfile = (fn: (p: MonitorProfile) => MonitorProfile) => {
    setConfig((c) => ({
      ...c,
      profiles: c.profiles.map((p) => (p.id === profile.id ? fn(p) : p)),
    }));
  };

  const addPlacement = (module: string) => {
    const id = uid(module);
    updateProfile((p) => {
      const meta = ALL_MODULES.find((m) => m.id === module);
      const size = {
        cols: Math.max(1, Math.min(meta?.minCols ?? 2, p.cols)),
        rows: Math.max(1, Math.min(meta?.minRows ?? 1, p.rows)),
      };
      const pos =
        firstFreeRect(p.cols, p.rows, size, p.placements) ?? {
          col: 1,
          row: 1,
          cols: size.cols,
          rows: size.rows,
        };
      return {
        ...p,
        placements: [
          ...p.placements,
          {
            id,
            module,
            colStart: pos.col,
            rowStart: pos.row,
            colSpan: pos.cols,
            rowSpan: pos.rows,
            visible: true,
          },
        ],
      };
    });
    setSelectedId(id);
  };

  /** Add a pre-designed panel (a group of widgets) from a preset. */
  const addPanelPreset = (preset: PanelPreset) => {
    const id = uid(PANEL_ID);
    updateProfile((p) => {
      const size = {
        cols: Math.max(1, Math.min(preset.colSpan, p.cols)),
        rows: Math.max(1, Math.min(preset.rowSpan, p.rows)),
      };
      const pos =
        firstFreeRect(p.cols, p.rows, size, p.placements) ?? {
          col: 1,
          row: 1,
          cols: size.cols,
          rows: size.rows,
        };
      return {
        ...p,
        placements: [
          ...p.placements,
          {
            id,
            module: PANEL_ID,
            colStart: pos.col,
            rowStart: pos.row,
            colSpan: pos.cols,
            rowSpan: pos.rows,
            visible: true,
            panel: preset.make(),
          },
        ],
      };
    });
    setSelectedId(id);
  };

  const setSpan = (id: string, span: number) =>
    updateProfile((p) => ({
      ...p,
      placements: p.placements.map((x) =>
        x.id === id ? { ...x, colSpan: span } : x
      ),
    }));

  /** Generic placement mutation (settings, design, ...). */
  const updatePlacement = (id: string, fn: (p: Placement) => Placement) =>
    updateProfile((p) => ({
      ...p,
      placements: p.placements.map((x) => (x.id === id ? fn(x) : x)),
    }));

  const toggleVisible = (id: string) =>
    updateProfile((p) => ({
      ...p,
      placements: p.placements.map((x) =>
        x.id === id ? { ...x, visible: !x.visible } : x
      ),
    }));

  const removePlacement = (id: string) => {
    updateProfile((p) => ({
      ...p,
      placements: p.placements.filter((x) => x.id !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicatePlacement = (id: string) =>
    updateProfile((p) => {
      const i = p.placements.findIndex((x) => x.id === id);
      if (i === -1) return p;
      const next = [...p.placements];
      next.splice(i + 1, 0, clonePlacement(p.placements[i]));
      return { ...p, placements: next };
    });

  /** Commit a zone move/resize: apply the clamped box. */
  const onZoneDrag = (
    id: string,
    rect: ZoneRect,
    pointer: { x: number; y: number }
  ) => {
    const clamped = clampZoneRect(
      rect,
      profile.placements,
      profile.cols,
      profile.rows,
      id
    );
    updatePlacement(id, (p) => ({
      ...p,
      colStart: clamped.col,
      rowStart: clamped.row,
      colSpan: clamped.cols,
      rowSpan: clamped.rows,
    }));
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
      const clamped = clampZoneRect(
        rect,
        profile.placements,
        profile.cols,
        profile.rows
      );
      const id = uid(BLANK_MODULE);
      updateProfile((p) => ({
        ...p,
        placements: [
          ...p.placements,
          {
            id,
            module: BLANK_MODULE,
            colStart: clamped.col,
            rowStart: clamped.row,
            colSpan: clamped.cols,
            rowSpan: clamped.rows,
            visible: true,
          },
        ],
      }));
      setSelectedId(id);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /** Set the selected zone's box (inspector inputs), clamped + no overlap. */
  const setZoneBox = (patch: Partial<ZoneRect>) => {
    if (!selected) return;
    const next: ZoneRect = {
      col: selected.colStart,
      row: selected.rowStart,
      cols: selected.colSpan,
      rows: selected.rowSpan,
      ...patch,
    };
    const clamped = clampZoneRect(
      next,
      profile.placements,
      profile.cols,
      profile.rows,
      selected.id
    );
    updatePlacement(selected.id, (p) => ({
      ...p,
      colStart: clamped.col,
      rowStart: clamped.row,
      colSpan: clamped.cols,
      rowSpan: clamped.rows,
    }));
  };

  /** Assign a widget to the selected zone (blank, module, or preset panel). */
  const assignWidget = (value: string) => {
    if (!selected) return;
    updatePlacement(selected.id, (p) => {
      if (value === "blank") {
        return { ...p, module: BLANK_MODULE, panel: undefined, settings: undefined };
      }
      if (value.startsWith("module:")) {
        const id = value.slice("module:".length);
        const meta = ALL_MODULES.find((m) => m.id === id);
        // Grow the zone to the widget's minimum footprint (grid-clamped).
        const cols = Math.min(
          Math.max(p.colSpan, meta?.minCols ?? 2),
          profile.cols
        );
        const rows = Math.min(
          Math.max(p.rowSpan, meta?.minRows ?? 1),
          profile.rows
        );
        return {
          ...p,
          module: id,
          panel: undefined,
          settings: undefined,
          colSpan: cols,
          rowSpan: rows,
          colStart: Math.min(p.colStart, profile.cols - cols + 1),
          rowStart: Math.min(p.rowStart, profile.rows - rows + 1),
        };
      }
      if (value.startsWith("preset:")) {
        const preset = panelPresets.find(
          (x) => x.id === value.slice("preset:".length)
        );
        if (!preset) return p;
        const cols = Math.min(
          Math.max(p.colSpan, preset.colSpan),
          profile.cols
        );
        const rows = Math.min(
          Math.max(p.rowSpan, preset.rowSpan),
          profile.rows
        );
        return {
          ...p,
          module: PANEL_ID,
          panel: preset.make(),
          settings: undefined,
          colSpan: cols,
          rowSpan: rows,
          colStart: Math.min(p.colStart, profile.cols - cols + 1),
          rowStart: Math.min(p.rowStart, profile.rows - rows + 1),
        };
      }
      return p;
    });
  };

  /** The widget select's value for the selected zone. */
  const widgetValue = selected
    ? selected.module === BLANK_MODULE
      ? "blank"
      : selected.panel
        ? "custom-panel"
        : `module:${selected.module}`
    : "";

  /** Change the column count, keeping every zone inside the grid. */
  const changeCols = (delta: number) =>
    updateProfile((p) => {
      const cols = Math.max(2, Math.min(24, p.cols + delta));
      return {
        ...p,
        cols,
        placements: p.placements.map((pl) => {
          const colStart = Math.min(pl.colStart, cols);
          const colSpan = Math.max(1, Math.min(pl.colSpan, cols - colStart + 1));
          return { ...pl, colStart, colSpan };
        }),
      };
    });

  /** Change the row count, keeping every zone inside the grid. */
  const changeRows = (delta: number) =>
    updateProfile((p) => {
      const rows = Math.max(1, Math.min(24, p.rows + delta));
      return {
        ...p,
        rows,
        placements: p.placements.map((pl) => {
          const rowStart = Math.min(pl.rowStart, rows);
          const rowSpan = Math.max(1, Math.min(pl.rowSpan, rows - rowStart + 1));
          return { ...pl, rowStart, rowSpan };
        }),
      };
    });

  const addProfile = () => {
    const np = newProfile(
      `${windowWidth}×${windowHeight}`,
      windowWidth,
      windowHeight
    );
    setConfig((c) => ({
      ...c,
      profiles: [...c.profiles, np],
      activeProfile: np.id,
    }));
  };

  const removeProfile = () => {
    if (config.profiles.length <= 1) return;
    setConfig((c) => ({
      ...c,
      profiles: c.profiles.filter((p) => p.id !== profile.id),
      activeProfile: "auto",
    }));
  };

  /* ---------------- theme + file actions ---------------- */

  const applyPreset = (name: string) => {
    const preset = THEME_PRESETS.find((p) => p.name === name);
    if (preset) setConfig((c) => ({ ...c, theme: { ...preset.tokens } }));
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "infopanel-dashboard-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (file: File) => {
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as Partial<DashboardConfig>;
        if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
          throw new Error("Missing profiles");
        }
        // mergeConfig runs the v1→v2 migration (explicit zone boxes, rows).
        setConfig(mergeConfig(parsed));
      } catch (err) {
        console.error("Failed to import dashboard config", err);
      }
    });
  };

  /* ---------------- canvas ---------------- */

  const onCanvasDrop = (e: DragEvent) => {
    e.preventDefault();
    const module = e.dataTransfer.getData(DND_MIME);
    if (module && ALL_MODULES.some((m) => m.id === module)) {
      addPlacement(module);
      return;
    }
    const presetId = e.dataTransfer.getData(DND_MIME_PANEL);
    const preset = panelPresets.find((p) => p.id === presetId);
    if (preset) addPanelPreset(preset);
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

  const selectedTitle = selected
    ? selected.panel?.title ??
      ALL_MODULES.find((m) => m.id === selected.module)?.title ??
      selected.module
    : "";
  const selectedMod = selected
    ? modules.find((m) => m.id === selected.module)
    : undefined;
  const selectedSensors = selectedMod
    ? Object.keys(sensors).filter((k) => selectedMod.matches(k)).length
    : 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="flex min-h-0 flex-1 overflow-x-auto">
        {/* ================= LEFT: profiles + module palette ================= */}
        <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r bg-popover/40">
          <div className="flex items-center gap-2 border-b p-3">
            <LayoutGrid className="h-4 w-4" />
            <span className="text-sm font-semibold">Dashboard studio</span>
          </div>

          <section className="space-y-2 p-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Monitor profiles
            </div>
            <div className="space-y-1">
              {config.profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    setConfig((c) => ({ ...c, activeProfile: p.id }))
                  }
                  className={cn(
                    "w-full rounded-md border px-2 py-1.5 text-left text-xs",
                    p.id === profile.id
                      ? "border-ring bg-accent"
                      : "border-border hover:border-ring/50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-foreground">
                      {p.name}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {p.width}×{p.height} · {p.cols}×{p.rows}
                    {p.fit === "fill" ? " · fill" : ""}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 flex-1 text-xs"
                onClick={addProfile}
              >
                <Plus className="h-3 w-3" /> New
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-8 text-xs"
                onClick={removeProfile}
                disabled={config.profiles.length <= 1}
                title="Delete active profile"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </section>

          <section className="space-y-2 border-t p-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Widgets
            </div>
            {ALL_MODULES.map((m) => {
              const count = profile.placements.filter(
                (p) => p.module === m.id
              ).length;
              return (
                <div
                  key={m.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DND_MIME, m.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="flex cursor-grab items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs active:cursor-grabbing hover:border-ring/50"
                  title="Drag onto the canvas, or click + to add"
                >
                  <span className="truncate text-foreground/85">
                    {m.title}
                  </span>
                  <span className="ml-2 flex shrink-0 items-center gap-1 text-muted-foreground">
                    <span className="tabular-nums text-[10px] text-muted-foreground/60">
                      {m.minCols}×{m.minRows}
                    </span>
                    {count > 0 && (
                      <Badge variant="secondary" className="px-1.5 text-[10px]">
                        {count}
                      </Badge>
                    )}
                    <button
                      onClick={() => addPlacement(m.id)}
                      className="rounded p-0.5 hover:bg-accent hover:text-foreground"
                      title="Add to canvas"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </span>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground/60">
              Numbers are the minimum zone size (grid cells). Drop a widget,
              or draw a zone first and assign it from the inspector.
            </p>
          </section>

          <section className="space-y-2 border-t p-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Panels
            </div>
            {panelPresets.map((preset) => (
              <div
                key={preset.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DND_MIME_PANEL, preset.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="flex cursor-grab items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs active:cursor-grabbing hover:border-ring/50"
                title={
                  preset.description
                    ? `${preset.description} — drag onto the canvas, or click +`
                    : "Drag onto the canvas, or click + to add"
                }
              >
                <span className="truncate text-foreground/85">
                  {preset.title}
                </span>
                <span className="ml-2 flex shrink-0 items-center gap-1 text-muted-foreground">
                  <span className="tabular-nums text-[10px] text-muted-foreground/60">
                    {preset.colSpan}×{preset.rowSpan}
                  </span>
                  <button
                    onClick={() => addPanelPreset(preset)}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Add panel to canvas"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground/60">
              Panels are groups of widgets. Drop one, then bind, reorder and
              style each widget in the inspector.
            </p>
          </section>
        </aside>

        {/* ================= CENTER: toolbar + grid canvas ================= */}
        <main className="flex min-w-[420px] flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-3 border-b bg-popover/40 px-4 py-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <input
              value={profile.name}
              onChange={(e) =>
                updateProfile((p) => ({ ...p, name: e.target.value }))
              }
              className="w-40 rounded-md border bg-background px-2 py-1 text-sm text-foreground"
            />
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              W
              <input
                type="number"
                value={profile.width}
                onChange={(e) =>
                  updateProfile((p) => ({
                    ...p,
                    width: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="w-20 rounded-md border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              H
              <input
                type="number"
                value={profile.height}
                onChange={(e) =>
                  updateProfile((p) => ({
                    ...p,
                    height: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="w-20 rounded-md border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Cols
              <button
                onClick={() => changeCols(-1)}
                className="rounded-md border p-1 hover:bg-accent"
                title="Fewer columns"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center tabular-nums">
                {profile.cols}
              </span>
              <button
                onClick={() => changeCols(1)}
                className="rounded-md border p-1 hover:bg-accent"
                title="More columns"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Rows
              <button
                onClick={() => changeRows(-1)}
                className="rounded-md border p-1 hover:bg-accent"
                title="Fewer rows"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center tabular-nums">
                {profile.rows}
              </span>
              <button
                onClick={() => changeRows(1)}
                className="rounded-md border p-1 hover:bg-accent"
                title="More rows"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <Segmented
              options={[
                { value: "scroll", label: "Scroll" },
                { value: "fill", label: "Fill viewport" },
              ]}
              value={profile.fit}
              onChange={(fit) => updateProfile((p) => ({ ...p, fit }))}
            />
            <Segmented
              options={[
                { value: "simple", label: "Simple" },
                { value: "advanced", label: "Advanced" },
              ]}
              value={mode}
              onChange={(m) => setMode(m as "simple" | "advanced")}
            />
            <button
              onClick={() => setShowSources((v) => !v)}
              className={cn(
                "flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
                showSources
                  ? "border-accent bg-accent/40 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Manage data sources"
            >
              <Database className="h-3.5 w-3.5" />
              Sources
            </button>
            <div className="ml-auto flex items-center gap-3">
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleSave}
                title="Save to the bridge and refresh the kiosk view"
              >
                {saved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saved ? "Saved" : "Save"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {profile.placements.length} placements
              </span>
            </div>
          </div>

          {showSources ? (
            <div className="min-h-0 flex-1 overflow-hidden bg-background/40">
              <SourcesPanel
                sensors={sensors}
                sourcePrefs={config.sourcePrefs}
                onPrefsChange={(key, pref) =>
                  setConfig((c) => ({
                    ...c,
                    sourcePrefs: {
                      ...c.sourcePrefs,
                      [key]: { ...c.sourcePrefs?.[key], ...pref },
                    },
                  }))
                }
                placements={profile.placements}
                onBind={(placementId, container) =>
                  updatePlacement(placementId, (p) => ({
                    ...p,
                    settings: { ...p.settings, source: container },
                  }))
                }
                onUnbind={(placementId) =>
                  updatePlacement(placementId, (p) => {
                    const settings = { ...p.settings };
                    delete settings.source;
                    return { ...p, settings };
                  })
                }
              />
            </div>
          ) : (
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
                  ref={scrollRef}
                  className="h-full w-full overflow-auto"
                  onScroll={(e) =>
                    setScroll({
                      left: e.currentTarget.scrollLeft,
                      top: e.currentTarget.scrollTop,
                    })
                  }
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes(DND_MIME))
                      e.preventDefault();
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
                        if (e.target === e.currentTarget)
                          setSelectedId(null);
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

                      {profile.placements.map((p) => {
                        const { content, hasData, title } =
                          placementContent(p, sensors, unclaimed);
                        return (
                          <PlacementFrame
                            key={p.id}
                            placement={p}
                            profile={profile}
                            studio
                            hasData={hasData}
                            title={title}
                            gridWidth={gridWidth}
                            zoom={zoom}
                            gap={GRID_GAP}
                            rowHeight={rowH}
                            ghost={zoneDrag?.id === p.id}
                            onZoneDrag={onZoneDrag}
                            onZoneDragEnd={onZoneDragEnd}
                            selected={selectedId === p.id}
                            onSelect={() => setSelectedId(p.id)}
                            onSpan={setSpan}
                            onToggle={toggleVisible}
                            onRemove={removePlacement}
                          >
                            {content}
                          </PlacementFrame>
                        );
                      })}

                      {profile.placements.length === 0 && (
                        <div className="col-span-full flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground/60">
                          Draw a zone — drag across the empty grid — then pick
                          a widget for it
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Floating zoom / fit toolbar */}
                <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center">
                  <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-popover/90 px-2 py-1.5 shadow-lg backdrop-blur">
                    <button
                      onClick={() => setShowGrid((s) => !s)}
                      title="Toggle grid"
                      className={cn(
                        "rounded-full p-1.5 transition-colors hover:bg-accent",
                        showGrid
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <div className="h-4 w-px bg-border" />
                    <button
                      onClick={() => zoomStep(-1)}
                      title="Zoom out"
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setZoom(1)}
                      title="Reset to 100%"
                      className="min-w-12 rounded-full px-1.5 text-center text-xs tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                    <button
                      onClick={() => zoomStep(1)}
                      title="Zoom in"
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={fitZoom}
                      title="Fit design width to viewport"
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="h-4 w-px bg-border" />
                    <button
                      onClick={copyProfile}
                      title="Copy profile JSON"
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <div className="h-4 w-px bg-border" />
                    <span className="px-1 text-xs tabular-nums text-muted-foreground">
                      {profile.width} × {profile.height}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </main>

        {/* ================= RIGHT: inspector / theme ================= */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l bg-popover/40">
          {selected ? (
            <section className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Placement
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-md border border-border p-3">
                <div className="text-sm font-medium text-foreground">
                  {selectedTitle}
                </div>
                {selected.module !== CARDS_ID &&
                  selected.module !== PANEL_ID && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {selectedSensors} live sensor
                      {selectedSensors === 1 ? "" : "s"}
                    </div>
                  )}
              </div>

              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  Zone box{" "}
                  <span className="text-muted-foreground/60">
                    (grid cells)
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["col", "row", "cols", "rows"] as const).map((k) => (
                    <label key={k} className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                        {k === "col" ? "Col" : k === "row" ? "Row" : k === "cols" ? "W" : "H"}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={
                          k === "col" || k === "cols" ? profile.cols : profile.rows
                        }
                        value={
                          k === "col"
                            ? selected.colStart
                            : k === "row"
                              ? selected.rowStart
                              : k === "cols"
                                ? selected.colSpan
                                : selected.rowSpan
                        }
                        onChange={(e) =>
                          setZoneBox({
                            [k]: Math.max(1, parseInt(e.target.value, 10) || 1),
                          } as Partial<ZoneRect>)
                        }
                        className="w-full rounded-md border border-border bg-background px-1.5 py-1 text-xs tabular-nums text-foreground outline-none focus:border-ring"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  Widget
                </div>
                <select
                  value={widgetValue}
                  onChange={(e) => assignWidget(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring"
                >
                  <option value="blank">Blank — no widget</option>
                  {selected.panel && (
                    <option value="custom-panel">
                      Custom panel (edit widgets below)
                    </option>
                  )}
                  <optgroup label="Modules">
                    {ALL_MODULES.map((m) => (
                      <option key={m.id} value={`module:${m.id}`}>
                        {m.title} ({m.minCols}×{m.minRows})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Panels">
                    {panelPresets.map((preset) => (
                      <option key={preset.id} value={`preset:${preset.id}`}>
                        {preset.title} ({preset.colSpan}×{preset.rowSpan})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {mode === "advanced" &&
                (selected.panel ? (
                  <PanelInspector
                    placement={selected}
                    sensors={sensors}
                    update={(fn) => updatePlacement(selected.id, fn)}
                  />
                ) : (
                  <>
              {/* Design */}
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Design
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Accent</span>
                      {selected.design?.accent && (
                        <button
                          onClick={() =>
                            updatePlacement(selected.id, (p) => ({
                              ...p,
                              design: { ...p.design, accent: undefined },
                            }))
                          }
                          className="hover:text-foreground"
                        >
                          Use theme
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selected.design?.accent ?? hslToHex(config.theme.accent)}
                        onChange={(e) =>
                          updatePlacement(selected.id, (p) => ({
                            ...p,
                            design: {
                              ...p.design,
                              accent: e.target.value,
                            },
                          }))
                        }
                        className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                      />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {selected.design?.accent ?? "theme"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">
                      Background
                    </div>
                    <Segmented
                      options={[
                        { value: "none", label: "None" },
                        { value: "panel", label: "Panel" },
                        { value: "bordered", label: "Bordered" },
                      ]}
                      value={selected.design?.background ?? "none"}
                      onChange={(v) =>
                        updatePlacement(selected.id, (p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            background: v as PlacementDesign["background"],
                          },
                        }))
                      }
                    />
                  </div>

                  <button
                    onClick={() =>
                      updatePlacement(selected.id, (p) => ({
                        ...p,
                        design: {
                          ...p.design,
                          header: !p.design?.header,
                        },
                      }))
                    }
                    className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-accent/40"
                  >
                    <span className="text-xs text-muted-foreground">
                      Title header
                    </span>
                    <span
                      className={cn(
                        "relative h-4 w-7 rounded-full transition-colors",
                        selected.design?.header
                          ? "bg-ring"
                          : "bg-muted-foreground/30"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all",
                          selected.design?.header
                            ? "left-3.5"
                            : "left-0.5"
                        )}
                      />
                    </span>
                  </button>
                </div>
              </div>

              {/* Module settings */}
              {selectedMod && selectedMod.settings && (
                <SettingsPanel
                  module={selectedMod}
                  value={selected.settings}
                  onChange={(key, v) =>
                    updatePlacement(selected.id, (p) => ({
                      ...p,
                      settings: { ...p.settings, [key]: v },
                    }))
                  }
                  onReset={() =>
                    updatePlacement(selected.id, (p) => ({
                      ...p,
                      settings: undefined,
                    }))
                  }
                  sensors={sensors}
                />
              )}
                </>
                ))}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 text-xs"
                  onClick={() => toggleVisible(selected.id)}
                >
                  {selected.visible ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  {selected.visible ? "Hide" : "Show"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 text-xs"
                  onClick={() => duplicatePlacement(selected.id)}
                >
                  <Copy className="h-3 w-3" /> Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 text-xs"
                  onClick={() => removePlacement(selected.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </section>
          ) : (
            <>
              <section className="p-4">
                <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Theme
                </div>
                <ThemePanel
                  tokens={config.theme}
                  radius={config.radius}
                  presetName={
                    THEME_PRESETS.find(
                      (p) =>
                        JSON.stringify(p.tokens) ===
                        JSON.stringify(config.theme)
                    )?.name ?? "custom"
                  }
                  onToken={(key, value) =>
                    setConfig((c) => ({
                      ...c,
                      theme: { ...c.theme, [key]: value } as ThemeTokens,
                    }))
                  }
                  onRadius={(radius) => setConfig((c) => ({ ...c, radius }))}
                  onPreset={applyPreset}
                />
              </section>
              <div className="border-t p-4 text-xs text-muted-foreground/60">
                Select a module on the canvas to edit its size and visibility.
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ================= BOTTOM: presets + file actions ================= */}
      <footer className="flex h-12 shrink-0 items-center justify-between border-t bg-popover/40 px-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              title={preset.label}
              onClick={() => applyPreset(preset.name)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-xs",
                JSON.stringify(preset.tokens) ===
                  JSON.stringify(config.theme)
                  ? "border-ring"
                  : "border-border hover:border-ring/50"
              )}
            >
              <span className="flex -space-x-1">
                {(["background", "primary", "accent"] as (keyof ThemeTokens)[]).map((token) => (
                  <span
                    key={token}
                    className="h-3 w-3 rounded-full border border-foreground/20"
                    style={{ backgroundColor: hslToHex(preset.tokens[token]) }}
                  />
                ))}
              </span>
              {preset.label}
            </button>
          ))}
          <span className="shrink-0 pl-2 text-[10px] tabular-nums text-muted-foreground/50">
            build {BUILD_ID}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={exportConfig}
          >
            <Download className="mr-1 h-3 w-3" /> Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-1 h-3 w-3" /> Import
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setConfig(defaultConfig())}
          >
            <RotateCcw className="mr-1 h-3 w-3" /> Reset
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={onExitStudio}>
            <Wrench className="mr-1 h-3 w-3" /> Kiosk view
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importConfig(file);
              e.target.value = "";
            }}
          />
        </div>
      </footer>

      {/* Zone-drag ghost: follows the pointer (outside the zoomed canvas)
          so the zone being moved/resized is always visibly tracked. */}
      {zoneDrag &&
        (() => {
          const p = profile.placements.find((x) => x.id === zoneDrag.id);
          if (!p) return null;
          const title =
            p.panel?.title ??
            ALL_MODULES.find((m) => m.id === p.module)?.title ??
            p.module;
          return (
            <div
              className="pointer-events-none fixed z-50 rounded-md border border-ring bg-popover px-2 py-1 text-[11px] font-medium shadow-lg"
              style={{ left: zoneDrag.x + 14, top: zoneDrag.y + 14 }}
            >
              {title}{" "}
              <span className="tabular-nums text-muted-foreground">
                → C{zoneDrag.rect.col} · R{zoneDrag.rect.row} · {zoneDrag.rect.cols}×{zoneDrag.rect.rows}
              </span>
            </div>
          );
        })()}
    </div>
  );
}
