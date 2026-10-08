import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bluetooth } from "lucide-react";
import { byName, groupByContainer, liveText } from "@/lib/sensors";
import { effectiveSettings, type DashboardModule } from "./types";

const P = "plugins.bluetooth-battery-plugin.";

/**
 * Bluetooth module — paired devices and battery levels (BTData plugin).
 * The main container holds bt_status; each device gets its own container
 * whose entries are looked up by display name (entry ids are hashed and
 * change between runs).
 */
export const bluetoothModule: DashboardModule = {
  id: "bluetooth",
  title: "Bluetooth",
  minCols: 2,
  minRows: 1,
  matches: (key) => key.startsWith(P),
  settings: [
    { key: "showStatus", label: "Bluetooth status", type: "boolean", default: true },
  ],
  render: (sensors, s) => {
    const cfg = effectiveSettings(bluetoothModule, s);
    const groups = groupByContainer(sensors, P);

    const statusGroups = [...groups.values()].filter(
      (items) => items.some((i) => i.key.endsWith(".bt_status"))
    );
    const deviceGroups = [...groups.values()].filter(
      (items) => items.length > 0 && !items.some((i) => i.key.endsWith(".bt_status"))
    );

    if (groups.size === 0) return null;

    const status =
      statusGroups
        .map((items) => liveText(byName(items, "Status") ?? items[0].sensor))
        .find(Boolean) ??
      liveText(statusGroups[0]?.[0]?.sensor);

    return (
      <div className="flex h-full w-full flex-col gap-4">
        {status && cfg.showStatus && (
          <Card className="flex min-h-0 min-w-0 flex-col overflow-hidden border-border bg-card">
            <CardHeader className="shrink-0 pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Bluetooth className="h-3.5 w-3.5" /> Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col justify-center">
              <div className="text-sm text-foreground/85">{status}</div>
            </CardContent>
          </Card>
        )}

        {deviceGroups.length > 0 && (
          <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {deviceGroups.map((items, i) => {
              const name = liveText(byName(items, "Name")) ?? `Device ${i + 1}`;
              const deviceStatus = liveText(byName(items, "Status"));
              const battery = byName(items, "Battery Level")?.value;
              const hasBattery = battery !== undefined && battery > 0;
              const pct = hasBattery ? Math.min(100, battery) : 0;
              const color = pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";

              return (
                <Card key={items[0].key} className="flex min-h-0 min-w-0 flex-col overflow-hidden border-border bg-card">
                  <CardHeader className="shrink-0 pb-2">
                    <CardTitle
                      className="truncate text-sm font-medium text-muted-foreground"
                      title={name}
                    >
                      {name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {hasBattery ? `${Math.round(battery)}%` : "—"}
                      </div>
                      {deviceStatus && (
                        <div className="text-xs text-muted-foreground">{deviceStatus}</div>
                      )}
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  },
};
