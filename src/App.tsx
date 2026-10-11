import { useCallback, useEffect, useMemo, useState } from "react";
import { Wrench } from "lucide-react";
import { useSensors } from "@/hooks/useSensors";
import { Badge } from "@/components/ui/badge";
import { StudioView } from "@/components/studio/studio-view";
import { PlacementFrame } from "@/components/studio/placement-frame";
import { placementContent } from "@/components/studio/placement-content";
import { claimedKeys } from "@/modules";
import { applyTheme } from "@/lib/theme";
import { setApiBase } from "@/lib/data-api";
import {
  CONFIG_EVENTS_URL,
  CONFIG_URL,
  pushConfig,
} from "@/lib/dashboard-server";
import {
  loadConfig,
  mergeConfig,
  resolveProfile,
  saveConfig,
  SCROLL_ROW_H,
  type DashboardConfig,
} from "@/lib/layout";
import { cn } from "@/lib/utils";

export default function App() {
  const { data, connected } = useSensors();
  const sensors = data?.sensors ?? {};

  // Kiosk mode (?kiosk=1, e.g. an InfoPanel web page profile): display
  // only — no header, no studio chrome, and the layout comes from the
  // server's shared config instead of this page's own storage.
  const kiosk = useMemo(
    () => new URLSearchParams(window.location.search).get("kiosk") === "1",
    []
  );

  const [config, setConfig] = useState<DashboardConfig>(() => {
    const loaded = loadConfig();
    setApiBase(loaded.dataApiUrl); // before the first sensor connection
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

  // Push the full config (profiles with placements, theme) to the server.
  // Kiosk pages (InfoPanel's WebView2) keep their own isolated storage, so
  // this shared copy is how they reflect the studio's latest state.
  useEffect(() => {
    if (kiosk) return; // kiosk pages only read; don't push from them
    const t = window.setTimeout(() => {
      pushConfig(config).catch(() => {
        // Server offline — kiosk pages keep their last copy.
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [config, kiosk]);

  // Kiosk: pull the shared config on load and again whenever the server
  // reports a newer version (a studio edit or Save), so the display updates
  // without a reload. The ?profile= pin still decides which profile shows.
  useEffect(() => {
    if (!kiosk) return;
    let alive = true;
    const pull = async () => {
      try {
        const res = await fetch(CONFIG_URL, { cache: "no-store" });
        if (!res.ok) return; // nothing saved yet — the local copy stands
        const parsed = (await res.json()) as Partial<DashboardConfig>;
        if (!alive || !parsed || !Array.isArray(parsed.profiles)) return;
        const merged = mergeConfig(parsed);
        const pinned = new URLSearchParams(window.location.search).get(
          "profile"
        );
        if (pinned && merged.profiles.some((p) => p.id === pinned))
          merged.activeProfile = pinned;
        saveConfig(merged); // also seed the local copy (offline fallback)
        setConfig(merged);
      } catch {
        // Server offline — the local fallback (loadConfig) stands.
      }
    };
    // The stream sends the current version on connect (and on every
    // reconnect), then one event per save — each one triggers a pull.
    const events = new EventSource(CONFIG_EVENTS_URL);
    events.onmessage = () => void pull();
    return () => {
      alive = false;
      events.close();
    };
  }, [kiosk]);

  // Follow the Data API URL setting: the sensor stream and the Wave Link
  // client reconnect to the new base.
  useEffect(() => setApiBase(config.dataApiUrl), [config.dataApiUrl]);

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

  // Studio "Save" button: flush the config to the server immediately (the
  // normal sync is debounced 400ms); open kiosk pages pick it up from the
  // config event stream.
  const handleStudioSave = useCallback((cfg: DashboardConfig) => {
    saveConfig(cfg); // local copy first (offline fallback)
    pushConfig(cfg).catch(() => {
      // Server offline — kiosk pages keep their last copy.
    });
  }, []);

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
        onSave={handleStudioSave}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground",
        kiosk && "kiosk",
        fill
          ? kiosk
            ? "h-screen overflow-hidden"
            : "h-screen overflow-hidden p-3 gap-3"
          : "min-h-screen p-6 gap-4"
      )}
    >
      {/* Header (hidden in kiosk mode) */}
      {!kiosk && (
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
                Live data from the InfoPanel Data API
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
      )}

      {/* Kiosk grid of zones (read-only) */}
      <div
        className={cn("grid gap-3", fill && "min-h-0 flex-1")}
        style={{
          gridTemplateColumns: `repeat(${profile.cols}, minmax(0, 1fr))`,
          // Explicit uniform rows, mirroring the studio canvas.
          gridTemplateRows: fill
            ? `repeat(${profile.rows}, minmax(0, 1fr))`
            : `repeat(${profile.rows}, ${SCROLL_ROW_H}px)`,
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

      {/* Floating entry to the studio (not on display-only kiosk pages) */}
      {!kiosk && (
        <button
          onClick={enterStudio}
          className="fixed bottom-4 right-4 z-50 rounded-full border bg-popover p-2.5 text-muted-foreground shadow-lg opacity-50 transition-opacity hover:opacity-100"
          title="Open dashboard studio"
        >
          <Wrench className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
