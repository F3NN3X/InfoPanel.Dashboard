import { Globe } from "lucide-react";
import { ModernChrome } from "@/components/modern-chrome";
import { surfaceBox, ws } from "@/components/widget-style";
import { chromeOf, CARD_SETTINGS, STYLE_SETTINGS, SURFACE_SETTINGS } from "./standard-settings";
import { effectiveSettings, type DashboardModule } from "./types";


/**
 * Normalize a URL for in-iframe display. YouTube watch / share / shorts /
 * live links are rewritten to the always-embeddable `/embed/` form (the
 * plain watch page and the homepage refuse to be framed); any other URL is
 * passed through unchanged.
 */
function toEmbeddable(raw: string): string {
  const url = raw.trim();
  if (!url) return "";
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url; // not a parseable URL — hand it to the iframe as-is
  }
  const host = u.hostname.replace(/^www\./, "");
  const isYouTube =
    host === "youtube.com" ||
    host === "youtu.be" ||
    host.endsWith(".youtube.com");
  if (!isYouTube) return url;

  let id: string | undefined;
  if (host === "youtu.be") {
    id = u.pathname.split("/").filter(Boolean)[0];
  } else if (u.pathname === "/watch") {
    id = u.searchParams.get("v") ?? undefined;
  } else if (/^\/(shorts|live)\/.+/.test(u.pathname)) {
    id = u.pathname.split("/").filter(Boolean)[1];
  }
  return id ? `https://www.youtube.com/embed/${id}` : url;
}

/**
 * Web Page module — embeds an arbitrary URL (e.g. a YouTube video) in an
 * iframe that fills the zone. The URL is a plain inspector text field; no
 * sensor data is consumed, so the widget is always "present" (a placeholder
 * shows until a URL is set).
 * Follows the style system as far as an iframe allows: zoom scales the
 * embedded page, and the corner radius, border and edge glow apply (an
 * iframe has no padding, gap, alignment, labels or values to style).
 */

/** The frame's edge: border and glow only (the page covers any surface). */
const EDGE_KEYS: ReadonlySet<string> = new Set(["borderWidth", "borderColor", "glow", "glowColor"]);

/** The frame's own 1px edge (`border-white/10` before the style options). */
const EDGE = { background: "transparent", fg: "inherit", ring: "rgba(255, 255, 255, 0.1)" };
export const webpageModule: DashboardModule = {
  id: "webpage",
  title: "Web Page",
  minCols: 4,
  minRows: 2,
  prefixes: [],
  settings: [
    {
      key: "url",
      label: "URL",
      type: "text",
      default: "",
      group: "Page",
    },
    // An iframe has no layout of its own: only its size and corners apply
    // (no auto-scale, which would zoom the embedded page itself).
    ...STYLE_SETTINGS.filter((d) => d.key === "scale" || d.key === "radius"),
    ...CARD_SETTINGS.filter((d) => d.key === "accent"),
    ...SURFACE_SETTINGS.filter((d) => EDGE_KEYS.has(d.key)),
  ],
  render: (_sensors, s) => {
    const cfg = effectiveSettings(webpageModule, s);
    const url = String(cfg.url ?? "").trim();
    const src = toEmbeddable(url);

    const chrome = chromeOf(cfg);
    const radius = ws.radius("var(--radius-lg, 0.5rem)");

    if (!src) {
      return (
        <ModernChrome chrome={chrome}>
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black/40 text-muted-foreground"
            style={{ borderRadius: radius }}
          >
            <Globe className="h-6 w-6 opacity-50" />
            <span className="text-xs">Enter a URL in the inspector</span>
          </div>
        </ModernChrome>
      );
    }

    // key={src}: remount (and reload) the frame whenever the URL changes.
    return (
      <ModernChrome chrome={chrome}>
      <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: radius }}>
        <iframe
          key={src}
          src={src}
          title={url}
          className="h-full w-full border-0 bg-white"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
        {/* The edge sits over the page (an inset shadow under it would be covered). */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ borderRadius: radius, boxShadow: surfaceBox(EDGE, chrome).boxShadow }}
        />
      </div>
      </ModernChrome>
    );
  },
};
