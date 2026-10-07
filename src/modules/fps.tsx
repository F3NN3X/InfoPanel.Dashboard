import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { entry, liveText, liveValue } from "@/lib/sensors";
import type { DashboardModule } from "./types";

const RTSS = "plugins.InfoPanel.RTSS.";
const FPS = "plugins.fps-plugin.";

/**
 * Performance module — FPS data from whichever source is live:
 * RTSS (InfoPanel.RTSS), the RTSS-based FPS plugin, or PresentMon
 * (InfoPanel.IPFPS, same "fps-plugin" id + FPS container).
 */
export const fpsModule: DashboardModule = {
  id: "fps",
  title: "Performance",
  matches: (key) => key.startsWith(RTSS) || key.startsWith(FPS),
  render: (sensors) => {
    const rt = (id: string) => entry(sensors, RTSS, "rtss", id);
    const fp = (id: string) => entry(sensors, FPS, "fps", id);

    const rtssFps = liveValue(rt("fps"));
    const fpFps = liveValue(fp("fps"));
    const fps = rtssFps ?? fpFps;

    const low1 =
      liveValue(rt("1% low fps")) ??
      liveValue(fp("1% low fps")) ??
      liveValue(fp("1% low"));
    const low01 = liveValue(fp("0.1% low"));
    const frameTime =
      liveValue(rt("current frame time")) ??
      liveValue(fp("current frame time")) ??
      liveValue(fp("frame time"));

    const gpu = liveText(rt("gpu-name")) ?? liveText(fp("gpu-name"));
    const resolution = liveText(rt("resolution")) ?? liveText(fp("resolution"));
    const refresh = liveValue(rt("refreshrate")) ?? liveValue(fp("refreshrate"));
    const title = liveText(rt("windowtitle")) ?? liveText(fp("windowtitle"));

    const source = rtssFps !== undefined ? "RTSS" : fp("gpu utilization") ? "PresentMon" : "FPS";

    if (fps === undefined && !gpu && !title) return null;

    const extras: [string, string][] = [];
    const api = liveText(rt("graphics-api"));
    if (api && api !== "Unknown") extras.push(["API", api]);
    const display = liveText(rt("display-mode"));
    if (display && display !== "Unknown") extras.push(["Display", display]);
    const bench = liveText(rt("benchmark-mode"));
    if (bench && !bench.startsWith("Failed")) extras.push(["Benchmark", bench]);
    const gpuUtil = liveValue(fp("gpu utilization"));
    if (gpuUtil !== undefined) extras.push(["GPU util", `${Math.round(gpuUtil)}%`]);
    const gpuBusy = liveValue(fp("gpu busy"));
    if (gpuBusy !== undefined) extras.push(["GPU busy", `${gpuBusy.toFixed(1)}ms`]);
    const cpuBusy = liveValue(fp("cpu busy"));
    if (cpuBusy !== undefined) extras.push(["CPU busy", `${cpuBusy.toFixed(1)}ms`]);
    const displayLatency = liveValue(fp("display latency"));
    if (displayLatency !== undefined) extras.push(["Display lat", `${displayLatency.toFixed(1)}ms`]);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-zinc-800 bg-zinc-950/80 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Frames Per Second
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-4xl font-bold tracking-tight text-zinc-50">
                  {fps !== undefined ? Math.round(fps) : "—"}
                </div>
                <div className="text-xs text-zinc-600">{source}</div>
              </div>
              {title && (
                <div className="mt-2 truncate text-xs text-zinc-500" title={title}>
                  {title}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">1% Low</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-zinc-50">
                {low1 !== undefined ? Math.round(low1) : "—"}
              </div>
              {low01 !== undefined && (
                <div className="mt-1 text-xs text-zinc-500">
                  0.1% low: {Math.round(low01)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Frame Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-zinc-50">
                {frameTime !== undefined ? frameTime.toFixed(1) : "—"}
              </div>
              <div className="text-xs text-zinc-500">ms</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-zinc-800 bg-zinc-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">GPU</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="truncate text-sm font-medium text-zinc-200" title={gpu}>
                {gpu ?? "—"}
              </div>
              {(resolution || refresh !== undefined) && (
                <div className="mt-1 text-xs text-zinc-500">
                  {[resolution, refresh !== undefined ? `${refresh}Hz` : undefined]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}
            </CardContent>
          </Card>

          {extras.length > 0 && (
            <Card className="border-zinc-800 bg-zinc-950/80 col-span-1 md:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-zinc-400">
                  <Gauge className="h-3.5 w-3.5" /> Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {extras.map(([label, value]) => (
                    <div key={label}>
                      <div className="text-sm font-semibold text-zinc-200">{value}</div>
                      <div className="text-xs text-zinc-500">{label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  },
};
