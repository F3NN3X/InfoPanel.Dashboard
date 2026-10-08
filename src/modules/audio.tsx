import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2 } from "lucide-react";
import { bySuffixOrName, groupByContainer } from "@/lib/sensors";
import { effectiveSettings, type DashboardModule } from "./types";

const P = "plugins.audio-level-meter.";

/**
 * Audio module — per-device level metering (AudioLevelMeter plugin).
 * Containers are dynamic (one per audio device). Entries are resolved by
 * key suffix (the plugin names its display strings "🎵 {Device} · Level",
 * so the stable key suffix — `audio-level`, `device-name`, … — is the
 * robust lookup) with a fallback to the legacy plain names. Level is
 * 0-100%; peak/RMS are in dB (0 = silent).
 */
export const audioModule: DashboardModule = {
  id: "audio",
  title: "Audio",
  minCols: 2,
  minRows: 1,
  matches: (key) => key.startsWith(P),
  settings: [
    {
      key: "source",
      label: "Source (device)",
      type: "select",
      default: "",
      optionsFrom: "sources",
      sourcePlugin: P,
    },
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

    // Bind to one device (container), or show them all.
    const source = String(cfg.source ?? "");
    const entries = source
      ? groups.has(source)
        ? [[source, groups.get(source)!] as const]
        : []
      : [...groups.entries()];

    const devices = entries.map(([container, items]) => {
      const name =
        container === "default-audio"
          ? "Default device"
          : (bySuffixOrName(items, "device-name", "Device")?.text ??
            container);
      const level = bySuffixOrName(items, "audio-level", "Level")?.value;
      const peak = bySuffixOrName(items, "peak-level", "Peak")?.value;
      const rms = bySuffixOrName(items, "rms-level", "RMS")?.value;
      const left = bySuffixOrName(items, "left-channel", "Left")?.value;
      const right = bySuffixOrName(items, "right-channel", "Right")?.value;
      const volume = bySuffixOrName(items, "volume", "Volume")?.value;
      const muted = bySuffixOrName(items, "mute", "Mute")?.text;
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
