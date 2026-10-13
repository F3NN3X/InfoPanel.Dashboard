import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Wrench } from "lucide-react";
import { useSensorsConnected, useSensorsTimestamp } from "@/hooks/useSensors";
import { Badge } from "@/components/ui/badge";
import { PlacementFrame } from "@/components/studio/placement-frame";
import { LivePlacement } from "@/components/studio/placement-content";
import { PageBackground } from "@/components/page-background";
import { resolveBackground } from "@/lib/appearance";
import { appearanceOf } from "@/lib/style-resolve";
import { applyTheme, resolveTheme } from "@/lib/theme";
import { fontStack, formatClock, resolveGeneral } from "@/lib/general";
import { profileGap, profilePadding } from "@/lib/profile-grid";
import { GeneralProvider, useGeneral } from "@/hooks/use-general";
import { setApiBase } from "@/lib/data-api";
import {
  CONFIG_EVENTS_URL,
  fetchConfig,
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

/** ?profile=<id> pins a profile (kiosk shortcuts, testing). */
function withPinnedProfile(config: DashboardConfig): DashboardConfig {
  const pinned = new URLSearchParams(window.location.search).get("profile");
  return pinned && config.profiles.some((p) => p.id === pinned)
    ? { ...config, activeProfile: pinned }
    : config;
}

// The studio is an editing tool; kiosk pages never download it.
const StudioView = lazy(() =>
  import("@/components/studio/studio-view").then((m) => ({ default: m.StudioView }))
);

export default function App() {

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
    return withPinnedProfile(loaded);
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
  const background = resolveBackground(config, profile);
  const appearance = appearanceOf(config, profile);
  const general = useMemo(() => resolveGeneral({ general: config.general }), [config.general]);

  // Persist the config (layout, profiles, theme) on every change.
  useEffect(() => saveConfig(config), [config]);

  // Editing pages start from the server's copy: until it has been read, this
  // page's own storage (or the defaults, in a fresh browser) must not be
  // pushed over it. If the server can't be read, only Save pushes.
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (kiosk) return;
    let alive = true;
    fetchConfig()
      .then((server) => {
        if (!alive) return;
        if (server) {
          const merged = withPinnedProfile(mergeConfig(server));
          saveConfig(merged);
          setConfig(merged);
        }
        setSynced(true);
      })
      .catch(() => {
        // Server offline — keep the local copy and don't auto-push.
      });
    return () => {
      alive = false;
    };
  }, [kiosk]);

  // Push the full config (profiles with placements, theme) to the server.
  // Kiosk pages (InfoPanel's WebView2) keep their own isolated storage, so
  // this shared copy is how they reflect the studio's latest state.
  // `pushPending` is true from an edit until its push lands (the studio's
  // Save dot); a newer edit supersedes an older push still in flight.
  const [pushPending, setPushPending] = useState(false);
  // The newest config, to tell whether a finished push is still the latest state.
  const latestConfig = useRef(config);
  latestConfig.current = config;
  // Before the server copy is read nothing is pushed, but an edit is still unpushed.
  const firstConfig = useRef(config);
  useEffect(() => {
    if (!kiosk && !synced && config !== firstConfig.current) setPushPending(true);
  }, [config, kiosk, synced]);
  useEffect(() => {
    if (kiosk || !synced) return; // kiosk pages only read; don't push from them
    let superseded = false;
    setPushPending(true);
    const t = window.setTimeout(() => {
      pushConfig(config)
        .then(() => !superseded && setPushPending(false))
        .catch(() => {
          // Server offline — kiosk pages keep their last copy.
        });
    }, 400);
    return () => {
      superseded = true;
      window.clearTimeout(t);
    };
  }, [config, kiosk, synced]);

  // Kiosk: pull the shared config on load and again whenever the server
  // reports a newer version (a studio edit or Save), so the display updates
  // without a reload. The ?profile= pin still decides which profile shows.
  useEffect(() => {
    if (!kiosk) return;
    let alive = true;
    const pull = async () => {
      try {
        const parsed = await fetchConfig();
        if (!alive || !parsed) return; // nothing saved yet — the local copy stands
        const merged = withPinnedProfile(mergeConfig(parsed));
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

  // Apply the theme as CSS variables on :root: the shown profile's (its
  // own colours over the dashboard's). The studio's chrome keeps the
  // dashboard theme; its canvas scopes the edited profile's.
  const shownTheme = studio ? undefined : profile;
  useEffect(() => {
    const { tokens, radius } = resolveTheme(
      { theme: config.theme, radius: config.radius },
      shownTheme && { theme: shownTheme.theme, radius: shownTheme.radius }
    );
    applyTheme(tokens, radius);
  }, [config.theme, config.radius, shownTheme?.theme, shownTheme?.radius]);

  // Track window size for automatic profile selection.
  useEffect(() => {
    const onResize = () =>
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
  // Resolves to whether the server took it, so the button only says "Saved" when it did.
  const handleStudioSave = useCallback((cfg: DashboardConfig) => {
    saveConfig(cfg); // local copy first (offline fallback)
    return pushConfig(cfg)
      .then(() => {
        // An edit made since the click is still unpushed (its debounced push clears the dot).
        if (latestConfig.current === cfg) setPushPending(false);
        return true;
      })
      .catch(() => false); // Server offline — kiosk pages keep their last copy; the dot stays.
  }, []);

  // The dedicated studio replaces the whole view.
  if (studio) {
    return (
      <GeneralProvider value={general}>
        <Suspense fallback={null}>
          <StudioView
            config={config}
            profile={profile}
            setConfig={setConfig}
            windowWidth={windowSize.w}
            windowHeight={windowSize.h}
            onExitStudio={exitStudio}
            onSave={handleStudioSave}
            pushPending={pushPending}
          />
        </Suspense>
      </GeneralProvider>
    );
  }

  return (
    <GeneralProvider value={general}>
      <div
        className={cn(
          // A page background replaces the theme's page color (it sits
          // behind the grid, under this element's own paint).
          "flex flex-col text-foreground",
          !background && "bg-background",
          kiosk && "kiosk",
          kiosk && general.hideCursor && "kiosk-hide-cursor",
          fill
            ? kiosk
              ? "h-screen overflow-hidden"
              : "h-screen overflow-hidden gap-3"
            : "min-h-screen gap-4"
        )}
        style={{ padding: profilePadding(profile, kiosk), fontFamily: fontStack(general.font) }}
      >
        {background && <PageBackground background={background} className="fixed inset-0 -z-10" />}

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
            <ConnectionStatus />
          </div>
        )}

        {/* Kiosk grid of zones (read-only) */}
        <div
          className={cn("grid", fill && "min-h-0 flex-1")}
          style={{
            gap: profileGap(profile),
            gridTemplateColumns: `repeat(${profile.cols}, minmax(0, 1fr))`,
            // Explicit uniform rows, mirroring the studio canvas.
            gridTemplateRows: fill
              ? `repeat(${profile.rows}, minmax(0, 1fr))`
              : `repeat(${profile.rows}, ${SCROLL_ROW_H}px)`,
          }}
        >
          {profile.placements
            .filter((p) => p.visible)
            .map((p) => (
              <LivePlacement key={p.id} placement={p} appearance={appearance}>
                {({ content, hasData, title, idle, scope }) => (
                  <PlacementFrame
                    placement={p}
                    profile={profile}
                    studio={false}
                    hasData={hasData && !idle}
                    title={title}
                    scope={scope}
                  >
                    {content}
                  </PlacementFrame>
                )}
              </LivePlacement>
            ))}
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
    </GeneralProvider>
  );
}

/** Header badge: stream status and the time of the last sensor message. */
function ConnectionStatus() {
  const connected = useSensorsConnected();
  const timestamp = useSensorsTimestamp();
  const general = useGeneral();
  return (
    <div className="flex items-center gap-3">
      <Badge variant={connected ? "default" : "destructive"} className="gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`}
        />
        {connected ? "Connected" : "Disconnected"}
      </Badge>
      {timestamp > 0 && (
        <span className="text-xs text-muted-foreground">
          {formatClock(new Date(timestamp), { ...general, showSeconds: true }).time}
        </span>
      )}
    </div>
  );
}
