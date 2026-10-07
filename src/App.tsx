import { useEffect, useMemo, useState } from "react";
import { Wrench, X } from "lucide-react";
import { API_BASE, useSensors } from "@/hooks/useSensors";
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

  // Kiosk mode: the borderless InfoPanel window opens with ?kiosk=1 —
  // no header, no studio chrome; Escape (or the X) closes the window.
  const kiosk = useMemo(
    () => new URLSearchParams(window.location.search).get("kiosk") === "1",
    []
  );

  const closeKiosk = () => {
    // The C# kiosk window listens for this message and destroys itself;
    // window.close() covers the plain-browser case.
    try {
      (window as any).chrome?.webview?.postMessage("close");
    } catch {
      // Not running inside the WebView2 kiosk window.
    }
    window.close();
  };

  useEffect(() => {
    if (!kiosk) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeKiosk();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kiosk]);

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

  // Keep the bridge's profile list in sync (the borderless kiosk window
  // sizes itself to the synced profile's design dimensions).
  useEffect(() => {
    if (kiosk) return; // the kiosk window only reads; don't push from it
    const t = window.setTimeout(() => {
      fetch(`${API_BASE}/api/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          config.profiles.map((p) => ({
            id: p.id,
            name: p.name,
            width: p.width,
            height: p.height,
          }))
        ),
      }).catch(() => {
        // Bridge offline — the profile list simply stays stale.
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [config.profiles, kiosk]);

  // Sync the studio's "kiosk profile" choice to the bridge, so the borderless
  // window (Show Dashboard) opens that profile. The bridge pins it in
  // kiosk.json (preserving the dragged x/y position).
  useEffect(() => {
    if (kiosk) return; // the kiosk window only reads; don't push from it
    if (!config.kioskProfileId) return;
    const t = window.setTimeout(() => {
      fetch(`${API_BASE}/api/kiosk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: config.kioskProfileId }),
      }).catch(() => {
        // Bridge offline — the pin simply stays stale.
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [config.kioskProfileId, kiosk]);

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
        kiosk && "kiosk",
        fill ? "h-screen overflow-hidden p-3 gap-3" : "min-h-screen p-6 gap-4"
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
      )}

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

      {/* Kiosk: a thin drag strip along the top edge moves the borderless
          window (the C# side follows the cursor and persists the position) */}
      {kiosk && <KioskDragStrip />}

      {/* Floating entry to the studio — a close button in kiosk mode */}
      {kiosk ? (
        <button
          onClick={closeKiosk}
          className="fixed bottom-4 right-4 z-50 rounded-full border bg-popover p-2.5 text-muted-foreground shadow-lg opacity-50 transition-opacity hover:opacity-100"
          title="Close dashboard (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
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

/**
 * Kiosk mode only: a thin, quiet grip across the very top edge of the
 * window. Press and drag it to move the borderless kiosk window — the C#
 * side follows the cursor via Win32 (see KioskWindow), so the window can
 * be pulled onto an external monitor. In a plain browser it does nothing.
 */
function KioskDragStrip() {
  const [dragging, setDragging] = useState(false);

  const post = (phase: string) => {
    try {
      // Post the object itself (not a pre-stringified string): WebView2's
      // WebMessageAsJson then carries a single JSON object, which the C#
      // side parses directly. A pre-stringified value arrives double-encoded
      // and silently fails to parse.
      (window as any).chrome?.webview?.postMessage({ type: "drag", phase });
    } catch {
      // Not running inside the WebView2 kiosk window.
    }
  };

  return (
    <div
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        post("start");
        setDragging(true);
      }}
      onPointerMove={() => {
        // The C# side reads the cursor position itself, so a plain "move"
        // on every pointer event is enough.
        if (dragging) post("move");
      }}
      onPointerUp={() => {
        post("end");
        setDragging(false);
      }}
      onPointerCancel={() => {
        post("end");
        setDragging(false);
      }}
      title="Drag to move the window"
      className={cn(
        "group fixed inset-x-0 top-0 z-50 flex h-6 cursor-grab touch-none select-none items-center gap-2 border-b border-foreground/10 px-3",
        dragging
          ? "cursor-grabbing bg-foreground/15"
          : "bg-background/95 hover:bg-background"
      )}
    >
      <div className="flex items-center gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-foreground/80" />
        ))}
      </div>
      <span className="pointer-events-none text-[10px] uppercase tracking-widest text-muted-foreground">
        drag to move
      </span>
    </div>
  );
}
