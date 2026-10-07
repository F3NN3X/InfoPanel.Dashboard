import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSensors } from "@/hooks/useSensors";
import { Badge } from "@/components/ui/badge";
import { GenericCard } from "@/modules/fallback";
import { StudioToolbar } from "@/components/studio/studio-toolbar";
import { PlacementFrame } from "@/components/studio/placement-frame";
import { modules, claimedKeys } from "@/modules";
import { applyTheme } from "@/lib/theme";
import {
  CARDS_ID,
  loadConfig,
  resolveProfile,
  saveConfig,
  type DashboardConfig,
  type Placement,
} from "@/lib/layout";
import { cn } from "@/lib/utils";

const moduleById = new Map(modules.map((m) => [m.id, m]));

export default function App() {
  const { data, connected } = useSensors();
  const sensors = data?.sensors ?? {};

  const [config, setConfig] = useState<DashboardConfig>(() => {
    const loaded = loadConfig();
    // ?profile=<id> pins a profile (kiosk shortcuts, testing).
    const pinned = new URLSearchParams(window.location.search).get("profile");
    if (pinned && loaded.profiles.some((p) => p.id === pinned)) {
      return { ...loaded, activeProfile: pinned };
    }
    return loaded;
  });
  const [studio, setStudio] = useState(
    () => new URLSearchParams(window.location.search).has("studio")
  );
  const [windowSize, setWindowSize] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  const [gridRef, setGridRef] = useState<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const profile = resolveProfile(config, windowSize.w, windowSize.h);
  const fill = profile.fit === "fill";

  // Persist the config (layout, profiles, theme) on every change.
  useEffect(() => saveConfig(config), [config]);

  // Apply the theme as CSS variables on :root.
  useEffect(() => applyTheme(config.theme, config.radius), [config.theme, config.radius]);

  // Track window size for automatic profile selection.
  useEffect(() => {
    const onResize = () =>
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Measure the grid for pointer-based column resize.
  useLayoutEffect(() => {
    if (gridRef) setGridWidth(gridRef.clientWidth);
  }, [gridRef, profile.id, profile.cols]);
  useEffect(() => {
    const onResize = () => {
      if (gridRef) setGridWidth(gridRef.clientWidth);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [gridRef]);

  // Keys claimed by registered modules; "cards" placements show the rest.
  const unclaimed = useMemo(() => {
    const claimed = claimedKeys(sensors);
    return Object.entries(sensors).filter(([key]) => !claimed.has(key));
  }, [sensors]);

  const updatePlacement = (
    id: string,
    fn: (p: Placement) => Placement
  ) => {
    setConfig((c) => ({
      ...c,
      profiles: c.profiles.map((prof) =>
        prof.id === profile.id
          ? {
              ...prof,
              placements: prof.placements.map((p) =>
                p.id === id ? fn(p) : p
              ),
            }
          : prof
      ),
    }));
  };

  const removePlacement = (id: string) => {
    setConfig((c) => ({
      ...c,
      profiles: c.profiles.map((prof) =>
        prof.id === profile.id
          ? { ...prof, placements: prof.placements.filter((p) => p.id !== id) }
          : prof
      ),
    }));
  };

  /** Live reorder: move the dragged placement to the target's position. */
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

  const enterStudio = () => {
    setStudio(true);
    window.history.replaceState(null, "", "?studio=1");
  };
  const exitStudio = () => {
    setStudio(false);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const renderPlacement = (p: Placement): { content: ReactNode; hasData: boolean; title: string } => {
    if (p.module === CARDS_ID) {
      if (unclaimed.length === 0)
        return { content: null, hasData: false, title: "Other sensors" };
      const subCols = p.colSpan >= 8 ? 4 : p.colSpan >= 4 ? 3 : 2;
      return {
        hasData: true,
        title: "Other sensors",
        content: (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${subCols}, minmax(0, 1fr))` }}
          >
            {unclaimed.map(([key, sensor]) => (
              <GenericCard key={key} sensorKey={key} sensor={sensor} />
            ))}
          </div>
        ),
      };
    }
    const mod = moduleById.get(p.module);
    if (!mod) return { content: null, hasData: false, title: p.module };
    const content = mod.render(sensors);
    return {
      content: content ?? null,
      hasData: content != null,
      title: mod.title,
    };
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground",
        fill ? "h-screen overflow-hidden p-3 gap-3" : "min-h-screen p-6 gap-4"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between",
          fill && "shrink-0"
        )}
      >
        <div className="flex items-baseline gap-3">
          <h1
            className={cn(
              "font-semibold tracking-tight",
              fill ? "text-base" : "text-2xl"
            )}
          >
            System Dashboard
          </h1>
          {!fill && (
            <p className="text-sm text-muted-foreground">
              Live data from InfoPanel DataBridge
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={connected ? "default" : "destructive"}
            className="gap-1.5"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            {connected ? "Connected" : "Disconnected"}
          </Badge>
          {data && (
            <span className="text-xs text-muted-foreground">
              {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Grid of placements */}
      <div
        ref={setGridRef}
        className={cn("grid gap-3", fill && "min-h-0 flex-1")}
        style={{
          gridTemplateColumns: `repeat(${profile.cols}, minmax(0, 1fr))`,
          gridAutoRows: fill ? "minmax(0, 1fr)" : undefined,
        }}
      >
        {profile.placements
          .filter((p) => p.visible)
          .map((p) => {
            const { content, hasData, title } = renderPlacement(p);
            return (
              <PlacementFrame
                key={p.id}
                placement={p}
                profile={profile}
                studio={studio}
                hasData={hasData}
                title={title}
                gridWidth={gridWidth}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={movePlacement}
                onSpan={(id, span) =>
                  updatePlacement(id, (pl) => ({ ...pl, colSpan: span }))
                }
                onToggle={(id) =>
                  updatePlacement(id, (pl) => ({ ...pl, visible: !pl.visible }))
                }
                onRemove={removePlacement}
              >
                {content}
              </PlacementFrame>
            );
          })}
      </div>

      <StudioToolbar
        config={config}
        profile={profile}
        studio={studio}
        windowWidth={windowSize.w}
        windowHeight={windowSize.h}
        setConfig={setConfig}
        onEnterStudio={enterStudio}
        onExitStudio={exitStudio}
      />
    </div>
  );
}
