import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Train } from "lucide-react";
import { findEntry, liveText } from "@/lib/sensors";
import { ModernChrome } from "@/components/modern-chrome";
import { byShape, flow, ws } from "@/components/widget-style";
import { chromeOf, STYLE_SETTINGS } from "./standard-settings";
import { effectiveSettings, type DashboardModule } from "./types";

const P = "plugins.InfoPanel.VBZ.";

/** The zone size the card is designed for (title + a few departure rows). */
const DESIGN = byShape({
  wide: { w: 420, h: 240 },
  tall: { w: 300, h: 380 },
  square: { w: 360, h: 280 },
});

/**
 * VBZ module — public transport departures.
 * Departure rows come from the flat dep_N_line / dep_N_dest / dep_N_time
 * entries (N is dynamic, set by the plugin's NumberOfResults config).
 * Follows the style system: it scales with the zone and takes the standard
 * spacing, alignment, color and type options.
 */
export const vbzModule: DashboardModule = {
  id: "vbz",
  title: "Departures",
  minCols: 2,
  minRows: 1,
  prefixes: [P],
  settings: [
    { key: "showStatus", label: "Status line", type: "boolean", default: true },
    ...STYLE_SETTINGS,
  ],
  render: (sensors, s) => {
    const cfg = effectiveSettings(vbzModule, s);
    const station = liveText(findEntry(sensors, P, "station_name")?.sensor);
    const status = liveText(findEntry(sensors, P, "status")?.sensor);

    // Collect the departure indexes that exist in this snapshot.
    const indexes = new Set<number>();
    for (const key of Object.keys(sensors)) {
      const m = key.slice(P.length).match(/^dep_(\d+)_(line|dest|time)$/);
      if (m) indexes.add(parseInt(m[1], 10));
    }
    const nums = [...indexes].sort((a, b) => a - b);

    const rows = nums.map((i) => {
      const line = liveText(findEntry(sensors, P, `dep_${i}_line`)?.sensor);
      const dest = liveText(findEntry(sensors, P, `dep_${i}_dest`)?.sensor);
      const time = liveText(findEntry(sensors, P, `dep_${i}_time`)?.sensor);
      return { i, line, dest, time };
    }).filter((r) => r.line || r.dest || r.time);

    if (!station && rows.length === 0) return null;

    return (
      <ModernChrome chrome={chromeOf(cfg)} designSize={DESIGN}>
      <Card
        className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden border-border bg-card"
          style={{ borderRadius: ws.radius("var(--radius-lg, 0.5rem)") }}
        >
        <CardHeader className="pb-2" style={{ paddingInline: ws.pad(24), paddingTop: ws.pad(24) }}>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Train className="h-3.5 w-3.5" />
            <span className="truncate" title={station}>
              {station ?? "Departures"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col" style={{ paddingInline: ws.pad(24), paddingBottom: ws.pad(24) }}>
          {rows.length > 0 ? (
            <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {rows.map((r) => (
                <div
                  key={r.i}
                  className="flex py-2"
                  style={{ ...flow("row", { x: "start", y: "center" }), gap: ws.gap(16) }}
                >
                  <div
                    className="w-14 shrink-0 font-mono text-lg text-foreground"
                    style={{ fontWeight: ws.weight(600) }}
                  >
                    {r.time ?? "--:--"}
                  </div>
                  <div className="w-10 shrink-0 rounded bg-secondary px-1.5 py-0.5 text-center text-xs font-medium text-foreground/85">
                    {r.line ?? "·"}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-sm text-foreground/85" title={r.dest}>
                    {r.dest ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No upcoming departures</div>
          )}
          {cfg.showStatus && status && (
            <div className="mt-3 text-xs text-muted-foreground/60">{status}</div>
          )}
        </CardContent>
      </Card>
      </ModernChrome>
    );
  },
};
