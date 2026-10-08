import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Wrench, X } from "lucide-react";
import { API_BASE, useSensors } from "@/hooks/useSensors";
import { Badge } from "@/components/ui/badge";
import { IPCanvas } from "@/components/ip/ip-canvas";
import { StudioView } from "@/components/studio/studio-view";
import { PlacementFrame } from "@/components/studio/placement-frame";
import { placementContent } from "@/components/studio/placement-content";
import { claimedKeys } from "@/modules";
import { applyTheme } from "@/lib/theme";
import {
  loadConfig,
  mergeConfig,
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
    // ?profile=<id> pins a profile (kiosk shortcuts, testing) — grid or
    // free-canvas profiles both pin by id.
    const pinned = new URLSearchParams(window.location.search).get("profile");
    if (
      pinned &&
      (loaded.profiles.some((p) => p.id === pinned) ||
        (loaded.freeProfiles ?? []).some((p) => p.id === pinned))
    ) {
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

  // A free-canvas (InfoPanel 1:1) profile pinned by id renders edge-to-
  // edge via the IP canvas — no grid, no scroll.
  const freeProfile = (config.freeProfiles ?? []).find(
    (p) => p.id === config.activeProfile
  );

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
        body: JSON.stringify([
          ...config.profiles.map((p) => ({
            id: p.id,
            name: p.name,
            width: p.width,
            height: p.height,
          })),
          // Free-canvas profiles too — the kiosk window sizes itself to
          // the pinned profile's design dimensions.
          ...(config.freeProfiles ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            width: p.width,
            height: p.height,
          })),
        ]),
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

  // Push the full config (profiles with placements, theme, kiosk pin) to the
  // bridge. The kiosk window's localStorage is isolated and its pages are
  // read-only, so this synced copy is the only way the borderless display
  // reflects the studio's latest state.
  useEffect(() => {
    if (kiosk) return; // the kiosk window only reads; don't push from it
    const t = window.setTimeout(() => {
      fetch(`${API_BASE}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      }).catch(() => {
        // Bridge offline — the kiosk keeps its last synced copy.
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [config, kiosk]);

  // Kiosk: pull the bridge-synced config — the studio's browser tab is the
  // source of truth, not this isolated window's localStorage. The
  // ?profile= pin (from kiosk.json) still decides which profile shows.
  useEffect(() => {
    if (!kiosk) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/config`, {
          cache: "no-store",
        });
        if (!res.ok) return; // nothing synced yet — the local copy stands
        const parsed = (await res.json()) as Partial<DashboardConfig>;
        if (!alive || !parsed || !Array.isArray(parsed.profiles)) return;
        const merged = mergeConfig(parsed);
        const pinned = new URLSearchParams(window.location.search).get(
          "profile"
        );
        if (
          pinned &&
          (merged.profiles.some((p) => p.id === pinned) ||
            (merged.freeProfiles ?? []).some((p) => p.id === pinned))
        )
          merged.activeProfile = pinned;
        saveConfig(merged); // also seed the local copy (offline fallback)
        setConfig(merged);
      } catch {
        // Bridge offline — the local fallback (loadConfig) stands.
      }
    })();
    return () => {
      alive = false;
    };
  }, [kiosk]);

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

  // The dedicated studio replaces the whole view. ONE studio handles both
  // profile kinds: free-canvas (InfoPanel 1:1) profiles get the absolute
  // editor, grid profiles get the grid editor.
  if (studio) {
    return (
      <StudioView
        sensors={sensors}
        config={config}
        profile={freeProfile ?? profile}
        setConfig={setConfig}
        windowWidth={windowSize.w}
        windowHeight={windowSize.h}
        onExitStudio={exitStudio}
      />
    );
  }

  // Free-canvas profile: render the 1:1 InfoPanel item tree edge-to-edge.
  // Kiosk: 1:1 (the borderless window is sized to the profile). Preview:
  // scaled to fit the window.
  if (freeProfile) {
    const scale = kiosk
      ? 1
      : Math.min(
          1,
          windowSize.w / freeProfile.width,
          windowSize.h / freeProfile.height
        );
    return (
      <div
        className={cn(
          "flex flex-col bg-background text-foreground",
          kiosk ? "h-screen overflow-hidden p-0" : "min-h-screen p-6 gap-4"
        )}
      >
        {!kiosk && (
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {freeProfile.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                free-canvas profile · {freeProfile.width}×{freeProfile.height}
              </p>
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
            </div>
          </div>
        )}
        <div className={kiosk ? "relative" : "flex justify-center"}>
          <IPCanvas
            profile={freeProfile}
            sensors={sensors}
            assetBase={`/assets/ip/${freeProfile.assets ?? freeProfile.id}`}
            scale={scale}
          />
        </div>

        {kiosk && <KioskDragStrip />}
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
 * Kiosk mode only: a thin grip across the very top edge of the window.
 *
 * It is *auto-hidden*: at rest the strip is a transparent hit-target (the
 * dashboard shows through, so the bar never cuts off the top row) and the
 * grip fades in only when the pointer is near the top edge, staying solid
 * while dragging. Press and drag it to move the borderless kiosk window —
 * the C# side follows the cursor via Win32 (see KioskWindow), so the window
 * can be pulled onto an external monitor. In a plain browser it does nothing.
 */
function KioskDragStrip() {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Last posted cursor position — "move" is only re-posted when it changes,
  // which keeps the WebView2 message rate sane while the window tracks.
  const lastMove = useRef<{ x: number; y: number } | null>(null);
  // Safety-net timer: if the release happens outside the window (or the
  // pointer capture is lost), pointerup never fires and the C# side would
  // stay armed. End the drag ourselves after a short silence.
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set by the C# side ({ type: "drag", captured }). While the OS capture
  // is active the browser window receives no pointer events at all (input
  // is diverted to the window's WndProc), so this page's own fallback
  // timer must stay off — the C# side ends the drag (guaranteed button-up,
  // 5 s stuck guard) and announces it here as captured:false.
  const capturedRef = useRef(false);

  useEffect(() => {
    const wv = (window as any).chrome?.webview;
    if (!wv?.addEventListener) return;
    const onMessage = (e: any) => {
      // The C# side posts a JSON string (PostWebMessageAsString); a
      // hand-rolled host may post the object directly — accept both.
      let d = e.data;
      if (typeof d === "string") {
        try {
          d = JSON.parse(d);
        } catch {
          return;
        }
      }
      if (!d || d.type !== "drag" || typeof d.captured !== "boolean") return;
      capturedRef.current = d.captured;
      if (endTimer.current) {
        clearTimeout(endTimer.current);
        endTimer.current = null;
      }
      if (!d.captured) {
        // The C# side ended the drag (release off-window, stuck guard):
        // the pointerup never reached us, so reset our own state.
        lastMove.current = null;
        setDragging(false);
      }
    };
    wv.addEventListener("message", onMessage);
    return () => wv.removeEventListener("message", onMessage);
  }, []);

  const post = useCallback((phase: string) => {
    try {
      // Post the object itself (not a pre-stringified string): WebView2's
      // WebMessageAsJson then carries a single JSON object, which the C#
      // side parses directly. A pre-stringified value arrives double-encoded
      // and silently fails to parse.
      (window as any).chrome?.webview?.postMessage({ type: "drag", phase });
    } catch {
      // Not running inside the WebView2 kiosk window.
    }
  }, []);

  const armEndFallback = useCallback(() => {
    if (endTimer.current) clearTimeout(endTimer.current);
    if (capturedRef.current) return; // the OS owns the drag — C# ends it
    endTimer.current = setTimeout(() => {
      post("end");
      lastMove.current = null;
      setDragging(false);
    }, 1500);
  }, [post]);

  // Robust drag: while dragging, listen on the window so the move keeps
  // flowing even if the pointer leaves the strip (pointer capture is lost
  // the instant the window itself moves under the cursor, which is exactly
  // what dragging does).
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      if (
        lastMove.current &&
        lastMove.current.x === e.clientX &&
        lastMove.current.y === e.clientY
      )
        return;
      lastMove.current = { x: e.clientX, y: e.clientY };
      post("move");
      armEndFallback();
    };
    const onEnd = () => {
      if (endTimer.current) {
        clearTimeout(endTimer.current);
        endTimer.current = null;
      }
      post("end");
      lastMove.current = null;
      setDragging(false);
    };
    armEndFallback();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      if (endTimer.current) {
        clearTimeout(endTimer.current);
        endTimer.current = null;
      }
    };
  }, [dragging, post, armEndFallback]);

  const showGrip = hovered || dragging;

  return (
    <div
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Capture unsupported — the window listeners above cover the drag.
        }
        lastMove.current = { x: e.clientX, y: e.clientY };
        post("start");
        setDragging(true);
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      title="Drag to move the window"
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-7 touch-none select-none items-center gap-2 px-3",
        dragging ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      {/* Background: hidden at rest so the dashboard shows through, a soft
          fade on hover, solid while dragging. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 transition-opacity duration-200",
          dragging
            ? "bg-foreground/15 opacity-100"
            : hovered
              ? "bg-gradient-to-b from-background/85 to-transparent opacity-100"
              : "opacity-0"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none flex items-center gap-2 transition-opacity duration-200",
          showGrip ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="h-1 w-1 rounded-full bg-foreground/80" />
          ))}
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          drag to move
        </span>
      </div>
    </div>
  );
}
