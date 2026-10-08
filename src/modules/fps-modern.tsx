import { ModernFps } from "@/components/ModernFps";
import { entry, liveText, liveValue } from "@/lib/sensors";
import { chromeOf, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
} from "./types";

const RTSS = "plugins.InfoPanel.RTSS.";
const FPS = "plugins.fps-plugin.";

/**
 * Modern FPS / performance widget — a single FPS ring gauge (value vs.
 * refresh rate) with 1% low / frame time / GPU around it. One component
 * (`ModernFps`) picks card / standard / compact / simple from the
 * measured zone size. Reads the same RTSS / PresentMon sources as the
 * classic `fps` module, which stays untouched.
 */

const FPS_MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
  { key: "showMetrics", label: "Extra metrics", type: "boolean", default: true },
];

export const fpsModernModule: DashboardModule = {
  id: "fpsmodern",
  title: "FPS (modern)",
  minCols: 2,
  minRows: 1,
  matches: (key) => key.startsWith(RTSS) || key.startsWith(FPS),
  settings: FPS_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = effectiveSettings(fpsModernModule, s);
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

    const source =
      rtssFps !== undefined ? "RTSS" : fp("gpu utilization") ? "PresentMon" : "FPS";

    if (fps === undefined && !gpu && !title) return null;

    const extras: [string, string][] = [];
    if (Boolean(cfg.showMetrics)) {
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
      if (displayLatency !== undefined)
        extras.push(["Display lat", `${displayLatency.toFixed(1)}ms`]);
    }

    return (
      <ModernFps
        fps={fps}
        low1={low1}
        low01={low01}
        frameTime={frameTime}
        refresh={refresh}
        gpu={gpu}
        resolution={resolution}
        title={title}
        source={source}
        extras={extras}
        layout={String(cfg.layout) as
          | "auto"
          | "card"
          | "standard"
          | "compact"
          | "simple"}
        surfaceStyle={String(cfg.surface) as "glass" | "matte-light" | "matte-dark"}
        chrome={chromeOf(cfg)}
      />
    );
  },
};
