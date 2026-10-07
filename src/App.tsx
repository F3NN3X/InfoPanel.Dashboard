import { useEffect, useMemo, useState } from "react";
import { Wrench } from "lucide-react";
import { useSensors } from "@/hooks/useSensors";
import { Badge } from "@/components/ui/badge";
import { StudioView } from "@/components/studio/studio-view";
import { PlacementFrame } from "@/components/studio/placement-frame";
import { placementContent } from "@/components/studio/placement-content";
import { claimedKeys } from "@/modules";
import { applyTheme } from "@/lib/theme";
import {
  loadConfig,
  resolveProfile,
  saveConfig,
  type DashboardConfig,
} from "@/lib/layout";
import { cn } from "@/lib/utils";

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

  const profile = resolveProfile(config, windowSize.w, windowSize.h);
  const fill = profile.fit === "fill";

  // Persist the config (layout, profiles, theme) on every change.
  useEffect(() => saveConfig(config), [config]);

  // Apply the theme as CSS variables on :root.
  useEffect(
    () => applyTheme(config.theme, config.radius),
    [config.theme, config.radius]
  );

  // Track window size for automatic profile selection.
  useEffect(() => {
    const onResize = () =>
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keys claimed by registered modules; "cards" placements show the rest.
  const unclaimed = useMemo(() => {
    const claimed = claimedKeys(sensors);
    return Object.entries(sensors).filter(([key]) => !claimed.has(key));
  }, [sensors]);

  const enterStudio = () => {
    setStudio(true);
    window.history.replaceState(null, "", "?studio=1");
  };
  const exitStudio = () => {
    setStudio(false);
    window.history.replaceState(null, "", window.location.pathname);
  };

  // The dedicated studio replaces the whole view.
  if (studio) {
    return (
      <StudioView
        sensors={sensors}
        config={config}
        profile={profile}
        setConfig={setConfig}
        windowWidth={windowSize.w}
        windowHeight={windowSize.h}
        onExitStudio={exitStudio}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground",
        fill ? "h-screen overflow-hidden p-3 gap-3" : "min-h-screen p-6 gap-4"
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center justify-between", fill && "shrink-0")}>
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

      {/* Kiosk grid of placements (read-only) */}
      <div
        className={cn("grid gap-3", fill && "min-h-0 flex-1")}
        style={{
          gridTemplateColumns: `repeat(${profile.cols}, minmax(0, 1fr))`,
          gridAutoRows: fill ? "minmax(0, 1fr)" : undefined,
        }}
      >
        {profile.placements
          .filter((p) => p.visible)
          .map((p) => {
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
                studio={false}
                hasData={hasData}
                title={title}
              >
                {content}
              </PlacementFrame>
            );
          })}
      </div>

      {/* Floating entry to the studio */}
      <button
        onClick={enterStudio}
        className="fixed bottom-4 right-4 z-50 rounded-full border bg-popover p-2.5 text-muted-foreground shadow-lg opacity-50 transition-opacity hover:opacity-100"
        title="Open dashboard studio"
      >
        <Wrench className="h-4 w-4" />
      </button>
    </div>
  );
}
