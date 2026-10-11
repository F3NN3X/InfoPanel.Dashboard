import { Globe } from "lucide-react";
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
 */
export const webpageModule: DashboardModule = {
  id: "webpage",
  title: "Web Page",
  minCols: 4,
  minRows: 2,
  matches: () => false,
  settings: [
    {
      key: "url",
      label: "URL",
      type: "text",
      default: "",
    },
  ],
  render: (_sensors, s) => {
    const cfg = effectiveSettings(webpageModule, s);
    const url = String(cfg.url ?? "").trim();
    const src = toEmbeddable(url);

    if (!src) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg bg-black/40 text-muted-foreground">
          <Globe className="h-6 w-6 opacity-50" />
          <span className="text-xs">Enter a URL in the inspector</span>
        </div>
      );
    }

    // key={src}: remount (and reload) the frame whenever the URL changes.
    return (
      <div className="h-full w-full overflow-hidden rounded-lg border border-white/10">
        <iframe
          key={src}
          src={src}
          title={url}
          className="h-full w-full border-0 bg-white"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  },
};
