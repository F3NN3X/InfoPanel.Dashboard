import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2 } from "lucide-react";
import { byName, groupByContainer } from "@/lib/sensors";
import { effectiveSettings, type DashboardModule } from "./types";

const P = "plugins.audio-level-meter.";

/**
 * Audio module — per-device level metering (AudioLevelMeter plugin).
 * Containers are dynamic (one per audio device); entries are looked up
 * by display name. Level is 0-100%; peak/RMS are in dB (0 = silent).
 */
export const audioModule: DashboardModule = {
  id: "audio",
  title: "Audio",
  minCols: 2,
  minRows: 1,
  matches: (key) => key.startsWith(P),
  settings: [
    {
      key: "showDetails",
      label: "Peak / RMS & L/R/volume details",
      type: "boolean",
      default: true,
    },
  ],
  render: (sensors, s) => {
    const cfg = effectiveSettings(audioModule, s);
    const groups = groupByContainer(sensors, P);
    if (groups.size === 0) return null;

    const devices = [...groups.entries()].map(([container, items]) => {
      const name = byName(items, "Device")?.text ?? container;
      const level = byName(items, "Level")?.value;
      const peak = byName(items, "Peak")?.value;
      const rms = byName(items, "RMS")?.value;
      const left = byName(items, "Left")?.value;
      const right = byName(items, "Right")?.value;
      const volume = byName(items, "Volume")?.value;
      const muted = byName(items, "Mute")?.text;
      return { container, name, level, peak, rms, left, right, volume, muted };
    });

    return (
      <div className="grid h-full w-full auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2">
        {devices.map((d) => (
          <Card
            key={d.container}
            className="flex min-h-0 min-w-0 flex-col overflow-hidden border-border bg-card"
          >
            <CardHeader className="shrink-0 pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Volume2 className="h-3.5 w-3.5" />
                <span className="truncate" title={d.name}>
                  {d.name}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col justify-center">
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {d.level !== undefined ? `${Math.round(d.level)}%` : "—"}
                </div>
                {cfg.showDetails && (
                  <div className="text-xs text-muted-foreground">
                    {d.peak !== undefined && d.peak !== 0
                      ? `peak ${d.peak.toFixed(1)}dB`
                      : d.rms !== undefined && d.rms !== 0
                        ? `rms ${d.rms.toFixed(1)}dB`
                        : "silent"}
                  </div>
                )}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    (d.level ?? 0) > 85 ? "bg-red-500" : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, d.level ?? 0))}%`,
                  }}
                />
              </div>
              {cfg.showDetails &&
                (d.left !== undefined ||
                  d.right !== undefined ||
                  d.volume !== undefined) && (
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground/60">
                  {d.left !== undefined && (
                    <span>L {Math.round(d.left)}</span>
                  )}
                  {d.right !== undefined && (
                    <span>R {Math.round(d.right)}</span>
                  )}
                  {d.volume !== undefined && (
                    <span>
                      Vol {Math.round(d.volume)}%
                      {d.muted === "True" ? " · Muted" : ""}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  },
};
