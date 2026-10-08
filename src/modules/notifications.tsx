import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { findEntry, liveText } from "@/lib/sensors";
import type { DashboardModule } from "./types";

const P = "plugins.InfoPanel.Notifications.";

/**
 * Notifications module — toast notification history (Notifications plugin).
 * The history table is flattened to "time, type, message" lines.
 */
export const notificationsModule: DashboardModule = {
  id: "notifications",
  title: "Notifications",
  minCols: 2,
  minRows: 1,
  matches: (key) => key.startsWith(P),
  render: (sensors) => {
    const count = findEntry(sensors, P, "notification-count")?.sensor.value;
    const last = liveText(findEntry(sensors, P, "last-notification")?.sensor);
    const status = liveText(findEntry(sensors, P, "status")?.sensor);
    const history = findEntry(sensors, P, "notification-history")?.sensor.text;

    if (last === undefined && count === undefined && !status) return null;

    const lines = history?.split("\n").filter((l) => l.trim() !== "") ?? [];

    return (
      <Card className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Bell className="h-3.5 w-3.5" /> Notifications
            {count !== undefined && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {Math.round(count)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          {last && (
            <div className="text-sm font-medium text-foreground/90">{last}</div>
          )}
          {status && <div className="mt-1 text-xs text-muted-foreground/60">{status}</div>}

          {lines.length > 0 && (
            <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto border-t border-border pt-3">
              {lines.map((line, i) => {
                const [time, type, ...rest] = line.split(", ");
                const message = rest.join(", ");
                return (
                  <div key={i} className="flex items-baseline gap-2 text-xs">
                    <span className="shrink-0 font-mono text-muted-foreground">{time}</span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-px text-[10px] uppercase tracking-wider ${
                        type === "Error"
                          ? "bg-red-950 text-red-400"
                          : type === "Warning"
                            ? "bg-amber-950 text-amber-400"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {type}
                    </span>
                    <span className="min-w-0 truncate text-muted-foreground" title={message}>
                      {message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  },
};
