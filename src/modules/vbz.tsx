import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Train } from "lucide-react";
import { findEntry, liveText } from "@/lib/sensors";
import type { DashboardModule } from "./types";

const P = "plugins.InfoPanel.VBZ.";

/**
 * VBZ module — public transport departures.
 * Departure rows come from the flat dep_N_line / dep_N_dest / dep_N_time
 * entries (N is dynamic, set by the plugin's NumberOfResults config).
 */
export const vbzModule: DashboardModule = {
  id: "vbz",
  title: "Departures",
  minCols: 2,
  minRows: 1,
  matches: (key) => key.startsWith(P),
  render: (sensors) => {
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
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Train className="h-3.5 w-3.5" />
            <span className="truncate" title={station}>
              {station ?? "Departures"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.i} className="flex items-center gap-4 py-2">
                  <div className="w-14 shrink-0 font-mono text-lg font-semibold text-foreground">
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
          {status && <div className="mt-3 text-xs text-muted-foreground/60">{status}</div>}
        </CardContent>
      </Card>
    );
  },
};
