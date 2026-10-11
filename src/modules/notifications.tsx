import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { findEntry, liveText } from "@/lib/sensors";
import { ModernChrome } from "@/components/modern-chrome";
import { byShape, labelStyle, ws } from "@/components/widget-style";
import { chromeOf, IDLE_SETTING, STYLE_SETTINGS } from "./standard-settings";
import { effectiveSettings, type DashboardModule } from "./types";

const P = "plugins.InfoPanel.Notifications.";

/** The zone size the card is designed for (title, last toast, a few history lines). */
const DESIGN = byShape({
  wide: { w: 420, h: 240 },
  tall: { w: 300, h: 380 },
  square: { w: 360, h: 280 },
});

/**
 * Notifications module — toast notification history (Notifications plugin).
 * The history table is flattened to "time, type, message" lines.
 * Follows the style system: it scales with the zone and takes the standard
 * spacing, color and type options (the history rows keep their baseline
 * alignment, so the alignment options do not apply to them).
 */
export const notificationsModule: DashboardModule = {
  id: "notifications",
  title: "Notifications",
  minCols: 2,
  minRows: 1,
  prefixes: [P],
  settings: [
    { key: "showHistory", label: "History list", type: "boolean", default: true },
    {
      key: "maxLines",
      label: "Max history lines",
      type: "number",
      default: 50,
      min: 1,
      max: 200,
      step: 5,
    },
    IDLE_SETTING,
    ...STYLE_SETTINGS,
  ],
  // Idle = nothing unread.
  isIdle: (sensors) => !(Number(findEntry(sensors, P, "notification-count")?.sensor.value) > 0),
  render: (sensors, s) => {
    const cfg = effectiveSettings(notificationsModule, s);
    const count = findEntry(sensors, P, "notification-count")?.sensor.value;
    const last = liveText(findEntry(sensors, P, "last-notification")?.sensor);
    const status = liveText(findEntry(sensors, P, "status")?.sensor);
    const history = findEntry(sensors, P, "notification-history")?.sensor.text;

    if (last === undefined && count === undefined && !status) return null;

    const lines =
      history
        ?.split("\n")
        .filter((l) => l.trim() !== "")
        .slice(0, Math.max(1, Math.round(Number(cfg.maxLines) || 50))) ?? [];

    return (
      <ModernChrome chrome={chromeOf(cfg)} designSize={DESIGN}>
      <Card
        className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden border-border bg-card"
          style={{ borderRadius: ws.radius("var(--radius-lg, 0.5rem)") }}
        >
        <CardHeader className="pb-2" style={{ paddingInline: ws.pad(24), paddingTop: ws.pad(24) }}>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Bell className="h-3.5 w-3.5" /> Notifications
            {count !== undefined && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {Math.round(count)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col" style={{ paddingInline: ws.pad(24), paddingBottom: ws.pad(24) }}>
          {last && (
            <div className="text-sm text-foreground/90" style={{ fontWeight: ws.weight(500) }}>
              {last}
            </div>
          )}
          {status && <div className="mt-1 text-xs text-muted-foreground/60">{status}</div>}

          {cfg.showHistory && lines.length > 0 && (
            <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto border-t border-border pt-3">
              {lines.map((line, i) => {
                const [time, type, ...rest] = line.split(", ");
                const message = rest.join(", ");
                return (
                  <div key={i} className="flex items-baseline text-xs" style={{ gap: ws.gap(8) }}>
                    <span className="shrink-0 font-mono text-muted-foreground">{time}</span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-px text-[10px] tracking-wider ${
                        type === "Error"
                          ? "bg-red-950 text-red-400"
                          : type === "Warning"
                            ? "bg-amber-950 text-amber-400"
                            : "bg-secondary text-muted-foreground"
                      }`}
                      style={labelStyle()}
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
      </ModernChrome>
    );
  },
};
