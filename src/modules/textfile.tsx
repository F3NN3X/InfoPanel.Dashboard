import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { findEntry, liveText } from "@/lib/sensors";
import { ModernChrome } from "@/components/modern-chrome";
import { byShape, ws } from "@/components/widget-style";
import { chromeOf, STYLE_SETTINGS } from "./standard-settings";
import { effectiveSettings, type DashboardModule } from "./types";

const P = "plugins.InfoPanel.TextFile.";

function humanBytes(bytes?: number): string | undefined {
  if (bytes === undefined || bytes <= 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v.toFixed(1)} ${units[u]}`;
}

/** The zone size the card is designed for (title + a few lines of text). */
const DESIGN = byShape({
  wide: { w: 460, h: 240 },
  tall: { w: 300, h: 380 },
  square: { w: 360, h: 280 },
});

/**
 * TextFile module — monitors a text file (TextFile plugin).
 * Entries: content (multi-line text), status, file-size (bytes), line-count.
 * Follows the style system: it scales with the zone and takes the standard
 * spacing, color and type options.
 */
export const textfileModule: DashboardModule = {
  id: "textfile",
  title: "Text File",
  minCols: 2,
  minRows: 1,
  prefixes: [P],
  settings: [
    {
      key: "showMeta",
      label: "Size / lines / status header",
      type: "boolean",
      default: true,
    },
    ...STYLE_SETTINGS,
  ],
  render: (sensors, s) => {
    const cfg = effectiveSettings(textfileModule, s);
    const content = liveText(findEntry(sensors, P, "content")?.sensor);
    const status = liveText(findEntry(sensors, P, "status")?.sensor);
    const size = findEntry(sensors, P, "file-size")?.sensor.value;
    const lines = findEntry(sensors, P, "line-count")?.sensor.value;

    if (content === undefined && status === undefined && size === undefined) {
      return null;
    }

    return (
      <ModernChrome chrome={chromeOf(cfg)} designSize={DESIGN}>
      <Card
        className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden border-border bg-card"
          style={{ borderRadius: ws.radius("var(--radius-lg, 0.5rem)") }}
        >
        <CardHeader className="pb-2" style={{ paddingInline: ws.pad(24), paddingTop: ws.pad(24) }}>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> Text File
            {cfg.showMeta && (
              <span
                className="ml-auto flex text-xs font-normal text-muted-foreground"
                style={{ gap: ws.gap(8) }}
              >
                {humanBytes(size) && <span>{humanBytes(size)}</span>}
                {lines !== undefined && lines > 0 && (
                  <span>{lines} lines</span>
                )}
                {status && (
                  <span className="max-w-48 truncate" title={status}>
                    {status}
                  </span>
                )}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1" style={{ paddingInline: ws.pad(24), paddingBottom: ws.pad(24) }}>
          <pre className="h-full overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/85">
            {content ?? "No content"}
          </pre>
        </CardContent>
      </Card>
      </ModernChrome>
    );
  },
};
