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
  Copy,
  Download,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  Minus,
  Monitor,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlacementFrame } from "./placement-frame";
import { placementContent } from "./placement-content";
import { ThemePanel } from "./theme-panel";
import { modules, claimedKeys, type SensorMap } from "@/modules";
import {
  CARDS_ID,
  clonePlacement,
  defaultConfig,
  newProfile,
  uid,
  type DashboardConfig,
  type MonitorProfile,
} from "@/lib/layout";
import { hslToHex, THEME_PRESETS, type ThemeTokens } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ALL_MODULES = [
  ...modules.map((m) => ({ id: m.id, title: m.title })),
  { id: CARDS_ID, title: "Other sensors" },
];

const DND_MIME = "text/infopanel-module";
const GRID_GAP = 12; // must match the canvas grid's gap-3

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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const setSpan = (id: string, span: number) =>
    updateProfile((p) => ({
      ...p,
      placements: p.placements.map((x) =>
        x.id === id ? { ...x, colSpan: span } : x
      ),
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

  /** Live reorder while dragging over a sibling frame. */
  const movePlacement = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setConfig((c) => ({
      ...c,
      profiles: c.profiles.map((prof) => {
        if (prof.id !== profile.id) return prof;
        const from = prof.placements.findIndex((p) => p.id === draggingId);
        const to = prof.placements.findIndex((p) => p.id === targetId);
        if (from === -1 || to === -1 || to === from || to === from + 1)
          return prof;
        const next = [...prof.placements];
        const [item] = next.splice(from, 1);
        next.splice(to > from ? to - 1 : to, 0, item);
        return { ...prof, placements: next };
      }),
    }));
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
    }
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

  const selectedTitle = selected
    ? ALL_MODULES.find((m) => m.id === selected.module)?.title ??
      selected.module
    : "";
  const selectedMod = selected ? modules.find((m) => m.id === selected.module) : undefined;
  const selectedSensors = selectedMod
    ? Object.keys(sensors).filter((k) => selectedMod.matches(k)).length
    : 0;
  const selectedSpan = selected
    ? Math.max(1, Math.min(profile.cols, selected.colSpan))
    : 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="flex min-h-0 flex-1">
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
                  <div className="font-medium text-foreground">{p.name}</div>
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
        </aside>

        {/* ================= CENTER: toolbar + grid canvas ================= */}
        <main className="flex min-w-0 flex-1 flex-col">
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
            <select
              value={profile.fit}
              onChange={(e) =>
                updateProfile((p) => ({
                  ...p,
                  fit: e.target.value === "fill" ? "fill" : "scroll",
                }))
              }
              className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
            >
              <option value="scroll">Scroll</option>
              <option value="fill">Fill viewport</option>
            </select>
            <div className="ml-auto text-xs text-muted-foreground">
              {profile.placements.length} placements
            </div>
          </div>

          <div
            className="relative flex-1 overflow-auto p-4"
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(DND_MIME)) e.preventDefault();
            }}
            onDrop={onCanvasDrop}
          >
            <div
              ref={setGridEl}
              className="relative grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${profile.cols}, minmax(0, 1fr))`,
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedId(null);
              }}
            >
              {/* Column alignment guides */}
              {guides.map((x, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute bottom-0 top-0 w-px bg-ring/15"
                  style={{ left: x }}
                />
              ))}

              {profile.placements.map((p) => {
                const { content, hasData, title } = placementContent(
                  p,
                  sensors,
                  unclaimed
                );
                return (
                  <PlacementFrame
                    key={p.id}
                    placement={p}
                    profile={profile}
                    studio
                    hasData={hasData}
                    title={title}
                    gridWidth={gridWidth}
                    selected={selectedId === p.id}
                    onSelect={() => setSelectedId(p.id)}
                    onDragStart={setDraggingId}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={movePlacement}
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
                {selected.module !== CARDS_ID && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {selectedSensors} live sensor{selectedSensors === 1 ? "" : "s"}
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
    </div>
  );
}
