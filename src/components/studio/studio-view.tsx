import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Check,
  Copy,
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
import { newIPProfile } from "@/lib/ip/ops";
import { modules, claimedKeys, type SensorMap } from "@/modules";
import {
  CARDS_ID,
  PANEL_ID,
  clonePlacement,
  defaultConfig,
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
  ...modules.map((m) => ({ id: m.id, title: m.title })),
  { id: CARDS_ID, title: "Other sensors" },
];

const DND_MIME = "text/infopanel-module";
const DND_MIME_PANEL = "text/infopanel-panel";
const GRID_GAP = 12; // must match the canvas grid's gap-3

/**
 * Approximate how many grid rows CSS auto-placement renders: explicit
 * rowStarts pin their row; auto items advance a left-to-right flow pointer
 * that wraps to the next row when the span no longer fits. Used to size
 * free-drag drop targets so scroll profiles can reach flow rows below the
 * last explicit row.
 */
function estimateFlowRows(placements: Placement[], cols: number): number {
  let flowRow = 1;
  let flowCol = 1;
  let maxRow = 1;
  for (const p of placements) {
    const span = Math.max(1, Math.min(cols, p.colSpan));
    if (p.rowStart !== undefined) {
      maxRow = Math.max(maxRow, p.rowStart + (p.rowSpan ?? 1) - 1);
      continue;
    }
    if (flowCol + span - 1 > cols) {
      flowRow += 1;
      flowCol = 1;
    }
    flowCol += span;
    maxRow = Math.max(maxRow, flowRow + (p.rowSpan ?? 1) - 1);
  }
  return maxRow;
}
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

interface StudioViewProps {
  sensors: SensorMap;
  config: DashboardConfig;
  /** The resolved (active) profile being edited. */
  profile: MonitorProfile;
  setConfig: Dispatch<SetStateAction<DashboardConfig>>;
  windowWidth: number;
  windowHeight: number;
  onExitStudio: () => void;
}

