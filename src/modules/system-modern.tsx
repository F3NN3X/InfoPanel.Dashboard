import { readSystem, SYSTEM_PREFIXES } from "@/lib/system-metrics";
import { templateModule } from "@/widgets/module";
import SystemOverview, { meta } from "@/widgets/SystemOverview";
import { SYSTEM_MODERN_SETTINGS, systemOverviewProps } from "@/widgets/registry/system-overview";
import { effectiveSettings, type DashboardModule, type SensorMap } from "./types";

/**
 * Modern system widget — CPU / GPU / RAM / Disks, rendered by the SystemOverview template: a load
 * ring per device (drives get used-space bars), with temperature, power, clock, memory, VRAM, fan
 * and page-file details, an optional per-thread CPU grid and trend sparkline, every part
 * switchable. The stored keys are unchanged; `systemOverviewProps` maps them to template props.
 */
const base = templateModule({
  meta: { ...meta, id: "systemmodern", minSize: [2, 1], prefixes: SYSTEM_PREFIXES.filter((p) => p.startsWith("system.")) },
  title: "System (modern)",
  Component: SystemOverview,
  settings: SYSTEM_MODERN_SETTINGS,
  toProps: systemOverviewProps,
  // Hardware details come from LibreHardwareMonitor, which the Hardware widget owns.
  prefixes: SYSTEM_PREFIXES.filter((p) => !p.startsWith("system.")),
});

/** Whether any chosen device has a reading (drives count only when Disks is chosen). */
function hasReadings(sensors: SensorMap, devices: unknown): boolean {
  const picked = new Set(String(devices ?? "").split(",").map((s) => s.trim()));
  const r = readSystem(sensors);
  return (
    (picked.has("cpu") || picked.has("gpu") || picked.has("ram") || picked.has("disk")) &&
    (r.cpu.load !== undefined || r.ram.load !== undefined || r.gpu.load !== undefined || (picked.has("disk") && r.disks.length > 0))
  );
}

export const systemModernModule: DashboardModule = {
  ...base,
  // No devices or no data yet: nothing to render, so the kiosk leaves the zone out.
  render: (sensors, saved) => (hasReadings(sensors, effectiveSettings(base, saved).devices) ? base.render(sensors, saved) : null),
  // SystemOverview supersedes it in the Library; existing zones keep loading.
  libraryHidden: true,
};