/**
 * The dedicated studio: left panel (profiles + module palette), a center
 * grid canvas with alignment guides and live module previews, and a right
 * panel (placement inspector, or the theme editor). A bottom bar holds
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
}: StudioViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [freeDrag, setFreeDrag] = useState<{
    id: string;
    col: number;
    row: number;
    x: number;
    y: number;
  } | null>(null);
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [scroll, setScroll] = useState({ left: 0, top: 0 });
  const [canvas, setCanvas] = useState({ w: 0, h: 0, viewW: 0, viewH: 0 });
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    updateProfile((p) => ({
      ...p,
      placements: [
        ...p.placements,
        {
          id: uid(module),
          module,
          colSpan: module === CARDS_ID ? p.cols : Math.min(6, p.cols),
          visible: true,
        },
      ],
    }));
  };

  /** Add a custom panel (group of widgets) from a preset. */
  const addPanelPreset = (preset: PanelPreset) => {
    updateProfile((p) => ({
      ...p,
      placements: [
        ...p.placements,
        {
          id: uid(PANEL_ID),
          module: PANEL_ID,
          colSpan: Math.min(preset.colSpan, p.cols),
          visible: true,
          panel: preset.make(),
        },
      ],
    }));
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

  /** Commit a free drag: pin the placement to the target cell. */
  const commitFreeDrag = (
    id: string,
    pos: { col: number; row: number } | null
  ) => {
    if (pos) {
      updateProfile((p) => ({
        ...p,
        placements: p.placements.map((x) =>
          x.id === id ? { ...x, colStart: pos.col, rowStart: pos.row } : x
        ),
      }));
    }
    setFreeDrag(null);
  };

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
        setConfig({ ...defaultConfig(), ...parsed } as DashboardConfig);
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
      ? (gridWidth - (profile.cols - 1) * GRID_GAP) / profile.cols
      : 0;
  const guides =
    colW > 0
      ? Array.from({ length: profile.cols - 1 }, (_, i) =>
          (i + 1) * (colW + GRID_GAP) - GRID_GAP / 2
        )
      : [];

  // Row geometry for the free-drag drop indicator. Fill mode: exact 1fr rows
  // over the profile height. Scroll mode: approximate with the rendered
  // height (auto rows are content-sized, so the indicator is a guide only).
  //
  // Includes the row being dragged to so the preview matches the layout
  // after the drop (in fill mode a new row adds an implicit 1fr track and
  // shrinks all of them).
  const totalRows = Math.max(
    estimateFlowRows(profile.placements, profile.cols),
    freeDrag?.row ?? 0
  );
  const rowH =
    profile.fit === "fill" && profile.height > 0
      ? Math.max(
          24,
          (profile.height - (totalRows - 1) * GRID_GAP) / totalRows
        )
      : gridEl
        ? Math.max(24, (gridEl.scrollHeight - (totalRows - 1) * GRID_GAP) / totalRows)
        : 24;
  const getGridRect = () => gridEl?.getBoundingClientRect() ?? null;

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
  const selectedSpan = selected
    ? Math.max(1, Math.min(profile.cols, selected.colSpan))
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
                    {config.kioskProfileId === p.id && (
                      <span
                        className="shrink-0 rounded bg-ring/25 px-1 text-[9px] font-semibold uppercase tracking-wide"
                        title="Opens in the borderless kiosk window"
                      >
                        kiosk
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {p.width}×{p.height} · {p.cols} cols
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

          {/* Free-canvas (InfoPanel 1:1) profiles — open in the free studio. */}
          <section className="space-y-2 p-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Free canvas (InfoPanel)
            </div>
            <div className="space-y-1">
              {(config.freeProfiles ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    setConfig((c) => ({ ...c, activeProfile: p.id }))
                  }
                  className={cn(
                    "w-full rounded-md border px-2 py-1.5 text-left text-xs",
                    p.id === config.activeProfile
                      ? "border-ring bg-accent"
                      : "border-border hover:border-ring/50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-foreground">
                      {p.name}
                    </span>
                    {config.kioskProfileId === p.id && (
                      <span
                        className="shrink-0 rounded bg-ring/25 px-1 text-[9px] font-semibold uppercase tracking-wide"
                        title="Opens in the borderless kiosk window"
                      >
                        kiosk
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {p.width}×{p.height} · {p.items.length} items
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 flex-1 text-xs"
                onClick={() => {
                  const p = newIPProfile(
                    `Free ${new Date().toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  );
                  setConfig((c) => ({
                    ...c,
                    freeProfiles: [...(c.freeProfiles ?? []), p],
                    activeProfile: p.id,
                  }));
                }}
              >
                <Plus className="h-3 w-3" /> New free
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-8 text-xs"
                onClick={() => {
                  const active = (config.freeProfiles ?? []).find(
                    (p) => p.id === config.activeProfile
                  );
                  if (!active) return;
                  setConfig((c) => ({
                    ...c,
                    freeProfiles: (c.freeProfiles ?? []).filter(
                      (p) => p.id !== active.id
                    ),
                    activeProfile: "auto",
                  }));
                }}
                disabled={(config.freeProfiles ?? []).length === 0}
                title="Delete active free profile"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </section>

          <section className="space-y-2 border-t p-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Kiosk window
            </div>
            <p className="text-xs text-muted-foreground/60">
              Which profile the borderless window (the bridge's "Show
              Dashboard") opens.
            </p>
            <select
              value={config.kioskProfileId ?? ""}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  kioskProfileId: e.target.value || undefined,
                }))
              }
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring"
            >
              <option value="">Not set</option>
              {config.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.width}×{p.height})
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-2 border-t p-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Modules
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
                  <span className="truncate text-foreground/85">{m.title}</span>
                  <span className="ml-2 flex shrink-0 items-center gap-1 text-muted-foreground">
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
              Drag a module onto the canvas, or click + to append it.
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
                <button
                  onClick={() => addPanelPreset(preset)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Add panel to canvas"
                >
                  <Plus className="h-3 w-3" />
                </button>
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
                onClick={() =>
                  updateProfile((p) => ({
                    ...p,
                    cols: Math.max(2, p.cols - 1),
                  }))
                }
                className="rounded-md border p-1 hover:bg-accent"
                title="Fewer columns"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center tabular-nums">
                {profile.cols}
              </span>
              <button
                onClick={() =>
                  updateProfile((p) => ({
                    ...p,
                    cols: Math.min(24, p.cols + 1),
                  }))
                }
                className="rounded-md border p-1 hover:bg-accent"
                title="More columns"
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
            <div className="ml-auto text-xs text-muted-foreground">
              {profile.placements.length} placements
            </div>
          </div>

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
                        // The canvas is exactly the profile's design size
                        // (the kiosk window renders the same profile 1:1).
                        ...(profile.width > 0 ? { width: profile.width } : {}),
                        ...(profile.fit === "fill" && profile.height > 0
                          ? {
                              // Definite height (like the kiosk's flex-1 grid) so the
                              // 1fr auto rows distribute uniformly. With minHeight
                              // the rows are content-sized and the drop math below
                              // (uniform rowH) drifts from the rendered layout.
                              gridAutoRows: "minmax(0, 1fr)",
                              height: profile.height,
                            }
                          : {}),
                      }}
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

                      {/* Free-drag drop indicator */}
                      {freeDrag &&
                        (() => {
                          const p = profile.placements.find(
                            (x) => x.id === freeDrag.id
                          );
                          if (!p || colW <= 0) return null;
                          const span = Math.max(
                            1,
                            Math.min(profile.cols, p.colSpan)
                          );
                          const rowSpan = p.rowSpan ?? 1;
                          return (
                            <div
                              className="pointer-events-none absolute z-30 rounded-lg border-2 border-ring bg-ring/10"
                              style={{
                                left: (freeDrag.col - 1) * (colW + GRID_GAP),
                                top: (freeDrag.row - 1) * (rowH + GRID_GAP),
                                width: span * colW + (span - 1) * GRID_GAP,
                                height: rowSpan * rowH + (rowSpan - 1) * GRID_GAP,
                              }}
                            >
                              <span className="absolute left-1.5 top-0.5 text-[10px] font-semibold tabular-nums text-ring">
                                C{freeDrag.col} · R{freeDrag.row}
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
                            getGridRect={getGridRect}
                            ghost={freeDrag?.id === p.id}
                            onFreeDrag={(id, pos, pointer) =>
                              setFreeDrag({ id, ...pos, ...pointer })
                            }
                            onFreeDragEnd={commitFreeDrag}
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
                          Drag a module here from the left panel
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
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Width</span>
                  <span className="tabular-nums">
                    {selectedSpan}/{profile.cols}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={profile.cols}
                  value={selectedSpan}
                  onChange={(e) =>
                    setSpan(selected.id, parseInt(e.target.value, 10))
                  }
                  className="w-full accent-ring"
                />
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Height</span>
                  <span className="tabular-nums">
                    {selected.rowSpan ?? 1} row
                    {(selected.rowSpan ?? 1) === 2 ? "s" : ""}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={selected.rowSpan ?? 1}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    updatePlacement(selected.id, (p) => ({
                      ...p,
                      rowSpan: n > 1 ? n : undefined,
                    }));
                  }}
                  className="w-full accent-ring"
                />
              </div>

              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  Row start
                </div>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={selected.rowStart ?? ""}
                  placeholder="auto"
                  onChange={(e) =>
                    updatePlacement(selected.id, (p) => ({
                      ...p,
                      rowStart:
                        e.target.value === ""
                          ? undefined
                          : Math.max(
                              1,
                              Math.min(24, parseInt(e.target.value, 10) || 1)
                            ),
                    }))
                  }
                  className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
                />
              </div>

              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  Column start
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={profile.cols}
                    value={selected.colStart ?? ""}
                    placeholder="auto"
                    onChange={(e) =>
                      updatePlacement(selected.id, (p) => ({
                        ...p,
                        colStart:
                          e.target.value === ""
                            ? undefined
                            : Math.max(
                                1,
                                Math.min(
                                  profile.cols,
                                  parseInt(e.target.value, 10) || 1
                                )
                              ),
                      }))
                    }
                    className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
                  />
                  <button
                    className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    title="Back to auto flow (clears column and row start)"
                    onClick={() =>
                      updatePlacement(selected.id, (p) => ({
                        ...p,
                        colStart: undefined,
                        rowStart: undefined,
                      }))
                    }
                  >
                    Auto position
                  </button>
                </div>
              </div>

              {selected.panel ? (
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
                />
              )}
                </>
              )}

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

      {/* Free-drag ghost: follows the pointer (outside the zoomed canvas)
          so the widget being dragged is always visibly tracked. */}
      {freeDrag &&
        (() => {
          const p = profile.placements.find((x) => x.id === freeDrag.id);
          if (!p) return null;
          const title =
            p.panel?.title ??
            ALL_MODULES.find((m) => m.id === p.module)?.title ??
            p.module;
          return (
            <div
              className="pointer-events-none fixed z-50 rounded-md border border-ring bg-popover px-2 py-1 text-[11px] font-medium shadow-lg"
              style={{ left: freeDrag.x + 14, top: freeDrag.y + 14 }}
            >
              {title}{" "}
              <span className="tabular-nums text-muted-foreground">
                → C{freeDrag.col} · R{freeDrag.row}
              </span>
            </div>
          );
        })()}
    </div>
  );
}
